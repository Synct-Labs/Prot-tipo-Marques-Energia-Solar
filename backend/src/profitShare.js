/* =====================================================================
   PARTICIPAÇÃO NOS LUCROS
   ---------------------------------------------------------------------
   Aparece em "Participação nos Lucros" no Marques Pay. O admin cadastra
   o contrato (número, percentual, periodicidade) e, a cada repasse feito
   por fora do site (Pix/transferência), lança o pagamento aqui com valor,
   data e o comprovante (guardado direto no Postgres, sem storage externo).
   ===================================================================== */
const { pool } = require("./db");

const CONTRACT_STATUSES = ["ativo", "encerrado"];
const MAX_COMPROVANTE_BYTES = 4 * 1024 * 1024; // 4MB é de sobra pra um recibo/print

async function createContract({ customerId, numeroContrato, valorInvestido, percentual, periodicidade, dataInicio }) {
  const now = new Date().toISOString();
  const insert = await pool.query(
    `INSERT INTO profit_share_contracts
      (customer_id, numero_contrato, valor_investido, percentual, periodicidade, data_inicio, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'ativo', $7, $7) RETURNING id`,
    [customerId, numeroContrato, valorInvestido, percentual, periodicidade || "", dataInicio, now]
  );
  return insert.rows[0].id;
}

function rowToContract(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    numeroContrato: row.numero_contrato,
    valorInvestido: row.valor_investido,
    percentual: row.percentual,
    periodicidade: row.periodicidade,
    dataInicio: row.data_inicio,
    status: row.status,
    visivelCliente: row.visivel_cliente,
    createdAt: row.created_at,
    customer: row.customer_nome
      ? { nome: row.customer_nome, email: row.customer_email }
      : undefined,
  };
}

function rowToPayment(row) {
  return {
    id: row.id,
    contractId: row.contract_id,
    valor: row.valor,
    dataPagamento: row.data_pagamento,
    observacao: row.observacao,
    temComprovante: !!row.comprovante_dados,
    createdAt: row.created_at,
  };
}

async function listAllContracts({ q } = {}) {
  let sql = `
    SELECT profit_share_contracts.*, customers.nome as customer_nome, customers.email as customer_email
    FROM profit_share_contracts JOIN customers ON customers.id = profit_share_contracts.customer_id`;
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    sql += ` WHERE customers.nome ILIKE $1 OR customers.email ILIKE $1 OR profit_share_contracts.numero_contrato ILIKE $1`;
  }
  sql += " ORDER BY profit_share_contracts.id DESC";
  const { rows } = await pool.query(sql, params);
  return rows.map(rowToContract);
}

async function getContractById(id) {
  const { rows } = await pool.query(
    `SELECT profit_share_contracts.*, customers.nome as customer_nome, customers.email as customer_email
     FROM profit_share_contracts JOIN customers ON customers.id = profit_share_contracts.customer_id
     WHERE profit_share_contracts.id = $1`,
    [id]
  );
  return rows[0] ? rowToContract(rows[0]) : null;
}

// Usada só pela rota do cliente (/api/customers/me/profit-share) — por
// isso já filtra os contratos que o admin marcou como ocultos. O admin
// continua vendo tudo via listAllContracts/getContractById.
async function listContractsByCustomer(customerId) {
  const { rows } = await pool.query(
    "SELECT * FROM profit_share_contracts WHERE customer_id = $1 AND visivel_cliente = true ORDER BY id DESC",
    [customerId]
  );
  return rows.map(rowToContract);
}

async function addPayment(contractId, { valor, dataPagamento, observacao, comprovanteBuffer, comprovanteTipo, comprovanteNome }) {
  const now = new Date().toISOString();
  const insert = await pool.query(
    `INSERT INTO profit_share_payments
      (contract_id, valor, data_pagamento, observacao, comprovante_dados, comprovante_tipo, comprovante_nome, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [contractId, valor, dataPagamento, observacao || "", comprovanteBuffer || null, comprovanteTipo || null, comprovanteNome || null, now]
  );
  return insert.rows[0].id;
}

async function listPaymentsByContract(contractId) {
  const { rows } = await pool.query(
    "SELECT id, contract_id, valor, data_pagamento, observacao, comprovante_dados, created_at FROM profit_share_payments WHERE contract_id = $1 ORDER BY data_pagamento DESC",
    [contractId]
  );
  return rows.map(rowToPayment);
}

// Todos os repasses do cliente, com o número do contrato junto — pronto
// pra virar o extrato de "Participação nos Lucros" no Marques Pay.
async function listPaymentsByCustomer(customerId) {
  const { rows } = await pool.query(
    `SELECT profit_share_payments.id, profit_share_payments.contract_id, profit_share_payments.valor,
            profit_share_payments.data_pagamento, profit_share_payments.observacao,
            profit_share_payments.comprovante_dados, profit_share_payments.created_at,
            profit_share_contracts.numero_contrato
     FROM profit_share_payments
     JOIN profit_share_contracts ON profit_share_contracts.id = profit_share_payments.contract_id
     WHERE profit_share_contracts.customer_id = $1 AND profit_share_contracts.visivel_cliente = true
     ORDER BY profit_share_payments.data_pagamento DESC`,
    [customerId]
  );
  return rows.map((row) => ({ ...rowToPayment(row), numeroContrato: row.numero_contrato }));
}

// Retorna o binário do comprovante só se o pagamento pertencer a um
// contrato do customerId informado (evita um cliente acessar comprovante
// de outro só adivinhando o id) — passe null pra pular essa checagem (uso
// interno do admin).
async function getPaymentComprovante(paymentId, customerId = null) {
  let sql = `
    SELECT profit_share_payments.comprovante_dados, profit_share_payments.comprovante_tipo,
           profit_share_payments.comprovante_nome, profit_share_contracts.customer_id,
           profit_share_contracts.visivel_cliente
    FROM profit_share_payments
    JOIN profit_share_contracts ON profit_share_contracts.id = profit_share_payments.contract_id
    WHERE profit_share_payments.id = $1`;
  const params = [paymentId];
  const { rows } = await pool.query(sql, params);
  const row = rows[0];
  if (!row || !row.comprovante_dados) return null;
  if (customerId !== null && (row.customer_id !== customerId || !row.visivel_cliente)) return null;
  return { data: row.comprovante_dados, tipo: row.comprovante_tipo, nome: row.comprovante_nome };
}

async function updateContractStatus(id, status) {
  if (!CONTRACT_STATUSES.includes(status)) throw new Error("Status de contrato inválido: " + status);
  const now = new Date().toISOString();
  const result = await pool.query(
    "UPDATE profit_share_contracts SET status = $1, updated_at = $2 WHERE id = $3",
    [status, now, id]
  );
  return result.rowCount > 0;
}

// Esconde/mostra o contrato (e seus repasses) pro cliente no Marques Pay —
// o admin continua vendo e editando normalmente.
async function setVisibility(id, visivel) {
  const now = new Date().toISOString();
  const result = await pool.query(
    "UPDATE profit_share_contracts SET visivel_cliente = $1, updated_at = $2 WHERE id = $3",
    [visivel, now, id]
  );
  return result.rowCount > 0;
}

module.exports = {
  CONTRACT_STATUSES,
  MAX_COMPROVANTE_BYTES,
  createContract,
  listAllContracts,
  getContractById,
  listContractsByCustomer,
  addPayment,
  listPaymentsByContract,
  listPaymentsByCustomer,
  getPaymentComprovante,
  updateContractStatus,
  setVisibility,
};
