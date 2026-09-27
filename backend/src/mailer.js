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

function verificationEmailHTML(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1a1200;">Marques</h2>
      <p>Use o código abaixo para confirmar que é você:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background:#f5f5f5; padding: 16px 20px; border-radius: 8px; text-align:center;">${code}</p>
      <p style="color:#666; font-size: 13px;">Esse código expira em 10 minutos. Se você não pediu esse código, pode ignorar este e-mail.</p>
    </div>`;
}

// Wrapper simples reaproveitado por todos os e-mails de notificação abaixo
// (aviso pro admin de evento novo, aviso pro cliente de status) — mesma
// cara do e-mail de verificação, só muda o título e o corpo.
function simpleEmailHTML(title, paragraphs, { ctaHref, ctaLabel } = {}) {
  const body = paragraphs.map((p) => `<p style="color:#333; line-height:1.5;">${p}</p>`).join("");
  const cta = ctaHref
    ? `<p style="margin-top:20px;"><a href="${ctaHref}" style="background:#f7941e; color:#1a1200; font-weight:bold; text-decoration:none; padding:12px 20px; border-radius:8px; display:inline-block;">${ctaLabel || "Acessar"}</a></p>`
    : "";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1a1200;">Marques</h2>
      <h3 style="color:#1a1200;">${title}</h3>
      ${body}
      ${cta}
    </div>`;
}

/* ---------------------- AVISOS PRO ADMIN (evento novo) ---------------------- */
function adminNovoPedidoHTML(order) {
  return simpleEmailHTML("Novo pedido na loja", [
    `Pedido <strong>${order.orderNumber}</strong> de <strong>${order.customer.nome}</strong>.`,
    `Total: <strong>${Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>.`,
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

module.exports = {
  sendEmail, verificationEmailHTML,
  adminNovoPedidoHTML, adminNovaSolicitacaoCreditoHTML, adminNovaSolicitacaoContaHTML,
  contaAprovadaHTML, contaRecusadaHTML, pedidoStatusHTML, leadStatusHTML,
};
