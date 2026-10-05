/* =====================================================================
   ORÇAMENTO DO PRODUTO (botão "Baixar Orçamento/Datasheet" da loja)
   ---------------------------------------------------------------------
   Monta um orçamento pronto pra imprimir / salvar em PDF com os dados do
   produto. Sempre busca o catálogo no servidor NO MOMENTO do clique (sem
   cache) — o preço, a promoção, os itens do kit e as specs que o admin
   editou valem na hora, mesmo que a página da loja já estivesse aberta há
   tempo. Usa os helpers do app.js (CATEGORIES, formatBRL, effectivePrice,
   formatParcelamento, getWarrantyText, withResolvedImages, API_BASE, t),
   por isso é carregado depois dele.
   ===================================================================== */
const ORCAMENTO_VALIDADE_DIAS = 7;
const ORCAMENTO_WHATSAPP = "5565996591300";
const ORCAMENTO_WHATSAPP_EXIBIDO = "+55 65 99659-1300";

function orcEsc(v){
  return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
// A janela do orçamento nasce em branco (sem endereço-base), então toda
// imagem/link precisa ser absoluto.
function orcAbs(src){
  if(!src) return "";
  try { return new URL(src, location.href).href; } catch { return ""; }
}

function orcamentoHTML(p, agora){
  const kit = p.cat === "kits";
  const cat = CATEGORIES[p.cat];
  const lang = window.MES_I18N && window.MES_I18N.get() === "en" ? "en-US" : "pt-BR";
  const fmtData = (d) => d.toLocaleDateString(lang);
  const validoAte = new Date(agora.getTime() + ORCAMENTO_VALIDADE_DIAS * 24 * 3600 * 1000);
  const numero = `ORC-${agora.getFullYear()}${String(agora.getMonth()+1).padStart(2,"0")}${String(agora.getDate()).padStart(2,"0")}-${String(agora.getHours()).padStart(2,"0")}${String(agora.getMinutes()).padStart(2,"0")}`;

  const eff = effectivePrice(p);
  const temPromo = p.promoPrice != null && p.promoPrice > 0 && p.promoPrice < p.price;
  const titulo = kit ? t("Orçamento") : t("Ficha técnica e orçamento");
  const foto = orcAbs((p.images && p.images[0]) || p.image);
  const linkProduto = `${location.origin}${location.pathname}#produto/${encodeURIComponent(p.id)}`;

  const specs = cat.specFields
    .map(([key, label]) => [label, p.specs && p.specs[key]])
    .filter(([, v]) => v && v !== "-");

  const itensKit = (p.bundleItems || []).map(it => `
      <tr>
        <td class="c">${orcEsc(it.qty)}x</td>
        <td>${it.image ? `<img class="thumb" src="${orcEsc(orcAbs(it.image))}" alt="">` : ""}</td>
        <td><strong>${orcEsc(it.brand)}</strong> — ${orcEsc(it.name)}</td>
        <td>${orcEsc(it.sku)}</td>
      </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="${lang === "en-US" ? "en" : "pt-BR"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${orcEsc(titulo)} — ${orcEsc(p.name)}</title>
<style>
  *{ box-sizing:border-box; }
  body{ margin:0; font-family: Arial, Helvetica, sans-serif; color:#1a1200; background:#f2f0ec; }
  .toolbar{ position:sticky; top:0; display:flex; gap:10px; justify-content:center; padding:12px; background:#111; }
  .toolbar button{ padding:10px 18px; border:none; border-radius:8px; font-weight:bold; cursor:pointer; background:#F7941E; color:#1a1200; font-size:14px; }
  .toolbar button.ghost{ background:transparent; color:#fff; border:1px solid #555; }
  .page{ max-width:800px; margin:20px auto; background:#fff; padding:36px 40px; border-radius:12px; }
  header{ display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #F7941E; padding-bottom:16px; margin-bottom:22px; }
  .brand{ display:flex; align-items:center; gap:12px; }
  .brand img{ width:48px; height:48px; border-radius:10px; }
  .brand strong{ font-size:20px; display:block; }
  .brand span{ font-size:12px; color:#6b6b66; }
  .meta{ text-align:right; font-size:12px; line-height:1.6; color:#3a3a38; }
  .meta b{ font-size:15px; color:#1a1200; }
  h1{ font-size:22px; margin:0 0 4px; }
  h2{ font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:#c76b00; margin:26px 0 8px; }
  .sub{ color:#6b6b66; font-size:13px; margin:0 0 18px; }
  .hero{ display:flex; gap:22px; align-items:center; }
  .hero .photo{ width:200px; height:200px; object-fit:contain; border:1px solid #ececec; border-radius:10px; flex-shrink:0; }
  .price-box{ background:#f7f6f3; border:1px dashed #F7941E; border-radius:12px; padding:16px 20px; flex:1; }
  .price-old{ text-decoration:line-through; color:#93938f; font-size:14px; }
  .promo-tag{ display:inline-block; background:#F7941E; color:#1a1200; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:999px; margin-left:6px; text-decoration:none; }
  .price{ font-size:32px; font-weight:bold; margin:2px 0; }
  .install{ font-size:14px; color:#3a3a38; }
  .note{ font-size:12px; color:#2e7d32; margin-top:8px; font-weight:bold; }
  table{ width:100%; border-collapse:collapse; font-size:13px; }
  th, td{ text-align:left; padding:8px 10px; border-bottom:1px solid #ececec; vertical-align:middle; }
  th{ background:#f7f6f3; font-size:11px; text-transform:uppercase; color:#6b6b66; }
  td.c, th.c{ text-align:center; width:48px; font-weight:bold; }
  .thumb{ width:40px; height:40px; object-fit:contain; background:#fff; border:1px solid #ececec; border-radius:6px; display:block; }
  .specs td:first-child{ width:42%; color:#6b6b66; }
  p.txt{ font-size:13px; line-height:1.6; color:#3a3a38; margin:0 0 8px; }
  footer{ margin-top:28px; padding-top:14px; border-top:1px solid #ececec; font-size:12px; color:#6b6b66; line-height:1.6; }
  @media print{
    body{ background:#fff; }
    .toolbar{ display:none; }
    .page{ margin:0; max-width:none; padding:0; border-radius:0; }
    tr, .price-box{ break-inside:avoid; }
    @page{ size:A4; margin:14mm; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <button type="button" onclick="window.print()">${orcEsc(t("Imprimir / Salvar PDF"))}</button>
  <button type="button" class="ghost" onclick="window.close()">${orcEsc(t("Fechar"))}</button>
</div>
<div class="page">
  <header>
    <div class="brand">
      <img src="${orcEsc(orcAbs("logo-mark-128.png"))}" alt="Marques">
      <div><strong>Marques Energia Solar</strong><span>${orcEsc(location.host)}</span></div>
    </div>
    <div class="meta">
      <b>${orcEsc(titulo)}</b><br>
      ${orcEsc(t("Nº"))} ${orcEsc(numero)}<br>
      ${orcEsc(t("Emitido em"))} ${orcEsc(fmtData(agora))}<br>
      ${orcEsc(t("Válido até"))} ${orcEsc(fmtData(validoAte))}
    </div>
  </header>

  <div class="hero">
    ${foto ? `<img class="photo" src="${orcEsc(foto)}" alt="">` : ""}
    <div style="flex:1;">
      <h1>${orcEsc(p.name)}</h1>
      <p class="sub">${orcEsc(cat.label)}${p.brand ? ` · ${orcEsc(p.brand)}` : ""}${p.sku ? ` · ${orcEsc(t("SKU:"))} ${orcEsc(p.sku)}` : ""}${p.embVenda ? ` · ${orcEsc(t("Emb. venda:"))} ${orcEsc(p.embVenda)}` : ""}</p>
      <div class="price-box">
        ${temPromo ? `<div class="price-old">${orcEsc(formatBRL(p.price))}<span class="promo-tag">${orcEsc(p.promoLabel || t("Promoção"))}</span></div>` : ""}
        <div class="price">${orcEsc(formatBRL(eff))}</div>
        <div class="install">${orcEsc(t("ou"))} ${orcEsc(formatParcelamento(eff))} ${orcEsc(t("no cartão de crédito"))}</div>
        ${kit ? `<div class="note">✓ ${orcEsc(t("Preço já inclui instalação e mão de obra"))}</div>` : ""}
      </div>
    </div>
  </div>

  ${kit && itensKit ? `
  <h2>${orcEsc(t("Itens do kit"))}</h2>
  <table>
    <thead><tr><th class="c">${orcEsc(t("Qtd"))}</th><th></th><th>${orcEsc(t("Item"))}</th><th>SKU</th></tr></thead>
    <tbody>${itensKit}</tbody>
  </table>` : ""}

  ${specs.length ? `
  <h2>${orcEsc(t("Especificações"))}</h2>
  <table class="specs"><tbody>
    ${specs.map(([label, valor]) => `<tr><td>${orcEsc(label)}</td><td><strong>${orcEsc(valor)}</strong></td></tr>`).join("")}
  </tbody></table>` : ""}

  <h2>${orcEsc(t("Garantia do Fabricante"))}</h2>
  <p class="txt">${orcEsc(getWarrantyText(p))}</p>

  <h2>${orcEsc(t("Condições"))}</h2>
  <p class="txt">${orcEsc(t("Pagamento por PIX, boleto ou cartão de crédito em até 10x sem juros."))}</p>
  <p class="txt">${orcEsc(t("Valores e especificações conferidos no site em"))} ${orcEsc(agora.toLocaleString(lang))}. ${orcEsc(t("Este orçamento vale por"))} ${ORCAMENTO_VALIDADE_DIAS} ${orcEsc(t("dias a partir da emissão; depois disso, confirme o preço vigente no site."))}</p>
  <p class="txt">${orcEsc(t("Imagens meramente ilustrativas."))}</p>

  <footer>
    ${orcEsc(t("Dúvidas? Fale com nossa equipe pelo WhatsApp:"))} <strong>${orcEsc(ORCAMENTO_WHATSAPP_EXIBIDO)}</strong> (wa.me/${ORCAMENTO_WHATSAPP})<br>
    ${orcEsc(t("Ver este produto no site:"))} ${orcEsc(linkProduto)}
  </footer>
</div>
</body>
</html>`;
}

function orcamentoMensagemHTML(msg){
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${orcEsc(t("Orçamento"))}</title></head>
    <body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#3a3a38;">
      <p>${orcEsc(msg)}</p></body></html>`;
}

async function gerarOrcamento(productId){
  // A janela precisa abrir de forma síncrona no clique (senão o navegador
  // bloqueia como pop-up); o conteúdo entra depois que os dados chegam.
  const win = window.open("", "_blank");
  if(!win){ showToast(t("Permita pop-ups para baixar o orçamento.")); return; }
  win.document.open(); win.document.write(orcamentoMensagemHTML(t("Gerando orçamento..."))); win.document.close();

  try{
    const res = await fetch(`${API_BASE}/api/products`, { cache: "no-store" }).then(r => r.json());
    const fresh = res.ok && Array.isArray(res.products) ? res.products.map(withResolvedImages).find(x => x.id === productId) : null;
    if(!fresh) throw new Error("produto não encontrado");

    win.document.open(); win.document.write(orcamentoHTML(fresh, new Date())); win.document.close();
    // Abre o diálogo de impressão (escolher "Salvar como PDF") depois das
    // imagens carregarem; o botão da barra do topo serve de plano B.
    win.addEventListener("load", () => setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 400));
  } catch(e){
    win.document.open(); win.document.write(orcamentoMensagemHTML(t("Não foi possível buscar os dados atuais do produto. Tente novamente."))); win.document.close();
  }
}
