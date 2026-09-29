/* =====================================================================
   PROGRAMA DE PARCEIROS: cadastro, status e painel do parceiro.
   ===================================================================== */
const API_BASE = window.MES_API_BASE || "";
const $ = (id) => document.getElementById(id);
const brl = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const t = (text) => (window.MES_I18N ? window.MES_I18N.t(text) : text);

/* ---------------------- MENU MOBILE ---------------------- */
document.getElementById("hamburgerBtn")?.addEventListener("click", () => {
  document.getElementById("mainNav")?.classList.toggle("open");
});
document.getElementById("mainNav")?.addEventListener("click", (e) => {
  if (e.target.closest("a")) document.getElementById("mainNav").classList.remove("open");
});

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method, credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function show(id) {
  ["secIntro", "secApply", "secStatus", "secDashboard"].forEach((s) => ($(s).hidden = s !== id && !(id === "secApply" && s === "secIntro")));
}

const TIPO_LABEL = { loja: t("Loja"), credito: t("Crédito"), consorcio: t("Compra Programada") };
const STATUS_LABEL = { prevista: t("Prevista"), liberada: t("Liberada"), paga: t("Paga"), cancelada: t("Cancelada") };

/* ---------------------- ACOMPANHAR PEDIDOS/SOLICITAÇÕES (passo a passo) ----------------------
   Mesmo padrão de "stepper" já usado no Minha Conta do cliente (ver
   conta/minha-conta.html) — o parceiro acompanha o status de cada venda
   indicada ou assistida, não só o status da comissão. */
const ORDER_STATUS_LABELS = {
  novo: t("Novo"), confirmado: t("Confirmado"), em_preparacao: t("Em preparação"),
  enviado: t("Enviado"), entregue: t("Entregue"), cancelado: t("Cancelado"),
};
const LEAD_STATUS_LABELS = {
  novo: t("Novo"), em_analise: t("Em análise"), contatado: t("Contatado"),
  proposta_enviada: t("Proposta enviada"), convertido: t("Convertido"), recusado: t("Recusado"),
};
const ORDER_STEPS = ["novo", "confirmado", "em_preparacao", "enviado", "entregue"];
const LEAD_STEPS = ["novo", "em_analise", "contatado", "proposta_enviada", "convertido"];

function statusTone(status) {
  if (status === "cancelado" || status === "recusado") return "danger";
  if (status === "entregue" || status === "convertido") return "success";
  if (status === "novo") return "neutral";
  return "progress";
}

function stepperHTML(steps, labels, status) {
  if (status === "cancelado" || status === "recusado") return "";
  const idx = steps.indexOf(status);
  if (idx === -1) return "";
  return `<div class="order-stepper">${steps.map((s, i) => `
    <span class="order-step ${i <= idx ? "done" : ""} ${i === idx ? "current" : ""}">
      <span class="order-step-dot"></span>
      <span class="order-step-label">${labels[s] || s}</span>
    </span>${i < steps.length - 1 ? `<span class="order-step-line ${i < idx ? "done" : ""}"></span>` : ""}`).join("")}</div>`;
}

function pendenciaBlockHTML(order) {
  if (!order.pendencia) return "";
  const p = order.pendencia;
  const alertHTML = `<div class="order-card-alert">${t("Pendência:")} ${esc(p.texto)}</div>`;
  if (p.resposta) {
    const quando = new Date(p.resposta.criadaEm).toLocaleDateString("pt-BR");
    return alertHTML + `<div class="order-card-note">${t("Você já respondeu em")} ${quando}${p.resposta.texto ? ": " + esc(p.resposta.texto) : ""}${t(". Aguarde a análise.")}</div>`;
  }
  return alertHTML + `
    <form class="pendencia-resposta-form" data-order-id="${order.id}" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
      <label style="font-size:.82rem;">${t("Anexar documento corrigido")}
        <input type="file" name="arquivo" accept="image/jpeg,image/png,application/pdf" required>
      </label>
      <label style="font-size:.82rem;">${t("Observação (opcional)")}
        <textarea name="texto" rows="2" placeholder="${t("Se precisar explicar algo...")}"></textarea>
      </label>
      <button type="submit" class="btn btn-outline" style="width:auto; align-self:flex-start;">${t("Responder pendência")}</button>
      <small class="pendencia-resposta-error" style="color:var(--danger); display:none;"></small>
    </form>`;
}

function partnerOrderItemHTML(order) {
  const label = ORDER_STATUS_LABELS[order.status] || order.status;
  const pendenciaHTML = pendenciaBlockHTML(order);
  const linkHTML = order.paymentLink
    ? `<div class="order-card-note">${t("Link de pagamento enviado:")} <span style="word-break:break-all;">${esc(order.paymentLink)}</span></div>`
    : "";
  return `
    <div class="order-card">
      <div class="order-card-head">
        <div class="order-card-icon"><svg class="icon" viewBox="0 0 24 24"><path d="M20.5 7.3 12 3 3.5 7.3v9.4L12 21l8.5-4.3z"/><path d="m3.5 7.3 8.5 4.3 8.5-4.3"/><line x1="12" y1="11.6" x2="12" y2="21"/></svg></div>
        <div class="order-card-head-info">
          <span class="item-number">${esc(order.orderNumber)} · ${esc(order.customer.nome)}</span>
          <span class="item-date">${new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
        </div>
        <span class="account-status-badge status-${statusTone(order.status)}">${label}</span>
      </div>
      ${stepperHTML(ORDER_STEPS, ORDER_STATUS_LABELS, order.status)}
      ${pendenciaHTML}
      ${linkHTML}
      <div class="order-card-foot">
        <span class="item-detail">${order.itens.length} ${order.itens.length === 1 ? t("item") : t("itens")}</span>
        <strong class="order-card-total">${brl(order.total)}</strong>
      </div>
    </div>`;
}

function partnerLeadItemHTML(lead) {
  const label = LEAD_STATUS_LABELS[lead.status] || lead.status;
  const modalidade = TIPO_LABEL[lead.modalidadeInteresse] || lead.modalidadeInteresse || t("Não informada");
  return `
    <div class="order-card">
      <div class="order-card-head">
        <div class="order-card-icon"><svg class="icon" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>
        <div class="order-card-head-info">
          <span class="item-number">${esc(lead.leadNumber)} · ${esc(lead.dadosBasicos.nome)}</span>
          <span class="item-date">${new Date(lead.createdAt).toLocaleDateString("pt-BR")}</span>
        </div>
        <span class="account-status-badge status-${statusTone(lead.status)}">${label}</span>
      </div>
      ${stepperHTML(LEAD_STEPS, LEAD_STATUS_LABELS, lead.status)}
      <div class="order-card-foot">
        <span class="item-detail">${t("Modalidade:")} ${esc(modalidade)}</span>
      </div>
    </div>`;
}

async function loadPartnerOrders() {
  const box = $("partnerOrdersList");
  if (!box) return;
  const res = await api("GET", "/api/partners/me/orders");
  if (!res.ok) { box.innerHTML = `<p class="pay-empty-note">${esc(res.error || t("Erro ao carregar pedidos."))}</p>`; return; }
  box.innerHTML = res.orders.length
    ? res.orders.map(partnerOrderItemHTML).join("")
    : `<p class="pay-empty-note">${t("Nenhum pedido indicado ainda.")}</p>`;
}

function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById("partnerOrdersList")?.addEventListener("submit", async (e) => {
  const form = e.target.closest(".pendencia-resposta-form");
  if (!form) return;
  e.preventDefault();
  const errorBox = form.querySelector(".pendencia-resposta-error");
  errorBox.style.display = "none";

  const file = form.querySelector('[name="arquivo"]').files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    errorBox.textContent = t("Arquivo maior que 5MB.");
    errorBox.style.display = "block";
    return;
  }

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = t("Enviando...");
  try {
    const res = await api("POST", `/api/partners/me/orders/${form.dataset.orderId}/pendencia-resposta`, {
      arquivoBase64: await fileToBase64(file),
      arquivoTipo: file.type,
      arquivoNome: file.name,
      texto: form.querySelector('[name="texto"]').value.trim(),
    });
    if (!res.ok) {
      errorBox.textContent = res.error || t("Não foi possível enviar a resposta.");
      errorBox.style.display = "block";
      return;
    }
    loadPartnerOrders();
  } finally {
    btn.disabled = false; btn.textContent = t("Responder pendência");
  }
});

async function loadPartnerLeads() {
  const box = $("partnerLeadsList");
  if (!box) return;
  const res = await api("GET", "/api/partners/me/leads");
  if (!res.ok) { box.innerHTML = `<p class="pay-empty-note">${esc(res.error || t("Erro ao carregar solicitações."))}</p>`; return; }
  box.innerHTML = res.leads.length
    ? res.leads.map(partnerLeadItemHTML).join("")
    : `<p class="pay-empty-note">${t("Nenhuma solicitação de crédito indicada ainda.")}</p>`;
}

function siteBase() {
  return location.origin + location.pathname.replace(/[^/]*$/, "");
}

function renderDashboard(partner, rates, summary) {
  const base = siteBase();
  $("linkLoja").value = `${base}loja.html?ref=${partner.codigo}`;
  $("linkCredito").value = `${base}index.html?ref=${partner.codigo}#simulacao-credito`;
  $("partnerCatalogLink").href = `loja.html?ref=${partner.codigo}#catalogo`;
  $("ratesNote").textContent = `${t("Suas comissões:")} ${String(partner.comissaoLojaPct).replace(".", ",")}${t("% sobre pedidos da loja,")} ${String(partner.comissaoCreditoPct).replace(".", ",")}${t("% sobre o crédito e")} ${String(partner.comissaoConsorcioPct).replace(".", ",")}${t("% sobre a Compra Programada. Na compra pelo catálogo, você escolhe repassar até 10% como desconto ao cliente — o que sobra vira sua comissão. A comissão é liberada quando o pedido é entregue ou o crédito é convertido, e paga por PIX pela equipe Marques.")}`;
  $("stPrevista").textContent = brl(summary.totals.prevista);
  $("stLiberada").textContent = brl(summary.totals.liberada);
  $("stPaga").textContent = brl(summary.totals.paga);
  $("stVendas").textContent = summary.counts.loja + summary.counts.credito;
  $("stVendasDet").textContent = `${summary.counts.loja} ${t("loja")} · ${summary.counts.credito} ${t("crédito")}`;
  $("commList").innerHTML = summary.commissions.length
    ? `<div class="partner-table">${summary.commissions.map((c) => `
        <div class="partner-row">
          <div><strong>${esc(TIPO_LABEL[c.tipo] || c.tipo)} · ${esc(c.referencia)}</strong>
            <small>${new Date(c.criadaEm).toLocaleDateString("pt-BR")} · base ${brl(c.baseValor)} × ${String(c.percentual).replace(".", ",")}%${c.observacao ? " · " + esc(c.observacao) : ""}</small></div>
          <div class="partner-row-right">
            <span class="partner-badge is-${c.status}">${STATUS_LABEL[c.status] || c.status}</span>
            <strong>${brl(c.valor)}</strong>
            ${c.temComprovante ? `<a class="btn btn-outline" target="_blank" rel="noopener" href="${API_BASE}/api/partners/me/commissions/${c.id}/comprovante">${t("Comprovante")}${c.pagoEm ? " (" + c.pagoEm.split("-").reverse().join("/") + ")" : ""}</a>` : ""}
          </div>
        </div>`).join("")}</div>`
    : `<p class="pay-empty-note">${t("Nenhuma venda ainda. Compartilhe seu link para começar.")}</p>`;
  show("secDashboard");
}

/* ---------------------- COMPRA PROGRAMADA (lançar venda pro cliente) ---------------------- */
function consorcioGrupoRowHTML(g) {
  const semVaga = g.vagasRestantes <= 0;
  return `
    <div class="partner-row" data-grupo-row="${g.id}" style="flex-direction:column; align-items:stretch; gap:10px;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div><strong>${esc(g.nome)}</strong>
          <small>${brl(g.valorCota)}/${t("cota")} · ${g.prazoMeses}x · ${semVaga ? t("sem vagas") : g.vagasRestantes + " " + t("vaga(s)")}</small></div>
        <button type="button" class="btn btn-outline" data-lancar-toggle="${g.id}" ${semVaga ? "disabled" : ""}>${semVaga ? t("Sem vagas") : t("Lançar venda")}</button>
      </div>
      <form data-lancar-form="${g.id}" hidden class="partner-lancar-form">
        <label style="flex:1; min-width:160px;">${t("Nome do cliente")}<input type="text" name="nome" required></label>
        <label style="flex:1; min-width:140px;">${t("Telefone")}<input type="tel" name="telefone"></label>
        <label style="flex:1; min-width:180px;">${t("E-mail")}<input type="email" name="email"></label>
        <button type="submit" class="btn btn-primary" style="width:auto;">${t("Confirmar lançamento")}</button>
        <small data-lancar-feedback style="flex-basis:100%; display:none;"></small>
      </form>
    </div>`;
}

async function loadConsorcioPartnerGrupos() {
  const box = $("consorcioPartnerGruposList");
  if (!box) return;
  const res = await api("GET", "/api/partners/me/consorcio-grupos");
  if (!res.ok) { box.innerHTML = `<p class="pay-empty-note">${esc(res.error || t("Erro ao carregar grupos."))}</p>`; return; }
  box.innerHTML = res.grupos.length
    ? `<div class="partner-table">${res.grupos.map(consorcioGrupoRowHTML).join("")}</div>`
    : `<p class="pay-empty-note">${t("Nenhum grupo liberado pra você no momento.")}</p>`;
}

document.addEventListener("click", (e) => {
  const toggle = e.target.closest("[data-lancar-toggle]");
  if (!toggle) return;
  const form = document.querySelector(`[data-lancar-form="${toggle.dataset.lancarToggle}"]`);
  if (form) form.hidden = !form.hidden;
});

document.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-lancar-form]");
  if (!form) return;
  e.preventDefault();
  const feedback = form.querySelector("[data-lancar-feedback]");
  const grupoId = form.dataset.lancarForm;
  const fd = new FormData(form);
  const res = await api("POST", "/api/partners/me/consorcio-adesoes", {
    grupoId: Number(grupoId), nome: fd.get("nome"), telefone: fd.get("telefone"), email: fd.get("email"),
  });
  if (!res.ok) {
    feedback.textContent = res.error || t("Não foi possível lançar a venda.");
    feedback.style.color = "var(--danger, #e05a5a)";
    feedback.style.display = "block";
    return;
  }
  feedback.textContent = t("Venda lançada! Assim que o cliente confirmar no site, sua comissão prevista aparece aqui.");
  feedback.style.color = "var(--success)";
  feedback.style.display = "block";
  form.reset();
  setTimeout(loadConsorcioPartnerGrupos, 1800);
});

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  const input = $(b.dataset.copy);
  input.select();
  (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).catch(() => document.execCommand("copy"));
  b.textContent = t("Copiado");
  setTimeout(() => (b.textContent = t("Copiar")), 1500);
});

$("applyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("applyError");
  err.classList.remove("show");
  const btn = $("applyBtn");
  btn.disabled = true;
  try {
    const res = await api("POST", "/api/partners/me", {
      pixTipo: e.target.pixTipo.value, pixChave: e.target.pixChave.value, aceiteTermos: $("aceiteTermos").checked,
    });
    if (!res.ok) throw new Error(res.error || t("Não foi possível enviar."));
    await init();
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.add("show");
  } finally {
    btn.disabled = false;
  }
});

async function init() {
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.getCustomer() : null;
  if (!customer) {
    $("introCta").innerHTML = `<a class="btn btn-primary btn-lg" href="conta/entrar.html?redirect=parceiros.html">${t("Entrar ou criar conta para participar")}</a>`;
    show("secIntro");
    return;
  }
  const res = await api("GET", "/api/partners/me");
  const partner = res.ok ? res.partner : null;
  if (!partner || partner.status === "recusado") {
    if (partner && partner.motivo) {
      const m = $("applyMotivo");
      m.textContent = `${t("Seu cadastro anterior não foi aprovado:")} ${partner.motivo}${t(". Você pode enviar de novo.")}`;
      m.classList.add("show");
    }
    $("introCta").innerHTML = "";
    show("secApply");
    return;
  }
  if (partner.status === "pendente") {
    $("statusTitle").textContent = t("Cadastro em análise");
    $("statusText").textContent = t("Recebemos seu cadastro de parceiro. Assim que a equipe aprovar, o seu link exclusivo aparece aqui.");
    show("secStatus");
    return;
  }
  if (partner.status === "suspenso") {
    $("statusTitle").textContent = t("Cadastro suspenso");
    $("statusText").textContent = `${t("Seu acesso ao programa está suspenso")}${partner.motivo ? ": " + partner.motivo : ""}${t(". Fale com a equipe Marques para saber mais.")}`;
    show("secStatus");
    return;
  }
  const summary = await api("GET", "/api/partners/me/summary");
  if (!summary.ok) { $("statusTitle").textContent = t("Não foi possível carregar"); $("statusText").textContent = summary.error || ""; show("secStatus"); return; }
  renderDashboard(partner, res.rates, summary);
  loadConsorcioPartnerGrupos();
  loadPartnerOrders();
  loadPartnerLeads();
}

init();
