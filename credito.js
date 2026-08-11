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

const CREDIT_MODES = {
  clt: {
    label: "Crédito CLT",
    description: "Simulação de crédito pessoal/consignado para quem tem carteira assinada (CLT), com desconto facilitado em folha.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000" },
      { key:"parcelas", label:"Número de parcelas", type:"select", options:[12,24,36,48,60] },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const parcelas = parseInt(values.parcelas, 10) || 12;
      const taxaMensal = 0.021; // ilustrativa
      const parcela = pmt(valor, taxaMensal, parcelas);
      return [
        { label:"Parcela estimada", value: `${formatBRL(parcela)} / mês` },
        { label:"Total estimado ao final do prazo", value: formatBRL(parcela * parcelas) },
      ];
    },
  },
  fgts: {
    label: "Saque FGTS",
    description: "Use o saldo disponível no saque-aniversário do FGTS como entrada ou parte do pagamento do seu sistema solar.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000" },
      { key:"fgts", label:"Valor disponível no FGTS (R$)", type:"number", placeholder:"Ex: 3000" },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const fgts = parseFloat(values.fgts) || 0;
      const cobertoPeloFgts = Math.min(fgts, valor);
      const restante = Math.max(0, valor - fgts);
      return [
        { label:"Valor coberto pelo FGTS", value: formatBRL(cobertoPeloFgts) },
        { label:"Saldo restante a pagar ou financiar", value: formatBRL(restante) },
      ];
    },
  },
  consorcio: {
    label: "Consórcio",
    description: "Consórcio de energia solar: sem juros, com taxa de administração diluída nas parcelas. Ideal para quem pode aguardar a contemplação.",
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
      return [
        { label:"Parcela estimada", value: `${formatBRL(parcela)} / mês` },
        { label:"Total estimado (com taxa de administração)", value: formatBRL(total) },
      ];
    },
  },
  financiamento: {
    label: "Financiamento Bancário",
    description: "Linhas de financiamento bancário específicas para energia solar, com prazos mais longos.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000" },
      { key:"parcelas", label:"Número de parcelas", type:"select", options:[24,36,48,60,72,84,96] },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const parcelas = parseInt(values.parcelas, 10) || 48;
      const taxaMensal = 0.015; // ilustrativa
      const parcela = pmt(valor, taxaMensal, parcelas);
      return [
        { label:"Parcela estimada", value: `${formatBRL(parcela)} / mês` },
        { label:"Total estimado ao final do prazo", value: formatBRL(parcela * parcelas) },
      ];
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

function renderCreditSimCard(){
  const card = $("#creditSimCard");
  if(!card) return;
  const mode = CREDIT_MODES[currentCreditMode];

  card.innerHTML = `
    <h3>${mode.label}</h3>
    <p>${mode.description}</p>
    <div class="credit-sim-form" id="creditSimForm">${mode.fields.map(creditFieldHTML).join("")}</div>
    <button class="btn btn-primary" id="creditSimSubmit" type="button">Simular</button>
    <div class="credit-sim-result" id="creditSimResult"></div>
    <p class="credit-sim-disclaimer">Simulação ilustrativa e sem compromisso — os valores reais dependem de análise de crédito, taxa contratada e instituição financeira. Fale com um especialista para uma proposta personalizada.</p>
  `;
}

$("#creditTabs")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".credit-tab");
  if(!btn) return;
  currentCreditMode = btn.dataset.mode;
  $all(".credit-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  renderCreditSimCard();
});

document.addEventListener("click", (e) => {
  if(e.target.id !== "creditSimSubmit") return;
  const form = $("#creditSimForm");
  const values = {};
  $all("input, select", form).forEach(el => { values[el.name] = el.value; });

  const mode = CREDIT_MODES[currentCreditMode];
  const results = mode.calc(values);
  const resultBox = $("#creditSimResult");
  resultBox.innerHTML = results.map(r => `
    <div class="credit-sim-result-value">${r.value}</div>
    <div class="credit-sim-result-label">${r.label}</div>
  `).join("");
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
renderCreditSimCard();
initScrollReveal();
