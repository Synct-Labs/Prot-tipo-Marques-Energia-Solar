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
    catch(e){ data = { ok:false, error:"Resposta inválida do servidor." }; }
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

  const STATUS_LABELS = {
    novo: "Novo",
    confirmado: "Confirmado",
    em_preparacao: "Em preparação",
    enviado: "Enviado",
    entregue: "Entregue",
    cancelado: "Cancelado",
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
    novo: "Novo",
    em_analise: "Em análise",
    contatado: "Contatado",
    proposta_enviada: "Proposta enviada",
    convertido: "Convertido",
    recusado: "Recusado",
  };
  const LEAD_STATUS_ORDER = ["novo","em_analise","contatado","proposta_enviada","convertido","recusado"];

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
    ambas: "Marques (ambas as empresas)",
  };
  const ROLE_LABELS = { owner: "Dono", funcionario: "Funcionário" };

  function hasCompanyAccess(admin, company){
    return admin.company === "ambas" || admin.company === company;
  }

  // Página de destino padrão pra cada perfil (evita cair numa tela sem acesso).
  function landingPageFor(admin){
    if(admin.company === "promotora") return "credit-leads.html";
    return "dashboard.html";
  }

  // Mostra/esconde os links do menu de acordo com a empresa e o cargo do
  // funcionário logado, e preenche o rótulo com nome + empresa + cargo.
  function applyCompanyNav(admin){
    const ordersLink = document.querySelector('.admin-nav-link[href="dashboard.html"]');
    const leadsLink  = document.querySelector('.admin-nav-link[href="credit-leads.html"]');
    const staffLink  = document.querySelector('.admin-nav-link[href="equipe.html"]');
    if(ordersLink) ordersLink.style.display = hasCompanyAccess(admin, "energia_solar") ? "" : "none";
    if(leadsLink)  leadsLink.style.display  = hasCompanyAccess(admin, "promotora") ? "" : "none";
    if(staffLink)  staffLink.style.display  = admin.role === "owner" ? "" : "none";

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
    COMPANY_LABELS, ROLE_LABELS, hasCompanyAccess, landingPageFor, applyCompanyNav,
    showToast, requireAuth, logout,
  };
})();
