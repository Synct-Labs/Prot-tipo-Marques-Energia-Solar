/* Gerado a partir do catalogo original em app.js (extracao automatica, ver historico do git pra origem) */
const SEED_PRODUCTS = [
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

module.exports = { SEED_PRODUCTS };
