/* =====================================================================
   PAINEL DE ADMINISTRADOR: helpers compartilhados
   ===================================================================== */
window.MES = (function(){

  // Base da API: "" localmente (mesmo domínio), URL do Render em
  // produção. Definida em ../api-config.js, carregado antes deste arquivo.
  const API_BASE = window.MES_API_BASE || "";

  async function request(method, path, body){
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    let data;
    try { data = await res.json(); }
    catch(e){ data = { ok:false, error: t("Resposta inválida do servidor.") }; }
    return data;
  }

  const apiGet    = (path)       => request("GET", path);
  const apiPost   = (path, body) => request("POST", path, body || {});
  const apiPatch  = (path, body) => request("PATCH", path, body || {});
  const apiDelete = (path)       => request("DELETE", path);

  function formatBRL(value){
    return Number(value).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  }

  function formatDate(iso){
    return new Date(iso).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
  }

  function t(text){
    return window.MES_I18N ? window.MES_I18N.t(text) : text;
  }

  const STATUS_LABELS = {
    novo: t("Novo"),
    confirmado: t("Confirmado"),
    em_preparacao: t("Em preparação"),
    enviado: t("Enviado"),
    entregue: t("Entregue"),
    cancelado: t("Cancelado"),
  };
  const STATUS_ORDER = ["novo","confirmado","em_preparacao","enviado","entregue","cancelado"];

  function statusBadge(status){
    const label = STATUS_LABELS[status] || status;
    return `<span class="status-badge status-${status}">${label}</span>`;
  }

  function statusSelectHTML(currentStatus, orderId){
    const opts = STATUS_ORDER.map(s =>
      `<option value="${s}" ${s === currentStatus ? "selected" : ""}>${STATUS_LABELS[s]}</option>`
    ).join("");
    return `<select class="admin-status-select" data-order-id="${orderId}">${opts}</select>`;
  }

  /* ---- status das solicitações de análise de crédito ---- */
  const LEAD_STATUS_LABELS = {
    novo: t("Novo"),
    em_analise: t("Em análise"),
    aprovado: t("Aprovado"),
    digitado: t("Digitado"),
    pendenciado: t("Pendenciado"),
    pago: t("Pago"),
    recusado: t("Recusado"),
  };
  const LEAD_STATUS_ORDER = ["novo","em_analise","aprovado","digitado","pendenciado","pago","recusado"];

  function leadStatusBadge(status){
    const label = LEAD_STATUS_LABELS[status] || status;
    return `<span class="status-badge status-${status}">${label}</span>`;
  }

  function leadStatusSelectHTML(currentStatus, leadId){
    const opts = LEAD_STATUS_ORDER.map(s =>
      `<option value="${s}" ${s === currentStatus ? "selected" : ""}>${LEAD_STATUS_LABELS[s]}</option>`
    ).join("");
    return `<select class="admin-status-select" data-lead-id="${leadId}">${opts}</select>`;
  }

  /* ---- status: contratos de empréstimo ---- */
  const LOAN_CONTRACT_STATUS_LABELS = { ativo: t("Ativo"), quitado: t("Quitado"), cancelado: t("Cancelado") };
  const LOAN_CONTRACT_STATUS_ORDER = ["ativo", "quitado", "cancelado"];
  const LOAN_INSTALLMENT_STATUS_LABELS = { pendente: t("Pendente"), pago: t("Pago") };

  /* ---- status: contratos de participação nos lucros ---- */
  const PROFIT_SHARE_STATUS_LABELS = { ativo: t("Ativo"), encerrado: t("Encerrado") };
  const PROFIT_SHARE_STATUS_ORDER = ["ativo", "encerrado"];

  /* ---- status das ordens de serviço de instalação ---- */
  const OS_STATUS_LABELS = {
    nova: t("Nova"),
    agendada: t("Agendada"),
    em_andamento: t("Em andamento"),
    pendente: t("Pendente"),
    concluida: t("Concluída"),
    cancelada: t("Cancelada"),
  };
  const OS_STATUS_ORDER = ["nova","agendada","em_andamento","pendente","concluida","cancelada"];
  function osStatusBadge(status){
    return `<span class="status-badge status-${status}">${OS_STATUS_LABELS[status] || status}</span>`;
  }

  function showToast(msg){
    let toast = document.querySelector(".admin-toast");
    if(!toast){
      toast = document.createElement("div");
      toast.className = "admin-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  /* ---- empresa/cargo: rótulos e visibilidade de menu ---- */
  const COMPANY_LABELS = {
    energia_solar: "Marques Energia Solar",
    promotora: "Marques Promotora",
    ambas: t("Marques (ambas as empresas)"),
    instalacao: t("Equipe de instalação"),
  };
  const ROLE_LABELS = { owner: t("Dono"), funcionario: t("Funcionário") };

  function hasCompanyAccess(admin, company){
    return admin.company === "ambas" || admin.company === company;
  }

  // Página de destino padrão pra cada perfil (evita cair numa tela sem acesso).
  function landingPageFor(admin){
    if(admin.company === "instalacao") return "os.html";
    if(admin.company === "promotora") return "credit-leads.html";
    return "dashboard.html";
  }

  // Mostra/esconde os links do menu de acordo com a empresa e o cargo do
  // funcionário logado, e preenche o rótulo com nome + empresa + cargo.
  function applyCompanyNav(admin){
    // Link das Ordens de Serviço: injetado aqui (em vez de editar o menu de
    // cada página). Aparece pra técnico, Energia Solar e dono; não pra Promotora.
    const navEl = document.querySelector(".admin-nav");
    let osLink = document.querySelector('.admin-nav-link[href="os.html"]');
    if(navEl && !osLink){
      osLink = document.createElement("a");
      osLink.href = "os.html";
      osLink.className = "admin-nav-link";
      osLink.textContent = t("Ordens de Serviço");
      const after = document.querySelector('.admin-nav-link[href="dashboard.html"]');
      if(after && after.nextSibling) navEl.insertBefore(osLink, after.nextSibling); else navEl.appendChild(osLink);
    }
    if(osLink) osLink.style.display = (admin.company === "promotora") ? "none" : "";
    // Técnico de instalação: só enxerga as OS (o resto do menu some).
    if(admin.company === "instalacao"){
      document.querySelectorAll(".admin-nav-link").forEach(a => {
        if(a.getAttribute("href") !== "os.html") a.style.display = "none";
      });
      const label = document.getElementById("adminUserLabel");
      if(label) label.textContent = `${admin.name || admin.email} · ${COMPANY_LABELS.instalacao}`;
      return;
    }
    const ordersLink = document.querySelector('.admin-nav-link[href="dashboard.html"]');
    const leadsLink  = document.querySelector('.admin-nav-link[href="credit-leads.html"]');
    const payLink    = document.querySelector('.admin-nav-link[href="marques-pay.html"]');
    const catalogLink = document.querySelector('.admin-nav-link[href="catalogo.html"]');
    const staffLink  = document.querySelector('.admin-nav-link[href="equipe.html"]');
    if(ordersLink) ordersLink.style.display = hasCompanyAccess(admin, "energia_solar") ? "" : "none";
    if(leadsLink)  leadsLink.style.display  = hasCompanyAccess(admin, "promotora") ? "" : "none";
    if(payLink)    payLink.style.display    = hasCompanyAccess(admin, "promotora") ? "" : "none";
    if(catalogLink) catalogLink.style.display = hasCompanyAccess(admin, "energia_solar") ? "" : "none";
    if(staffLink)  staffLink.style.display  = admin.role === "owner" ? "" : "none";
    const partnersLink = document.querySelector('.admin-nav-link[href="parceiros.html"]');
    if(partnersLink) partnersLink.style.display = admin.role === "owner" ? "" : "none";
    const foldersLink = document.querySelector('.admin-nav-link[href="pastas.html"]');
    if(foldersLink) foldersLink.style.display = admin.role === "owner" ? "" : "none";

    const label = document.getElementById("adminUserLabel");
    if(label){
      const nome = admin.name || admin.email;
      label.textContent = `${nome} · ${COMPANY_LABELS[admin.company] || admin.company} · ${ROLE_LABELS[admin.role] || admin.role}`;
    }
  }

  /* Protege páginas que exigem login. Redireciona para login.html se não
     houver sessão válida. Se "requiredCompany" for informado e o
     funcionário não tiver acesso a essa empresa, redireciona pra área que
     ele pode ver. Retorna os dados do admin logado. */
  async function requireAuth(requiredCompany){
    const me = await apiGet("/api/auth/me");
    if(!me.ok){
      window.location.href = "login.html";
      return null;
    }
    const admin = me.admin;
    applyCompanyNav(admin);
    if(requiredCompany && !hasCompanyAccess(admin, requiredCompany)){
      window.location.href = landingPageFor(admin);
      return null;
    }
    return admin;
  }

  async function logout(){
    await apiPost("/api/auth/logout");
    window.location.href = "login.html";
  }

  return {
    apiGet, apiPost, apiPatch, apiDelete,
    formatBRL, formatDate,
    STATUS_LABELS, STATUS_ORDER,
    statusBadge, statusSelectHTML,
    LEAD_STATUS_LABELS, LEAD_STATUS_ORDER,
    leadStatusBadge, leadStatusSelectHTML,
    OS_STATUS_LABELS, OS_STATUS_ORDER, osStatusBadge,
    LOAN_CONTRACT_STATUS_LABELS, LOAN_CONTRACT_STATUS_ORDER, LOAN_INSTALLMENT_STATUS_LABELS,
    PROFIT_SHARE_STATUS_LABELS, PROFIT_SHARE_STATUS_ORDER,
    COMPANY_LABELS, ROLE_LABELS, hasCompanyAccess, landingPageFor, applyCompanyNav,
    showToast, requireAuth, logout,
  };
})();
