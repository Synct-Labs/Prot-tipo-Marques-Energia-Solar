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

// CORS_ORIGIN aceita uma ou mais origens separadas por vírgula, necessário
// porque em produção o site (GitHub Pages) e o backend (Render) ficam em
// domínios diferentes.
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

module.exports = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  // Mesma regra de sessão (TTL absoluto + timeout por inatividade) pra
  // todo tipo de conta — admin e cliente (parceiro é cliente com cadastro
  // extra, usa a mesma sessão). Cliente mexe com dado sensível também
  // (Marques Pay, KYC, crédito), então não faz sentido ficar mais frouxo.
  ADMIN_SESSION_TTL_HOURS: parseInt(process.env.ADMIN_SESSION_TTL_HOURS || "12", 10),
  ADMIN_IDLE_TIMEOUT_MINUTES: parseInt(process.env.ADMIN_IDLE_TIMEOUT_MINUTES || "20", 10),
  CUSTOMER_SESSION_TTL_HOURS: parseInt(process.env.CUSTOMER_SESSION_TTL_HOURS || "12", 10),
  CUSTOMER_IDLE_TIMEOUT_MINUTES: parseInt(process.env.CUSTOMER_IDLE_TIMEOUT_MINUTES || "20", 10),
  // Interruptor pra desligar temporariamente a verificação em duas etapas
  // obrigatória do cliente (ex: problema de entrega de e-mail em massa),
  // sem precisar mexer em código — só setar CUSTOMER_2FA_MANDATORY=false
  // no .env e reiniciar. Volta a ficar opcional (só quem já tinha ativado
  // continua pedindo código). O 2FA do admin NÃO é afetado por isso.
  CUSTOMER_2FA_MANDATORY: (process.env.CUSTOMER_2FA_MANDATORY || "true") !== "false",
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  CORS_ORIGINS,
  // E-mail (verificação em duas etapas, redefinição de senha, notificações
  // — ver backend/src/mailer.js). Envio via SMTP do Gmail/Google Workspace.
  // Sem SMTP_USER/SMTP_PASS definidos, o e-mail só é impresso no log do
  // servidor (modo de teste).
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "Marques Promotora <contato@marquespromotora.com>",
  // WhatsApp (aviso de nova OS pros técnicos — ver backend/src/whatsapp.js).
  // Evolution API própria; sem as 3 variáveis, a mensagem só vai pro log.
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || "",
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || "",
  EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE || "",
  // Endereço público do site, usado nos links das mensagens de WhatsApp.
  PUBLIC_URL: (process.env.PUBLIC_URL || "https://marquespromotora.com").replace(/\/+$/, ""),
};
