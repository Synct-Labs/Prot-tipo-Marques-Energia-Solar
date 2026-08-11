/* =====================================================================
   CONFIGURAÇÃO
   ---------------------------------------------------------------------
   Lê variáveis de ambiente de um arquivo .env na pasta backend/, sem
   depender de nenhum pacote externo (parser bem simples, suficiente
   para pares CHAVE=VALOR).
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, "..", ".env");

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  const content = fs.readFileSync(ENV_PATH, "utf8");
  content.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

loadEnvFile();

module.exports = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  SESSION_TTL_HOURS: parseInt(process.env.SESSION_TTL_HOURS || "168", 10), // 7 dias
  NODE_ENV: process.env.NODE_ENV || "development",
};
