/* =====================================================================
   EMPRÉSTIMOS/FINANCIAMENTOS (contratados com a Marques)
   ---------------------------------------------------------------------
   Aparece em "Meus Boletos" no Marques Pay. O admin cadastra o contrato
   (título, valor da parcela, quantas parcelas, data da primeira) e o
   sistema já gera todas as parcelas de uma vez, com vencimento mensal.
   Marcar uma parcela como paga é uma ação manual do admin (não há
   cobrança automática — ver README, item de integração de pagamento).
   ===================================================================== */
const { pool } = require("./db");

const CONTRACT_STATUSES = ["ativo", "quitado", "cancelado"];
const INSTALLMENT_STATUSES = ["pendente", "pago"];

function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + n, d));
  return date.toISOString().slice(0, 10);
}

async function createContract({ customerId, titulo, valorParcela, totalParcelas, dataPrimeiraParcela }) {
  const now = new Date().toISOString();
  const insert = await pool.query(
    `INSERT INTO loan_contracts (customer_id, titulo, valor_parcela, total_parcelas, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'ativo', $5, $5) RETURNING id`,
    [customerId, titulo, valorParcela, totalParcelas, now]
  );
  const contractId = insert.rows[0].id;

  for (let numero = 1; numero <= totalParcelas; numero++) {
    const vencimento = addMonths(dataPrimeiraParcela, numero - 1);
    await pool.query(
      `INSERT INTO loan_installments (contract_id, numero, vencimento, valor, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pendente', $5, $5)`,
      [contractId, numero, vencimento, valorParcela, now]
    );
  }
  return contractId;
}

function rowToContract(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    titulo: row.titulo,
    valorParcela: row.valor_parcela,
    totalParcelas: row.total_parcelas,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: row.customer_nome
      ? { nome: row.customer_nome, email: row.customer_email }
      : undefined,
  };
}

function rowToInstallment(row) {
  return {
    id: row.id,
    contractId: row.contract_id,
    numero: row.numero,
    vencimento: row.vencimento,
    valor: row.valor,
    status: row.status,
    pagoEm: row.pago_em,
  };
}

async function listAllContracts({ q } = {}) {
  let sql = `
    SELECT loan_contracts.*, customers.nome as customer_nome, customers.email as customer_email
    FROM loan_contracts JOIN customers ON customers.id = loan_contracts.customer_id`;
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    sql += ` WHERE customers.nome ILIKE $1 OR customers.email ILIKE $1 OR loan_contracts.titulo ILIKE $1`;
  }
  sql += " ORDER BY loan_contracts.id DESC";
  const { rows } = await pool.query(sql, params);
  return rows.map(rowToContract);
}

async function getContractById(id) {
  const { rows } = await pool.query(
    `SELECT loan_contracts.*, customers.nome as customer_nome, customers.email as customer_email
     FROM loan_contracts JOIN customers ON customers.id = loan_contracts.customer_id
     WHERE loan_contracts.id = $1`,
    [id]
  );
  return rows[0] ? rowToContract(rows[0]) : null;
}

async function listInstallmentsByContract(contractId) {
  const { rows } = await pool.query(
    "SELECT * FROM loan_installments WHERE contract_id = $1 ORDER BY numero ASC",
    [contractId]
  );
  return rows.map(rowToInstallment);
}

async function listContractsByCustomer(customerId) {
  const { rows } = await pool.query(
    "SELECT * FROM loan_contracts WHERE customer_id = $1 ORDER BY id DESC",
    [customerId]
  );
  return rows.map(rowToContract);
}

// Todas as parcelas do cliente, já com o título do contrato junto —
// formato pronto pra virar a lista de "Meus Boletos" no Marques Pay.
async function listInstallmentsByCustomer(customerId) {
  const { rows } = await pool.query(
    `SELECT loan_installments.*, loan_contracts.titulo as contract_titulo, loan_contracts.total_parcelas as contract_total_parcelas
     FROM loan_installments
     JOIN loan_contracts ON loan_contracts.id = loan_installments.contract_id
     WHERE loan_contracts.customer_id = $1
     ORDER BY loan_installments.vencimento ASC`,
    [customerId]
  );
  return rows.map((row) => ({
    ...rowToInstallment(row),
    contractTitulo: row.contract_titulo,
    contractTotalParcelas: row.contract_total_parcelas,
  }));
}

async function updateInstallmentStatus(id, status) {
  if (!INSTALLMENT_STATUSES.includes(status)) throw new Error("Status de parcela inválido: " + status);
  const now = new Date().toISOString();
  const pagoEm = status === "pago" ? now.slice(0, 10) : null;
  const result = await pool.query(
    "UPDATE loan_installments SET status = $1, pago_em = $2, updated_at = $3 WHERE id = $4",
    [status, pagoEm, now, id]
  );
  return result.rowCount > 0;
}

async function updateContractStatus(id, status) {
  if (!CONTRACT_STATUSES.includes(status)) throw new Error("Status de contrato inválido: " + status);
  const now = new Date().toISOString();
  const result = await pool.query(
    "UPDATE loan_contracts SET status = $1, updated_at = $2 WHERE id = $3",
    [status, now, id]
  );
  return result.rowCount > 0;
}

module.exports = {
  CONTRACT_STATUSES,
  INSTALLMENT_STATUSES,
  createContract,
  listAllContracts,
  getContractById,
  listInstallmentsByContract,
  listContractsByCustomer,
  listInstallmentsByCustomer,
  updateInstallmentStatus,
  updateContractStatus,
};
