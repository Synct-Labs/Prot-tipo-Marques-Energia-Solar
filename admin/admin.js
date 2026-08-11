/* =====================================================================
   PAINEL DE ADMINISTRADOR — helpers compartilhados
   ===================================================================== */
window.MES = (function(){

  async function request(method, path, body){
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
    let data;
    try { data = await res.json(); }
    catch(e){ data = { ok:false, error:"Resposta inválida do servidor." }; }
    return data;
  }

  const apiGet   = (path)       => request("GET", path);
  const apiPost  = (path, body) => request("POST", path, body || {});
  const apiPatch = (path, body) => request("PATCH", path, body || {});

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

  /* Protege páginas que exigem login. Redireciona para login.html se não
     houver sessão válida. Retorna os dados do admin logado. */
  async function requireAuth(){
    const me = await apiGet("/api/auth/me");
    if(!me.ok){
      window.location.href = "login.html";
      return null;
    }
    return me.admin;
  }

  async function logout(){
    await apiPost("/api/auth/logout");
    window.location.href = "login.html";
  }

  return {
    apiGet, apiPost, apiPatch,
    formatBRL, formatDate,
    STATUS_LABELS, STATUS_ORDER,
    statusBadge, statusSelectHTML,
    showToast, requireAuth, logout,
  };
})();
