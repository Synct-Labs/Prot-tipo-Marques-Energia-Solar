/* =====================================================================
   PROGRAMA DE PARCEIROS: cadastro, status e painel do parceiro.
   ===================================================================== */
const API_BASE = window.MES_API_BASE || "";
const $ = (id) => document.getElementById(id);
const brl = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

const TIPO_LABEL = { loja: "Loja", credito: "Crédito" };
const STATUS_LABEL = { prevista: "Prevista", liberada: "Liberada", paga: "Paga", cancelada: "Cancelada" };

function siteBase() {
  return location.origin + location.pathname.replace(/[^/]*$/, "");
}

function renderDashboard(partner, rates, summary) {
  const base = siteBase();
  $("linkLoja").value = `${base}loja.html?ref=${partner.codigo}`;
  $("linkCredito").value = `${base}index.html?ref=${partner.codigo}#simulacao-credito`;
  $("partnerCatalogLink").href = `loja.html?ref=${partner.codigo}#catalogo`;
  $("ratesNote").textContent = `Suas comissões: ${String(partner.comissaoLojaPct).replace(".", ",")}% sobre pedidos da loja e ${String(partner.comissaoCreditoPct).replace(".", ",")}% sobre o crédito. Na compra pelo catálogo, você escolhe repassar até 10% como desconto ao cliente — o que sobra vira sua comissão. A comissão é liberada quando o pedido é entregue ou o crédito é convertido, e paga por PIX pela equipe Marques.`;
  $("stPrevista").textContent = brl(summary.totals.prevista);
  $("stLiberada").textContent = brl(summary.totals.liberada);
  $("stPaga").textContent = brl(summary.totals.paga);
  $("stVendas").textContent = summary.counts.loja + summary.counts.credito;
  $("stVendasDet").textContent = `${summary.counts.loja} loja · ${summary.counts.credito} crédito`;
  $("commList").innerHTML = summary.commissions.length
    ? `<div class="partner-table">${summary.commissions.map((c) => `
        <div class="partner-row">
          <div><strong>${esc(TIPO_LABEL[c.tipo] || c.tipo)} · ${esc(c.referencia)}</strong>
            <small>${new Date(c.criadaEm).toLocaleDateString("pt-BR")} · base ${brl(c.baseValor)} × ${String(c.percentual).replace(".", ",")}%${c.observacao ? " · " + esc(c.observacao) : ""}</small></div>
          <div class="partner-row-right">
            <span class="partner-badge is-${c.status}">${STATUS_LABEL[c.status] || c.status}</span>
            <strong>${brl(c.valor)}</strong>
            ${c.temComprovante ? `<a class="btn btn-outline" target="_blank" rel="noopener" href="${API_BASE}/api/partners/me/commissions/${c.id}/comprovante">Comprovante${c.pagoEm ? " (" + c.pagoEm.split("-").reverse().join("/") + ")" : ""}</a>` : ""}
          </div>
        </div>`).join("")}</div>`
    : `<p class="pay-empty-note">Nenhuma venda ainda. Compartilhe seu link para começar.</p>`;
  show("secDashboard");
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  const input = $(b.dataset.copy);
  input.select();
  (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).catch(() => document.execCommand("copy"));
  b.textContent = "Copiado";
  setTimeout(() => (b.textContent = "Copiar"), 1500);
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
    if (!res.ok) throw new Error(res.error || "Não foi possível enviar.");
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
    $("introCta").innerHTML = `<a class="btn btn-primary btn-lg" href="conta/entrar.html?redirect=parceiros.html">Entrar ou criar conta para participar</a>`;
    show("secIntro");
    return;
  }
  const res = await api("GET", "/api/partners/me");
  const partner = res.ok ? res.partner : null;
  if (!partner || partner.status === "recusado") {
    if (partner && partner.motivo) {
      const m = $("applyMotivo");
      m.textContent = `Seu cadastro anterior não foi aprovado: ${partner.motivo}. Você pode enviar de novo.`;
      m.classList.add("show");
    }
    $("introCta").innerHTML = "";
    show("secApply");
    return;
  }
  if (partner.status === "pendente") {
    $("statusTitle").textContent = "Cadastro em análise";
    $("statusText").textContent = "Recebemos seu cadastro de parceiro. Assim que a equipe aprovar, o seu link exclusivo aparece aqui.";
    show("secStatus");
    return;
  }
  if (partner.status === "suspenso") {
    $("statusTitle").textContent = "Cadastro suspenso";
    $("statusText").textContent = `Seu acesso ao programa está suspenso${partner.motivo ? ": " + partner.motivo : ""}. Fale com a equipe Marques para saber mais.`;
    show("secStatus");
    return;
  }
  const summary = await api("GET", "/api/partners/me/summary");
  if (!summary.ok) { $("statusTitle").textContent = "Não foi possível carregar"; $("statusText").textContent = summary.error || ""; show("secStatus"); return; }
  renderDashboard(partner, res.rates, summary);
}

init();
