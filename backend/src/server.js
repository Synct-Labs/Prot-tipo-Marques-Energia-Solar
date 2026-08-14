/* =====================================================================
   MARQUES ENERGIA SOLAR — BACKEND (login de admin + pedidos)
   ---------------------------------------------------------------------
   Servidor HTTP simples, sem dependências externas (só módulos nativos
   do Node: http, node:sqlite, crypto, fs, path). Serve o site estático
   e expõe a API sob /api/*.
   ===================================================================== */
const http = require("http");
const { URL } = require("url");

const config = require("./config");
const auth = require("./auth");
const orders = require("./orders");
const creditLeads = require("./creditLeads");
const { parseJSONBody, sendJSON, getClientIP } = require("./http-utils");
const { serveStatic } = require("./static");

auth.ensureAdminSeeded();

/* ---------------------- HELPERS DE AUTENTICAÇÃO ---------------------- */
function getCurrentAdmin(req) {
  const cookies = auth.parseCookies(req);
  const token = cookies[auth.SESSION_COOKIE_NAME];
  return { token, admin: auth.getAdminBySession(token) };
}

function requireAdmin(req, res) {
  const { admin } = getCurrentAdmin(req);
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
    const record = email ? auth.findAdminByEmail(email) : null;

    if (!record || !auth.verifyPassword(password, record.password_hash)) {
      auth.registerFailedAttempt(ip);
      return sendJSON(res, 401, { ok: false, error: "E-mail ou senha inválidos." });
    }

    auth.clearAttempts(ip);
    const { token, expiresAt } = auth.createSession(record.id);
    return sendJSON(
      res,
      200,
      { ok: true, admin: { id: record.id, email: record.email, name: record.name } },
      { "Set-Cookie": auth.buildSessionCookie(token, expiresAt) }
    );
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const { token } = getCurrentAdmin(req);
    auth.destroySession(token);
    return sendJSON(res, 200, { ok: true }, { "Set-Cookie": auth.buildClearCookie() });
  }

  if (pathname === "/api/auth/me" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, admin });
  }

  if (pathname === "/api/auth/change-password" && req.method === "POST") {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const body = await parseJSONBody(req);
    const record = auth.findAdminByEmail(admin.email);
    if (!body.currentPassword || !auth.verifyPassword(body.currentPassword, record.password_hash)) {
      return sendJSON(res, 401, { ok: false, error: "Senha atual incorreta." });
    }
    if (!body.newPassword || String(body.newPassword).length < 8) {
      return sendJSON(res, 400, { ok: false, error: "A nova senha precisa ter ao menos 8 caracteres." });
    }
    auth.updateAdminPassword(admin.id, body.newPassword);
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
    const { id, orderNumber } = orders.createOrder(body);
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
    const { id, leadNumber } = creditLeads.createLead(body);
    return sendJSON(res, 201, { ok: true, id, leadNumber });
  }

  // ---- ADMIN: SOLICITAÇÕES DE CRÉDITO ----
  if (pathname === "/api/admin/credit-leads" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q") || undefined;
    return sendJSON(res, 200, { ok: true, leads: creditLeads.listLeads({ status, q }) });
  }

  if (pathname === "/api/admin/credit-leads/stats" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, stats: creditLeads.getLeadStats() });
  }

  const creditLeadIdMatch = pathname.match(/^\/api\/admin\/credit-leads\/(\d+)$/);
  if (creditLeadIdMatch && (req.method === "GET" || req.method === "PATCH")) {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const id = parseInt(creditLeadIdMatch[1], 10);

    if (req.method === "GET") {
      const lead = creditLeads.getLeadById(id);
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
      const changed = creditLeads.updateLeadStatus(id, body.status);
      if (!changed) return sendJSON(res, 404, { ok: false, error: "Solicitação não encontrada." });
      return sendJSON(res, 200, { ok: true, lead: creditLeads.getLeadById(id) });
    }
  }

  // ---- ADMIN: PEDIDOS ----
  if (pathname === "/api/admin/orders" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q") || undefined;
    return sendJSON(res, 200, { ok: true, orders: orders.listOrders({ status, q }) });
  }

  if (pathname === "/api/admin/stats" && req.method === "GET") {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, stats: orders.getOrderStats() });
  }

  const orderIdMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (orderIdMatch && (req.method === "GET" || req.method === "PATCH")) {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const id = parseInt(orderIdMatch[1], 10);

    if (req.method === "GET") {
      const order = orders.getOrderById(id);
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
      const changed = orders.updateOrderStatus(id, body.status);
      if (!changed) return sendJSON(res, 404, { ok: false, error: "Pedido não encontrado." });
      return sendJSON(res, 200, { ok: true, order: orders.getOrderById(id) });
    }
  }

  sendJSON(res, 404, { ok: false, error: "Rota de API não encontrada." });
}

const server = http.createServer(async (req, res) => {
  try {
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
  console.log(`Painel de administrador: http://localhost:${config.PORT}/admin/login.html\n`);
});
