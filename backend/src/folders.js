/* =====================================================================
   PASTAS DO CLIENTE (aba "Pastas" do painel, só dono)
   ---------------------------------------------------------------------
   Um lugar só pra ver/organizar documentos e contratos de um cliente:
   - "manuais": anexados aqui mesmo pelo admin (tabela folder_documents).
   - "automáticos": documentos que o cliente já enviou em outras partes do
     sistema (KYC do Marques Pay, pedidos da loja, solicitação de crédito,
     empréstimos, participação nos lucros, Compra Programada) — lidos
     direto das tabelas originais, sem duplicar bytes aqui. O download de
     cada um reaproveita o getter já existente do módulo original (ver
     server.js), inclusive o log de auditoria do KYC.

   Os SELECTs de listagem abaixo nunca trazem a coluna BYTEA em si (só
   "IS NOT NULL" pra saber se existe) — só o download de um documento
   específico busca os bytes de verdade.
   ===================================================================== */
const { pool } = require("./db");

const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8MB — mesmo limite usado pra contratos em outros módulos

function err(status, message) { return Object.assign(new Error(message), { statusCode: status }); }

/* ---------------------- BUSCA (nome ou CPF) ---------------------- */
// Sem busca (q vazio) lista todos os clientes em ordem alfabética, pra dar
// pra navegar pelas pastas "na mão"; com q filtra por nome/e-mail/CPF.
// Paginado: busca uma linha a mais só pra saber se ainda tem próxima página.
async function searchFolders(q, { limit = 50, offset = 0 } = {}) {
  const raw = String(q || "").trim();
  const like = raw ? `%${raw}%` : null;
  const digits = raw.replace(/\D/g, "");
  const cpfLike = digits ? `%${digits}%` : null;
  const { rows } = await pool.query(
    `SELECT c.id, c.nome, c.email,
            COALESCE(c.cpf, k.cpf, o.cpf, cl.cpf) AS cpf
     FROM customers c
     LEFT JOIN pay_kyc k ON k.customer_id = c.id
     LEFT JOIN LATERAL (
       SELECT customer_cpf AS cpf FROM orders
       WHERE customer_id = c.id AND customer_cpf IS NOT NULL
       ORDER BY id DESC LIMIT 1
     ) o ON true
     LEFT JOIN LATERAL (
       SELECT cpf FROM credit_leads
       WHERE customer_id = c.id AND cpf IS NOT NULL
       ORDER BY id DESC LIMIT 1
     ) cl ON true
     WHERE $1::text IS NULL
        OR c.nome ILIKE $1
        OR c.email ILIKE $1
        OR ($2::text IS NOT NULL AND (
             regexp_replace(COALESCE(c.cpf,''), '\D', '', 'g') LIKE $2
          OR regexp_replace(COALESCE(k.cpf,''), '\D', '', 'g') LIKE $2
          OR regexp_replace(COALESCE(o.cpf,''), '\D', '', 'g') LIKE $2
          OR regexp_replace(COALESCE(cl.cpf,''), '\D', '', 'g') LIKE $2
        ))
     ORDER BY LOWER(c.nome), c.id LIMIT $3 OFFSET $4`,
    [like, cpfLike, limit + 1, offset]
  );
  return { results: rows.slice(0, limit), hasMore: rows.length > limit };
}

/* ---------------------- PASTA DE UM CLIENTE ---------------------- */
async function getCustomerHeader(customerId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.nome, c.email, c.telefone,
            COALESCE(c.cpf, k.cpf, o.cpf, cl.cpf) AS cpf
     FROM customers c
     LEFT JOIN pay_kyc k ON k.customer_id = c.id
     LEFT JOIN LATERAL (
       SELECT customer_cpf AS cpf FROM orders
       WHERE customer_id = c.id AND customer_cpf IS NOT NULL
       ORDER BY id DESC LIMIT 1
     ) o ON true
     LEFT JOIN LATERAL (
       SELECT cpf FROM credit_leads
       WHERE customer_id = c.id AND cpf IS NOT NULL
       ORDER BY id DESC LIMIT 1
     ) cl ON true
     WHERE c.id = $1`,
    [customerId]
  );
  return rows[0] || null;
}

async function listManualDocuments(customerId) {
  const { rows } = await pool.query(
    "SELECT id, categoria, mime, nome, autor, created_at FROM folder_documents WHERE customer_id = $1 ORDER BY id DESC",
    [customerId]
  );
  return rows.map((r) => ({
    id: r.id, categoria: r.categoria, mime: r.mime, nome: r.nome, autor: r.autor, createdAt: r.created_at,
  }));
}

// Todos os documentos que o cliente já tem espalhados pelo sistema —
// metadados só (sem BYTEA). Cada item já vem com refOrigem/refId (e
// refTipo quando aplicável) prontos pra montar a URL de download (ver
// rota em server.js).
async function autoDocuments(customerId) {
  const docs = [];

  const kyc = await pool.query("SELECT id FROM pay_kyc WHERE customer_id = $1", [customerId]);
  if (kyc.rows[0]) {
    const kycId = kyc.rows[0].id;
    const { rows } = await pool.query("SELECT tipo, nome FROM pay_kyc_documents WHERE kyc_id = $1", [kycId]);
    for (const d of rows) {
      docs.push({ origem: "KYC (Marques Pay)", tipo: d.tipo, nome: d.nome, refOrigem: "kyc", refId: kycId, refTipo: d.tipo });
    }
  }

  const orders = await pool.query(
    `SELECT id, order_number,
            contrato_nome, (contrato_dados IS NOT NULL) AS tem_contrato,
            doc_endereco_nome, (doc_endereco_dados IS NOT NULL) AS tem_doc_endereco,
            doc_foto_nome, (doc_foto_dados IS NOT NULL) AS tem_doc_foto,
            pendencia_resposta_nome, (pendencia_resposta_dados IS NOT NULL) AS tem_pendencia_resposta
     FROM orders WHERE customer_id = $1 ORDER BY id DESC`,
    [customerId]
  );
  for (const o of orders.rows) {
    const label = `Pedido ${o.order_number}`;
    if (o.tem_contrato) docs.push({ origem: label, tipo: "Contrato", nome: o.contrato_nome, refOrigem: "order_contrato", refId: o.id });
    if (o.tem_doc_endereco) docs.push({ origem: label, tipo: "Comprovante de endereço", nome: o.doc_endereco_nome, refOrigem: "order_doc_endereco", refId: o.id });
    if (o.tem_doc_foto) docs.push({ origem: label, tipo: "Documento com foto", nome: o.doc_foto_nome, refOrigem: "order_doc_foto", refId: o.id });
    if (o.tem_pendencia_resposta) docs.push({ origem: label, tipo: "Resposta à pendência", nome: o.pendencia_resposta_nome, refOrigem: "order_pendencia_resposta", refId: o.id });
  }

  const leads = await pool.query(
    "SELECT id, lead_number, contrato_nome, (contrato_dados IS NOT NULL) AS tem_contrato FROM credit_leads WHERE customer_id = $1 ORDER BY id DESC",
    [customerId]
  );
  for (const l of leads.rows) {
    if (l.tem_contrato) docs.push({ origem: `Solicitação de crédito ${l.lead_number}`, tipo: "Contrato", nome: l.contrato_nome, refOrigem: "credit_lead_contrato", refId: l.id });
  }

  const loans = await pool.query(
    "SELECT id, titulo, contrato_nome, (contrato_dados IS NOT NULL) AS tem_contrato FROM loan_contracts WHERE customer_id = $1 ORDER BY id DESC",
    [customerId]
  );
  for (const c of loans.rows) {
    if (c.tem_contrato) docs.push({ origem: `Empréstimo — ${c.titulo}`, tipo: "Contrato", nome: c.contrato_nome, refOrigem: "loan_contrato", refId: c.id });
  }

  const psContracts = await pool.query(
    "SELECT id, numero_contrato, contrato_nome, (contrato_dados IS NOT NULL) AS tem_contrato FROM profit_share_contracts WHERE customer_id = $1 ORDER BY id DESC",
    [customerId]
  );
  for (const c of psContracts.rows) {
    if (c.tem_contrato) docs.push({ origem: `Participação nos lucros — ${c.numero_contrato}`, tipo: "Contrato", nome: c.contrato_nome, refOrigem: "profit_share_contrato", refId: c.id });
  }

  const psPayments = await pool.query(
    `SELECT p.id, p.data_pagamento, p.comprovante_nome, (p.comprovante_dados IS NOT NULL) AS tem_comprovante, c.numero_contrato
     FROM profit_share_payments p JOIN profit_share_contracts c ON c.id = p.contract_id
     WHERE c.customer_id = $1 ORDER BY p.id DESC`,
    [customerId]
  );
  for (const p of psPayments.rows) {
    if (p.tem_comprovante) docs.push({ origem: `Repasse ${p.numero_contrato} (${p.data_pagamento})`, tipo: "Comprovante", nome: p.comprovante_nome, refOrigem: "profit_share_comprovante", refId: p.id });
  }

  const adesoes = await pool.query(
    `SELECT a.id, g.nome AS grupo_nome,
            a.doc_endereco_nome, (a.doc_endereco_dados IS NOT NULL) AS tem_doc_endereco,
            a.doc_foto_nome, (a.doc_foto_dados IS NOT NULL) AS tem_doc_foto
     FROM consorcio_adesoes a JOIN consorcio_grupos g ON g.id = a.grupo_id
     WHERE a.customer_id = $1 ORDER BY a.id DESC`,
    [customerId]
  );
  for (const a of adesoes.rows) {
    const label = `Compra Programada — ${a.grupo_nome}`;
    if (a.tem_doc_endereco) docs.push({ origem: label, tipo: "Comprovante de endereço", nome: a.doc_endereco_nome, refOrigem: "consorcio_doc_endereco", refId: a.id });
    if (a.tem_doc_foto) docs.push({ origem: label, tipo: "Documento com foto", nome: a.doc_foto_nome, refOrigem: "consorcio_doc_foto", refId: a.id });
  }

  return docs;
}

async function getFolder(customerId) {
  const customer = await getCustomerHeader(customerId);
  if (!customer) return null;
  const [manuais, automaticos] = await Promise.all([
    listManualDocuments(customerId),
    autoDocuments(customerId),
  ]);
  return { customer, manuais, automaticos };
}

/* ---------------------- ANEXO MANUAL ---------------------- */
async function addDocument(customerId, { categoria, buffer, mime, nome, autor }) {
  if (!buffer || !buffer.length) throw err(400, "Anexe um arquivo.");
  if (buffer.length > MAX_DOC_BYTES) throw err(413, "Arquivo maior que 8 MB.");
  const cat = String(categoria || "").trim().slice(0, 80);
  if (!cat) throw err(400, "Informe uma categoria pro documento.");
  const now = new Date().toISOString();
  const { rows } = await pool.query(
    `INSERT INTO folder_documents (customer_id, categoria, mime, nome, dados, autor, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [customerId, cat, mime, String(nome || "arquivo").slice(0, 160), buffer, autor, now]
  );
  return rows[0].id;
}

async function getManualDocument(id) {
  const { rows } = await pool.query("SELECT customer_id, mime, nome, dados FROM folder_documents WHERE id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  return { customerId: row.customer_id, data: row.dados, tipo: row.mime, nome: row.nome };
}

async function deleteManualDocument(id) {
  const result = await pool.query("DELETE FROM folder_documents WHERE id = $1", [id]);
  return result.rowCount > 0;
}

module.exports = {
  MAX_DOC_BYTES,
  searchFolders,
  getFolder,
  addDocument,
  getManualDocument,
  deleteManualDocument,
};
