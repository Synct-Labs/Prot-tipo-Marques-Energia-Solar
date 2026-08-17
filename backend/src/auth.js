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
  const expires = new Date(now.getTime() + config.SESSION_TTL_HOURS * 3600 * 1000);
  await pool.query(
    "INSERT INTO sessions (token, admin_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
    [token, adminId, now.toISOString(), expires.toISOString()]
  );
  return { token, expiresAt: expires };
}

async function destroySession(token) {
  if (!token) return;
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

async function getAdminBySession(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT admins.id as id, admins.email as email, admins.name as name, sessions.expires_at as expires_at
     FROM sessions JOIN admins ON admins.id = sessions.admin_id
     WHERE sessions.token = $1`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
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

/* Em produção o site (GitHub Pages) e o backend (Render) ficam em domínios
   diferentes — cookie cross-site precisa de SameSite=None + Secure. Em
   desenvolvimento local (mesmo domínio, http) usamos SameSite=Lax normal. */
function cookieSameSiteAttrs() {
  return config.NODE_ENV === "production"
    ? ["SameSite=None", "Secure"]
    : ["SameSite=Lax"];
}

function buildSessionCookie(token, expiresAt) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    ...cookieSameSiteAttrs(),
    `Expires=${expiresAt.toUTCString()}`,
  ];
  return parts.join("; ");
}

function buildClearCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
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
  hashPassword,
  verifyPassword,
  ensureAdminSeeded,
  createSession,
  destroySession,
  getAdminBySession,
  findAdminByEmail,
  updateAdminPassword,
  parseCookies,
  buildSessionCookie,
  buildClearCookie,
  isRateLimited,
  registerFailedAttempt,
  clearAttempts,
};
