/* =====================================================================
   AUTENTICAÇÃO DE CLIENTES
   ---------------------------------------------------------------------
   Conta de cliente única, usada tanto pela loja (Marques Energia Solar)
   quanto pelo simulador de crédito (Marques Promotora): mesmo login dá
   acesso ao histórico de pedidos e de solicitações de crédito.
   Mesmo esquema do auth.js (scrypt + sessão em token opaco), só que numa
   tabela e num cookie separados dos administradores.
   ===================================================================== */
const crypto = require("crypto");
const { pool } = require("./db");
const config = require("./config");
const auth = require("./auth");

const SESSION_COOKIE_NAME = "mes_customer_session";

async function findByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM customers WHERE email = $1", [
    String(email).toLowerCase().trim(),
  ]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query("SELECT * FROM customers WHERE id = $1", [id]);
  return rows[0] || null;
}

function toPublic(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, nome: row.nome, cpf: row.cpf, telefone: row.telefone };
}

async function register({ email, password, nome, cpf, telefone }) {
  const now = new Date().toISOString();
  const insert = await pool.query(
    `INSERT INTO customers (email, password_hash, nome, cpf, telefone, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
    [String(email).toLowerCase().trim(), auth.hashPassword(password), nome, cpf || "", telefone || "", now]
  );
  return insert.rows[0].id;
}

async function updateProfile(id, { nome, cpf, telefone }) {
  const now = new Date().toISOString();
  await pool.query(
    "UPDATE customers SET nome = $1, cpf = $2, telefone = $3, updated_at = $4 WHERE id = $5",
    [nome, cpf || "", telefone || "", now, id]
  );
}

async function updatePassword(id, newPassword) {
  await pool.query("UPDATE customers SET password_hash = $1 WHERE id = $2", [
    auth.hashPassword(newPassword),
    id,
  ]);
}

/* ---------------------- SESSÕES ---------------------- */
async function createSession(customerId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + config.SESSION_TTL_HOURS * 3600 * 1000);
  await pool.query(
    "INSERT INTO customer_sessions (token, customer_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
    [token, customerId, now.toISOString(), expires.toISOString()]
  );
  return { token, expiresAt: expires };
}

async function destroySession(token) {
  if (!token) return;
  await pool.query("DELETE FROM customer_sessions WHERE token = $1", [token]);
}

async function getCustomerBySession(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT customers.*, customer_sessions.expires_at as session_expires_at
     FROM customer_sessions JOIN customers ON customers.id = customer_sessions.customer_id
     WHERE customer_sessions.token = $1`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.session_expires_at).getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }
  return row;
}

module.exports = {
  SESSION_COOKIE_NAME,
  findByEmail,
  findById,
  toPublic,
  register,
  updateProfile,
  updatePassword,
  createSession,
  destroySession,
  getCustomerBySession,
};
