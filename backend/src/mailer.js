/* =====================================================================
   ENVIO DE E-MAIL (verificação em duas etapas por e-mail)
   ---------------------------------------------------------------------
   Usa a API HTTP da Resend (https://resend.com) direto via fetch nativo
   do Node — sem dependência nova no projeto. Sem RESEND_API_KEY
   configurada (backend/.env), o e-mail não é enviado de verdade: o
   conteúdo só aparece no log do servidor, pra dar pra testar o fluxo
   sem precisar configurar nada primeiro.
   ===================================================================== */
const config = require("./config");

async function sendEmail({ to, subject, text, html }) {
  if (!config.RESEND_API_KEY) {
    console.log(
      `\n[e-mail simulado — configure RESEND_API_KEY em backend/.env pra enviar de verdade]\n` +
      `Para: ${to}\nAssunto: ${subject}\n${text}\n`
    );
    return { simulated: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.MAIL_FROM,
      to: [to],
      subject,
      text,
      html: html || `<p>${text}</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[mailer] Falha ao enviar e-mail via Resend:", res.status, body);
    throw new Error("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
  }
  return { simulated: false };
}

function verificationEmailHTML(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1a1200;">Marques</h2>
      <p>Use o código abaixo para confirmar que é você:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background:#f5f5f5; padding: 16px 20px; border-radius: 8px; text-align:center;">${code}</p>
      <p style="color:#666; font-size: 13px;">Esse código expira em 10 minutos. Se você não pediu esse código, pode ignorar este e-mail.</p>
    </div>`;
}

module.exports = { sendEmail, verificationEmailHTML };
