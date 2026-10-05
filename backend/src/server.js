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
const loans = require("./loans");
const profitShare = require("./profitShare");
const products = require("./products");
const payAccounts = require("./payAccounts");
const payKyc = require("./payKyc");
const payBalance = require("./payBalance");
const partners = require("./partners");
const consorcio = require("./consorcio");
const folders = require("./folders");
const notifications = require("./notifications");
const mailer = require("./mailer");
const payPartner = require("./payPartner");
const { parseJSONBody, sendJSON, sendBinary, getClientIP, isAllowedFileMime, ALLOWED_FILE_MIMES } = require("./http-utils");
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
  // 'unsafe-inline' em script/style é necessário porque o site inteiro usa
  // <script>/style="" inline (sem build step) — mesmo assim, isso já
  // bloqueia carregar script/frame/objeto de qualquer origem externa,
  // hijack de <base> e submit de formulário pra fora do site.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://viacep.com.br; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'"
  );
  if (config.NODE_ENV === "production") {
    // Só faz sentido com HTTPS (a VPS serve tudo atrás do Nginx com TLS).
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

/* ---------------------- VALIDAÇÃO DO PRODUTO (catálogo) ---------------------- */
const VALID_PRODUCT_CATEGORIES = ["kits", "paineis", "inversores", "cabos", "estrutura", "baterias", "controlador"];

function validateProductPayload(body) {
  if (!VALID_PRODUCT_CATEGORIES.includes(body.cat)) {
    return `Categoria inválida. Use uma de: ${VALID_PRODUCT_CATEGORIES.join(", ")}`;
  }
  if (!String(body.name || "").trim()) return "Informe o nome do produto.";
  if (typeof body.price !== "number" || !(body.price > 0)) return "Preço inválido.";
  if (body.promoPrice !== undefined && body.promoPrice !== null) {
    if (typeof body.promoPrice !== "number" || !(body.promoPrice > 0)) return "Preço promocional inválido.";
    if (body.promoPrice >= body.price) return "O preço promocional precisa ser menor que o preço normal.";
  }
  if (body.specs && typeof body.specs !== "object") return "Specs em formato inválido.";
  if (body.bundleItems && !Array.isArray(body.bundleItems)) return "Itens do kit em formato inválido.";
  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) return "Imagens em formato inválido.";
    if (body.images.length > products.MAX_IMAGES) return `Cada produto aceita no máximo ${products.MAX_IMAGES} imagens.`;
  }
  return null;
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

  if (body.parcelas !== undefined && body.parcelas !== null) {
    if (!Number.isInteger(body.parcelas) || body.parcelas < 1 || body.parcelas > 10) {
      return "Número de parcelas inválido (aceita de 1 a 10).";
    }
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

    if (!auth.verifyPasswordSafe(password, record && record.password_hash)) {
      auth.registerFailedAttempt(ip);
      return sendJSON(res, 401, { ok: false, error: "E-mail ou senha inválidos." });
    }

    auth.clearAttempts(ip);
    // Verificação em duas etapas é obrigatória pro admin: senha certa não
    // fecha o login sozinha, sempre pede o código mandado por e-mail antes
    // de abrir sessão (painel mexe com KYC, comissão e crédito).
    const pendingToken = await auth.createPendingAdminLogin(record.id, record.email);
    return sendJSON(res, 200, { ok: true, requires2FA: true, pendingToken });
  }

  if (pathname === "/api/auth/login/2fa" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const body = await parseJSONBody(req);
    const pendingToken = String(body.pendingToken || "");
    const pending = auth.peekPendingAdminLogin(pendingToken);
    if (!pending) {
      return sendJSON(res, 401, { ok: false, error: "Sessão de verificação expirada. Faça login novamente.", expired: true });
    }
    if (!auth.verifyAdminLoginCode(pending, body.code)) {
      auth.registerFailedAttempt(ip);
      return sendJSON(res, 401, { ok: false, error: "Código inválido.", pendingToken });
    }
    auth.consumePendingAdminLogin(pendingToken);
    auth.clearAttempts(ip);
    const record = await auth.findAdminById(pending.adminId);
    if (!record) return sendJSON(res, 404, { ok: false, error: "Conta não encontrada." });
    const { token, expiresAt } = await auth.createSession(record.id);
    try {
      await mailer.sendEmail({
        to: record.email,
        subject: "Novo login no painel Marques / New login to the Marques panel",
        text: `Sua conta entrou no painel agora (IP ${ip}). Se não foi você, troque sua senha.\n\nYour account just logged into the panel (IP ${ip}). If this wasn't you, change your password.`,
        html: mailer.adminLoginNotificationHTML({ ip, quando: new Date().toLocaleString("pt-BR") }),
      });
    } catch (e) { console.error("[auth] falha ao avisar login do admin:", e.message); }
    return sendJSON(
      res,
      200,
      { ok: true, admin: { id: record.id, email: record.email, name: record.name, company: record.company, role: record.role } },
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

  // ---- ADMIN: "ESQUECI MINHA SENHA" ----
  // Sempre responde { ok: true } (exista ou não a conta) pra não dar pra
  // descobrir e-mails cadastrados testando essa rota — só entra e-mail
  // de verdade quando a conta existe.
  if (pathname === "/api/auth/forgot-password" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    auth.registerFailedAttempt(ip);
    const body = await parseJSONBody(req);
    const email = String(body.email || "").trim();
    const record = email ? await auth.findAdminByEmail(email) : null;
    if (record) {
      const token = await auth.createPasswordResetToken(record.id);
      try {
        await mailer.sendEmail({
          to: record.email,
          subject: "Redefinir sua senha — Painel Marques / Reset your password — Marques Panel",
          text: `Pediram a redefinição da sua senha. Acesse o link abaixo pra escolher uma nova (expira em 1 hora). Se não foi você, ignore este e-mail.\n${mailer.passwordResetLink("admin", token)}\n\nSomeone requested a password reset. Use the link below to choose a new one (expires in 1 hour). If this wasn't you, ignore this email.\n${mailer.passwordResetLink("admin", token)}`,
          html: mailer.passwordResetEmailHTML("admin", token),
        });
      } catch (e) { console.error("[auth] falha ao enviar e-mail de redefinição de senha:", e.message); }
    }
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/auth/reset-password" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const body = await parseJSONBody(req);
    const token = String(body.token || "");
    if (!body.newPassword || String(body.newPassword).length < 8) {
      return sendJSON(res, 400, { ok: false, error: "A nova senha precisa ter ao menos 8 caracteres." });
    }
    const consumed = await auth.consumePasswordResetToken(token);
    if (!consumed) {
      auth.registerFailedAttempt(ip);
      return sendJSON(res, 400, { ok: false, error: "Este link expirou ou já foi usado. Peça um novo." });
    }
    auth.clearAttempts(ip);
    await auth.updateAdminPassword(consumed.adminId, body.newPassword);
    await auth.destroyAllAdminSessions(consumed.adminId);
    return sendJSON(res, 200, { ok: true });
  }

  // ---- CATÁLOGO (público — mesma info que já era publicada direto no app.js) ----
  if (pathname === "/api/products" && req.method === "GET") {
    return sendJSON(res, 200, { ok: true, products: await products.listAll() });
  }

  // Foto de produto enviada pelo admin — pública (a loja precisa exibir). O
  // id nunca é reaproveitado (foto nova = id novo), então pode cachear pra sempre.
  const productImageMatch = pathname.match(/^\/api\/product-images\/(\d+)$/);
  if (productImageMatch && req.method === "GET") {
    const img = await products.getImage(parseInt(productImageMatch[1], 10));
    if (!img) return sendJSON(res, 404, { ok: false, error: "Imagem não encontrada." });
    return sendBinary(res, 200, img.data, img.tipo, img.nome, {
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
  }

  // ---- ADMIN: FOTOS DO CATÁLOGO (upload; a URL devolvida entra em images do produto) ----
  if (pathname === "/api/admin/product-images" && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const body = await parseJSONBody(req, Math.ceil(products.MAX_IMAGE_BYTES * 1.4) + 1024);
    let buffer = null;
    try { buffer = Buffer.from(String(body.imageBase64 || ""), "base64"); } catch { buffer = null; }
    try {
      const id = await products.saveImage({ buffer, mime: body.imageTipo, nome: body.imageNome });
      return sendJSON(res, 201, { ok: true, url: `/api/product-images/${id}` });
    } catch (e) {
      return sendJSON(res, e.statusCode || 400, { ok: false, error: e.message });
    }
  }

  // ---- ADMIN: CATÁLOGO (adicionar/remover produto, preço, promoção — só Energia Solar ou dono) ----
  if (pathname === "/api/admin/products" && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const body = await parseJSONBody(req);
    const error = validateProductPayload(body);
    if (error) return sendJSON(res, 400, { ok: false, error });
    const id = await products.create(body);
    return sendJSON(res, 201, { ok: true, product: await products.getById(id) });
  }

  const productIdMatch = pathname.match(/^\/api\/admin\/products\/(.+)$/);
  if (productIdMatch && (req.method === "PATCH" || req.method === "DELETE")) {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const id = decodeURIComponent(productIdMatch[1]);
    if (!(await products.getById(id))) return sendJSON(res, 404, { ok: false, error: "Produto não encontrado." });

    if (req.method === "PATCH") {
      const body = await parseJSONBody(req);
      const error = validateProductPayload(body);
      if (error) return sendJSON(res, 400, { ok: false, error });
      await products.update(id, body);
      return sendJSON(res, 200, { ok: true, product: await products.getById(id) });
    }

    if (req.method === "DELETE") {
      await products.remove(id);
      return sendJSON(res, 200, { ok: true });
    }
  }

  // ---- PEDIDOS (exige conta logada — ver requireCustomer) ----
  if (pathname === "/api/orders" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;

    const body = await parseJSONBody(req, Math.ceil(orders.MAX_DOC_BYTES * 2 * 1.4));
    const error = validateOrderPayload(body);
    if (error) return sendJSON(res, 400, { ok: false, error });

    // Comprovante de endereço + documento com foto: obrigatórios pra todo
    // pedido, comprado pelo próprio cliente ou por um parceiro em nome dele
    // ("compra assistida") — valida quem vai receber o equipamento.
    let docEnderecoBuffer, docFotoBuffer;
    try {
      docEnderecoBuffer = Buffer.from(String(body.docEnderecoBase64 || ""), "base64");
      docFotoBuffer = Buffer.from(String(body.docFotoBase64 || ""), "base64");
    } catch (e) {
      return sendJSON(res, 400, { ok: false, error: "Documentos inválidos." });
    }
    if (!docEnderecoBuffer.length) return sendJSON(res, 400, { ok: false, error: "Anexe o comprovante de endereço." });
    if (!docFotoBuffer.length) return sendJSON(res, 400, { ok: false, error: "Anexe um documento com foto." });
    if (docEnderecoBuffer.length > orders.MAX_DOC_BYTES || docFotoBuffer.length > orders.MAX_DOC_BYTES) {
      return sendJSON(res, 413, { ok: false, error: "Cada documento deve ter no máximo 5MB." });
    }
    if (!isAllowedFileMime(body.docEnderecoTipo) || !isAllowedFileMime(body.docFotoTipo)) {
      return sendJSON(res, 400, { ok: false, error: `Os documentos devem ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
    }
    body.docEnderecoBuffer = docEnderecoBuffer;
    body.docFotoBuffer = docFotoBuffer;

    /* ===================================================================
       Pontos de integração futura (produção):
       - E-mail: notificar cliente + loja após criar o pedido.
       - Frete: calcular valor real via CEP antes de gravar o pedido.
       - Pagamento: ver PONTO DE INTEGRAÇÃO DE PAGAMENTO em app.js.
       =================================================================== */
    const { id, orderNumber } = await orders.createOrder(body, customer.id);
    // Venda indicada por parceiro: registra a comissão. Falha aqui nunca derruba o pedido.
    try {
      // Compra assistida: o próprio parceiro comprou pelo catálogo pra um
      // cliente e escolheu um nível de desconto (0/5/10%) — a comissão vem
      // desse nível, não da regra geral/override. Só vale quando o código
      // é do próprio comprador (resolveSelfAssisted já garante isso).
      const tier = partners.ASSISTED_TIERS[Number(body.descontoParceiro)];
      let partner = tier !== undefined ? await partners.resolveSelfAssisted(body.ref, customer.id) : null;
      let overridePct = partner ? tier : undefined;
      if (!partner) partner = await partners.resolveAttribution(body.ref, customer.id);
      if (partner) await partners.registerSale({ tipo: "loja", orderId: id, referencia: orderNumber, base: body.total, partner, overridePct });
    } catch (e) { console.error("[parceiros] falha ao registrar comissão do pedido:", e.message); }
    try {
      const order = await orders.getOrderById(id);
      await notifications.notifyAdmins({
        subject: `Novo pedido ${orderNumber} — Marques Energia Solar / New order ${orderNumber}`,
        text: `Pedido ${orderNumber} de ${order.customer.nome}, total ${order.total}.\n\nOrder ${orderNumber} from ${order.customer.nome}, total ${order.total}.`,
        html: mailer.adminNovoPedidoHTML(order),
      });
    } catch (e) { console.error("[notifications] falha ao avisar admins do pedido novo:", e.message); }
    return sendJSON(res, 201, { ok: true, id, orderNumber });
  }

  // ---- SOLICITAÇÕES DE ANÁLISE DE CRÉDITO (exige conta logada) ----
  if (pathname === "/api/credit-leads" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;

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
    const { id, leadNumber } = await creditLeads.createLead(body, customer.id);
    try {
      const partner = await partners.resolveAttribution(body.ref, customer.id);
      if (partner) await partners.registerSale({ tipo: "credito", leadId: id, referencia: leadNumber, base: body.sim_valor_sistema, partner });
    } catch (e) { console.error("[parceiros] falha ao registrar comissão do crédito:", e.message); }
    try {
      const lead = await creditLeads.getLeadById(id);
      await notifications.notifyAdmins({
        subject: `Nova solicitação de crédito ${leadNumber} — Marques Promotora / New credit request ${leadNumber}`,
        text: `Solicitação ${leadNumber} de ${lead.dadosBasicos.nome}, modalidade ${lead.modalidadeInteresse}.\n\nRequest ${leadNumber} from ${lead.dadosBasicos.nome}, type ${lead.modalidadeInteresse}.`,
        html: mailer.adminNovaSolicitacaoCreditoHTML(lead),
      });
    } catch (e) { console.error("[notifications] falha ao avisar admins da solicitação nova:", e.message); }
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
      await partners.syncStatus("lead", id, body.status);
      const lead = await creditLeads.getLeadById(id);
      try {
        await mailer.sendEmail({
          to: lead.dadosBasicos.email,
          subject: `Solicitação/Request ${lead.leadNumber}: ${body.status}`,
          text: `Sua solicitação de crédito ${lead.leadNumber} agora está: ${body.status}.\n\nYour credit request ${lead.leadNumber} is now: ${body.status}.`,
          html: mailer.leadStatusHTML(lead, body.status),
        });
      } catch (e) { console.error("[notifications] falha ao avisar cliente do status da solicitação:", e.message); }
      return sendJSON(res, 200, { ok: true, lead });
    }
  }

  const leadContratoMatch = pathname.match(/^\/api\/admin\/credit-leads\/(\d+)\/contrato$/);
  if (leadContratoMatch) {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const id = parseInt(leadContratoMatch[1], 10);

    if (req.method === "GET") {
      const c = await creditLeads.getContrato(id);
      if (!c) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
      return sendBinary(res, 200, c.data, c.tipo, c.nome);
    }
    if (req.method === "POST") {
      const body = await parseJSONBody(req, Math.ceil(creditLeads.MAX_CONTRATO_BYTES * 1.4));
      let contratoBuffer = null;
      try { contratoBuffer = Buffer.from(String(body.contratoBase64 || ""), "base64"); } catch { contratoBuffer = null; }
      if (!contratoBuffer || !contratoBuffer.length) return sendJSON(res, 400, { ok: false, error: "Anexe o arquivo do contrato." });
      if (contratoBuffer.length > creditLeads.MAX_CONTRATO_BYTES) return sendJSON(res, 413, { ok: false, error: "Contrato maior que 8 MB." });
      if (!isAllowedFileMime(body.contratoTipo)) return sendJSON(res, 400, { ok: false, error: `Arquivo deve ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
      const changed = await creditLeads.setContrato(id, { contratoBuffer, contratoTipo: body.contratoTipo, contratoNome: body.contratoNome });
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
      await partners.syncStatus("order", id, body.status);
      const order = await orders.getOrderById(id);
      try {
        await mailer.sendEmail({
          to: order.customer.email,
          subject: `Pedido/Order ${order.orderNumber}: ${body.status}`,
          text: `Seu pedido ${order.orderNumber} agora está: ${body.status}.\n\nYour order ${order.orderNumber} is now: ${body.status}.`,
          html: mailer.pedidoStatusHTML(order, body.status),
        });
      } catch (e) { console.error("[notifications] falha ao avisar cliente do status do pedido:", e.message); }
      return sendJSON(res, 200, { ok: true, order });
    }
  }

  const orderContratoMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/contrato$/);
  if (orderContratoMatch) {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const id = parseInt(orderContratoMatch[1], 10);

    if (req.method === "GET") {
      const c = await orders.getContrato(id);
      if (!c) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
      return sendBinary(res, 200, c.data, c.tipo, c.nome);
    }
    if (req.method === "POST") {
      const body = await parseJSONBody(req, Math.ceil(orders.MAX_CONTRATO_BYTES * 1.4));
      let contratoBuffer = null;
      try { contratoBuffer = Buffer.from(String(body.contratoBase64 || ""), "base64"); } catch { contratoBuffer = null; }
      if (!contratoBuffer || !contratoBuffer.length) return sendJSON(res, 400, { ok: false, error: "Anexe o arquivo do contrato." });
      if (contratoBuffer.length > orders.MAX_CONTRATO_BYTES) return sendJSON(res, 413, { ok: false, error: "Contrato maior que 8 MB." });
      if (!isAllowedFileMime(body.contratoTipo)) return sendJSON(res, 400, { ok: false, error: `Arquivo deve ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
      const changed = await orders.setContrato(id, { contratoBuffer, contratoTipo: body.contratoTipo, contratoNome: body.contratoNome });
      if (!changed) return sendJSON(res, 404, { ok: false, error: "Pedido não encontrado." });
      return sendJSON(res, 200, { ok: true, order: await orders.getOrderById(id) });
    }
  }

  const orderDocEnderecoMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/doc-endereco$/);
  if (orderDocEnderecoMatch && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const c = await orders.getDocEndereco(parseInt(orderDocEnderecoMatch[1], 10));
    if (!c) return sendJSON(res, 404, { ok: false, error: "Documento não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  const orderDocFotoMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/doc-foto$/);
  if (orderDocFotoMatch && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const c = await orders.getDocFoto(parseInt(orderDocFotoMatch[1], 10));
    if (!c) return sendJSON(res, 404, { ok: false, error: "Documento não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  // Link de pagamento (ou boleto): salva no pedido e avisa por e-mail quem
  // repassa pro cliente — o parceiro, se o pedido foi indicado/assistido,
  // ou o próprio cliente, se comprou direto.
  const orderPaymentLinkMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/payment-link$/);
  if (orderPaymentLinkMatch && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const id = parseInt(orderPaymentLinkMatch[1], 10);
    const order = await orders.getOrderById(id);
    if (!order) return sendJSON(res, 404, { ok: false, error: "Pedido não encontrado." });
    const body = await parseJSONBody(req);
    const link = String(body.link || "").trim();
    if (!link) return sendJSON(res, 400, { ok: false, error: "Informe o link de pagamento (ou o boleto)." });
    if (link.length > 1000) return sendJSON(res, 400, { ok: false, error: "Link/boleto muito longo (máximo 1000 caracteres)." });
    await orders.setPaymentLink(id, link);

    const label = order.pagamento === "boleto" ? "boleto" : "link de pagamento";
    if (order.partnerId) {
      const contact = await partners.getContactById(order.partnerId);
      await mailer.sendEmail({
        to: contact.email,
        subject: `Pedido ${order.orderNumber}: ${label} pronto / ready`,
        text: `O pedido ${order.orderNumber} (cliente: ${order.customer.nome}) já tem o ${label}: ${link}\n\nOrder ${order.orderNumber} (customer: ${order.customer.nome}) now has the ${label}: ${link}`,
        html: mailer.pagamentoLinkParaParceiroHTML({ orderNumber: order.orderNumber, clienteNome: order.customer.nome, link, pagamento: order.pagamento }),
      });
    } else {
      await mailer.sendEmail({
        to: order.customer.email,
        subject: `Seu pedido ${order.orderNumber}: ${label} pronto / ready`,
        text: `Seu pedido ${order.orderNumber} já tem o ${label}: ${link}\n\nYour order ${order.orderNumber} now has the ${label}: ${link}`,
        html: mailer.pagamentoLinkParaClienteHTML({ orderNumber: order.orderNumber, link, pagamento: order.pagamento }),
      });
    }
    return sendJSON(res, 200, { ok: true, order: await orders.getOrderById(id) });
  }

  // Pendência: admin sinaliza um problema (ex: comprovante de endereço
  // ilegível) com uma observação livre — avisa parceiro ou cliente, mesma
  // regra de destinatário do link de pagamento.
  const orderPendenciaMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/pendencia$/);
  if (orderPendenciaMatch && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const id = parseInt(orderPendenciaMatch[1], 10);
    const order = await orders.getOrderById(id);
    if (!order) return sendJSON(res, 404, { ok: false, error: "Pedido não encontrado." });
    const body = await parseJSONBody(req);
    const texto = String(body.texto || "").trim();
    if (!texto) return sendJSON(res, 400, { ok: false, error: "Descreva a pendência." });
    if (texto.length > 1000) return sendJSON(res, 400, { ok: false, error: "Descrição muito longa (máximo 1000 caracteres)." });
    await orders.setPendencia(id, { texto, autor: `admin:${admin.email}` });

    if (order.partnerId) {
      const contact = await partners.getContactById(order.partnerId);
      await mailer.sendEmail({
        to: contact.email,
        subject: `Pedido ${order.orderNumber}: pendência / pending issue`,
        text: `O pedido ${order.orderNumber} (cliente: ${order.customer.nome}) está com uma pendência: ${texto}\n\nOrder ${order.orderNumber} (customer: ${order.customer.nome}) has a pending issue: ${texto}`,
        html: mailer.pendenciaParaParceiroHTML({ orderNumber: order.orderNumber, clienteNome: order.customer.nome, texto }),
      });
    } else {
      await mailer.sendEmail({
        to: order.customer.email,
        subject: `Seu pedido ${order.orderNumber}: pendência / pending issue`,
        text: `Seu pedido ${order.orderNumber} está com uma pendência: ${texto}\n\nYour order ${order.orderNumber} has a pending issue: ${texto}`,
        html: mailer.pendenciaParaClienteHTML({ orderNumber: order.orderNumber, texto }),
      });
    }
    return sendJSON(res, 200, { ok: true, order: await orders.getOrderById(id) });
  }

  const orderPendenciaResolverMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/pendencia\/resolver$/);
  if (orderPendenciaResolverMatch && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const id = parseInt(orderPendenciaResolverMatch[1], 10);
    const changed = await orders.clearPendencia(id);
    if (!changed) return sendJSON(res, 404, { ok: false, error: "Pedido não encontrado." });
    return sendJSON(res, 200, { ok: true, order: await orders.getOrderById(id) });
  }

  const orderPendenciaRespostaDocMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/pendencia-resposta$/);
  if (orderPendenciaRespostaDocMatch && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "energia_solar");
    if (!admin) return;
    const c = await orders.getPendenciaResposta(parseInt(orderPendenciaRespostaDocMatch[1], 10));
    if (!c) return sendJSON(res, 404, { ok: false, error: "Anexo não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  // ---- ADMIN: BUSCA DE CLIENTE (pra vincular contrato de empréstimo/participação) ----
  if (pathname === "/api/admin/customers/search" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const q = url.searchParams.get("q") || "";
    if (q.trim().length < 2) return sendJSON(res, 200, { ok: true, customers: [] });
    return sendJSON(res, 200, { ok: true, customers: await customers.searchCustomers(q) });
  }

  // ---- ADMIN: EMPRÉSTIMOS/FINANCIAMENTOS (só Promotora ou dono) ----
  if (pathname === "/api/admin/loans/contracts" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const q = url.searchParams.get("q") || undefined;
    return sendJSON(res, 200, { ok: true, contracts: await loans.listAllContracts({ q }) });
  }

  if (pathname === "/api/admin/loans/contracts" && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const body = await parseJSONBody(req, Math.ceil(loans.MAX_CONTRATO_BYTES * 1.4));
    const customerId = parseInt(body.customerId, 10);
    const titulo = String(body.titulo || "").trim();
    const valorParcela = Number(body.valorParcela);
    const totalParcelas = parseInt(body.totalParcelas, 10);
    const dataPrimeiraParcela = String(body.dataPrimeiraParcela || "").trim();

    if (!customerId) return sendJSON(res, 400, { ok: false, error: "Selecione o cliente." });
    if (!titulo) return sendJSON(res, 400, { ok: false, error: "Informe o título do contrato (ex: Financiamento Solar)." });
    if (!(valorParcela > 0)) return sendJSON(res, 400, { ok: false, error: "Valor da parcela inválido." });
    if (!(totalParcelas > 0 && totalParcelas <= 360)) return sendJSON(res, 400, { ok: false, error: "Total de parcelas inválido." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPrimeiraParcela)) return sendJSON(res, 400, { ok: false, error: "Data da primeira parcela inválida." });
    if (!(await customers.findById(customerId))) return sendJSON(res, 404, { ok: false, error: "Cliente não encontrado." });

    let contratoBuffer = null;
    if (body.contratoBase64) {
      try { contratoBuffer = Buffer.from(String(body.contratoBase64), "base64"); } catch { contratoBuffer = null; }
      if (contratoBuffer && contratoBuffer.length > loans.MAX_CONTRATO_BYTES) {
        return sendJSON(res, 413, { ok: false, error: "Contrato maior que 8 MB." });
      }
      if (!isAllowedFileMime(body.contratoTipo)) return sendJSON(res, 400, { ok: false, error: `Arquivo deve ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
    }

    const id = await loans.createContract({
      customerId, titulo, valorParcela, totalParcelas, dataPrimeiraParcela,
      contratoBuffer, contratoTipo: body.contratoTipo, contratoNome: body.contratoNome,
    });
    return sendJSON(res, 201, { ok: true, contract: await loans.getContractById(id) });
  }

  const loanContractIdMatch = pathname.match(/^\/api\/admin\/loans\/contracts\/(\d+)$/);
  if (loanContractIdMatch && (req.method === "GET" || req.method === "PATCH")) {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const id = parseInt(loanContractIdMatch[1], 10);

    if (req.method === "GET") {
      const contract = await loans.getContractById(id);
      if (!contract) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
      return sendJSON(res, 200, { ok: true, contract, installments: await loans.listInstallmentsByContract(id) });
    }

    if (req.method === "PATCH") {
      const body = await parseJSONBody(req);
      if (!loans.CONTRACT_STATUSES.includes(body.status)) {
        return sendJSON(res, 400, { ok: false, error: `Status inválido. Use um de: ${loans.CONTRACT_STATUSES.join(", ")}` });
      }
      const changed = await loans.updateContractStatus(id, body.status);
      if (!changed) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
      return sendJSON(res, 200, { ok: true, contract: await loans.getContractById(id) });
    }
  }

  const loanContratoMatch = pathname.match(/^\/api\/admin\/loans\/contracts\/(\d+)\/contrato$/);
  if (loanContratoMatch && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const c = await loans.getContrato(parseInt(loanContratoMatch[1], 10));
    if (!c) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  const loanInstallmentIdMatch = pathname.match(/^\/api\/admin\/loans\/installments\/(\d+)$/);
  if (loanInstallmentIdMatch && req.method === "PATCH") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const id = parseInt(loanInstallmentIdMatch[1], 10);
    const body = await parseJSONBody(req);
    if (!loans.INSTALLMENT_STATUSES.includes(body.status)) {
      return sendJSON(res, 400, { ok: false, error: `Status inválido. Use um de: ${loans.INSTALLMENT_STATUSES.join(", ")}` });
    }
    const changed = await loans.updateInstallmentStatus(id, body.status);
    if (!changed) return sendJSON(res, 404, { ok: false, error: "Parcela não encontrada." });
    return sendJSON(res, 200, { ok: true });
  }

  // ---- ADMIN: PARTICIPAÇÃO NOS LUCROS (só Promotora ou dono) ----
  if (pathname === "/api/admin/profit-share/contracts" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const q = url.searchParams.get("q") || undefined;
    return sendJSON(res, 200, { ok: true, contracts: await profitShare.listAllContracts({ q }) });
  }

  if (pathname === "/api/admin/profit-share/contracts" && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const body = await parseJSONBody(req, Math.ceil(profitShare.MAX_CONTRATO_BYTES * 1.4));
    const customerId = parseInt(body.customerId, 10);
    const numeroContrato = String(body.numeroContrato || "").trim();
    const percentual = Number(body.percentual);
    const valorInvestido = Number(body.valorInvestido);
    const dataInicio = String(body.dataInicio || "").trim();
    const periodicidade = String(body.periodicidade || "").trim();

    if (!customerId) return sendJSON(res, 400, { ok: false, error: "Selecione o cliente." });
    if (!numeroContrato) return sendJSON(res, 400, { ok: false, error: "Informe o número do contrato." });
    if (!(valorInvestido > 0)) return sendJSON(res, 400, { ok: false, error: "Informe o valor investido." });
    if (!(percentual > 0 && percentual <= 100)) return sendJSON(res, 400, { ok: false, error: "Percentual inválido." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) return sendJSON(res, 400, { ok: false, error: "Data de início inválida." });
    if (!(await customers.findById(customerId))) return sendJSON(res, 404, { ok: false, error: "Cliente não encontrado." });

    let contratoBuffer = null;
    if (body.contratoBase64) {
      try { contratoBuffer = Buffer.from(String(body.contratoBase64), "base64"); } catch { contratoBuffer = null; }
      if (contratoBuffer && contratoBuffer.length > profitShare.MAX_CONTRATO_BYTES) {
        return sendJSON(res, 413, { ok: false, error: "Contrato maior que 8 MB." });
      }
      if (!isAllowedFileMime(body.contratoTipo)) return sendJSON(res, 400, { ok: false, error: `Arquivo deve ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
    }

    const id = await profitShare.createContract({
      customerId, numeroContrato, valorInvestido, percentual, periodicidade, dataInicio,
      contratoBuffer, contratoTipo: body.contratoTipo, contratoNome: body.contratoNome,
    });
    return sendJSON(res, 201, { ok: true, contract: await profitShare.getContractById(id) });
  }

  const profitShareContractIdMatch = pathname.match(/^\/api\/admin\/profit-share\/contracts\/(\d+)$/);
  if (profitShareContractIdMatch && (req.method === "GET" || req.method === "PATCH")) {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const id = parseInt(profitShareContractIdMatch[1], 10);

    if (req.method === "GET") {
      const contract = await profitShare.getContractById(id);
      if (!contract) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
      return sendJSON(res, 200, { ok: true, contract, payments: await profitShare.listPaymentsByContract(id) });
    }

    if (req.method === "PATCH") {
      const body = await parseJSONBody(req);
      if (body.status === undefined && body.visivelCliente === undefined) {
        return sendJSON(res, 400, { ok: false, error: "Nada para atualizar." });
      }
      if (body.status !== undefined) {
        if (!profitShare.CONTRACT_STATUSES.includes(body.status)) {
          return sendJSON(res, 400, { ok: false, error: `Status inválido. Use um de: ${profitShare.CONTRACT_STATUSES.join(", ")}` });
        }
        const changed = await profitShare.updateContractStatus(id, body.status);
        if (!changed) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
      }
      if (body.visivelCliente !== undefined) {
        const changed = await profitShare.setVisibility(id, body.visivelCliente === true);
        if (!changed) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
      }
      return sendJSON(res, 200, { ok: true, contract: await profitShare.getContractById(id) });
    }
  }

  const profitShareContratoMatch = pathname.match(/^\/api\/admin\/profit-share\/contracts\/(\d+)\/contrato$/);
  if (profitShareContratoMatch && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const c = await profitShare.getContrato(parseInt(profitShareContratoMatch[1], 10));
    if (!c) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  const profitSharePaymentsMatch = pathname.match(/^\/api\/admin\/profit-share\/contracts\/(\d+)\/payments$/);
  if (profitSharePaymentsMatch && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const contractId = parseInt(profitSharePaymentsMatch[1], 10);
    if (!(await profitShare.getContractById(contractId))) {
      return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
    }

    const body = await parseJSONBody(req, profitShare.MAX_COMPROVANTE_BYTES);
    const valor = Number(body.valor);
    const dataPagamento = String(body.dataPagamento || "").trim();
    if (!(valor > 0)) return sendJSON(res, 400, { ok: false, error: "Valor do repasse inválido." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) return sendJSON(res, 400, { ok: false, error: "Data do repasse inválida." });

    let comprovanteBuffer = null;
    if (body.comprovanteBase64) {
      try {
        comprovanteBuffer = Buffer.from(body.comprovanteBase64, "base64");
      } catch (e) {
        return sendJSON(res, 400, { ok: false, error: "Arquivo de comprovante inválido." });
      }
      if (comprovanteBuffer.length > profitShare.MAX_COMPROVANTE_BYTES) {
        return sendJSON(res, 400, { ok: false, error: "Comprovante muito grande (máximo 4MB)." });
      }
      if (!isAllowedFileMime(body.comprovanteTipo)) return sendJSON(res, 400, { ok: false, error: `Arquivo deve ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
    }

    const id = await profitShare.addPayment(contractId, {
      valor,
      dataPagamento,
      observacao: body.observacao,
      comprovanteBuffer,
      comprovanteTipo: body.comprovanteTipo,
      comprovanteNome: body.comprovanteNome,
    });
    return sendJSON(res, 201, { ok: true, payments: await profitShare.listPaymentsByContract(contractId), paymentId: id });
  }

  const profitSharePaymentComprovanteAdminMatch = pathname.match(/^\/api\/admin\/profit-share\/payments\/(\d+)\/comprovante$/);
  if (profitSharePaymentComprovanteAdminMatch && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const id = parseInt(profitSharePaymentComprovanteAdminMatch[1], 10);
    const comprovante = await profitShare.getPaymentComprovante(id);
    if (!comprovante) return sendJSON(res, 404, { ok: false, error: "Comprovante não encontrado." });
    return sendBinary(res, 200, comprovante.data, comprovante.tipo, comprovante.nome);
  }

  // ---- ADMIN: SALDO MARQUES PAY (lançamento manual, representativo até integrar com o banco) ----
  if (pathname === "/api/admin/pay/balance-entries" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    return sendJSON(res, 200, { ok: true, entries: await payBalance.listRecentForAdmin() });
  }

  if (pathname === "/api/admin/pay/balance-entries" && req.method === "POST") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const body = await parseJSONBody(req);
    const customerId = parseInt(body.customerId, 10);
    const valor = Number(body.valor);
    const descricao = String(body.descricao || "").trim();
    if (!customerId) return sendJSON(res, 400, { ok: false, error: "Selecione o cliente." });
    if (!Number.isFinite(valor) || valor === 0) return sendJSON(res, 400, { ok: false, error: "Informe um valor diferente de zero." });
    if (!descricao) return sendJSON(res, 400, { ok: false, error: "Informe uma descrição pro lançamento." });
    const account = await payAccounts.getRowByCustomer(customerId);
    if (!account) return sendJSON(res, 404, { ok: false, error: "Esse cliente ainda não tem conta Marques Pay aberta." });
    const saldo = await payBalance.addEntry(account.id, { valor, descricao, autor: `admin:${admin.email}` });
    return sendJSON(res, 201, { ok: true, saldo, entries: await payBalance.listEntriesByAccount(account.id) });
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

  // ---- LOGIN UNIFICADO (conta/entrar.html) ----
  // Mesma tela serve cliente e administrador: tenta como admin primeiro
  // (conta mais rara), senão como cliente (mesmo fluxo de sempre, com 2FA
  // se a conta tiver ativado). Um só request e um só registro de tentativa
  // falha no limitador — evita que alguém gaste o limite em dobro só por
  // essa tela testar as duas contas. admin/login.html continua existindo
  // e funcionando à parte, sem mudanças.
  if (pathname === "/api/session/login" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const body = await parseJSONBody(req);
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    const adminRecord = email ? await auth.findAdminByEmail(email) : null;
    if (auth.verifyPasswordSafe(password, adminRecord && adminRecord.password_hash)) {
      auth.clearAttempts(ip);
      // Mesma regra do /api/auth/login: 2FA por e-mail é obrigatório pro admin.
      const pendingToken = await auth.createPendingAdminLogin(adminRecord.id, adminRecord.email);
      return sendJSON(res, 200, { ok: true, kind: "admin", requires2FA: true, pendingToken });
    }

    const customerRecord = email ? await customers.findByEmail(email) : null;
    if (auth.verifyPasswordSafe(password, customerRecord && customerRecord.password_hash)) {
      auth.clearAttempts(ip);
      // Verificação em duas etapas é obrigatória pra toda conta (não só
      // admin) — a menos que CUSTOMER_2FA_MANDATORY=false esteja setado
      // (interruptor temporário, ver config.js), aí só pede pra quem já
      // tinha ativado por conta própria.
      if (config.CUSTOMER_2FA_MANDATORY || customerRecord.two_factor_enabled) {
        const method = customerRecord.two_factor_method || "email";
        const pendingToken = await customers.createPending2FALogin(customerRecord.id, method, customerRecord.email);
        return sendJSON(res, 200, { ok: true, kind: "customer", requires2FA: true, pendingToken, method });
      }
      const { token, expiresAt } = await customers.createSession(customerRecord.id);
      return sendJSON(
        res,
        200,
        { ok: true, kind: "customer", customer: customers.toPublic(customerRecord) },
        { "Set-Cookie": auth.buildSessionCookie(token, expiresAt, customers.SESSION_COOKIE_NAME) }
      );
    }

    auth.registerFailedAttempt(ip);
    return sendJSON(res, 401, { ok: false, error: "E-mail ou senha inválidos." });
  }

  if (pathname === "/api/customers/login" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const body = await parseJSONBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const record = email ? await customers.findByEmail(email) : null;

    if (!auth.verifyPasswordSafe(password, record && record.password_hash)) {
      auth.registerFailedAttempt(ip);
      return sendJSON(res, 401, { ok: false, error: "E-mail ou senha inválidos." });
    }

    auth.clearAttempts(ip);

    // Verificação em duas etapas é obrigatória pra toda conta (não só
    // admin), a menos que CUSTOMER_2FA_MANDATORY=false (interruptor
    // temporário, ver config.js) — aí só pede pra quem já tinha ativado.
    // Método "email" já dispara o envio agora; "app" não precisa; sem
    // método configurado ainda, cai no e-mail por padrão.
    if (config.CUSTOMER_2FA_MANDATORY || record.two_factor_enabled) {
      const method = record.two_factor_method || "email";
      const pendingToken = await customers.createPending2FALogin(record.id, method, record.email);
      return sendJSON(res, 200, { ok: true, requires2FA: true, pendingToken, method });
    }

    const { token, expiresAt } = await customers.createSession(record.id);
    return sendJSON(
      res,
      200,
      { ok: true, customer: customers.toPublic(record) },
      { "Set-Cookie": auth.buildSessionCookie(token, expiresAt, customers.SESSION_COOKIE_NAME) }
    );
  }

  if (pathname === "/api/customers/login/2fa" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const body = await parseJSONBody(req);
    const pendingToken = String(body.pendingToken || "");
    const pending = customers.peekPending2FALogin(pendingToken);
    if (!pending) {
      return sendJSON(res, 401, {
        ok: false,
        error: "Sessão de verificação expirada. Faça login novamente.",
        expired: true,
      });
    }

    const valid = await customers.verify2FACode(pending, String(body.code || "").trim());
    if (!valid) {
      auth.registerFailedAttempt(ip);
      // Mantém o mesmo token pendente (e, se for por e-mail, o mesmo código)
      // pra poder tentar de novo sem precisar reenviar e-mail nem repetir a senha.
      return sendJSON(res, 401, { ok: false, error: "Código inválido.", pendingToken });
    }

    customers.consumePending2FALogin(pendingToken);
    auth.clearAttempts(ip);
    const record = await customers.findById(pending.customerId);
    const { token, expiresAt } = await customers.createSession(pending.customerId);
    return sendJSON(
      res,
      200,
      { ok: true, customer: customers.toPublic(record) },
      { "Set-Cookie": auth.buildSessionCookie(token, expiresAt, customers.SESSION_COOKIE_NAME) }
    );
  }

  // ---- CLIENTES: VERIFICAÇÃO EM DUAS ETAPAS (gerenciar, precisa estar logado) ----
  if (pathname === "/api/customers/2fa/setup" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    await customers.start2FASetup(customer.id, customer.email);
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/customers/2fa/confirm" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req);
    const backupCodes = await customers.confirm2FA(customer.id, String(body.code || "").trim());
    if (!backupCodes) {
      return sendJSON(res, 400, { ok: false, error: "Código inválido. Confira e tente de novo." });
    }
    return sendJSON(res, 200, { ok: true, backupCodes });
  }

  // Trocar o método (só com 2FA já ativo — a ativação inicial é sempre por e-mail).
  if (pathname === "/api/customers/2fa/switch/start" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    if (!customer.two_factor_enabled) {
      return sendJSON(res, 400, { ok: false, error: "Ative a verificação em duas etapas por e-mail primeiro." });
    }
    const body = await parseJSONBody(req);
    const targetMethod = body.targetMethod === "app" ? "app" : "email";
    if (targetMethod === customer.two_factor_method) {
      return sendJSON(res, 400, { ok: false, error: "Esse já é o método ativo." });
    }
    const result = await customers.startMethodSwitch(customer.id, customer.email, targetMethod);
    return sendJSON(res, 200, { ok: true, ...result });
  }

  if (pathname === "/api/customers/2fa/switch/confirm" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req);
    const newMethod = await customers.confirmMethodSwitch(customer.id, String(body.code || "").trim());
    if (!newMethod) {
      return sendJSON(res, 400, { ok: false, error: "Código inválido. Confira e tente de novo." });
    }
    return sendJSON(res, 200, { ok: true, method: newMethod });
  }

  if (pathname === "/api/customers/2fa/disable" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req);
    if (!body.password || !auth.verifyPassword(body.password, customer.password_hash)) {
      return sendJSON(res, 401, { ok: false, error: "Senha incorreta." });
    }
    await customers.disable2FA(customer.id);
    return sendJSON(res, 200, { ok: true });
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

    // `nome`/`cpf`/`telefone` (formulário de perfil) e `endereco` (checkout
    // ou perfil) são independentes — cada PATCH só mexe no que veio no body,
    // pra o checkout poder salvar só o endereço sem precisar reenviar o resto.
    if (body.nome !== undefined) {
      const nome = String(body.nome || "").trim();
      if (!nome) return sendJSON(res, 400, { ok: false, error: "Informe seu nome completo." });
      await customers.updateProfile(customer.id, { nome, cpf: body.cpf, telefone: body.telefone });
    }

    if (body.endereco && typeof body.endereco === "object") {
      await customers.saveAddress(customer.id, body.endereco);
    }

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

  // ---- CLIENTE: "ESQUECI MINHA SENHA" (mesma lógica do admin, ver acima) ----
  if (pathname === "/api/customers/forgot-password" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    auth.registerFailedAttempt(ip);
    const body = await parseJSONBody(req);
    const email = String(body.email || "").trim();
    const record = email ? await customers.findByEmail(email) : null;
    if (record) {
      const token = await customers.createPasswordResetToken(record.id);
      try {
        await mailer.sendEmail({
          to: record.email,
          subject: "Redefinir sua senha — Marques / Reset your password — Marques",
          text: `Pediram a redefinição da sua senha. Acesse o link abaixo pra escolher uma nova (expira em 1 hora). Se não foi você, ignore este e-mail.\n${mailer.passwordResetLink("customer", token)}\n\nSomeone requested a password reset. Use the link below to choose a new one (expires in 1 hour). If this wasn't you, ignore this email.\n${mailer.passwordResetLink("customer", token)}`,
          html: mailer.passwordResetEmailHTML("customer", token),
        });
      } catch (e) { console.error("[customers] falha ao enviar e-mail de redefinição de senha:", e.message); }
    }
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/customers/reset-password" && req.method === "POST") {
    if (auth.isRateLimited(ip)) {
      return sendJSON(res, 429, { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
    }
    const body = await parseJSONBody(req);
    const token = String(body.token || "");
    if (!body.newPassword || String(body.newPassword).length < 8) {
      return sendJSON(res, 400, { ok: false, error: "A nova senha precisa ter ao menos 8 caracteres." });
    }
    const consumed = await customers.consumePasswordResetToken(token);
    if (!consumed) {
      auth.registerFailedAttempt(ip);
      return sendJSON(res, 400, { ok: false, error: "Este link expirou ou já foi usado. Peça um novo." });
    }
    auth.clearAttempts(ip);
    await customers.updatePassword(consumed.customerId, body.newPassword);
    await customers.destroyAllSessions(consumed.customerId);
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/customers/me/orders" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, { ok: true, orders: await orders.listOrdersByCustomer(customer.id) });
  }

  const orderContratoClienteMatch = pathname.match(/^\/api\/customers\/me\/orders\/(\d+)\/contrato$/);
  if (orderContratoClienteMatch && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const c = await orders.getContrato(parseInt(orderContratoClienteMatch[1], 10), customer.id);
    if (!c) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  if (pathname === "/api/customers/me/credit-leads" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, { ok: true, leads: await creditLeads.listLeadsByCustomer(customer.id) });
  }

  const leadContratoClienteMatch = pathname.match(/^\/api\/customers\/me\/credit-leads\/(\d+)\/contrato$/);
  if (leadContratoClienteMatch && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const c = await creditLeads.getContrato(parseInt(leadContratoClienteMatch[1], 10), customer.id);
    if (!c) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  // ---- CLIENTE: CONTA MARQUES PAY (conta só existe depois do KYC aprovado) ----
  // Erros de regra (4xx) do payKyc viram resposta com a mensagem; o resto cai no handler geral.
  const kycGuard = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      if (err.statusCode && err.statusCode < 500) {
        return sendJSON(res, err.statusCode, { ok: false, error: err.message, problems: err.problems });
      }
      throw err;
    }
  };

  // ---- COMPRA PROGRAMADA: CATÁLOGO PÚBLICO ----
  if (pathname === "/api/consorcio/grupos" && req.method === "GET") {
    return sendJSON(res, 200, { ok: true, grupos: await consorcio.listGruposPublicos(), texto: await consorcio.getTexto() });
  }

  // ---- COMPRA PROGRAMADA: CLIENTE CONTRATA DIRETO PELO CATÁLOGO ----
  // Exige CPF + comprovante de endereço + documento com foto (mesmo padrão
  // do checkout da loja) — a adesão nasce "aguardando_pagamento", o admin
  // confere os documentos e manda o link/PIX depois.
  const consorcioContratarMatch = pathname.match(/^\/api\/consorcio\/grupos\/(\d+)\/contratar$/);
  if (consorcioContratarMatch && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req, Math.ceil(consorcio.MAX_DOC_BYTES * 2 * 1.4));

    const cpf = String(body.cpf || "").trim();
    if (!cpf) return sendJSON(res, 400, { ok: false, error: "Informe seu CPF." });
    let docEnderecoBuffer, docFotoBuffer;
    try {
      docEnderecoBuffer = Buffer.from(String(body.docEnderecoBase64 || ""), "base64");
      docFotoBuffer = Buffer.from(String(body.docFotoBase64 || ""), "base64");
    } catch (e) {
      return sendJSON(res, 400, { ok: false, error: "Documentos inválidos." });
    }
    if (!docEnderecoBuffer.length) return sendJSON(res, 400, { ok: false, error: "Anexe o comprovante de endereço." });
    if (!docFotoBuffer.length) return sendJSON(res, 400, { ok: false, error: "Anexe um documento com foto." });
    if (docEnderecoBuffer.length > consorcio.MAX_DOC_BYTES || docFotoBuffer.length > consorcio.MAX_DOC_BYTES) {
      return sendJSON(res, 413, { ok: false, error: "Cada documento deve ter no máximo 5MB." });
    }
    if (!isAllowedFileMime(body.docEnderecoTipo) || !isAllowedFileMime(body.docFotoTipo)) {
      return sendJSON(res, 400, { ok: false, error: `Os documentos devem ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
    }

    return kycGuard(async () => {
      const adesao = await consorcio.contratarComoCliente(customer.id, parseInt(consorcioContratarMatch[1], 10), {
        nome: body.nome || customer.nome, cpf, telefone: body.telefone || customer.telefone, email: body.email || customer.email, refCode: body.ref,
        docEnderecoBuffer, docEnderecoTipo: body.docEnderecoTipo, docEnderecoNome: body.docEnderecoNome,
        docFotoBuffer, docFotoTipo: body.docFotoTipo, docFotoNome: body.docFotoNome,
      });
      try {
        await notifications.notifyAdmins({
          subject: `Nova adesão na Compra Programada — ${adesao.grupoNome} / New Compra Programada signup`,
          text: `${adesao.nome} contratou o grupo ${adesao.grupoNome} e já anexou os documentos.\n\n${adesao.nome} joined group ${adesao.grupoNome} and already attached the documents.`,
          html: mailer.adminNovaAdesaoConsorcioHTML(adesao),
        });
      } catch (e) { console.error("[notifications] falha ao avisar admins da nova adesão:", e.message); }
      return sendJSON(res, 201, { ok: true, adesao });
    });
  }

  // ---- COMPRA PROGRAMADA: ADESÕES DO CLIENTE (inclui pendentes lançadas por parceiro) ----
  if (pathname === "/api/customers/me/consorcio-adesoes" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const proprias = await consorcio.listAdesoesByCustomer(customer.id);
    const pendentesPorEmail = await consorcio.listAdesoesPendentesPorEmail(customer.email);
    const ids = new Set(proprias.map((a) => a.id));
    const items = [...proprias, ...pendentesPorEmail.filter((a) => !ids.has(a.id))];
    return sendJSON(res, 200, { ok: true, adesoes: items });
  }

  // QR code de pagamento do grupo da adesão — só pro próprio cliente e
  // enquanto a adesão aguarda pagamento (não é uma imagem pública).
  const consorcioQrMatch = pathname.match(/^\/api\/customers\/me\/consorcio-adesoes\/(\d+)\/qr$/);
  if (consorcioQrMatch && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const qr = await consorcio.getQrForAdesao(parseInt(consorcioQrMatch[1], 10), customer.id);
    if (!qr) return sendJSON(res, 404, { ok: false, error: "QR code indisponível." });
    return sendBinary(res, 200, qr.data, qr.tipo, qr.nome, { "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
  }

  const consorcioConfirmarMatch = pathname.match(/^\/api\/customers\/me\/consorcio-adesoes\/(\d+)\/confirmar$/);
  if (consorcioConfirmarMatch && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return kycGuard(async () => {
      const adesao = await consorcio.confirmarAdesao(customer.id, parseInt(consorcioConfirmarMatch[1], 10));
      return sendJSON(res, 200, { ok: true, adesao });
    });
  }

  // ---- COMPRA PROGRAMADA: ÁREA DO PARCEIRO ----
  if (pathname === "/api/partners/me/consorcio-grupos" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const row = await partners.getRowByCustomer(customer.id);
    if (!row || row.status !== "ativo") return sendJSON(res, 403, { ok: false, error: "Seu cadastro de parceiro ainda não está ativo." });
    return sendJSON(res, 200, { ok: true, grupos: await consorcio.listGruposParceiro() });
  }

  if (pathname === "/api/partners/me/consorcio-adesoes" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const row = await partners.getRowByCustomer(customer.id);
    if (!row || row.status !== "ativo") return sendJSON(res, 403, { ok: false, error: "Seu cadastro de parceiro ainda não está ativo." });
    const body = await parseJSONBody(req);
    return kycGuard(async () => {
      const adesao = await consorcio.lancarComoParceiro(row, Number(body.grupoId), {
        nome: body.nome, telefone: body.telefone, email: body.email,
      });
      return sendJSON(res, 201, { ok: true, adesao });
    });
  }

  // ---- ADMIN: COMPRA PROGRAMADA (grupos e adesões — só Promotora ou dono) ----
  if (pathname.startsWith("/api/admin/consorcio")) {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;

    if (pathname === "/api/admin/consorcio/grupos" && req.method === "GET") {
      return sendJSON(res, 200, { ok: true, grupos: await consorcio.listGruposAdmin() });
    }
    if (pathname === "/api/admin/consorcio/texto" && req.method === "GET") {
      return sendJSON(res, 200, { ok: true, texto: await consorcio.getTexto() });
    }
    if (pathname === "/api/admin/consorcio/texto" && req.method === "PATCH") {
      const body = await parseJSONBody(req);
      return kycGuard(async () => sendJSON(res, 200, { ok: true, texto: await consorcio.setTexto(body, `admin:${admin.email}`) }));
    }
    if (pathname === "/api/admin/consorcio/grupos" && req.method === "POST") {
      const body = await parseJSONBody(req);
      return kycGuard(async () => sendJSON(res, 201, { ok: true, grupo: await consorcio.createGrupo(body) }));
    }
    const grupoIdMatch = pathname.match(/^\/api\/admin\/consorcio\/grupos\/(\d+)$/);
    if (grupoIdMatch && req.method === "PATCH") {
      const body = await parseJSONBody(req);
      return kycGuard(async () => sendJSON(res, 200, { ok: true, grupo: await consorcio.updateGrupo(parseInt(grupoIdMatch[1], 10), body) }));
    }
    if (grupoIdMatch && req.method === "DELETE") {
      return kycGuard(async () => {
        await consorcio.deleteGrupo(parseInt(grupoIdMatch[1], 10));
        return sendJSON(res, 200, { ok: true });
      });
    }

    // QR code de pagamento da cota do grupo (imagem enviada pelo admin).
    const grupoQrMatch = pathname.match(/^\/api\/admin\/consorcio\/grupos\/(\d+)\/qr$/);
    if (grupoQrMatch) {
      const grupoId = parseInt(grupoQrMatch[1], 10);
      if (req.method === "GET") {
        const qr = await consorcio.getQr(grupoId);
        if (!qr) return sendJSON(res, 404, { ok: false, error: "Esse grupo ainda não tem QR code." });
        return sendBinary(res, 200, qr.data, qr.tipo, qr.nome, { "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
      }
      if (req.method === "POST") {
        const body = await parseJSONBody(req, Math.ceil(consorcio.MAX_QR_BYTES * 1.4) + 1024);
        let buffer = null;
        try { buffer = Buffer.from(String(body.qrBase64 || ""), "base64"); } catch { buffer = null; }
        return kycGuard(async () => sendJSON(res, 200, { ok: true, grupo: await consorcio.setQr(grupoId, { buffer, mime: body.qrTipo, nome: body.qrNome }) }));
      }
      if (req.method === "DELETE") {
        return kycGuard(async () => sendJSON(res, 200, { ok: true, grupo: await consorcio.clearQr(grupoId) }));
      }
    }
    if (pathname === "/api/admin/consorcio/adesoes" && req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const grupoId = url.searchParams.get("grupoId");
      return sendJSON(res, 200, { ok: true, adesoes: await consorcio.listAdesoesAdmin({ grupoId: grupoId ? parseInt(grupoId, 10) : null }) });
    }
    const adesaoCancelarMatch = pathname.match(/^\/api\/admin\/consorcio\/adesoes\/(\d+)\/cancelar$/);
    if (adesaoCancelarMatch && req.method === "POST") {
      return kycGuard(async () => {
        await consorcio.cancelarAdesao(parseInt(adesaoCancelarMatch[1], 10));
        return sendJSON(res, 200, { ok: true });
      });
    }

    const adesaoDocEnderecoMatch = pathname.match(/^\/api\/admin\/consorcio\/adesoes\/(\d+)\/doc-endereco$/);
    if (adesaoDocEnderecoMatch && req.method === "GET") {
      const c = await consorcio.getDocEndereco(parseInt(adesaoDocEnderecoMatch[1], 10));
      if (!c) return sendJSON(res, 404, { ok: false, error: "Documento não encontrado." });
      return sendBinary(res, 200, c.data, c.tipo, c.nome);
    }

    const adesaoDocFotoMatch = pathname.match(/^\/api\/admin\/consorcio\/adesoes\/(\d+)\/doc-foto$/);
    if (adesaoDocFotoMatch && req.method === "GET") {
      const c = await consorcio.getDocFoto(parseInt(adesaoDocFotoMatch[1], 10));
      if (!c) return sendJSON(res, 404, { ok: false, error: "Documento não encontrado." });
      return sendBinary(res, 200, c.data, c.tipo, c.nome);
    }

    // Link de pagamento (ou chave PIX): salva na adesão e avisa o cliente
    // por e-mail — aqui não tem parceiro pra repassar, é sempre o próprio
    // cliente que contratou direto pelo catálogo.
    const adesaoPaymentLinkMatch = pathname.match(/^\/api\/admin\/consorcio\/adesoes\/(\d+)\/payment-link$/);
    if (adesaoPaymentLinkMatch && req.method === "POST") {
      const id = parseInt(adesaoPaymentLinkMatch[1], 10);
      const adesao = await consorcio.getAdesaoById(id);
      if (!adesao) return sendJSON(res, 404, { ok: false, error: "Adesão não encontrada." });
      const body = await parseJSONBody(req);
      const link = String(body.link || "").trim();
      if (!link) return sendJSON(res, 400, { ok: false, error: "Informe o link de pagamento (ou a chave PIX)." });
      if (link.length > 1000) return sendJSON(res, 400, { ok: false, error: "Link/chave muito longo (máximo 1000 caracteres)." });
      await consorcio.setPaymentLink(id, link);
      if (adesao.email) {
        await mailer.sendEmail({
          to: adesao.email,
          subject: `Sua Compra Programada: pagamento liberado / Your Compra Programada: payment released`,
          text: `Segue o link (ou chave PIX) pra fechar o pagamento do grupo ${adesao.grupoNome}: ${link}\n\nHere's the link (or PIX key) to complete the payment for group ${adesao.grupoNome}: ${link}`,
          html: mailer.pagamentoLinkConsorcioHTML({ grupoNome: adesao.grupoNome, link }),
        });
      }
      return sendJSON(res, 200, { ok: true, adesao: await consorcio.getAdesaoById(id) });
    }

    const adesaoConfirmarPagamentoMatch = pathname.match(/^\/api\/admin\/consorcio\/adesoes\/(\d+)\/confirmar-pagamento$/);
    if (adesaoConfirmarPagamentoMatch && req.method === "POST") {
      return kycGuard(async () => {
        const adesao = await consorcio.confirmarPagamento(parseInt(adesaoConfirmarPagamentoMatch[1], 10));
        return sendJSON(res, 200, { ok: true, adesao });
      });
    }
  }

  if (pathname === "/api/customers/me/pay-account" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const account = await payAccounts.getByCustomer(customer.id);
    let saldo = 0;
    if (account) {
      const row = await payAccounts.getRowByCustomer(customer.id);
      saldo = await payBalance.getSaldo(row.id);
    }
    return sendJSON(res, 200, { ok: true, account, saldo });
  }

  if (pathname === "/api/customers/me/pay-kyc" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, {
      ok: true,
      kyc: await payKyc.getByCustomer(customer.id),
      account: await payAccounts.getByCustomer(customer.id),
      consentVersion: payKyc.CONSENT_VERSION,
    });
  }

  if (pathname === "/api/customers/me/pay-kyc" && req.method === "PUT") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req);
    return kycGuard(async () => sendJSON(res, 200, { ok: true, kyc: await payKyc.saveDraft(customer.id, body) }));
  }

  const payKycDocMatch = pathname.match(/^\/api\/customers\/me\/pay-kyc\/documents\/([a-z_]+)$/);
  if (payKycDocMatch && req.method === "PUT") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req, Math.ceil(payKyc.MAX_DOC_BYTES * 1.4));
    return kycGuard(async () => {
      let buffer;
      try { buffer = Buffer.from(String(body.base64 || ""), "base64"); } catch { buffer = null; }
      await payKyc.saveDocument(customer.id, payKycDocMatch[1], { buffer, mime: body.mime, nome: body.nome });
      return sendJSON(res, 200, { ok: true, kyc: await payKyc.getByCustomer(customer.id) });
    });
  }

  if (pathname === "/api/customers/me/pay-kyc/submit" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req);
    return kycGuard(async () => {
      const row = await payKyc.submit(customer.id, {
        aceiteTermos: body.aceiteTermos,
        ip,
        userAgent: req.headers["user-agent"],
      });
      // Repasse ao parceiro (no modo "manual" não faz nada). Falha aqui não desfaz o envio.
      try { await payPartner.onKycSubmitted(row.id); } catch (err) { console.error("[payPartner] falha ao enviar KYC:", err.message); }
      try {
        await notifications.notifyAdmins({
          subject: `Nova solicitação de análise de conta — ${customer.nome} / New account review request`,
          text: `${customer.nome} (${customer.email}) enviou o cadastro Marques Pay pra análise.\n\n${customer.nome} (${customer.email}) submitted their Marques Pay application for review.`,
          html: mailer.adminNovaSolicitacaoContaHTML(customer),
        });
      } catch (err) { console.error("[notifications] falha ao avisar admins da solicitação de conta:", err.message); }
      return sendJSON(res, 200, { ok: true, kyc: await payKyc.getByCustomer(customer.id) });
    });
  }

  // ---- ADMIN: FILA DE ANÁLISE DAS CONTAS MARQUES PAY ----
  if (pathname === "/api/admin/pay/kyc" && req.method === "GET") {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const status = url.searchParams.get("status");
    return sendJSON(res, 200, { ok: true, items: await payKyc.listForAdmin(status || null) });
  }

  const payKycAdminMatch = pathname.match(/^\/api\/admin\/pay\/kyc\/(\d+)(?:\/(approve|reject|documents\/([a-z_]+)))?$/);
  if (payKycAdminMatch) {
    const admin = await requireCompanyAccess(req, res, "promotora");
    if (!admin) return;
    const id = parseInt(payKycAdminMatch[1], 10);
    const action = payKycAdminMatch[2];
    const autor = `admin:${admin.email}`;

    if (!action && req.method === "GET") {
      const item = await payKyc.getForAdmin(id);
      if (!item) return sendJSON(res, 404, { ok: false, error: "Cadastro não encontrado." });
      return sendJSON(res, 200, { ok: true, item });
    }
    if (action && action.startsWith("documents/") && req.method === "GET") {
      const doc = await payKyc.getDocumentForAdmin(id, payKycAdminMatch[3], autor);
      if (!doc) return sendJSON(res, 404, { ok: false, error: "Documento não encontrado." });
      return sendBinary(res, 200, doc.data, doc.mime, doc.nome);
    }
    if (action === "approve" && req.method === "POST") {
      return kycGuard(async () => {
        await payKyc.approve(id, autor);
        const item = await payKyc.getForAdmin(id);
        try {
          await mailer.sendEmail({ to: item.email, subject: "Sua conta Marques Pay foi aprovada! / Your Marques Pay account was approved!", text: "Seu cadastro foi aprovado. Sua conta digital já está ativa.\n\nYour application was approved. Your digital account is now active.", html: mailer.contaAprovadaHTML() });
        } catch (e) { console.error("[notifications] falha ao avisar cliente da aprovação:", e.message); }
        return sendJSON(res, 200, { ok: true, item });
      });
    }
    if (action === "reject" && req.method === "POST") {
      const body = await parseJSONBody(req);
      return kycGuard(async () => {
        await payKyc.reject(id, autor, body.motivo);
        const item = await payKyc.getForAdmin(id);
        try {
          await mailer.sendEmail({ to: item.email, subject: "Sua conta Marques Pay não foi aprovada / Your Marques Pay account was not approved", text: `Seu cadastro não foi aprovado. Motivo: ${body.motivo || "não informado"}.\n\nYour application was not approved. Reason: ${body.motivo || "not informed"}.`, html: mailer.contaRecusadaHTML(body.motivo) });
        } catch (e) { console.error("[notifications] falha ao avisar cliente da recusa:", e.message); }
        return sendJSON(res, 200, { ok: true, item });
      });
    }
  }

  // ---- WEBHOOK DO PARCEIRO BANCÁRIO (assinado com HMAC; ver payPartner.js) ----
  if (pathname === "/api/webhooks/pay-partner" && req.method === "POST") {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 256 * 1024) return sendJSON(res, 413, { ok: false, error: "Corpo muito grande." });
      chunks.push(chunk);
    }
    const result = await payPartner.handleWebhook(Buffer.concat(chunks).toString("utf8"), req.headers["x-signature"]);
    return sendJSON(res, result.status, result.ok ? { ok: true } : { ok: false, error: result.error });
  }

  // ---- PARCEIROS (programa de vendas por indicação) ----
  // Reaproveita o kycGuard: erros de regra (4xx) viram resposta com mensagem.
  if (pathname === "/api/partners/me" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, {
      ok: true,
      partner: await partners.getByCustomer(customer.id),
      rates: await partners.getRates(),
      termsVersion: partners.TERMOS_VERSAO,
    });
  }

  if (pathname === "/api/partners/me" && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const body = await parseJSONBody(req);
    return kycGuard(async () => {
      const partner = await partners.apply(customer.id, {
        pixTipo: body.pixTipo, pixChave: body.pixChave, aceiteTermos: body.aceiteTermos, ip,
      });
      return sendJSON(res, 200, { ok: true, partner });
    });
  }

  if (pathname === "/api/partners/me/summary" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const row = await partners.getRowByCustomer(customer.id);
    if (!row || row.status !== "ativo") return sendJSON(res, 403, { ok: false, error: "Seu cadastro de parceiro ainda não está ativo." });
    return sendJSON(res, 200, { ok: true, ...(await partners.summaryForPartner(row.id)) });
  }

  // Acompanhamento passo a passo (mesmo status usado no "Minha Conta" do
  // cliente) dos pedidos e solicitações de crédito indicados/assistidos
  // pelo parceiro — não só o status da comissão.
  if (pathname === "/api/partners/me/orders" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const row = await partners.getRowByCustomer(customer.id);
    if (!row || row.status !== "ativo") return sendJSON(res, 403, { ok: false, error: "Seu cadastro de parceiro ainda não está ativo." });
    return sendJSON(res, 200, { ok: true, orders: await orders.listOrdersByPartner(row.id) });
  }

  // Resposta do parceiro a uma pendência: anexo obrigatório (documento
  // corrigido) + observação opcional — avisa os admins por e-mail.
  const partnerOrderPendenciaRespostaMatch = pathname.match(/^\/api\/partners\/me\/orders\/(\d+)\/pendencia-resposta$/);
  if (partnerOrderPendenciaRespostaMatch && req.method === "POST") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const row = await partners.getRowByCustomer(customer.id);
    if (!row || row.status !== "ativo") return sendJSON(res, 403, { ok: false, error: "Seu cadastro de parceiro ainda não está ativo." });
    const id = parseInt(partnerOrderPendenciaRespostaMatch[1], 10);
    const order = await orders.getOrderById(id);
    if (!order || order.partnerId !== row.id) return sendJSON(res, 404, { ok: false, error: "Pedido não encontrado." });
    if (!order.pendencia) return sendJSON(res, 400, { ok: false, error: "Esse pedido não tem pendência aberta." });

    const body = await parseJSONBody(req, Math.ceil(orders.MAX_DOC_BYTES * 1.4));
    let buffer;
    try { buffer = Buffer.from(String(body.arquivoBase64 || ""), "base64"); } catch { return sendJSON(res, 400, { ok: false, error: "Anexo inválido." }); }
    if (!buffer.length) return sendJSON(res, 400, { ok: false, error: "Anexe o documento corrigido." });
    if (buffer.length > orders.MAX_DOC_BYTES) return sendJSON(res, 413, { ok: false, error: "Anexo maior que 5MB." });
    if (!isAllowedFileMime(body.arquivoTipo)) return sendJSON(res, 400, { ok: false, error: `Arquivo deve ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
    const texto = String(body.texto || "").trim().slice(0, 1000);

    await orders.setPendenciaResposta(id, { buffer, tipo: body.arquivoTipo, nome: body.arquivoNome, texto });
    try {
      await notifications.notifyAdmins({
        subject: `Pedido ${order.orderNumber}: resposta à pendência / pending issue reply`,
        text: `${customer.nome} respondeu a pendência do pedido ${order.orderNumber}${texto ? ": " + texto : "."}\n\n${customer.nome} replied to order ${order.orderNumber}'s pending issue${texto ? ": " + texto : "."}`,
        html: mailer.adminPendenciaRespostaHTML({ orderNumber: order.orderNumber, autor: `parceiro:${customer.email}`, texto }),
      });
    } catch (e) { console.error("[notifications] falha ao avisar admins da resposta de pendência:", e.message); }

    return sendJSON(res, 200, { ok: true, order: await orders.getOrderById(id) });
  }

  if (pathname === "/api/partners/me/leads" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const row = await partners.getRowByCustomer(customer.id);
    if (!row || row.status !== "ativo") return sendJSON(res, 403, { ok: false, error: "Seu cadastro de parceiro ainda não está ativo." });
    return sendJSON(res, 200, { ok: true, leads: await creditLeads.listLeadsByPartner(row.id) });
  }

  const partnerMyComprovanteMatch = pathname.match(/^\/api\/partners\/me\/commissions\/(\d+)\/comprovante$/);
  if (partnerMyComprovanteMatch && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const row = await partners.getRowByCustomer(customer.id);
    if (!row) return sendJSON(res, 404, { ok: false, error: "Comprovante não encontrado." });
    const c = await partners.getComprovanteForPartner(parseInt(partnerMyComprovanteMatch[1], 10), row.id);
    if (!c) return sendJSON(res, 404, { ok: false, error: "Comprovante não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  // ---- ADMIN: PARCEIROS E COMISSÕES (só o dono: envolve dinheiro das duas empresas) ----
  if (pathname.startsWith("/api/admin/partner")) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role !== "owner") return sendJSON(res, 403, { ok: false, error: "Apenas o dono pode gerenciar o programa de parceiros." });
    const autor = `admin:${admin.email}`;
    const url = new URL(req.url, "http://localhost");

    if (pathname === "/api/admin/partners/rates" && req.method === "GET") {
      return sendJSON(res, 200, { ok: true, rates: await partners.getRates() });
    }
    if (pathname === "/api/admin/partners/rates" && req.method === "POST") {
      const body = await parseJSONBody(req);
      return kycGuard(async () => sendJSON(res, 200, { ok: true, rates: await partners.setRates({ loja: body.loja, credito: body.credito, consorcio: body.consorcio }) }));
    }
    if (pathname === "/api/admin/partners" && req.method === "GET") {
      return sendJSON(res, 200, { ok: true, items: await partners.listPartners(url.searchParams.get("status") || null) });
    }
    const adminPartnerMatch = pathname.match(/^\/api\/admin\/partners\/(\d+)$/);
    if (adminPartnerMatch && req.method === "PATCH") {
      const id = parseInt(adminPartnerMatch[1], 10);
      const body = await parseJSONBody(req);
      return kycGuard(async () => {
        if (body.status !== undefined) await partners.setStatus(id, body.status, autor, body.motivo);
        if (body.overrideLoja !== undefined || body.overrideCredito !== undefined || body.overrideConsorcio !== undefined) {
          await partners.setOverrides(id, { loja: body.overrideLoja, credito: body.overrideCredito, consorcio: body.overrideConsorcio });
        }
        return sendJSON(res, 200, { ok: true });
      });
    }
    if (pathname === "/api/admin/partner-commissions" && req.method === "GET") {
      const pid = url.searchParams.get("partnerId");
      return sendJSON(res, 200, {
        ok: true,
        items: await partners.listCommissions({ status: url.searchParams.get("status") || null, partnerId: pid ? parseInt(pid, 10) : null }),
      });
    }
    const adminCommMatch = pathname.match(/^\/api\/admin\/partner-commissions\/(\d+)(?:\/(pay|comprovante))?$/);
    if (adminCommMatch) {
      const id = parseInt(adminCommMatch[1], 10);
      const action = adminCommMatch[2];
      if (!action && req.method === "PATCH") {
        const body = await parseJSONBody(req);
        return kycGuard(async () => {
          await partners.adjust(id, { valor: body.valor, observacao: body.observacao });
          return sendJSON(res, 200, { ok: true });
        });
      }
      if (action === "pay" && req.method === "POST") {
        const body = await parseJSONBody(req, Math.ceil(partners.MAX_COMPROVANTE_BYTES * 1.4));
        return kycGuard(async () => {
          let buffer = null;
          try { buffer = Buffer.from(String(body.comprovanteBase64 || ""), "base64"); } catch { buffer = null; }
          await partners.markPaid(id, {
            pagoEm: body.pagoEm, comprovanteBuffer: buffer, comprovanteTipo: body.comprovanteTipo, comprovanteNome: body.comprovanteNome,
          });
          return sendJSON(res, 200, { ok: true });
        });
      }
      if (action === "comprovante" && req.method === "GET") {
        const c = await partners.getComprovanteAdmin(id);
        if (!c) return sendJSON(res, 404, { ok: false, error: "Comprovante não encontrado." });
        return sendBinary(res, 200, c.data, c.tipo, c.nome);
      }
    }
  }

  // ---- ADMIN: E-MAILS DE NOTIFICAÇÃO (só o dono) ----
  if (pathname === "/api/admin/notification-emails" && req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role !== "owner") return sendJSON(res, 403, { ok: false, error: "Apenas o dono pode gerenciar as notificações." });
    return sendJSON(res, 200, { ok: true, items: await notifications.listEmails() });
  }
  if (pathname === "/api/admin/notification-emails" && req.method === "POST") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role !== "owner") return sendJSON(res, 403, { ok: false, error: "Apenas o dono pode gerenciar as notificações." });
    const body = await parseJSONBody(req);
    return kycGuard(async () => sendJSON(res, 201, { ok: true, items: await notifications.addEmail(body.email) }));
  }
  const notificationEmailMatch = pathname.match(/^\/api\/admin\/notification-emails\/(\d+)$/);
  if (notificationEmailMatch && req.method === "DELETE") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (admin.role !== "owner") return sendJSON(res, 403, { ok: false, error: "Apenas o dono pode gerenciar as notificações." });
    return kycGuard(async () => sendJSON(res, 200, { ok: true, items: await notifications.removeEmail(parseInt(notificationEmailMatch[1], 10)) }));
  }

  // ---- CLIENTE: MEUS BOLETOS (empréstimos/financiamentos com a Marques) ----
  if (pathname === "/api/customers/me/loans" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, {
      ok: true,
      contracts: await loans.listContractsByCustomer(customer.id),
      installments: await loans.listInstallmentsByCustomer(customer.id),
    });
  }

  const loanContratoClienteMatch = pathname.match(/^\/api\/customers\/me\/loans\/(\d+)\/contrato$/);
  if (loanContratoClienteMatch && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const c = await loans.getContrato(parseInt(loanContratoClienteMatch[1], 10), customer.id);
    if (!c) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  // ---- CLIENTE: PARTICIPAÇÃO NOS LUCROS ----
  if (pathname === "/api/customers/me/profit-share" && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    return sendJSON(res, 200, {
      ok: true,
      contracts: await profitShare.listContractsByCustomer(customer.id),
      payments: await profitShare.listPaymentsByCustomer(customer.id),
    });
  }

  const profitShareContratoClienteMatch = pathname.match(/^\/api\/customers\/me\/profit-share\/(\d+)\/contrato$/);
  if (profitShareContratoClienteMatch && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const c = await profitShare.getContrato(parseInt(profitShareContratoClienteMatch[1], 10), customer.id);
    if (!c) return sendJSON(res, 404, { ok: false, error: "Contrato não encontrado." });
    return sendBinary(res, 200, c.data, c.tipo, c.nome);
  }

  const profitSharePaymentComprovanteMatch = pathname.match(/^\/api\/customers\/me\/profit-share\/payments\/(\d+)\/comprovante$/);
  if (profitSharePaymentComprovanteMatch && req.method === "GET") {
    const customer = await requireCustomer(req, res);
    if (!customer) return;
    const id = parseInt(profitSharePaymentComprovanteMatch[1], 10);
    const comprovante = await profitShare.getPaymentComprovante(id, customer.id);
    if (!comprovante) return sendJSON(res, 404, { ok: false, error: "Comprovante não encontrado." });
    return sendBinary(res, 200, comprovante.data, comprovante.tipo, comprovante.nome);
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

  // ---- ADMIN: PASTAS DO CLIENTE (documentos/contratos, só "owner") ----
  if (pathname === "/api/admin/pastas/buscar" && req.method === "GET") {
    const admin = await requireOwner(req, res);
    if (!admin) return;
    const url = new URL(req.url, "http://localhost");
    const offset = Math.max(0, parseInt(url.searchParams.get("offset"), 10) || 0);
    const { results, hasMore } = await folders.searchFolders(url.searchParams.get("q"), { offset });
    return sendJSON(res, 200, { ok: true, results, hasMore });
  }

  // Documento "automático" (já existente em outra parte do sistema) — um
  // único dispatcher genérico em vez de replicar rota por rota; delega pro
  // getter já usado nas telas originais, então mantém o mesmo comportamento
  // (inclusive o log de auditoria de visualização do KYC).
  const pastasAutoMatch = pathname.match(/^\/api\/admin\/pastas\/(\d+)\/auto\/([a-z_]+)\/(\d+)$/);
  if (pastasAutoMatch && req.method === "GET") {
    const admin = await requireOwner(req, res);
    if (!admin) return;
    const refOrigem = pastasAutoMatch[2];
    const refId = parseInt(pastasAutoMatch[3], 10);
    const autor = `admin:${admin.email}`;
    let doc = null;
    switch (refOrigem) {
      case "kyc": {
        const url = new URL(req.url, "http://localhost");
        doc = await payKyc.getDocumentForAdmin(refId, url.searchParams.get("tipo"), autor);
        break;
      }
      case "order_contrato": doc = await orders.getContrato(refId); break;
      case "order_doc_endereco": doc = await orders.getDocEndereco(refId); break;
      case "order_doc_foto": doc = await orders.getDocFoto(refId); break;
      case "order_pendencia_resposta": doc = await orders.getPendenciaResposta(refId); break;
      case "credit_lead_contrato": doc = await creditLeads.getContrato(refId); break;
      case "loan_contrato": doc = await loans.getContrato(refId); break;
      case "profit_share_contrato": doc = await profitShare.getContrato(refId); break;
      case "profit_share_comprovante": doc = await profitShare.getPaymentComprovante(refId); break;
      case "consorcio_doc_endereco": doc = await consorcio.getDocEndereco(refId); break;
      case "consorcio_doc_foto": doc = await consorcio.getDocFoto(refId); break;
      default: return sendJSON(res, 400, { ok: false, error: "Origem inválida." });
    }
    if (!doc) return sendJSON(res, 404, { ok: false, error: "Documento não encontrado." });
    return sendBinary(res, 200, doc.data, doc.mime || doc.tipo, doc.nome);
  }

  const pastasDocsMatch = pathname.match(/^\/api\/admin\/pastas\/(\d+)\/documentos$/);
  if (pastasDocsMatch && req.method === "POST") {
    const admin = await requireOwner(req, res);
    if (!admin) return;
    const customerId = parseInt(pastasDocsMatch[1], 10);
    const body = await parseJSONBody(req, Math.ceil(folders.MAX_DOC_BYTES * 1.4));
    let buffer = null;
    try { buffer = Buffer.from(String(body.arquivoBase64 || ""), "base64"); } catch { buffer = null; }
    if (!buffer || !buffer.length) return sendJSON(res, 400, { ok: false, error: "Anexe um arquivo." });
    if (!isAllowedFileMime(body.arquivoTipo)) {
      return sendJSON(res, 400, { ok: false, error: `Arquivo deve ser um de: ${ALLOWED_FILE_MIMES.join(", ")}.` });
    }
    try {
      await folders.addDocument(customerId, {
        categoria: body.categoria, buffer, mime: body.arquivoTipo, nome: body.arquivoNome,
        autor: `admin:${admin.email}`,
      });
    } catch (e) {
      return sendJSON(res, e.statusCode || 400, { ok: false, error: e.message });
    }
    const folder = await folders.getFolder(customerId);
    if (!folder) return sendJSON(res, 404, { ok: false, error: "Cliente não encontrado." });
    return sendJSON(res, 201, { ok: true, folder });
  }

  const pastasDocMatch = pathname.match(/^\/api\/admin\/pastas\/(\d+)\/documentos\/(\d+)$/);
  if (pastasDocMatch && (req.method === "GET" || req.method === "DELETE")) {
    const admin = await requireOwner(req, res);
    if (!admin) return;
    const customerId = parseInt(pastasDocMatch[1], 10);
    const docId = parseInt(pastasDocMatch[2], 10);
    const doc = await folders.getManualDocument(docId);
    if (!doc || doc.customerId !== customerId) return sendJSON(res, 404, { ok: false, error: "Documento não encontrado." });

    if (req.method === "GET") return sendBinary(res, 200, doc.data, doc.tipo, doc.nome);

    await folders.deleteManualDocument(docId);
    return sendJSON(res, 200, { ok: true, folder: await folders.getFolder(customerId) });
  }

  const pastasCustomerMatch = pathname.match(/^\/api\/admin\/pastas\/(\d+)$/);
  if (pastasCustomerMatch && req.method === "GET") {
    const admin = await requireOwner(req, res);
    if (!admin) return;
    const folder = await folders.getFolder(parseInt(pastasCustomerMatch[1], 10));
    if (!folder) return sendJSON(res, 404, { ok: false, error: "Cliente não encontrado." });
    return sendJSON(res, 200, { ok: true, folder });
  }

  sendJSON(res, 404, { ok: false, error: "Rota de API não encontrada." });
}

async function main() {
  await db.initSchema();
  await auth.ensureAdminSeeded();
  await products.seedIfEmpty();
  products.purgeOrphanImages().catch((e) => console.error("[products] falha ao limpar fotos órfãs:", e.message));

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
