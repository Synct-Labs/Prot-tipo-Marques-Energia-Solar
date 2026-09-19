const crypto = require("crypto");
const { pool } = require("./db");

function toPublic(row) {
  if (!row) return null;
  return {
    numeroConta: row.numero_conta,
    agencia: row.agencia,
    status: row.status,
    criadaEm: row.created_at,
  };
}

async function getByCustomer(customerId) {
  const { rows } = await pool.query("SELECT * FROM pay_accounts WHERE customer_id = $1", [customerId]);
  return toPublic(rows[0]);
}

function generateNumero() {
  const base = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const dv = base.split("").reduce((s, d, i) => s + Number(d) * (i + 2), 0) % 11 % 10;
  return `${base}-${dv}`;
}

// Abre a conta (uma por cliente). Devolve a existente se já houver.
async function open(customerId) {
  const existing = await getByCustomer(customerId);
  if (existing) return existing;
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO pay_accounts (customer_id, numero_conta, aceite_termos_em, created_at)
         VALUES ($1, $2, $3, $3) RETURNING *`,
        [customerId, generateNumero(), now]
      );
      return toPublic(rows[0]);
    } catch (err) {
      if (err.code !== "23505") throw err;
      const again = await getByCustomer(customerId);
      if (again) return again;
    }
  }
  throw new Error("Não foi possível gerar o número da conta.");
}

module.exports = { getByCustomer, open };
