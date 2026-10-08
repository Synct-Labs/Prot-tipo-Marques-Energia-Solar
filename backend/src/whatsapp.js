/* =====================================================================
   WHATSAPP (Evolution API v2)
   ---------------------------------------------------------------------
   Envia mensagem de texto por uma instância da Evolution API (própria,
   rodando na VPS, conectada a um número por QR code). Sem
   EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE no .env,
   a mensagem só é impressa no log (modo de teste), como o mailer.
   Nunca derruba quem chamou: falha de envio vira { ok:false, error }.
   ===================================================================== */
const config = require("./config");

// Aceita (65) 99999-1234, 65999991234, +55 65 99999-1234... e devolve só
// dígitos com DDI 55. Retorna null se não parecer um celular/fixo BR.
function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (!/^55\d{10,11}$/.test(d)) return null;
  return d;
}

function isConfigured() {
  return !!(config.EVOLUTION_API_URL && config.EVOLUTION_API_KEY && config.EVOLUTION_INSTANCE);
}

async function sendText(phone, text) {
  const number = normalizePhone(phone);
  if (!number) return { ok: false, error: "Telefone inválido." };
  if (!isConfigured()) {
    console.log(`[whatsapp] (modo teste, sem Evolution API) para ${number}:\n${text}`);
    return { ok: false, skipped: true, error: "WhatsApp não configurado." };
  }
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
    console.error("[whatsapp] falha ao enviar:", e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { sendText, normalizePhone, isConfigured };
