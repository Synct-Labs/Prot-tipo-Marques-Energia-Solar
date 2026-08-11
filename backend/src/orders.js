/* =====================================================================
   PEDIDOS — acesso ao banco
   ===================================================================== */
const db = require("./db");

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

function createOrder(payload) {
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO orders (
      order_number, status, customer_nome, customer_cpf, customer_email, customer_telefone,
      endereco_cep, endereco_cidade, endereco_estado, endereco_rua, endereco_numero,
      endereco_bairro, endereco_complemento, pagamento, itens_json, subtotal, total,
      created_at, updated_at
    ) VALUES (?, 'novo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // order_number temporário único (timestamp), substituído por um número
  // amigável baseado no id logo após o insert.
  const tempNumber = `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const info = insert.run(
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
    now
  );

  const id = info.lastInsertRowid;
  const orderNumber = `MES-${String(id).padStart(6, "0")}`;
  db.prepare("UPDATE orders SET order_number = ? WHERE id = ?").run(orderNumber, id);

  return { id, orderNumber };
}

function listOrders({ status, q } = {}) {
  let sql = "SELECT * FROM orders";
  const clauses = [];
  const params = [];

  if (status && VALID_STATUSES.includes(status)) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (q) {
    clauses.push(
      "(order_number LIKE ? OR customer_nome LIKE ? OR customer_email LIKE ?)"
    );
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY id DESC";

  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToOrder);
}

function getOrderById(id) {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  return row ? rowToOrder(row) : null;
}

function updateOrderStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Status inválido: " + status);
  }
  const now = new Date().toISOString();
  const info = db
    .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, now, id);
  return info.changes > 0;
}

function getOrderStats() {
  const rows = db
    .prepare("SELECT status, COUNT(*) as c FROM orders GROUP BY status")
    .all();
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
