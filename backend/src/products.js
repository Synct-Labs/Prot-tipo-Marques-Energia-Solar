/* =====================================================================
   CATÁLOGO DA LOJA
   ---------------------------------------------------------------------
   Antes um array fixo em app.js, agora fica no Postgres — o admin
   adiciona/remove produto, muda preço e cria promoção pelo painel
   (admin/catalogo.html), sem precisar mexer em código nem fazer deploy.
   Na primeira vez que o servidor sobe com a tabela vazia, semeia o
   catálogo original (ver productSeed.js) pra não perder nada.

   Imagens: cada produto tem até 5 (images_json = lista de strings). Cada
   string é um caminho do site ("assets/products/x.jpg", produtos antigos),
   uma URL completa ou "/api/product-images/<id>" (foto enviada pelo admin,
   guardada em product_images). A primeira da lista é a foto principal.
   ===================================================================== */
const crypto = require("crypto");
const { pool } = require("./db");
const { SEED_PRODUCTS } = require("./productSeed");

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const UPLOADED_IMAGE_RE = /\/api\/product-images\/(\d+)$/;

function err(status, message) { return Object.assign(new Error(message), { statusCode: status }); }

function newProductId(cat) {
  const prefix = String(cat || "prod").slice(0, 4);
  return `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
}

// Produtos antigos só têm a coluna "image" (uma foto); produtos salvos
// depois da galeria têm images_json. Os dois formatos viram a mesma lista.
function imagesOfRow(row) {
  if (row.images_json) {
    try {
      const list = JSON.parse(row.images_json);
      if (Array.isArray(list)) return list;
    } catch { /* cai no formato antigo */ }
  }
  return row.image ? [row.image] : [];
}

function normalizeImages(input) {
  if (!Array.isArray(input)) return [];
  const clean = [];
  for (const src of input) {
    const s = String(src || "").trim();
    if (s && !clean.includes(s)) clean.push(s);
  }
  if (clean.length > MAX_IMAGES) throw err(400, `Cada produto aceita no máximo ${MAX_IMAGES} imagens.`);
  return clean;
}

function rowToProduct(row) {
  const images = imagesOfRow(row);
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
    image: images[0] || "",
    images,
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

// Ids das fotos enviadas (product_images) que um produto referencia, nas
// imagens dele e nas fotos dos itens do kit.
function uploadedIdsOf(product) {
  const srcs = [...(product.images || [])];
  for (const item of product.bundleItems || []) srcs.push(item.image);
  const ids = new Set();
  for (const s of srcs) {
    const m = UPLOADED_IMAGE_RE.exec(String(s || ""));
    if (m) ids.add(Number(m[1]));
  }
  return ids;
}

async function deleteImages(ids) {
  if (!ids.length) return;
  await pool.query("DELETE FROM product_images WHERE id = ANY($1::int[])", [ids]);
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

// Aceita "images" (lista) ou, de clientes antigos, "image" (uma só).
function imagesFromPayload(data) {
  return normalizeImages(data.images !== undefined ? data.images : (data.image ? [data.image] : []));
}

async function create(data) {
  const now = new Date().toISOString();
  const productId = String(data.id || "").trim() || newProductId(data.cat);
  const images = imagesFromPayload(data);
  const { rows: maxRows } = await pool.query("SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM products");
  await pool.query(
    `INSERT INTO products
      (product_id, cat, brand, sku, emb_venda, subcategoria, facet_value, name, price, promo_price, promo_label,
       image, images_json, is_launch, power_kw, specs_json, bundle_items_json, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)`,
    [
      productId, data.cat, data.brand || "", data.sku || "", data.embVenda || "", data.subcategoria || "",
      data.facetValue || "", data.name, data.price, data.promoPrice ?? null, data.promoPrice ? (data.promoLabel || "Promoção") : null,
      images[0] || "", JSON.stringify(images), !!data.isLaunch, data.powerKw ?? null,
      JSON.stringify(data.specs || {}), data.bundleItems && data.bundleItems.length ? JSON.stringify(data.bundleItems) : null,
      maxRows[0].next, now,
    ]
  );
  return productId;
}

async function update(productId, data) {
  const now = new Date().toISOString();
  const images = imagesFromPayload(data);
  const before = await getById(productId);
  const result = await pool.query(
    `UPDATE products SET
      cat = $1, brand = $2, sku = $3, emb_venda = $4, subcategoria = $5, facet_value = $6,
      name = $7, price = $8, promo_price = $9, promo_label = $10, image = $11, images_json = $12, is_launch = $13,
      power_kw = $14, specs_json = $15, bundle_items_json = $16, updated_at = $17
     WHERE product_id = $18`,
    [
      data.cat, data.brand || "", data.sku || "", data.embVenda || "", data.subcategoria || "", data.facetValue || "",
      data.name, data.price, data.promoPrice ?? null, data.promoPrice ? (data.promoLabel || "Promoção") : null,
      images[0] || "", JSON.stringify(images), !!data.isLaunch, data.powerKw ?? null,
      JSON.stringify(data.specs || {}), data.bundleItems && data.bundleItems.length ? JSON.stringify(data.bundleItems) : null,
      now, productId,
    ]
  );
  if (result.rowCount > 0 && before) {
    // Foto que saiu do produto (excluída no admin) não precisa continuar ocupando o banco.
    const kept = uploadedIdsOf({ images, bundleItems: data.bundleItems });
    await deleteImages([...uploadedIdsOf(before)].filter((id) => !kept.has(id)));
  }
  return result.rowCount > 0;
}

async function remove(productId) {
  const before = await getById(productId);
  const result = await pool.query("DELETE FROM products WHERE product_id = $1", [productId]);
  if (result.rowCount > 0 && before) await deleteImages([...uploadedIdsOf(before)]);
  return result.rowCount > 0;
}

/* ---------------------- FOTOS ENVIADAS ---------------------- */
async function saveImage({ buffer, mime, nome }) {
  if (!IMAGE_MIMES.includes(mime)) throw err(400, "Use uma imagem JPG, PNG ou WEBP.");
  if (!buffer || !buffer.length) throw err(400, "Anexe uma imagem.");
  if (buffer.length > MAX_IMAGE_BYTES) throw err(413, "Imagem maior que 4 MB.");
  const { rows } = await pool.query(
    "INSERT INTO product_images (mime, nome, dados, created_at) VALUES ($1,$2,$3,$4) RETURNING id",
    [mime, String(nome || "imagem").slice(0, 160), buffer, new Date().toISOString()]
  );
  return rows[0].id;
}

async function getImage(id) {
  const { rows } = await pool.query("SELECT mime, nome, dados FROM product_images WHERE id = $1", [id]);
  if (!rows[0]) return null;
  return { tipo: rows[0].mime, nome: rows[0].nome, data: rows[0].dados };
}

// Foto enviada mas que nunca chegou a ser salva num produto (formulário
// fechado/cancelado depois do upload). Só apaga as com mais de 1 dia pra
// não pegar uma que o admin acabou de enviar e ainda não salvou.
async function purgeOrphanImages() {
  const { rows } = await pool.query("SELECT product_id, image, images_json, bundle_items_json FROM products");
  const referenced = new Set();
  for (const row of rows) {
    const bundleItems = row.bundle_items_json ? JSON.parse(row.bundle_items_json) : [];
    for (const id of uploadedIdsOf({ images: imagesOfRow(row), bundleItems })) referenced.add(id);
  }
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const result = await pool.query(
    "DELETE FROM product_images WHERE created_at < $1 AND NOT (id = ANY($2::int[]))",
    [cutoff, [...referenced]]
  );
  if (result.rowCount) console.log(`[products] ${result.rowCount} foto(s) órfã(s) removida(s).`);
}

module.exports = {
  MAX_IMAGES, MAX_IMAGE_BYTES, IMAGE_MIMES,
  listAll, getById, create, update, remove, seedIfEmpty,
  saveImage, getImage, purgeOrphanImages,
};
