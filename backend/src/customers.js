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
const totp = require("./totp");

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
  return {
    id: row.id,
    email: row.email,
    nome: row.nome,
    cpf: row.cpf,
    telefone: row.telefone,
    twoFactorEnabled: !!row.two_factor_enabled,
  };
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

/* ======================================================================
   VERIFICAÇÃO EM DUAS ETAPAS (2FA)
   ====================================================================== */

// Gera um novo segredo e guarda (ainda não ativa — só vira "ativado" depois
// de confirmar com um código válido em confirm2FA).
async function start2FASetup(customerId, email) {
  const secret = totp.generateSecret();
  await pool.query("UPDATE customers SET two_factor_secret = $1 WHERE id = $2", [secret, customerId]);
  return { secret, otpauthUri: totp.generateOtpauthUri(secret, email) };
}

// Confirma o setup com o primeiro código digitado; se bater, ativa o 2FA
// e gera os códigos de backup (retornados em texto puro só essa vez).
async function confirm2FA(customerId, code) {
  const { rows } = await pool.query("SELECT two_factor_secret FROM customers WHERE id = $1", [customerId]);
  const secret = rows[0] && rows[0].two_factor_secret;
  if (!secret || !totp.verifyToken(secret, code)) return null;

  const backupCodes = totp.generateBackupCodes();
  const hashed = backupCodes.map((c) => auth.hashPassword(c));
  await pool.query(
    "UPDATE customers SET two_factor_enabled = true, two_factor_backup_codes = $1 WHERE id = $2",
    [JSON.stringify(hashed), customerId]
  );
  return backupCodes;
}

async function disable2FA(customerId) {
  await pool.query(
    `UPDATE customers
     SET two_factor_enabled = false, two_factor_secret = NULL, two_factor_backup_codes = NULL
     WHERE id = $1`,
    [customerId]
  );
}

// Aceita tanto o código de 6 dígitos do app quanto um código de backup
// (uso único — some da lista assim que usado).
async function verify2FACode(customerId, code) {
  const { rows } = await pool.query(
    "SELECT two_factor_secret, two_factor_backup_codes FROM customers WHERE id = $1",
    [customerId]
  );
  const row = rows[0];
  if (!row) return false;

  if (row.two_factor_secret && totp.verifyToken(row.two_factor_secret, code)) return true;

  if (row.two_factor_backup_codes) {
    const hashes = JSON.parse(row.two_factor_backup_codes);
    const idx = hashes.findIndex((h) => auth.verifyPassword(code, h));
    if (idx > -1) {
      hashes.splice(idx, 1);
      await pool.query("UPDATE customers SET two_factor_backup_codes = $1 WHERE id = $2", [
        JSON.stringify(hashes),
        customerId,
      ]);
      return true;
    }
  }
  return false;
}

/* ---------------------- LOGIN PENDENTE DE 2FA ----------------------
   Depois de confirmar e-mail/senha de uma conta com 2FA ativo, o login
   fica "pendente" até o código ser digitado. Guardado em memória (não
   no banco) porque é uma janela curta (5 min) — se o servidor reiniciar
   nesse meio-tempo, a pessoa só refaz o login, sem problema. */
const pending2FALogins = new Map(); // token -> { customerId, expiresAt }
const PENDING_2FA_TTL_MS = 5 * 60 * 1000;

function createPending2FALogin(customerId) {
  const token = crypto.randomBytes(24).toString("hex");
  pending2FALogins.set(token, { customerId, expiresAt: Date.now() + PENDING_2FA_TTL_MS });
  return token;
}

function consumePending2FALogin(token) {
  const entry = pending2FALogins.get(token);
  if (!entry) return null;
  pending2FALogins.delete(token);
  if (Date.now() > entry.expiresAt) return null;
  return entry.customerId;
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
  start2FASetup,
  confirm2FA,
  disable2FA,
  verify2FACode,
  createPending2FALogin,
  consumePending2FALogin,
};
