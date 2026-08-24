/* =====================================================================
   WIDGET DE CONTA: mostra "Entrar" ou o nome do cliente no header
   ---------------------------------------------------------------------
   Usado em index.html e loja.html. Faz uma checagem leve de sessão
   (GET /api/customers/me) e ajusta o link #accountLink de acordo.
   ===================================================================== */
(function () {
  const API_BASE = window.MES_API_BASE || "";

  async function checkSession() {
    const link = document.getElementById("accountLink");
    if (!link) return;
    try {
      const res = await fetch(`${API_BASE}/api/customers/me`, { credentials: "include" });
      const data = await res.json();
      if (data.ok && data.customer) {
        const primeiroNome = String(data.customer.nome || "").trim().split(" ")[0] || "Minha conta";
        link.textContent = primeiroNome;
        link.href = "conta/minha-conta.html";
        link.classList.add("nav-account-link-logged");
      } else {
        link.textContent = "Entrar";
        link.href = "conta/entrar.html";
        link.classList.remove("nav-account-link-logged");
      }
    } catch (e) {
      // Backend indisponível: mantém o link padrão de "Entrar" sem quebrar a página.
    }
  }

  checkSession();
})();
