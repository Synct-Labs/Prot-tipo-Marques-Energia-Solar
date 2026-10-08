/* =====================================================================
   WHATSAPP: avisos de Ordem de Serviço pros técnicos
   ---------------------------------------------------------------------
   Dois provedores, escolhidos pelo que estiver no .env:
     1. API OFICIAL da Meta (WhatsApp Cloud API): META_WA_TOKEN +
        META_WA_PHONE_ID. Mensagem iniciada pela empresa só pode ser um
        MODELO (template) aprovado na Meta; os 3 modelos usados estão em
        TEMPLATES abaixo (e no README) e precisam existir com esses nomes.
     2. Evolution API v2 (não oficial, conecta um número por QR code):
        EVOLUTION_API_URL + EVOLUTION_API_KEY + EVOLUTION_INSTANCE.
   Se nenhum estiver configurado, a mensagem só vai pro log (modo de teste).
   Nunca derruba quem chamou: falha de envio vira { ok:false, error }.
   ===================================================================== */
const config = require("./config");

// kind -> modelo na Meta. Os textos têm que ser criados IGUAIS aos do README
// (categoria Utilidade, idioma pt_BR). {{n}} = parâmetros, na ordem.
const TEMPLATES = {
  nova_os: { name: "nova_os_instalacao", params: 4 },     // OS, kit, local, link
  os_atribuida: { name: "os_atribuida_instalacao", params: 2 }, // OS, link
  os_cancelada: { name: "os_cancelada_instalacao", params: 2 }, // OS, motivo
};
const TEMPLATE_LANG = "pt_BR";

// Aceita (65) 99999-1234, 65999991234, +55 65 99999-1234... e devolve só
// dígitos com DDI 55. Retorna null se não parecer um celular/fixo BR.
function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (!/^55\d{10,11}$/.test(d)) return null;
  return d;
}

const metaConfigured = () => !!(config.META_WA_TOKEN && config.META_WA_PHONE_ID);
const evolutionConfigured = () => !!(config.EVOLUTION_API_URL && config.EVOLUTION_API_KEY && config.EVOLUTION_INSTANCE);

function provider() {
  if (metaConfigured()) return "meta";
  if (evolutionConfigured()) return "evolution";
  return null;
}
function isConfigured() { return provider() !== null; }

// A Meta não aceita quebra de linha, tab nem muitos espaços seguidos dentro
// de um parâmetro, nem parâmetro vazio.
function cleanParam(v) {
  const s = String(v == null ? "" : v).replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 300);
  return s || "-";
}

async function sendMeta(number, kind, params) {
  const tpl = TEMPLATES[kind];
  if (!tpl) return { ok: false, error: `Modelo desconhecido: ${kind}` };
  const body = {
    messaging_product: "whatsapp",
    to: number,
    type: "template",
    template: {
      name: tpl.name,
      language: { code: TEMPLATE_LANG },
      components: [{ type: "body", parameters: params.slice(0, tpl.params).map((p) => ({ type: "text", text: cleanParam(p) })) }],
    },
  };
  try {
    const resp = await fetch(`https://graph.facebook.com/${config.META_GRAPH_VERSION}/${encodeURIComponent(config.META_WA_PHONE_ID)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.META_WA_TOKEN}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      let detail = "";
      try {
        const j = await resp.json();
        const e = j.error || {};
        detail = `${e.code || resp.status}: ${(e.error_data && e.error_data.details) || e.message || ""}`.slice(0, 220);
      } catch { detail = String(resp.status); }
      console.error(`[whatsapp] Meta respondeu erro ${detail}`);
      return { ok: false, error: `Meta ${detail}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[whatsapp] falha ao enviar (Meta):", e.message);
    return { ok: false, error: e.message };
  }
}

async function sendEvolution(number, text) {
  try {
    const base = config.EVOLUTION_API_URL.replace(/\/+$/, "");
    const resp = await fetch(`${base}/message/sendText/${encodeURIComponent(config.EVOLUTION_INSTANCE)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: config.EVOLUTION_API_KEY },
      body: JSON.stringify({ number, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      const detail = (await resp.text().catch(() => "")).slice(0, 200);
      console.error(`[whatsapp] Evolution API respondeu ${resp.status}: ${detail}`);
      return { ok: false, error: `Evolution API ${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[whatsapp] falha ao enviar (Evolution):", e.message);
    return { ok: false, error: e.message };
  }
}

// kind: nova_os | os_atribuida | os_cancelada. params = valores dos {{n}} do
// modelo da Meta; fallbackText = mensagem livre (Evolution e modo de teste).
async function notify(phone, kind, params, fallbackText) {
  const number = normalizePhone(phone);
  if (!number) return { ok: false, error: "Telefone inválido." };
  const p = provider();
  if (p === "meta") return sendMeta(number, kind, params || []);
  if (p === "evolution") return sendEvolution(number, fallbackText);
  console.log(`[whatsapp] (modo teste, nada configurado) para ${number} [${kind}]:\n${fallbackText}`);
  return { ok: false, skipped: true, error: "WhatsApp não configurado." };
}

module.exports = { notify, normalizePhone, isConfigured, provider, TEMPLATES };
