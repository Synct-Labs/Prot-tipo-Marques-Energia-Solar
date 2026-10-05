/* =====================================================================
   ENVIO DE E-MAIL (verificação em duas etapas, redefinição de senha,
   notificações de pedido/crédito/Marques Pay)
   ---------------------------------------------------------------------
   Envia via SMTP do Gmail/Google Workspace (nodemailer), usando a conta
   configurada em SMTP_USER/SMTP_PASS (backend/.env) — precisa ser uma
   "senha de app" do Google, não a senha normal da conta (exige 2FA
   ativado na conta Google pra gerar uma). Sem essas variáveis definidas,
   o e-mail não é enviado de verdade: o conteúdo só aparece no log do
   servidor, pra dar pra testar o fluxo sem precisar configurar nada
   primeiro.

   Todo e-mail é bilíngue (PT + EN) no mesmo corpo — o backend não sabe
   qual idioma o destinatário prefere (isso só existe no localStorage do
   navegador), então em vez de rastrear preferência de idioma por conta,
   cada e-mail já sai com as duas versões lado a lado.
   ===================================================================== */
const nodemailer = require("nodemailer");
const config = require("./config");

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (config.SMTP_USER && config.SMTP_PASS) {
    try {
      await getTransporter().sendMail({
        from: config.MAIL_FROM,
        to,
        subject,
        text,
        html: html || `<p>${text}</p>`,
      });
    } catch (err) {
      console.error("[mailer] Falha ao enviar e-mail via SMTP:", err.message);
      throw new Error("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
    }
    return { simulated: false };
  }

  console.log(
    `\n[e-mail simulado — configure SMTP_USER/SMTP_PASS em backend/.env pra enviar de verdade]\n` +
    `Para: ${to}\nAssunto: ${subject}\n${text}\n`
  );
  return { simulated: true };
}

// Domínio "de verdade" do site (usado nos links/CTA e na imagem do logo,
// que precisa de uma URL pública pro cliente de e-mail conseguir buscar).
const SITE_URL = "https://marquespromotora.com";
const LOGO_URL = `${SITE_URL}/logo-mark-128.png`;

function escHtml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Junta um par PT/EN num único texto "PT / EN" — usado em títulos, botões
// e assuntos, onde cabe tudo numa linha só.
function bi(pt, en) {
  return `${pt} / ${en}`;
}

/* ======================================================================
   CASCA VISUAL COMPARTILHADA
   ---------------------------------------------------------------------
   Cartão claro com o logo no topo, cores da marca (laranja + quase-preto)
   — layout com <table> em vez de flex/grid pra abrir igual em qualquer
   cliente de e-mail (Gmail, Outlook, app do celular...), sem depender de
   fonte web (só Arial/Helvetica, que todo cliente já tem).
   ====================================================================== */
function emailShellHTML({ title, bodyHTML, ctaHref, ctaLabel, footerNote }) {
  const cta = ctaHref
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td style="background:#F7941E; border-radius:10px;">
         <a href="${escHtml(ctaHref)}" style="display:inline-block; padding:13px 26px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#1a1200; text-decoration:none;">${escHtml(ctaLabel || bi("Acessar", "Access"))}</a>
       </td></tr></table>`
    : "";
  return `
<div style="background:#f2f0ec; padding:32px 16px; font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:#111111; padding:18px 28px;">
      <img src="${LOGO_URL}" width="30" height="30" alt="Marques" style="border-radius:8px; vertical-align:middle;">
      <span style="color:#ffffff; font-size:17px; font-weight:bold; margin-left:10px; vertical-align:middle;">Marques</span>
    </td></tr>
    <tr><td style="padding:32px 28px;">
      <h2 style="margin:0 0 16px; color:#1a1200; font-size:20px; font-family:Arial,Helvetica,sans-serif;">${escHtml(title)}</h2>
      ${bodyHTML}
      ${cta}
    </td></tr>
    <tr><td style="background:#f7f6f3; padding:16px 28px; border-top:1px solid #ececec;">
      <p style="margin:0; color:#93938f; font-size:12px; line-height:1.5;">${footerNote || "Marques Energia Solar &amp; Marques Promotora — e-mail automático, não é preciso responder.<br>Automatic email, no reply needed."}</p>
    </td></tr>
  </table>
</div>`;
}

// Renderiza pares [textoPT, textoEN] como parágrafos empilhados: PT normal
// em cima, EN um pouco menor/acinzentado logo abaixo — dá pra ler os dois
// sem duplicar o layout inteiro do e-mail.
function biParagraphsHTML(pairs) {
  return pairs.map(([pt, en]) => `<p style="margin:0 0 2px; color:#3a3a38; font-size:15px; line-height:1.6;">${pt}</p><p style="margin:0 0 14px; color:#8a8a86; font-size:13px; line-height:1.5; font-style:italic;">${en}</p>`).join("");
}

// Wrapper reaproveitado por todos os e-mails de notificação abaixo (aviso
// pro admin de evento novo, aviso pro cliente de status) — recebe pares
// [pt, en] de parágrafo e um título/cta já no formato bilíngue "PT / EN".
function simpleEmailHTML(title, pairs, { ctaHref, ctaLabel } = {}) {
  return emailShellHTML({ title, bodyHTML: biParagraphsHTML(pairs), ctaHref, ctaLabel });
}

function verificationEmailHTML(code) {
  const codeBlock = `<div style="background:#f7f6f3; border:1px dashed #F7941E; border-radius:12px; padding:18px; text-align:center; margin:6px 0 18px;">
    <span style="font-family:'Courier New',monospace; font-size:32px; font-weight:bold; letter-spacing:8px; color:#1a1200;">${escHtml(code)}</span>
  </div>`;
  return emailShellHTML({
    title: bi("Seu código de verificação", "Your verification code"),
    bodyHTML: `<p style="margin:0 0 2px; color:#3a3a38; font-size:15px; line-height:1.6;">Use o código abaixo para confirmar que é você:</p><p style="margin:0 0 6px; color:#8a8a86; font-size:13px; line-height:1.5; font-style:italic;">Use the code below to confirm it's you:</p>${codeBlock}<p style="margin:0; color:#93938f; font-size:13px; line-height:1.5;">Esse código expira em alguns minutos. Se você não pediu esse código, pode ignorar este e-mail.<br><em>This code expires in a few minutes. If you didn't request it, you can ignore this email.</em></p>`,
  });
}

// kind: 'admin' -> admin/redefinir-senha.html | 'customer' -> conta/redefinir-senha.html
// (mesma separação de páginas já usada pro login e pra abertura de conta).
// Exportado à parte porque o texto simples do e-mail (usado no log quando
// SMTP não está configurado, ver sendEmail acima) também precisa do link —
// sem isso, não dava pra testar o fluxo sem SMTP de verdade configurado.
function passwordResetLink(kind, token) {
  const path = kind === "admin" ? "admin/redefinir-senha.html" : "conta/redefinir-senha.html";
  return `${SITE_URL}/${path}?token=${encodeURIComponent(token)}`;
}

function passwordResetEmailHTML(kind, token) {
  const link = passwordResetLink(kind, token);
  return simpleEmailHTML(
    bi("Redefinir sua senha", "Reset your password"),
    [
      [
        "Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para escolher uma nova.",
        "We received a request to reset your password. Click the button below to choose a new one.",
      ],
      [
        "O link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha continua a mesma.",
        "The link expires in 1 hour. If you didn't request this reset, you can ignore this email — your password stays the same.",
      ],
    ],
    { ctaHref: link, ctaLabel: bi("Redefinir senha", "Reset password") }
  );
}

function adminLoginNotificationHTML({ ip, quando }) {
  return simpleEmailHTML(bi("Novo login no painel Marques", "New login to the Marques panel"), [
    ["Sua conta de administrador acabou de entrar no painel.", "Your administrator account just logged into the panel."],
    [`Quando: <strong>${quando}</strong>.`, `When: <strong>${quando}</strong>.`],
    [`IP: <strong>${ip}</strong>.`, `IP: <strong>${ip}</strong>.`],
    ["Se não foi você, troque sua senha agora e avise o dono da conta.", "If this wasn't you, change your password now and tell the account owner."],
  ]);
}

/* ---------------------- AVISOS PRO ADMIN (evento novo) ---------------------- */
function adminNovoPedidoHTML(order) {
  const total = Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return simpleEmailHTML(bi("Novo pedido na loja", "New order in the store"), [
    [`Pedido <strong>${order.orderNumber}</strong> de <strong>${order.customer.nome}</strong>.`, `Order <strong>${order.orderNumber}</strong> from <strong>${order.customer.nome}</strong>.`],
    [`Total: <strong>${total}</strong>.`, `Total: <strong>${total}</strong>.`],
  ], { ctaHref: "https://marquespromotora.com/admin/dashboard.html", ctaLabel: bi("Ver pedido", "View order") });
}

function adminPendenciaRespostaHTML({ orderNumber, autor, texto }) {
  return simpleEmailHTML(bi(`Pedido ${escHtml(orderNumber)}: resposta à pendência`, `Order ${escHtml(orderNumber)}: pending issue reply`), [
    [
      `<strong>${escHtml(autor)}</strong> respondeu a pendência do pedido <strong>${escHtml(orderNumber)}</strong> com um novo anexo.`,
      `<strong>${escHtml(autor)}</strong> replied to order <strong>${escHtml(orderNumber)}</strong>'s pending issue with a new attachment.`,
    ],
    texto
      ? [`Observação: ${escHtml(texto)}`, `Note: ${escHtml(texto)}`]
      : ["Sem observação, só o anexo.", "No note, just the attachment."],
  ], { ctaHref: "https://marquespromotora.com/admin/dashboard.html", ctaLabel: bi("Ver pedido", "View order") });
}

function adminNovaSolicitacaoCreditoHTML(lead) {
  return simpleEmailHTML(bi("Nova solicitação de crédito", "New credit request"), [
    [`Solicitação <strong>${lead.leadNumber}</strong> de <strong>${lead.dadosBasicos.nome}</strong>.`, `Request <strong>${lead.leadNumber}</strong> from <strong>${lead.dadosBasicos.nome}</strong>.`],
    [`Modalidade: <strong>${lead.modalidadeInteresse || "-"}</strong>.`, `Type: <strong>${lead.modalidadeInteresse || "-"}</strong>.`],
  ], { ctaHref: "https://marquespromotora.com/admin/credit-leads.html", ctaLabel: bi("Ver solicitação", "View request") });
}

function adminNovaSolicitacaoContaHTML(customer) {
  return simpleEmailHTML(bi("Nova solicitação de análise de conta (Marques Pay)", "New account review request (Marques Pay)"), [
    [
      `<strong>${customer.nome}</strong> (${customer.email}) enviou o cadastro pra análise.`,
      `<strong>${customer.nome}</strong> (${customer.email}) submitted their application for review.`,
    ],
  ], { ctaHref: "https://marquespromotora.com/admin/marques-pay.html", ctaLabel: bi("Analisar cadastro", "Review application") });
}

/* ---------------------- AVISOS PRO CLIENTE ---------------------- */
function contaAprovadaHTML() {
  return simpleEmailHTML(bi("Sua conta Marques Pay foi aprovada!", "Your Marques Pay account was approved!"), [
    ["Boa notícia: seu cadastro foi analisado e aprovado. Sua conta digital já está ativa.", "Good news: your application was reviewed and approved. Your digital account is now active."],
  ], { ctaHref: "https://marquespromotora.com/conta-digital-dashboard.html", ctaLabel: bi("Acessar minha conta", "Access my account") });
}

function contaRecusadaHTML(motivo) {
  const motivoTxt = motivo || "não informado";
  return simpleEmailHTML(bi("Sua conta Marques Pay não foi aprovada", "Your Marques Pay account was not approved"), [
    ["Seu cadastro foi analisado e, por enquanto, não foi aprovado.", "Your application was reviewed and, for now, was not approved."],
    [`Motivo: ${motivoTxt}.`, `Reason: ${motivoTxt}.`],
    ["Você pode corrigir os dados/documentos e enviar de novo quando quiser.", "You can fix your details/documents and resubmit whenever you'd like."],
  ], { ctaHref: "https://marquespromotora.com/conta-digital-abrir.html", ctaLabel: bi("Corrigir e reenviar", "Fix and resubmit") });
}

const ORDER_STATUS_LABELS = {
  novo: ["Recebido", "Received"],
  confirmado: ["Confirmado", "Confirmed"],
  em_preparacao: ["Em preparação", "In preparation"],
  enviado: ["Enviado", "Shipped"],
  entregue: ["Entregue", "Delivered"],
  cancelado: ["Cancelado", "Canceled"],
};

function pedidoStatusHTML(order, status) {
  const [labelPt, labelEn] = ORDER_STATUS_LABELS[status] || [status, status];
  const titulo = status === "confirmado"
    ? bi("Seu pedido foi confirmado!", "Your order was confirmed!")
    : bi(`Seu pedido está: ${labelPt}`, `Your order status: ${labelEn}`);
  return simpleEmailHTML(titulo, [
    [`O pedido <strong>${order.orderNumber}</strong> agora está com status <strong>${labelPt}</strong>.`, `Order <strong>${order.orderNumber}</strong> is now: <strong>${labelEn}</strong>.`],
  ], { ctaHref: "https://marquespromotora.com/loja.html", ctaLabel: bi("Ver na loja", "View in store") });
}

const LEAD_STATUS_LABELS = {
  novo: ["Recebida", "Received"],
  em_analise: ["Em análise", "Under review"],
  aprovado: ["Aprovada", "Approved"],
  digitado: ["Digitada", "Proposal submitted"],
  pendenciado: ["Pendenciada (precisamos de algo seu)", "Pending (we need something from you)"],
  pago: ["Paga", "Paid"],
  recusado: ["Recusada", "Declined"],
};

function leadStatusHTML(lead, status) {
  const [labelPt, labelEn] = LEAD_STATUS_LABELS[status] || [status, status];
  return simpleEmailHTML(bi(`Sua solicitação de crédito: ${labelPt}`, `Your credit request: ${labelEn}`), [
    [`A solicitação <strong>${lead.leadNumber}</strong> agora está com status <strong>${labelPt}</strong>.`, `Request <strong>${lead.leadNumber}</strong> is now: <strong>${labelEn}</strong>.`],
  ], { ctaHref: "https://marquespromotora.com/index.html", ctaLabel: bi("Ver simulação", "View simulation") });
}

/* ======================================================================
   LINK DE PAGAMENTO / BOLETO (admin lança no pedido)
   ---------------------------------------------------------------------
   O valor pode ser uma URL de verdade (link de pagamento) ou um código de
   boleto (linha digitável) — só vira botão clicável quando parece URL;
   caso contrário, mostra num bloco monoespaçado pra copiar.
   ====================================================================== */
function isHttpUrl(v) {
  return /^https?:\/\//i.test(String(v || "").trim());
}

function pagamentoValorHTML(link) {
  if (isHttpUrl(link)) {
    return `<p style="margin:14px 0 0; color:#93938f; font-size:12px; word-break:break-all;">Ou copie o link: ${escHtml(link)}<br><em>Or copy the link:</em> ${escHtml(link)}</p>`;
  }
  return `<div style="background:#f7f6f3; border:1px dashed #F7941E; border-radius:12px; padding:14px 16px; margin:6px 0 4px; word-break:break-all; font-family:'Courier New',monospace; font-size:14px; color:#1a1200;">${escHtml(link)}</div>`;
}

function pagamentoLinkParaParceiroHTML({ orderNumber, clienteNome, link, pagamento }) {
  const [labelPt, labelEn] = pagamento === "boleto" ? ["boleto", "invoice (boleto)"] : ["link de pagamento", "payment link"];
  return emailShellHTML({
    title: bi(`Pedido ${escHtml(orderNumber)}: ${labelPt} pronto`, `Order ${escHtml(orderNumber)}: ${labelEn} ready`),
    bodyHTML: biParagraphsHTML([
      [
        `O pedido <strong>${escHtml(orderNumber)}</strong> (cliente: <strong>${escHtml(clienteNome)}</strong>) já tem o ${labelPt} pra fechar o pagamento.`,
        `Order <strong>${escHtml(orderNumber)}</strong> (customer: <strong>${escHtml(clienteNome)}</strong>) now has the ${labelEn} to complete payment.`,
      ],
      ["Repasse pro cliente:", "Pass it on to the customer:"],
    ]) + pagamentoValorHTML(link),
    ctaHref: isHttpUrl(link) ? link : undefined,
    ctaLabel: pagamento === "boleto" ? bi("Ver boleto", "View invoice") : bi("Pagar agora", "Pay now"),
  });
}

function pagamentoLinkParaClienteHTML({ orderNumber, link, pagamento }) {
  const [labelPt, labelEn] = pagamento === "boleto" ? ["boleto", "invoice (boleto)"] : ["link de pagamento", "payment link"];
  return emailShellHTML({
    title: bi(`Seu pedido ${escHtml(orderNumber)}: ${labelPt} pronto`, `Your order ${escHtml(orderNumber)}: ${labelEn} ready`),
    bodyHTML: biParagraphsHTML([
      [
        `Seu pedido <strong>${escHtml(orderNumber)}</strong> já tem o ${labelPt} pra fechar o pagamento.`,
        `Your order <strong>${escHtml(orderNumber)}</strong> now has the ${labelEn} to complete payment.`,
      ],
    ]) + pagamentoValorHTML(link),
    ctaHref: isHttpUrl(link) ? link : undefined,
    ctaLabel: pagamento === "boleto" ? bi("Ver boleto", "View invoice") : bi("Pagar agora", "Pay now"),
  });
}

// Aviso pro cliente quando o admin confirma o PIX da adesão.
function adesaoConfirmadaHTML({ grupoNome, valorCota }) {
  const valor = Number(valorCota).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return simpleEmailHTML(bi("Pagamento confirmado!", "Payment confirmed!"), [
    [
      `Recebemos o seu pagamento e sua adesão ao grupo <strong>${escHtml(grupoNome)}</strong> está confirmada.`,
      `We received your payment and your enrollment in group <strong>${escHtml(grupoNome)}</strong> is confirmed.`,
    ],
    [`Valor da cota: <strong>${valor}</strong>.`, `Share value: <strong>${valor}</strong>.`],
  ], { ctaHref: "https://marquespromotora.com/conta-digital-dashboard.html", ctaLabel: bi("Acessar minha conta", "Access my account") });
}

function adminNovaAdesaoConsorcioHTML(adesao) {
  return simpleEmailHTML(bi("Nova adesão na Compra Programada", "New Compra Programada signup"), [
    [
      `<strong>${escHtml(adesao.nome)}</strong> contratou o grupo <strong>${escHtml(adesao.grupoNome)}</strong> e já anexou os documentos.`,
      `<strong>${escHtml(adesao.nome)}</strong> joined group <strong>${escHtml(adesao.grupoNome)}</strong> and already attached the documents.`,
    ],
    ["Confira os documentos e lance o link de pagamento (ou chave PIX) pra ela.", "Check the documents and send them the payment link (or PIX key)."],
  ], { ctaHref: "https://marquespromotora.com/admin/compra-programada.html", ctaLabel: bi("Ver adesão", "View signup") });
}

/* ======================================================================
   PENDÊNCIA NO PEDIDO (ex: comprovante de endereço ilegível)
   ====================================================================== */
function pendenciaParaParceiroHTML({ orderNumber, clienteNome, texto }) {
  return simpleEmailHTML(bi(`Pedido ${orderNumber}: pendência`, `Order ${orderNumber}: pending issue`), [
    [`O pedido <strong>${escHtml(orderNumber)}</strong> (cliente: <strong>${escHtml(clienteNome)}</strong>) está com uma pendência.`, `Order <strong>${escHtml(orderNumber)}</strong> (customer: <strong>${escHtml(clienteNome)}</strong>) has a pending issue.`],
    [`<strong>Pendência:</strong> ${escHtml(texto)}`, `<strong>Issue:</strong> ${escHtml(texto)}`],
  ], { ctaHref: `${SITE_URL}/parceiros.html`, ctaLabel: bi("Ver no meu painel", "View in my panel") });
}

function pendenciaParaClienteHTML({ orderNumber, texto }) {
  return simpleEmailHTML(bi(`Seu pedido ${orderNumber}: pendência`, `Your order ${orderNumber}: pending issue`), [
    [`Seu pedido <strong>${escHtml(orderNumber)}</strong> está com uma pendência.`, `Your order <strong>${escHtml(orderNumber)}</strong> has a pending issue.`],
    [`<strong>Pendência:</strong> ${escHtml(texto)}`, `<strong>Issue:</strong> ${escHtml(texto)}`],
  ], { ctaHref: `${SITE_URL}/conta/minha-conta.html`, ctaLabel: bi("Ver meu pedido", "View my order") });
}

module.exports = {
  sendEmail, verificationEmailHTML, passwordResetEmailHTML, passwordResetLink,
  adminNovoPedidoHTML, adminNovaSolicitacaoCreditoHTML, adminNovaSolicitacaoContaHTML,
  contaAprovadaHTML, contaRecusadaHTML, pedidoStatusHTML, leadStatusHTML,
  adminLoginNotificationHTML,
  pagamentoLinkParaParceiroHTML, pagamentoLinkParaClienteHTML,
  pendenciaParaParceiroHTML, pendenciaParaClienteHTML,
  adminPendenciaRespostaHTML,
  adminNovaAdesaoConsorcioHTML, adesaoConfirmadaHTML,
};
