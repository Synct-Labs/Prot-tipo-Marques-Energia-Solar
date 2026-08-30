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
    label: "Crédito CLT",
    tag: "Direto no contracheque",
    icon: ICON_CLT,
    highlight: "Mais escolhido",
    description: "Se você tem carteira assinada, esse é o caminho mais direto: a parcela sai do contracheque todo mês, sem boleto pra esquecer e sem fiador. A análise costuma sair em poucos dias.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000", hint:"Valor total do sistema, já com instalação. Use o número do seu orçamento." },
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
        note: "É uma despesa trocando de lugar: some o boleto da conta de luz, aparece o desconto no contracheque. Só que esse, um dia, acaba.",
        compare: { type:"parcela", value: parcela },
      };
    },
  },
  fgts: {
    label: "Saque FGTS",
    tag: "Sem tirar do bolso",
    icon: ICON_FGTS,
    description: "O saldo do saque-aniversário costuma ficar parado rendendo quase nada. Usado como entrada, ele reduz (ou até quita) o valor financiado sem mexer no seu salário do mês.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000", hint:"Valor total do sistema, já com instalação. Use o número do seu orçamento." },
      { key:"fgts", label:"Valor disponível no FGTS (R$)", type:"number", placeholder:"Ex: 3000", hint:"Consulte no app FGTS, na opção “Saque-Aniversário”." },
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
          ? "Esse saldo sozinho já paga o sistema inteiro. Você garante energia solar sem contratar nenhum crédito."
          : `Esse saldo cobre ${pct}% do sistema. Os outros ${100 - pct}% podem entrar no CLT, no financiamento ou no consórcio. Dá pra combinar mais de uma modalidade.`,
        compare: { type:"progress", value: pct },
      };
    },
  },
  consorcio: {
    label: "Consórcio",
    tag: "Zero juros",
    icon: ICON_CONSORCIO,
    description: "Não é financiamento, é um grupo que se cotiza para comprar sistemas solares, sem juros. Você paga uma taxa de administração e aguarda o sorteio ou dá um lance para ser contemplado antes.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000", hint:"Valor total do sistema, já com instalação. Use o número do seu orçamento." },
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
        note: "A vantagem aparece no total pago: sem juros compostos, o valor final tende a ficar menor que num financiamento tradicional de prazo parecido.",
        compare: { type:"parcela", value: parcela },
      };
    },
  },
  financiamento: {
    label: "Financiamento Bancário",
    tag: "Prazo mais longo",
    icon: ICON_FINANCIAMENTO,
    description: "Linhas de banco criadas especificamente para energia solar, com prazos de até 96 meses. Quanto mais longo o prazo, menor a parcela, e menor a diferença pro que você já paga de conta de luz.",
    fields: [
      { key:"valor", label:"Valor do sistema (R$)", type:"number", placeholder:"Ex: 18000", hint:"Valor total do sistema, já com instalação. Use o número do seu orçamento." },
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
        note: "Nos prazos mais longos, a parcela tende a chegar perto do valor da conta de luz que você deixa de pagar. O que muda é pra quem vai esse dinheiro.",
        compare: { type:"parcela", value: parcela },
      };
    },
  },
};

let currentCreditMode = "clt";

function creditFieldHTML(f){
  const hint = f.hint ? `<span class="credit-field-hint">${f.hint}</span>` : "";
  if(f.type === "select"){
    const opts = f.options.map(o => `<option value="${o}">${o}x</option>`).join("");
    return `<label>${f.label}<select name="${f.key}">${opts}</select>${hint}</label>`;
  }
  return `<label>${f.label}<input type="number" min="0" name="${f.key}" placeholder="${f.placeholder || ""}">${hint}</label>`;
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

/* Referência da conta de luz vinda da calculadora de dimensionamento da
   loja (loja.html / app.js), se o cliente já calculou por lá. */
function getContaAtual(){
  const raw = localStorage.getItem("mes_conta_atual");
  const val = parseFloat(raw);
  return (!isNaN(val) && val > 0) ? val : null;
}

function renderCreditContext(){
  const el = $("#creditContext");
  if(!el) return;
  const conta = getContaAtual();
  el.innerHTML = conta
    ? `${ICON_CHECK}<span>Comparando com a conta de <strong>${formatBRL(conta)}/mês</strong> que você informou na calculadora de dimensionamento da loja.</span>`
    : `<span>Quer comparar com sua conta de luz? Calcule o tamanho do seu sistema <a href="loja.html#dimensionamento">na loja</a> antes de simular aqui.</span>`;
  el.classList.toggle("has-value", !!conta);
}

function renderCreditSimCard(){
  const card = $("#creditSimCard");
  if(!card) return;
  const mode = CREDIT_MODES[currentCreditMode];

  card.innerHTML = `
    <p class="credit-context" id="creditContext"></p>
    <div class="credit-sim-card-head">
      <span class="credit-mode-icon credit-mode-icon-lg">${mode.icon}</span>
      <div>
        <h3>${mode.label}</h3>
        <p>${mode.description}</p>
      </div>
    </div>
    <div class="credit-sim-form" id="creditSimForm">${mode.fields.map(creditFieldHTML).join("")}</div>
    <button class="btn btn-primary btn-lg" id="creditSimSubmit" type="button">Simular parcela</button>
    ${currentCreditMode === "fgts" ? `
    <button type="button" class="fgts-auth-reopen-btn fgts-auth-reopen-btn-inline" id="fgtsAuthReopenBtnSim">
      Como autorizar os bancos a consultar meu FGTS?
    </button>` : ""}
    <div class="credit-sim-cta">
      <p>Ficou com dúvida sobre qual modalidade escolher?</p>
      <a href="https://wa.me/5565996591300" target="_blank" rel="noopener" class="btn btn-outline">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        Falar com um especialista
      </a>
      <p class="credit-sim-disclaimer">Simulação ilustrativa e sem compromisso. Os valores reais dependem de análise de crédito, taxa contratada e instituição financeira.</p>
    </div>

  `;
  renderCreditContext();
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
}

/* Guarda a última simulação feita (modalidade + valores + resultado) pra
   levar junto quando a pessoa preencher e enviar o formulário de solicitação
   lá embaixo, em vez de mostrar o resultado aqui mesmo. */
let lastSimResult = null;

document.addEventListener("click", (e) => {
  if(e.target.id !== "creditSimSubmit") return;
  const form = $("#creditSimForm");
  const values = {};
  $all("input, select", form).forEach(el => { values[el.name] = el.value; });

  if(!(parseFloat(values.valor) > 0)){
    showToast("Informe o valor do sistema para simular.");
    return;
  }

  const mode = CREDIT_MODES[currentCreditMode];
  const result = mode.calc(values);
  lastSimResult = { modalidade: currentCreditMode, values, result };

  syncLeadModalidade();
  renderLeadSimSummary();
  $("#solicitar-analise")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* Recapitula, logo acima do formulário de solicitação, o que a pessoa
   simulou lá em cima — sem repetir a caixa de resultado inteira. */
function renderLeadSimSummary(){
  const box = $("#leadSimSummary");
  if(!box || !lastSimResult) return;
  const mode = CREDIT_MODES[lastSimResult.modalidade];
  const { modalidade, values } = lastSimResult;
  const valor = parseFloat(values.valor) || 0;

  const detalhe = modalidade === "fgts"
    ? `${formatBRL(valor)} de sistema, com ${formatBRL(parseFloat(values.fgts) || 0)} de FGTS disponível`
    : `${formatBRL(valor)} em ${values.parcelas}x`;

  box.innerHTML = `${ICON_CHECK}<span>Simulação: <strong>${mode.label}</strong>, ${detalhe}. <a href="#simulacao-credito">Alterar simulação</a></span>`;
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
$("#creditLeadForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = $("#leadFormSubmitBtn");
  const errorBox = $("#leadFormError");
  errorBox.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando solicitação...";

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
    sim_valor_sistema: lastSimResult?.values.valor || "",
    sim_parcelas: lastSimResult?.values.parcelas || "",
    sim_fgts_disponivel: lastSimResult?.values.fgts || "",
    sim_parcela_estimada: lastSimResult?.result.compare?.type === "parcela" ? lastSimResult.result.compare.value : "",
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
      errorBox.textContent = data.error || "Não foi possível enviar sua solicitação. Tente novamente.";
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Solicitar Simulação Personalizada";
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
    errorBox.textContent = "Não foi possível conectar ao servidor. Verifique se o backend está rodando (ver README) e tente novamente.";
    errorBox.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Solicitar Simulação Personalizada";
  }
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
syncLeadModalidade();
initScrollReveal();
