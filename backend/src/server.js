/* =====================================================================
   MARQUES ENERGIA SOLAR — BACKEND (login de admin + pedidos + crédito)
   ---------------------------------------------------------------------
   Servidor HTTP simples (módulos nativos do Node: http, crypto, fs,
   path + o pacote "pg" para falar com o Postgres do Supabase). Pode
   servir o site estático localmente, mas em produção o site fica no
   GitHub Pages e este backend roda separado (ex: Render) — por isso o
   suporte a CORS + cookie cross-site abaixo.
   ===================================================================== */
const http = require("http");
const { URL } = require("url");

const config = require("./config");
const db = require("./db");
const auth = require("./auth");
const orders = require("./orders");
const creditLeads = require("./creditLeads");
const { parseJSONBody, sendJSON, getClientIP } = require("./http-utils");
const { serveStatic } = require("./static");

/* ---------------------- CORS ---------------------- */
// Necessário porque em produção o site (GitHub Pages) e o backend (Render)
// ficam em domínios diferentes. Só libera origens que estiverem em
// CORS_ORIGIN (backend/.env) — sem isso configurado, nada cross-site
// funciona (mas o site continua rodando normalmente em localhost).
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.CORS_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
}

/* ---------------------- HELPERS DE AUTENTICAÇÃO ---------------------- */
async function getCurrentAdmin(req) {
  const cookies = auth.parseCookies(req);
  const token = cookies[auth.SESSION_COOKIE_NAME];
  const admin = await auth.getAdminBySession(token);
  return { token, admin };
}

async function requireAdmin(req, res) {
  const { admin } = await getCurrentAdmin(req);
  if (!admin) {
    sendJSON(res, 401, { ok: false, error: "Não autenticado. Faça login novamente." });
    return null;
  }
  return admin;
}

/* ---------------------- VALIDAÇÃO DO PEDIDO ---------------------- */
function validateOrderPayload(body) {
  const required = ["nome", "cpf", "email", "telefone", "cep", "cidade", "estado", "rua", "numero", "bairro"];
  const missing = required.filter((f) => !body[f] || String(body[f]).trim() === "");
  if (missing.length) return `Campos obrigatórios ausentes: ${missing.join(", ")}`;

  if (!Array.isArray(body.itens) || body.itens.length === 0) return "O pedido precisa ter ao menos um item.";
  const itensInvalidos = body.itens.some(
    (it) => !it || typeof it.qty !== "number" || it.qty <= 0 || typeof it.preco !== "number" || !it.nome
  );
  if (itensInvalidos) return "Itens do pedido em formato inválido.";

  if (typeof body.subtotal !== "number" || typeof body.total !== "number") {
    return "Subtotal/total do pedido em formato inválido.";
  }
  return null;
}

/* ---------------------- ROTEADOR ---------------------- */
async function handleApi(req, res, pathname) {
  const ip = getClientIP(req);

  // ---- AUTENTICAÇÃO ----
  if (pathname === "/api/auth/login" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const body = await parseJSONBody(req);
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const record = email ? await auth.findAdminByEmail(email) : null;

    if (!record || !auth.verifyPassword(password, record.password_hash)) {
      auth.registerFailedAttempt(ip);
      return sendJSON(res, 401, { ok: false, error: "E-mail ou senha inválidos." });
    }

    auth.clearAttempts(ip);
    const { token, expiresAt } = await auth.createSession(record.id);
    return sendJSON(
      res,
      200,
      { ok: true, admin: { id: record.id, email: record.email, name: record.name } },
      { "Set-Cookie": auth.buildSessionCookie(token, expiresAt) }
    );
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const { token } = await getCurrentAdmin(req);
    await auth.destroySession(token);
    return sendJSON(res, 200, { ok: true }, { "Set-Cookie": auth.buildClearCookie() });
  }

  if (pathname === "/api/auth/me" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, admin });
  }

  if (pathname === "/api/auth/change-password" && req.method === "POST") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = await parseJSONBody(req);
    const record = await auth.findAdminByEmail(admin.email);
    if (!body.currentPassword || !auth.verifyPassword(body.currentPassword, record.password_hash)) {
      return sendJSON(res, 401, { ok: false, error: "Senha atual incorreta." });
    }
    if (!body.newPassword || String(body.newPassword).length < 8) {
      return sendJSON(res, 400, { ok: false, error: "A nova senha precisa ter ao menos 8 caracteres." });
    }
    await auth.updateAdminPassword(admin.id, body.newPassword);
    return sendJSON(res, 200, { ok: true });
  }

  // ---- PEDIDOS (checkout público) ----
  if (pathname === "/api/orders" && req.method === "POST") {
    const body = await parseJSONBody(req);
    const error = validateOrderPayload(body);
    if (error) return sendJSON(res, 400, { ok: false, error });

    /* ===================================================================
       Pontos de integração futura (produção):
       - E-mail: notificar cliente + loja após criar o pedido.
       - Frete: calcular valor real via CEP antes de gravar o pedido.
       - Pagamento: ver PONTO DE INTEGRAÇÃO DE PAGAMENTO em app.js.
       =================================================================== */
    const { id, orderNumber } = await orders.createOrder(body);
    return sendJSON(res, 201, { ok: true, id, orderNumber });
  }

  // ---- SOLICITAÇÕES DE ANÁLISE DE CRÉDITO (formulário público) ----
  if (pathname === "/api/credit-leads" && req.method === "POST") {
    const body = await parseJSONBody(req);
    const missing = creditLeads.validateLeadPayload(body);
    if (missing.length) {
      return sendJSON(res, 400, {
        ok: false,
        error: `Campos obrigatórios ausentes: ${missing.join(", ")}`,
      });
    }

    /* ===================================================================
       Ponto de integração futura (produção):
       - E-mail/WhatsApp: notificar equipe comercial após nova solicitação.
       - Bureau de crédito: consulta automática de score, se aplicável.
       =================================================================== */
    const { id, leadNumber } = await creditLeads.createLead(body);
    return sendJSON(res, 201, { ok: true, id, leadNumber });
  }

  // ---- ADMIN: SOLICITAÇÕES DE CRÉDITO ----
  if (pathname === "/api/admin/credit-leads" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q") || undefined;
    return sendJSON(res, 200, { ok: true, leads: await creditLeads.listLeads({ status, q }) });
  }

  if (pathname === "/api/admin/credit-leads/stats" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, stats: await creditLeads.getLeadStats() });
  }

  const creditLeadIdMatch = pathname.match(/^\/api\/admin\/credit-leads\/(\d+)$/);
  if (creditLeadIdMatch && (req.method === "GET" || req.method === "PATCH")) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = parseInt(creditLeadIdMatch[1], 10);

    if (req.method === "GET") {
      const lead = await creditLeads.getLeadById(id);
      if (!lead) return sendJSON(res, 404, { ok: false, error: "Solicitação não encontrada." });
      return sendJSON(res, 200, { ok: true, lead });
    }

    if (req.method === "PATCH") {
      const body = await parseJSONBody(req);
      if (!creditLeads.VALID_STATUSES.includes(body.status)) {
        return sendJSON(res, 400, {
          ok: false,
          error: `Status inválido. Use um de: ${creditLeads.VALID_STATUSES.join(", ")}`,
        });
      }
      const changed = await creditLeads.updateLeadStatus(id, body.status);
      if (!changed) return sendJSON(res, 404, { ok: false, error: "Solicitação não encontrada." });
      return sendJSON(res, 200, { ok: true, lead: await creditLeads.getLeadById(id) });
    }
  }

  // ---- ADMIN: PEDIDOS ----
  if (pathname === "/api/admin/orders" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q") || undefined;
    return sendJSON(res, 200, { ok: true, orders: await orders.listOrders({ status, q }) });
  }

  if (pathname === "/api/admin/stats" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, stats: await orders.getOrderStats() });
  }

  const orderIdMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (orderIdMatch && (req.method === "GET" || req.method === "PATCH")) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const id = parseInt(orderIdMatch[1], 10);

    if (req.method === "GET") {
      const order = await orders.getOrderById(id);
      if (!order) return sendJSON(res, 404, { ok: false, error: "Pedido não encontrado." });
      return sendJSON(res, 200, { ok: true, order });
    }

    if (req.method === "PATCH") {
      const body = await parseJSONBody(req);
      if (!orders.VALID_STATUSES.includes(body.status)) {
        return sendJSON(res, 400, {
          ok: false,
          error: `Status inválido. Use um de: ${orders.VALID_STATUSES.join(", ")}`,
        });
      }
      const changed = await orders.updateOrderStatus(id, body.status);
      if (!changed) return sendJSON(res, 404, { ok: false, error: "Pedido não encontrado." });
      return sendJSON(res, 200, { ok: true, order: await orders.getOrderById(id) });
    }
  }

  sendJSON(res, 404, { ok: false, error: "Rota de API não encontrada." });
}

async function main() {
  await db.initSchema();
  await auth.ensureAdminSeeded();

  const server = http.createServer(async (req, res) => {
    try {
      applyCors(req, res);

      // Preflight de CORS (o navegador manda isso antes de POST/PATCH com
      // JSON e antes de qualquer requisição com cookies cross-site).
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.writeHead(204);
        res.end();
        return;
      }

      const pathname = req.url.split("?")[0];

      if (pathname.startsWith("/api/")) {
        await handleApi(req, res, pathname);
        return;
      }

      const served = serveStatic(req, res);
      if (!served) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Não encontrado");
      }
    } catch (err) {
      console.error("[erro não tratado]", err);
      if (!res.headersSent) {
        sendJSON(res, err.statusCode || 500, { ok: false, error: "Erro interno do servidor." });
      }
    }
  });

  server.listen(config.PORT, () => {
    console.log(`\nMarques Energia Solar — servidor rodando em http://localhost:${config.PORT}`);
    console.log(`Painel de administrador: http://localhost:${config.PORT}/admin/login.html`);
    if (config.CORS_ORIGINS.length) {
      console.log(`Origens liberadas por CORS: ${config.CORS_ORIGINS.join(", ")}`);
    } else {
      console.log(`[aviso] CORS_ORIGIN não definida — chamadas de outro domínio (ex: GitHub Pages) serão bloqueadas.`);
    }
    console.log("");
  });
}

main().catch((err) => {
  console.error("[erro fatal ao iniciar o servidor]", err);
  process.exit(1);
});
