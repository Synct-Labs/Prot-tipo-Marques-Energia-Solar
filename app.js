/* =====================================================================
   MARQUES ENERGIA SOLAR: LOJA
   Dados de catálogo são PLACEHOLDER (o cliente ainda vai fornecer o
   catálogo real). As marcas usadas (Deye, Growatt, Canadian Solar,
   Romagnole etc.) são marcas reais do setor, usadas aqui apenas como
   exemplo de como o filtro por marca funcionaria; a linha de produtos
   real que a Marques Energia Solar vai revender ainda será definida.
   Não há integração de pagamento real; ver seção CHECKOUT / PAYMENT
   INTEGRATION POINT mais abaixo.
   ===================================================================== */

/* Base da API: "" localmente (mesmo domínio), URL do Render em produção.
   Definida em api-config.js, carregado antes deste arquivo. */
const API_BASE = window.MES_API_BASE || "";

/* ---------------------- ÍCONES (estilo line-icon, tipo lucide) ---------------------- */
const ICONS = {
  kits: `<svg class="icon" viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>`,
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
  cabos:      { label: "Kits de Cabos/Fios",               crumbCategory: "Cabos e Conectores",     facetLabel: "Bitola", primarySpec: "bitola", specFields: [
      ["bitola","Bitola"], ["comprimento","Comprimento"], ["isolacao","Isolação"],
      ["tensaoMax","Tensão máxima"], ["resistencia","Resistência"]
    ] },
  estrutura:  { label: "Parafusos e Estrutura",            crumbCategory: "Estrutura de Fixação",   facetLabel: "Aplicação", primarySpec: "capacidade", specFields: [
      ["material","Material"], ["capacidade","Capacidade/Uso"], ["fixacao","Tipo de fixação"],
      ["resistencia","Resistência"], ["garantia","Garantia"]
    ] },
};

const FACET_ORDER = {
  kits: ["Até 400 kWh/mês", "400–700 kWh/mês", "700–1000 kWh/mês", "Acima de 1000 kWh/mês"],
  paineis: ["Até 400 Wp", "400–500 Wp", "500–600 Wp", "Acima de 600 Wp"],
  inversores: ["Até 3 kW", "3–5 kW", "5–10 kW", "Acima de 10 kW"],
  cabos: ["4 mm²", "6 mm²", "10 mm²", "Conectores"],
  estrutura: ["Telhado", "Solo/Laje", "Acessórios"],
};

/* ---------------------- CATÁLOGO (DADOS DE EXEMPLO, exceto "KITS PRONTOS" que são orçamentos reais) ---------------------- */
const PRODUCTS = [
  // ---------- KITS PRONTOS (orçamentos reais) ----------
  { id:"kit1", cat:"kits", brand:"TSUN + Solis", sku:"KIT-300-TSUN-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"Até 400 kWh/mês",
    name:"Kit Solar Completo 300 kWh/mês — 2,52 kWp", price:9486.00,
    // Foto do módulo é do irmão de linha 620W (mesma série TSUN RIO bifacial N-Type
    // preta) — não achamos foto de revenda específica da variante 630W/132 células.
    image:"assets/products/tsun-mftb-bifacial-630w.webp",
    specs:{ potencia:"2,52 kWp", modulos:"4x TSUN Bifacial N-Type 630W (132 células)", inversor:"1x Solis Monofásico 1MPPT 220V 3kW",
      entradaMax:"5,10 kW", saidaMax:"3,00 kW", consumoAlvo:"~300 kWh/mês" },
    bundleItems:[
      { brand:"TSUN Power", name:"Módulo Bifacial 132 Cel. N Type 630W Black Frame Cabo 0.30m", sku:"MFTB-0.3-BF-132-630W", qty:4, image:"assets/products/tsun-mftb-bifacial-630w.webp" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 1MPPT 220V 3kW", sku:"INVSO-MO-220V-3KW", qty:1, image:"assets/products/solis-invso-mo-220v-3kw.png" },
    ] },
  { id:"kit2", cat:"kits", brand:"TSUN + Solis", sku:"KIT-500-TSUN-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"400–700 kWh/mês",
    name:"Kit Solar Completo 500 kWh/mês — 4,41 kWp", price:11280.00,
    // Mesma observação do kit1: foto de estoque da linha TSUN RIO bifacial (620W),
    // usada como aproximação visual até termos foto real da variante 144 células.
    image:"assets/products/tsun-mftb-bifacial-630w.webp",
    specs:{ potencia:"4,41 kWp", modulos:"7x TSUN Bifacial N-Type 630W (144 células)", inversor:"1x Solis Monofásico 1MPPT 220V 3kW",
      entradaMax:"5,10 kW", saidaMax:"3,00 kW", consumoAlvo:"~500 kWh/mês" },
    bundleItems:[
      { brand:"TSUN Power", name:"Módulo Bifacial 144 Cel. N Type 630W Black Frame Cabo 0.30m", sku:"MFTB-0.3-BF-144-630W", qty:7, image:"assets/products/tsun-mftb-bifacial-630w.webp" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 1MPPT 220V 3kW", sku:"INVSO-MO-220V-3KW", qty:1, image:"assets/products/solis-invso-mo-220v-3kw.png" },
    ] },

  // ---------- PAINÉIS SOLARES ----------
  { id:"pn1", cat:"paineis", brand:"Canadian Solar", sku:"PS-MC-450W", embVenda:"1 unidade", subcategoria:"Monocristalino", facetValue:"400–500 Wp",
    name:"Painel Solar Monocristalino 450W", price:799.00,
    specs:{ potencia:"450 Wp", tipo:"Monocristalino PERC", eficiencia:"21,2%", tensaoMax:"41,5 V",
      correnteMax:"10,85 A", dimensoes:"2094 x 1038 x 35 mm", peso:"22,5 kg", garantia:"25 anos (performance) / 12 anos (produto)" } },
  { id:"pn2", cat:"paineis", brand:"Jinko Solar", sku:"PS-MC-550W", embVenda:"1 unidade", subcategoria:"Monocristalino", facetValue:"500–600 Wp",
    name:"Painel Solar Monocristalino 550W", price:949.00,
    specs:{ potencia:"550 Wp", tipo:"Monocristalino PERC Half-Cell", eficiencia:"21,4%", tensaoMax:"49,5 V",
      correnteMax:"11,11 A", dimensoes:"2278 x 1134 x 35 mm", peso:"27,5 kg", garantia:"25 anos (performance) / 12 anos (produto)" } },
  { id:"pn3", cat:"paineis", brand:"BYD", sku:"PS-BF-600W", embVenda:"1 unidade", subcategoria:"Bifacial", facetValue:"500–600 Wp",
    name:"Painel Solar Bifacial 600W", price:1249.00,
    specs:{ potencia:"600 Wp", tipo:"Bifacial Monocristalino (ganho até 25%)", eficiencia:"22,1%", tensaoMax:"51,2 V",
      correnteMax:"11,7 A", dimensoes:"2384 x 1303 x 35 mm", peso:"31,8 kg", garantia:"30 anos (performance) / 15 anos (produto)" } },
  { id:"pn4", cat:"paineis", brand:"Risen Energy", sku:"PS-PL-340W", embVenda:"1 unidade", subcategoria:"Policristalino", facetValue:"Até 400 Wp",
    name:"Painel Solar Policristalino 340W", price:549.00,
    specs:{ potencia:"340 Wp", tipo:"Policristalino", eficiencia:"17,4%", tensaoMax:"38,2 V",
      correnteMax:"8,9 A", dimensoes:"1956 x 992 x 40 mm", peso:"19,5 kg", garantia:"25 anos (performance) / 10 anos (produto)" } },
  { id:"pn5", cat:"paineis", brand:"JA Solar", sku:"PS-MC-500W", embVenda:"1 unidade", subcategoria:"Monocristalino", facetValue:"500–600 Wp",
    name:"Painel Solar Monocristalino 500W", price:869.00,
    specs:{ potencia:"500 Wp", tipo:"Monocristalino Half-Cell", eficiencia:"20,8%", tensaoMax:"45,8 V",
      correnteMax:"10,9 A", dimensoes:"2172 x 1116 x 35 mm", peso:"24,9 kg", garantia:"25 anos (performance) / 12 anos (produto)" } },
  { id:"pn6", cat:"paineis", brand:"Trina Solar", sku:"PS-TC-665W", embVenda:"1 unidade", subcategoria:"Monocristalino TOPCon", facetValue:"Acima de 600 Wp",
    name:"Painel Solar Monocristalino TOPCon 665W", price:1399.00, isLaunch:true,
    specs:{ potencia:"665 Wp", tipo:"Monocristalino TOPCon", eficiencia:"22,3%", tensaoMax:"55,3 V",
      correnteMax:"12,03 A", dimensoes:"2465 x 1134 x 35 mm", peso:"34,2 kg", garantia:"30 anos (performance) / 15 anos (produto)" } },

  // ---------- INVERSORES ----------
  { id:"iv1", cat:"inversores", brand:"Growatt", sku:"INV-OG-3K-M", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"Até 3 kW", powerKw:3,
    name:"Inversor String 3kW Monofásico", price:2399.00,
    specs:{ potencia:"3 kW", mppt:"2 MPPT", tensaoSaida:"220V Monofásico", eficiencia:"97,6%",
      comunicacao:"Wi-Fi + App de monitoramento", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },
  { id:"iv2", cat:"inversores", brand:"Deye", sku:"INV-OG-5K-M", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"3–5 kW", powerKw:5,
    name:"Inversor String 5kW Monofásico", price:3299.00,
    specs:{ potencia:"5 kW", mppt:"2 MPPT", tensaoSaida:"220V Monofásico", eficiencia:"98,0%",
      comunicacao:"Wi-Fi + App de monitoramento", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },
  { id:"iv3", cat:"inversores", brand:"Sungrow", sku:"INV-OG-8K-T", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"5–10 kW", powerKw:8,
    name:"Inversor String 8kW Trifásico", price:5799.00,
    specs:{ potencia:"8 kW", mppt:"2 MPPT", tensaoSaida:"380V Trifásico", eficiencia:"98,3%",
      comunicacao:"Wi-Fi + RS485", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },
  { id:"iv4", cat:"inversores", brand:"Huawei", sku:"INV-OG-10K-T", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"5–10 kW", powerKw:10,
    name:"Inversor String 10kW Trifásico", price:6999.00,
    specs:{ potencia:"10 kW", mppt:"3 MPPT", tensaoSaida:"380V Trifásico", eficiencia:"98,4%",
      comunicacao:"Wi-Fi + RS485 + 4G (opcional)", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },
  { id:"iv5", cat:"inversores", brand:"Solis", sku:"INV-MIC-600W", embVenda:"1 kit (4 microinversores)", subcategoria:"Microinversor", facetValue:"Até 3 kW", powerKw:2.4,
    name:"Kit Microinversor 600W (4 unidades)", price:2199.00,
    specs:{ potencia:"600 W por unidade", mppt:"1 MPPT por painel", tensaoSaida:"220V Monofásico", eficiencia:"96,7%",
      comunicacao:"Monitoramento individual por painel via app", protecao:"IP67", garantia:"12 anos (extensível até 25)" } },
  { id:"iv6", cat:"inversores", brand:"Auxsol", sku:"INV-HY-5K-M", embVenda:"1 unidade", subcategoria:"Híbrido", facetValue:"3–5 kW", powerKw:5,
    name:"Inversor Híbrido 5kW (compatível c/ bateria)", price:7499.00, isLaunch:true,
    specs:{ potencia:"5 kW", mppt:"2 MPPT + entrada bateria 48V", tensaoSaida:"220V Monofásico", eficiencia:"97,8%",
      comunicacao:"Wi-Fi + App (função backup de energia)", protecao:"IP65", garantia:"5 anos (extensível até 10)" } },

  // ---------- KITS DE CABOS / FIOS ----------
  { id:"cb1", cat:"cabos", brand:"Nexans", sku:"CB-SOL-6MM-50", embVenda:"1 kit (par de rolos)", subcategoria:"Cabo Solar", facetValue:"6 mm²",
    name:"Kit Cabo Solar 6mm² (50m + 50m)", price:389.00,
    specs:{ bitola:"6 mm²", comprimento:"50m preto + 50m vermelho", isolacao:"XLPE",
      tensaoMax:"1,8 kV DC", resistencia:"UV e intempéries, -40°C a 90°C" } },
  { id:"cb2", cat:"cabos", brand:"Prysmian", sku:"CB-SOL-4MM-30", embVenda:"1 kit (par de rolos)", subcategoria:"Cabo Solar", facetValue:"4 mm²",
    name:"Kit Cabo Solar 4mm² (30m + 30m)", price:259.00,
    specs:{ bitola:"4 mm²", comprimento:"30m preto + 30m vermelho", isolacao:"XLPE",
      tensaoMax:"1,8 kV DC", resistencia:"UV e intempéries, -40°C a 90°C" } },
  { id:"cb3", cat:"cabos", brand:"Stäubli", sku:"CN-MC4-10PR", embVenda:"10 pares", subcategoria:"Conectores", facetValue:"Conectores",
    name:"Par de Conectores MC4 (10 pares)", price:129.00,
    specs:{ bitola:"Compatível 2,5 a 6 mm²", comprimento:"-", isolacao:"Corpo em PC/PA, IP67",
      tensaoMax:"1000 V DC / 30 A", resistencia:"Vedação IP67" } },
  { id:"cb4", cat:"cabos", brand:"Nexans", sku:"CB-KIT-6MM-5K", embVenda:"1 kit completo", subcategoria:"Cabo Solar", facetValue:"6 mm²",
    name:"Kit Completo 6mm² p/ Instalação até 5kW", price:549.00,
    specs:{ bitola:"6 mm²", comprimento:"40m preto + 40m vermelho", isolacao:"XLPE + fita autofusão inclusa",
      tensaoMax:"1,8 kV DC", resistencia:"6 pares de conectores MC4 inclusos, IP67" } },
  { id:"cb5", cat:"cabos", brand:"Prysmian", sku:"CB-GND-10MM", embVenda:"1 unidade (rolo 20m)", subcategoria:"Aterramento", facetValue:"10 mm²",
    name:"Cabo de Aterramento 10mm² (20m)", price:179.00,
    specs:{ bitola:"10 mm²", comprimento:"20m", isolacao:"Cobre nu",
      tensaoMax:"-", resistencia:"Uso em aterramento de estrutura" } },
  { id:"cb6", cat:"cabos", brand:"Nexans", sku:"CB-SOL-4MM-35", embVenda:"1 kit (par de rolos)", subcategoria:"Cabo Solar", facetValue:"4 mm²",
    name:"Kit Cabo Solar 4mm² Vermelho/Preto (35m + 35m): padrão Monte seu Kit", price:299.00,
    specs:{ bitola:"4 mm²", comprimento:"35m vermelho + 35m preto", isolacao:"XLPE",
      tensaoMax:"1,8 kV DC", resistencia:"UV e intempéries, -40°C a 90°C" } },
  { id:"cb7", cat:"cabos", brand:"Stäubli", sku:"CN-MC4-PAR", embVenda:"1 par", subcategoria:"Conectores", facetValue:"Conectores",
    name:"Conector Fotovoltaico MC4 (par avulso)", price:19.90,
    specs:{ bitola:"Compatível 2,5 a 6 mm²", comprimento:"-", isolacao:"Corpo em PC/PA, IP67",
      tensaoMax:"1000 V DC / 30 A", resistencia:"Vedação IP67" } },

  // ---------- PARAFUSOS E ESTRUTURA DE FIXAÇÃO ----------
  { id:"es1", cat:"estrutura", brand:"Romagnole", sku:"ST-TC-6P", embVenda:"1 kit (6 painéis)", subcategoria:"Telhado", facetValue:"Telhado",
    name:"Kit Estrutura para Telha Cerâmica (6 painéis)", price:899.00,
    specs:{ material:"Alumínio anodizado", capacidade:"Até 6 painéis", fixacao:"Trilhos + ganchos + parafusos inox",
      resistencia:"Ventos até 150 km/h", garantia:"12 anos" } },
  { id:"es2", cat:"estrutura", brand:"Romagnole", sku:"ST-TM-6P", embVenda:"1 kit (6 painéis)", subcategoria:"Telhado", facetValue:"Telhado",
    name:"Kit Estrutura para Telha Metálica (6 painéis)", price:799.00,
    specs:{ material:"Alumínio anodizado", capacidade:"Até 6 painéis", fixacao:"Parafuso autobrocante + vedação EPDM",
      resistencia:"Ventos até 150 km/h", garantia:"12 anos" } },
  { id:"es3", cat:"estrutura", brand:"K2 Systems", sku:"ST-SL-6P", embVenda:"1 kit (6 painéis)", subcategoria:"Solo/Laje", facetValue:"Solo/Laje",
    name:"Kit Estrutura para Laje/Solo (6 painéis)", price:1299.00, isLaunch:true,
    specs:{ material:"Alumínio (estrutura triangular)", capacidade:"Até 6 painéis", fixacao:"Base de concreto ou chumbador, inclinação ajustável 10-30°",
      resistencia:"Ventos até 150 km/h", garantia:"12 anos" } },
  { id:"es4", cat:"estrutura", brand:"K2 Systems", sku:"ST-RAIL-210", embVenda:"1 unidade", subcategoria:"Acessórios", facetValue:"Acessórios",
    name:"Trilho de Alumínio 2,1m (unidade)", price:89.00,
    specs:{ material:"Liga de alumínio 6005-T5 anodizado", capacidade:"Carga máx. 400 kg/m²", fixacao:"Encaixe universal com grampos",
      resistencia:"Anticorrosivo", garantia:"12 anos" } },
  { id:"es5", cat:"estrutura", brand:"Ciser", sku:"ST-BOLT-A2-100", embVenda:"1 kit (100 unidades)", subcategoria:"Acessórios", facetValue:"Acessórios",
    name:"Kit Parafusos Inox A2 (100 unidades)", price:149.00,
    specs:{ material:"Aço inox A2", capacidade:"Rosca autobrocante M6, uso geral", fixacao:"Inclui arruelas de vedação",
      resistencia:"Resistente à corrosão", garantia:"-" } },
  { id:"es6", cat:"estrutura", brand:"Romagnole", sku:"ST-CLAMP-20", embVenda:"1 kit (20 peças)", subcategoria:"Acessórios", facetValue:"Acessórios",
    name:"Kit Grampos Final e Intermediário (20 peças)", price:219.00,
    specs:{ material:"Alumínio", capacidade:"10 finais + 10 intermediários", fixacao:"Compatível molduras 30-46mm",
      resistencia:"Anticorrosivo", garantia:"-" } },
];

/* ---------------------- ESTADO DA APLICAÇÃO ---------------------- */
const state = {
  currentCategory: "kits",
  currentProductId: null,
  sort: "relevancia",
  searchTerm: "",
  filters: { marca: new Set(), faixa: null },
  cart: [],              // [{ id, qty }]
  compareSelection: {},  // { [categoria]: [ids] }
  configurator: {
    active: false,
    step: 0,
    paineis: { id: null, qty: 6 },
    inversor: { id: null },
    cabo: { id: "cb6", qty: 1 },
    conector: { id: "cb7", qty: 2 },
    estrutura: { id: null },
  },
};

const FEATURED_IDS = ["kit1", "kit2", "pn1", "iv2", "cb1", "es1"];

/* ---------------------- CONFIGURADOR (MONTE SEU PROJETO) ---------------------- */
const WIZARD_STEPS = [
  { key:"paineis",   cat:"paineis",    label:"Painéis",    title:"Escolha o Painel Solar",       sub:"Selecione o modelo e a quantidade de painéis do seu projeto." },
  { key:"inversor",  cat:"inversores", label:"Inversor",   title:"Escolha o Inversor",            sub:"Selecione o inversor compatível com a potência do projeto." },
  { key:"cabos",     label:"Cabos",      title:"Cabos e Conectores",              sub:"Já incluímos o padrão recomendado para a maioria das instalações. Ajuste as quantidades se precisar de mais." },
  { key:"estrutura", cat:"estrutura",  label:"Estrutura",  title:"Escolha a Estrutura de Fixação", sub:"Selecione a estrutura conforme o tipo de telhado ou solo." },
  { key:"resumo",    label:"Resumo",   title:"Resumo do Projeto",              sub:"Confira os itens selecionados antes de adicionar ao carrinho." },
];

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
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2400);
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

/* ---------------------- IMAGEM DE PRODUTO (placeholder neutro, tipo "foto de estúdio") ---------------------- */
function productImageHTML(p, extraClass=""){
  const spec = p.specs[CATEGORIES[p.cat].primarySpec] || "";
  const media = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="product-photo" loading="lazy">`
    : ICONS[p.cat];
  return `<div class="product-image ${extraClass}">
    ${spec ? `<span class="spec-badge">${spec}</span>` : ""}
    ${p.isLaunch ? `<span class="launch-badge">Lançamento</span>` : ""}
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

  if(state.sort === "menor-preco") items = [...items].sort((a,b) => a.price - b.price);
  if(state.sort === "maior-preco") items = [...items].sort((a,b) => b.price - a.price);

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
      <div class="product-price">${formatBRL(p.price)}<small>à vista (parcelamento a definir)</small></div>
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
      <div class="compare-price">${formatBRL(p.price)}</div>
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
  $("#galleryThumbs").innerHTML = [0,1,2].map(i =>
    `<button class="gallery-thumb ${i===0 ? "active" : ""}" data-idx="${i}" type="button">${ICONS[p.cat]}</button>`
  ).join("");

  $("#productBrandChip").textContent = p.brand;
  $("#productLaunchTag").style.display = p.isLaunch ? "inline-flex" : "none";
  $("#productTitle").textContent = p.name;
  $("#productMeta").innerHTML = `<span>SKU: ${p.sku}</span><span>Emb. venda: ${p.embVenda}</span>`;
  $("#productPagePrice").innerHTML = `${formatBRL(p.price)}<small>à vista (parcelamento a definir)</small>`;
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
        <span class="wizard-option-price">${formatBRL(p.price)}</span>
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
        <p class="wizard-fixed-item-note">Padrão: 35 metros de cabo vermelho + 35 metros de cabo preto (4mm²), suficiente para a maioria dos projetos residenciais.</p>
        <span class="wizard-option-price">${formatBRL(cabo.price)} / kit</span>
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
        <span class="wizard-option-price">${formatBRL(conector.price)} / par</span>
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
  const total = rows.reduce((sum, r) => sum + r.p.price * r.qty, 0);

  const rowsHTML = rows.map(r => `
    <div class="wizard-summary-row">
      <div class="wizard-summary-thumb">${ICONS[r.p.cat]}</div>
      <div class="wizard-summary-info">
        <span class="wizard-summary-cat">${CATEGORIES[r.p.cat].label}</span>
        <span class="wizard-summary-name">${r.qty}x ${r.p.name}</span>
      </div>
      <span class="wizard-summary-price">${formatBRL(r.p.price * r.qty)}</span>
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

$("#goCheckoutBtn").addEventListener("click", async () => {
  if(state.cart.length === 0) return;
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.getCustomer() : null;
  if(!customer){
    window.location.href = "conta/entrar.html?redirect=" + encodeURIComponent("loja.html#checkout");
    return;
  }
  location.hash = "#checkout";
});

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
  const list = $("#checkoutItemsList");
  list.innerHTML = state.cart.map(item => {
    const p = getProduct(item.id);
    return `<div class="checkout-item-row"><span>${item.qty}x ${p.name}</span><span>${formatBRL(p.price * item.qty)}</span></div>`;
  }).join("");

  const total = cartTotalValue();
  $("#checkoutSubtotal").textContent = formatBRL(total);
  $("#checkoutTotal").textContent = formatBRL(total);
}

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
    itens: state.cart.map(item => {
      const p = getProduct(item.id);
      return { id: p.id, nome: p.name, marca: p.brand, preco: p.price, qty: item.qty };
    }),
    subtotal: cartTotalValue(),
    total: cartTotalValue(),
  };

  /* =====================================================================
     PONTO DE INTEGRAÇÃO DE PAGAMENTO (produção)
     ---------------------------------------------------------------------
     O pedido já é persistido de verdade no backend (ver backend/). Falta
     apenas conectar aqui o gateway de pagamento escolhido pelo cliente
     (Mercado Pago / PagSeguro / Stripe) para processar Pix, cartão ou
     boleto antes de confirmar o pedido como pago.
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
loadCartFromStorage();
renderTabs();
renderFeatured();
navigate();
updateCartCount();
