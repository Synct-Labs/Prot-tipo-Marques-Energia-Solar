/* =====================================================================
   SALDO DO MARQUES PAY
   ---------------------------------------------------------------------
   Por enquanto, sem parceiro bancário de verdade integrado, o saldo é
   lançado manualmente pelo admin (representativo — ver README). Segue o
   mesmo espírito de ledger dos repasses de participação nos lucros: o
   saldo é sempre a SOMA dos lançamentos, nunca um número solto editável
   direto — dá auditoria e extrato de graça.
   ===================================================================== */
const { pool } = require("./db");

function err(status, message) { return Object.assign(new Error(message), { statusCode: status }); }

async function addEntry(accountId, { valor, descricao, autor }) {
  const v = Number(valor);
  if (!Number.isFinite(v) || v === 0) throw err(400, "Informe um valor diferente de zero.");
  const d = String(descricao || "").trim();
  if (!d) throw err(400, "Informe uma descrição pro lançamento.");
  const now = new Date().toISOString();
  await pool.query(
    "INSERT INTO pay_balance_entries (account_id, valor, descricao, autor, created_at) VALUES ($1,$2,$3,$4,$5)",
    [accountId, v, d, autor, now]
  );
  return getSaldo(accountId);
}

async function getSaldo(accountId) {
  const { rows } = await pool.query(
    "SELECT COALESCE(SUM(valor), 0) AS saldo FROM pay_balance_entries WHERE account_id = $1",
    [accountId]
  );
  return Number(rows[0].saldo);
}

async function listEntriesByAccount(accountId) {
  const { rows } = await pool.query(
    "SELECT id, valor, descricao, autor, created_at FROM pay_balance_entries WHERE account_id = $1 ORDER BY id DESC",
    [accountId]
  );
  return rows;
}

// Últimos lançamentos de qualquer cliente, pro admin acompanhar sem
// precisar abrir conta por conta.
async function listRecentForAdmin(limit = 100) {
  const { rows } = await pool.query(
    `SELECT e.id, e.valor, e.descricao, e.autor, e.created_at, e.account_id,
            c.nome AS customer_nome, c.email AS customer_email, c.cpf AS customer_cpf
     FROM pay_balance_entries e
     JOIN pay_accounts a ON a.id = e.account_id
     JOIN customers c ON c.id = a.customer_id
     ORDER BY e.id DESC LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id, valor: r.valor, descricao: r.descricao, autor: r.autor, createdAt: r.created_at,
    customer: { nome: r.customer_nome, email: r.customer_email, cpf: r.customer_cpf },
  }));
}

module.exports = { addEntry, getSaldo, listEntriesByAccount, listRecentForAdmin };
