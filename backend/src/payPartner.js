/* =====================================================================
   MARQUES PAY: ADAPTADOR DO PARCEIRO BANCÁRIO (BaaS)
   ---------------------------------------------------------------------
   Tudo o que depende do parceiro passa por aqui, e só aqui. Hoje o
   provedor é "manual": o cadastro fica na fila do admin e uma pessoa da
   Marques aprova/reprova. Quando o parceiro for escolhido, cria-se um
   provedor novo neste mesmo formato e liga-se com PAY_PARTNER=<nome>:

     provedor = {
       // Envia o cadastro (dados + documentos) ao parceiro para abrir o
       // titular/conta. Devolve { partnerRef } com o id do titular lá.
       async submitKyc(kyc, documentos) { ... },
       // Traduz o JSON do webhook do parceiro para um evento padrão:
       //   { type: "kyc.approved" | "kyc.rejected", partnerRef,
       //     motivo?, numeroConta?, agencia? }
       parseEvent(json) { ... },
     }

   O webhook (POST /api/webhooks/pay-partner) exige assinatura
   HMAC-SHA256 do corpo no header x-signature, com o segredo
   PAY_PARTNER_WEBHOOK_SECRET. Sem segredo configurado, o webhook recusa
   tudo (nunca aceita chamada sem assinatura).

   Fora do escopo daqui (só o parceiro faz): saldo, Pix, cartão, extrato.
   ===================================================================== */
const crypto = require("crypto");
const payKyc = require("./payKyc");

const providers = {
  manual: {
    async submitKyc() { return null; },
    // Formato padrão, útil para testes e para parceiros que aceitem configurar o payload.
    parseEvent(json) {
      return {
        type: json.type,
        partnerRef: json.partnerRef,
        motivo: json.motivo,
        numeroConta: json.numeroConta,
        agencia: json.agencia,
      };
    },
  },
};

function providerName() {
  const n = process.env.PAY_PARTNER || "manual";
  return providers[n] ? n : "manual";
}

function provider() { return providers[providerName()]; }

// Chamado logo depois que o cliente envia o cadastro para análise.
async function onKycSubmitted(kycId) {
  const p = provider();
  const kyc = await payKyc.getForAdmin(kycId);
  const docs = await payKyc.getDocumentsForPartner(kycId);
  const res = await p.submitKyc(kyc, docs);
  if (res && res.partnerRef) await payKyc.setPartnerRef(kycId, providerName(), String(res.partnerRef));
}

function verifySignature(rawBody, signature) {
  const secret = process.env.PAY_PARTNER_WEBHOOK_SECRET || "";
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature).replace(/^sha256=/, ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Retorna { ok, status, error? } para o router responder ao parceiro.
async function handleWebhook(rawBody, signature) {
  if (!verifySignature(rawBody, signature)) return { ok: false, status: 401, error: "Assinatura inválida." };
  let json;
  try { json = JSON.parse(rawBody); } catch { return { ok: false, status: 400, error: "JSON inválido." }; }
  const ev = provider().parseEvent(json);
  if (!ev || !ev.partnerRef) return { ok: false, status: 400, error: "Evento sem partnerRef." };
  const kycId = await payKyc.findByPartnerRef(providerName(), String(ev.partnerRef));
  if (!kycId) return { ok: false, status: 404, error: "Titular desconhecido." };
  const autor = `parceiro:${providerName()}`;
  if (ev.type === "kyc.approved") {
    await payKyc.approve(kycId, autor, { numeroConta: ev.numeroConta, agencia: ev.agencia });
  } else if (ev.type === "kyc.rejected") {
    await payKyc.reject(kycId, autor, ev.motivo || "Reprovado pelo parceiro.");
  } else {
    return { ok: true, status: 200, ignored: true };
  }
  return { ok: true, status: 200 };
}

module.exports = { onKycSubmitted, handleWebhook, providerName };
