/* =====================================================================
   AUTENTICAÇÃO DE ADMINISTRADOR
   ---------------------------------------------------------------------
   - Senha: hash com scrypt (módulo nativo `crypto`, sem dependências).
   - Sessão: token opaco aleatório guardado em cookie HttpOnly, com
     lookup no banco (revogável a qualquer momento, ao contrário de um
     JWT). Simples e adequado para um único usuário administrador.
   ===================================================================== */
const crypto = require("crypto");
const db = require("./db");
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
function ensureAdminSeeded() {
  const countRow = db.prepare("SELECT COUNT(*) as c FROM admins").get();
  if (countRow.c > 0) return;

  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
    console.error(
      "\n[ERRO] Nenhum administrador cadastrado e ADMIN_EMAIL / ADMIN_PASSWORD não foram definidos.\n" +
      "Copie backend/.env.example para backend/.env, defina essas duas variáveis e rode novamente.\n"
    );
    process.exit(1);
  }

  db.prepare(
    "INSERT INTO admins (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)"
  ).run(
    config.ADMIN_EMAIL.toLowerCase().trim(),
    hashPassword(config.ADMIN_PASSWORD),
    "Administrador",
    new Date().toISOString()
  );
  console.log(`[ok] Administrador inicial criado: ${config.ADMIN_EMAIL}`);
}

/* ---------------------- SESSÕES ---------------------- */
function createSession(adminId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + config.SESSION_TTL_HOURS * 3600 * 1000);
  db.prepare(
    "INSERT INTO sessions (token, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(token, adminId, now.toISOString(), expires.toISOString());
  return { token, expiresAt: expires };
}

function destroySession(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function getAdminBySession(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT admins.id as id, admins.email as email, admins.name as name, sessions.expires_at as expires_at
       FROM sessions JOIN admins ON admins.id = sessions.admin_id
       WHERE sessions.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}

function findAdminByEmail(email) {
  return db
    .prepare("SELECT * FROM admins WHERE email = ?")
    .get(String(email).toLowerCase().trim());
}

function updateAdminPassword(adminId, newPassword) {
  db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(
    hashPassword(newPassword),
    adminId
  );
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

function buildSessionCookie(token, expiresAt) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (config.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function buildClearCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (config.NODE_ENV === "production") parts.push("Secure");
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
