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
function t(text) {
  return window.MES_I18N ? window.MES_I18N.t(text) : text;
}

const ICON_LOAN = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`;
const ICON_PS = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>`;
const ICON_PAID = `<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_LOJA = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20.5 7.3 12 3 3.5 7.3v9.4L12 21l8.5-4.3z"/><path d="m3.5 7.3 8.5 4.3 8.5-4.3"/><line x1="12" y1="11.6" x2="12" y2="21"/></svg>`;
const ICON_CREDITO = `<svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;

function installmentRowHTML(inst, { showBadge }) {
  const pago = inst.status === "pago";
  const sub = pago
    ? `${t("Parcela")} ${inst.numero}/${inst.contractTotalParcelas} · ${t("Pago em")} ${formatDateBR(inst.pagoEm)}`
    : `${t("Parcela")} ${inst.numero}/${inst.contractTotalParcelas} · ${t("Vencimento:")} ${formatDateBR(inst.vencimento)}`;
  const badge = showBadge
    ? `<span class="account-status-badge ${pago ? "status-success" : ""}">${pago ? t("Pago") : t("Pendente")}</span>`
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
const LOAN_STATUS_LABEL = { ativo: t("Ativo"), quitado: t("Quitado"), cancelado: t("Cancelado") };

// Cada empréstimo vira um bloco recolhível, igual à Participação nos
// Lucros: as parcelas ficam presas ao próprio contrato, escondidas até a
// pessoa clicar em cima dele. Começa sempre recolhido.
function loanContractBlockHTML(contract, contractInstallments) {
  const pendentes = contractInstallments.filter(i => i.status === "pendente").sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const pagas = contractInstallments.filter(i => i.status === "pago").sort((a, b) => (b.pagoEm || "").localeCompare(a.pagoEm || ""));
  const ordenadas = [...pendentes, ...pagas];

  return `
    <div class="ps-contract-block is-${contract.status}">
      <button type="button" class="ps-contract-toggle" data-toggle-contract aria-expanded="false">
        <span class="ps-contract-toggle-main">
          <strong>${contract.titulo}</strong>
          <span class="account-status-badge ${LOAN_STATUS_BADGE[contract.status] || ""}">${LOAN_STATUS_LABEL[contract.status] || contract.status}</span>
        </span>
        <span class="ps-contract-toggle-sub">${formatBRL(contract.valorParcela)} · ${contract.totalParcelas}x${pendentes.length ? ` · ${pendentes.length} ${pendentes.length > 1 ? t("pendentes") : t("pendente")}` : ""}</span>
        <svg class="icon ps-contract-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="ps-contract-body" hidden>
        ${contract.temContrato ? `<a class="btn btn-outline" style="margin-bottom:14px;" href="${API_BASE}/api/customers/me/loans/${contract.id}/contrato" target="_blank" rel="noopener">${t("Baixar contrato assinado")}</a>` : ""}
        <div class="pay-boletos-list">
          ${ordenadas.length ? ordenadas.map(i => installmentRowHTML(i, { showBadge: true })).join("") : `<p class="pay-empty-note">${t("Nenhuma parcela cadastrada ainda.")}</p>`}
        </div>
      </div>
    </div>`;
}

function renderMeusBoletos(contracts, installments) {
  const container = document.getElementById("loanContractsList");
  if (!container) return;
  if (!contracts.length) {
    container.innerHTML = `<div class="pay-card"><p class="pay-empty-note">${t("Você ainda não tem nenhum boleto de empréstimo com a Marques.")}</p></div>`;
    return;
  }
  container.innerHTML = contracts.map(c => {
    const contractInstallments = installments.filter(i => i.contractId === c.id);
    return loanContractBlockHTML(c, contractInstallments);
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
    el.innerHTML = `<p class="pay-empty-note">${t("Nenhum boleto pendente no momento.")}</p>`;
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
    ? `${pendentesMes.length} ${pendentesMes.length > 1 ? t("boletos pendentes") : t("boleto pendente")}`
    : t("Nenhum boleto pendente este mês");
}

function paymentRowHTML(payment) {
  const comprovante = payment.temComprovante
    ? `<a class="pay-boleto-pay-btn pay-comprovante-btn" href="${API_BASE}/api/customers/me/profit-share/payments/${payment.id}/comprovante" target="_blank" rel="noopener">${t("Ver comprovante")}</a>`
    : "";
  const sub = `${t("Lançado pela Marques ·")} ${formatDateBR(payment.dataPagamento)}${payment.observacao ? " · " + payment.observacao : ""}`;
  return `
    <div class="pay-boleto-row">
      <span class="pay-boleto-icon" style="background:rgba(52,211,153,0.15); color:var(--success);">${ICON_PS}</span>
      <div class="pay-boleto-body"><strong>${t("Repasse de Participação nos Lucros")}</strong><span>${sub}</span></div>
      <span class="pay-boleto-value" style="color:var(--success);">+ ${formatBRL(payment.valor)}</span>
      ${comprovante}
    </div>`;
}

// Cada contrato vira um bloco recolhível, com os repasses e o gráfico de
// ROI presos a ele — fechar/encerrar o contrato leva tudo junto. Só o
// contrato ativo abre sozinho, e só quando ele é o único ativo; havendo
// mais de um ativo (ou nenhum), a pessoa escolhe clicando em cada um.
function contractBlockHTML(contract, contractPayments) {
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
        <div class="pay-card-head"><h2>${t("Retorno até agora")}</h2></div>
        <div class="roi-summary">
          <div>
            <span>ROI</span>
            <strong>${roiPct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
            <small>${formatBRL(ganhos)} ${t("recebidos de")} ${formatBRL(investido)} ${t("investidos")}</small>
          </div>
        </div>
        <div class="roi-chart">
          <div class="roi-bar-col">
            <span class="roi-bar-value">${formatBRL(investido)}</span>
            <div class="roi-bar-track"><div class="roi-bar-fill is-investido" style="height:${barPct(investido)}%"></div></div>
            <span class="roi-bar-label"><span class="roi-dot is-investido"></span>${t("Investido")}</span>
          </div>
          <div class="roi-bar-col">
            <span class="roi-bar-value">${formatBRL(ganhos)}</span>
            <div class="roi-bar-track"><div class="roi-bar-fill is-ganhos" style="height:${barPct(ganhos)}%"></div></div>
            <span class="roi-bar-label"><span class="roi-dot is-ganhos"></span>${t("Ganhos")}</span>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="ps-contract-block is-${contract.status}">
      <button type="button" class="ps-contract-toggle" data-toggle-contract aria-expanded="false">
        <span class="ps-contract-toggle-main">
          <strong>${contract.numeroContrato}</strong>
          <span class="account-status-badge ${ativo ? "status-success" : ""}">${ativo ? t("Ativo") : t("Encerrado")}</span>
        </span>
        <span class="ps-contract-toggle-sub">${investido != null ? formatBRL(investido) + " · " : ""}${String(contract.percentual).replace(".", ",")}%</span>
        <svg class="icon ps-contract-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="ps-contract-body" hidden>
        <div class="pay-card" style="margin-bottom:20px;">
          <div class="pay-contract-grid">
            <div><span>${t("Data de início")}</span><strong>${formatDateBR(contract.dataInicio)}</strong></div>
            <div><span>${t("Repasse")}</span><strong>${contract.periodicidade || "-"}</strong></div>
          </div>
          <p class="pay-empty-note" style="margin-top:14px;">${t("Contrato cadastrado e atualizado pela equipe Marques. Alguma dúvida sobre os valores? Fale com a gente pelo WhatsApp.")}</p>
          ${contract.temContrato ? `<a class="btn btn-outline" style="margin-top:14px;" href="${API_BASE}/api/customers/me/profit-share/${contract.id}/contrato" target="_blank" rel="noopener">${t("Baixar contrato assinado")}</a>` : ""}
        </div>
        ${roiHTML}
        <div class="pay-card">
          <div class="pay-card-head"><h2>${t("Repasses recebidos")}</h2></div>
          <div class="pay-boletos-list">
            ${contractPayments.length ? contractPayments.map(paymentRowHTML).join("") : `<p class="pay-empty-note">${t("Nenhum repasse lançado ainda.")}</p>`}
          </div>
        </div>
      </div>
    </div>`;
}

function renderParticipacaoLucros(contracts, payments) {
  const container = document.getElementById("psContractsList");
  if (!container) return;
  if (!contracts.length) {
    container.innerHTML = `<div class="pay-card"><p class="pay-empty-note">${t("Você ainda não tem um contrato de participação nos lucros ativo. Fale com a nossa equipe pra saber mais.")}</p></div>`;
    return;
  }
  container.innerHTML = contracts.map(c => {
    const contractPayments = payments.filter(p => p.numeroContrato === c.numeroContrato);
    return contractBlockHTML(c, contractPayments);
  }).join("");
}

/* ======================================================================
   MEUS CONTRATOS: pedido da loja + solicitação de crédito com contrato
   anexado pela equipe Marques (empréstimo/participação já têm seu
   próprio "Baixar contrato" dentro do bloco do contrato).
   ====================================================================== */
function contratoItemHTML(item) {
  const icon = item.tipo === "pedido" ? ICON_LOJA : ICON_CREDITO;
  return `
    <div class="pay-boleto-row">
      <span class="pay-boleto-icon" style="background:rgba(247,148,30,0.15); color:var(--orange);">${icon}</span>
      <div class="pay-boleto-body"><strong>${item.numero}</strong><span>${item.tipoLabel} · ${formatDateBR(item.createdAt.slice(0, 10))}</span></div>
      <a class="pay-boleto-pay-btn pay-comprovante-btn" href="${API_BASE}${item.contratoUrl}" target="_blank" rel="noopener">${t("Baixar contrato")}</a>
    </div>`;
}

async function loadContratos() {
  const box = document.getElementById("contratosList");
  if (!box) return;
  const [ordersRes, leadsRes] = await Promise.all([
    fetchJSON("/api/customers/me/orders"),
    fetchJSON("/api/customers/me/credit-leads"),
  ]);
  const items = [];
  if (ordersRes.ok) {
    ordersRes.orders.filter((o) => o.temContrato).forEach((o) => items.push({
      tipo: "pedido", numero: o.orderNumber, createdAt: o.createdAt, tipoLabel: t("Compra na loja"),
      contratoUrl: `/api/customers/me/orders/${o.id}/contrato`,
    }));
  }
  if (leadsRes.ok) {
    leadsRes.leads.filter((l) => l.temContrato).forEach((l) => items.push({
      tipo: "credito", numero: l.leadNumber, createdAt: l.createdAt, tipoLabel: t("Solicitação de crédito"),
      contratoUrl: `/api/customers/me/credit-leads/${l.id}/contrato`,
    }));
  }
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  box.innerHTML = items.length
    ? `<div class="pay-card"><div class="pay-boletos-list">${items.map(contratoItemHTML).join("")}</div></div>`
    : `<div class="pay-card"><p class="pay-empty-note">${t("Nenhum contrato anexado ainda. Assim que a equipe Marques anexar o contrato do seu pedido ou da sua solicitação de crédito, ele aparece aqui.")}</p></div>`;
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
    labelEl.textContent = t("Participação nos lucros");
    valorEl.textContent = formatBRL(0);
    trendEl.textContent = t("Nenhum repasse recebido ainda");
    return;
  }
  const ultimo = payments[0]; // backend já ordena por data_pagamento desc
  labelEl.textContent = t("Último repasse recebido");
  valorEl.textContent = formatBRL(ultimo.valor);
  trendEl.textContent = `${t("Em")} ${formatDateBR(ultimo.dataPagamento)}`;
}

function applyCustomerGreeting(customer) {
  const firstName = String(customer.nome || "").trim().split(" ")[0] || customer.email;
  const greetingH1 = document.getElementById("payGreetingName");
  const greetingSmall = document.getElementById("payUserGreetingSmall");
  const avatar = document.getElementById("payUserAvatar");
  if (greetingH1) greetingH1.textContent = `${t("Olá")}, ${firstName}!`;
  if (greetingSmall) greetingSmall.textContent = `${t("Olá")}, ${firstName}`;
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
  if (res.ok && res.account) return res;
  location.replace("conta-digital-abrir.html");
  return new Promise(() => {}); // a página vai ser trocada; não segue carregando o painel
}

function applyPayAccount(account, customer) {
  const nameEl = document.getElementById("payProfileName");
  const mailEl = document.getElementById("payProfileEmail");
  if (nameEl) nameEl.textContent = customer.nome;
  if (mailEl) mailEl.textContent = `${customer.email} · ${t("Ag")} ${account.agencia} · ${t("Conta")} ${account.numeroConta}`;
  const el = document.getElementById("payUserAccountLabel");
  if (el) el.textContent = `${t("Ag")} ${account.agencia} · ${t("Conta")} ${account.numeroConta}`;
}

function applySaldo(saldo) {
  const formatted = formatBRL(saldo || 0);
  const statValorEl = document.getElementById("statSaldoValor");
  const statTrendEl = document.getElementById("statSaldoTrend");
  const pixValorEl = document.getElementById("pixSaldoValor");
  if (statValorEl) statValorEl.textContent = formatted;
  if (statTrendEl) statTrendEl.textContent = t("Disponível na sua conta");
  if (pixValorEl) pixValorEl.textContent = formatted;
}

async function initMarquesPayRealData() {
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.requireLogin() : null;
  if (!customer) return; // requireLogin já redirecionou pra tela de login

  applyCustomerGreeting(customer);
  const payAccountRes = await ensurePayAccount();
  applyPayAccount(payAccountRes.account, customer);
  applySaldo(payAccountRes.saldo);

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
  loadConsorcioPendentes();
  loadContratos();
}

/* ======================================================================
   COMPRA PROGRAMADA: ADESÕES PENDENTES DE CONFIRMAÇÃO
   ---------------------------------------------------------------------
   Só aparece quando um parceiro lançou uma venda em nome do cliente
   (status 'aguardando_cliente'). Ao aceitar aqui, a adesão vai pra
   'aguardando_pagamento' (card "Pagamento da cota") — só vira confirmada
   (e gera a comissão do parceiro) depois que o admin conferir o PIX.
   ====================================================================== */
function escConsorcioPendente(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function consorcioPendenteRowHTML(a) {
  return `
    <div class="pay-card" style="padding:14px 16px; margin-bottom:10px; background:var(--surface-2);" data-pendente-adesao="${a.id}">
      <strong>${escConsorcioPendente(a.grupoNome)}</strong>
      <p style="color:var(--muted); font-size:0.85rem; margin:4px 0 10px;">
        ${formatBRL(a.valorCota)}/${t("cota")} · ${a.prazoMeses}x${a.parceiroNome ? ` · ${t("indicado por")} ${escConsorcioPendente(a.parceiroNome)}` : ""}
      </p>
      <button type="button" class="btn btn-primary" data-confirmar-adesao="${a.id}">${t("Confirmar contratação")}</button>
    </div>`;
}

// Cota aguardando pagamento: QR code do grupo (se o admin cadastrou) e/ou o
// link/chave PIX que o admin lançou na adesão.
function consorcioPagamentoRowHTML(a) {
  const link = String(a.paymentLink || "");
  const linkHTML = /^https?:\/\//i.test(link)
    ? `<a class="btn btn-outline" href="${escConsorcioPendente(link)}" target="_blank" rel="noopener" style="width:auto;">${t("Pagar agora")}</a>`
    : link ? `<div style="font-family:monospace; word-break:break-all; background:var(--surface); padding:10px 12px; border-radius:8px; margin-top:10px;">${escConsorcioPendente(link)}</div>` : "";
  const qrHTML = a.grupoTemQr
    ? `<img src="${API_BASE}/api/customers/me/consorcio-adesoes/${a.id}/qr" alt="QR code" style="display:block; margin:12px auto 0; width:min(300px, 100%); aspect-ratio:1 / 1; object-fit:contain; background:#fff; border-radius:14px; padding:10px; box-sizing:border-box;">`
    : "";
  const aviso = !qrHTML && !linkHTML
    ? `<p style="color:var(--muted); font-size:0.85rem; margin-top:10px;">${t("Você receberá o link de pagamento por e-mail assim que conferirmos seus documentos.")}</p>`
    : "";
  return `
    <div class="pay-card" style="padding:14px 16px; margin-bottom:10px; background:var(--surface-2);">
      <strong>${escConsorcioPendente(a.grupoNome)}</strong>
      <p style="color:var(--muted); font-size:0.85rem; margin:4px 0 0;">${formatBRL(a.valorCota)}/${t("cota")} · ${a.prazoMeses}x</p>
      ${qrHTML}${linkHTML}${aviso}
    </div>`;
}

async function loadConsorcioPendentes() {
  const res = await fetchJSON("/api/customers/me/consorcio-adesoes");
  const card = document.getElementById("consorcioPendenteCard");
  const box = document.getElementById("consorcioPendenteList");
  if (!card || !box || !res.ok) return;
  const pendentes = res.adesoes.filter((a) => a.status === "aguardando_cliente");
  card.hidden = pendentes.length === 0;
  box.innerHTML = pendentes.map(consorcioPendenteRowHTML).join("");

  const pagCard = document.getElementById("consorcioPagamentoCard");
  const pagBox = document.getElementById("consorcioPagamentoList");
  if (pagCard && pagBox) {
    const aguardando = res.adesoes.filter((a) => a.status === "aguardando_pagamento");
    pagCard.hidden = aguardando.length === 0;
    pagBox.innerHTML = aguardando.map(consorcioPagamentoRowHTML).join("");
  }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-confirmar-adesao]");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = t("Confirmando...");
  try {
    const res = await fetch(`${API_BASE}/api/customers/me/consorcio-adesoes/${btn.dataset.confirmarAdesao}/confirmar`, {
      method: "POST", credentials: "include",
    }).then((r) => r.json());
    if (!res.ok) {
      btn.disabled = false;
      btn.textContent = t("Confirmar contratação");
      alert(res.error || t("Não foi possível confirmar agora."));
      return;
    }
    loadConsorcioPendentes();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = t("Confirmar contratação");
  }
});

initMarquesPayRealData();
