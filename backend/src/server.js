/* =====================================================================
   MARQUES ENERGIA SOLAR: BACKEND (login de admin + pedidos + crédito)
   ---------------------------------------------------------------------
   Servidor HTTP simples (módulos nativos do Node: http, crypto, fs,
   path + o pacote "pg" para falar com o Postgres do Supabase). Pode
   servir o site estático localmente, mas em produção o site fica no
   GitHub Pages e este backend roda separado (ex: Render), por isso o
   suporte a CORS + cookie cross-site abaixo.
   ===================================================================== */
const http = require("http");
const { URL } = require("url");

const config = require("./config");
const db = require("./db");
const auth = require("./auth");
const orders = require("./orders");
const creditLeads = require("./creditLeads");
const customers = require("./customers");
const { parseJSONBody, sendJSON, getClientIP } = require("./http-utils");
const { serveStatic } = require("./static");

/* ---------------------- CORS ---------------------- */
// Necessário porque em produção o site (GitHub Pages) e o backend (Render)
// ficam em domínios diferentes. Só libera origens que estiverem em
// CORS_ORIGIN (backend/.env); sem isso configurado, nada cross-site
// funciona (mas o site continua rodando normalmente em localhost).
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.CORS_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
}

/* ---------------------- HEADERS DE SEGURANÇA ---------------------- */
// Hardening básico, sem dependências externas. Não substitui um proxy/CDN
// com WAF, mas cobre o essencial pra um backend exposto direto na internet.
function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  if (config.NODE_ENV === "production") {
    // Só faz sentido com HTTPS (Render já serve tudo em HTTPS).
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
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

// "owner" enxerga as duas empresas; "funcionario" só a que está em admin.company.
function hasCompanyAccess(admin, company) {
  return admin.company === "ambas" || admin.company === company;
}

async function requireCompanyAccess(req, res, company) {
  const admin = await requireAdmin(req, res);
  if (!admin) return null;
  if (!hasCompanyAccess(admin, company)) {
    sendJSON(res, 403, { ok: false, error: "Sua conta não tem acesso a essa área." });
    return null;
  }
  return admin;
}

async function requireOwner(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return null;
  if (admin.role !== "owner") {
    sendJSON(res, 403, { ok: false, error: "Apenas o dono da conta pode gerenciar a equipe." });
    return null;
  }
  return admin;
}

/* ---------------------- HELPERS DE AUTENTICAÇÃO (CLIENTE) ---------------------- */
async function getCurrentCustomer(req) {
  const cookies = auth.parseCookies(req);
  const token = cookies[customers.SESSION_COOKIE_NAME];
  const customer = await customers.getCustomerBySession(token);
  return { token, customer };
}

async function requireCustomer(req, res) {
  const { customer } = await getCurrentCustomer(req);
  if (!customer) {
    sendJSON(res, 401, { ok: false, error: "Não autenticado. Faça login novamente." });
    return null;
  }
  return customer;
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
      {
        ok: true,
        admin: {
          id: record.id,
          email: record.email,
          name: record.name,
          company: record.company,
          role: record.role,
        },
      },
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
    const { customer } = await getCurrentCustomer(req);
    const { id, orderNumber } = await orders.createOrder(body, customer ? customer.id : null);
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
    const { customer } = await getCurrentCustomer(req);
    const { id, leadNumber } = await creditLeads.createLead(body, customer ? customer.id : null);
    return sendJSON(res, 201, { ok: true, id, leadNumber });
  }

  // ---- ADMIN: SOLICITAÇÕES DE CRÉDITO (só Promotora ou dono) ----
  if (pathname === "/api/admin/credit-leads" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q") || undefined;
    return sendJSON(res, 200, { ok: true, leads: await creditLeads.listLeads({ status, q }) });
  }

  if (pathname === "/api/admin/credit-leads/stats" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, stats: await creditLeads.getLeadStats() });
  }

  const creditLeadIdMatch = pathname.match(/^\/api\/admin\/credit-leads\/(\d+)$/);
  if (creditLeadIdMatch && (req.method === "GET" || req.method === "PATCH")) {
    const admin = await requireCompanyAccess(req, res, "promotora");
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

  // ---- ADMIN: PEDIDOS (só Energia Solar ou dono) ----
  if (pathname === "/api/admin/orders" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const status = url.searchParams.get("status") || undefined;
    const q = url.searchParams.get("q") || undefined;
    return sendJSON(res, 200, { ok: true, orders: await orders.listOrders({ status, q }) });
  }

  if (pathname === "/api/admin/stats" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, stats: await orders.getOrderStats() });
  }

  const orderIdMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (orderIdMatch && (req.method === "GET" || req.method === "PATCH")) {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
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

  // ---- CLIENTES: CADASTRO/LOGIN (conta única, loja + crédito) ----
  if (pathname === "/api/customers/register" && req.method === "POST") {
    const body = await parseJSONBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const nome = String(body.nome || "").trim();

    if (!email || !email.includes("@")) {
      return sendJSON(res, 400, { ok: false, error: "Informe um e-mail válido." });
    }
    if (!nome) {
      return sendJSON(res, 400, { ok: false, error: "Informe seu nome completo." });
    }
    if (!password || password.length < 8) {
      return sendJSON(res, 400, { ok: false, error: "A senha precisa ter ao menos 8 caracteres." });
    }
    const existing = await customers.findByEmail(email);
    if (existing) {
      return sendJSON(res, 409, { ok: false, error: "Já existe uma conta com esse e-mail." });
    }

    const id = await customers.register({
      email,
      password,
      nome,
      cpf: body.cpf,
      telefone: body.telefone,
    });
    const { token, expiresAt } = await customers.createSession(id);
    const record = await customers.findById(id);
    return sendJSON(
      res,
      201,
      { ok: true, customer: customers.toPublic(record) },
      { "Set-Cookie": auth.buildSessionCookie(token, expiresAt, customers.SESSION_COOKIE_NAME) }
    );
  }

  if (pathname === "/api/customers/login" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const body = await parseJSONBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const record = email ? await customers.findByEmail(email) : null;

    if (!record || !auth.verifyPassword(password, record.password_hash)) {
      auth.registerFailedAttempt(ip);
      return sendJSON(res, 401, { ok: false, error: "E-mail ou senha inválidos." });
    }

    auth.clearAttempts(ip);
    const { token, expiresAt } = await customers.createSession(record.id);
    return sendJSON(
      res,
      200,
      { ok: true, customer: customers.toPublic(record) },
      { "Set-Cookie": auth.buildSessionCookie(token, expiresAt, customers.SESSION_COOKIE_NAME) }
    );
  }

  if (pathname === "/api/customers/logout" && req.method === "POST") {
    const { token } = await getCurrentCustomer(req);
    await customers.destroySession(token);
    return sendJSON(res, 200, { ok: true }, { "Set-Cookie": auth.buildClearCookie(customers.SESSION_COOKIE_NAME) });
  }

  if (pathname === "/api/customers/me" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, { ok: true, customer: customers.toPublic(customer) });
  }

  if (pathname === "/api/customers/me" && req.method === "PATCH") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req);
    const nome = String(body.nome || "").trim();
    if (!nome) return sendJSON(res, 400, { ok: false, error: "Informe seu nome completo." });
    await customers.updateProfile(customer.id, { nome, cpf: body.cpf, telefone: body.telefone });
    const updated = await customers.findById(customer.id);
    return sendJSON(res, 200, { ok: true, customer: customers.toPublic(updated) });
  }

  if (pathname === "/api/customers/change-password" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req);
    if (!body.currentPassword || !auth.verifyPassword(body.currentPassword, customer.password_hash)) {
      return sendJSON(res, 401, { ok: false, error: "Senha atual incorreta." });
    }
    if (!body.newPassword || String(body.newPassword).length < 8) {
      return sendJSON(res, 400, { ok: false, error: "A nova senha precisa ter ao menos 8 caracteres." });
    }
    await customers.updatePassword(customer.id, body.newPassword);
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/customers/me/orders" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, { ok: true, orders: await orders.listOrdersByCustomer(customer.id) });
  }

  if (pathname === "/api/customers/me/credit-leads" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, { ok: true, leads: await creditLeads.listLeadsByCustomer(customer.id) });
  }

  // ---- ADMIN: GESTÃO DE EQUIPE (só "owner") ----
  if (pathname === "/api/admin/staff" && req.method === "GET") {
    const admin = await requireOwner(req, res);
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, staff: await auth.listAdmins() });
  }

  if (pathname === "/api/admin/staff" && req.method === "POST") {
    const admin = await requireOwner(req, res);
    if (!admin) return;
    const body = await parseJSONBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const company = body.company;
    const role = body.role;

    if (!email || !email.includes("@")) {
      return sendJSON(res, 400, { ok: false, error: "Informe um e-mail válido." });
    }
    if (!name) return sendJSON(res, 400, { ok: false, error: "Informe o nome do funcionário." });
    if (!password || password.length < 8) {
      return sendJSON(res, 400, { ok: false, error: "A senha precisa ter ao menos 8 caracteres." });
    }
    if (!auth.VALID_COMPANIES.includes(company)) {
      return sendJSON(res, 400, { ok: false, error: `Empresa inválida. Use uma de: ${auth.VALID_COMPANIES.join(", ")}` });
    }
    if (!auth.VALID_ROLES.includes(role)) {
      return sendJSON(res, 400, { ok: false, error: `Cargo inválido. Use um de: ${auth.VALID_ROLES.join(", ")}` });
    }
    const existing = await auth.findAdminByEmail(email);
    if (existing) return sendJSON(res, 409, { ok: false, error: "Já existe uma conta com esse e-mail." });

    const id = await auth.createAdmin({ email, password, name, company, role });
    return sendJSON(res, 201, { ok: true, staff: await auth.findAdminById(id) });
  }

  const staffIdMatch = pathname.match(/^\/api\/admin\/staff\/(\d+)$/);
  if (staffIdMatch && (req.method === "PATCH" || req.method === "DELETE")) {
    const admin = await requireOwner(req, res);
    if (!admin) return;
    const id = parseInt(staffIdMatch[1], 10);
    const target = await auth.findAdminById(id);
    if (!target) return sendJSON(res, 404, { ok: false, error: "Funcionário não encontrado." });

    if (req.method === "PATCH") {
      const body = await parseJSONBody(req);
      const name = String(body.name || target.name || "").trim();
      const company = body.company || target.company;
      const role = body.role || target.role;
      if (!auth.VALID_COMPANIES.includes(company)) {
        return sendJSON(res, 400, { ok: false, error: `Empresa inválida. Use uma de: ${auth.VALID_COMPANIES.join(", ")}` });
      }
      if (!auth.VALID_ROLES.includes(role)) {
        return sendJSON(res, 400, { ok: false, error: `Cargo inválido. Use um de: ${auth.VALID_ROLES.join(", ")}` });
      }
      // Protege pra sempre existir ao menos um "owner".
      if (target.role === "owner" && role !== "owner") {
        const owners = await auth.countOwners();
        if (owners <= 1) {
          return sendJSON(res, 400, { ok: false, error: "Precisa existir ao menos um dono da conta. Promova outra pessoa antes." });
        }
      }
      await auth.updateAdmin(id, { name, company, role });
      return sendJSON(res, 200, { ok: true, staff: await auth.findAdminById(id) });
    }

    if (req.method === "DELETE") {
      if (target.role === "owner") {
        const owners = await auth.countOwners();
        if (owners <= 1) {
          return sendJSON(res, 400, { ok: false, error: "Não é possível remover o único dono da conta." });
        }
      }
      if (target.id === admin.id) {
        return sendJSON(res, 400, { ok: false, error: "Você não pode remover a própria conta." });
      }
      await auth.deleteAdmin(id);
      return sendJSON(res, 200, { ok: true });
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
      applySecurityHeaders(res);

      // Preflight de CORS (o navegador manda isso antes de POST/PATCH com
      // JSON e antes de qualquer requisição com cookies cross-site).
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
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
    console.log(`\nMarques Energia Solar: servidor rodando em http://localhost:${config.PORT}`);
    console.log(`Painel de administrador: http://localhost:${config.PORT}/admin/login.html`);
    if (config.CORS_ORIGINS.length) {
      console.log(`Origens liberadas por CORS: ${config.CORS_ORIGINS.join(", ")}`);
    } else {
      console.log(`[aviso] CORS_ORIGIN não definida. Chamadas de outro domínio (ex: GitHub Pages) serão bloqueadas.`);
    }
    console.log("");
  });
}

main().catch((err) => {
  console.error("[erro fatal ao iniciar o servidor]", err);
  process.exit(1);
});
