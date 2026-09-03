/* =====================================================================
   VERIFICAÇÃO EM DUAS ETAPAS (TOTP — RFC 6238)
   ---------------------------------------------------------------------
   Implementação própria com o módulo nativo "crypto" (sem dependência
   externa), compatível com Google Authenticator, Authy, 1Password etc.
   Mesmo algoritmo que esses apps usam: HMAC-SHA1, código de 6 dígitos,
   janela de 30 segundos.
   ===================================================================== */
const crypto = require("crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

function base32Encode(buffer) {
  let bits = 0, value = 0, output = "";
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(base32) {
  const clean = String(base32).replace(/=+$/, "").toUpperCase();
  let bits = 0, value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secretBuffer, counter) {
  const counterBuf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tmp % 256;
    tmp = Math.floor(tmp / 256);
  }
  const hmac = crypto.createHmac("sha1", secretBuffer).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

function codeForTime(secretBase32, atMs) {
  const counter = Math.floor(atMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(secretBase32), counter);
}

/* ---------------------- API PÚBLICA ---------------------- */
function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

// otpauth:// abre direto no app autenticador quando tocado no celular;
// em desktop, a pessoa digita a chave (secret) manualmente no app.
function generateOtpauthUri(secret, email) {
  const issuer = "Marques";
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

// Aceita o código do passo atual e um passo antes/depois, pra tolerar
// pequena diferença de relógio entre o celular e o servidor.
function verifyToken(secretBase32, token, window = 1) {
  const clean = String(token || "").trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Date.now();
  for (let w = -window; w <= window; w++) {
    const candidate = codeForTime(secretBase32, now + w * STEP_SECONDS * 1000);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) return true;
  }
  return false;
}

// Códigos de backup: uso único, pra quando a pessoa perde acesso ao app
// autenticador. Formato XXXX-XXXX, fácil de copiar/digitar.
function generateBackupCodes(count = 5) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

module.exports = { generateSecret, generateOtpauthUri, verifyToken, generateBackupCodes };
