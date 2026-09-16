/* =====================================================================
   CATÁLOGO DA LOJA
   ---------------------------------------------------------------------
   Antes um array fixo em app.js, agora fica no Postgres — o admin
   adiciona/remove produto, muda preço e cria promoção pelo painel
   (admin/catalogo.html), sem precisar mexer em código nem fazer deploy.
   Na primeira vez que o servidor sobe com a tabela vazia, semeia o
   catálogo original (ver productSeed.js) pra não perder nada.
   ===================================================================== */
const crypto = require("crypto");
const { pool } = require("./db");
const { SEED_PRODUCTS } = require("./productSeed");

function newProductId(cat) {
  const prefix = String(cat || "prod").slice(0, 4);
  return `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
}

function rowToProduct(row) {
  const p = {
    id: row.product_id,
    cat: row.cat,
    brand: row.brand || "",
    sku: row.sku || "",
    embVenda: row.emb_venda || "",
    subcategoria: row.subcategoria || "",
    facetValue: row.facet_value || "",
    name: row.name,
    price: row.price,
    image: row.image || "",
    specs: JSON.parse(row.specs_json || "{}"),
    isLaunch: !!row.is_launch,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.promo_price !== null && row.promo_price !== undefined) {
    p.promoPrice = row.promo_price;
    p.promoLabel = row.promo_label || "Promoção";
  }
  if (row.power_kw !== null && row.power_kw !== undefined) p.powerKw = row.power_kw;
  if (row.bundle_items_json) p.bundleItems = JSON.parse(row.bundle_items_json);
  return p;
}

async function seedIfEmpty() {
  const { rows } = await pool.query("SELECT COUNT(*)::int as c FROM products");
  if (rows[0].c > 0) return;

  const now = new Date().toISOString();
  for (let i = 0; i < SEED_PRODUCTS.length; i++) {
    const p = SEED_PRODUCTS[i];
    await pool.query(
      `INSERT INTO products
        (product_id, cat, brand, sku, emb_venda, subcategoria, facet_value, name, price, image,
         is_launch, power_kw, specs_json, bundle_items_json, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)`,
      [
        p.id, p.cat, p.brand || "", p.sku || "", p.embVenda || "", p.subcategoria || "", p.facetValue || "",
        p.name, p.price, p.image || "", !!p.isLaunch, p.powerKw ?? null,
        JSON.stringify(p.specs || {}), p.bundleItems ? JSON.stringify(p.bundleItems) : null,
        i, now,
      ]
    );
  }
  console.log(`[products] catálogo semeado com ${SEED_PRODUCTS.length} produtos.`);
}

async function listAll() {
  const { rows } = await pool.query("SELECT * FROM products ORDER BY sort_order ASC, id ASC");
  return rows.map(rowToProduct);
}

async function getById(productId) {
  const { rows } = await pool.query("SELECT * FROM products WHERE product_id = $1", [productId]);
  return rows[0] ? rowToProduct(rows[0]) : null;
}

async function create(data) {
  const now = new Date().toISOString();
  const productId = String(data.id || "").trim() || newProductId(data.cat);
  const { rows: maxRows } = await pool.query("SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM products");
  await pool.query(
    `INSERT INTO products
      (product_id, cat, brand, sku, emb_venda, subcategoria, facet_value, name, price, promo_price, promo_label,
       image, is_launch, power_kw, specs_json, bundle_items_json, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)`,
    [
      productId, data.cat, data.brand || "", data.sku || "", data.embVenda || "", data.subcategoria || "",
      data.facetValue || "", data.name, data.price, data.promoPrice ?? null, data.promoPrice ? (data.promoLabel || "Promoção") : null,
      data.image || "", !!data.isLaunch, data.powerKw ?? null,
      JSON.stringify(data.specs || {}), data.bundleItems && data.bundleItems.length ? JSON.stringify(data.bundleItems) : null,
      maxRows[0].next, now,
    ]
  );
  return productId;
}

async function update(productId, data) {
  const now = new Date().toISOString();
  const result = await pool.query(
    `UPDATE products SET
      cat = $1, brand = $2, sku = $3, emb_venda = $4, subcategoria = $5, facet_value = $6,
      name = $7, price = $8, promo_price = $9, promo_label = $10, image = $11, is_launch = $12,
      power_kw = $13, specs_json = $14, bundle_items_json = $15, updated_at = $16
     WHERE product_id = $17`,
    [
      data.cat, data.brand || "", data.sku || "", data.embVenda || "", data.subcategoria || "", data.facetValue || "",
      data.name, data.price, data.promoPrice ?? null, data.promoPrice ? (data.promoLabel || "Promoção") : null,
      data.image || "", !!data.isLaunch, data.powerKw ?? null,
      JSON.stringify(data.specs || {}), data.bundleItems && data.bundleItems.length ? JSON.stringify(data.bundleItems) : null,
      now, productId,
    ]
  );
  return result.rowCount > 0;
}

async function remove(productId) {
  const result = await pool.query("DELETE FROM products WHERE product_id = $1", [productId]);
  return result.rowCount > 0;
}

module.exports = { listAll, getById, create, update, remove, seedIfEmpty };
