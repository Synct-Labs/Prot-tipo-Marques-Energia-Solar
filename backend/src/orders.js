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
const MAX_CONTRATO_BYTES = 8 * 1024 * 1024; // 8MB é de sobra pra um contrato escaneado
// Comprovante de endereço + documento com foto: obrigatórios em todo pedido
// (comprado pelo cliente ou por parceiro em nome dele), pra validar quem tá
// recebendo o equipamento antes de despachar.
const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5MB por documento é de sobra pra uma foto de celular

function rowToOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerId: row.customer_id,
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
    parcelas: row.parcelas,
    itens: JSON.parse(row.itens_json),
    subtotal: row.subtotal,
    total: row.total,
    temContrato: !!row.contrato_dados,
    temDocEndereco: !!row.doc_endereco_dados,
    temDocFoto: !!row.doc_foto_dados,
    partnerId: row.partner_id || null,
    paymentLink: row.payment_link || null,
    pendencia: row.pendencia_texto
      ? { texto: row.pendencia_texto, criadaEm: row.pendencia_criada_em, autor: row.pendencia_autor }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function setContrato(id, { contratoBuffer, contratoTipo, contratoNome }) {
  const now = new Date().toISOString();
  const result = await pool.query(
    "UPDATE orders SET contrato_dados=$1, contrato_tipo=$2, contrato_nome=$3, updated_at=$4 WHERE id=$5",
    [contratoBuffer, contratoTipo || null, contratoNome || null, now, id]
  );
  return result.rowCount > 0;
}

// customerId != null restringe ao dono do pedido (uso do cliente); passe
// null pra pular a checagem (uso do admin).
async function getContrato(id, customerId = null) {
  const { rows } = await pool.query(
    "SELECT customer_id, contrato_dados, contrato_tipo, contrato_nome FROM orders WHERE id = $1",
    [id]
  );
  const row = rows[0];
  if (!row || !row.contrato_dados) return null;
  if (customerId !== null && row.customer_id !== customerId) return null;
  return { data: row.contrato_dados, tipo: row.contrato_tipo, nome: row.contrato_nome };
}

async function createOrder(payload, customerId = null) {
  const now = new Date().toISOString();

  // order_number temporário único (timestamp), substituído por um número
  // amigável baseado no id logo após o insert.
  const tempNumber = `TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const insert = await pool.query(
    `INSERT INTO orders (
      order_number, status, customer_id, customer_nome, customer_cpf, customer_email, customer_telefone,
      endereco_cep, endereco_cidade, endereco_estado, endereco_rua, endereco_numero,
      endereco_bairro, endereco_complemento, pagamento, parcelas, itens_json, subtotal, total,
      doc_endereco_dados, doc_endereco_tipo, doc_endereco_nome,
      doc_foto_dados, doc_foto_tipo, doc_foto_nome,
      created_at, updated_at
    ) VALUES ($1, 'novo', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24, $25, $25)
    RETURNING id`,
    [
      tempNumber,
      customerId,
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
      // Só faz sentido parcelar no cartão; Pix/boleto ficam null (à vista).
      payload.pagamento === "cartao" ? payload.parcelas || 1 : null,
      JSON.stringify(payload.itens || []),
      payload.subtotal,
      payload.total,
      payload.docEnderecoBuffer,
      payload.docEnderecoTipo || null,
      String(payload.docEnderecoNome || "").slice(0, 120) || null,
      payload.docFotoBuffer,
      payload.docFotoTipo || null,
      String(payload.docFotoNome || "").slice(0, 120) || null,
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

async function listOrdersByCustomer(customerId) {
  const { rows } = await pool.query(
    "SELECT * FROM orders WHERE customer_id = $1 ORDER BY id DESC",
    [customerId]
  );
  return rows.map(rowToOrder);
}

// Pedidos indicados/comprados por um parceiro (partner_id setado em
// partners.registerSale) — usado no painel do parceiro pra acompanhar o
// status de cada venda, não só a comissão.
async function listOrdersByPartner(partnerId) {
  const { rows } = await pool.query(
    "SELECT * FROM orders WHERE partner_id = $1 ORDER BY id DESC",
    [partnerId]
  );
  return rows.map(rowToOrder);
}

async function getDocEndereco(id) {
  const { rows } = await pool.query(
    "SELECT doc_endereco_dados, doc_endereco_tipo, doc_endereco_nome FROM orders WHERE id = $1",
    [id]
  );
  const row = rows[0];
  if (!row || !row.doc_endereco_dados) return null;
  return { data: row.doc_endereco_dados, tipo: row.doc_endereco_tipo, nome: row.doc_endereco_nome };
}

// Link de pagamento (ou boleto): o admin lança aqui; quem avisa o parceiro
// ou o cliente é o server.js, depois de chamar essa função com sucesso.
async function setPaymentLink(id, link) {
  const result = await pool.query(
    "UPDATE orders SET payment_link = $1, updated_at = $2 WHERE id = $3",
    [link, new Date().toISOString(), id]
  );
  return result.rowCount > 0;
}

async function setPendencia(id, { texto, autor }) {
  const now = new Date().toISOString();
  const result = await pool.query(
    "UPDATE orders SET pendencia_texto = $1, pendencia_criada_em = $2, pendencia_autor = $3, updated_at = $2 WHERE id = $4",
    [texto, now, autor, id]
  );
  return result.rowCount > 0;
}

async function clearPendencia(id) {
  const result = await pool.query(
    "UPDATE orders SET pendencia_texto = NULL, pendencia_criada_em = NULL, pendencia_autor = NULL, updated_at = $1 WHERE id = $2",
    [new Date().toISOString(), id]
  );
  return result.rowCount > 0;
}

async function getDocFoto(id) {
  const { rows } = await pool.query(
    "SELECT doc_foto_dados, doc_foto_tipo, doc_foto_nome FROM orders WHERE id = $1",
    [id]
  );
  const row = rows[0];
  if (!row || !row.doc_foto_dados) return null;
  return { data: row.doc_foto_dados, tipo: row.doc_foto_tipo, nome: row.doc_foto_nome };
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
  MAX_CONTRATO_BYTES,
  MAX_DOC_BYTES,
  createOrder,
  listOrders,
  getOrderById,
  listOrdersByCustomer,
  listOrdersByPartner,
  updateOrderStatus,
  getOrderStats,
  setContrato,
  getContrato,
  getDocEndereco,
  getDocFoto,
  setPaymentLink,
  setPendencia,
  clearPendencia,
};
