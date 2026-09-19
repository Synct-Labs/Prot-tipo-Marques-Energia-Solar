/* =====================================================================
   ENVIO DE E-MAIL (verificação em duas etapas por e-mail)
   ---------------------------------------------------------------------
   Envia via SMTP do Gmail/Google Workspace (nodemailer), usando a mesma
   conta contato@marquespromotora.com já configurada pro site. Sem
   SMTP_USER/SMTP_PASS configurados (backend/.env), o e-mail não é
   enviado de verdade: o conteúdo só aparece no log do servidor, pra dar
   pra testar o fluxo sem precisar configurar nada primeiro.
   ===================================================================== */
const nodemailer = require("nodemailer");
const config = require("./config");

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (!config.SMTP_USER || !config.SMTP_PASS) {
    console.log(
      `\n[e-mail simulado — configure SMTP_USER/SMTP_PASS em backend/.env pra enviar de verdade]\n` +
      `Para: ${to}\nAssunto: ${subject}\n${text}\n`
    );
    return { simulated: true };
  }

  try {
    await getTransporter().sendMail({
      from: config.MAIL_FROM,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });
  } catch (err) {
    console.error("[mailer] Falha ao enviar e-mail via SMTP:", err.message);
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
