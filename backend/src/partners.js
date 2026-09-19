/* =====================================================================
   PROGRAMA DE PARCEIROS (vendas por indicação com comissão)
   ---------------------------------------------------------------------
   Um Parceiro é uma pessoa com conta de cliente que divulga o link
   ?ref=CODIGO. Pedidos da loja e solicitações de crédito feitos por esse
   link ficam atribuídos a ele e geram uma comissão:

     prevista -> liberada -> paga        (ou cancelada)

   - prevista: venda registrada, ainda não concluída;
   - liberada: pedido entregue / crédito convertido;
   - paga: a Marques fez o PIX e anexou o comprovante (nenhum dinheiro
     passa pelo sistema, só o registro).
   Regras gerais ficam em app_settings; cada parceiro pode ter regra própria.
   ===================================================================== */
const crypto = require("crypto");
const { pool } = require("./db");

const TERMOS_VERSAO = "parceiro-2026-09-v1";
const PIX_TIPOS = ["cpf", "email", "telefone", "aleatoria"];
const PARTNER_STATUS = ["pendente", "ativo", "suspenso", "recusado"];
const COMMISSION_STATUS = ["prevista", "liberada", "paga", "cancelada"];
const DEFAULT_RATES = { loja: 5, credito: 2 };
const MAX_PCT = 50;
const MAX_COMPROVANTE_BYTES = 4 * 1024 * 1024;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function err(status, message) { return Object.assign(new Error(message), { statusCode: status }); }
function round2(n) { return Math.round(n * 100) / 100; }

/* ---------------------- REGRAS GERAIS ---------------------- */
async function getRates() {
  const { rows } = await pool.query("SELECT chave, valor FROM app_settings WHERE chave IN ('comissao_loja_pct','comissao_credito_pct')");
  const map = Object.fromEntries(rows.map((r) => [r.chave, Number(r.valor)]));
  return {
    loja: Number.isFinite(map.comissao_loja_pct) ? map.comissao_loja_pct : DEFAULT_RATES.loja,
    credito: Number.isFinite(map.comissao_credito_pct) ? map.comissao_credito_pct : DEFAULT_RATES.credito,
  };
}

function validPct(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= MAX_PCT;
}

async function setRates({ loja, credito }) {
  if (!validPct(loja) || !validPct(credito)) throw err(400, `Percentuais devem estar entre 0 e ${MAX_PCT}.`);
  for (const [k, v] of [["comissao_loja_pct", loja], ["comissao_credito_pct", credito]]) {
    await pool.query(
      "INSERT INTO app_settings (chave, valor) VALUES ($1,$2) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor",
      [k, String(Number(v))]
    );
  }
  return getRates();
}

/* ---------------------- PARCEIRO ---------------------- */
function generateCodigo() {
  let out = "";
  const bytes = crypto.randomBytes(7);
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

function toPublic(row, rates) {
  if (!row) return null;
  return {
    id: row.id,
    codigo: row.codigo,
    status: row.status,
    motivo: row.motivo || "",
    pixTipo: row.pix_tipo,
    pixChave: row.pix_chave,
    comissaoLojaPct: row.comissao_loja_pct != null ? row.comissao_loja_pct : rates.loja,
    comissaoCreditoPct: row.comissao_credito_pct != null ? row.comissao_credito_pct : rates.credito,
    criadoEm: row.created_at,
  };
}

async function getRowByCustomer(customerId) {
  const { rows } = await pool.query("SELECT * FROM partners WHERE customer_id = $1", [customerId]);
  return rows[0] || null;
}

async function getByCustomer(customerId) {
  return toPublic(await getRowByCustomer(customerId), await getRates());
}

async function apply(customerId, { pixTipo, pixChave, aceiteTermos, ip }) {
  if (aceiteTermos !== true) throw err(400, "Você precisa aceitar os termos do Programa de Parceiros.");
  if (!PIX_TIPOS.includes(pixTipo)) throw err(400, "Selecione o tipo da chave PIX.");
  const chave = String(pixChave || "").trim();
  if (chave.length < 3 || chave.length > 120) throw err(400, "Informe a chave PIX para receber as comissões.");
  const existing = await getRowByCustomer(customerId);
  const now = new Date().toISOString();
  if (existing) {
    if (existing.status !== "recusado") throw err(409, "Você já tem um cadastro de parceiro.");
    await pool.query(
      `UPDATE partners SET status='pendente', pix_tipo=$1, pix_chave=$2, termos_versao=$3, termos_aceite_em=$4,
         termos_aceite_ip=$5, motivo=NULL, updated_at=$4 WHERE id=$6`,
      [pixTipo, chave, TERMOS_VERSAO, now, ip || null, existing.id]
    );
    return getByCustomer(customerId);
  }
  for (let i = 0; i < 5; i++) {
    try {
      await pool.query(
        `INSERT INTO partners (customer_id, codigo, pix_tipo, pix_chave, termos_versao, termos_aceite_em, termos_aceite_ip, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$6,$6)`,
        [customerId, generateCodigo(), pixTipo, chave, TERMOS_VERSAO, now, ip || null]
      );
      break;
    } catch (e) {
      if (e.code !== "23505") throw e;
      if (await getRowByCustomer(customerId)) throw err(409, "Você já tem um cadastro de parceiro.");
    }
  }
  return getByCustomer(customerId);
}

/* ---------------------- ATRIBUIÇÃO E COMISSÃO ---------------------- */
// Devolve o parceiro dono do código, se estiver ativo e não for o próprio comprador.
async function resolveAttribution(refCode, buyerCustomerId) {
  const code = String(refCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return null;
  const { rows } = await pool.query("SELECT * FROM partners WHERE codigo = $1 AND status = 'ativo'", [code]);
  const p = rows[0];
  if (!p) return null;
  if (buyerCustomerId && p.customer_id === buyerCustomerId) return null; // sem autocomissão
  return p;
}

// Registra a venda indicada e cria a comissão "prevista". Idempotente por pedido/lead.
async function registerSale({ tipo, orderId, leadId, referencia, base, partner }) {
  const rates = await getRates();
  const pct = tipo === "loja"
    ? (partner.comissao_loja_pct != null ? partner.comissao_loja_pct : rates.loja)
    : (partner.comissao_credito_pct != null ? partner.comissao_credito_pct : rates.credito);
  const baseValor = Number(base) > 0 ? Number(base) : 0;
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO partner_commissions (partner_id, tipo, order_id, lead_id, referencia, base_valor, percentual, valor, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
     ON CONFLICT DO NOTHING`,
    [partner.id, tipo, orderId || null, leadId || null, referencia, baseValor, pct, round2((baseValor * pct) / 100), now]
  );
  if (orderId) await pool.query("UPDATE orders SET partner_id = $1 WHERE id = $2", [partner.id, orderId]);
  if (leadId) await pool.query("UPDATE credit_leads SET partner_id = $1 WHERE id = $2", [partner.id, leadId]);
}

const ORDER_MAP = { entregue: "liberada", cancelado: "cancelada" };
const LEAD_MAP = { convertido: "liberada", recusado: "cancelada" };

// Chamado quando o pedido/lead muda de status: mantém a comissão em dia.
async function syncStatus(kind, id, status) {
  const col = kind === "order" ? "order_id" : "lead_id";
  const target = (kind === "order" ? ORDER_MAP : LEAD_MAP)[status] || "prevista";
  await pool.query(
    `UPDATE partner_commissions SET status = $1, updated_at = $2 WHERE ${col} = $3 AND status NOT IN ('paga')`,
    [target, new Date().toISOString(), id]
  );
}

/* ---------------------- VISÃO DO PARCEIRO ---------------------- */
function commissionToPublic(r) {
  return {
    id: r.id,
    tipo: r.tipo,
    referencia: r.referencia,
    baseValor: r.base_valor,
    percentual: r.percentual,
    valor: r.valor,
    status: r.status,
    observacao: r.observacao || "",
    pagoEm: r.pago_em || null,
    temComprovante: !!r.comprovante_dados,
    criadaEm: r.created_at,
  };
}

async function summaryForPartner(partnerId) {
  const { rows } = await pool.query(
    `SELECT id, tipo, referencia, base_valor, percentual, valor, status, observacao, pago_em, created_at, comprovante_dados
       FROM partner_commissions WHERE partner_id = $1 ORDER BY id DESC`,
    [partnerId]
  );
  const totals = { prevista: 0, liberada: 0, paga: 0, cancelada: 0 };
  const counts = { loja: 0, credito: 0 };
  for (const r of rows) {
    totals[r.status] = round2((totals[r.status] || 0) + r.valor);
    if (r.status !== "cancelada") counts[r.tipo] = (counts[r.tipo] || 0) + 1;
  }
  return { totals, counts, commissions: rows.map(commissionToPublic) };
}

async function getComprovanteForPartner(commissionId, partnerId) {
  const { rows } = await pool.query(
    "SELECT comprovante_dados, comprovante_tipo, comprovante_nome FROM partner_commissions WHERE id = $1 AND partner_id = $2",
    [commissionId, partnerId]
  );
  const r = rows[0];
  if (!r || !r.comprovante_dados) return null;
  return { data: r.comprovante_dados, tipo: r.comprovante_tipo, nome: r.comprovante_nome };
}

/* ---------------------- ADMIN ---------------------- */
async function listPartners(status) {
  const rates = await getRates();
  const { rows } = await pool.query(
    `SELECT partners.*, customers.nome, customers.email, customers.cpf, customers.telefone,
            COALESCE(SUM(pc.valor) FILTER (WHERE pc.status='liberada'),0) AS a_pagar,
            COALESCE(SUM(pc.valor) FILTER (WHERE pc.status='paga'),0) AS pago,
            COUNT(pc.id) FILTER (WHERE pc.status <> 'cancelada') AS vendas
       FROM partners
       JOIN customers ON customers.id = partners.customer_id
       LEFT JOIN partner_commissions pc ON pc.partner_id = partners.id
      WHERE ($1::text IS NULL OR partners.status = $1)
      GROUP BY partners.id, customers.id
      ORDER BY partners.created_at DESC`,
    [status || null]
  );
  return rows.map((r) => ({
    ...toPublic(r, rates),
    nome: r.nome, email: r.email, cpf: r.cpf, telefone: r.telefone,
    overrideLoja: r.comissao_loja_pct, overrideCredito: r.comissao_credito_pct,
    aPagar: round2(Number(r.a_pagar)), pago: round2(Number(r.pago)), vendas: Number(r.vendas),
    termos: { versao: r.termos_versao, em: r.termos_aceite_em, ip: r.termos_aceite_ip },
    revisadoPor: r.revisado_por || "",
  }));
}

async function setStatus(id, status, autor, motivo) {
  if (!["ativo", "suspenso", "recusado"].includes(status)) throw err(400, "Status inválido.");
  if (["suspenso", "recusado"].includes(status) && !String(motivo || "").trim()) throw err(400, "Informe o motivo.");
  const now = new Date().toISOString();
  const r = await pool.query(
    "UPDATE partners SET status=$1, motivo=$2, revisado_por=$3, revisado_em=$4, updated_at=$4 WHERE id=$5",
    [status, status === "ativo" ? null : String(motivo).trim(), autor, now, id]
  );
  if (!r.rowCount) throw err(404, "Parceiro não encontrado.");
}

async function setOverrides(id, { loja, credito }) {
  const norm = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  const l = norm(loja);
  const c = norm(credito);
  if ((l !== null && !validPct(l)) || (c !== null && !validPct(c))) throw err(400, `Percentuais devem estar entre 0 e ${MAX_PCT} (ou vazio para usar a regra geral).`);
  const r = await pool.query(
    "UPDATE partners SET comissao_loja_pct=$1, comissao_credito_pct=$2, updated_at=$3 WHERE id=$4",
    [l, c, new Date().toISOString(), id]
  );
  if (!r.rowCount) throw err(404, "Parceiro não encontrado.");
}

async function listCommissions({ status, partnerId } = {}) {
  const { rows } = await pool.query(
    `SELECT pc.*, partners.codigo, partners.pix_tipo, partners.pix_chave, customers.nome AS parceiro_nome
       FROM partner_commissions pc
       JOIN partners ON partners.id = pc.partner_id
       JOIN customers ON customers.id = partners.customer_id
      WHERE ($1::text IS NULL OR pc.status = $1) AND ($2::int IS NULL OR pc.partner_id = $2)
      ORDER BY pc.id DESC LIMIT 500`,
    [status || null, partnerId || null]
  );
  return rows.map((r) => ({
    ...commissionToPublic(r),
    parceiroId: r.partner_id, parceiroNome: r.parceiro_nome, codigo: r.codigo,
    pixTipo: r.pix_tipo, pixChave: r.pix_chave,
  }));
}

async function getCommission(id) {
  const { rows } = await pool.query("SELECT * FROM partner_commissions WHERE id = $1", [id]);
  if (!rows[0]) throw err(404, "Comissão não encontrada.");
  return rows[0];
}

// Ajuste manual do valor (ex.: crédito sem valor de simulação, negociação).
async function adjust(id, { valor, observacao }) {
  const c = await getCommission(id);
  if (!["prevista", "liberada"].includes(c.status)) throw err(409, "Só é possível ajustar comissões previstas ou liberadas.");
  const v = Number(valor);
  if (!Number.isFinite(v) || v < 0) throw err(400, "Valor inválido.");
  if (!String(observacao || "").trim()) throw err(400, "Informe o motivo do ajuste.");
  await pool.query("UPDATE partner_commissions SET valor=$1, observacao=$2, updated_at=$3 WHERE id=$4", [round2(v), String(observacao).trim(), new Date().toISOString(), id]);
}

async function markPaid(id, { pagoEm, comprovanteBuffer, comprovanteTipo, comprovanteNome }) {
  const c = await getCommission(id);
  if (c.status !== "liberada") throw err(409, "Só comissões liberadas podem ser marcadas como pagas.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(pagoEm || ""))) throw err(400, "Informe a data do pagamento.");
  if (!comprovanteBuffer || !comprovanteBuffer.length) throw err(400, "Anexe o comprovante do PIX.");
  if (comprovanteBuffer.length > MAX_COMPROVANTE_BYTES) throw err(413, "Comprovante maior que 4 MB.");
  if (!["image/jpeg", "image/png", "application/pdf"].includes(comprovanteTipo)) throw err(400, "Comprovante deve ser JPG, PNG ou PDF.");
  await pool.query(
    `UPDATE partner_commissions SET status='paga', pago_em=$1, comprovante_dados=$2, comprovante_tipo=$3, comprovante_nome=$4, updated_at=$5 WHERE id=$6`,
    [pagoEm, comprovanteBuffer, comprovanteTipo, String(comprovanteNome || "").slice(0, 120), new Date().toISOString(), id]
  );
}

async function getComprovanteAdmin(id) {
  const { rows } = await pool.query("SELECT comprovante_dados, comprovante_tipo, comprovante_nome FROM partner_commissions WHERE id = $1", [id]);
  const r = rows[0];
  if (!r || !r.comprovante_dados) return null;
  return { data: r.comprovante_dados, tipo: r.comprovante_tipo, nome: r.comprovante_nome };
}

module.exports = {
  TERMOS_VERSAO, MAX_COMPROVANTE_BYTES, PARTNER_STATUS, COMMISSION_STATUS,
  getRates, setRates, getByCustomer, getRowByCustomer, apply,
  resolveAttribution, registerSale, syncStatus,
  summaryForPartner, getComprovanteForPartner,
  listPartners, setStatus, setOverrides, listCommissions, adjust, markPaid, getComprovanteAdmin,
};
