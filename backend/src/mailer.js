/* =====================================================================
   ENVIO DE E-MAIL (verificação em duas etapas por e-mail)
   ---------------------------------------------------------------------
   Envia via SMTP do Gmail/Google Workspace (nodemailer), usando a mesma
   conta contato@marquespromotora.com já configurada pro site. Sem
   SMTP_USER/SMTP_PASS configurados (backend/.env), o e-mail não é
   enviado de verdade: o conteúdo só aparece no log do servidor, pra dar
   pra testar o fluxo sem precisar configurar nada primeiro.
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
  if (!config.SMTP_USER || !config.SMTP_PASS) {
    console.log(
      `\n[e-mail simulado — configure SMTP_USER/SMTP_PASS em backend/.env pra enviar de verdade]\n` +
      `Para: ${to}\nAssunto: ${subject}\n${text}\n`
    );
    return { simulated: true };
  }

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

// Domínio "de verdade" do site (usado nos links/CTA e na imagem do logo,
// que precisa de uma URL pública pro cliente de e-mail conseguir buscar).
const SITE_URL = "https://marquespromotora.com";
const LOGO_URL = `${SITE_URL}/logo-mark-128.png`;

function escHtml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
         <a href="${escHtml(ctaHref)}" style="display:inline-block; padding:13px 26px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#1a1200; text-decoration:none;">${escHtml(ctaLabel || "Acessar")}</a>
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
      <p style="margin:0; color:#93938f; font-size:12px; line-height:1.5;">${footerNote || "Marques Energia Solar &amp; Marques Promotora — e-mail automático, não é preciso responder."}</p>
    </td></tr>
  </table>
</div>`;
}

function paragraphsHTML(paragraphs) {
  return paragraphs.map((p) => `<p style="margin:0 0 14px; color:#3a3a38; font-size:15px; line-height:1.6;">${p}</p>`).join("");
}

// Wrapper simples reaproveitado por todos os e-mails de notificação abaixo
// (aviso pro admin de evento novo, aviso pro cliente de status) — mesma
// assinatura de antes (title, paragraphs, {ctaHref, ctaLabel}), só o visual
// por dentro que ficou bonito — nenhum call site precisa mudar.
function simpleEmailHTML(title, paragraphs, { ctaHref, ctaLabel } = {}) {
  return emailShellHTML({ title, bodyHTML: paragraphsHTML(paragraphs), ctaHref, ctaLabel });
}

function verificationEmailHTML(code) {
  const codeBlock = `<div style="background:#f7f6f3; border:1px dashed #F7941E; border-radius:12px; padding:18px; text-align:center; margin:6px 0 18px;">
    <span style="font-family:'Courier New',monospace; font-size:32px; font-weight:bold; letter-spacing:8px; color:#1a1200;">${escHtml(code)}</span>
  </div>`;
  return emailShellHTML({
    title: "Seu código de verificação",
    bodyHTML: `<p style="margin:0 0 6px; color:#3a3a38; font-size:15px; line-height:1.6;">Use o código abaixo para confirmar que é você:</p>${codeBlock}<p style="margin:0; color:#93938f; font-size:13px; line-height:1.5;">Esse código expira em alguns minutos. Se você não pediu esse código, pode ignorar este e-mail.</p>`,
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
    "Redefinir sua senha",
    [
      "Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para escolher uma nova.",
      "O link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha continua a mesma.",
    ],
    { ctaHref: link, ctaLabel: "Redefinir senha" }
  );
}

function adminLoginNotificationHTML({ ip, quando }) {
  return simpleEmailHTML("Novo login no painel Marques", [
    `Sua conta de administrador acabou de entrar no painel.`,
    `Quando: <strong>${quando}</strong>.`,
    `IP: <strong>${ip}</strong>.`,
    `Se não foi você, troque sua senha agora e avise o dono da conta.`,
  ]);
}

/* ---------------------- AVISOS PRO ADMIN (evento novo) ---------------------- */
function adminNovoPedidoHTML(order) {
  return simpleEmailHTML("Novo pedido na loja", [
    `Pedido <strong>${order.orderNumber}</strong> de <strong>${order.customer.nome}</strong>.`,
    `Total: <strong>${Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>.`,
  ], { ctaHref: "https://marquespromotora.com/admin/dashboard.html", ctaLabel: "Ver pedido" });
}

function adminPendenciaRespostaHTML({ orderNumber, autor, texto }) {
  return simpleEmailHTML(`Pedido ${escHtml(orderNumber)}: resposta à pendência`, [
    `<strong>${escHtml(autor)}</strong> respondeu a pendência do pedido <strong>${escHtml(orderNumber)}</strong> com um novo anexo.`,
    texto ? `Observação: ${escHtml(texto)}` : `Sem observação, só o anexo.`,
  ], { ctaHref: "https://marquespromotora.com/admin/dashboard.html", ctaLabel: "Ver pedido" });
}

function adminNovaSolicitacaoCreditoHTML(lead) {
  return simpleEmailHTML("Nova solicitação de crédito", [
    `Solicitação <strong>${lead.leadNumber}</strong> de <strong>${lead.dadosBasicos.nome}</strong>.`,
    `Modalidade: <strong>${lead.modalidadeInteresse || "-"}</strong>.`,
  ], { ctaHref: "https://marquespromotora.com/admin/credit-leads.html", ctaLabel: "Ver solicitação" });
}

function adminNovaSolicitacaoContaHTML(customer) {
  return simpleEmailHTML("Nova solicitação de análise de conta (Marques Pay)", [
    `<strong>${customer.nome}</strong> (${customer.email}) enviou o cadastro pra análise.`,
  ], { ctaHref: "https://marquespromotora.com/admin/marques-pay.html", ctaLabel: "Analisar cadastro" });
}

/* ---------------------- AVISOS PRO CLIENTE ---------------------- */
function contaAprovadaHTML() {
  return simpleEmailHTML("Sua conta Marques Pay foi aprovada!", [
    "Boa notícia: seu cadastro foi analisado e aprovado. Sua conta digital já está ativa.",
  ], { ctaHref: "https://marquespromotora.com/conta-digital-dashboard.html", ctaLabel: "Acessar minha conta" });
}

function contaRecusadaHTML(motivo) {
  return simpleEmailHTML("Sua conta Marques Pay não foi aprovada", [
    "Seu cadastro foi analisado e, por enquanto, não foi aprovado.",
    `Motivo: ${motivo || "não informado"}.`,
    "Você pode corrigir os dados/documentos e enviar de novo quando quiser.",
  ], { ctaHref: "https://marquespromotora.com/conta-digital-abrir.html", ctaLabel: "Corrigir e reenviar" });
}

const ORDER_STATUS_LABELS = {
  novo: "Recebido",
  confirmado: "Confirmado",
  em_preparacao: "Em preparação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function pedidoStatusHTML(order, status) {
  const label = ORDER_STATUS_LABELS[status] || status;
  const titulo = status === "confirmado" ? "Seu pedido foi confirmado!" : `Seu pedido está: ${label}`;
  return simpleEmailHTML(titulo, [
    `O pedido <strong>${order.orderNumber}</strong> agora está com status <strong>${label}</strong>.`,
  ], { ctaHref: "https://marquespromotora.com/loja.html", ctaLabel: "Ver na loja" });
}

const LEAD_STATUS_LABELS = {
  novo: "Recebida",
  em_analise: "Em análise",
  contatado: "Contato feito",
  proposta_enviada: "Proposta enviada",
  convertido: "Aprovada/Convertida",
  recusado: "Recusada",
};

function leadStatusHTML(lead, status) {
  const label = LEAD_STATUS_LABELS[status] || status;
  return simpleEmailHTML(`Sua solicitação de crédito: ${label}`, [
    `A solicitação <strong>${lead.leadNumber}</strong> agora está com status <strong>${label}</strong>.`,
  ], { ctaHref: "https://marquespromotora.com/index.html", ctaLabel: "Ver simulação" });
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
    return `<p style="margin:14px 0 0; color:#93938f; font-size:12px; word-break:break-all;">Ou copie o link: ${escHtml(link)}</p>`;
  }
  return `<div style="background:#f7f6f3; border:1px dashed #F7941E; border-radius:12px; padding:14px 16px; margin:6px 0 4px; word-break:break-all; font-family:'Courier New',monospace; font-size:14px; color:#1a1200;">${escHtml(link)}</div>`;
}

function pagamentoLinkParaParceiroHTML({ orderNumber, clienteNome, link, pagamento }) {
  const label = pagamento === "boleto" ? "boleto" : "link de pagamento";
  return emailShellHTML({
    title: `Pedido ${escHtml(orderNumber)}: ${label} pronto`,
    bodyHTML: paragraphsHTML([
      `O pedido <strong>${escHtml(orderNumber)}</strong> (cliente: <strong>${escHtml(clienteNome)}</strong>) já tem o ${label} pra fechar o pagamento.`,
      `Repasse pro cliente:`,
    ]) + pagamentoValorHTML(link),
    ctaHref: isHttpUrl(link) ? link : undefined,
    ctaLabel: pagamento === "boleto" ? "Ver boleto" : "Pagar agora",
  });
}

function pagamentoLinkParaClienteHTML({ orderNumber, link, pagamento }) {
  const label = pagamento === "boleto" ? "boleto" : "link de pagamento";
  return emailShellHTML({
    title: `Seu pedido ${escHtml(orderNumber)}: ${label} pronto`,
    bodyHTML: paragraphsHTML([
      `Seu pedido <strong>${escHtml(orderNumber)}</strong> já tem o ${label} pra fechar o pagamento.`,
    ]) + pagamentoValorHTML(link),
    ctaHref: isHttpUrl(link) ? link : undefined,
    ctaLabel: pagamento === "boleto" ? "Ver boleto" : "Pagar agora",
  });
}

function pagamentoLinkConsorcioHTML({ grupoNome, link }) {
  return emailShellHTML({
    title: `Sua Compra Programada: pagamento liberado`,
    bodyHTML: paragraphsHTML([
      `Recebemos seus dados e documentos pra contratar o grupo <strong>${escHtml(grupoNome)}</strong>. Segue o link (ou chave PIX) pra fechar o pagamento da primeira parcela:`,
    ]) + pagamentoValorHTML(link),
    ctaHref: isHttpUrl(link) ? link : undefined,
    ctaLabel: "Pagar agora",
  });
}

function adminNovaAdesaoConsorcioHTML(adesao) {
  return simpleEmailHTML("Nova adesão na Compra Programada", [
    `<strong>${escHtml(adesao.nome)}</strong> contratou o grupo <strong>${escHtml(adesao.grupoNome)}</strong> e já anexou os documentos.`,
    `Confira os documentos e lance o link de pagamento (ou chave PIX) pra ela.`,
  ], { ctaHref: "https://marquespromotora.com/admin/compra-programada.html", ctaLabel: "Ver adesão" });
}

/* ======================================================================
   PENDÊNCIA NO PEDIDO (ex: comprovante de endereço ilegível)
   ====================================================================== */
function pendenciaParaParceiroHTML({ orderNumber, clienteNome, texto }) {
  return simpleEmailHTML(`Pedido ${orderNumber}: pendência`, [
    `O pedido <strong>${escHtml(orderNumber)}</strong> (cliente: <strong>${escHtml(clienteNome)}</strong>) está com uma pendência.`,
    `<strong>Pendência:</strong> ${escHtml(texto)}`,
  ], { ctaHref: `${SITE_URL}/parceiros.html`, ctaLabel: "Ver no meu painel" });
}

function pendenciaParaClienteHTML({ orderNumber, texto }) {
  return simpleEmailHTML(`Seu pedido ${orderNumber}: pendência`, [
    `Seu pedido <strong>${escHtml(orderNumber)}</strong> está com uma pendência.`,
    `<strong>Pendência:</strong> ${escHtml(texto)}`,
  ], { ctaHref: `${SITE_URL}/conta/minha-conta.html`, ctaLabel: "Ver meu pedido" });
}

module.exports = {
  sendEmail, verificationEmailHTML, passwordResetEmailHTML, passwordResetLink,
  adminNovoPedidoHTML, adminNovaSolicitacaoCreditoHTML, adminNovaSolicitacaoContaHTML,
  contaAprovadaHTML, contaRecusadaHTML, pedidoStatusHTML, leadStatusHTML,
  adminLoginNotificationHTML,
  pagamentoLinkParaParceiroHTML, pagamentoLinkParaClienteHTML,
  pendenciaParaParceiroHTML, pendenciaParaClienteHTML,
  adminPendenciaRespostaHTML,
  pagamentoLinkConsorcioHTML, adminNovaAdesaoConsorcioHTML,
};
