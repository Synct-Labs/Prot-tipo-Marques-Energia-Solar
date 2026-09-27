/* =====================================================================
   AUTENTICAÇÃO DE ADMINISTRADOR
   ---------------------------------------------------------------------
   - Senha: hash com scrypt (módulo nativo `crypto`, sem dependências).
   - Sessão: token opaco aleatório guardado em cookie HttpOnly, com
     lookup no banco (revogável a qualquer momento, ao contrário de um
     JWT). Simples e adequado para um único usuário administrador.
   ===================================================================== */
const crypto = require("crypto");
const { pool } = require("./db");
const config = require("./config");
const mailer = require("./mailer");

const SESSION_COOKIE_NAME = "mes_admin_session";

/* ---------------------- SENHA ---------------------- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

// Hash fixo só pra gastar o mesmo tempo de scrypt quando o e-mail não
// existe. Sem isso, login vaza por timing se um e-mail está cadastrado:
// e-mail que existe faz um scrypt (mais lento), e-mail que não existe
// responde na hora (sem hash nenhum) — dá pra enumerar contas medindo
// o tempo de resposta.
const DUMMY_HASH = hashPassword("dummy-password-so-a-resposta-demora-igual");

function verifyPasswordSafe(password, storedHashOrNull) {
  const result = verifyPassword(password, storedHashOrNull || DUMMY_HASH);
  return storedHashOrNull ? result : false;
}

/* ======================================================================
   VERIFICAÇÃO EM DUAS ETAPAS DO ADMIN (obrigatória, sempre por e-mail)
   ---------------------------------------------------------------------
   Diferente do 2FA do cliente (opcional, com escolha de método), o do
   admin é sempre ligado e sempre por e-mail — o painel mexe com dado
   sensível (aprovação de KYC, comissão, crédito), então não dá pra
   deixar como opção. Sem passo de "ativar": todo admin já nasce com
   isso, em toda tentativa de login depois da senha certa.
   ====================================================================== */
const pendingAdminLogins = new Map(); // token -> { adminId, expiresAt, emailCode }
const ADMIN_2FA_TTL_MS = 5 * 60 * 1000;

function generateEmailCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

async function createPendingAdminLogin(adminId, email) {
  const token = crypto.randomBytes(24).toString("hex");
  const emailCode = generateEmailCode();
  pendingAdminLogins.set(token, { adminId, expiresAt: Date.now() + ADMIN_2FA_TTL_MS, emailCode });
  await mailer.sendEmail({
    to: email,
    subject: "Seu código de login — Painel Marques",
    text: `Seu código de login é: ${emailCode}\nEle expira em 5 minutos. Se não foi você tentando entrar, ignore este e-mail.`,
    html: mailer.verificationEmailHTML(emailCode),
  });
  return token;
}

// Não remove no simples "espiar" — só quando o código bate, pra dar pra
// tentar de novo sem precisar reenviar e-mail a cada erro de digitação.
function peekPendingAdminLogin(token) {
  const entry = pendingAdminLogins.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    pendingAdminLogins.delete(token);
    return null;
  }
  return entry;
}

function consumePendingAdminLogin(token) {
  const entry = peekPendingAdminLogin(token);
  if (entry) pendingAdminLogins.delete(token);
  return entry;
}

function verifyAdminLoginCode(pendingEntry, code) {
  return !!pendingEntry && pendingEntry.emailCode === String(code || "").trim();
}

/* ---------------------- BOOTSTRAP DO ADMIN ---------------------- */
async function ensureAdminSeeded() {
  const { rows } = await pool.query("SELECT COUNT(*)::int as c FROM admins");
  if (rows[0].c > 0) return;

  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
    console.error(
      "\n[ERRO] Nenhum administrador cadastrado e ADMIN_EMAIL / ADMIN_PASSWORD não foram definidos.\n" +
      "Copie backend/.env.example para backend/.env, defina essas duas variáveis e rode novamente.\n"
    );
    process.exit(1);
  }

  await pool.query(
    "INSERT INTO admins (email, password_hash, name, created_at) VALUES ($1, $2, $3, $4)",
    [
      config.ADMIN_EMAIL.toLowerCase().trim(),
      hashPassword(config.ADMIN_PASSWORD),
      "Administrador",
      new Date().toISOString(),
    ]
  );
  console.log(`[ok] Administrador inicial criado: ${config.ADMIN_EMAIL}`);
}

/* ---------------------- SESSÕES ---------------------- */
async function createSession(adminId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + config.ADMIN_SESSION_TTL_HOURS * 3600 * 1000);
  await pool.query(
    "INSERT INTO sessions (token, admin_id, created_at, expires_at, last_seen_at) VALUES ($1, $2, $3, $4, $3)",
    [token, adminId, now.toISOString(), expires.toISOString()]
  );
  return { token, expiresAt: expires };
}

async function destroySession(token) {
  if (!token) return;
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

// Timeout por inatividade: além do expires_at absoluto (criação da
// sessão), a sessão de admin também some se ficar N minutos sem uso —
// ver ADMIN_IDLE_TIMEOUT_MINUTES em config.js.
async function getAdminBySession(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT admins.id as id, admins.email as email, admins.name as name,
            admins.company as company, admins.role as role,
            sessions.expires_at as expires_at, sessions.last_seen_at as last_seen_at,
            sessions.created_at as created_at
     FROM sessions JOIN admins ON admins.id = sessions.admin_id
     WHERE sessions.token = $1`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  const now = Date.now();
  if (new Date(row.expires_at).getTime() < now) {
    await destroySession(token);
    return null;
  }
  const lastSeen = new Date(row.last_seen_at || row.created_at).getTime();
  if (now - lastSeen > config.ADMIN_IDLE_TIMEOUT_MINUTES * 60 * 1000) {
    await destroySession(token);
    return null;
  }
  // Não bloqueia a resposta por causa disso — só marca "visto agora".
  pool.query("UPDATE sessions SET last_seen_at = $1 WHERE token = $2", [new Date(now).toISOString(), token]).catch(() => {});
  return { id: row.id, email: row.email, name: row.name, company: row.company, role: row.role };
}

async function findAdminByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM admins WHERE email = $1", [
    String(email).toLowerCase().trim(),
  ]);
  return rows[0] || null;
}

async function updateAdminPassword(adminId, newPassword) {
  await pool.query("UPDATE admins SET password_hash = $1 WHERE id = $2", [
    hashPassword(newPassword),
    adminId,
  ]);
}

/* ---------------------- GESTÃO DE EQUIPE (só "owner") ---------------------- */
const VALID_COMPANIES = ["energia_solar", "promotora", "ambas"];
const VALID_ROLES = ["owner", "funcionario"];

async function listAdmins() {
  const { rows } = await pool.query(
    "SELECT id, email, name, company, role, created_at FROM admins ORDER BY id ASC"
  );
  return rows;
}

async function findAdminById(id) {
  const { rows } = await pool.query(
    "SELECT id, email, name, company, role, created_at FROM admins WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

async function countOwners() {
  const { rows } = await pool.query("SELECT COUNT(*)::int as c FROM admins WHERE role = 'owner'");
  return rows[0].c;
}

async function createAdmin({ email, password, name, company, role }) {
  const created_at = new Date().toISOString();
  const insert = await pool.query(
    `INSERT INTO admins (email, password_hash, name, company, role, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [String(email).toLowerCase().trim(), hashPassword(password), name, company, role, created_at]
  );
  return insert.rows[0].id;
}

async function updateAdmin(id, { name, company, role }) {
  const result = await pool.query(
    "UPDATE admins SET name = $1, company = $2, role = $3 WHERE id = $4",
    [name, company, role, id]
  );
  return result.rowCount > 0;
}

async function deleteAdmin(id) {
  await pool.query("DELETE FROM sessions WHERE admin_id = $1", [id]);
  const result = await pool.query("DELETE FROM admins WHERE id = $1", [id]);
  return result.rowCount > 0;
}

/* ---------------------- COOKIES ---------------------- */
function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

/* O site e o backend rodam no mesmo domínio (mesma origem) tanto em
   desenvolvimento quanto em produção — não precisa de SameSite=None (que
   só faz sentido pra cookie cross-site, e abre brecha de CSRF à toa).
   Secure fica ligado em produção porque lá é sempre HTTPS. */
function cookieSameSiteAttrs() {
  return config.NODE_ENV === "production"
    ? ["SameSite=Lax", "Secure"]
    : ["SameSite=Lax"];
}

function buildSessionCookie(token, expiresAt, cookieName = SESSION_COOKIE_NAME) {
  const parts = [
    `${cookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    ...cookieSameSiteAttrs(),
    `Expires=${expiresAt.toUTCString()}`,
  ];
  return parts.join("; ");
}

function buildClearCookie(cookieName = SESSION_COOKIE_NAME) {
  const parts = [
    `${cookieName}=`,
    "HttpOnly",
    "Path=/",
    ...cookieSameSiteAttrs(),
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  return parts.join("; ");
}

/* ---------------------- LIMITADOR SIMPLES DE TENTATIVAS DE LOGIN ---------------------- */
const loginAttempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailedAttempt(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

module.exports = {
  SESSION_COOKIE_NAME,
  VALID_COMPANIES,
  VALID_ROLES,
  hashPassword,
  verifyPassword,
  verifyPasswordSafe,
  createPendingAdminLogin,
  peekPendingAdminLogin,
  consumePendingAdminLogin,
  verifyAdminLoginCode,
  ensureAdminSeeded,
  createSession,
  destroySession,
  getAdminBySession,
  findAdminByEmail,
  updateAdminPassword,
  listAdmins,
  findAdminById,
  countOwners,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  parseCookies,
  cookieSameSiteAttrs,
  buildSessionCookie,
  buildClearCookie,
  isRateLimited,
  registerFailedAttempt,
  clearAttempts,
};
