/* =====================================================================
   MARQUES ENERGIA SOLAR — PROTÓTIPO DE E-COMMERCE
   Dados de catálogo são PLACEHOLDER (o cliente ainda vai fornecer o
   catálogo real). Não há integração de pagamento real — ver seção
   CHECKOUT / PAYMENT INTEGRATION POINT mais abaixo.
   ===================================================================== */

/* ---------------------- ÍCONES (estilo line-icon, tipo lucide) ---------------------- */
const ICONS = {
  paineis: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4" y1="12" x2="2" y2="12"/><line x1="22" y1="12" x2="20" y2="12"/><line x1="19.07" y1="4.93" x2="17.66" y2="6.34"/><line x1="6.34" y1="17.66" x2="4.93" y2="19.07"/><line x1="19.07" y1="19.07" x2="17.66" y2="17.66"/><line x1="6.34" y1="6.34" x2="4.93" y2="4.93"/></svg>`,
  inversores: `<svg class="icon" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>`,
  cabos: `<svg class="icon" viewBox="0 0 24 24"><path d="M9 17H7a5 5 0 0 1 0-10h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  estrutura: `<svg class="icon" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z"/></svg>`,
};

const ICON_TRASH = `<svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_PLUS = `<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_MINUS = `<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_CHECK = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_MENU = `<svg class="icon" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
const ICON_X = `<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/* ---------------------- CONFIG DE CATEGORIAS ---------------------- */
const CATEGORIES = {
  paineis:    { label: "Painéis Solares",                 specFields: [
      ["potencia","Potência"], ["tipo","Tipo de célula"], ["eficiencia","Eficiência"],
      ["tensaoMax","Tensão máxima"], ["correnteMax","Corrente máxima"],
      ["dimensoes","Dimensões"], ["peso","Peso"], ["garantia","Garantia"]
    ] },
  inversores: { label: "Inversores",                        specFields: [
      ["potencia","Potência"], ["mppt","Entradas MPPT"], ["tensaoSaida","Tensão de saída"],
      ["eficiencia","Eficiência máxima"], ["comunicacao","Comunicação"],
      ["protecao","Grau de proteção"], ["garantia","Garantia"]
    ] },
  cabos:      { label: "Kits de Cabos/Fios",                specFields: [
      ["bitola","Bitola"], ["comprimento","Comprimento"], ["isolacao","Isolação"],
      ["tensaoMax","Tensão máxima"], ["resistencia","Resistência"]
    ] },
  estrutura:  { label: "Parafusos e Estrutura",             specFields: [
      ["material","Material"], ["capacidade","Capacidade/Uso"], ["fixacao","Tipo de fixação"],
      ["resistencia","Resistência"], ["garantia","Garantia"]
    ] },
};

/* ---------------------- CATÁLOGO (DADOS DE EXEMPLO) ---------------------- */
const PRODUCTS = [
  // ---------- PAINÉIS SOLARES ----------
  { id:"pn1", cat:"paineis", brand:"SunMax Pro", name:"Painel Solar Monocristalino 450W", price:799.00,
    badge:"Mais vendido",
    specs:{ potencia:"450 Wp", tipo:"Monocristalino PERC", eficiencia:"21,2%", tensaoMax:"41,5 V",
      correnteMax:"10,85 A", dimensoes:"2094 x 1038 x 35 mm", peso:"22,5 kg", garantia:"25 anos (performance) / 12 anos (produto)" } },
  { id:"pn2", cat:"paineis", brand:"SunMax Pro", name:"Painel Solar Monocristalino 550W", price:949.00,
    specs:{ potencia:"550 Wp", tipo:"Monocristalino PERC Half-Cell", eficiencia:"21,4%", tensaoMax:"49,5 V",
      correnteMax:"11,11 A", dimensoes:"2278 x 1134 x 35 mm", peso:"27,5 kg", garantia:"25 anos (performance) / 12 anos (produto)" } },
  { id:"pn3", cat:"paineis", brand:"SolTech Bifacial", name:"Painel Solar Bifacial 600W", price:1249.00,
    badge:"Alta performance",
    specs:{ potencia:"600 Wp", tipo:"Bifacial Monocristalino (ganho até 25%)", eficiencia:"22,1%", tensaoMax:"51,2 V",
      correnteMax:"11,7 A", dimensoes:"2384 x 1303 x 35 mm", peso:"31,8 kg", garantia:"30 anos (performance) / 15 anos (produto)" } },
  { id:"pn4", cat:"paineis", brand:"EcoWatt Basic", name:"Painel Solar Policristalino 340W", price:549.00,
    badge:"Melhor custo-benefício",
    specs:{ potencia:"340 Wp", tipo:"Policristalino", eficiencia:"17,4%", tensaoMax:"38,2 V",
      correnteMax:"8,9 A", dimensoes:"1956 x 992 x 40 mm", peso:"19,5 kg", garantia:"25 anos (performance) / 10 anos (produto)" } },
  { id:"pn5", cat:"paineis", brand:"SunMax Lite", name:"Painel Solar Monocristalino 500W", price:869.00,
    specs:{ potencia:"500 Wp", tipo:"Monocristalino Half-Cell", eficiencia:"20,8%", tensaoMax:"45,8 V",
      correnteMax:"10,9 A", dimensoes:"2172 x 1116 x 35 mm", peso:"24,9 kg", garantia:"25 anos (performance) / 12 anos (produto)" } },
  { id:"pn6", cat:"paineis", brand:"SolTech Max", name:"Painel Solar Monocristalino TOPCon 665W", price:1399.00,
    badge:"Novo",
    specs:{ potencia:"665 Wp", tipo:"Monocristalino TOPCon", eficiencia:"22,3%", tensaoMax:"55,3 V",
      correnteMax:"12,03 A", dimensoes:"2465 x 1134 x 35 mm", peso:"34,2 kg", garantia:"30 anos (performance) / 15 anos (produto)" } },

  // ---------- INVERSORES ----------
  { id:"iv1", cat:"inversores", brand:"PowerVolt Grid", name:"Inversor String 3kW Monofásico", price:2399.00,
    specs:{ potencia:"3 kW", mppt:"2 MPPT", tensaoSaida:"220V Monofásico", eficiencia:"97,6%",
      comunicacao:"Wi-Fi + App de monitoramento", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },
  { id:"iv2", cat:"inversores", brand:"PowerVolt Grid", name:"Inversor String 5kW Monofásico", price:3299.00,
    badge:"Mais vendido",
    specs:{ potencia:"5 kW", mppt:"2 MPPT", tensaoSaida:"220V Monofásico", eficiencia:"98,0%",
      comunicacao:"Wi-Fi + App de monitoramento", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },
  { id:"iv3", cat:"inversores", brand:"PowerVolt Tri", name:"Inversor String 8kW Trifásico", price:5799.00,
    specs:{ potencia:"8 kW", mppt:"2 MPPT", tensaoSaida:"380V Trifásico", eficiencia:"98,3%",
      comunicacao:"Wi-Fi + RS485", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },
  { id:"iv4", cat:"inversores", brand:"PowerVolt Tri Max", name:"Inversor String 10kW Trifásico", price:6999.00,
    badge:"Alta performance",
    specs:{ potencia:"10 kW", mppt:"3 MPPT", tensaoSaida:"380V Trifásico", eficiencia:"98,4%",
      comunicacao:"Wi-Fi + RS485 + 4G (opcional)", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },
  { id:"iv5", cat:"inversores", brand:"MicroSun", name:"Kit Microinversor 600W (4 unidades)", price:2199.00,
    badge:"Novo",
    specs:{ potencia:"600 W por unidade", mppt:"1 MPPT por painel", tensaoSaida:"220V Monofásico", eficiencia:"96,7%",
      comunicacao:"Monitoramento individual por painel via app", protecao:"IP67", garantia:"12 anos (extensível até 25)" } },
  { id:"iv6", cat:"inversores", brand:"PowerVolt Hybrid", name:"Inversor Híbrido 5kW (compatível c/ bateria)", price:7499.00,
    specs:{ potencia:"5 kW", mppt:"2 MPPT + entrada bateria 48V", tensaoSaida:"220V Monofásico", eficiencia:"97,8%",
      comunicacao:"Wi-Fi + App (função backup de energia)", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },

  // ---------- KITS DE CABOS / FIOS ----------
  { id:"cb1", cat:"cabos", brand:"SolarWire", name:"Kit Cabo Solar 6mm² (50m + 50m)", price:389.00,
    badge:"Mais vendido",
    specs:{ bitola:"6 mm²", comprimento:"50m preto + 50m vermelho", isolacao:"XLPE",
      tensaoMax:"1,8 kV DC", resistencia:"UV e intempéries, -40°C a 90°C" } },
  { id:"cb2", cat:"cabos", brand:"SolarWire", name:"Kit Cabo Solar 4mm² (30m + 30m)", price:259.00,
    specs:{ bitola:"4 mm²", comprimento:"30m preto + 30m vermelho", isolacao:"XLPE",
      tensaoMax:"1,8 kV DC", resistencia:"UV e intempéries, -40°C a 90°C" } },
  { id:"cb3", cat:"cabos", brand:"ConnectPro", name:"Par de Conectores MC4 (10 pares)", price:129.00,
    specs:{ bitola:"Compatível 2,5 a 6 mm²", comprimento:"—", isolacao:"Corpo em PC/PA, IP67",
      tensaoMax:"1000 V DC / 30 A", resistencia:"Vedação IP67" } },
  { id:"cb4", cat:"cabos", brand:"SolarWire Kit Pro", name:"Kit Completo 6mm² p/ Instalação até 5kW", price:549.00,
    badge:"Melhor custo-benefício",
    specs:{ bitola:"6 mm²", comprimento:"40m preto + 40m vermelho", isolacao:"XLPE + fita autofusão inclusa",
      tensaoMax:"1,8 kV DC", resistencia:"6 pares de conectores MC4 inclusos, IP67" } },
  { id:"cb5", cat:"cabos", brand:"GroundSafe", name:"Cabo de Aterramento 10mm² (20m)", price:179.00,
    specs:{ bitola:"10 mm²", comprimento:"20m", isolacao:"Cobre nu",
      tensaoMax:"—", resistencia:"Uso em aterramento de estrutura" } },

  // ---------- PARAFUSOS E ESTRUTURA DE FIXAÇÃO ----------
  { id:"es1", cat:"estrutura", brand:"FixSolar Rail", name:"Kit Estrutura para Telha Cerâmica (6 painéis)", price:899.00,
    badge:"Mais vendido",
    specs:{ material:"Alumínio anodizado", capacidade:"Até 6 painéis", fixacao:"Trilhos + ganchos + parafusos inox",
      resistencia:"Ventos até 150 km/h", garantia:"12 anos" } },
  { id:"es2", cat:"estrutura", brand:"FixSolar Rail", name:"Kit Estrutura para Telha Metálica (6 painéis)", price:799.00,
    specs:{ material:"Alumínio anodizado", capacidade:"Até 6 painéis", fixacao:"Parafuso autobrocante + vedação EPDM",
      resistencia:"Ventos até 150 km/h", garantia:"12 anos" } },
  { id:"es3", cat:"estrutura", brand:"FixSolar Ground", name:"Kit Estrutura para Laje/Solo (6 painéis)", price:1299.00,
    badge:"Alta performance",
    specs:{ material:"Alumínio (estrutura triangular)", capacidade:"Até 6 painéis", fixacao:"Base de concreto ou chumbador, inclinação ajustável 10-30°",
      resistencia:"Ventos até 150 km/h", garantia:"12 anos" } },
  { id:"es4", cat:"estrutura", brand:"FixSolar Rail", name:"Trilho de Alumínio 2,1m (unidade)", price:89.00,
    specs:{ material:"Liga de alumínio 6005-T5 anodizado", capacidade:"Carga máx. 400 kg/m²", fixacao:"Encaixe universal com grampos",
      resistencia:"Anticorrosivo", garantia:"12 anos" } },
  { id:"es5", cat:"estrutura", brand:"FixSolar Bolts", name:"Kit Parafusos Inox A2 (100 unidades)", price:149.00,
    badge:"Melhor custo-benefício",
    specs:{ material:"Aço inox A2", capacidade:"Rosca autobrocante M6, uso geral", fixacao:"Inclui arruelas de vedação",
      resistencia:"Resistente à corrosão", garantia:"—" } },
  { id:"es6", cat:"estrutura", brand:"FixSolar Clamps", name:"Kit Grampos Final e Intermediário (20 peças)", price:219.00,
    specs:{ material:"Alumínio", capacidade:"10 finais + 10 intermediários", fixacao:"Compatível molduras 30-46mm",
      resistencia:"Anticorrosivo", garantia:"—" } },
];

/* ---------------------- ESTADO DA APLICAÇÃO ---------------------- */
const state = {
  currentCategory: "paineis",
  sort: "relevancia",
  cart: [],              // [{ id, qty }]
  compareSelection: {},  // { [categoria]: [ids] }
};

/* ---------------------- HELPERS ---------------------- */
function formatBRL(value){
  return value.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}
function getProduct(id){ return PRODUCTS.find(p => p.id === id); }
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

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
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ---------------------- PLACEHOLDER DE IMAGEM ---------------------- */
function productImageHTML(product, size="normal"){
  const icon = ICONS[product.cat];
  const cls = size === "mini" ? "mini-thumb" : "product-image";
  return `<div class="${cls}">
    ${product.badge ? `<span class="product-badge"><span class="dot"></span>${product.badge}</span>` : ""}
    ${icon}
  </div>`;
}

/* ======================================================================
   ROTEAMENTO (SPA baseada em hash)
   ====================================================================== */
const VALID_VIEWS = ["home","catalogo","comparar","carrinho","checkout","confirmacao"];

function navigate(){
  let hash = location.hash.replace("#","") || "home";
  if(!VALID_VIEWS.includes(hash)) hash = "home";

  $all(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(hash);
  if(target) target.classList.add("active");

  // fecha menu mobile ao navegar
  closeMobileMenu();

  // ações específicas por página
  if(hash === "catalogo") renderCatalog();
  if(hash === "comparar") renderComparison();
  if(hash === "carrinho") renderCart();
  if(hash === "checkout") renderCheckout();

  window.scrollTo({ top: 0, behavior: "auto" });
  initScrollReveal();
}
window.addEventListener("hashchange", navigate);

/* ======================================================================
   SCROLL REVEAL
   ====================================================================== */
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
   TABS DE CATEGORIA (renderizadas via JS para incluir ícones)
   ====================================================================== */
function renderTabs(){
  const tabs = $all(".tab");
  tabs.forEach(tab => {
    const cat = tab.dataset.cat;
    tab.innerHTML = `${ICONS[cat]}<span>${CATEGORIES[cat].label}</span>`;
  });
}

/* ======================================================================
   CATÁLOGO
   ====================================================================== */
function renderCatalog(){
  const grid = $("#productGrid");
  let items = PRODUCTS.filter(p => p.cat === state.currentCategory);

  if(state.sort === "menor-preco") items = [...items].sort((a,b) => a.price - b.price);
  if(state.sort === "maior-preco") items = [...items].sort((a,b) => b.price - a.price);

  grid.innerHTML = items.map(p => renderProductCard(p)).join("");
  renderCompareBar();
}

function renderProductCard(p){
  const specFields = CATEGORIES[p.cat].specFields.slice(0,3);
  const specsHTML = specFields.map(([key,label]) =>
    `<li><span>${label}</span><span>${p.specs[key] || "—"}</span></li>`).join("");

  const selected = (state.compareSelection[p.cat] || []).includes(p.id);

  return `
  <article class="product-card" data-id="${p.id}">
    ${productImageHTML(p)}
    <div class="product-body">
      <span class="product-brand">${p.brand}</span>
      <h3 class="product-name">${p.name}</h3>
      <ul class="product-specs">${specsHTML}</ul>
      <div class="product-price">${formatBRL(p.price)}<small>à vista (parcelamento a definir)</small></div>
    </div>
    <div class="product-actions">
      <label class="compare-check">
        <input type="checkbox" class="compare-checkbox" data-id="${p.id}" data-cat="${p.cat}" ${selected ? "checked" : ""}>
        Comparar este produto
      </label>
      <div class="product-actions-row">
        <button class="btn btn-ghost btn-details" data-id="${p.id}">Ver detalhes</button>
        <button class="btn btn-primary btn-add-cart" data-id="${p.id}">${ICON_PLUS}Adicionar</button>
      </div>
    </div>
  </article>`;
}

// Tabs
$("#categoryTabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if(!btn) return;
  $all(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  state.currentCategory = btn.dataset.cat;
  renderCatalog();
});

// Sort
$("#sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderCatalog();
});

// Delegação de eventos do grid (adicionar carrinho, comparar, detalhes)
$("#productGrid").addEventListener("click", (e) => {
  const addBtn = e.target.closest(".btn-add-cart");
  if(addBtn){ addToCart(addBtn.dataset.id); return; }

  const detailsBtn = e.target.closest(".btn-details");
  if(detailsBtn){ openProductModal(detailsBtn.dataset.id); return; }
});

$("#productGrid").addEventListener("change", (e) => {
  if(e.target.classList.contains("compare-checkbox")){
    toggleCompare(e.target.dataset.id, e.target.dataset.cat, e.target);
  }
});

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

  if(list.length === 0){
    bar.classList.remove("visible");
    return;
  }
  bar.classList.add("visible");
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
      <div class="compare-price">${formatBRL(p.price)}</div>
    </th>`;
  });
  html += `</tr></thead><tbody>`;

  fields.forEach(([key,label]) => {
    html += `<tr><td class="spec-label">${label}</td>`;
    products.forEach(p => {
      html += `<td>${p.specs[key] || "—"}</td>`;
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
   MODAL DE DETALHES DO PRODUTO
   ====================================================================== */
function openProductModal(id){
  const p = getProduct(id);
  const fields = CATEGORIES[p.cat].specFields;
  const specsHTML = fields.map(([key,label]) =>
    `<li><span>${label}</span><span>${p.specs[key] || "—"}</span></li>`).join("");

  $("#modalContent").innerHTML = `
    ${productImageHTML(p)}
    <div style="padding-top:18px;">
      <span class="product-brand">${p.brand}</span>
      <h2 style="margin:6px 0 14px; font-size:1.3rem;">${p.name}</h2>
      <ul class="product-specs" style="margin-bottom:18px;">${specsHTML}</ul>
      <div class="product-price" style="margin-bottom:18px;">${formatBRL(p.price)}<small>à vista (parcelamento a definir)</small></div>
      <button class="btn btn-primary btn-block btn-add-cart" data-id="${p.id}">${ICON_PLUS}Adicionar ao Carrinho</button>
    </div>
  `;
  $("#productModalOverlay").classList.add("open");
}
$("#modalCloseBtn").addEventListener("click", () => $("#productModalOverlay").classList.remove("open"));
$("#productModalOverlay").addEventListener("click", (e) => {
  if(e.target.id === "productModalOverlay") $("#productModalOverlay").classList.remove("open");
});
$("#modalContent").addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-add-cart");
  if(btn){ addToCart(btn.dataset.id); $("#productModalOverlay").classList.remove("open"); }
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
}

function cartTotalValue(){
  return state.cart.reduce((sum,i) => sum + getProduct(i.id).price * i.qty, 0);
}

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
          <span class="cart-item-price">${formatBRL(p.price)} / unidade</span>
        </div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-minus" data-id="${p.id}">${ICON_MINUS}</button>
            <span>${item.qty}</span>
            <button class="qty-plus" data-id="${p.id}">${ICON_PLUS}</button>
          </div>
          <span class="item-line-total">${formatBRL(p.price * item.qty)}</span>
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

$("#goCheckoutBtn").addEventListener("click", () => {
  if(state.cart.length === 0) return;
  location.hash = "#checkout";
});

/* ======================================================================
   CHECKOUT
   ====================================================================== */
function renderCheckout(){
  if(state.cart.length === 0){
    location.hash = "#catalogo";
    return;
  }
  const list = $("#checkoutItemsList");
  list.innerHTML = state.cart.map(item => {
    const p = getProduct(item.id);
    return `<div class="checkout-item-row"><span>${item.qty}x ${p.name}</span><span>${formatBRL(p.price * item.qty)}</span></div>`;
  }).join("");

  const total = cartTotalValue();
  $("#checkoutSubtotal").textContent = formatBRL(total);
  $("#checkoutTotal").textContent = formatBRL(total);
}

$("#checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();

  /* =====================================================================
     PONTO DE INTEGRAÇÃO DE PAGAMENTO (produção)
     ---------------------------------------------------------------------
     Aqui, na versão de produção, os dados do formulário + itens do
     carrinho seriam enviados para o backend, que criaria uma cobrança
     no gateway escolhido (Mercado Pago / PagSeguro / Stripe) e
     retornaria o link/token de pagamento (Pix, cartão ou boleto).
     Este protótipo apenas simula a confirmação do pedido.
     ===================================================================== */

  const orderNumber = Math.floor(100000 + Math.random() * 900000);
  $("#orderNumber").textContent = "#" + orderNumber;

  state.cart = [];
  updateCartCount();

  location.hash = "#confirmacao";
});

/* ======================================================================
   MENU MOBILE
   ====================================================================== */
function closeMobileMenu(){
  $("#mainNav").classList.remove("open");
  $("#hamburgerIcon").outerHTML = ICON_MENU.replace('class="icon"', 'class="icon" id="hamburgerIcon"');
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
navigate();
updateCartCount();
