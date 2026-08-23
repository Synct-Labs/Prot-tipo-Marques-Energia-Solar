/* =====================================================================
   PEDIDOS: acesso ao banco
   ===================================================================== */
const { pool } = require("./db");

const VALID_STATUSES = [
  "novo",
  "confirmado",
  "em_preparacao",
  "enviado",
  "entregue",
  "cancelado",
];

function rowToOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customer: {
      nome: row.customer_nome,
      cpf: row.customer_cpf,
      email: row.customer_email,
      telefone: row.customer_telefone,
    },
    endereco: {
      cep: row.endereco_cep,
      cidade: row.endereco_cidade,
      estado: row.endereco_estado,
      rua: row.endereco_rua,
      numero: row.endereco_numero,
      bairro: row.endereco_bairro,
      complemento: row.endereco_complemento,
    },
    pagamento: row.pagamento,
    itens: JSON.parse(row.itens_json),
    subtotal: row.subtotal,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createOrder(payload) {
  const now = new Date().toISOString();

  // order_number temporário único (timestamp), substituído por um número
  // amigável baseado no id logo após o insert.
  const tempNumber = `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const insert = await pool.query(
    `INSERT INTO orders (
      order_number, status, customer_nome, customer_cpf, customer_email, customer_telefone,
      endereco_cep, endereco_cidade, endereco_estado, endereco_rua, endereco_numero,
      endereco_bairro, endereco_complemento, pagamento, itens_json, subtotal, total,
      created_at, updated_at
    ) VALUES ($1, 'novo', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING id`,
    [
      tempNumber,
      payload.nome,
      payload.cpf,
      payload.email,
      payload.telefone,
      payload.cep || "",
      payload.cidade || "",
      payload.estado || "",
      payload.rua || "",
      payload.numero || "",
      payload.bairro || "",
      payload.complemento || "",
      payload.pagamento || "",
      JSON.stringify(payload.itens || []),
      payload.subtotal,
      payload.total,
      now,
      now,
    ]
  );

  const id = insert.rows[0].id;
  const orderNumber = `MES-${String(id).padStart(6, "0")}`;
  await pool.query("UPDATE orders SET order_number = $1 WHERE id = $2", [orderNumber, id]);

  return { id, orderNumber };
}

async function listOrders({ status, q } = {}) {
  let sql = "SELECT * FROM orders";
  const clauses = [];
  const params = [];

  if (status && VALID_STATUSES.includes(status)) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (q) {
    const like = `%${q}%`;
    params.push(like, like, like);
    clauses.push(
      `(order_number ILIKE $${params.length - 2} OR customer_nome ILIKE $${params.length - 1} OR customer_email ILIKE $${params.length})`
    );
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY id DESC";

  const { rows } = await pool.query(sql, params);
  return rows.map(rowToOrder);
}

async function getOrderById(id) {
  const { rows } = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
  return rows[0] ? rowToOrder(rows[0]) : null;
}

async function updateOrderStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Status inválido: " + status);
  }
  const now = new Date().toISOString();
  const result = await pool.query(
    "UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3",
    [status, now, id]
  );
  return result.rowCount > 0;
}

async function getOrderStats() {
  const { rows } = await pool.query("SELECT status, COUNT(*)::int as c FROM orders GROUP BY status");
  const stats = {};
  VALID_STATUSES.forEach((s) => (stats[s] = 0));
  rows.forEach((r) => (stats[r.status] = r.c));
  return stats;
}

module.exports = {
  VALID_STATUSES,
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
};
