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
const mailer = require("./mailer");
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

// Busca usada pelo admin pra encontrar o cliente ao cadastrar um contrato
// de empréstimo/participação nos lucros — por nome ou e-mail, resultado
// enxuto (sem senha/2FA/endereço).
async function searchCustomers(q) {
  const like = `%${String(q || "").trim()}%`;
  const { rows } = await pool.query(
    "SELECT id, nome, email, cpf FROM customers WHERE nome ILIKE $1 OR email ILIKE $1 ORDER BY nome LIMIT 15",
    [like]
  );
  return rows;
}

function toPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    nome: row.nome,
    cpf: row.cpf,
    telefone: row.telefone,
    endereco: {
      cep: row.endereco_cep || "",
      cidade: row.endereco_cidade || "",
      estado: row.endereco_estado || "",
      rua: row.endereco_rua || "",
      numero: row.endereco_numero || "",
      bairro: row.endereco_bairro || "",
      complemento: row.endereco_complemento || "",
    },
    twoFactorEnabled: !!row.two_factor_enabled,
    twoFactorMethod: row.two_factor_method || null,
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

// Endereço salvo separado do resto do perfil (chamado a partir do checkout,
// depois de um pedido confirmado) — atualiza só os campos de endereço, sem
// mexer em nome/cpf/telefone.
async function saveAddress(id, { cep, cidade, estado, rua, numero, bairro, complemento } = {}) {
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE customers SET
      endereco_cep = $1, endereco_cidade = $2, endereco_estado = $3, endereco_rua = $4,
      endereco_numero = $5, endereco_bairro = $6, endereco_complemento = $7, updated_at = $8
     WHERE id = $9`,
    [cep || "", cidade || "", estado || "", rua || "", numero || "", bairro || "", complemento || "", now, id]
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
   ---------------------------------------------------------------------
   A ativação inicial é sempre por e-mail (precisa provar que tem acesso
   à caixa de entrada antes de mexer em qualquer coisa). Depois de ativa,
   a pessoa pode trocar pro app autenticador (ou voltar pro e-mail) nas
   configurações — ver startMethodSwitch/confirmMethodSwitch mais abaixo.
   ====================================================================== */
function generateEmailCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function generateBackupCodes(count = 5) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

// Código de confirmação de setup: guardado em memória (curto prazo, poucos
// minutos), não no banco — mesmo raciocínio do login pendente logo abaixo.
const pendingEmailSetups = new Map(); // customerId -> { codeHash, expiresAt }
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;

async function start2FASetup(customerId, email) {
  const code = generateEmailCode();
  pendingEmailSetups.set(customerId, { codeHash: auth.hashPassword(code), expiresAt: Date.now() + EMAIL_CODE_TTL_MS });
  await mailer.sendEmail({
    to: email,
    subject: "Seu código de verificação Marques",
    text: `Seu código de verificação é: ${code}\nEle expira em 10 minutos.`,
    html: mailer.verificationEmailHTML(code),
  });
}

// Confirma o setup com o código recebido por e-mail; se bater, ativa o 2FA
// e gera os códigos de backup (retornados em texto puro só essa vez).
async function confirm2FA(customerId, code) {
  const pending = pendingEmailSetups.get(customerId);
  const valid = !!pending && Date.now() <= pending.expiresAt && auth.verifyPassword(code, pending.codeHash);
  if (!valid) return null;
  pendingEmailSetups.delete(customerId);

  const backupCodes = generateBackupCodes();
  const hashed = backupCodes.map((c) => auth.hashPassword(c));
  await pool.query(
    "UPDATE customers SET two_factor_enabled = true, two_factor_method = 'email', two_factor_backup_codes = $1 WHERE id = $2",
    [JSON.stringify(hashed), customerId]
  );
  return backupCodes;
}

async function disable2FA(customerId) {
  await pool.query(
    `UPDATE customers
     SET two_factor_enabled = false, two_factor_method = NULL, two_factor_secret = NULL, two_factor_backup_codes = NULL
     WHERE id = $1`,
    [customerId]
  );
}

/* ---------------------- TROCAR MÉTODO (só com 2FA já ativo) ----------------------
   Mesma ideia do setup inicial (código pendente + confirmação), mas pra
   trocar entre e-mail e app depois que a verificação já está ligada. */
const pendingMethodSwitches = new Map(); // customerId -> { targetMethod, secret? , codeHash?, expiresAt }

async function startMethodSwitch(customerId, email, targetMethod) {
  if (targetMethod === "app") {
    const secret = totp.generateSecret();
    pendingMethodSwitches.set(customerId, { targetMethod: "app", secret, expiresAt: Date.now() + EMAIL_CODE_TTL_MS });
    return { secret, otpauthUri: totp.generateOtpauthUri(secret, email) };
  }

  const code = generateEmailCode();
  pendingMethodSwitches.set(customerId, {
    targetMethod: "email",
    codeHash: auth.hashPassword(code),
    expiresAt: Date.now() + EMAIL_CODE_TTL_MS,
  });
  await mailer.sendEmail({
    to: email,
    subject: "Código pra trocar o método de verificação — Marques",
    text: `Seu código é: ${code}\nEle expira em 10 minutos.`,
    html: mailer.verificationEmailHTML(code),
  });
  return { method: "email" };
}

async function confirmMethodSwitch(customerId, code) {
  const pending = pendingMethodSwitches.get(customerId);
  if (!pending || Date.now() > pending.expiresAt) return null;

  const valid =
    pending.targetMethod === "app"
      ? totp.verifyToken(pending.secret, code)
      : auth.verifyPassword(code, pending.codeHash);
  if (!valid) return null;

  pendingMethodSwitches.delete(customerId);
  if (pending.targetMethod === "app") {
    await pool.query("UPDATE customers SET two_factor_method = 'app', two_factor_secret = $1 WHERE id = $2", [
      pending.secret,
      customerId,
    ]);
  } else {
    await pool.query("UPDATE customers SET two_factor_method = 'email', two_factor_secret = NULL WHERE id = $1", [
      customerId,
    ]);
  }
  return pending.targetMethod;
}

// Aceita o código do app (TOTP) ou do e-mail (guardado no próprio login
// pendente, ver mais abaixo), conforme o método ativo da conta — ou um
// código de backup (uso único, funciona pra qualquer método).
async function verify2FACode(pendingEntry, code) {
  const customerId = pendingEntry.customerId;
  const { rows } = await pool.query(
    "SELECT two_factor_method, two_factor_secret, two_factor_backup_codes FROM customers WHERE id = $1",
    [customerId]
  );
  const row = rows[0];
  if (!row) return false;

  if (row.two_factor_method === "app" && row.two_factor_secret && totp.verifyToken(row.two_factor_secret, code)) {
    return true;
  }
  if (row.two_factor_method === "email" && pendingEntry.emailCode && pendingEntry.emailCode === String(code).trim()) {
    return true;
  }

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
   nesse meio-tempo, a pessoa só refaz o login, sem problema. O próprio
   código enviado fica aqui junto (não seria prático reenviar e-mail a
   cada tentativa errada de digitar o código). */
const pending2FALogins = new Map(); // token -> { customerId, expiresAt, emailCode }
const PENDING_2FA_TTL_MS = 5 * 60 * 1000;

async function createPending2FALogin(customerId, method, email) {
  const token = crypto.randomBytes(24).toString("hex");
  const entry = { customerId, expiresAt: Date.now() + PENDING_2FA_TTL_MS };

  if (method === "email") {
    entry.emailCode = generateEmailCode();
    await mailer.sendEmail({
      to: email,
      subject: "Seu código de login Marques",
      text: `Seu código de login é: ${entry.emailCode}\nEle expira em 5 minutos.`,
      html: mailer.verificationEmailHTML(entry.emailCode),
    });
  }
  // método "app": nada pra enviar, a pessoa já tem o código no app dela.

  pending2FALogins.set(token, entry);
  return token;
}

// Não remove no simples "espiar" — só quando o código bate (consumePending2FALogin),
// pra permitir tentar de novo sem precisar reenviar e-mail a cada erro.
function peekPending2FALogin(token) {
  const entry = pending2FALogins.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    pending2FALogins.delete(token);
    return null;
  }
  return entry;
}

function consumePending2FALogin(token) {
  const entry = peekPending2FALogin(token);
  if (entry) pending2FALogins.delete(token);
  return entry;
}

module.exports = {
  SESSION_COOKIE_NAME,
  findByEmail,
  findById,
  searchCustomers,
  toPublic,
  register,
  updateProfile,
  saveAddress,
  updatePassword,
  createSession,
  destroySession,
  getCustomerBySession,
  start2FASetup,
  confirm2FA,
  disable2FA,
  startMethodSwitch,
  confirmMethodSwitch,
  verify2FACode,
  createPending2FALogin,
  peekPending2FALogin,
  consumePending2FALogin,
};
