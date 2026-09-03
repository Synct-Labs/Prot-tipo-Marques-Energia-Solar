/* =====================================================================
   WIDGET DE CONTA: mostra "Entrar" ou o nome do cliente no header, e
   expõe um helper (MES_ACCOUNT) pra outras páginas exigirem login antes
   de comprar ou solicitar uma simulação de crédito.
   Usado em index.html e loja.html.
   ===================================================================== */
window.MES_ACCOUNT = (function () {
  const API_BASE = window.MES_API_BASE || "";
  let cached = null; // undefined = ainda não checou; null/false = deslogado; objeto = cliente

  async function fetchCustomer() {
    try {
      const res = await fetch(`${API_BASE}/api/customers/me`, { credentials: "include" });
      const data = await res.json();
      cached = data.ok && data.customer ? data.customer : false;
    } catch (e) {
      // Backend indisponível: trata como deslogado, mas não quebra a página.
      cached = false;
    }
    return cached;
  }

  async function getCustomer() {
    if (cached === null) await fetchCustomer();
    return cached || null;
  }

  // Redireciona pra tela de login se não houver sessão, levando o caminho
  // atual em ?redirect= pra voltar exatamente pra cá depois de entrar.
  // Retorna o cliente logado, ou null (e já disparou o redirect).
  async function requireLogin(redirectTarget) {
    const customer = await getCustomer();
    if (customer) return customer;
    const target = redirectTarget || (location.pathname.split("/").pop() + location.hash);
    location.href = "conta/entrar.html?redirect=" + encodeURIComponent(target);
    return null;
  }

  function updateHeaderLink(customer) {
    const link = document.getElementById("accountLink");
    if (!link) return;
    if (customer) {
      const primeiroNome = String(customer.nome || "").trim().split(" ")[0] || "Minha conta";
      link.textContent = primeiroNome;
      link.href = "conta/minha-conta.html";
      link.classList.add("nav-account-link-logged");
    } else {
      link.textContent = "Entrar";
      link.href = "conta/entrar.html";
      link.classList.remove("nav-account-link-logged");
    }
  }

  getCustomer().then(updateHeaderLink);

  return { getCustomer, requireLogin };
})();
