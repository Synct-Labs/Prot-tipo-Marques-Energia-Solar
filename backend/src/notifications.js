/* =====================================================================
   E-MAILS DE NOTIFICAÇÃO (admin)
   ---------------------------------------------------------------------
   Lista de e-mails (configurável pelo dono, aba "Notificações" do painel)
   que recebem aviso quando: entra um pedido novo, uma solicitação de
   crédito nova, ou uma solicitação de análise de conta Marques Pay nova.
   Sem nenhum e-mail cadastrado, notifyAdmins simplesmente não envia nada
   (não é erro — só ninguém configurou ainda).
   ===================================================================== */
const { pool } = require("./db");
const mailer = require("./mailer");

function err(status, message) { return Object.assign(new Error(message), { statusCode: status }); }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listEmails() {
  const { rows } = await pool.query("SELECT id, email, created_at FROM notification_emails ORDER BY id ASC");
  return rows.map((r) => ({ id: r.id, email: r.email, createdAt: r.created_at }));
}

async function addEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(value)) throw err(400, "E-mail inválido.");
  try {
    await pool.query(
      "INSERT INTO notification_emails (email, created_at) VALUES ($1,$2)",
      [value, new Date().toISOString()]
    );
  } catch (e) {
    if (e.code === "23505") throw err(409, "Esse e-mail já está na lista.");
    throw e;
  }
  return listEmails();
}

async function removeEmail(id) {
  const r = await pool.query("DELETE FROM notification_emails WHERE id = $1", [id]);
  if (!r.rowCount) throw err(404, "E-mail não encontrado.");
  return listEmails();
}

// Manda o aviso pra todos os e-mails cadastrados. Nunca derruba quem
// chamou: falha no envio só fica no log do servidor.
async function notifyAdmins({ subject, text, html }) {
  const emails = await listEmails();
  if (!emails.length) return;
  try {
    await mailer.sendEmail({ to: emails.map((e) => e.email).join(", "), subject, text, html });
  } catch (e) {
    console.error("[notifications] falha ao notificar admins:", e.message);
  }
}

module.exports = { listEmails, addEmail, removeEmail, notifyAdmins };
