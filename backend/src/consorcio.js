/* =====================================================================
   COMPRA PROGRAMADA (ex-Consórcio): grupos com cotas limitadas
   ---------------------------------------------------------------------
   Fluxo:
     1) Admin cria o grupo (cotas, valor da cota, prazo, taxa, regras).
     2) Admin libera "visivel_site" -> aparece no catálogo público.
     3) Admin libera "visivel_parceiro" -> parceiro vê o grupo e pode
        lançar uma venda pra um cliente.
     4a) Cliente contrata direto pelo catálogo -> preenche CPF e anexa
         comprovante de endereço + documento com foto -> adesão nasce
         'aguardando_pagamento' (partner_id já gravado se veio de
         indicação, mas a comissão só nasce quando o admin confirma o
         pagamento — ver confirmarPagamento).
     4b) Parceiro lança a venda -> adesão nasce 'aguardando_cliente'
         (SEM comissão ainda). O cliente precisa entrar e confirmar; só
         nesse momento a comissão do parceiro é criada.
   ===================================================================== */
const { pool } = require("./db");
const partners = require("./partners");

const ADESAO_STATUS = ["aguardando_cliente", "aguardando_pagamento", "confirmada", "cancelada"];
// Comprovante de endereço + documento com foto: mesmo limite usado no
// checkout da loja.
const MAX_DOC_BYTES = 5 * 1024 * 1024;

function err(status, message) { return Object.assign(new Error(message), { statusCode: status }); }

/* ---------------------- GRUPOS ---------------------- */
function rowToGrupo(row) {
  const cotasOcupadas = Number(row.cotas_ocupadas || 0);
  return {
    id: row.id,
    nome: row.nome,
    cotasTotal: row.cotas_total,
    cotasOcupadas,
    vagasRestantes: Math.max(0, row.cotas_total - cotasOcupadas),
    valorCota: row.valor_cota,
    prazoMeses: row.prazo_meses,
    taxaAdministracaoPct: row.taxa_administracao_pct,
    regras: row.regras || "",
    visivelSite: row.visivel_site,
    visivelParceiro: row.visivel_parceiro,
    encerrado: row.encerrado,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// "cotas_ocupadas" conta adesões que reservam vaga (pendente ou confirmada,
// nunca cancelada) — calculado na consulta pra nunca ficar dessincronizado.
const GRUPO_SELECT = `
  SELECT g.*, COALESCE(a.ocupadas, 0) AS cotas_ocupadas
  FROM consorcio_grupos g
  LEFT JOIN (
    SELECT grupo_id, COUNT(*)::int AS ocupadas
    FROM consorcio_adesoes WHERE status <> 'cancelada' GROUP BY grupo_id
  ) a ON a.grupo_id = g.id
`;

function validateGrupoPayload(body, { partial } = {}) {
  const need = (cond, msg) => { if (!cond) throw err(400, msg); };
  if (!partial || body.nome !== undefined) need(String(body.nome || "").trim().length >= 3, "Informe o nome do grupo.");
  if (!partial || body.cotasTotal !== undefined) need(Number.isInteger(Number(body.cotasTotal)) && Number(body.cotasTotal) > 0, "Quantidade de cotas inválida.");
  if (!partial || body.valorCota !== undefined) need(Number(body.valorCota) > 0, "Valor da cota inválido.");
  if (!partial || body.prazoMeses !== undefined) need(Number.isInteger(Number(body.prazoMeses)) && Number(body.prazoMeses) > 0, "Prazo (em meses) inválido.");
  if (body.taxaAdministracaoPct !== undefined && body.taxaAdministracaoPct !== null && body.taxaAdministracaoPct !== "") {
    need(Number(body.taxaAdministracaoPct) >= 0 && Number(body.taxaAdministracaoPct) <= 100, "Taxa de administração inválida.");
  }
}

async function createGrupo(body) {
  validateGrupoPayload(body);
  const now = new Date().toISOString();
  const insert = await pool.query(
    `INSERT INTO consorcio_grupos (nome, cotas_total, valor_cota, prazo_meses, taxa_administracao_pct, regras, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
    [String(body.nome).trim(), Number(body.cotasTotal), Number(body.valorCota), Number(body.prazoMeses), Number(body.taxaAdministracaoPct) || 0, String(body.regras || "").trim(), now]
  );
  return getGrupoById(insert.rows[0].id);
}

async function updateGrupo(id, body) {
  validateGrupoPayload(body, { partial: true });
  const current = await getGrupoById(id);
  if (!current) throw err(404, "Grupo não encontrado.");

  const fields = {
    nome: body.nome !== undefined ? String(body.nome).trim() : current.nome,
    cotas_total: body.cotasTotal !== undefined ? Number(body.cotasTotal) : current.cotasTotal,
    valor_cota: body.valorCota !== undefined ? Number(body.valorCota) : current.valorCota,
    prazo_meses: body.prazoMeses !== undefined ? Number(body.prazoMeses) : current.prazoMeses,
    taxa_administracao_pct: body.taxaAdministracaoPct !== undefined ? Number(body.taxaAdministracaoPct) : current.taxaAdministracaoPct,
    regras: body.regras !== undefined ? String(body.regras).trim() : current.regras,
    visivel_site: body.visivelSite !== undefined ? !!body.visivelSite : current.visivelSite,
    visivel_parceiro: body.visivelParceiro !== undefined ? !!body.visivelParceiro : current.visivelParceiro,
    encerrado: body.encerrado !== undefined ? !!body.encerrado : current.encerrado,
  };
  if (fields.cotas_total < current.cotasOcupadas) {
    throw err(400, `Já existem ${current.cotasOcupadas} adesão(ões) nesse grupo — não dá pra reduzir pra menos que isso.`);
  }
  await pool.query(
    `UPDATE consorcio_grupos SET nome=$1, cotas_total=$2, valor_cota=$3, prazo_meses=$4, taxa_administracao_pct=$5,
       regras=$6, visivel_site=$7, visivel_parceiro=$8, encerrado=$9, updated_at=$10 WHERE id=$11`,
    [fields.nome, fields.cotas_total, fields.valor_cota, fields.prazo_meses, fields.taxa_administracao_pct,
     fields.regras, fields.visivel_site, fields.visivel_parceiro, fields.encerrado, new Date().toISOString(), id]
  );
  return getGrupoById(id);
}

/* ---------------------- TEXTO DE APRESENTAÇÃO (editável pelo admin) ----------------------
   Descrição que aparece no card da Compra Programada na página de crédito.
   Vazio = o site usa o texto padrão (e a tradução automática dele). Pode ter
   uma versão em inglês opcional; sem ela, quem usa o site em inglês vê a
   versão em português. */
const TEXTO_KEYS = { pt: "consorcio_texto_pt", en: "consorcio_texto_en" };
const MAX_TEXTO_CHARS = 1500;

async function getTexto() {
  const { rows } = await pool.query("SELECT key, value FROM site_settings WHERE key = ANY($1::text[])", [Object.values(TEXTO_KEYS)]);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { pt: byKey[TEXTO_KEYS.pt] || "", en: byKey[TEXTO_KEYS.en] || "" };
}

async function setTexto({ pt, en }, autor) {
  const values = { pt: String(pt || "").trim(), en: String(en || "").trim() };
  for (const lang of ["pt", "en"]) {
    if (values[lang].length > MAX_TEXTO_CHARS) {
      throw err(400, `O texto aceita no máximo ${MAX_TEXTO_CHARS} caracteres.`);
    }
  }
  const now = new Date().toISOString();
  for (const lang of ["pt", "en"]) {
    if (!values[lang]) {
      await pool.query("DELETE FROM site_settings WHERE key = $1", [TEXTO_KEYS[lang]]);
      continue;
    }
    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at, updated_by) VALUES ($1,$2,$3,$4)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by`,
      [TEXTO_KEYS[lang], values[lang], now, autor]
    );
  }
  return getTexto();
}

async function getGrupoById(id) {
  const { rows } = await pool.query(`${GRUPO_SELECT} WHERE g.id = $1`, [id]);
  return rows[0] ? rowToGrupo(rows[0]) : null;
}

async function listGruposAdmin() {
  const { rows } = await pool.query(`${GRUPO_SELECT} ORDER BY g.id DESC`);
  return rows.map(rowToGrupo);
}

async function listGruposPublicos() {
  const { rows } = await pool.query(`${GRUPO_SELECT} WHERE g.visivel_site = true AND g.encerrado = false ORDER BY g.id DESC`);
  return rows.map(rowToGrupo);
}

async function listGruposParceiro() {
  const { rows } = await pool.query(`${GRUPO_SELECT} WHERE g.visivel_parceiro = true AND g.encerrado = false ORDER BY g.id DESC`);
  return rows.map(rowToGrupo);
}

/* ---------------------- ADESÕES ---------------------- */
function rowToAdesao(row) {
  return {
    id: row.id,
    grupoId: row.grupo_id,
    grupoNome: row.grupo_nome,
    customerId: row.customer_id,
    partnerId: row.partner_id,
    parceiroNome: row.parceiro_nome,
    parceiroCodigo: row.parceiro_codigo,
    origem: row.origem,
    nome: row.nome,
    cpf: row.cpf || "",
    telefone: row.telefone || "",
    email: row.email || "",
    valorCota: row.valor_cota,
    prazoMeses: row.prazo_meses,
    status: row.status,
    temDocEndereco: !!row.doc_endereco_dados,
    temDocFoto: !!row.doc_foto_dados,
    paymentLink: row.payment_link || null,
    confirmadaEm: row.confirmada_em,
    createdAt: row.created_at,
  };
}

const ADESAO_SELECT = `
  SELECT ad.*, g.nome AS grupo_nome, g.valor_cota, g.prazo_meses,
         p.codigo AS parceiro_codigo, c.nome AS parceiro_nome
  FROM consorcio_adesoes ad
  JOIN consorcio_grupos g ON g.id = ad.grupo_id
  LEFT JOIN partners p ON p.id = ad.partner_id
  LEFT JOIN customers c ON c.id = p.customer_id
`;

async function assertVagaDisponivel(grupoId) {
  const { rows } = await pool.query(`${GRUPO_SELECT} WHERE g.id = $1`, [grupoId]);
  const grupo = rows[0] ? rowToGrupo(rows[0]) : null;
  if (!grupo) throw err(404, "Grupo não encontrado.");
  if (grupo.encerrado) throw err(409, "Esse grupo está encerrado.");
  if (grupo.vagasRestantes <= 0) throw err(409, "Não há mais cotas disponíveis nesse grupo.");
  return grupo;
}

// Cliente contrata direto pelo catálogo do site: precisa de CPF e dos dois
// documentos (mesmo padrão do checkout da loja) — a adesão nasce
// 'aguardando_pagamento', não confirmada na hora. Se veio de indicação de
// parceiro, o partner_id já fica gravado, mas a comissão só nasce quando o
// admin confirmar que o pagamento caiu (ver confirmarPagamento) — não faz
// sentido gerar comissão prevista antes de saber se a pessoa vai pagar.
async function contratarComoCliente(customerId, grupoId, {
  nome, cpf, telefone, email, refCode,
  docEnderecoBuffer, docEnderecoTipo, docEnderecoNome,
  docFotoBuffer, docFotoTipo, docFotoNome,
}) {
  await assertVagaDisponivel(grupoId);
  const partner = await partners.resolveAttribution(refCode, customerId);
  const now = new Date().toISOString();
  const insert = await pool.query(
    `INSERT INTO consorcio_adesoes (
      grupo_id, customer_id, partner_id, origem, nome, cpf, telefone, email,
      doc_endereco_dados, doc_endereco_tipo, doc_endereco_nome,
      doc_foto_dados, doc_foto_tipo, doc_foto_nome,
      status, created_at, updated_at
    ) VALUES ($1,$2,$3,'cliente',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'aguardando_pagamento',$14,$14)
    RETURNING id`,
    [
      grupoId, customerId, partner ? partner.id : null,
      String(nome || "").trim(), String(cpf || "").trim(), String(telefone || "").trim(), String(email || "").trim(),
      docEnderecoBuffer, docEnderecoTipo || null, String(docEnderecoNome || "").slice(0, 120) || null,
      docFotoBuffer, docFotoTipo || null, String(docFotoNome || "").slice(0, 120) || null,
      now,
    ]
  );
  return getAdesaoById(insert.rows[0].id);
}

// Admin lança o link de pagamento (ou chave PIX) e avisa o cliente por e-mail.
async function setPaymentLink(id, link) {
  const result = await pool.query(
    "UPDATE consorcio_adesoes SET payment_link = $1, updated_at = $2 WHERE id = $3",
    [link, new Date().toISOString(), id]
  );
  return result.rowCount > 0;
}

// Admin confirma que o pagamento caiu: só aqui a adesão vira 'confirmada' e,
// se houver parceiro, a comissão nasce (status 'prevista').
async function confirmarPagamento(id) {
  const { rows } = await pool.query("SELECT * FROM consorcio_adesoes WHERE id = $1", [id]);
  const row = rows[0];
  if (!row) throw err(404, "Adesão não encontrada.");
  if (row.status !== "aguardando_pagamento") throw err(409, "Essa adesão não está aguardando pagamento.");

  const now = new Date().toISOString();
  await pool.query(
    "UPDATE consorcio_adesoes SET status = 'confirmada', confirmada_em = $1, updated_at = $1 WHERE id = $2",
    [now, id]
  );
  if (row.partner_id) {
    const { rows: prows } = await pool.query("SELECT * FROM partners WHERE id = $1", [row.partner_id]);
    if (prows[0]) await registrarComissao(id, prows[0]);
  }
  return getAdesaoById(id);
}

async function getDocEndereco(id) {
  const { rows } = await pool.query(
    "SELECT doc_endereco_dados, doc_endereco_tipo, doc_endereco_nome FROM consorcio_adesoes WHERE id = $1",
    [id]
  );
  const row = rows[0];
  if (!row || !row.doc_endereco_dados) return null;
  return { data: row.doc_endereco_dados, tipo: row.doc_endereco_tipo, nome: row.doc_endereco_nome };
}

async function getDocFoto(id) {
  const { rows } = await pool.query(
    "SELECT doc_foto_dados, doc_foto_tipo, doc_foto_nome FROM consorcio_adesoes WHERE id = $1",
    [id]
  );
  const row = rows[0];
  if (!row || !row.doc_foto_dados) return null;
  return { data: row.doc_foto_dados, tipo: row.doc_foto_tipo, nome: row.doc_foto_nome };
}

// Parceiro lança a venda pro cliente: adesão nasce 'aguardando_cliente',
// SEM comissão ainda (só quando o cliente confirmar).
async function lancarComoParceiro(partnerRow, grupoId, { nome, telefone, email, customerId }) {
  if (!String(nome || "").trim()) throw err(400, "Informe o nome do cliente.");
  if (!String(telefone || "").trim() && !String(email || "").trim()) throw err(400, "Informe pelo menos telefone ou e-mail do cliente.");
  await assertVagaDisponivel(grupoId);
  const now = new Date().toISOString();
  const insert = await pool.query(
    `INSERT INTO consorcio_adesoes (grupo_id, customer_id, partner_id, origem, nome, telefone, email, status, created_at, updated_at)
     VALUES ($1,$2,$3,'parceiro',$4,$5,$6,'aguardando_cliente',$7,$7) RETURNING id`,
    [grupoId, customerId || null, partnerRow.id, String(nome).trim(), String(telefone || "").trim(), String(email || "").trim(), now]
  );
  return getAdesaoById(insert.rows[0].id);
}

async function getAdesaoById(id) {
  const { rows } = await pool.query(`${ADESAO_SELECT} WHERE ad.id = $1`, [id]);
  return rows[0] ? rowToAdesao(rows[0]) : null;
}

async function listAdesoesByCustomer(customerId) {
  const { rows } = await pool.query(`${ADESAO_SELECT} WHERE ad.customer_id = $1 ORDER BY ad.id DESC`, [customerId]);
  return rows.map(rowToAdesao);
}

// Adesões lançadas por um parceiro pra um e-mail, ainda sem customer_id
// (o cliente ainda não tinha conta, ou o parceiro não sabia o id) — usado
// pra mostrar pro cliente logado as pendências endereçadas a ele por e-mail.
async function listAdesoesPendentesPorEmail(email) {
  const { rows } = await pool.query(
    `${ADESAO_SELECT} WHERE ad.customer_id IS NULL AND ad.status = 'aguardando_cliente' AND lower(ad.email) = lower($1) ORDER BY ad.id DESC`,
    [email]
  );
  return rows.map(rowToAdesao);
}

async function listAdesoesAdmin({ grupoId } = {}) {
  const clauses = [];
  const params = [];
  if (grupoId) { params.push(grupoId); clauses.push(`ad.grupo_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await pool.query(`${ADESAO_SELECT} ${where} ORDER BY ad.id DESC LIMIT 500`, params);
  return rows.map(rowToAdesao);
}

async function registrarComissao(adesaoId, partnerRow) {
  const adesao = await getAdesaoById(adesaoId);
  await partners.registerSale({
    tipo: "consorcio",
    adesaoId,
    referencia: adesao.grupoNome,
    base: adesao.valorCota,
    partner: partnerRow,
  });
}

// Cliente confirma uma adesão que um parceiro lançou pra ele: só aqui a
// comissão do parceiro nasce (status 'prevista').
async function confirmarAdesao(customerId, adesaoId) {
  const { rows } = await pool.query("SELECT * FROM consorcio_adesoes WHERE id = $1", [adesaoId]);
  const row = rows[0];
  if (!row) throw err(404, "Adesão não encontrada.");
  if (row.customer_id != null && row.customer_id !== customerId) throw err(403, "Essa adesão não é sua.");
  if (row.status !== "aguardando_cliente") throw err(409, "Essa adesão já foi processada.");

  const now = new Date().toISOString();
  await pool.query(
    "UPDATE consorcio_adesoes SET customer_id = $1, status = 'confirmada', confirmada_em = $2, updated_at = $2 WHERE id = $3",
    [customerId, now, adesaoId]
  );

  if (row.partner_id) {
    const { rows: prows } = await pool.query("SELECT * FROM partners WHERE id = $1", [row.partner_id]);
    if (prows[0]) await registrarComissao(adesaoId, prows[0]);
  }
  return getAdesaoById(adesaoId);
}

async function cancelarAdesao(id) {
  const now = new Date().toISOString();
  const result = await pool.query(
    "UPDATE consorcio_adesoes SET status = 'cancelada', updated_at = $1 WHERE id = $2 AND status <> 'confirmada'",
    [now, id]
  );
  if (!result.rowCount) throw err(409, "Só dá pra cancelar adesões que ainda não foram confirmadas.");
  await pool.query(
    "UPDATE partner_commissions SET status = 'cancelada', updated_at = $1 WHERE adesao_id = $2 AND status NOT IN ('paga')",
    [now, id]
  );
}

module.exports = {
  ADESAO_STATUS, MAX_DOC_BYTES,
  createGrupo, updateGrupo, getGrupoById, listGruposAdmin, listGruposPublicos, listGruposParceiro,
  contratarComoCliente, lancarComoParceiro, getAdesaoById, listAdesoesByCustomer,
  listAdesoesPendentesPorEmail, listAdesoesAdmin, confirmarAdesao, cancelarAdesao,
  setPaymentLink, confirmarPagamento, getDocEndereco, getDocFoto,
  getTexto, setTexto,
};
