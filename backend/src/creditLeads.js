/* =====================================================================
   SOLICITAÇÕES DE ANÁLISE DE CRÉDITO: acesso ao banco
   ===================================================================== */
const { pool } = require("./db");

const VALID_STATUSES = [
  "novo",
  "em_analise",
  "contatado",
  "proposta_enviada",
  "convertido",
  "recusado",
];

const REQUIRED_FIELDS = [
  "nome",
  "cpf",
  "data_nascimento",
  "telefone",
  "email",
  "cidade_uf",
  "profissao",
  "tipo_vinculo",
  "empresa",
  "tempo_trabalho",
  "renda_bruta",
  "renda_liquida",
];

function rowToLead(row) {
  return {
    id: row.id,
    leadNumber: row.lead_number,
    status: row.status,
    customerId: row.customer_id,
    modalidadeInteresse: row.modalidade_interesse,
    dadosBasicos: {
      nome: row.nome,
      cpf: row.cpf,
      dataNascimento: row.data_nascimento,
      estadoCivil: row.estado_civil,
      telefone: row.telefone,
      email: row.email,
      cidadeUf: row.cidade_uf,
    },
    dadosProfissionais: {
      profissao: row.profissao,
      tipoVinculo: row.tipo_vinculo,
      empresa: row.empresa,
      tempoTrabalho: row.tempo_trabalho,
      rendaBruta: row.renda_bruta,
      rendaLiquida: row.renda_liquida,
    },
    simulacao: {
      valorSistema: row.sim_valor_sistema,
      parcelas: row.sim_parcelas,
      fgtsDisponivel: row.sim_fgts_disponivel,
      parcelaEstimada: row.sim_parcela_estimada,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateLeadPayload(payload) {
  const missing = REQUIRED_FIELDS.filter((f) => {
    const v = payload[f];
    return v === undefined || v === null || String(v).trim() === "";
  });
  return missing;
}

// Campos numéricos opcionais (vêm do simulador, no Passo 2) — converte pra
// número só quando há valor de verdade, senão grava NULL no banco.
function numOrNull(v) {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function createLead(payload, customerId = null) {
  const now = new Date().toISOString();
  const tempNumber = `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const insert = await pool.query(
    `INSERT INTO credit_leads (
      lead_number, status, customer_id, modalidade_interesse,
      nome, cpf, data_nascimento, estado_civil, telefone, email, cidade_uf,
      profissao, tipo_vinculo, empresa, tempo_trabalho, renda_bruta, renda_liquida,
      sim_valor_sistema, sim_parcelas, sim_fgts_disponivel, sim_parcela_estimada,
      created_at, updated_at
    ) VALUES ($1, 'novo', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING id`,
    [
      tempNumber,
      customerId,
      payload.modalidade_interesse || "",
      payload.nome,
      payload.cpf,
      payload.data_nascimento,
      payload.estado_civil || "",
      payload.telefone,
      payload.email,
      payload.cidade_uf,
      payload.profissao,
      payload.tipo_vinculo,
      payload.empresa,
      payload.tempo_trabalho,
      Number(payload.renda_bruta),
      Number(payload.renda_liquida),
      numOrNull(payload.sim_valor_sistema),
      payload.sim_parcelas ? parseInt(payload.sim_parcelas, 10) : null,
      numOrNull(payload.sim_fgts_disponivel),
      numOrNull(payload.sim_parcela_estimada),
      now,
      now,
    ]
  );

  const id = insert.rows[0].id;
  const leadNumber = `CRED-${String(id).padStart(6, "0")}`;
  await pool.query("UPDATE credit_leads SET lead_number = $1 WHERE id = $2", [leadNumber, id]);

  return { id, leadNumber };
}

async function listLeads({ status, q } = {}) {
  let sql = "SELECT * FROM credit_leads";
  const clauses = [];
  const params = [];

  if (status && VALID_STATUSES.includes(status)) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (q) {
    const like = `%${q}%`;
    params.push(like, like, like, like);
    clauses.push(
      `(lead_number ILIKE $${params.length - 3} OR nome ILIKE $${params.length - 2} OR email ILIKE $${params.length - 1} OR cpf ILIKE $${params.length})`
    );
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY id DESC";

  const { rows } = await pool.query(sql, params);
  return rows.map(rowToLead);
}

async function getLeadById(id) {
  const { rows } = await pool.query("SELECT * FROM credit_leads WHERE id = $1", [id]);
  return rows[0] ? rowToLead(rows[0]) : null;
}

async function listLeadsByCustomer(customerId) {
  const { rows } = await pool.query(
    "SELECT * FROM credit_leads WHERE customer_id = $1 ORDER BY id DESC",
    [customerId]
  );
  return rows.map(rowToLead);
}

async function updateLeadStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Status inválido: " + status);
  }
  const now = new Date().toISOString();
  const result = await pool.query(
    "UPDATE credit_leads SET status = $1, updated_at = $2 WHERE id = $3",
    [status, now, id]
  );
  return result.rowCount > 0;
}

async function getLeadStats() {
  const { rows } = await pool.query(
    "SELECT status, COUNT(*)::int as c FROM credit_leads GROUP BY status"
  );
  const stats = {};
  VALID_STATUSES.forEach((s) => (stats[s] = 0));
  rows.forEach((r) => (stats[r.status] = r.c));
  return stats;
}

module.exports = {
  VALID_STATUSES,
  validateLeadPayload,
  createLead,
  listLeads,
  getLeadById,
  listLeadsByCustomer,
  updateLeadStatus,
  getLeadStats,
};
