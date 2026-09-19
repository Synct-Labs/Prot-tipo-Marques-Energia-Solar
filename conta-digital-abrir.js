/* =====================================================================
   MARQUES PAY: ABERTURA DE CONTA (cadastro/KYC)
   ---------------------------------------------------------------------
   Salva rascunho, envia documentos e manda o cadastro para análise.
   Só a conta aprovada leva ao painel (conta-digital-dashboard.html).
   ===================================================================== */
const API_BASE = window.MES_API_BASE || "";
const form = document.getElementById("kycForm");
const $err = document.getElementById("formError");
const MAX_BYTES = 4 * 1024 * 1024;
const DOC_LABEL_OK = "Enviado";

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function showError(msg) {
  $err.textContent = msg;
  $err.classList.add("show");
  $err.scrollIntoView({ behavior: "smooth", block: "center" });
}
function clearError() { $err.classList.remove("show"); }

function field(name) { return form.elements[name]; }

function collect() {
  const data = {};
  for (const el of form.elements) {
    if (!el.name || el.type === "file" || el.type === "radio") continue;
    data[el.name] = el.value;
  }
  const pep = form.querySelector('input[name="pep"]:checked');
  data.pep = pep ? pep.value === "sim" : null;
  return data;
}

function fill(kyc, customer) {
  const src = { ...prefillFromCustomer(customer), ...(kyc || {}) };
  for (const [k, v] of Object.entries(src)) {
    const el = field(k);
    if (!el || el.type === "file" || el.type === "radio") continue;
    if (v !== "" && v != null) el.value = v;
  }
  if (kyc && typeof kyc.pep === "boolean") {
    form.querySelector(`input[name="pep"][value="${kyc.pep ? "sim" : "nao"}"]`).checked = true;
  }
  togglePep();
  for (const tipo of (kyc && kyc.documentos) || []) markDoc(tipo, DOC_LABEL_OK);
}

function prefillFromCustomer(c) {
  if (!c) return {};
  const e = c.endereco || {};
  return {
    nome_completo: c.nome, cpf: c.cpf, telefone: c.telefone,
    end_cep: e.cep, end_rua: e.rua, end_numero: e.numero, end_complemento: e.complemento,
    end_bairro: e.bairro, end_cidade: e.cidade, end_uf: e.estado,
  };
}

function togglePep() {
  const yes = form.querySelector('input[name="pep"]:checked')?.value === "sim";
  document.getElementById("pepDetalheWrap").hidden = !yes;
}
form.querySelectorAll('input[name="pep"]').forEach((r) => r.addEventListener("change", togglePep));

function markDoc(tipo, text, isError) {
  const box = document.querySelector(`.kyc-doc[data-tipo="${tipo}"] em`);
  if (!box) return;
  box.textContent = text;
  box.className = isError ? "is-error" : "is-ok";
}

async function saveDraft() {
  const res = await api("PUT", "/api/customers/me/pay-kyc", collect());
  if (!res.ok) throw new Error(res.error || "Não foi possível salvar.");
  return res.kyc;
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

document.querySelectorAll(".kyc-doc input[type=file]").forEach((input) => {
  input.addEventListener("change", async () => {
    const tipo = input.closest(".kyc-doc").dataset.tipo;
    const file = input.files[0];
    if (!file) return;
    if (file.size > MAX_BYTES) { markDoc(tipo, "Arquivo maior que 4 MB.", true); return; }
    markDoc(tipo, "Enviando...");
    try {
      await saveDraft(); // o documento precisa de um cadastro já salvo
      const res = await api("PUT", `/api/customers/me/pay-kyc/documents/${tipo}`, {
        base64: await readAsBase64(file), mime: file.type, nome: file.name,
      });
      if (!res.ok) throw new Error(res.error || "Falha no envio.");
      markDoc(tipo, `${DOC_LABEL_OK}: ${file.name}`);
    } catch (err) {
      markDoc(tipo, err.message, true);
    }
  });
});

document.getElementById("saveDraftBtn").addEventListener("click", async (e) => {
  clearError();
  e.target.disabled = true;
  try { await saveDraft(); e.target.textContent = "Rascunho salvo"; setTimeout(() => (e.target.textContent = "Salvar rascunho"), 1800); }
  catch (err) { showError(err.message); }
  finally { e.target.disabled = false; }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Enviando...";
  try {
    await saveDraft();
    const res = await api("POST", "/api/customers/me/pay-kyc/submit", {
      aceiteTermos: document.getElementById("aceiteTermos").checked,
    });
    if (!res.ok) throw new Error(res.error || "Não foi possível enviar.");
    showView(res.kyc);
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar para análise";
  }
});

function showView(kyc) {
  const analise = kyc && kyc.status === "em_analise";
  document.getElementById("viewAnalise").hidden = !analise;
  document.getElementById("viewForm").hidden = analise;
  if (analise && kyc.enviadoEm) {
    document.getElementById("analiseInfo").textContent = `Enviado em ${new Date(kyc.enviadoEm).toLocaleString("pt-BR")}.`;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

(async function init() {
  const customer = window.MES_ACCOUNT ? await window.MES_ACCOUNT.requireLogin() : null;
  if (!customer) return;
  const res = await api("GET", "/api/customers/me/pay-kyc");
  if (res.ok && res.account) { location.replace("conta-digital-dashboard.html"); return; }
  const kyc = res.ok ? res.kyc : null;
  fill(kyc, customer);
  if (kyc && kyc.status === "reprovado") {
    const box = document.getElementById("motivoBox");
    box.textContent = `Seu cadastro não foi aprovado: ${kyc.motivoReprovacao || "sem motivo informado"}. Corrija e envie de novo.`;
    box.classList.add("show");
  }
  showView(kyc);
})();
