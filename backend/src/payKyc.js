/* =====================================================================
   MARQUES PAY: CADASTRO (KYC) PARA ABERTURA DE CONTA
   ---------------------------------------------------------------------
   Coleta e valida os dados que uma instituição financeira exige para
   abrir conta (identificação, filiação, documento, endereço, ocupação/
   renda, declaração de PEP, comprovantes e consentimento). Fluxo:

     rascunho -> em_analise -> aprovado | reprovado -> (edita) rascunho

   A análise hoje é manual (fila no admin). Com um parceiro bancário,
   payPartner.js envia o cadastro e o parceiro devolve a decisão por
   webhook; a conta só existe (pay_accounts) depois de aprovada.
   ===================================================================== */
const crypto = require("crypto");
const { pool } = require("./db");

const CONSENT_VERSION = "kyc-2026-09-v1";
const MAX_DOC_BYTES = 4 * 1024 * 1024;
const DOC_MIMES = ["image/jpeg", "image/png", "application/pdf"];
const DOC_TIPOS = ["doc_frente", "doc_verso", "selfie", "comprovante_endereco"];
const DOC_LABELS = {
  doc_frente: "documento (frente)",
  doc_verso: "documento (verso)",
  selfie: "selfie segurando o documento",
  comprovante_endereco: "comprovante de endereço",
};
const ESTADOS_CIVIS = ["solteiro", "casado", "uniao_estavel", "divorciado", "viuvo"];
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const FIELDS = [
  "nome_completo", "cpf", "data_nascimento", "nome_mae", "nome_pai", "nacionalidade",
  "naturalidade", "estado_civil", "telefone", "doc_tipo", "doc_numero", "doc_orgao",
  "doc_uf", "doc_emissao", "ocupacao", "renda_mensal", "origem_recursos", "finalidade",
  "pep", "pep_detalhe", "pep_relacao", "pep_cargo", "pep_orgao", "pep_periodo", "pep_nome", "pep_cpf", "pep_grau", "end_cep", "end_rua", "end_numero", "end_complemento",
  "end_bairro", "end_cidade", "end_uf",
];

function onlyDigits(v) { return String(v || "").replace(/\D/g, ""); }

function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(cpf[len])) return false;
  }
  return true;
}

function ageFrom(isoDate) {
  const d = new Date(isoDate + "T00:00:00Z");
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

// Valida o cadastro completo. Retorna a lista de problemas (vazia = ok).
function validateComplete(k) {
  const err = [];
  const req = (v, msg) => { if (!String(v == null ? "" : v).trim()) err.push(msg); };
  req(k.nome_completo, "Informe o nome completo.");
  if (String(k.nome_completo || "").trim().split(/\s+/).length < 2) err.push("Informe nome e sobrenome.");
  if (!isValidCPF(k.cpf)) err.push("CPF inválido.");
  const idade = k.data_nascimento ? ageFrom(k.data_nascimento) : null;
  if (idade == null) err.push("Informe a data de nascimento.");
  else if (idade < 18) err.push("É preciso ter 18 anos ou mais para abrir a conta.");
  else if (idade > 120) err.push("Data de nascimento inválida.");
  req(k.nome_mae, "Informe o nome da mãe.");
  req(k.nacionalidade, "Informe a nacionalidade.");
  req(k.naturalidade, "Informe a naturalidade (cidade/UF de nascimento).");
  if (!ESTADOS_CIVIS.includes(k.estado_civil)) err.push("Selecione o estado civil.");
  if (onlyDigits(k.telefone).length < 10) err.push("Informe um telefone com DDD.");
  if (!["rg", "cnh"].includes(k.doc_tipo)) err.push("Selecione o tipo de documento (RG ou CNH).");
  req(k.doc_numero, "Informe o número do documento.");
  req(k.doc_orgao, "Informe o órgão emissor do documento.");
  if (!UFS.includes(String(k.doc_uf || "").toUpperCase())) err.push("UF do documento inválida.");
  req(k.doc_emissao, "Informe a data de emissão do documento.");
  req(k.ocupacao, "Informe sua ocupação.");
  if (k.renda_mensal === null || k.renda_mensal === undefined || k.renda_mensal === "" || !(Number(k.renda_mensal) >= 0)) {
    err.push("Informe a renda mensal.");
  }
  req(k.origem_recursos, "Informe a origem dos recursos.");
  req(k.finalidade, "Informe a finalidade da conta.");
  if (typeof k.pep !== "boolean") err.push("Responda se você é pessoa politicamente exposta (PEP).");
  if (k.pep === true) {
    if (!["propria", "familiar", "proximo"].includes(k.pep_relacao)) err.push("Informe quem é a pessoa politicamente exposta.");
    req(k.pep_cargo, "Informe o cargo ou função pública (PEP).");
    req(k.pep_orgao, "Informe o órgão ou entidade (PEP).");
    req(k.pep_periodo, "Informe o período no cargo (PEP).");
    if (k.pep_relacao === "familiar" || k.pep_relacao === "proximo") {
      req(k.pep_nome, "Informe o nome da pessoa politicamente exposta.");
      if (!isValidCPF(k.pep_cpf)) err.push("CPF da pessoa politicamente exposta inválido.");
      req(k.pep_grau, "Informe o grau de parentesco ou a relação com a pessoa exposta.");
    }
  }
  if (onlyDigits(k.end_cep).length !== 8) err.push("CEP inválido.");
  req(k.end_rua, "Informe a rua.");
  req(k.end_numero, "Informe o número do endereço.");
  req(k.end_bairro, "Informe o bairro.");
  req(k.end_cidade, "Informe a cidade.");
  if (!UFS.includes(String(k.end_uf || "").toUpperCase())) err.push("UF do endereço inválida.");
  return err;
}

function docsRequired(docTipo) {
  return docTipo === "rg"
    ? ["doc_frente", "doc_verso", "selfie", "comprovante_endereco"]
    : ["doc_frente", "selfie", "comprovante_endereco"];
}

function toPublic(row, docTipos = []) {
  if (!row) return null;
  const out = {
    status: row.status,
    documentos: docTipos,
    motivoReprovacao: row.motivo_reprovacao || "",
    enviadoEm: row.submitted_at || null,
  };
  for (const f of FIELDS) out[f] = row[f] == null ? "" : row[f];
  out.pep = row.pep === null || row.pep === undefined ? null : row.pep;
  return out;
}

async function log(kycId, evento, autor, detalhe) {
  await pool.query(
    "INSERT INTO pay_kyc_events (kyc_id, evento, autor, detalhe, created_at) VALUES ($1,$2,$3,$4,$5)",
    [kycId, evento, autor, detalhe || null, new Date().toISOString()]
  );
}

async function getRowByCustomer(customerId) {
  const { rows } = await pool.query("SELECT * FROM pay_kyc WHERE customer_id = $1", [customerId]);
  return rows[0] || null;
}

async function listDocTipos(kycId) {
  const { rows } = await pool.query("SELECT tipo FROM pay_kyc_documents WHERE kyc_id = $1", [kycId]);
  return rows.map((r) => r.tipo);
}

async function getByCustomer(customerId) {
  const row = await getRowByCustomer(customerId);
  return row ? toPublic(row, await listDocTipos(row.id)) : null;
}

function normalize(input) {
  const o = {};
  for (const f of FIELDS) {
    let v = input[f];
    if (f === "pep") { o[f] = typeof v === "boolean" ? v : null; continue; }
    if (f === "renda_mensal") { o[f] = v === "" || v == null || isNaN(Number(v)) ? null : Number(v); continue; }
    v = v == null ? "" : String(v).trim().slice(0, 200);
    if (f === "end_uf" || f === "doc_uf") v = v.toUpperCase();
    if (f === "cpf" || f === "end_cep" || f === "pep_cpf") v = onlyDigits(v);
    o[f] = v;
  }
  return o;
}

function conflict(msg) { return Object.assign(new Error(msg), { statusCode: 409 }); }
function badRequest(msg) { return Object.assign(new Error(msg), { statusCode: 400 }); }

// Salva o rascunho (só enquanto rascunho/reprovado). Não exige completude.
async function saveDraft(customerId, input) {
  const data = normalize(input);
  const now = new Date().toISOString();
  const values = FIELDS.map((c) => data[c]);
  const existing = await getRowByCustomer(customerId);
  if (existing && !["rascunho", "reprovado"].includes(existing.status)) {
    throw conflict("Cadastro em análise ou já aprovado não pode ser alterado.");
  }
  // Garante a linha (idempotente: uploads simultâneos podem disputar o primeiro rascunho).
  await pool.query(
    "INSERT INTO pay_kyc (customer_id, created_at, updated_at) VALUES ($1, $2, $2) ON CONFLICT (customer_id) DO NOTHING",
    [customerId, now]
  );
  const sets = FIELDS.map((c, i) => `${c} = $${i + 1}`).join(", ");
  await pool.query(
    `UPDATE pay_kyc SET ${sets}, status = 'rascunho', updated_at = $${FIELDS.length + 1} WHERE customer_id = $${FIELDS.length + 2}`,
    [...values, now, customerId]
  );
  return getByCustomer(customerId);
}

async function saveDocument(customerId, tipo, { buffer, mime, nome }) {
  if (!DOC_TIPOS.includes(tipo)) throw badRequest("Tipo de documento inválido.");
  if (!DOC_MIMES.includes(mime)) throw badRequest("Envie JPG, PNG ou PDF.");
  if (!buffer || !buffer.length) throw badRequest("Arquivo vazio.");
  if (buffer.length > MAX_DOC_BYTES) throw Object.assign(new Error("Arquivo maior que 4 MB."), { statusCode: 413 });
  const row = await getRowByCustomer(customerId);
  if (!row) throw badRequest("Salve seus dados antes de enviar documentos.");
  if (!["rascunho", "reprovado"].includes(row.status)) {
    throw conflict("Cadastro em análise ou já aprovado não pode ser alterado.");
  }
  await pool.query(
    `INSERT INTO pay_kyc_documents (kyc_id, tipo, mime, nome, dados, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (kyc_id, tipo) DO UPDATE SET mime = EXCLUDED.mime, nome = EXCLUDED.nome, dados = EXCLUDED.dados, created_at = EXCLUDED.created_at`,
    [row.id, tipo, mime, String(nome || "").slice(0, 120), buffer, new Date().toISOString()]
  );
}

// Envia para análise: valida tudo, exige documentos e registra consentimento.
async function submit(customerId, { aceiteTermos, ip, userAgent }) {
  const row = await getRowByCustomer(customerId);
  if (!row) throw badRequest("Preencha o cadastro antes de enviar.");
  if (!["rascunho", "reprovado"].includes(row.status)) throw conflict("Cadastro já enviado.");
  if (aceiteTermos !== true) throw badRequest("Você precisa aceitar os termos e a política de privacidade.");
  const problems = validateComplete(row);
  const tipos = await listDocTipos(row.id);
  for (const t of docsRequired(row.doc_tipo)) {
    if (!tipos.includes(t)) problems.push(`Envie o documento: ${DOC_LABELS[t]}.`);
  }
  if (problems.length) throw Object.assign(new Error(problems[0]), { statusCode: 400, problems });
  const now = new Date().toISOString();
  await pool.query(
    `UPDATE pay_kyc SET status = 'em_analise', submitted_at = $1, consent_version = $2, consent_at = $1,
       consent_ip = $3, consent_ua = $4, motivo_reprovacao = NULL, updated_at = $1 WHERE id = $5`,
    [now, CONSENT_VERSION, ip || null, String(userAgent || "").slice(0, 300), row.id]
  );
  await log(row.id, "enviado", "cliente", `consentimento ${CONSENT_VERSION}`);
  return getRowByCustomer(customerId);
}

/* ---------------------- ANÁLISE (admin ou parceiro) ---------------------- */
function generateNumero() {
  const base = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const dv = base.split("").reduce((s, d, i) => s + Number(d) * (i + 2), 0) % 11 % 10;
  return `${base}-${dv}`;
}

async function approve(kycId, autor, { numeroConta, agencia } = {}) {
  const { rows } = await pool.query("SELECT * FROM pay_kyc WHERE id = $1", [kycId]);
  const k = rows[0];
  if (!k) throw Object.assign(new Error("Cadastro não encontrado."), { statusCode: 404 });
  if (k.status === "aprovado") return;
  if (k.status !== "em_analise") throw conflict("Só é possível aprovar cadastros em análise.");
  const now = new Date().toISOString();
  await pool.query(
    "UPDATE pay_kyc SET status='aprovado', revisado_por=$1, revisado_em=$2, motivo_reprovacao=NULL, updated_at=$2 WHERE id=$3",
    [autor, now, kycId]
  );
  for (let i = 0; i < 5; i++) {
    try {
      await pool.query(
        `INSERT INTO pay_accounts (customer_id, numero_conta, agencia, aceite_termos_em, created_at)
         VALUES ($1,$2,$3,$4,$4) ON CONFLICT (customer_id) DO NOTHING`,
        [k.customer_id, numeroConta || generateNumero(), agencia || "0001", k.consent_at || now]
      );
      break;
    } catch (err) {
      if (err.code !== "23505" || numeroConta) throw err;
    }
  }
  await log(kycId, "aprovado", autor);
}

async function reject(kycId, autor, motivo) {
  const m = String(motivo || "").trim();
  if (!m) throw badRequest("Informe o motivo da reprovação.");
  const { rows } = await pool.query("SELECT status FROM pay_kyc WHERE id = $1", [kycId]);
  if (!rows[0]) throw Object.assign(new Error("Cadastro não encontrado."), { statusCode: 404 });
  if (rows[0].status !== "em_analise") throw conflict("Só é possível reprovar cadastros em análise.");
  const now = new Date().toISOString();
  await pool.query(
    "UPDATE pay_kyc SET status='reprovado', motivo_reprovacao=$1, revisado_por=$2, revisado_em=$3, updated_at=$3 WHERE id=$4",
    [m, autor, now, kycId]
  );
  await log(kycId, "reprovado", autor, m);
}

async function setPartnerRef(kycId, partnerName, partnerRef) {
  await pool.query("UPDATE pay_kyc SET partner_name=$1, partner_ref=$2 WHERE id=$3", [partnerName, partnerRef, kycId]);
}

async function findByPartnerRef(partnerName, partnerRef) {
  const { rows } = await pool.query("SELECT id FROM pay_kyc WHERE partner_name=$1 AND partner_ref=$2", [partnerName, partnerRef]);
  return rows[0] ? rows[0].id : null;
}

async function listForAdmin(status) {
  const { rows } = await pool.query(
    `SELECT pay_kyc.id, pay_kyc.status, pay_kyc.nome_completo, pay_kyc.cpf, pay_kyc.submitted_at,
            pay_kyc.revisado_por, customers.email
       FROM pay_kyc JOIN customers ON customers.id = pay_kyc.customer_id
      WHERE ($1::text IS NULL OR pay_kyc.status = $1) AND pay_kyc.status <> 'rascunho'
      ORDER BY pay_kyc.submitted_at DESC NULLS LAST`,
    [status || null]
  );
  return rows.map((r) => ({
    id: r.id, status: r.status, nome: r.nome_completo, cpf: r.cpf, email: r.email,
    enviadoEm: r.submitted_at, revisadoPor: r.revisado_por || "",
  }));
}

async function getForAdmin(kycId) {
  const { rows } = await pool.query(
    "SELECT pay_kyc.*, customers.email FROM pay_kyc JOIN customers ON customers.id = pay_kyc.customer_id WHERE pay_kyc.id = $1",
    [kycId]
  );
  if (!rows[0]) return null;
  const docs = await pool.query("SELECT tipo, mime, nome FROM pay_kyc_documents WHERE kyc_id = $1", [kycId]);
  const events = await pool.query("SELECT evento, autor, detalhe, created_at FROM pay_kyc_events WHERE kyc_id = $1 ORDER BY id", [kycId]);
  return {
    id: rows[0].id,
    email: rows[0].email,
    ...toPublic(rows[0], docs.rows.map((d) => d.tipo)),
    documentosInfo: docs.rows,
    consentimento: { versao: rows[0].consent_version, em: rows[0].consent_at, ip: rows[0].consent_ip },
    eventos: events.rows.map((e) => ({ evento: e.evento, autor: e.autor, detalhe: e.detalhe || "", em: e.created_at })),
    partner: { nome: rows[0].partner_name || "", ref: rows[0].partner_ref || "" },
  };
}

async function getDocumentForAdmin(kycId, tipo, autor) {
  const { rows } = await pool.query("SELECT mime, nome, dados FROM pay_kyc_documents WHERE kyc_id=$1 AND tipo=$2", [kycId, tipo]);
  if (!rows[0]) return null;
  await log(kycId, "documento_visualizado", autor, tipo);
  return { mime: rows[0].mime, nome: rows[0].nome, data: rows[0].dados };
}

// Documentos completos (com bytes) para enviar ao parceiro.
async function getDocumentsForPartner(kycId) {
  const { rows } = await pool.query("SELECT tipo, mime, nome, dados FROM pay_kyc_documents WHERE kyc_id=$1", [kycId]);
  return rows.map((r) => ({ tipo: r.tipo, mime: r.mime, nome: r.nome, data: r.dados }));
}

module.exports = {
  CONSENT_VERSION, MAX_DOC_BYTES, DOC_TIPOS, isValidCPF, validateComplete,
  getByCustomer, saveDraft, saveDocument, submit,
  approve, reject, setPartnerRef, findByPartnerRef,
  listForAdmin, getForAdmin, getDocumentForAdmin, getDocumentsForPartner,
  getRowByCustomer, log,
};
