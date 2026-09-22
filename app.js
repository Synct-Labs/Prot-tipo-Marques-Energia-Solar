/* =====================================================================
   MARQUES ENERGIA SOLAR: LOJA
   O catálogo (PRODUCTS) não é mais fixo aqui — vem do backend
   (GET /api/products, ver loadProducts() mais abaixo), que por sua vez
   busca no Postgres. O admin adiciona/remove produto, muda preço e cria
   promoção pelo painel (admin/catalogo.html), sem precisar mexer em
   código. O catálogo original (preços com referência Apex Energia
   Solar + 30% de margem, kits com orçamento real da própria Marques já
   incluindo instalação e mão de obra) foi usado como carga inicial do
   banco — ver backend/src/productSeed.js.
   Frete grátis para todo o Brasil como bônus de lançamento (sem integração
   de transportadora real ainda — ver item 6 do README).
   Não há integração de pagamento real; ver seção CHECKOUT / PAYMENT
   INTEGRATION POINT mais abaixo.
   ===================================================================== */

/* Base da API: "" localmente (mesmo domínio), URL do Render em produção.
   Definida em api-config.js, carregado antes deste arquivo. */
const API_BASE = window.MES_API_BASE || "";

/* Evita que o navegador tente "adivinhar" a posição de rolagem ao usar
   voltar/avançar entre as views (hash routing): cada troca de view já
   força scrollTo(0) no navigate() abaixo, então a restauração automática
   do navegador só atrapalharia. */
if("scrollRestoration" in history) history.scrollRestoration = "manual";

/* ---------------------- ÍCONES (estilo line-icon, tipo lucide) ---------------------- */
const ICONS = {
  kits: `<svg class="icon" viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>`,
  paineis: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4" y1="12" x2="2" y2="12"/><line x1="22" y1="12" x2="20" y2="12"/><line x1="19.07" y1="4.93" x2="17.66" y2="6.34"/><line x1="6.34" y1="17.66" x2="4.93" y2="19.07"/><line x1="19.07" y1="19.07" x2="17.66" y2="17.66"/><line x1="6.34" y1="6.34" x2="4.93" y2="4.93"/></svg>`,
  inversores: `<svg class="icon" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>`,
  cabos: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 17H7a5 5 0 0 1 0-10h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  estrutura: `<svg class="icon" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z"/></svg>`,
  baterias: `<svg class="icon" viewBox="0 0 24 24"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="13" x2="23" y2="11"/></svg>`,
  controlador: `<svg class="icon" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
};

const ICON_TRASH = `<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_PLUS = `<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_MINUS = `<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_CHECK = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_MENU = `<svg class="icon" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
const ICON_X = `<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/* ---------------------- CONFIG DE CATEGORIAS ---------------------- */
const DEPARTMENT = "Equipamentos Fotovoltaicos";

const CATEGORIES = {
  kits:       { label: "Kits Prontos",                       crumbCategory: "Kit Solar Completo",     facetLabel: "Consumo estimado", primarySpec: "potencia", specFields: [
      ["potencia","Potência do sistema"], ["modulos","Módulos"], ["inversor","Inversor"],
      ["entradaMax","Potência máx. de entrada"], ["saidaMax","Potência máx. de saída"], ["consumoAlvo","Consumo médio estimado"]
    ] },
  paineis:    { label: "Painéis Solares",               crumbCategory: "Painel Solar",           facetLabel: "Potência (Wp)", primarySpec: "potencia", specFields: [
      ["potencia","Potência"], ["tipo","Tipo de célula"], ["eficiencia","Eficiência"],
      ["tensaoMax","Tensão máxima"], ["correnteMax","Corrente máxima"],
      ["dimensoes","Dimensões"], ["peso","Peso"], ["garantia","Garantia"]
    ] },
  inversores: { label: "Inversores",                       crumbCategory: "Inversor Fotovoltaico",  facetLabel: "Potência Nominal", primarySpec: "potencia", specFields: [
      ["potencia","Potência"], ["mppt","Entradas MPPT"], ["tensaoSaida","Tensão de saída"],
      ["eficiencia","Eficiência máxima"], ["comunicacao","Comunicação"],
      ["protecao","Grau de proteção"], ["garantia","Garantia"]
    ] },
  cabos:      { label: "Cabos e Conectores",               crumbCategory: "Cabos e Conectores",     facetLabel: "Tipo", primarySpec: "bitola", specFields: [
      ["bitola","Bitola"], ["comprimento","Comprimento"], ["isolacao","Isolação"],
      ["tensaoMax","Tensão máxima"], ["resistencia","Resistência"]
    ] },
  estrutura:  { label: "Parafusos e Estrutura",            crumbCategory: "Estrutura de Fixação",   facetLabel: "Tipo de peça", primarySpec: "capacidade", specFields: [
      ["material","Material"], ["capacidade","Capacidade/Uso"], ["fixacao","Tipo de fixação"],
      ["resistencia","Resistência"], ["garantia","Garantia"]
    ] },
  baterias:   { label: "Baterias",                          crumbCategory: "Bateria Estacionária/Lítio", facetLabel: "Tecnologia", primarySpec: "capacidade", specFields: [
      ["tensao","Tensão"], ["capacidade","Capacidade"], ["tecnologia","Tecnologia"],
      ["ciclos","Vida útil"], ["dimensoes","Dimensões"], ["peso","Peso"], ["garantia","Garantia"]
    ] },
  controlador:{ label: "Controlador de Carga",               crumbCategory: "Controlador de Carga",   facetLabel: "Tipo", primarySpec: "corrente", specFields: [
      ["tipo","Tipo de carregamento"], ["corrente","Corrente nominal"], ["tensaoSistema","Tensão do sistema"],
      ["eficiencia","Eficiência"], ["protecoes","Proteções"], ["dimensoes","Dimensões"], ["garantia","Garantia"]
    ] },
};

const FACET_ORDER = {
  kits: ["Até 400 kWh/mês", "400–700 kWh/mês", "700–1000 kWh/mês", "Acima de 1000 kWh/mês"],
  paineis: ["Até 400 Wp", "400–500 Wp", "500–600 Wp", "Acima de 600 Wp"],
  inversores: ["Até 3 kW", "3–5 kW", "5–10 kW", "Acima de 10 kW"],
  cabos: ["6 mm²", "Conectores", "Proteção"],
  estrutura: ["Trilhos", "Fixação"],
  baterias: ["Chumbo-Ácido (Estacionária)", "Lítio (LiFePO4)"],
  controlador: ["PWM", "MPPT"],
};

/* ---------------------- CATÁLOGO (carregado do backend — ver GET /api/products) ---------------------- */
let PRODUCTS = [];

async function loadProducts(){
  try{
    const res = await fetch(`${API_BASE}/api/products`);
    const data = await res.json();
    if(data.ok && Array.isArray(data.products)){
      PRODUCTS = data.products;
      return true;
    }
  } catch(err){
    // segue pro estado de erro abaixo
  }
  PRODUCTS = [];
  return false;
}

/* ---------------------- ESTADO DA APLICAÇÃO ---------------------- */
const state = {
  currentCategory: "kits",
  currentProductId: null,
  sort: "relevancia",
  searchTerm: "",
  filters: { marca: new Set(), faixa: null },
  cart: [],              // [{ id, qty }]
  // Compra assistida: só fica "active" quando o cliente logado é o próprio
  // dono do código ?ref= ativo (ver checarCompraAssistida) — aí ele está
  // comprando pelo catálogo em nome de um cliente, não pra si mesmo.
  partnerAssisted: { active: false, tier: 0 },
  compareSelection: {},  // { [categoria]: [ids] }
  configurator: {
    active: false,
    step: 0,
    paineis: { id: null, qty: 6 },
    inversor: { id: null },
    cabo: { id: "cb1", qty: 30 },
    conector: { id: "cb3", qty: 2 },
    estrutura: { id: null },
  },
};

const FEATURED_IDS = ["kit1", "kit2", "pn3", "iv2", "bt2", "cc2"];

/* ---------------------- CONFIGURADOR (MONTE SEU PROJETO) ---------------------- */
const WIZARD_STEPS = [
  { key:"paineis",   cat:"paineis",    label:"Painéis",    title:"Escolha o Painel Solar",       sub:"Selecione o modelo e a quantidade de painéis do seu projeto." },
  { key:"inversor",  cat:"inversores", label:"Inversor",   title:"Escolha o Inversor",            sub:"Selecione o inversor compatível com a potência do projeto." },
  { key:"cabos",     label:"Cabos",      title:"Cabos e Conectores",              sub:"Já incluímos o padrão recomendado para a maioria das instalações. Ajuste as quantidades se precisar de mais." },
  { key:"estrutura", cat:"estrutura",  label:"Estrutura",  title:"Escolha a Peça de Fixação", sub:"Estrutura é vendida por peça (trilho, terminal, parafuso). Selecionamos um item de referência — ajuste as quantidades no carrinho conforme o seu telhado." },
  { key:"resumo",    label:"Resumo",   title:"Resumo do Projeto",              sub:"Confira os itens selecionados antes de adicionar ao carrinho." },
];

/* ---------------------- HELPERS ---------------------- */
function formatBRL(value){
  return value.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}
function getProduct(id){ return PRODUCTS.find(p => p.id === id); }
// Preço que o cliente realmente paga: o promocional, quando o admin
// cadastrou um (ver admin/catalogo.html), senão o preço normal. Usado em
// carrinho/checkout/parcelamento — o "price" original continua exibido
// riscado ao lado, só pra mostrar o desconto.
function effectivePrice(p){ return (p.promoPrice != null && p.promoPrice > 0) ? p.promoPrice : p.price; }

// HTML do preço (usado no card do catálogo e na página do produto): preço
// normal riscado + preço promocional, quando existe; senão só o preço.
function priceHTML(p){
  const hasPromo = p.promoPrice != null && p.promoPrice > 0 && p.promoPrice < p.price;
  const eff = effectivePrice(p);
  if(hasPromo){
    return `<span class="price-original">${formatBRL(p.price)}</span> ${formatBRL(eff)}<small>ou ${formatParcelamento(eff)}</small>`;
  }
  return `${formatBRL(p.price)}<small>ou ${formatParcelamento(p.price)}</small>`;
}
function unidadePreco(p){
  const emb = String(p.embVenda || "").toLowerCase();
  if(emb.includes("metro")) return "metro";
  if(emb.includes("par")) return "par";
  return "unidade";
}
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

/* ---------------------- PARCELAMENTO (cartão de crédito) ----------------------
   Regra de negócio: até 10x sem juros no cartão — mesmo padrão praticado
   pela maioria das revendas do setor. É só divisão simples do total, sem
   juros/taxas embutidos aqui; quando o gateway de pagamento real entrar
   (ver PONTO DE INTEGRAÇÃO DE PAGAMENTO, na seção CHECKOUT), ele que passa
   a tratar taxa de antecipação/adquirência por fora — o número de parcelas
   escolhido pelo cliente já é capturado no checkout e enviado no pedido
   (campo "parcelas"), pronto pra ser repassado direto pra API do gateway. */
const MAX_PARCELAS_SEM_JUROS = 10;

function valorParcela(total, parcelas){
  return total / parcelas;
}
function formatParcelamento(total, parcelas = MAX_PARCELAS_SEM_JUROS){
  return `${parcelas}x de ${formatBRL(valorParcela(total, parcelas))} sem juros`;
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

/* ======================================================================
   DIMENSIONAMENTO (calculadora de kWp)
   ====================================================================== */
const KWH_PER_KWP_MONTH = 119; // geração média mensal (kWh) por kWp instalado no Brasil
const TARIFA_MEDIA_KWH = 1; // usada só para converter conta em R$ -> kWh
const POTENCIA_PAINEL_REFERENCIA_WP = 610; // referência para estimar qtd. de painéis

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

  // Guarda o valor da conta em R$ (informado direto ou convertido a partir do
  // kWh) para a página de crédito comparar com a parcela estimada, caso o
  // cliente vá simular crédito depois de montar o kit.
  const valorContaReais = (!isNaN(billVal) && billVal > 0) ? billVal : kwh * TARIFA_MEDIA_KWH;
  localStorage.setItem("mes_conta_atual", valorContaReais.toFixed(2));
}

$("#sizingCalcBtn")?.addEventListener("click", calcSizing);

$("#sizingGoWizardBtn")?.addEventListener("click", () => {
  const qtd = parseInt($("#sizingCalcResult").dataset.qtd, 10) || 6;
  state.configurator.paineis.qty = qtd;
  location.hash = "configurador";
  startWizard();
});

/* ---------------------- GALERIA DE IMAGENS (foto principal + itens do kit) ----------------------
   Pra kits, a "galeria" são as fotos reais dos equipamentos que vêm dentro
   (painel, inversor etc.), sem repetir a mesma foto duas vezes. Pra produto
   avulso normalmente sobra só a foto principal — nesse caso não faz sentido
   mostrar miniaturas (não tem outra imagem real pra trocar). */
function getGalleryImages(p){
  const seen = new Set();
  const images = [];
  const add = (src, alt) => {
    if(!src || seen.has(src)) return;
    seen.add(src);
    images.push({ src, alt });
  };
  add(p.image, p.name);
  (p.bundleItems || []).forEach(item => add(item.image, `${item.brand} — ${item.name}`));
  return images;
}

/* ---------------------- IMAGEM DE PRODUTO (placeholder neutro, tipo "foto de estúdio") ---------------------- */
function productImageHTML(p, extraClass=""){
  const spec = p.specs[CATEGORIES[p.cat].primarySpec] || "";
  const media = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="product-photo" loading="lazy">`
    : ICONS[p.cat];
  return `<div class="product-image ${extraClass}">
    ${spec ? `<span class="spec-badge">${spec}</span>` : ""}
    ${p.isLaunch ? `<span class="launch-badge">Lançamento</span>` : ""}
    ${p.promoPrice ? `<span class="promo-badge">${p.promoLabel || "Promoção"}</span>` : ""}
    ${media}
    <span class="image-caption">Imagem ilustrativa</span>
  </div>`;
}

/* ---------------------- GERADORES DE CONTEÚDO (a partir dos specs reais do produto) ---------------------- */
function getFeatures(p){
  if(p.cat === "kits") return [
    `Sistema completo dimensionado para consumo de ${p.specs.consumoAlvo}`,
    `${p.specs.modulos}`,
    `${p.specs.inversor}`,
    `Potência máxima de entrada ${p.specs.entradaMax} e saída ${p.specs.saidaMax}`,
  ];
  if(p.cat === "paineis") return [
    `Eficiência de ${p.specs.eficiencia}, mesmo em dias nublados`,
    `Célula ${p.specs.tipo}, alta durabilidade`,
    `Garantia de ${p.specs.garantia}`,
    `Indicado para instalação residencial e comercial`,
  ];
  if(p.cat === "inversores") return [
    `Eficiência máxima de ${p.specs.eficiencia}`,
    `${p.specs.mppt}, ideal para diferentes orientações de painel`,
    `Monitoramento via ${p.specs.comunicacao}`,
    `Proteção ${p.specs.protecao}, indicado para uso externo`,
  ];
  if(p.cat === "cabos") return [
    `Isolação em ${p.specs.isolacao}, resistente a UV e intempéries`,
    `Bitola ${p.specs.bitola}, dimensionada para instalações fotovoltaicas`,
    p.specs.tensaoMax !== "-" ? `Suporta tensão de até ${p.specs.tensaoMax}` : `Uso recomendado por norma técnica`,
    `Fácil instalação e conexão segura`,
  ];
  return [
    `Material: ${p.specs.material}`,
    `${p.specs.fixacao}`,
    `Resistência: ${p.specs.resistencia}`,
    p.specs.garantia !== "-" ? `Garantia de ${p.specs.garantia}` : `Compatível com os principais perfis do mercado`,
  ];
}

function getWarrantyText(p){
  if(p.cat === "kits"){
    return `Kit composto por equipamentos de fabricantes homologados — a garantia de cada item (módulos e inversor) segue os termos do respectivo fabricante, detalhados na ficha técnica. Em caso de sinistro, entre em contato com nosso suporte pelo WhatsApp para orientações sobre o acionamento da garantia.`;
  }
  const garantia = p.specs.garantia && p.specs.garantia !== "-" ? p.specs.garantia : "conforme especificação do fabricante";
  return `Este produto possui garantia de ${garantia} contra defeitos de fabricação, conforme os termos do fabricante ${p.brand}. Em caso de sinistro, entre em contato com nosso suporte pelo WhatsApp para orientações sobre o acionamento da garantia.`;
}

/* ======================================================================
   ROTEAMENTO (SPA baseada em hash), suporta #produto/<id>
   ====================================================================== */
const VALID_VIEWS = ["home","catalogo","comparar","produto","configurador","carrinho","checkout","confirmacao"];

function navigate(){
  const rawHash = location.hash.replace("#","") || "home";
  let hash = rawHash;

  if(rawHash.startsWith("produto/")){
    hash = "produto";
    state.currentProductId = decodeURIComponent(rawHash.split("/")[1] || "");
  }
  if(!VALID_VIEWS.includes(hash)) hash = "home";

  $all(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(hash);
  if(target) target.classList.add("active");

  closeMobileMenu();

  if(hash === "catalogo") { renderSidebar(); renderCatalog(); }
  if(hash === "comparar") renderComparison();
  if(hash === "produto") renderProductPage();
  if(hash === "configurador") renderConfiguradorView();
  if(hash === "carrinho") renderCart();
  if(hash === "checkout") renderCheckout();

  updateMobileCartBar();
  window.scrollTo({ top: 0, behavior: "auto" });
  initScrollReveal();
}
window.addEventListener("hashchange", navigate);

/* ======================================================================
   SCROLL REVEAL + CONTADORES ANIMADOS
   ====================================================================== */
let revealObserver;
function initScrollReveal(){
  if(!revealObserver){
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("in-view");
          const counter = entry.target.querySelector(".stat-number");
          if(counter) animateCounter(counter);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  $all(".reveal:not(.in-view)").forEach(el => revealObserver.observe(el));
}

function animateCounter(el){
  if(el.dataset.done) return;
  el.dataset.done = "1";
  const target = parseInt(el.dataset.target, 10) || 0;
  const suffix = el.dataset.suffix || "";
  const duration = 1200;
  const start = performance.now();
  function step(now){
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ======================================================================
   TABS DE CATEGORIA
   ====================================================================== */
function renderTabs(){
  $all(".tab").forEach(tab => {
    const cat = tab.dataset.cat;
    tab.innerHTML = `${ICONS[cat]}<span>${CATEGORIES[cat].label}</span>`;
  });
}

$("#categoryTabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if(!btn) return;
  $all(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  state.currentCategory = btn.dataset.cat;
  state.filters = { marca: new Set(), faixa: null };
  renderSidebar();
  renderCatalog();
});

/* ======================================================================
   BREADCRUMB
   ====================================================================== */
function crumbHTML(parts){
  return parts.map((p, i) => i < parts.length - 1
    ? `<span>${p}</span><span class="crumb-sep">/</span>`
    : `<span class="crumb-current">${p}</span>`
  ).join("");
}

function renderCatalogBreadcrumb(){
  const el = $("#catalogBreadcrumb");
  if(!el) return;
  const cat = CATEGORIES[state.currentCategory];
  const parts = [DEPARTMENT, cat.crumbCategory];

  if(state.filters.marca.size === 1) parts.push([...state.filters.marca][0]);
  else if(state.filters.marca.size > 1) parts.push(`${state.filters.marca.size} marcas selecionadas`);

  if(state.filters.faixa) parts.push(state.filters.faixa);

  el.innerHTML = crumbHTML(parts);
}

/* ======================================================================
   SIDEBAR DE FILTROS (marca + faixa, com contadores)
   ====================================================================== */
function computeFacetData(cat){
  const items = PRODUCTS.filter(p => p.cat === cat);

  const brandCounts = {};
  items.forEach(p => { brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1; });
  const brands = Object.keys(brandCounts).sort().map(name => ({ name, count: brandCounts[name] }));

  const faixaCounts = {};
  items.forEach(p => { faixaCounts[p.facetValue] = (faixaCounts[p.facetValue] || 0) + 1; });
  const order = FACET_ORDER[cat] || Object.keys(faixaCounts);
  const faixas = order.filter(f => faixaCounts[f]).map(name => ({ name, count: faixaCounts[name] }));

  return { brands, faixas };
}

function renderSidebar(){
  const { brands, faixas } = computeFacetData(state.currentCategory);

  $("#brandFilterList").innerHTML = brands.map(b => `
    <li>
      <label class="filter-option">
        <input type="checkbox" class="filter-marca" value="${b.name}" ${state.filters.marca.has(b.name) ? "checked" : ""}>
        <span>${b.name}</span>
        <span class="filter-count">(${b.count})</span>
      </label>
    </li>`).join("");

  $("#facetLabel").textContent = CATEGORIES[state.currentCategory].facetLabel;
  $("#facetFilterList").innerHTML = faixas.map(f => `
    <li>
      <label class="filter-option">
        <input type="radio" name="faixaFilter" class="filter-faixa" value="${f.name}" ${state.filters.faixa === f.name ? "checked" : ""}>
        <span>${f.name}</span>
        <span class="filter-count">(${f.count})</span>
      </label>
    </li>`).join("");
}

$("#filtersSidebar").addEventListener("change", (e) => {
  if(e.target.classList.contains("filter-marca")){
    const v = e.target.value;
    if(e.target.checked) state.filters.marca.add(v);
    else state.filters.marca.delete(v);
    renderCatalog();
  }
  if(e.target.classList.contains("filter-faixa")){
    state.filters.faixa = e.target.value;
    renderCatalog();
  }
});

$("#clearFiltersBtn").addEventListener("click", () => {
  state.filters = { marca: new Set(), faixa: null };
  renderSidebar();
  renderCatalog();
});

$("#filtersToggleBtn").addEventListener("click", () => {
  $("#filtersSidebar").classList.toggle("open");
});

/* ======================================================================
   CATÁLOGO
   ====================================================================== */
function renderCatalog(){
  const grid = $("#productGrid");
  let items = PRODUCTS.filter(p => p.cat === state.currentCategory);

  if(state.searchTerm){
    items = items.filter(p =>
      p.name.toLowerCase().includes(state.searchTerm) ||
      p.brand.toLowerCase().includes(state.searchTerm));
  }
  if(state.filters.marca.size){
    items = items.filter(p => state.filters.marca.has(p.brand));
  }
  if(state.filters.faixa){
    items = items.filter(p => p.facetValue === state.filters.faixa);
  }

  if(state.sort === "menor-preco") items = [...items].sort((a,b) => effectivePrice(a) - effectivePrice(b));
  if(state.sort === "maior-preco") items = [...items].sort((a,b) => effectivePrice(b) - effectivePrice(a));

  grid.innerHTML = items.length
    ? items.map(p => renderProductCard(p)).join("")
    : `<div class="empty-compare" style="grid-column:1/-1;">Nenhum produto encontrado com esses filtros.</div>`;

  renderCompareBar();
  renderCatalogBreadcrumb();
}

function renderFeatured(){
  const grid = $("#featuredGrid");
  if(!grid) return;
  grid.innerHTML = FEATURED_IDS.map(id => renderProductCard(getProduct(id))).join("");
}

function renderProductCard(p){
  const specFields = CATEGORIES[p.cat].specFields.slice(0,3);
  const specsHTML = specFields.map(([key,label]) =>
    `<li><span>${label}</span><span>${p.specs[key] || "-"}</span></li>`).join("");

  const selected = (state.compareSelection[p.cat] || []).includes(p.id);

  return `
  <article class="product-card" data-id="${p.id}">
    <a href="#produto/${p.id}" class="product-link">
      ${productImageHTML(p)}
      <div class="product-body">
        <span class="product-brand">${p.brand}</span>
        <h3 class="product-name">${p.name}</h3>
        <div class="product-meta-row"><span>SKU: ${p.sku}</span><span>Emb. venda: ${p.embVenda}</span></div>
        <ul class="product-specs">${specsHTML}</ul>
      </div>
    </a>
    <div class="product-body product-body-price">
      <div class="product-price">${priceHTML(p)}</div>
      ${p.cat === "kits" ? `<span class="install-included-note">${ICON_CHECK} Instalação inclusa</span>` : ""}
    </div>
    <div class="product-actions">
      <a href="#produto/${p.id}" class="btn btn-ghost">+ detalhes</a>
      <div class="product-actions-row">
        <label class="compare-check">
          <input type="checkbox" class="compare-checkbox" data-id="${p.id}" data-cat="${p.cat}" ${selected ? "checked" : ""}>
          Comparar
        </label>
        <button class="btn btn-primary btn-add-cart" data-id="${p.id}">${ICON_PLUS}Adicionar</button>
      </div>
    </div>
  </article>`;
}

// Busca
$("#searchInput").addEventListener("input", (e) => {
  state.searchTerm = e.target.value.trim().toLowerCase();
  renderCatalog();
});

// Sort
$("#sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderCatalog();
});

// Delegação de eventos do grid (adicionar carrinho, comparar)
// Reaproveitada tanto no grid do catálogo quanto no grid de destaques da home.
function handleProductGridClick(e){
  const addBtn = e.target.closest(".btn-add-cart");
  if(addBtn){ e.preventDefault(); addToCart(addBtn.dataset.id); }
}
function handleProductGridChange(e){
  if(e.target.classList.contains("compare-checkbox")){
    toggleCompare(e.target.dataset.id, e.target.dataset.cat, e.target);
  }
}

$("#productGrid").addEventListener("click", handleProductGridClick);
$("#productGrid").addEventListener("change", handleProductGridChange);
$("#featuredGrid").addEventListener("click", handleProductGridClick);

/* ======================================================================
   COMPARAÇÃO
   ====================================================================== */
function toggleCompare(id, cat, checkboxEl){
  if(!state.compareSelection[cat]) state.compareSelection[cat] = [];
  const list = state.compareSelection[cat];
  const idx = list.indexOf(id);

  if(idx > -1){
    list.splice(idx,1);
  } else {
    if(list.length >= 3){
      showToast("Você pode comparar no máximo 3 produtos por vez.");
      checkboxEl.checked = false;
      return;
    }
    list.push(id);
  }
  renderCompareBar();
}

function renderCompareBar(){
  const cat = state.currentCategory;
  const list = state.compareSelection[cat] || [];
  const bar = $("#compareBar");
  const chips = $("#compareChips");
  const goBtn = $("#goCompareBtn");

  const visible = list.length > 0;
  bar.classList.toggle("visible", visible);
  document.body.classList.toggle("compare-bar-visible", visible);
  if(!visible) return;

  chips.innerHTML = list.map(id => {
    const p = getProduct(id);
    return `<span class="compare-chip">${p.name} <button data-id="${id}" data-cat="${cat}" class="chip-remove">${ICON_X}</button></span>`;
  }).join("");
  goBtn.disabled = list.length < 2;
  goBtn.textContent = list.length < 2 ? "Selecione ao menos 2" : `Comparar (${list.length})`;
}

$("#compareChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip-remove");
  if(!btn) return;
  const { id, cat } = btn.dataset;
  const list = state.compareSelection[cat] || [];
  const idx = list.indexOf(id);
  if(idx > -1) list.splice(idx,1);
  renderCompareBar();
  renderCatalog();
});

$("#clearCompareBtn").addEventListener("click", () => {
  state.compareSelection[state.currentCategory] = [];
  renderCompareBar();
  renderCatalog();
});

$("#goCompareBtn").addEventListener("click", () => {
  if($("#goCompareBtn").disabled) return;
  location.hash = "#comparar";
});

function renderComparison(){
  const cat = state.currentCategory;
  const ids = state.compareSelection[cat] || [];
  const wrap = $("#compareTableWrap");

  if(ids.length < 2){
    wrap.innerHTML = `<div class="empty-compare">Selecione ao menos 2 produtos da mesma categoria no catálogo para compará-los.<br><a href="#catalogo" class="btn btn-primary">Ir ao catálogo</a></div>`;
    return;
  }

  const products = ids.map(getProduct);
  const fields = CATEGORIES[cat].specFields;

  let html = `<table class="compare-table"><thead><tr><th>Especificação</th>`;
  products.forEach(p => {
    html += `<th class="compare-product-header">
      <div class="mini-thumb">${ICONS[p.cat]}</div>
      <div>${p.brand}</div>
      <div>${p.name}</div>
      <div class="compare-price">${formatBRL(effectivePrice(p))}</div>
    </th>`;
  });
  html += `</tr></thead><tbody>`;

  fields.forEach(([key,label]) => {
    html += `<tr><td class="spec-label">${label}</td>`;
    products.forEach(p => {
      html += `<td>${p.specs[key] || "-"}</td>`;
    });
    html += `</tr>`;
  });

  html += `<tr><td class="spec-label">Ação</td>`;
  products.forEach(p => {
    html += `<td><button class="btn btn-primary btn-add-cart-compare" data-id="${p.id}">${ICON_PLUS}Adicionar</button></td>`;
  });
  html += `</tr>`;

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

$("#compareTableWrap").addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-add-cart-compare");
  if(btn) addToCart(btn.dataset.id);
});

/* ======================================================================
   PÁGINA DE PRODUTO
   ====================================================================== */
function renderProductPage(){
  const p = getProduct(state.currentProductId);
  if(!p){ location.hash = "#catalogo"; return; }
  const cat = CATEGORIES[p.cat];

  $("#productBreadcrumb").innerHTML = crumbHTML([
    DEPARTMENT,
    `<a href="#catalogo">${cat.crumbCategory}</a>`,
    p.subcategoria,
    p.name,
  ]);

  $("#galleryMain").innerHTML = productImageHTML(p, "gallery-main-img");
  const galleryImages = getGalleryImages(p);
  $("#galleryThumbs").innerHTML = galleryImages.length > 1
    ? galleryImages.map((img, i) => `
        <button class="gallery-thumb ${i===0 ? "active" : ""}" data-idx="${i}" data-src="${img.src}" data-alt="${img.alt}" type="button">
          <img src="${img.src}" alt="${img.alt}" loading="lazy">
        </button>`).join("")
    : "";

  $("#productBrandChip").textContent = p.brand;
  $("#productLaunchTag").style.display = p.isLaunch ? "inline-flex" : "none";
  $("#productTitle").textContent = p.name;
  $("#productMeta").innerHTML = `<span>SKU: ${p.sku}</span><span>Emb. venda: ${p.embVenda}</span>`;
  $("#productPagePrice").innerHTML = priceHTML(p);
  const installNote = $("#productInstallNote");
  if(installNote){
    installNote.hidden = p.cat !== "kits";
    if(p.cat === "kits") installNote.innerHTML = `${ICON_CHECK} Preço já inclui instalação e mão de obra`;
  }
  $("#productAddCartBtn").dataset.id = p.id;

  $("#specsHighlight").innerHTML = cat.specFields.map(([key,label]) => `
    <div class="spec-highlight-item">
      <span class="spec-highlight-label">${label}</span>
      <span class="spec-highlight-value">${p.specs[key] || "-"}</span>
    </div>`).join("");

  $("#featuresList").innerHTML = getFeatures(p).map(f => `<li>${ICON_CHECK}<span>${f}</span></li>`).join("");
  $("#warrantyText").textContent = getWarrantyText(p);

  const bundleBlock = $("#bundleBlock");
  if(bundleBlock){
    if(p.bundleItems && p.bundleItems.length){
      $("#bundleItemsList").innerHTML = p.bundleItems.map(item => `
        <li class="bundle-item">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" class="bundle-item-thumb" loading="lazy">` : ""}
          <span><strong>${item.qty}x</strong> ${item.brand} — ${item.name} <em>(SKU: ${item.sku})</em></span>
        </li>`
      ).join("");
      bundleBlock.hidden = false;
    } else {
      bundleBlock.hidden = true;
    }
  }
}

$("#galleryThumbs").addEventListener("click", (e) => {
  const btn = e.target.closest(".gallery-thumb");
  if(!btn) return;
  $all(".gallery-thumb").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  const mainImg = $("#galleryMain .product-photo");
  if(mainImg){
    mainImg.src = btn.dataset.src;
    mainImg.alt = btn.dataset.alt;
  }
});

$("#productAddCartBtn").addEventListener("click", (e) => {
  const id = e.target.closest("button").dataset.id;
  if(id) addToCart(id);
});

$("#datasheetBtn").addEventListener("click", () => {
  showToast("Datasheet será disponibilizado quando o catálogo real for integrado");
});

/* ======================================================================
   MONTE SEU PROJETO (CONFIGURADOR / WIZARD)
   ====================================================================== */
function renderConfiguradorView(){
  if(state.configurator.active){
    $("#methodsGrid").style.display = "none";
    $(".methods-note").style.display = "none";
    $("#wizard").hidden = false;
    renderWizardStep();
  } else {
    $("#methodsGrid").style.display = "";
    $(".methods-note").style.display = "";
    $("#wizard").hidden = true;
  }
}

function recommendInverterId(){
  const painelList = PRODUCTS.filter(p => p.cat === "paineis");
  const painel = getProduct(state.configurator.paineis.id) || painelList[0];
  const wp = parseFloat(painel.specs.potencia) || 450;
  const totalKw = (wp * state.configurator.paineis.qty) / 1000;

  const inversores = PRODUCTS.filter(p => p.cat === "inversores");
  let best = inversores[0];
  let bestDiff = Infinity;
  inversores.forEach(p => {
    const diff = Math.abs(p.powerKw - totalKw);
    if(diff < bestDiff){ bestDiff = diff; best = p; }
  });
  return best.id;
}

function startWizard(){
  const cfg = state.configurator;
  cfg.active = true;
  cfg.step = 0;
  if(!cfg.paineis.id) cfg.paineis.id = "pn1";
  if(!cfg.inversor.id) cfg.inversor.id = recommendInverterId();
  if(!cfg.cabo.id) cfg.cabo.id = "cb6";
  if(!cfg.conector.id) cfg.conector.id = "cb7";
  if(!cfg.estrutura.id) cfg.estrutura.id = "es1";
  renderConfiguradorView();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function cancelWizard(){
  state.configurator.active = false;
  renderConfiguradorView();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderWizardStepper(){
  const stepIdx = state.configurator.step;
  $("#wizardStepper").innerHTML = WIZARD_STEPS.map((s,i) => {
    const status = i < stepIdx ? "done" : (i === stepIdx ? "active" : "");
    return `<div class="wizard-step ${status}">
      <span class="wizard-step-circle">${i < stepIdx ? ICON_CHECK : (i+1)}</span>
      <span class="wizard-step-label">${s.label}</span>
    </div>`;
  }).join("");
}

function renderWizardOptionsHTML(stepDef){
  const items = PRODUCTS.filter(p => p.cat === stepDef.cat);
  const selectedId = state.configurator[stepDef.key].id;
  const recommendedId = stepDef.key === "inversor" ? recommendInverterId() : null;

  const cardsHTML = items.map(p => {
    const isSelected = p.id === selectedId;
    return `
    <label class="wizard-option-card ${isSelected ? "selected" : ""}" data-cat="${stepDef.key}" data-id="${p.id}">
      <input type="radio" name="wizardOption-${stepDef.key}" value="${p.id}" ${isSelected ? "checked" : ""}>
      ${productImageHTML(p, "wizard-option-image")}
      <div class="wizard-option-body">
        <span class="product-brand">${p.brand}</span>
        <h4>${p.name}</h4>
        <span class="wizard-option-price">${formatBRL(effectivePrice(p))}</span>
        ${p.id === recommendedId ? `<span class="recommended-tag">${ICON_CHECK}Recomendado</span>` : ""}
      </div>
    </label>`;
  }).join("");

  let extra = "";
  if(stepDef.key === "paineis"){
    extra = `
    <div class="wizard-qty-row">
      <span>Quantidade de painéis</span>
      <div class="qty-control">
        <button type="button" id="wizardQtyMinus">${ICON_MINUS}</button>
        <span id="wizardQtyValue">${state.configurator.paineis.qty}</span>
        <button type="button" id="wizardQtyPlus">${ICON_PLUS}</button>
      </div>
    </div>`;
  }

  return `
    <h2 class="wizard-step-title">${stepDef.title}</h2>
    <p class="wizard-step-sub">${stepDef.sub}</p>
    ${extra}
    <div class="wizard-option-grid">${cardsHTML}</div>
  `;
}

function renderWizardCabosHTML(){
  const cfg = state.configurator;
  const cabo = getProduct(cfg.cabo.id);
  const conector = getProduct(cfg.conector.id);

  return `
    <h2 class="wizard-step-title">Cabos e Conectores</h2>
    <p class="wizard-step-sub">Já incluímos o padrão recomendado para a maioria das instalações residenciais. Ajuste as quantidades se o seu projeto precisar de mais.</p>

    <div class="wizard-fixed-item">
      ${productImageHTML(cabo, "wizard-option-image")}
      <div class="wizard-fixed-item-body">
        <span class="product-brand">${cabo.brand}</span>
        <h4>${cabo.name}</h4>
        <p class="wizard-fixed-item-note">Padrão: 30 metros de cabo solar 6mm² — ajuste a quantidade conforme a distância do seu projeto (lembre de somar o cabo vermelho e o preto à parte, no catálogo).</p>
        <span class="wizard-option-price">${formatBRL(effectivePrice(cabo))} / metro</span>
      </div>
      <div class="qty-control">
        <button type="button" id="caboQtyMinus">${ICON_MINUS}</button>
        <span id="caboQtyValue">${cfg.cabo.qty}</span>
        <button type="button" id="caboQtyPlus">${ICON_PLUS}</button>
      </div>
    </div>

    <div class="wizard-fixed-item">
      ${productImageHTML(conector, "wizard-option-image")}
      <div class="wizard-fixed-item-body">
        <span class="product-brand">${conector.brand}</span>
        <h4>${conector.name}</h4>
        <p class="wizard-fixed-item-note">Padrão: 2 pares de conector fotovoltaico MC4. Adicione mais pares se o seu projeto tiver mais conexões.</p>
        <span class="wizard-option-price">${formatBRL(effectivePrice(conector))} / par</span>
      </div>
      <div class="qty-control">
        <button type="button" id="conectorQtyMinus">${ICON_MINUS}</button>
        <span id="conectorQtyValue">${cfg.conector.qty}</span>
        <button type="button" id="conectorQtyPlus">${ICON_PLUS}</button>
      </div>
    </div>

    <p class="wizard-fixed-item-hint">Precisa de outra bitola de cabo ou mais conectores do que o padrão? Você também encontra essas opções avulsas no <a href="#catalogo">catálogo</a>.</p>
  `;
}

function renderWizardSummaryHTML(){
  const cfg = state.configurator;
  const painel = getProduct(cfg.paineis.id);
  const totalKwp = (parseFloat(painel.specs.potencia) * cfg.paineis.qty) / 1000;

  const rows = [
    { p: painel, qty: cfg.paineis.qty },
    { p: getProduct(cfg.inversor.id), qty: 1 },
    { p: getProduct(cfg.cabo.id), qty: cfg.cabo.qty },
    { p: getProduct(cfg.conector.id), qty: cfg.conector.qty },
    { p: getProduct(cfg.estrutura.id), qty: 1 },
  ];
  const total = rows.reduce((sum, r) => sum + effectivePrice(r.p) * r.qty, 0);

  const rowsHTML = rows.map(r => `
    <div class="wizard-summary-row">
      <div class="wizard-summary-thumb">${ICONS[r.p.cat]}</div>
      <div class="wizard-summary-info">
        <span class="wizard-summary-cat">${CATEGORIES[r.p.cat].label}</span>
        <span class="wizard-summary-name">${r.qty}x ${r.p.name}</span>
      </div>
      <span class="wizard-summary-price">${formatBRL(effectivePrice(r.p) * r.qty)}</span>
    </div>`).join("");

  return `
    <h2 class="wizard-step-title">Resumo do Projeto</h2>
    <p class="wizard-step-sub">Confira os itens selecionados antes de adicionar ao carrinho.</p>
    <div class="wizard-summary-kwp">
      <span>Potência do sistema (kWp)</span>
      <strong>${totalKwp.toFixed(2).replace(".", ",")} kWp</strong>
    </div>
    <div class="wizard-summary-list">${rowsHTML}</div>
    <div class="wizard-summary-total"><span>Total do projeto</span><span>${formatBRL(total)}</span></div>
  `;
}

function renderWizardStep(){
  const stepDef = WIZARD_STEPS[state.configurator.step];
  renderWizardStepper();
  $("#wizardProgressText").textContent = `Passo ${state.configurator.step + 1} de ${WIZARD_STEPS.length}: ${stepDef.title}`;

  $("#wizardContent").innerHTML = stepDef.key === "resumo"
    ? renderWizardSummaryHTML()
    : stepDef.key === "cabos"
      ? renderWizardCabosHTML()
      : renderWizardOptionsHTML(stepDef);

  $("#wizardBackBtn").textContent = state.configurator.step === 0 ? "Cancelar" : "Voltar";
  $("#wizardNextBtn").textContent = stepDef.key === "resumo" ? "Adicionar tudo ao carrinho" : "Avançar";
}

function addWizardToCart(){
  const cfg = state.configurator;
  const items = [
    { id: cfg.paineis.id, qty: cfg.paineis.qty },
    { id: cfg.inversor.id, qty: 1 },
    { id: cfg.cabo.id, qty: cfg.cabo.qty },
    { id: cfg.conector.id, qty: cfg.conector.qty },
    { id: cfg.estrutura.id, qty: 1 },
  ];
  items.forEach(({ id, qty }) => {
    const existing = state.cart.find(i => i.id === id);
    if(existing) existing.qty += qty;
    else state.cart.push({ id, qty });
  });
  updateCartCount(true);
  showToast("Kit completo adicionado ao carrinho!");

  cfg.active = false;
  cfg.step = 0;
  location.hash = "#carrinho";
}

$("#startWizardBtn").addEventListener("click", startWizard);
$("#wizardCancelBtn").addEventListener("click", cancelWizard);

$("#wizardBackBtn").addEventListener("click", () => {
  if(state.configurator.step === 0){ cancelWizard(); return; }
  state.configurator.step--;
  renderWizardStep();
  window.scrollTo({ top: 0, behavior: "auto" });
});

$("#wizardNextBtn").addEventListener("click", () => {
  const stepDef = WIZARD_STEPS[state.configurator.step];
  if(stepDef.key === "resumo"){ addWizardToCart(); return; }
  if(state.configurator.step < WIZARD_STEPS.length - 1){
    state.configurator.step++;
    renderWizardStep();
    window.scrollTo({ top: 0, behavior: "auto" });
  }
});

$("#wizardContent").addEventListener("click", (e) => {
  const card = e.target.closest(".wizard-option-card");
  if(card){
    const { cat, id } = card.dataset;
    state.configurator[cat].id = id;
    renderWizardStep();
    return;
  }
  if(e.target.closest("#wizardQtyPlus")){
    state.configurator.paineis.qty++;
    renderWizardStep();
    return;
  }
  if(e.target.closest("#wizardQtyMinus")){
    state.configurator.paineis.qty = Math.max(1, state.configurator.paineis.qty - 1);
    renderWizardStep();
    return;
  }
  if(e.target.closest("#caboQtyPlus")){
    state.configurator.cabo.qty++;
    renderWizardStep();
    return;
  }
  if(e.target.closest("#caboQtyMinus")){
    state.configurator.cabo.qty = Math.max(1, state.configurator.cabo.qty - 1);
    renderWizardStep();
    return;
  }
  if(e.target.closest("#conectorQtyPlus")){
    state.configurator.conector.qty++;
    renderWizardStep();
    return;
  }
  if(e.target.closest("#conectorQtyMinus")){
    state.configurator.conector.qty = Math.max(1, state.configurator.conector.qty - 1);
    renderWizardStep();
  }
});

/* ======================================================================
   CARRINHO
   ====================================================================== */
function addToCart(id){
  const item = state.cart.find(i => i.id === id);
  if(item) item.qty += 1;
  else state.cart.push({ id, qty: 1 });
  updateCartCount(true);
  showToast("Produto adicionado ao carrinho");
}

function updateCartCount(bump){
  const total = state.cart.reduce((sum,i) => sum + i.qty, 0);
  const el = $("#cartCount");
  el.textContent = total;
  if(bump){
    el.classList.remove("bump");
    void el.offsetWidth; // reinicia animação
    el.classList.add("bump");
  }
  updateMobileCartBar();
  saveCartToStorage();
}

/* ---------------------- PERSISTÊNCIA DO CARRINHO (localStorage) ---------------------- */
function saveCartToStorage(){
  try{
    localStorage.setItem("mes_cart", JSON.stringify(state.cart));
  }catch(err){
    // localStorage indisponível (modo privado, quota cheia etc.), ignora
  }
}

function loadCartFromStorage(){
  try{
    const raw = localStorage.getItem("mes_cart");
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) return;
    state.cart = parsed.filter(i =>
      i && typeof i.id === "string" && typeof i.qty === "number" && i.qty > 0 && getProduct(i.id)
    );
  }catch(err){
    // JSON corrompido, ignora e mantém carrinho vazio
  }
}

/* ---------------------- BARRA FIXA DE CARRINHO (mobile) ---------------------- */
function updateMobileCartBar(){
  const bar = $("#mobileCartBar");
  if(!bar) return;
  const hash = location.hash.replace("#","") || "home";
  const showOn = ["home","comparar","produto","configurador"];
  const count = state.cart.reduce((sum,i) => sum + i.qty, 0);

  if(count > 0 && showOn.includes(hash)){
    bar.classList.add("visible");
    document.body.classList.add("mobile-cart-visible");
    $("#mobileCartCount").textContent = count === 1 ? "1 item" : `${count} itens`;
    $("#mobileCartTotal").textContent = formatBRL(cartTotalValue());
  } else {
    bar.classList.remove("visible");
    document.body.classList.remove("mobile-cart-visible");
  }
}

function cartTotalValue(){
  return state.cart.reduce((sum,i) => sum + effectivePrice(getProduct(i.id)) * i.qty, 0);
}

/* ======================================================================
   COMPRA ASSISTIDA (parceiro comprando pelo catálogo pra um cliente)
   ---------------------------------------------------------------------
   Espelha ASSISTED_TIERS do backend (backend/src/partners.js): desconto
   + comissão soma sempre 10. Só é oferecida quando o cliente logado é o
   dono do próprio código ?ref= ativo — ver checarCompraAssistida, chamada
   no checkout (é onde já checamos login).
   ====================================================================== */
const ASSISTED_TIERS = { 0: 10, 5: 5, 10: 0 };

async function checarCompraAssistida(customer){
  state.partnerAssisted.active = false;
  const ref = window.MES_REF ? window.MES_REF.get() : "";
  if(!ref || !customer) return;
  try{
    const res = await fetch(`${API_BASE}/api/partners/me`, { credentials: "include" });
    const data = await res.json();
    const partner = data.ok ? data.partner : null;
    state.partnerAssisted.active = !!(partner && partner.status === "ativo" && partner.codigo === ref);
  } catch(err){
    // sem backend: segue como compra normal, sem o modo assistido.
  }
}

function cartFinalTotal(){
  const subtotal = cartTotalValue();
  if(!state.partnerAssisted.active) return subtotal;
  return subtotal * (1 - state.partnerAssisted.tier / 100);
}

function renderPartnerAssistedBox(){
  const box = $("#checkoutPartnerBox");
  const row = $("#checkoutDescontoRow");
  if(!box) return;
  box.hidden = !state.partnerAssisted.active;
  if(row) row.hidden = !state.partnerAssisted.active;
  if(!state.partnerAssisted.active) return;

  const subtotal = cartTotalValue();
  const tier = state.partnerAssisted.tier;
  const descontoValor = subtotal * (tier / 100);
  const comissaoPct = ASSISTED_TIERS[tier];
  const comissaoValor = (subtotal - descontoValor) * (comissaoPct / 100);

  $all('input[name="partnerDesconto"]').forEach(r => r.checked = Number(r.value) === tier);
  if($("#checkoutDescontoValor")) $("#checkoutDescontoValor").textContent = `- ${formatBRL(descontoValor)}`;
  if($("#checkoutPartnerComissaoPct")) $("#checkoutPartnerComissaoPct").textContent = `${comissaoPct}%`;
  if($("#checkoutPartnerComissaoValor")) $("#checkoutPartnerComissaoValor").textContent = formatBRL(comissaoValor);
}

$all('input[name="partnerDesconto"]').forEach(radio => {
  radio.addEventListener("change", () => {
    state.partnerAssisted.tier = Number(radio.value) || 0;
    renderPartnerAssistedBox();
    atualizarTotaisCheckout();
  });
});

function renderCart(){
  const list = $("#cartItemsList");
  const emptyMsg = `<p class="empty-msg" id="emptyCartMsg">Seu carrinho está vazio. <a href="#catalogo">Ver catálogo</a></p>`;

  if(state.cart.length === 0){
    list.innerHTML = emptyMsg;
  } else {
    list.innerHTML = state.cart.map(item => {
      const p = getProduct(item.id);
      return `
      <div class="cart-item" data-id="${p.id}">
        <div class="cart-item-thumb">${ICONS[p.cat]}</div>
        <div class="cart-item-info">
          <span class="cart-item-cat">${CATEGORIES[p.cat].label}</span>
          <span class="cart-item-name">${p.name}</span>
          <span class="cart-item-price">${formatBRL(effectivePrice(p))} / ${unidadePreco(p)}</span>
        </div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-minus" data-id="${p.id}">${ICON_MINUS}</button>
            <span>${item.qty}</span>
            <button class="qty-plus" data-id="${p.id}">${ICON_PLUS}</button>
          </div>
          <span class="item-line-total">${formatBRL(effectivePrice(p) * item.qty)}</span>
          <button class="remove-btn" data-id="${p.id}">${ICON_TRASH}Remover</button>
        </div>
      </div>`;
    }).join("");
  }

  const total = cartTotalValue();
  $("#cartSubtotal").textContent = formatBRL(total);
  $("#cartTotal").textContent = formatBRL(total);
  $("#goCheckoutBtn").disabled = state.cart.length === 0;
}

$("#cartItemsList").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if(!btn) return;
  const id = btn.dataset.id;

  if(btn.classList.contains("qty-plus")){
    state.cart.find(i => i.id === id).qty += 1;
  }
  if(btn.classList.contains("qty-minus")){
    const item = state.cart.find(i => i.id === id);
    item.qty -= 1;
    if(item.qty <= 0) state.cart = state.cart.filter(i => i.id !== id);
  }
  if(btn.classList.contains("remove-btn")){
    state.cart = state.cart.filter(i => i.id !== id);
  }
  updateCartCount();
  renderCart();
});

$("#goCheckoutBtn").addEventListener("click", async () => {
  if(state.cart.length === 0) return;
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.getCustomer() : null;
  if(!customer){
    window.location.href = "conta/entrar.html?redirect=" + encodeURIComponent("loja.html#checkout");
    return;
  }
  location.hash = "#checkout";
});

/* ---------------------- PRÉ-PREENCHIMENTO COM DADOS DA CONTA ----------------------
   Puxa nome/CPF/e-mail/telefone e o último endereço salvo (se a pessoa já
   comprou antes — ver saveEnderecoNaConta, mais abaixo) pra poupar retrabalho.
   Só preenche campos vazios: se a pessoa já editou algo nesta mesma visita,
   isso não é sobrescrito. */
function preencherCheckoutComCliente(customer){
  const setIfEmpty = (id, value) => {
    const el = $(id);
    if(el && !el.value && value) el.value = value;
  };
  setIfEmpty("#checkoutNome", customer.nome);
  setIfEmpty("#checkoutCpf", customer.cpf);
  setIfEmpty("#checkoutEmail", customer.email);
  setIfEmpty("#checkoutTelefone", customer.telefone);

  const end = customer.endereco || {};
  setIfEmpty("#checkoutCep", end.cep);
  setIfEmpty("#checkoutCidade", end.cidade);
  setIfEmpty("#checkoutEstado", end.estado);
  setIfEmpty("#checkoutRua", end.rua);
  setIfEmpty("#checkoutNumero", end.numero);
  setIfEmpty("#checkoutBairro", end.bairro);
  setIfEmpty("#checkoutComplemento", end.complemento);

  const hint = $("#checkoutEnderecoSalvoHint");
  if(hint) hint.hidden = !(end.cep || end.rua || end.cidade);
}

// Salva o endereço preenchido no checkout de volta na conta do cliente,
// pra já vir pronto na próxima compra. "Melhor esforço": se falhar (rede
// instável, backend fora do ar), não impede a confirmação do pedido —
// só significa que a pessoa preenche de novo da próxima vez.
async function saveEnderecoNaConta(endereco){
  try{
    await fetch(`${API_BASE}/api/customers/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ endereco }),
    });
  } catch(err){
    // silencioso de propósito — ver comentário acima.
  }
}

/* ======================================================================
   CHECKOUT
   ====================================================================== */
async function renderCheckout(){
  if(state.cart.length === 0){
    location.hash = "#catalogo";
    return;
  }
  // Segunda trava: cobre quem chega direto em #checkout pela URL, sem
  // passar pelo botão "Finalizar Compra" acima.
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.getCustomer() : null;
  if(!customer){
    window.location.href = "conta/entrar.html?redirect=" + encodeURIComponent("loja.html#checkout");
    return;
  }
  preencherCheckoutComCliente(customer);
  await checarCompraAssistida(customer);
  if(!state.partnerAssisted.active) state.partnerAssisted.tier = 0;

  const list = $("#checkoutItemsList");
  list.innerHTML = state.cart.map(item => {
    const p = getProduct(item.id);
    return `<div class="checkout-item-row"><span>${item.qty}x ${p.name}</span><span>${formatBRL(effectivePrice(p) * item.qty)}</span></div>`;
  }).join("");

  renderPartnerAssistedBox();
  atualizarTotaisCheckout();
}

function atualizarTotaisCheckout(){
  const subtotal = cartTotalValue();
  const total = cartFinalTotal();
  $("#checkoutSubtotal").textContent = formatBRL(subtotal);
  $("#checkoutTotal").textContent = formatBRL(total);
  $("#checkoutParcelamento").textContent = `ou ${formatParcelamento(total)} no cartão`;
  popularParcelasCheckout(total);
}

/* ---------------------- PARCELAS NO CHECKOUT ----------------------
   Preenche o <select> de parcelas com base no total atual do carrinho e
   mostra/esconde esse campo conforme a forma de pagamento escolhida.
   O valor selecionado aqui (1 a 10x) é o que vai no payload do pedido —
   ver PONTO DE INTEGRAÇÃO DE PAGAMENTO, mais abaixo. */
function popularParcelasCheckout(total){
  const select = $("#checkoutParcelasSelect");
  if(!select) return;
  select.innerHTML = Array.from({ length: MAX_PARCELAS_SEM_JUROS }, (_, i) => i + 1)
    .map(n => `<option value="${n}">${n === 1 ? `1x de ${formatBRL(total)} (à vista)` : formatParcelamento(total, n)}</option>`)
    .join("");
}

function atualizarVisibilidadeParcelas(){
  const cartaoSelecionado = $("#checkoutPagamentoCartao")?.checked;
  const box = $("#checkoutInstallmentsBox");
  if(box) box.hidden = !cartaoSelecionado;
}

$all('input[name="pagamento"]').forEach(radio => {
  radio.addEventListener("change", atualizarVisibilidadeParcelas);
});

/* ---------------------- BUSCA DE CEP (autopreenchimento) ----------------------
   Usa a API pública e gratuita ViaCEP (viacep.com.br) para preencher cidade,
   estado, rua e bairro a partir do CEP. Os campos continuam editáveis
   normalmente; a pessoa pode corrigir ou completar à mão a qualquer momento. */
async function buscarEnderecoPorCep(rawCep){
  const cep = String(rawCep || "").replace(/\D/g, "");
  const statusEl = $("#checkoutCepStatus");

  if(cep.length !== 8){
    if(statusEl) statusEl.hidden = true;
    return;
  }

  if(statusEl){
    statusEl.hidden = false;
    statusEl.className = "field-hint";
    statusEl.textContent = "Buscando endereço...";
  }

  try{
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if(data.erro){
      if(statusEl){
        statusEl.className = "field-hint field-hint-error";
        statusEl.textContent = "CEP não encontrado. Preencha o endereço manualmente.";
      }
      return;
    }

    const cidadeEl = $("#checkoutCidade");
    const estadoEl = $("#checkoutEstado");
    const ruaEl = $("#checkoutRua");
    const bairroEl = $("#checkoutBairro");
    if(cidadeEl) cidadeEl.value = data.localidade || cidadeEl.value;
    if(estadoEl) estadoEl.value = data.uf || estadoEl.value;
    if(ruaEl) ruaEl.value = data.logradouro || ruaEl.value;
    if(bairroEl) bairroEl.value = data.bairro || bairroEl.value;

    if(statusEl){
      statusEl.className = "field-hint field-hint-ok";
      statusEl.textContent = "Endereço encontrado. Confira e complete se precisar.";
    }
  } catch(err){
    if(statusEl){
      statusEl.className = "field-hint field-hint-error";
      statusEl.textContent = "Não foi possível buscar o CEP agora. Preencha manualmente.";
    }
  }
}

const checkoutCepInput = $("#checkoutCep");
if(checkoutCepInput){
  checkoutCepInput.addEventListener("input", () => {
    const digits = checkoutCepInput.value.replace(/\D/g, "").slice(0, 8);
    checkoutCepInput.value = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits;
    if(digits.length === 8) buscarEnderecoPorCep(digits);
  });
  checkoutCepInput.addEventListener("blur", () => buscarEnderecoPorCep(checkoutCepInput.value));
}

$("#checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = $("#checkoutSubmitBtn");
  const errorBox = $("#checkoutError");
  errorBox.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando pedido...";

  const formData = new FormData(e.target);
  const payload = {
    nome: formData.get("nome"),
    cpf: formData.get("cpf"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    cep: formData.get("cep"),
    cidade: formData.get("cidade"),
    estado: formData.get("estado"),
    rua: formData.get("rua"),
    numero: formData.get("numero"),
    bairro: formData.get("bairro"),
    complemento: formData.get("complemento") || "",
    pagamento: formData.get("pagamento"),
    // Só faz sentido no cartão — Pix/boleto são à vista (ver formatParcelamento/
    // MAX_PARCELAS_SEM_JUROS, mais acima).
    parcelas: formData.get("pagamento") === "cartao" ? Number(formData.get("parcelas")) || 1 : null,
    ref: window.MES_REF ? window.MES_REF.get() : "",
    // Só tem efeito quando é o próprio parceiro comprando pra um cliente
    // (ver checarCompraAssistida) — o backend confere isso de novo antes
    // de aplicar; enviar esse campo fora desse caso não muda nada.
    descontoParceiro: state.partnerAssisted.active ? state.partnerAssisted.tier : undefined,
    itens: state.cart.map(item => {
      const p = getProduct(item.id);
      return { id: p.id, nome: p.name, marca: p.brand, preco: effectivePrice(p), qty: item.qty };
    }),
    subtotal: cartTotalValue(),
    total: cartFinalTotal(),
  };

  /* =====================================================================
     PONTO DE INTEGRAÇÃO DE PAGAMENTO (produção)
     ---------------------------------------------------------------------
     O pedido já é persistido de verdade no backend (ver backend/), e o
     payload acima já sai "engatilhado" pro gateway: `payload.pagamento`
     (pix/cartao/boleto) e `payload.parcelas` (1 a 10, só preenchido no
     cartão — ver MAX_PARCELAS_SEM_JUROS lá em cima) são exatamente os dois
     dados que qualquer gateway (Mercado Pago / PagSeguro / Stripe) pede
     pra abrir uma cobrança parcelada. Falta só:
       1. Antes do fetch abaixo, chamar o SDK/API do gateway escolhido
          passando { valor: payload.total, parcelas: payload.parcelas,
          metodo: payload.pagamento, ... dados do cliente/cartão } e
          aguardar a confirmação (ou o token/QR code, no caso de Pix).
       2. Só então confirmar o pedido aqui (ou marcar como "confirmado"
          já na criação, em vez de "novo" — ver VALID_STATUSES em
          backend/src/orders.js).
     Nenhuma cobrança real acontece hoje — o pedido é só registrado como
     "novo" e a equipe fecha o pagamento por fora.
     ===================================================================== */

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if(!data.ok){
      errorBox.textContent = data.error || "Não foi possível registrar o pedido. Tente novamente.";
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Finalizar Pedido";
      return;
    }

    $("#orderNumber").textContent = data.orderNumber;
    saveEnderecoNaConta({
      cep: payload.cep, cidade: payload.cidade, estado: payload.estado, rua: payload.rua,
      numero: payload.numero, bairro: payload.bairro, complemento: payload.complemento,
    });
    state.cart = [];
    updateCartCount();
    location.hash = "#confirmacao";
  } catch(err){
    errorBox.textContent = "Não foi possível conectar ao servidor. Verifique se o backend está rodando (ver README) e tente novamente.";
    errorBox.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Finalizar Pedido";
  }
});

/* ======================================================================
   FAQ (accordion)
   ====================================================================== */
const faqList = $("#faqList");
if(faqList){
  faqList.addEventListener("click", (e) => {
    const btn = e.target.closest(".faq-question");
    if(!btn) return;
    const item = btn.closest(".faq-item");
    const answer = item.querySelector(".faq-answer");
    const isOpen = item.classList.contains("open");

    $all(".faq-item.open", faqList).forEach(other => {
      if(other !== item){
        other.classList.remove("open");
        other.querySelector(".faq-answer").style.maxHeight = null;
      }
    });

    item.classList.toggle("open", !isOpen);
    answer.style.maxHeight = !isOpen ? answer.scrollHeight + "px" : null;
  });
}

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

/* ======================================================================
   INICIALIZAÇÃO
   ====================================================================== */
renderTabs();

async function initApp(){
  const ok = await loadProducts();
  if(!ok){
    const main = $("#productGrid") || document.querySelector("main") || document.body;
    if(main){
      const warn = document.createElement("p");
      warn.className = "catalog-load-error";
      warn.textContent = "Não foi possível carregar o catálogo agora. Recarregue a página ou tente novamente em instantes.";
      main.prepend(warn);
    }
  }
  loadCartFromStorage();
  renderFeatured();
  navigate();
  updateCartCount();
}
initApp();
