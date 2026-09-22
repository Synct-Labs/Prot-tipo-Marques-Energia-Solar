/* =====================================================================
   MARQUES PAY — PAINEL
   ---------------------------------------------------------------------
   Só dados reais, ligados à conta do cliente logado: boletos de
   empréstimo, participação nos lucros e perfil. Saldo, Pix, cartão e
   extrato não existem aqui: dependem de instituição financeira autorizada
   pelo Banco Central e só entram quando houver esse parceiro.
   ===================================================================== */
function goToPayPanel(panel) {
  document.querySelectorAll(".pay-panel").forEach(el => el.classList.remove("active"));
  const target = document.querySelector(`.pay-panel[data-panel="${panel}"]`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".pay-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.goto === panel);
  });

  document.querySelector(".pay-main").scrollTo({ top: 0, behavior: "auto" });
  window.scrollTo({ top: 0, behavior: "auto" });
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-goto]");
  if (!trigger) return;
  e.preventDefault();
  goToPayPanel(trigger.dataset.goto);
});

/* ======================================================================
   EMPRÉSTIMOS E PARTICIPAÇÃO NOS LUCROS (dados reais)
   ====================================================================== */
const API_BASE = window.MES_API_BASE || "";

function formatBRL(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDateBR(isoDate) {
  return isoDate ? isoDate.split("-").reverse().join("/") : "";
}

const ICON_LOAN = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`;
const ICON_PS = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>`;
const ICON_PAID = `<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;

function installmentRowHTML(inst, { showBadge }) {
  const pago = inst.status === "pago";
  const sub = pago
    ? `Parcela ${inst.numero}/${inst.contractTotalParcelas} · Pago em ${formatDateBR(inst.pagoEm)}`
    : `Parcela ${inst.numero}/${inst.contractTotalParcelas} · Vencimento: ${formatDateBR(inst.vencimento)}`;
  const badge = showBadge
    ? `<span class="account-status-badge ${pago ? "status-success" : ""}">${pago ? "Pago" : "Pendente"}</span>`
    : "";
  return `
    <div class="pay-boleto-row">
      <span class="pay-boleto-icon" style="background:${pago ? "rgba(52,211,153,0.15)" : "rgba(247,148,30,0.15)"}; color:${pago ? "var(--success)" : "var(--orange)"};">${pago ? ICON_PAID : ICON_LOAN}</span>
      <div class="pay-boleto-body"><strong>${inst.contractTitulo}</strong><span>${sub}</span></div>
      ${badge}
      <span class="pay-boleto-value">${formatBRL(inst.valor)}</span>
    </div>`;
}

const LOAN_STATUS_BADGE = { ativo: "status-success", quitado: "status-neutral", cancelado: "status-danger" };
const LOAN_STATUS_LABEL = { ativo: "Ativo", quitado: "Quitado", cancelado: "Cancelado" };

// Cada empréstimo vira um bloco recolhível, igual à Participação nos
// Lucros: as parcelas ficam presas ao próprio contrato, escondidas até a
// pessoa clicar em cima dele. Só abre sozinho quando é o único ativo.
function loanContractBlockHTML(contract, contractInstallments, autoExpand) {
  const pendentes = contractInstallments.filter(i => i.status === "pendente").sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const pagas = contractInstallments.filter(i => i.status === "pago").sort((a, b) => (b.pagoEm || "").localeCompare(a.pagoEm || ""));
  const ordenadas = [...pendentes, ...pagas];

  return `
    <div class="ps-contract-block is-${contract.status}">
      <button type="button" class="ps-contract-toggle" data-toggle-contract aria-expanded="${autoExpand ? "true" : "false"}">
        <span class="ps-contract-toggle-main">
          <strong>${contract.titulo}</strong>
          <span class="account-status-badge ${LOAN_STATUS_BADGE[contract.status] || ""}">${LOAN_STATUS_LABEL[contract.status] || contract.status}</span>
        </span>
        <span class="ps-contract-toggle-sub">${formatBRL(contract.valorParcela)} · ${contract.totalParcelas}x${pendentes.length ? ` · ${pendentes.length} pendente${pendentes.length > 1 ? "s" : ""}` : ""}</span>
        <svg class="icon ps-contract-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="ps-contract-body"${autoExpand ? "" : " hidden"}>
        <div class="pay-boletos-list">
          ${ordenadas.length ? ordenadas.map(i => installmentRowHTML(i, { showBadge: true })).join("") : `<p class="pay-empty-note">Nenhuma parcela cadastrada ainda.</p>`}
        </div>
      </div>
    </div>`;
}

function renderMeusBoletos(contracts, installments) {
  const container = document.getElementById("loanContractsList");
  if (!container) return;
  if (!contracts.length) {
    container.innerHTML = `<div class="pay-card"><p class="pay-empty-note">Você ainda não tem nenhum boleto de empréstimo com a Marques.</p></div>`;
    return;
  }
  const ativos = contracts.filter(c => c.status === "ativo").length;
  container.innerHTML = contracts.map(c => {
    const autoExpand = c.status === "ativo" && ativos === 1;
    const contractInstallments = installments.filter(i => i.contractId === c.id);
    return loanContractBlockHTML(c, contractInstallments, autoExpand);
  }).join("");
}

function renderProximosBoletos(installments) {
  const el = document.getElementById("proximosBoletosList");
  if (!el) return;
  const pendentes = installments
    .filter(i => i.status === "pendente")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 3);
  if (!pendentes.length) {
    el.innerHTML = `<p class="pay-empty-note">Nenhum boleto pendente no momento.</p>`;
    return;
  }
  el.innerHTML = pendentes.map(i => installmentRowHTML(i, { showBadge: false })).join("");
}

function updateBoletosStat(installments) {
  const valorEl = document.getElementById("statBoletosValor");
  const trendEl = document.getElementById("statBoletosTrend");
  if (!valorEl || !trendEl) return;
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pendentesMes = installments.filter(i => i.status === "pendente" && i.vencimento.startsWith(ym));
  const total = pendentesMes.reduce((sum, i) => sum + i.valor, 0);
  valorEl.textContent = formatBRL(total);
  trendEl.textContent = pendentesMes.length
    ? `${pendentesMes.length} boleto${pendentesMes.length > 1 ? "s" : ""} pendente${pendentesMes.length > 1 ? "s" : ""}`
    : "Nenhum boleto pendente este mês";
}

function paymentRowHTML(payment) {
  const comprovante = payment.temComprovante
    ? `<a class="pay-boleto-pay-btn pay-comprovante-btn" href="${API_BASE}/api/customers/me/profit-share/payments/${payment.id}/comprovante" target="_blank" rel="noopener">Ver comprovante</a>`
    : "";
  const sub = `Lançado pela Marques · ${formatDateBR(payment.dataPagamento)}${payment.observacao ? " · " + payment.observacao : ""}`;
  return `
    <div class="pay-boleto-row">
      <span class="pay-boleto-icon" style="background:rgba(52,211,153,0.15); color:var(--success);">${ICON_PS}</span>
      <div class="pay-boleto-body"><strong>Repasse de Participação nos Lucros</strong><span>${sub}</span></div>
      <span class="pay-boleto-value" style="color:var(--success);">+ ${formatBRL(payment.valor)}</span>
      ${comprovante}
    </div>`;
}

// Cada contrato vira um bloco recolhível, com os repasses e o gráfico de
// ROI presos a ele — fechar/encerrar o contrato leva tudo junto. Só o
// contrato ativo abre sozinho, e só quando ele é o único ativo; havendo
// mais de um ativo (ou nenhum), a pessoa escolhe clicando em cada um.
function contractBlockHTML(contract, contractPayments, autoExpand) {
  const ativo = contract.status === "ativo";
  const investido = contract.valorInvestido != null ? Number(contract.valorInvestido) : null;
  const ganhos = contractPayments.reduce((sum, p) => sum + Number(p.valor), 0);

  let roiHTML = "";
  if (investido != null && investido > 0) {
    const roiPct = (ganhos / investido) * 100;
    const max = Math.max(investido, ganhos, 1);
    const barPct = (v) => (v > 0 ? Math.max((v / max) * 100, 3) : 0);
    roiHTML = `
      <div class="pay-card" style="margin-bottom:20px;">
        <div class="pay-card-head"><h2>Retorno até agora</h2></div>
        <div class="roi-summary">
          <div>
            <span>ROI</span>
            <strong>${roiPct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
            <small>${formatBRL(ganhos)} recebidos de ${formatBRL(investido)} investidos</small>
          </div>
        </div>
        <div class="roi-chart">
          <div class="roi-bar-col">
            <span class="roi-bar-value">${formatBRL(investido)}</span>
            <div class="roi-bar-track"><div class="roi-bar-fill is-investido" style="height:${barPct(investido)}%"></div></div>
            <span class="roi-bar-label"><span class="roi-dot is-investido"></span>Investido</span>
          </div>
          <div class="roi-bar-col">
            <span class="roi-bar-value">${formatBRL(ganhos)}</span>
            <div class="roi-bar-track"><div class="roi-bar-fill is-ganhos" style="height:${barPct(ganhos)}%"></div></div>
            <span class="roi-bar-label"><span class="roi-dot is-ganhos"></span>Ganhos</span>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="ps-contract-block is-${contract.status}">
      <button type="button" class="ps-contract-toggle" data-toggle-contract aria-expanded="${autoExpand ? "true" : "false"}">
        <span class="ps-contract-toggle-main">
          <strong>${contract.numeroContrato}</strong>
          <span class="account-status-badge ${ativo ? "status-success" : ""}">${ativo ? "Ativo" : "Encerrado"}</span>
        </span>
        <span class="ps-contract-toggle-sub">${investido != null ? formatBRL(investido) + " · " : ""}${String(contract.percentual).replace(".", ",")}%</span>
        <svg class="icon ps-contract-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="ps-contract-body"${autoExpand ? "" : " hidden"}>
        <div class="pay-card" style="margin-bottom:20px;">
          <div class="pay-contract-grid">
            <div><span>Início</span><strong>${formatDateBR(contract.dataInicio)}</strong></div>
            <div><span>Repasse</span><strong>${contract.periodicidade || "-"}</strong></div>
          </div>
          <p class="pay-empty-note" style="margin-top:14px;">Contrato cadastrado e atualizado pela equipe Marques. Alguma dúvida sobre os valores? Fale com a gente pelo WhatsApp.</p>
        </div>
        ${roiHTML}
        <div class="pay-card">
          <div class="pay-card-head"><h2>Repasses recebidos</h2></div>
          <div class="pay-boletos-list">
            ${contractPayments.length ? contractPayments.map(paymentRowHTML).join("") : `<p class="pay-empty-note">Nenhum repasse lançado ainda.</p>`}
          </div>
        </div>
      </div>
    </div>`;
}

function renderParticipacaoLucros(contracts, payments) {
  const container = document.getElementById("psContractsList");
  if (!container) return;
  if (!contracts.length) {
    container.innerHTML = `<div class="pay-card"><p class="pay-empty-note">Você ainda não tem um contrato de participação nos lucros ativo. Fale com a nossa equipe pra saber mais.</p></div>`;
    return;
  }
  const ativos = contracts.filter(c => c.status === "ativo").length;
  container.innerHTML = contracts.map(c => {
    const autoExpand = c.status === "ativo" && ativos === 1;
    const contractPayments = payments.filter(p => p.numeroContrato === c.numeroContrato);
    return contractBlockHTML(c, contractPayments, autoExpand);
  }).join("");
}

// Um só listener pros dois: "Meus Boletos" e "Participação nos Lucros"
// usam o mesmo bloco recolhível (.ps-contract-block).
document.addEventListener("click", (e) => {
  if (!e.target.closest("#loanContractsList, #psContractsList")) return;
  const btn = e.target.closest("[data-toggle-contract]");
  if (!btn) return;
  const body = btn.nextElementSibling;
  const expanded = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", expanded ? "false" : "true");
  body.hidden = expanded;
});

function updatePsStat(payments) {
  const labelEl = document.getElementById("statPsLabel");
  const valorEl = document.getElementById("statPsValor");
  const trendEl = document.getElementById("statPsTrend");
  if (!labelEl || !valorEl || !trendEl) return;
  if (!payments.length) {
    labelEl.textContent = "Participação nos lucros";
    valorEl.textContent = formatBRL(0);
    trendEl.textContent = "Nenhum repasse recebido ainda";
    return;
  }
  const ultimo = payments[0]; // backend já ordena por data_pagamento desc
  labelEl.textContent = "Último repasse recebido";
  valorEl.textContent = formatBRL(ultimo.valor);
  trendEl.textContent = `Em ${formatDateBR(ultimo.dataPagamento)}`;
}

function applyCustomerGreeting(customer) {
  const firstName = String(customer.nome || "").trim().split(" ")[0] || customer.email;
  const greetingH1 = document.getElementById("payGreetingName");
  const greetingSmall = document.getElementById("payUserGreetingSmall");
  const avatar = document.getElementById("payUserAvatar");
  if (greetingH1) greetingH1.textContent = `Olá, ${firstName}!`;
  if (greetingSmall) greetingSmall.textContent = `Olá, ${firstName}`;
  if (avatar) avatar.textContent = firstName.charAt(0).toUpperCase();
}

async function fetchJSON(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    return await res.json();
  } catch (err) {
    return { ok: false };
  }
}

// Sem conta aprovada, o cliente é levado ao cadastro (KYC) / tela de análise.
async function ensurePayAccount() {
  const res = await fetchJSON("/api/customers/me/pay-account");
  if (res.ok && res.account) return res.account;
  location.replace("conta-digital-abrir.html");
  return new Promise(() => {}); // a página vai ser trocada; não segue carregando o painel
}

function applyPayAccount(account, customer) {
  const nameEl = document.getElementById("payProfileName");
  const mailEl = document.getElementById("payProfileEmail");
  if (nameEl) nameEl.textContent = customer.nome;
  if (mailEl) mailEl.textContent = `${customer.email} · Ag ${account.agencia} · Conta ${account.numeroConta}`;
  const el = document.getElementById("payUserAccountLabel");
  if (el) el.textContent = `Ag ${account.agencia} · Conta ${account.numeroConta}`;
}

async function initMarquesPayRealData() {
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.requireLogin() : null;
  if (!customer) return; // requireLogin já redirecionou pra tela de login

  applyCustomerGreeting(customer);
  applyPayAccount(await ensurePayAccount(), customer);

  const [loansRes, psRes] = await Promise.all([
    fetchJSON("/api/customers/me/loans"),
    fetchJSON("/api/customers/me/profit-share"),
  ]);

  if (loansRes.ok) {
    renderMeusBoletos(loansRes.contracts, loansRes.installments);
    renderProximosBoletos(loansRes.installments);
    updateBoletosStat(loansRes.installments);
  }
  if (psRes.ok) {
    renderParticipacaoLucros(psRes.contracts, psRes.payments);
    updatePsStat(psRes.payments);
  }
}

initMarquesPayRealData();
