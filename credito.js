/* =====================================================================
   MARQUES ENERGIA SOLAR: PÁGINA "CRÉDITO SOLAR" (index.html)
   ---------------------------------------------------------------------
   Lógica isolada da página de crédito: simulação de crédito. Não
   depende do catálogo de produtos, carrinho ou checkout; isso fica em
   loja.html / app.js (que também tem a calculadora de dimensionamento).
   ===================================================================== */

/* Base da API: "" localmente (mesmo domínio), URL do Render em produção.
   Definida em api-config.js, carregado antes deste arquivo. */
const API_BASE = window.MES_API_BASE || "";

/* ---------------------- HELPERS ---------------------- */
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
function t(text){ return window.MES_I18N ? window.MES_I18N.t(text) : text; }

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
   SIMULAÇÃO DE CRÉDITO
   ---------------------------------------------------------------------
   Protótipo: simulações ilustrativas com taxas de exemplo, sem nenhuma
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
    label: t("Crédito CLT"),
    tag: t("Direto no contracheque"),
    icon: ICON_CLT,
    highlight: t("Mais escolhido"),
    description: t("Se você tem carteira assinada, esse é o caminho mais direto: a parcela sai do contracheque todo mês, sem boleto pra esquecer e sem fiador. A análise costuma sair em poucos dias."),
    fields: [
      { key:"valor", label:t("Valor desejado (R$)"), type:"number", placeholder:t("Ex: 18000"), hint:t("Quanto você quer contratar de crédito.") },
      { key:"parcelas", label:t("Número de parcelas"), type:"select", options:[12,24,36,48,60] },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const parcelas = parseInt(values.parcelas, 10) || 12;
      const taxaMensal = 0.021; // ilustrativa
      const parcela = pmt(valor, taxaMensal, parcelas);
      return {
        items: [
          { label:t("Parcela estimada"), value: `${formatBRL(parcela)} ${t("/ mês")}` },
          { label:t("Total estimado ao final do prazo"), value: formatBRL(parcela * parcelas) },
        ],
        note: t("É uma despesa trocando de lugar: some o boleto da conta de luz, aparece o desconto no contracheque. Só que esse, um dia, acaba."),
        compare: { type:"parcela", value: parcela },
      };
    },
  },
  fgts: {
    label: t("Saque FGTS"),
    tag: t("Sem tirar do bolso"),
    icon: ICON_FGTS,
    description: t("O saldo do saque-aniversário costuma ficar parado rendendo quase nada. Usado como entrada, ele reduz (ou até quita) o valor financiado sem mexer no seu salário do mês."),
    fields: [
      { key:"fgts", label:t("Valor disponível no FGTS (R$)"), type:"number", placeholder:t("Ex: 3000"), hint:t("Consulte no app FGTS, na opção “Saque-Aniversário”.") },
    ],
    calc(values){
      const fgts = parseFloat(values.fgts) || 0;
      return {
        items: [
          { label:t("Valor disponível para usar como entrada"), value: formatBRL(fgts) },
        ],
        note: t("Use esse saldo como entrada ao contratar o financiamento, a compra programada ou o crédito CLT: ele reduz o valor financiado e a parcela."),
        compare: { type:"fgts", value: fgts },
      };
    },
  },
  consorcio: {
    label: t("Compra Programada"),
    tag: t("Zero juros"),
    icon: ICON_CONSORCIO,
    description: t("Não é financiamento, é um grupo que se cotiza para comprar sistemas solares, sem juros. Você paga uma taxa de administração e aguarda o sorteio ou dá um lance para ser contemplado antes."),
    fields: [
      { key:"valor", label:t("Valor do crédito desejado (R$)"), type:"number", placeholder:t("Ex: 18000"), hint:t("Quanto você quer contratar de crédito.") },
      { key:"parcelas", label:t("Número de parcelas"), type:"select", options:[60,72,80,100] },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const parcelas = parseInt(values.parcelas, 10) || 60;
      const taxaAdm = 0.17; // ilustrativa
      const total = valor * (1 + taxaAdm);
      const parcela = total / parcelas;
      return {
        items: [
          { label:t("Parcela estimada"), value: `${formatBRL(parcela)} ${t("/ mês")}` },
          { label:t("Total estimado (com taxa de administração)"), value: formatBRL(total) },
        ],
        note: t("A vantagem aparece no total pago: sem juros compostos, o valor final tende a ficar menor que num financiamento tradicional de prazo parecido."),
        compare: { type:"parcela", value: parcela },
      };
    },
  },
  financiamento: {
    label: t("Financiamento Solar"),
    tag: t("Prazo mais longo"),
    icon: ICON_FINANCIAMENTO,
    description: t("Linha de banco específica para financiar sistemas de energia solar, com prazos de até 100 meses. Quanto mais longo o prazo, menor a parcela, e menor a diferença pro que você já paga de conta de luz."),
    fields: [
      { key:"valor", label:t("Kit solar"), type:"kits", hint:t("Escolha o kit mais próximo do seu consumo mensal. Consumo diferente ou orçamento personalizado? Fale com um especialista.") },
      { key:"parcelas", label:t("Número de parcelas"), type:"select", options:[24,36,48,60,72,84,96,100] },
    ],
    calc(values){
      const valor = parseFloat(values.valor) || 0;
      const parcelas = parseInt(values.parcelas, 10) || 48;
      const taxaMensal = 0.015; // ilustrativa
      const parcela = pmt(valor, taxaMensal, parcelas);
      return {
        items: [
          { label:t("Parcela estimada"), value: `${formatBRL(parcela)} ${t("/ mês")}` },
          { label:t("Total estimado ao final do prazo"), value: formatBRL(parcela * parcelas) },
        ],
        note: t("Nos prazos mais longos, a parcela tende a chegar perto do valor da conta de luz que você deixa de pagar. O que muda é pra quem vai esse dinheiro."),
        compare: { type:"parcela", value: parcela },
      };
    },
  },
};

let currentCreditMode = "clt";

// Kits solares vendidos na loja (cat "kits"), carregados do catálogo real
// pra alimentar o select de "Financiamento Solar" — ver loadKitOptions().
let kitOptions = [];

function creditFieldHTML(f){
  const hint = f.hint ? `<span class="credit-field-hint">${f.hint}</span>` : "";
  if(f.type === "kits"){
    if(!kitOptions.length){
      return `<label>${f.label}<select name="${f.key}" disabled><option>${t("Carregando kits...")}</option></select>${hint}</label>`;
    }
    const opts = kitOptions.map(k => `<option value="${k.price}">${escConsorcio(k.name)} — ${formatBRL(k.price)}</option>`).join("");
    return `<label>${f.label}<select name="${f.key}"><option value="">${t("Selecione um kit")}</option>${opts}</select>${hint}</label>`;
  }
  if(f.type === "select"){
    const opts = f.options.map(o => `<option value="${o}">${o}x</option>`).join("");
    return `<label>${f.label}<select name="${f.key}">${opts}</select>${hint}</label>`;
  }
  return `<label>${f.label}<input type="number" min="0" name="${f.key}" placeholder="${f.placeholder || ""}">${hint}</label>`;
}

// Busca o catálogo real e filtra só os kits solares (mesmos vendidos na
// loja), pra oferecer valores prontos em vez de pedir o valor do sistema
// digitado à mão. Falha em silêncio: sem catálogo, o select só fica vazio.
async function loadKitOptions(){
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const data = await res.json();
    if(!data.ok) return;
    kitOptions = data.products
      .filter(p => p.cat === "kits")
      .map(p => ({ id: p.id, name: p.name, price: p.promoPrice ?? p.price }))
      .sort((a, b) => a.price - b.price);
    if(currentCreditMode === "financiamento") renderCreditSimCard();
  } catch (err) {
    console.error("[credito] falha ao carregar kits do catálogo:", err.message);
  }
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

  // Compra Programada não é uma simulação de parcela — é um catálogo de
  // grupos com cotas limitadas, criados pelo admin. O cliente escolhe um
  // grupo já pronto e contrata na hora (sem formulário de análise).
  if(currentCreditMode === "consorcio"){
    card.innerHTML = `
      <div class="credit-sim-card-head">
        <span class="credit-mode-icon credit-mode-icon-lg">${mode.icon}</span>
        <div>
          <h3>${mode.label}</h3>
          <p id="consorcioDescricao">${mode.description}</p>
        </div>
      </div>
      <div id="consorcioGruposList"><p class="pay-empty-note">${t("Carregando grupos...")}</p></div>
      <div class="credit-sim-cta">
        <p>${t("Ficou com dúvida sobre qual modalidade escolher?")}</p>
        <a href="https://wa.me/5565996591300" target="_blank" rel="noopener" class="btn btn-outline">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          ${t("Falar com um especialista")}
        </a>
      </div>
    `;
    loadConsorcioGrupos();
    return;
  }

  card.innerHTML = `
    <div class="credit-sim-card-head">
      <span class="credit-mode-icon credit-mode-icon-lg">${mode.icon}</span>
      <div>
        <h3>${mode.label}</h3>
        <p>${mode.description}</p>
      </div>
    </div>
    <div class="credit-sim-form" id="creditSimForm">${mode.fields.map(creditFieldHTML).join("")}</div>
    <button class="btn btn-primary btn-lg" id="creditSimSubmit" type="button">${t("Simular parcela")}</button>
    ${currentCreditMode === "fgts" ? `
    <button type="button" class="fgts-auth-reopen-btn fgts-auth-reopen-btn-inline" id="fgtsAuthReopenBtnSim">
      ${t("Como autorizar os bancos a consultar meu FGTS?")}
    </button>` : ""}
    <div class="credit-sim-cta">
      <p>${t("Ficou com dúvida sobre qual modalidade escolher?")}</p>
      <a href="https://wa.me/5565996591300" target="_blank" rel="noopener" class="btn btn-outline">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        ${t("Falar com um especialista")}
      </a>
      <p class="credit-sim-disclaimer">${t("Simulação ilustrativa e sem compromisso. Os valores reais dependem de análise de crédito, taxa contratada e instituição financeira.")}</p>
    </div>

  `;
}

/* ======================================================================
   COMPRA PROGRAMADA: CATÁLOGO DE GRUPOS
   ---------------------------------------------------------------------
   Diferente das outras modalidades: não simula, lista os grupos que o
   admin liberou (visivelSite) e deixa o cliente contratar uma cota na
   hora. Sem login, guarda o grupo escolhido e manda pra entrar/cadastrar,
   retomando sozinho quando a pessoa voltar (ver restorePendingConsorcio).
   ====================================================================== */
function escConsorcio(v){
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function grupoCardHTML(g){
  const semVaga = g.vagasRestantes <= 0;
  return `
    <div class="consorcio-grupo-card" data-grupo-id="${g.id}">
      <strong>${escConsorcio(g.nome)}</strong>
      <p style="color:var(--muted); font-size:0.88rem; margin:6px 0 10px;">
        ${formatBRL(g.valorCota)}/${t("cota")} · ${g.prazoMeses}x · ${t("taxa adm.")} ${String(g.taxaAdministracaoPct).replace(".", ",")}%
      </p>
      ${g.regras ? `<p style="color:var(--muted); font-size:0.82rem; line-height:1.55; margin:0 0 10px; white-space:pre-line;">${escConsorcio(g.regras)}</p>` : ""}
      <button type="button" class="btn btn-primary" data-contratar-grupo="${g.id}" ${semVaga ? "disabled" : ""}>${semVaga ? t("Sem vagas") : t("Contratar")}</button>
      <form class="consorcio-contratar-form" data-grupo-id="${g.id}" hidden>
        <p style="color:var(--muted); font-size:0.82rem; margin:0 0 12px;">${t("Preencha seus dados e anexe os documentos pra reservar a cota. Em seguida você vê as informações para pagar a cota.")}</p>
        <label>${t("Nome completo")}<input type="text" name="nome" required></label>
        <label>CPF<input type="text" name="cpf" required inputmode="numeric" maxlength="14" placeholder="000.000.000-00"></label>
        <label>${t("Telefone / WhatsApp")}<input type="tel" name="telefone" required></label>
        <label>${t("E-mail")}<input type="email" name="email" required></label>
        <label>${t("Comprovante de endereço")}<input type="file" name="docEndereco" accept="image/jpeg,image/png,application/pdf" required></label>
        <label>${t("Documento com foto (RG, CNH...)")}<input type="file" name="docFoto" accept="image/jpeg,image/png,application/pdf" required></label>
        <div style="display:flex; gap:10px; margin-top:4px;">
          <button type="submit" class="btn btn-primary" style="width:auto;">${t("Enviar e reservar cota")}</button>
          <button type="button" class="btn btn-ghost consorcio-cancelar-form" style="width:auto;">${t("Cancelar")}</button>
        </div>
        <small class="consorcio-form-error" style="color:var(--danger); display:none; margin-top:8px;"></small>
      </form>
    </div>
  `;
}

async function loadConsorcioGrupos(){
  const box = $("#consorcioGruposList");
  if(!box) return;
  try {
    const res = await fetch(`${API_BASE}/api/consorcio/grupos`).then(r => r.json());
    if(!res.ok) throw new Error(res.error || "Erro ao carregar grupos.");
    // Texto de apresentação editado pelo admin (se houver) no lugar do padrão;
    // em inglês usa a versão em inglês, ou a em português se não existir.
    const texto = res.texto || {};
    const custom = (window.MES_I18N && window.MES_I18N.get() === "en" ? texto.en : "") || texto.pt;
    const descricao = $("#consorcioDescricao");
    if(descricao && custom) descricao.textContent = custom;
    box.innerHTML = res.grupos.length
      ? res.grupos.map(grupoCardHTML).join("")
      : `<p class="pay-empty-note">${t("Nenhum grupo disponível no momento. Fale com a gente pelo WhatsApp pra saber quando abrir novas turmas.")}</p>`;
  } catch(e) {
    box.innerHTML = `<p class="pay-empty-note">${t("Não foi possível carregar os grupos agora. Tente novamente em instantes.")}</p>`;
  }
}

// Antes contratava na hora com um clique; agora só abre o formulário (dados
// + documentos) — quem efetivamente cria a adesão é enviarContratacao(),
// no submit do form.
async function contratarGrupo(grupoId){
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.getCustomer() : null;
  if(!customer){
    localStorage.setItem("mes_pending_consorcio_grupo", String(grupoId));
    window.location.href = "conta/entrar.html?redirect=" + encodeURIComponent("index.html#simulacao-credito");
    return;
  }
  const form = document.querySelector(`.consorcio-contratar-form[data-grupo-id="${grupoId}"]`);
  if(!form) return;
  form.hidden = !form.hidden;
  if(!form.hidden){
    form.querySelector('[name="nome"]').value = customer.nome || "";
    form.querySelector('[name="cpf"]').value = customer.cpf || "";
    form.querySelector('[name="telefone"]').value = customer.telefone || "";
    form.querySelector('[name="email"]').value = customer.email || "";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function fileToBase64Consorcio(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Troca o formulário por um painel com o QR code de pagamento da cota. A
// imagem vem de uma rota que só entrega pro dono da adesão (cookie de sessão).
// Copia pro clipboard (API moderna; cai no execCommand em navegador antigo).
async function copiarTexto(texto){
  try { await navigator.clipboard.writeText(texto); return true; } catch { /* tenta o plano B */ }
  const ta = document.createElement("textarea");
  ta.value = texto; ta.style.cssText = "position:fixed; opacity:0;";
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  return ok;
}

function mostrarQrPagamento(form, adesao){
  const qrUrl = `${API_BASE}/api/customers/me/consorcio-adesoes/${adesao.id}/qr`;
  form.reset();
  form.innerHTML = `
    <div class="consorcio-qr-panel" style="text-align:center; padding:8px 0;">
      <strong>${t("Cota reservada! Pague para garantir sua vaga")}</strong>
      <p style="color:var(--muted); font-size:0.85rem; margin:8px 0 12px;">
        ${adesao.grupoTemQr ? t("Escaneie o QR code no app do seu banco para pagar a cota") : t("Copie o código PIX abaixo e cole no app do seu banco para pagar a cota")} (${formatBRL(adesao.valorCota)}).
        ${t("Assim que conferirmos o pagamento, sua adesão é confirmada e você recebe um aviso por e-mail.")}
      </p>
      ${adesao.grupoTemQr ? `<img src="${qrUrl}" alt="QR code" style="display:block; margin:0 auto; width:min(340px, 100%); aspect-ratio:1 / 1; object-fit:contain; background:#fff; border-radius:14px; padding:10px; box-sizing:border-box;">` : ""}
      ${adesao.pixCopiaCola ? `
      <div style="margin:18px auto 0; max-width:440px; text-align:left;">
        <p style="color:var(--muted); font-size:0.8rem; margin:0 0 6px;">${t("PIX copia e cola")}</p>
        <div style="font-family:monospace; font-size:0.75rem; word-break:break-all; background:var(--surface-2); border-radius:10px; padding:10px 12px; max-height:90px; overflow:auto;">${escConsorcio(adesao.pixCopiaCola)}</div>
        <button type="button" class="btn btn-primary consorcio-copiar-pix" style="width:100%; justify-content:center; margin-top:10px;">${t("Copiar código PIX")}</button>
      </div>` : ""}
      <div style="margin-top:14px;"><button type="button" class="btn btn-ghost consorcio-qr-fechar" style="width:auto;">${t("Fechar")}</button></div>
    </div>`;
  const copiarBtn = form.querySelector(".consorcio-copiar-pix");
  if(copiarBtn){
    copiarBtn.addEventListener("click", async () => {
      const ok = await copiarTexto(adesao.pixCopiaCola);
      copiarBtn.textContent = ok ? t("Copiado!") : t("Não foi possível copiar — selecione o código e copie manualmente.");
      setTimeout(() => { copiarBtn.textContent = t("Copiar código PIX"); }, 2500);
    });
  }
  form.querySelector(".consorcio-qr-fechar").addEventListener("click", () => {
    form.hidden = true;
    loadConsorcioGrupos();
  });
}

async function enviarContratacao(form){
  const grupoId = form.dataset.grupoId;
  const errorBox = form.querySelector(".consorcio-form-error");
  errorBox.style.display = "none";

  const docEnderecoFile = form.querySelector('[name="docEndereco"]').files[0];
  const docFotoFile = form.querySelector('[name="docFoto"]').files[0];
  if(!docEnderecoFile || !docFotoFile){
    errorBox.textContent = t("Anexe o comprovante de endereço e um documento com foto.");
    errorBox.style.display = "block";
    return;
  }
  const MAX_DOC_BYTES = 5 * 1024 * 1024;
  if(docEnderecoFile.size > MAX_DOC_BYTES || docFotoFile.size > MAX_DOC_BYTES){
    errorBox.textContent = t("Cada documento deve ter no máximo 5MB.");
    errorBox.style.display = "block";
    return;
  }

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = t("Enviando...");
  try {
    const res = await CONTA_apiPost(`/api/consorcio/grupos/${grupoId}/contratar`, {
      nome: form.querySelector('[name="nome"]').value.trim(),
      cpf: form.querySelector('[name="cpf"]').value.trim(),
      telefone: form.querySelector('[name="telefone"]').value.trim(),
      email: form.querySelector('[name="email"]').value.trim(),
      docEnderecoBase64: await fileToBase64Consorcio(docEnderecoFile),
      docEnderecoTipo: docEnderecoFile.type,
      docEnderecoNome: docEnderecoFile.name,
      docFotoBase64: await fileToBase64Consorcio(docFotoFile),
      docFotoTipo: docFotoFile.type,
      docFotoNome: docFotoFile.name,
      ref: window.MES_REF ? window.MES_REF.get() : "",
    });
    if(!res.ok){
      errorBox.textContent = res.error || t("Não foi possível contratar esse grupo.");
      errorBox.style.display = "block";
      return;
    }
    // Grupo com QR code de pagamento cadastrado: mostra o QR na hora, pro
    // cliente já poder pagar a cota (o link por e-mail continua valendo).
    if(res.adesao && (res.adesao.grupoTemQr || res.adesao.pixCopiaCola)){
      mostrarQrPagamento(form, res.adesao);
      return;
    }
    showToast(t("Dados recebidos! Sua cota está reservada — acompanhe o pagamento em Marques Pay."));
    form.reset();
    form.hidden = true;
    loadConsorcioGrupos();
  } catch(e) {
    errorBox.textContent = t("Erro de conexão. Tente novamente.");
    errorBox.style.display = "block";
  } finally {
    btn.disabled = false; btn.textContent = t("Enviar e reservar cota");
  }
}

// Pequeno helper local (credito.js não carrega conta.js) só pra POST com
// cookie de sessão — mesmo padrão do fetch usado no restante do arquivo.
async function CONTA_apiPost(path, body){
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

let fgtsAuthShownOnce = false;

$("#creditTabs")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".credit-mode-card");
  if(!btn) return;
  currentCreditMode = btn.dataset.mode;
  renderCreditModes();
  renderCreditSimCard();
  syncLeadModalidade();

  // Ao escolher a modalidade "Saque FGTS", já adiantamos a explicação de
  // como autorizar os bancos parceiros; assim a pessoa resolve isso antes
  // mesmo de preencher e enviar o formulário de solicitação.
  if(currentCreditMode === "fgts" && !fgtsAuthShownOnce){
    fgtsAuthShownOnce = true;
    setTimeout(openFgtsAuthModal, 400);
  }
});

document.addEventListener("click", (e) => {
  if(e.target.closest("#fgtsAuthReopenBtnSim")) openFgtsAuthModal();
});

/* Mantém o select "Modalidade de interesse" do formulário de solicitação
   sincronizado com a modalidade escolhida na simulação acima. */
function syncLeadModalidade(){
  const select = $("#leadModalidade");
  if(select) select.value = currentCreditMode;
  updateLeadEnderecoVisibility();
}

// Crédito CLT e Financiamento Solar precisam do endereço completo (análise
// de crédito / instalação do sistema); as outras modalidades não.
const MODALIDADES_COM_ENDERECO = ["clt", "financiamento"];

function updateLeadEnderecoVisibility(){
  const section = $("#leadEnderecoSection");
  if(!section) return;
  const modalidade = $("#leadModalidade")?.value;
  const precisaEndereco = MODALIDADES_COM_ENDERECO.includes(modalidade);
  section.hidden = !precisaEndereco;
  $all("input", section).forEach((el) => {
    if(el.name !== "endereco_complemento") el.required = precisaEndereco;
  });
}

$("#leadModalidade")?.addEventListener("change", updateLeadEnderecoVisibility);

/* Guarda a última simulação feita (modalidade + valores + resultado) pra
   levar junto quando a pessoa preencher e enviar o formulário de solicitação
   lá embaixo, em vez de mostrar o resultado aqui mesmo. */
let lastSimResult = null;

/* Mostra a seção "Passo 2: Solicitação" com o que já foi simulado. Só é
   chamada depois de confirmar que existe conta logada (ver mais abaixo). */
function revealLeadSection(){
  renderLeadSimSummary();
  const leadSection = $("#solicitar-analise");
  if(leadSection){
    leadSection.hidden = false;
    // Como já estamos rolando a tela até aqui de propósito, mostra o
    // conteúdo direto em vez de depender do IntersectionObserver de scroll
    // (que não pega elementos que acabaram de sair de "hidden").
    $all(".reveal", leadSection).forEach(el => el.classList.add("in-view"));
  }
  leadSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("click", async (e) => {
  if(e.target.id !== "creditSimSubmit") return;
  const form = $("#creditSimForm");
  const values = {};
  $all("input, select", form).forEach(el => { values[el.name] = el.value; });

  const mode = CREDIT_MODES[currentCreditMode];
  const requiredField = mode.fields[0];
  if(!(parseFloat(values[requiredField.key]) > 0)){
    showToast(`${t("Informe")} ${requiredField.label.toLowerCase()} ${t("para simular.")}`);
    return;
  }

  const result = mode.calc(values);
  lastSimResult = { modalidade: currentCreditMode, values, result };
  syncLeadModalidade();

  // Solicitar a análise exige conta: sem login, guarda a simulação (pra
  // não precisar refazer) e manda pra tela de entrar/cadastrar, que volta
  // pra cá sozinha depois.
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.getCustomer() : null;
  if(!customer){
    localStorage.setItem("mes_pending_lead_sim", JSON.stringify(lastSimResult));
    window.location.href = "conta/entrar.html?redirect=" + encodeURIComponent("index.html#solicitar-analise");
    return;
  }

  revealLeadSection();
});

/* Se a pessoa simulou, foi mandada pra login/cadastro e voltou logada,
   retoma a simulação guardada em vez de pedir pra refazer tudo. */
async function restorePendingLeadSim(){
  const pending = localStorage.getItem("mes_pending_lead_sim");
  if(!pending) return;
  localStorage.removeItem("mes_pending_lead_sim");

  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.getCustomer() : null;
  if(!customer) return;

  try {
    lastSimResult = JSON.parse(pending);
  } catch(e) {
    return;
  }
  currentCreditMode = lastSimResult.modalidade;
  renderCreditModes();
  renderCreditSimCard();
  syncLeadModalidade();
  revealLeadSection();
}

/* Recapitula, logo acima do formulário de solicitação, o que a pessoa
   simulou lá em cima — sem repetir a caixa de resultado inteira. */
function renderLeadSimSummary(){
  const box = $("#leadSimSummary");
  if(!box || !lastSimResult) return;
  const mode = CREDIT_MODES[lastSimResult.modalidade];
  const { modalidade, values } = lastSimResult;

  const detalhe = modalidade === "fgts"
    ? `${formatBRL(parseFloat(values.fgts) || 0)} ${t("disponíveis no FGTS")}`
    : `${formatBRL(parseFloat(values.valor) || 0)} ${t("em")} ${values.parcelas}x`;

  box.innerHTML = `${ICON_CHECK}<span>${t("Simulação:")} <strong>${mode.label}</strong>, ${detalhe}. <a href="#simulacao-credito">${t("Alterar simulação")}</a></span>`;
  box.hidden = false;
}

/* ======================================================================
   POP-UP: AUTORIZAÇÃO DE CONSULTA DO FGTS
   ---------------------------------------------------------------------
   Exibido depois que a pessoa solicita a análise de crédito na modalidade
   "Saque FGTS", ensina a autorizar os dois bancos parceiros a consultar
   o saldo do saque-aniversário no app oficial (FGTS / Caixa).
   ====================================================================== */
function openFgtsAuthModal(){
  const modal = $("#fgtsAuthModal");
  if(!modal) return;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeFgtsAuthModal(){
  const modal = $("#fgtsAuthModal");
  if(!modal) return;
  modal.classList.remove("open");
  document.body.style.overflow = "";
}
$("#fgtsAuthCloseBtn")?.addEventListener("click", closeFgtsAuthModal);
$("#fgtsAuthDoneBtn")?.addEventListener("click", closeFgtsAuthModal);
$("#fgtsAuthModal")?.addEventListener("click", (e) => {
  if(e.target.id === "fgtsAuthModal") closeFgtsAuthModal();
});
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeFgtsAuthModal();
});
$("#fgtsAuthReopenBtn")?.addEventListener("click", openFgtsAuthModal);

/* ======================================================================
   SOLICITAÇÃO DE ANÁLISE DE CRÉDITO (formulário)
   ---------------------------------------------------------------------
   Envia os dados para o backend (rota pública /api/credit-leads), que
   persiste a solicitação no banco e a deixa disponível no painel de
   administrador; mesmo fluxo já usado pelos pedidos da loja.
   ====================================================================== */

// Se a pessoa já estiver logada, puxa o que já sabemos da conta (nome,
// CPF, telefone, e-mail, cidade/UF) pra poupar ela de redigitar. Só
// preenche campo vazio — nunca sobrescreve o que a pessoa já digitou.
async function prefillLeadFormFromAccount(){
  const form = $("#creditLeadForm");
  if(!form || !window.MES_ACCOUNT) return;
  const customer = await window.MES_ACCOUNT.getCustomer();
  if(!customer) return;

  const setIfEmpty = (name, value) => {
    if(!value) return;
    const field = form.elements[name];
    if(field && !field.value) field.value = value;
  };

  setIfEmpty("nome", customer.nome);
  setIfEmpty("cpf", customer.cpf);
  setIfEmpty("telefone", customer.telefone);
  setIfEmpty("email", customer.email);
  const cidade = customer.endereco && customer.endereco.cidade;
  const estado = customer.endereco && customer.endereco.estado;
  setIfEmpty("cidade_uf", cidade && estado ? `${cidade} / ${estado}` : cidade || "");
}
prefillLeadFormFromAccount();

$("#creditLeadForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = $("#leadFormSubmitBtn");
  const errorBox = $("#leadFormError");
  errorBox.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.textContent = t("Enviando solicitação...");

  const formData = new FormData(e.target);
  const payload = {
    modalidade_interesse: formData.get("modalidade_interesse"),
    nome: formData.get("nome"),
    cpf: formData.get("cpf"),
    data_nascimento: formData.get("data_nascimento"),
    estado_civil: formData.get("estado_civil") || "",
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    cidade_uf: formData.get("cidade_uf"),
    profissao: formData.get("profissao"),
    tipo_vinculo: formData.get("tipo_vinculo"),
    empresa: formData.get("empresa"),
    tempo_trabalho: formData.get("tempo_trabalho"),
    renda_bruta: formData.get("renda_bruta"),
    renda_liquida: formData.get("renda_liquida"),
    endereco_cep: formData.get("endereco_cep") || "",
    endereco_cidade: formData.get("endereco_cidade") || "",
    endereco_estado: formData.get("endereco_estado") || "",
    endereco_rua: formData.get("endereco_rua") || "",
    endereco_numero: formData.get("endereco_numero") || "",
    endereco_bairro: formData.get("endereco_bairro") || "",
    endereco_complemento: formData.get("endereco_complemento") || "",
    sim_valor_sistema: lastSimResult?.values.valor || "",
    sim_parcelas: lastSimResult?.values.parcelas || "",
    sim_fgts_disponivel: lastSimResult?.values.fgts || "",
    sim_parcela_estimada: lastSimResult?.result.compare?.type === "parcela" ? lastSimResult.result.compare.value : "",
    ref: window.MES_REF ? window.MES_REF.get() : "",
  };

  try {
    const res = await fetch(`${API_BASE}/api/credit-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if(!data.ok){
      errorBox.textContent = data.error || t("Não foi possível enviar sua solicitação. Tente novamente.");
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = t("Solicitar Simulação Personalizada");
      return;
    }

    $("#leadNumberChip").textContent = data.leadNumber;
    e.target.hidden = true;
    if($("#leadSimSummary")) $("#leadSimSummary").hidden = true;
    $("#leadFormSuccess").hidden = false;
    $("#leadFormSuccess").scrollIntoView({ behavior: "smooth", block: "start" });

    // Na modalidade "Saque FGTS", a análise depende de consultar o saldo do
    // saque-aniversário; por isso ensinamos a pessoa a autorizar os dois
    // bancos parceiros a fazer essa consulta no app oficial.
    if(payload.modalidade_interesse === "fgts"){
      $("#fgtsAuthReopenBtn").hidden = false;
      setTimeout(openFgtsAuthModal, 500);
    }
  } catch(err){
    errorBox.textContent = t("Não foi possível conectar ao servidor. Verifique se o backend está rodando (ver README) e tente novamente.");
    errorBox.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t("Solicitar Simulação Personalizada");
  }
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-contratar-grupo]");
  if(btn && !btn.disabled){
    contratarGrupo(parseInt(btn.dataset.contratarGrupo, 10));
    return;
  }
  if(e.target.closest(".consorcio-cancelar-form")){
    const form = e.target.closest(".consorcio-contratar-form");
    if(form){ form.reset(); form.hidden = true; }
  }
});

document.addEventListener("submit", (e) => {
  const form = e.target.closest(".consorcio-contratar-form");
  if(!form) return;
  e.preventDefault();
  enviarContratacao(form);
});

/* Se a pessoa clicou "Contratar" num grupo, foi mandada pra login/cadastro
   e voltou logada, reabre o formulário já preenchido em vez de pedir pra
   escolher o grupo de novo (ela ainda precisa anexar os documentos e
   enviar — não dá pra reter arquivo escolhido através do redirecionamento). */
async function restorePendingConsorcio(){
  const pendingId = localStorage.getItem("mes_pending_consorcio_grupo");
  if(!pendingId) return;
  localStorage.removeItem("mes_pending_consorcio_grupo");

  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.getCustomer() : null;
  if(!customer) return;

  currentCreditMode = "consorcio";
  renderCreditModes();
  renderCreditSimCard();
  await contratarGrupo(parseInt(pendingId, 10));
  $("#creditSimCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------------- BUSCA DE CEP (autopreenchimento) ----------------------
   Mesma ideia do checkout da loja: usa a ViaCEP pra preencher cidade,
   estado, rua e bairro a partir do CEP. Campos continuam editáveis. */
async function buscarEnderecoLeadPorCep(rawCep){
  const cep = String(rawCep || "").replace(/\D/g, "");
  const statusEl = $("#leadCepStatus");

  if(cep.length !== 8){
    if(statusEl) statusEl.hidden = true;
    return;
  }

  if(statusEl){
    statusEl.hidden = false;
    statusEl.className = "field-hint";
    statusEl.textContent = t("Buscando endereço...");
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if(data.erro){
      if(statusEl){
        statusEl.className = "field-hint field-hint-error";
        statusEl.textContent = t("CEP não encontrado. Preencha o endereço manualmente.");
      }
      return;
    }

    const cidadeEl = $("#leadCidade");
    const estadoEl = $("#leadEstado");
    const ruaEl = $("#leadRua");
    const bairroEl = $("#leadBairro");
    if(cidadeEl) cidadeEl.value = data.localidade || cidadeEl.value;
    if(estadoEl) estadoEl.value = data.uf || estadoEl.value;
    if(ruaEl) ruaEl.value = data.logradouro || ruaEl.value;
    if(bairroEl) bairroEl.value = data.bairro || bairroEl.value;

    if(statusEl){
      statusEl.className = "field-hint field-hint-ok";
      statusEl.textContent = t("Endereço encontrado. Confira e complete se precisar.");
    }
  } catch(err){
    if(statusEl){
      statusEl.className = "field-hint field-hint-error";
      statusEl.textContent = t("Não foi possível buscar o CEP agora. Preencha manualmente.");
    }
  }
}

const leadCepInput = $("#leadCep");
if(leadCepInput){
  leadCepInput.addEventListener("input", () => {
    const digits = leadCepInput.value.replace(/\D/g, "").slice(0, 8);
    leadCepInput.value = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits;
    if(digits.length === 8) buscarEnderecoLeadPorCep(digits);
  });
  leadCepInput.addEventListener("blur", () => buscarEnderecoLeadPorCep(leadCepInput.value));
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
$("#mainNav").addEventListener("click", (e) => {
  if(e.target.closest("a")) closeMobileMenu();
});

/* ======================================================================
   INICIALIZAÇÃO
   ====================================================================== */
renderCreditModes();
renderCreditSimCard();
loadKitOptions();
syncLeadModalidade();
initScrollReveal();
restorePendingLeadSim();
restorePendingConsorcio();
