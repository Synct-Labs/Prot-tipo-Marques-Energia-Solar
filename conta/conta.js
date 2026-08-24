/* =====================================================================
   CONTA DO CLIENTE: helpers compartilhados
   ---------------------------------------------------------------------
   Mesma lógica do admin/admin.js (fetch com cookie de sessão), só que
   apontando para as rotas /api/customers/* e usando o cookie separado
   de cliente (mes_customer_session).
   ===================================================================== */
window.CONTA = (function () {
  const API_BASE = window.MES_API_BASE || "";

  async function request(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { ok: false, error: "Resposta inválida do servidor." };
    }
    return data;
  }

  const apiGet = (path) => request("GET", path);
  const apiPost = (path, body) => request("POST", path, body || {});
  const apiPatch = (path, body) => request("PATCH", path, body || {});

  function formatBRL(value) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  const ORDER_STATUS_LABELS = {
    novo: "Novo",
    confirmado: "Confirmado",
    em_preparacao: "Em preparação",
    enviado: "Enviado",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };

  const LEAD_STATUS_LABELS = {
    novo: "Novo",
    em_analise: "Em análise",
    contatado: "Contatado",
    proposta_enviada: "Proposta enviada",
    convertido: "Convertido",
    recusado: "Recusado",
  };

  /* Protege páginas que exigem login. Redireciona para entrar.html se não
     houver sessão válida. Retorna os dados do cliente logado. */
  async function requireAuth() {
    const me = await apiGet("/api/customers/me");
    if (!me.ok) {
      window.location.href = "entrar.html";
      return null;
    }
    return me.customer;
  }

  async function logout() {
    await apiPost("/api/customers/logout");
    window.location.href = "entrar.html";
  }

  return {
    apiGet,
    apiPost,
    apiPatch,
    formatBRL,
    formatDate,
    ORDER_STATUS_LABELS,
    LEAD_STATUS_LABELS,
    requireAuth,
    logout,
  };
})();

/* ---------------------- MENU MOBILE (hamburger) ---------------------- */
(function () {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mainNav");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => nav.classList.toggle("open"));
})();

