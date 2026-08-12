/* =====================================================================
   MARQUES ENERGIA SOLAR — PÁGINA "CRÉDITO SOLAR" (index.html)
   ---------------------------------------------------------------------
   Lógica isolada da página de crédito: calculadora de dimensionamento
   (kWp) e simulação de crédito. Não depende do catálogo de produtos,
   carrinho ou checkout — isso fica em loja.html / app.js.
   ===================================================================== */

/* ---------------------- HELPERS ---------------------- */
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

const ICON_CHECK = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_MENU = `<svg class="icon" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
const ICON_X = `<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

function formatBRL(value){
  return Number(value).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function showToast(msg){
  let toast = $(".toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `${ICON_CHECK}<span>${msg}</span>`;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ---------------------- SCROLL REVEAL ---------------------- */
let revealObserver;
function initScrollReveal(){
  if(!revealObserver){
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  $all(".reveal:not(.in-view)").forEach(el => revealObserver.observe(el));
}

/* ======================================================================
   DIMENSIONAMENTO (calculadora de kWp)
   ====================================================================== */
const KWH_PER_KWP_MONTH = 119; // geração média mensal (kWh) por kWp instalado no Brasil
const TARIFA_MEDIA_KWH = 0.85; // usada só para converter conta em R$ -> kWh
const POTENCIA_PAINEL_REFERENCIA_WP = 450; // referência para estimar qtd. de painéis

function calcSizing(){
  const billVal = parseFloat($("#sizingBillInput").value);
  const kwhVal = parseFloat($("#sizingKwhInput").value);

  let kwh = null;
  if(!isNaN(kwhVal) && kwhVal > 0) kwh = kwhVal;
  else if(!isNaN(billVal) && billVal > 0) kwh = billVal / TARIFA_MEDIA_KWH;

  if(!kwh){
    showToast("Informe o valor da conta de luz ou o consumo em kWh.");
    return;
  }

  const kwp = kwh / KWH_PER_KWP_MONTH;
  const qtdPaineis = Math.max(1, Math.ceil((kwp * 1000) / POTENCIA_PAINEL_REFERENCIA_WP));

  $("#sizingResultKwp").textContent = kwp.toFixed(2).replace(".", ",") + " kWp";
  $("#sizingResultPaineis").textContent = `${qtdPaineis} painéis`;
  const resultBox = $("#sizingCalcResult");
  resultBox.hidden = false;
  resultBox.dataset.qtd = qtdPaineis;
}

$("#sizingCalcBtn")?.addEventListener("click", calcSizing);

$("#sizingGoWizardBtn")?.addEventListener("click", () => {
  const qtd = parseInt($("#sizingCalcResult").dataset.qtd, 10) || 6;
  // A loja fica em outra página (loja.html) — passamos a quantidade
  // sugerida via localStorage, e o app.js de lá lê e já abre o
  // configurador com essa potência pré-selecionada.
  localStorage.setItem("mes_sizing_qtd", qtd);
  window.location.href = "loja.html#configurador";
});

/* ======================================================================
   SIMULAÇÃO DE CRÉDITO
   ---------------------------------------------------------------------
   Protótipo — simulações ilustrativas com taxas de exemplo, sem nenhuma
   integração com instituição financeira real.
   ====================================================================== */
function pmt(pv, i, n){
  if(i === 0) return pv / n;
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

const ICON_CLT = `<svg class="icon" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
const ICON_FGTS = `<svg class="icon" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><circle cx="16" cy="14" r="1"/></svg>`;
const ICON_CONSORCIO = `<svg class="icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const ICON_FINANCIAMENTO = `<svg class="icon" viewBox="0 0 24 24"><line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><path d="M12 3 3 8h18l-9-5z"/><line x1="9" y1="21" x2="9" y2="10"/><line x1="15" y1="21" x2="15" y2="10"/></svg>`;

const CREDIT_MODES = {
  clt: {
    label: "Crédito CLT",
    tag: "Aprovação rápida",
    icon: ICON_CLT,
    description: "Crédito pessoal/consignado para quem tem carteira assinada, com desconto facilitado direto na folha de pagamento — menos burocracia, aprovação mais ágil.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000" },
      { key:"parcelas", label:"Número de parcelas", type:"select", options:[12,24,36,48,60] },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const parcelas = parseInt(values.parcelas, 10) || 12;
      const taxaMensal = 0.021; // ilustrativa
      const parcela = pmt(valor, taxaMensal, parcelas);
      return {
        items: [
          { label:"Parcela estimada", value: `${formatBRL(parcela)} / mês` },
          { label:"Total estimado ao final do prazo", value: formatBRL(parcela * parcelas) },
        ],
        note: "Por ser descontado direto do contracheque, esse é geralmente o caminho mais rápido para sair do papel: menos análise, aprovação em poucos dias.",
      };
    },
  },
  fgts: {
    label: "Saque FGTS",
    tag: "Dinheiro que já é seu",
    icon: ICON_FGTS,
    description: "Use o saldo disponível no saque-aniversário do FGTS como entrada (ou até para quitar parte do sistema) — dinheiro parado que hoje rende quase nada.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000" },
      { key:"fgts", label:"Valor disponível no FGTS (R$)", type:"number", placeholder:"Ex: 3000" },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const fgts = parseFloat(values.fgts) || 0;
      const cobertoPeloFgts = Math.min(fgts, valor);
      const restante = Math.max(0, valor - fgts);
      const pct = valor > 0 ? Math.round((cobertoPeloFgts / valor) * 100) : 0;
      return {
        items: [
          { label:"Valor coberto pelo FGTS", value: formatBRL(cobertoPeloFgts) },
          { label:"Saldo restante a pagar ou financiar", value: formatBRL(restante) },
        ],
        note: restante <= 0
          ? "Com esse saldo, o FGTS cobre 100% do valor do seu sistema — sem precisar contratar nenhum crédito adicional."
          : `Esse saldo já cobre cerca de ${pct}% do valor do seu sistema. O restante pode ser combinado com uma das outras modalidades de crédito.`,
      };
    },
  },
  consorcio: {
    label: "Consórcio",
    tag: "Sem juros",
    icon: ICON_CONSORCIO,
    description: "Consórcio de energia solar: sem juros, apenas uma taxa de administração diluída nas parcelas. Ideal para quem pode planejar com calma e não tem pressa para instalar.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000" },
      { key:"parcelas", label:"Número de parcelas", type:"select", options:[60,72,80,100] },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const parcelas = parseInt(values.parcelas, 10) || 60;
      const taxaAdm = 0.17; // ilustrativa
      const total = valor * (1 + taxaAdm);
      const parcela = total / parcelas;
      return {
        items: [
          { label:"Parcela estimada", value: `${formatBRL(parcela)} / mês` },
          { label:"Total estimado (com taxa de administração)", value: formatBRL(total) },
        ],
        note: "Sem juros bancários — você só paga a taxa de administração do grupo. Com lance, a contemplação pode sair bem mais rápido.",
      };
    },
  },
  financiamento: {
    label: "Financiamento Bancário",
    tag: "Parcelas mais longas",
    icon: ICON_FINANCIAMENTO,
    description: "Linhas de financiamento bancário específicas para energia solar, com prazos de até 96 meses. Comece a economizar na conta de luz enquanto ainda está pagando o sistema.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000" },
      { key:"parcelas", label:"Número de parcelas", type:"select", options:[24,36,48,60,72,84,96] },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const parcelas = parseInt(values.parcelas, 10) || 48;
      const taxaMensal = 0.015; // ilustrativa
      const parcela = pmt(valor, taxaMensal, parcelas);
      return {
        items: [
          { label:"Parcela estimada", value: `${formatBRL(parcela)} / mês` },
          { label:"Total estimado ao final do prazo", value: formatBRL(parcela * parcelas) },
        ],
        note: "Quanto mais longo o prazo, menor tende a ser a parcela — muitas famílias conseguem uma parcela próxima do que já pagavam de conta de luz.",
      };
    },
  },
};

let currentCreditMode = "clt";

function creditFieldHTML(f){
  if(f.type === "select"){
    const opts = f.options.map(o => `<option value="${o}">${o}x</option>`).join("");
    return `<label>${f.label}<select name="${f.key}">${opts}</select></label>`;
  }
  return `<label>${f.label}<input type="number" min="0" name="${f.key}" placeholder="${f.placeholder || ""}"></label>`;
}

function renderCreditModes(){
  const wrap = $("#creditTabs");
  if(!wrap) return;
  wrap.innerHTML = Object.entries(CREDIT_MODES).map(([key, m]) => `
    <button class="credit-mode-card${key === currentCreditMode ? " active" : ""}" data-mode="${key}" type="button" role="tab" aria-selected="${key === currentCreditMode}">
      <span class="credit-mode-icon">${m.icon}</span>
      <span class="credit-mode-body">
        <span class="credit-mode-title">${m.label}</span>
        <span class="credit-mode-tag">${m.tag}</span>
      </span>
    </button>
  `).join("");
}

function renderCreditSimCard(){
  const card = $("#creditSimCard");
  if(!card) return;
  const mode = CREDIT_MODES[currentCreditMode];

  card.innerHTML = `
    <div class="credit-sim-card-head">
      <span class="credit-mode-icon credit-mode-icon-lg">${mode.icon}</span>
      <div>
        <h3>${mode.label}</h3>
        <p>${mode.description}</p>
      </div>
    </div>
    <div class="credit-sim-form" id="creditSimForm">${mode.fields.map(creditFieldHTML).join("")}</div>
    <button class="btn btn-primary btn-lg" id="creditSimSubmit" type="button">Simular parcela</button>
    <div class="credit-sim-result" id="creditSimResult"></div>
    <div class="credit-sim-cta">
      <p>Ficou com dúvida sobre qual modalidade escolher?</p>
      <a href="https://wa.me/5565996591300" target="_blank" rel="noopener" class="btn btn-outline">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        Falar com um especialista
      </a>
    </div>
    <p class="credit-sim-disclaimer">Simulação ilustrativa e sem compromisso — os valores reais dependem de análise de crédito, taxa contratada e instituição financeira.</p>
  `;
}

$("#creditTabs")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".credit-mode-card");
  if(!btn) return;
  currentCreditMode = btn.dataset.mode;
  renderCreditModes();
  renderCreditSimCard();
});

document.addEventListener("click", (e) => {
  if(e.target.id !== "creditSimSubmit") return;
  const form = $("#creditSimForm");
  const values = {};
  $all("input, select", form).forEach(el => { values[el.name] = el.value; });

  const mode = CREDIT_MODES[currentCreditMode];
  const result = mode.calc(values);
  const resultBox = $("#creditSimResult");
  resultBox.innerHTML = `
    ${result.items.map(r => `
      <div class="credit-sim-result-value">${r.value}</div>
      <div class="credit-sim-result-label">${r.label}</div>
    `).join("")}
    ${result.note ? `<div class="credit-sim-note">${ICON_CHECK}<span>${result.note}</span></div>` : ""}
  `;
  resultBox.classList.add("show");
});

/* ======================================================================
   MENU MOBILE
   ====================================================================== */
function closeMobileMenu(){
  $("#mainNav").classList.remove("open");
  const icon = $("#hamburgerIcon");
  if(icon) icon.outerHTML = ICON_MENU.replace('class="icon"', 'class="icon" id="hamburgerIcon"');
}
$("#hamburgerBtn").addEventListener("click", () => {
  const nav = $("#mainNav");
  const isOpen = nav.classList.toggle("open");
  $("#hamburgerIcon").outerHTML = (isOpen ? ICON_X : ICON_MENU).replace('class="icon"', 'class="icon" id="hamburgerIcon"');
});
$("#mainNav").addEventListener("click", (e) => {
  if(e.target.closest("a")) closeMobileMenu();
});

/* ======================================================================
   INICIALIZAÇÃO
   ====================================================================== */
renderCreditModes();
renderCreditSimCard();
initScrollReveal();
