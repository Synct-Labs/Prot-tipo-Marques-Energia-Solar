/* =====================================================================
   MARQUES ENERGIA SOLAR: LOJA
   Painéis, inversores, baterias, controladores de carga, cabos/conectores
   e estrutura de fixação têm ficha técnica real, cotada na Apex Energia
   Solar (revenda de Cuiabá-MT) em dezembro/2026 — serve de referência de
   mercado até a Marques Energia Solar definir sua própria linha/fornecedor.
   O preço desses itens (tudo, exceto os kits prontos) leva a cotação da
   Apex + 30% de margem da Marques. Os kits prontos (kit1-kit9) são
   orçamento real da própria Marques — já é o valor final "chave na mão",
   incluindo instalação e mão de obra, então não recebem esse mesmo
   percentual (evita cobrar margem em cima de margem).
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

/* ---------------------- CATÁLOGO (preço/specs reais — ver comentário no topo do arquivo) ---------------------- */
const PRODUCTS = [
  // ---------- KITS PRONTOS (orçamentos reais) ----------
  { id:"kit1", cat:"kits", brand:"TSUN + Solis", sku:"KIT-300-TSUN-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"Até 400 kWh/mês",
    // Preço revisado em 12/2026: equipamento (4x painel TSUN 630W a R$730,80 + inversor
    // ~3kW estimado em ~R$3.000, ambos cotados na Apex Energia Solar) fica em ~R$5.900.
    // Num sistema instalado, equipamento costuma representar ~45-50% do total (o resto é
    // estrutura, cabo, projeto/ART, mão de obra e margem) — daí o preço final em ~R$12.900.
    // Referência de mercado: a própria Apex divulga que um sistema de ~500 kWh/mês (a faixa
    // do kit2) gira em torno de R$20.000. Ajuste livremente conforme a margem que você quiser praticar.
    name:"Kit Solar Completo 300 kWh/mês — 2,52 kWp", price:12900.00,
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
    // Preço revisado em 12/2026: mesmo raciocínio do kit1 (equipamento ~R$8.100 / ~45-50%
    // do total), aproximado à referência que a própria Apex Energia Solar divulga pra essa
    // faixa de consumo (~500 kWh/mês): "em torno de R$20.000". Ajuste conforme sua margem.
    name:"Kit Solar Completo 500 kWh/mês — 4,41 kWp", price:18900.00,
    // Mesma observação do kit1: foto de estoque da linha TSUN RIO bifacial (620W),
    // usada como aproximação visual até termos foto real da variante 144 células.
    image:"assets/products/tsun-mftb-bifacial-630w.webp",
    specs:{ potencia:"4,41 kWp", modulos:"7x TSUN Bifacial N-Type 630W (144 células)", inversor:"1x Solis Monofásico 1MPPT 220V 3kW",
      entradaMax:"5,10 kW", saidaMax:"3,00 kW", consumoAlvo:"~500 kWh/mês" },
    bundleItems:[
      { brand:"TSUN Power", name:"Módulo Bifacial 144 Cel. N Type 630W Black Frame Cabo 0.30m", sku:"MFTB-0.3-BF-144-630W", qty:7, image:"assets/products/tsun-mftb-bifacial-630w.webp" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 1MPPT 220V 3kW", sku:"INVSO-MO-220V-3KW", qty:1, image:"assets/products/solis-invso-mo-220v-3kw.png" },
    ] },
  { id:"kit3", cat:"kits", brand:"TCL Solar + Solis", sku:"KIT-600-TCL-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"400–700 kWh/mês",
    // Kit espelhado num orçamento real de revenda (Co2 Energia Solar, MT) pra faixa de
    // 600 kWh/mês: 9 módulos TCL Solar 620W + 1 inversor Solis 4kW/2MPPT, mesmo padrão
    // dos kits kit1/kit2 (equipamento cotado à parte; preço final já embute estrutura,
    // cabo, projeto/ART, mão de obra e margem).
    name:"Kit Solar Completo 600 kWh/mês — 5,58 kWp", price:19000.00,
    // Foto real da revenda Co2 Energia Solar (MT) — SKU exato do módulo usado no kit.
    image:"assets/products/tcl-mftc-bifacial-620w.jpg",
    specs:{ potencia:"5,58 kWp", modulos:"9x TCL Solar Bifacial N-Type 620W (132 células)", inversor:"1x Solis Monofásico 2MPPT 220V 4kW",
      entradaMax:"7,20 kW", saidaMax:"4,00 kW", consumoAlvo:"~600 kWh/mês" },
    bundleItems:[
      { brand:"TCL Solar", name:"Módulo Bifacial 132 Cél. N-Type 620W Cabo 1,2m", sku:"MFTC-1.2-BF-132-620W", qty:9, image:"assets/products/tcl-mftc-bifacial-620w.jpg" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 2MPPT 220V 4kW", sku:"INVSO-MO-220V-4KW", qty:1, image:"assets/products/solis-invso-mo-220v-4kw.jpg" },
    ] },
  { id:"kit4", cat:"kits", brand:"TCL Solar + Solis", sku:"KIT-700-TCL-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"700–1000 kWh/mês",
    // Mesmo padrão do kit3 (orçamento real de revenda, Co2 Energia Solar/MT), um degrau
    // acima: mais 1 módulo TCL 620W, mesmo inversor Solis 4kW/2MPPT (ainda dentro do
    // limite de entrada dele).
    name:"Kit Solar Completo 700 kWh/mês — 6,20 kWp", price:19500.00,
    image:"assets/products/tcl-mftc-bifacial-620w.jpg",
    specs:{ potencia:"6,20 kWp", modulos:"10x TCL Solar Bifacial N-Type 620W (132 células)", inversor:"1x Solis Monofásico 2MPPT 220V 4kW",
      entradaMax:"7,20 kW", saidaMax:"4,00 kW", consumoAlvo:"~700 kWh/mês" },
    bundleItems:[
      { brand:"TCL Solar", name:"Módulo Bifacial 132 Cél. N-Type 620W Cabo 1,2m", sku:"MFTC-1.2-BF-132-620W", qty:10, image:"assets/products/tcl-mftc-bifacial-620w.jpg" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 2MPPT 220V 4kW", sku:"INVSO-MO-220V-4KW", qty:1, image:"assets/products/solis-invso-mo-220v-4kw.jpg" },
    ] },
  { id:"kit5", cat:"kits", brand:"TCL Solar + Solis", sku:"KIT-800-TCL-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"700–1000 kWh/mês",
    // Mesmo padrão do kit3/kit4 (orçamento real de revenda, Co2 Energia Solar/MT), mais
    // 1 módulo TCL 620W, mesmo inversor Solis 4kW/2MPPT (ainda dentro do limite de entrada dele).
    name:"Kit Solar Completo 800 kWh/mês — 6,82 kWp", price:19800.00,
    image:"assets/products/tcl-mftc-bifacial-620w.jpg",
    specs:{ potencia:"6,82 kWp", modulos:"11x TCL Solar Bifacial N-Type 620W (132 células)", inversor:"1x Solis Monofásico 2MPPT 220V 4kW",
      entradaMax:"7,20 kW", saidaMax:"4,00 kW", consumoAlvo:"~800 kWh/mês" },
    bundleItems:[
      { brand:"TCL Solar", name:"Módulo Bifacial 132 Cél. N-Type 620W Cabo 1,2m", sku:"MFTC-1.2-BF-132-620W", qty:11, image:"assets/products/tcl-mftc-bifacial-620w.jpg" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 2MPPT 220V 4kW", sku:"INVSO-MO-220V-4KW", qty:1, image:"assets/products/solis-invso-mo-220v-4kw.jpg" },
    ] },
  { id:"kit6", cat:"kits", brand:"TCL Solar + Solis", sku:"KIT-900-TCL-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"700–1000 kWh/mês",
    // Mesmo padrão do kit3/kit4/kit5 (orçamento real de revenda, Co2 Energia Solar/MT).
    // Passa do limite de entrada do inversor 4kW, então sobe pro Solis 5kW/2MPPT.
    name:"Kit Solar Completo 900 kWh/mês — 8,06 kWp", price:20000.00,
    image:"assets/products/tcl-mftc-bifacial-620w.jpg",
    specs:{ potencia:"8,06 kWp", modulos:"13x TCL Solar Bifacial N-Type 620W (132 células)", inversor:"1x Solis Monofásico 2MPPT 220V 5kW",
      entradaMax:"9,00 kW", saidaMax:"5,00 kW", consumoAlvo:"~900 kWh/mês" },
    bundleItems:[
      { brand:"TCL Solar", name:"Módulo Bifacial 132 Cél. N-Type 620W Cabo 1,2m", sku:"MFTC-1.2-BF-132-620W", qty:13, image:"assets/products/tcl-mftc-bifacial-620w.jpg" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 2MPPT 220V 5kW", sku:"INVSO-MO-220V-5KW", qty:1, image:"assets/products/solis-invso-mo-220v-5kw.jpg" },
    ] },
  { id:"kit7", cat:"kits", brand:"TCL Solar + Solis", sku:"KIT-1000-TCL-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"Acima de 1000 kWh/mês",
    // Mesmo padrão do kit3-kit6 (orçamento real de revenda, Co2 Energia Solar/MT), mais
    // 1 módulo TCL 620W, mesmo inversor Solis 5kW/2MPPT (ainda dentro do limite de entrada dele).
    name:"Kit Solar Completo 1000 kWh/mês — 8,68 kWp", price:21000.00,
    image:"assets/products/tcl-mftc-bifacial-620w.jpg",
    specs:{ potencia:"8,68 kWp", modulos:"14x TCL Solar Bifacial N-Type 620W (132 células)", inversor:"1x Solis Monofásico 2MPPT 220V 5kW",
      entradaMax:"9,00 kW", saidaMax:"5,00 kW", consumoAlvo:"~1000 kWh/mês" },
    bundleItems:[
      { brand:"TCL Solar", name:"Módulo Bifacial 132 Cél. N-Type 620W Cabo 1,2m", sku:"MFTC-1.2-BF-132-620W", qty:14, image:"assets/products/tcl-mftc-bifacial-620w.jpg" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 2MPPT 220V 5kW", sku:"INVSO-MO-220V-5KW", qty:1, image:"assets/products/solis-invso-mo-220v-5kw.jpg" },
    ] },
  { id:"kit8", cat:"kits", brand:"TCL Solar + Solis", sku:"KIT-1100-TCL-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"Acima de 1000 kWh/mês",
    // Mesmo padrão do kit3-kit7 (orçamento real de revenda, Co2 Energia Solar/MT). Passa
    // do limite de entrada do inversor 5kW, então sobe pro Solis 6kW/2MPPT.
    name:"Kit Solar Completo 1100 kWh/mês — 9,30 kWp", price:22000.00,
    image:"assets/products/tcl-mftc-bifacial-620w.jpg",
    specs:{ potencia:"9,30 kWp", modulos:"15x TCL Solar Bifacial N-Type 620W (132 células)", inversor:"1x Solis Monofásico 2MPPT 220V 6kW",
      entradaMax:"10,80 kW", saidaMax:"6,00 kW", consumoAlvo:"~1100 kWh/mês" },
    bundleItems:[
      { brand:"TCL Solar", name:"Módulo Bifacial 132 Cél. N-Type 620W Cabo 1,2m", sku:"MFTC-1.2-BF-132-620W", qty:15, image:"assets/products/tcl-mftc-bifacial-620w.jpg" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 2MPPT 220V 6kW", sku:"INVSO-MO-220V-6KW", qty:1, image:"assets/products/solis-invso-mo-220v-6kw.jpg" },
    ] },
  { id:"kit9", cat:"kits", brand:"TCL Solar + Solis", sku:"KIT-1200-TCL-SOLIS", embVenda:"1 kit completo (módulos + inversor)", subcategoria:"Kit Residencial", facetValue:"Acima de 1000 kWh/mês",
    // Mesmo padrão do kit3-kit8 (orçamento real de revenda, Co2 Energia Solar/MT), mais
    // 2 módulos TCL 620W, mesmo inversor Solis 6kW/2MPPT (ainda dentro do limite de entrada dele).
    name:"Kit Solar Completo 1200 kWh/mês — 10,54 kWp", price:22500.00,
    image:"assets/products/tcl-mftc-bifacial-620w.jpg",
    specs:{ potencia:"10,54 kWp", modulos:"17x TCL Solar Bifacial N-Type 620W (132 células)", inversor:"1x Solis Monofásico 2MPPT 220V 6kW",
      entradaMax:"10,80 kW", saidaMax:"6,00 kW", consumoAlvo:"~1200 kWh/mês" },
    bundleItems:[
      { brand:"TCL Solar", name:"Módulo Bifacial 132 Cél. N-Type 620W Cabo 1,2m", sku:"MFTC-1.2-BF-132-620W", qty:17, image:"assets/products/tcl-mftc-bifacial-620w.jpg" },
      { brand:"Solis", name:"Inversor de Corrente Monofásico 2MPPT 220V 6kW", sku:"INVSO-MO-220V-6KW", qty:1, image:"assets/products/solis-invso-mo-220v-6kw.jpg" },
    ] },

  // ---------- PAINÉIS SOLARES (preços/specs reais, cotados na Apex Energia Solar em 12/2026) ----------
  { id:"pn1", cat:"paineis", brand:"ZTROON", sku:"ZTP-360MI", embVenda:"1 unidade", subcategoria:"Monocristalino", facetValue:"Até 400 Wp",
    name:"Painel Solar Monocristalino 360W (Off-Grid)", price:954.15,
    // Foto real da revenda NeoSolar — o próprio arquivo é "ztp-340mi" (mesma peça física,
    // a Apex também lista esse SKU alternativo pro 360W: é a mesma linha, binagem de potência diferente).
    image:"assets/products/ztroon-ztp-360mi.png",
    specs:{ potencia:"360 Wp", tipo:"Monocristalino PERC", eficiencia:"21,90%", tensaoMax:"39,44 V",
      correnteMax:"9,13 A", dimensoes:"1870 x 880 x 30 mm", peso:"15,6 kg", garantia:"15 anos (produto)" } },
  { id:"pn2", cat:"paineis", brand:"TSUN", sku:"RIO600W-144BIF-2278", embVenda:"1 unidade", subcategoria:"Bifacial", facetValue:"500–600 Wp",
    name:"Painel Solar Bifacial 600W", price:934.58,
    // Mesma foto do pn3: irmão de linha (TSUN RIO bifacial N-Type preto), não achamos
    // foto de revenda específica da variante 600W/144 células.
    image:"assets/products/tsun-mftb-bifacial-630w.webp",
    specs:{ potencia:"600 Wp", tipo:"N-Type Monocristalina Bifacial", eficiencia:"23,2%", tensaoMax:"44,45 V",
      correnteMax:"13,50 A", dimensoes:"2278 x 1134 x 30 mm", peso:"32 kg", garantia:"12 anos (produto) / 30 anos (linear)" } },
  { id:"pn3", cat:"paineis", brand:"TSUN", sku:"TS630S8E-132GANT", embVenda:"1 unidade", subcategoria:"Bifacial", facetValue:"Acima de 600 Wp",
    name:"Painel Solar Bifacial 630W N-Type", price:950.04,
    // Mesmo módulo/foto usado no kit1 e kit2 — é exatamente o mesmo modelo (132 células, N-Type, 630W).
    image:"assets/products/tsun-mftb-bifacial-630w.webp",
    specs:{ potencia:"630 Wp", tipo:"N-Type Monocristalina Bifacial (132 células)", eficiencia:"23,7%", tensaoMax:"42,17 V",
      correnteMax:"14,94 A", dimensoes:"2382 x 1134 x 30 mm", peso:"33,5 kg", garantia:"12 anos (produto) / 30 anos (linear)" } },
  { id:"pn4", cat:"paineis", brand:"Jinko Solar", sku:"JKM620N-66HL4M-BDV", embVenda:"1 unidade", subcategoria:"Bifacial TOPCon", facetValue:"Acima de 600 Wp",
    name:"Painel Solar Bifacial TOPCon 620W", price:1455.00, isLaunch:true,
    // Foto real da revenda Recarga Solar (recargasolar.shop) — mesmo SKU exato (JKM620N-66HL4M-BDV).
    image:"assets/products/jinko-jkm620n-66hl4m-bdv.webp",
    specs:{ potencia:"620 Wp", tipo:"N-Type TOPCon Monocristalina Bifacial", eficiencia:"23%", tensaoMax:"40,74 V",
      correnteMax:"15,22 A", dimensoes:"2382 x 1134 x 30 mm", peso:"32,5 kg", garantia:"15 anos (produto) / 30 anos (linear)" } },
  { id:"pn5", cat:"paineis", brand:"Renepv", sku:"ZY700G12HNHB-132", embVenda:"1 unidade", subcategoria:"Bifacial", facetValue:"Acima de 600 Wp",
    name:"Painel Solar Bifacial 700W", price:1274.00,
    // Foto real da revenda NeoSolar — mesmo SKU exato (ZY700G12HNHB-132).
    image:"assets/products/renepv-zy700g12hnhb-132.png",
    specs:{ potencia:"700 Wp", tipo:"Monocristalino Bifacial (vidro duplo)", eficiencia:"22,50%", tensaoMax:"41,78 V",
      correnteMax:"16,76 A", dimensoes:"2384 x 1303 x 33 mm", peso:"37,2 kg", garantia:"12 anos (produto) / 30 anos (linear)" } },

  // ---------- INVERSORES (preços/specs reais, cotados na Apex Energia Solar em 12/2026) ----------
  { id:"iv1", cat:"inversores", brand:"Sungrow", sku:"SG2K-S", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"Até 3 kW", powerKw:2,
    name:"Inversor String 2kW Monofásico", price:2990.00,
    // Foto real da revenda Energia Total — mesmo SKU exato (SG2K-S).
    image:"assets/products/sungrow-sg2k-s.jpg",
    specs:{ potencia:"2 kW", mppt:"1 MPPT", tensaoSaida:"220V Monofásico", eficiencia:"98,2%",
      comunicacao:"-", protecao:"IP65", garantia:"7 anos" } },
  { id:"iv2", cat:"inversores", brand:"Canadian Solar", sku:"CSI-5K-S22003-E", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"3–5 kW", powerKw:5,
    name:"Inversor String 5kW Monofásico", price:5980.00,
    // Foto real da revenda Energia Total — mesmo SKU exato (CSI-5K-S22003-E).
    image:"assets/products/canadian-csi-5k-s22003-e.png",
    specs:{ potencia:"5 kW", mppt:"2 MPPT", tensaoSaida:"220V Monofásico", eficiencia:"98,1%",
      comunicacao:"Wi-Fi + monitoramento em nuvem", protecao:"IP65", garantia:"10 anos" } },
  { id:"iv3", cat:"inversores", brand:"Fronius", sku:"Primo 3.0-1", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"Até 3 kW", powerKw:3,
    name:"Inversor String 3kW Monofásico Primo", price:8245.25,
    // Foto real da revenda Energia Total — mesmo modelo exato (Primo 3.0-1).
    image:"assets/products/fronius-primo-3.0-1.jpeg",
    specs:{ potencia:"3 kW", mppt:"2 MPPT", tensaoSaida:"220V Monofásico", eficiencia:"98,0% (máx.) / 96,1% (europeia)",
      comunicacao:"-", protecao:"IP65", garantia:"5 anos" } },
  { id:"iv4", cat:"inversores", brand:"Canadian Solar", sku:"CSI-9K-S22002-ED", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"5–10 kW", powerKw:9,
    name:"Inversor String 9kW Monofásico", price:9646.00,
    // Foto real da revenda Energia Total — mesmo SKU exato (CSI-9K-S22002-ED).
    image:"assets/products/canadian-csi-9k-s22002-ed.jpg",
    specs:{ potencia:"9 kW", mppt:"2 MPPT", tensaoSaida:"220V Monofásico", eficiencia:"98,1%",
      comunicacao:"Wi-Fi + monitoramento em nuvem", protecao:"IP65", garantia:"10 anos" } },
  { id:"iv5", cat:"inversores", brand:"Canadian Solar", sku:"CSI-15KTL-GI-LFL", embVenda:"1 unidade", subcategoria:"On Grid", facetValue:"Acima de 10 kW", powerKw:15,
    name:"Inversor String 15kW Trifásico", price:6987.85,
    // Foto real da revenda Energia Total — mesmo SKU exato (CSI-15KTL-GI-LFL).
    image:"assets/products/canadian-csi-15ktl-gi-lfl.png",
    specs:{ potencia:"15 kW", mppt:"2 MPPT", tensaoSaida:"220V Trifásico", eficiencia:"97%",
      comunicacao:"-", protecao:"-", garantia:"5 anos" } },
  { id:"iv6", cat:"inversores", brand:"Deye", sku:"SUN-5K-SG04LP1-EU", embVenda:"1 unidade", subcategoria:"Híbrido", facetValue:"3–5 kW", powerKw:5,
    name:"Inversor Híbrido 5kW (compatível c/ bateria)", price:13977.12, isLaunch:true,
    // Foto real da revenda NeoSolar — mesma linha Deye SUN5K (EU) híbrida.
    image:"assets/products/deye-sun-5k-sg04lp1-eu.jpg",
    specs:{ potencia:"5 kW", mppt:"2 MPPT + entrada bateria 48V (40–60V)", tensaoSaida:"220V Monofásico", eficiencia:"97,6%",
      comunicacao:"Wi-Fi + RS485 + CAN (BMS)", protecao:"IP65", garantia:"5 anos" } },

  // ---------- BATERIAS (preços/specs reais, cotados na Apex Energia Solar em 12/2026) ----------
  { id:"bt1", cat:"baterias", brand:"Moura", sku:"12MN2000", embVenda:"1 unidade", subcategoria:"Chumbo-Carbono (Estacionária)", facetValue:"Chumbo-Ácido (Estacionária)",
    name:"Bateria Estacionária Moura 105Ah 12V", price:1445.60,
    // Foto real da revenda Energia Total — mesmo SKU exato (12MN2000).
    image:"assets/products/moura-12mn2000.png",
    specs:{ tensao:"12V", capacidade:"105 Ah (C120) / 95 Ah (C10)", tecnologia:"Chumbo-Carbono (PbC), selada, uso exclusivo solar",
      ciclos:"Mais de 450 ciclos", dimensoes:"330 x 172 x 214 mm", peso:"26 kg", garantia:"2 anos" } },
  { id:"bt2", cat:"baterias", brand:"Epever", sku:"LFP1.28KWH12.8V-P20L1", embVenda:"1 unidade", subcategoria:"Lítio (LiFePO4)", facetValue:"Lítio (LiFePO4)",
    name:"Bateria de Lítio LiFePO4 100Ah 12,8V", price:4611.50, isLaunch:true,
    // Foto real da revenda NeoSolar — mesma família Epever LFP1.28kWh 12,8V/100Ah (variante
    // de terminal P65L2EV50; a Apex vende a variante P20L1, célula/capacidade idênticas).
    image:"assets/products/epever-lfp1-28kwh.jpg",
    specs:{ tensao:"12,8V", capacidade:"100 Ah (1.280 Wh)", tecnologia:"LiFePO4 com BMS integrado",
      ciclos:"≥ 4.000 ciclos", dimensoes:"166 x 180 x 260 mm", peso:"12,5 kg", garantia:"5 anos" } },

  // ---------- CONTROLADOR DE CARGA (preços/specs reais, cotados na Apex Energia Solar em 12/2026) ----------
  { id:"cc1", cat:"controlador", brand:"Epever", sku:"LS3024EU", embVenda:"1 unidade", subcategoria:"PWM", facetValue:"PWM",
    name:"Controlador de Carga PWM 30A 12/24V", price:362.70,
    // Foto real da revenda NeoSolar — mesmo SKU exato (LS3024EU).
    image:"assets/products/epever-ls3024eu.jpg",
    specs:{ tipo:"PWM", corrente:"30 A", tensaoSistema:"12V/24V (auto reconhecimento)", eficiencia:"-",
      protecoes:"Sobrecarga, curto-circuito, polaridade reversa, descarga excessiva", dimensoes:"178 x 95,5 x 41,5 mm", garantia:"2 anos" } },
  { id:"cc2", cat:"controlador", brand:"Epever", sku:"XTRA 3210N", embVenda:"1 unidade", subcategoria:"MPPT", facetValue:"MPPT",
    name:"Controlador de Carga MPPT 30A 12/24V", price:1157.00,
    // Foto real da revenda NeoSolar — mesmo SKU exato (XTRA 3210N).
    image:"assets/products/epever-xtra-3210n.jpg",
    specs:{ tipo:"MPPT", corrente:"30 A (carga e descarga)", tensaoSistema:"12V/24V", eficiencia:"98,6%",
      protecoes:"Sobrecarga, curto-circuito, polaridade reversa, descarga excessiva, compensação de temperatura", dimensoes:"255 x 185 x 67,8 mm", garantia:"2 anos" } },

  // ---------- CABOS, CONECTORES E PROTEÇÃO (preços/specs reais, cotados na Apex Energia Solar em 12/2026) ----------
  { id:"cb1", cat:"cabos", brand:"-", sku:"000190", embVenda:"venda por metro", subcategoria:"Cabo Solar", facetValue:"6 mm²",
    name:"Cabo Solar Preto 6mm² 1,8kV (metro)", price:12.35,
    // Foto real da revenda NeoSolar — cabo solar 6mm²/1,8kV preto (marca Lafeber; a Apex
    // vende o mesmo tipo de cabo sem marca própria divulgada).
    image:"assets/products/cabo-solar-6mm-preto.jpg",
    specs:{ bitola:"6 mm²", comprimento:"Venda por metro (corte sob medida)", isolacao:"Dupla camada, resistente a UV/óleo/abrasão",
      tensaoMax:"1,8 kV DC", resistencia:"Condutor de cobre estanhado flexível, -40°C a 90°C" } },
  { id:"cb2", cat:"cabos", brand:"-", sku:"000191", embVenda:"venda por metro", subcategoria:"Cabo Solar", facetValue:"6 mm²",
    name:"Cabo Solar Vermelho 6mm² 1,8kV (metro)", price:12.35,
    // Foto real da revenda NeoSolar — mesma observação do cb1 (marca Lafeber).
    image:"assets/products/cabo-solar-6mm-vermelho.jpg",
    specs:{ bitola:"6 mm²", comprimento:"Venda por metro (corte sob medida)", isolacao:"Dupla camada, resistente a UV/óleo/abrasão",
      tensaoMax:"1,8 kV DC", resistencia:"Condutor de cobre estanhado flexível, -40°C a 90°C" } },
  { id:"cb3", cat:"cabos", brand:"Victron Energy", sku:"MC4", embVenda:"1 par (macho-fêmea)", subcategoria:"Conectores", facetValue:"Conectores",
    name:"Conector Fotovoltaico MC4 (par avulso)", price:42.48,
    // Foto real da revenda Energia Total — mesmo produto (cotado a R$32,68 na Apex, mesma
    // descrição "Multi-Contact MC4 Macho-Fêmea Par"; preço final aqui já com os +30% de margem).
    image:"assets/products/mc4-conector-par.jpeg",
    specs:{ bitola:"Compatível 2,5 a 6 mm²", comprimento:"6 cm", isolacao:"Contato em cobre estanhado",
      tensaoMax:"1000 V DC / 30 A", resistencia:"-40°C a 90°C, 30g o par" } },
  { id:"cb4", cat:"cabos", brand:"Soprano", sku:"SHB2 DC-C016A", embVenda:"1 unidade", subcategoria:"Proteção", facetValue:"Proteção",
    name:"Disjuntor CC 16A 500V", price:158.61,
    // Foto real da Leroy Merlin — mesmo produto exato (Disjuntor CC 500V Soprano SHB2-C 16A).
    image:"assets/products/soprano-disjuntor-cc-16a.jpg",
    specs:{ bitola:"-", comprimento:"-", isolacao:"-",
      tensaoMax:"500 V DC / 16 A", resistencia:"Proteção de circuitos CC (sistemas solares e banco de baterias)" } },
  { id:"cb5", cat:"cabos", brand:"Embrastec", sku:"4E-2S-20A-1040V", embVenda:"1 unidade", subcategoria:"Proteção", facetValue:"Proteção",
    name:"String Box 4E/2S 20A 1040VCC", price:1508.13,
    // Foto real do site oficial da Embrastec — mostra a linha String Box CC (design da
    // caixa pode variar por configuração de entradas/saídas).
    image:"assets/products/embrastec-stringbox.jpg",
    specs:{ bitola:"4 entradas / 2 saídas", comprimento:"41 x 31 x 15 cm", isolacao:"Caixa ABS anti-chama (UL94 V0), IP65",
      tensaoMax:"1040 V DC / 20 A", resistencia:"DPS integrado, -40°C a 80°C, 3,5 kg" } },
  { id:"cb6", cat:"cabos", brand:"Canadian Solar", sku:"CSI-GI-DCBOX-42E", embVenda:"1 unidade", subcategoria:"Proteção", facetValue:"Proteção",
    name:"String Box 8E/8S", price:2374.94,
    // Foto real da revenda Minha Casa Solar — mesmo SKU exato (CSI-GI-DCBOX-42E).
    image:"assets/products/canadian-csi-gi-dcbox-42e.jpg",
    specs:{ bitola:"8 entradas / 8 saídas", comprimento:"-", isolacao:"-",
      tensaoMax:"-", resistencia:"Seccionamento e proteção para arranjos de maior porte" } },

  // ---------- PARAFUSOS E ESTRUTURA DE FIXAÇÃO (peça avulsa, preços reais Apex Energia Solar em 12/2026 —
  //            o mercado (inclusive a Apex) não vende "kit pra N painéis" fechado, só peça a peça) ----------
  { id:"es1", cat:"estrutura", brand:"Alumax", sku:"-", embVenda:"1 unidade", subcategoria:"Trilhos", facetValue:"Trilhos",
    name:"Perfil de Alumínio 2,4m (trilho suspenso)", price:77.87,
    // Foto real da revenda Energia Total — mesmo produto exato.
    image:"assets/products/alumax-perfil-2-4m.png",
    specs:{ material:"Alumínio estrutural anodizado/escovado", capacidade:"2,4m por peça, vendido individualmente", fixacao:"Compatível com grampos finais e intermediários (35mm)",
      resistencia:"Anticorrosivo, não enferruja", garantia:"-" } },
  { id:"es2", cat:"estrutura", brand:"Alumax", sku:"-", embVenda:"1 unidade", subcategoria:"Trilhos", facetValue:"Trilhos",
    name:"Minitrilho 30cm (complemento/vão curto)", price:23.27,
    // Foto real da revenda Energia Total — mesmo produto exato.
    image:"assets/products/alumax-minitrilho-30cm.png",
    specs:{ material:"Alumínio anodizado", capacidade:"30cm por peça, complemento de vãos curtos", fixacao:"Compatível com grampos finais e intermediários (35mm)",
      resistencia:"Anticorrosivo", garantia:"-" } },
  { id:"es3", cat:"estrutura", brand:"Alumax", sku:"-", embVenda:"1 unidade", subcategoria:"Trilhos", facetValue:"Trilhos",
    name:"Emenda de Junção entre Trilhos", price:7.20,
    // Foto real da revenda Energia Total — mesmo produto exato.
    image:"assets/products/alumax-emenda-juncao.png",
    specs:{ material:"Alumínio", capacidade:"Une 2 trilhos de 2,4m para vãos maiores", fixacao:"Encaixe de junção",
      resistencia:"Anticorrosivo", garantia:"-" } },
  { id:"es4", cat:"estrutura", brand:"Alumax", sku:"-", embVenda:"1 unidade", subcategoria:"Fixação", facetValue:"Fixação",
    name:"Terminal Final 35mm (grampo de borda)", price:11.05,
    // Foto real da revenda Energia Total — mesmo produto exato.
    image:"assets/products/alumax-terminal-final-35mm.png",
    specs:{ material:"Alumínio", capacidade:"Fixa a borda externa do módulo (moldura até 35mm)", fixacao:"Grampo final de trilho",
      resistencia:"Anticorrosivo", garantia:"-" } },
  { id:"es5", cat:"estrutura", brand:"Alumax", sku:"-", embVenda:"1 unidade", subcategoria:"Fixação", facetValue:"Fixação",
    name:"Terminal Intermediário 35mm (grampo entre painéis)", price:12.35,
    // Foto real da revenda Energia Total — mesmo produto exato.
    image:"assets/products/alumax-terminal-intermediario-35mm.png",
    specs:{ material:"Alumínio", capacidade:"Fixa entre 2 módulos adjacentes (moldura até 35mm)", fixacao:"Grampo intermediário de trilho",
      resistencia:"Anticorrosivo", garantia:"-" } },
  { id:"es6", cat:"estrutura", brand:"Alumax", sku:"-", embVenda:"1 unidade", subcategoria:"Fixação", facetValue:"Fixação",
    name:"Parafuso Estrutural (Fibrocimento/Base Metálica)", price:31.14,
    // Foto real da revenda Energia Total — mesmo produto exato.
    image:"assets/products/alumax-parafuso-estrutural.png",
    specs:{ material:"Aço resistente à corrosão", capacidade:"Fixação de trilho em telhado de fibrocimento c/ estrutura metálica", fixacao:"Rosca autobrocante",
      resistencia:"Resistente à corrosão, uso externo", garantia:"-" } },
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
      <div class="product-price">${formatBRL(p.price)}<small>ou ${formatParcelamento(p.price)}</small></div>
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
  $("#productPagePrice").innerHTML = `${formatBRL(p.price)}<small>ou ${formatParcelamento(p.price)}</small>`;
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
        <p class="wizard-fixed-item-note">Padrão: 30 metros de cabo solar 6mm² — ajuste a quantidade conforme a distância do seu projeto (lembre de somar o cabo vermelho e o preto à parte, no catálogo).</p>
        <span class="wizard-option-price">${formatBRL(cabo.price)} / metro</span>
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
          <span class="cart-item-price">${formatBRL(p.price)} / ${unidadePreco(p)}</span>
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

  const list = $("#checkoutItemsList");
  list.innerHTML = state.cart.map(item => {
    const p = getProduct(item.id);
    return `<div class="checkout-item-row"><span>${item.qty}x ${p.name}</span><span>${formatBRL(p.price * item.qty)}</span></div>`;
  }).join("");

  const total = cartTotalValue();
  $("#checkoutSubtotal").textContent = formatBRL(total);
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
loadCartFromStorage();
renderTabs();
renderFeatured();
navigate();
updateCartCount();
