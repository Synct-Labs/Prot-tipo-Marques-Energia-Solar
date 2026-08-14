/* =====================================================================
   SOLICITAÇÕES DE ANÁLISE DE CRÉDITO — acesso ao banco
   ===================================================================== */
const db = require("./db");

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

function createLead(payload) {
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO credit_leads (
      lead_number, status, modalidade_interesse,
      nome, cpf, data_nascimento, estado_civil, telefone, email, cidade_uf,
      profissao, tipo_vinculo, empresa, tempo_trabalho, renda_bruta, renda_liquida,
      created_at, updated_at
    ) VALUES (?, 'novo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tempNumber = `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const info = insert.run(
    tempNumber,
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
    now,
    now
  );

  const id = info.lastInsertRowid;
  const leadNumber = `CRED-${String(id).padStart(6, "0")}`;
  db.prepare("UPDATE credit_leads SET lead_number = ? WHERE id = ?").run(leadNumber, id);

  return { id, leadNumber };
}

function listLeads({ status, q } = {}) {
  let sql = "SELECT * FROM credit_leads";
  const clauses = [];
  const params = [];

  if (status && VALID_STATUSES.includes(status)) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (q) {
    clauses.push("(lead_number LIKE ? OR nome LIKE ? OR email LIKE ? OR cpf LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY id DESC";

  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToLead);
}

function getLeadById(id) {
  const row = db.prepare("SELECT * FROM credit_leads WHERE id = ?").get(id);
  return row ? rowToLead(row) : null;
}

function updateLeadStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Status inválido: " + status);
  }
  const now = new Date().toISOString();
  const info = db
    .prepare("UPDATE credit_leads SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, id);
  return info.changes > 0;
}

function getLeadStats() {
  const rows = db
    .prepare("SELECT status, COUNT(*) as c FROM credit_leads GROUP BY status")
    .all();
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
  updateLeadStatus,
  getLeadStats,
};
