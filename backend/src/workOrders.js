/* =====================================================================
   ORDENS DE SERVIÇO (instalação)
   ---------------------------------------------------------------------
   - Uma OS por pedido, gerada automaticamente quando a venda é confirmada
     (server.js chama createFromOrder ao mudar o pedido pra "confirmado").
   - A OS guarda uma FOTO do pedido (cliente, endereço, kit com todos os
     itens/specs): não muda se o catálogo ou o cadastro mudarem depois.
   - OS sem técnico = "disponível": o aviso por WhatsApp vai pra todos os
     técnicos com telefone e o primeiro que assumir fica com ela.
   - Quem pode o quê:
       gestor (dono / Energia Solar): vê e opera tudo, atribui, cancela, reabre.
       técnico (company "instalacao"): vê as disponíveis + as dele, e só
       opera as dele. Não vê CPF, e-mail nem preços.
   ===================================================================== */
const { pool } = require("./db");
const config = require("./config");
const orders = require("./orders");
const products = require("./products");
const whatsapp = require("./whatsapp");
const notifications = require("./notifications");

function err(status, message) { return Object.assign(new Error(message), { statusCode: status }); }

const STATUSES = ["nova", "agendada", "em_andamento", "pendente", "concluida", "cancelada"];
const FINAL_STATUSES = ["concluida", "cancelada"];
const PHOTO_CATEGORIES = ["antes", "durante", "depois", "problema"];
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const MAX_PHOTOS_PER_OS = 60;
const PHOTO_MIMES = ["image/jpeg", "image/png"];
// Só pedidos com equipamento precisam de instalação (um pedido só de cabos,
// por exemplo, não gera OS sozinho; o gestor pode gerar na mão).
const INSTALLABLE_CATS = ["kits", "paineis", "inversores", "baterias", "controlador"];

const nowIso = () => new Date().toISOString();

function ctxOf(admin) {
  const isTech = admin.company === "instalacao";
  return { id: admin.id, nome: admin.name || admin.email, isTech, isManager: !isTech };
}

const parse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------------- FOTO DO PEDIDO (snapshot) ---------------------- */
async function buildKit(order) {
  const itens = [];
  let potenciaKw = 0;
  let installable = false;
  for (const it of order.itens || []) {
    const p = it.id ? await products.getById(it.id) : null;
    if (p && INSTALLABLE_CATS.includes(p.cat)) installable = true;
    const qty = Number(it.qty) || 1;
    if (p && typeof p.powerKw === "number") potenciaKw += p.powerKw * qty;
    itens.push({
      produtoId: it.id || null,
      nome: it.nome,
      marca: it.marca || (p && p.brand) || "",
      qty,
      preco: it.preco,
      cat: p ? p.cat : null,
      sku: p ? p.sku : "",
      embVenda: p ? p.embVenda : "",
      potenciaKw: p && typeof p.powerKw === "number" ? p.powerKw : null,
      specs: p ? p.specs : {},
      componentes: p && p.bundleItems ? p.bundleItems.map((b) => ({ marca: b.brand || "", nome: b.name, sku: b.sku || "", qty: b.qty || 1 })) : [],
    });
  }
  return { installable, kit: { itens, potenciaKw: Math.round(potenciaKw * 100) / 100, total: order.total, pagamento: order.pagamento } };
}

function buildCliente(order) {
  return {
    nome: order.customer.nome,
    cpf: order.customer.cpf,
    email: order.customer.email,
    telefone: order.customer.telefone,
    endereco: { ...order.endereco },
  };
}

/* ---------------------- LINHA DO TEMPO ---------------------- */
async function addEvent(osId, tipo, texto, autor, { de, para } = {}) {
  await pool.query(
    `INSERT INTO work_order_events (work_order_id, tipo, texto, de_data, para_data, autor_id, autor_nome, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [osId, tipo, texto || null, de || null, para || null, autor ? autor.id : null, autor ? autor.nome : "Sistema", nowIso()]
  );
}

/* ---------------------- AVISOS (WhatsApp) ---------------------- */
function osLink(id) { return `${config.PUBLIC_URL}/admin/os.html?id=${id}`; }

async function listTechniciansRaw() {
  const { rows } = await pool.query(
    "SELECT id, name, email, phone FROM admins WHERE company = 'instalacao' ORDER BY name ASC, id ASC"
  );
  return rows;
}

async function notifyNewOs(os) {
  const techs = (await listTechniciansRaw()).filter((t) => whatsapp.normalizePhone(t.phone));
  if (!techs.length) {
    await addEvent(os.id, "whatsapp", "Nenhum técnico com telefone cadastrado: aviso por WhatsApp não enviado.", null);
    return;
  }
  const end = os.cliente.endereco || {};
  const local = [end.bairro, [end.cidade, end.estado].filter(Boolean).join("/")].filter(Boolean).join(", ");
  const kitNome = (os.kit.itens[0] ? os.kit.itens[0].nome : "Kit") +
    (os.kit.itens.length > 1 ? ` (+${os.kit.itens.length - 1} item(ns))` : "");
  const link = osLink(os.id);
  const text =
    `🔧 *Nova OS de instalação ${os.osNumber}*\n${kitNome}\n` +
    (local ? `📍 ${local}\n` : "") +
    `\nAbra o painel para assumir e agendar com o cliente:\n${link}`;
  const params = [os.osNumber, kitNome, local || "não informado", link];
  const results = await Promise.all(techs.map((t) => whatsapp.notify(t.phone, "nova_os", params, text)));
  const ok = results.filter((r) => r.ok).length;
  const skipped = results.some((r) => r.skipped);
  const firstError = results.find((r) => !r.ok && !r.skipped);
  await addEvent(
    os.id,
    "whatsapp",
    skipped
      ? "WhatsApp ainda não configurado no servidor: aviso não enviado."
      : `Aviso por WhatsApp enviado para ${ok} de ${techs.length} técnico(s).${firstError ? ` Falha: ${firstError.error}` : ""}`,
    null
  );
}

async function notifyTech(technicianId, kind, params, text) {
  const { rows } = await pool.query("SELECT phone FROM admins WHERE id = $1", [technicianId]);
  if (rows[0] && rows[0].phone) await whatsapp.notify(rows[0].phone, kind, params, text);
}

/* ---------------------- LEITURA ---------------------- */
function techOf(row) {
  return row.technician_id ? { id: row.technician_id, nome: row.tech_name || row.tech_email || "Técnico", telefone: row.tech_phone || "" } : null;
}

const SELECT_OS = `
  SELECT w.*, o.order_number, a.name AS tech_name, a.email AS tech_email, a.phone AS tech_phone
  FROM work_orders w
  JOIN orders o ON o.id = w.order_id
  LEFT JOIN admins a ON a.id = w.technician_id`;

function rowToSummary(row, ctx) {
  const cliente = parse(row.cliente_json, {});
  const kit = parse(row.kit_json, { itens: [] });
  const first = kit.itens[0];
  return {
    id: row.id,
    osNumber: row.os_number,
    orderId: row.order_id,
    orderNumber: row.order_number,
    status: row.status,
    technician: techOf(row),
    disponivel: !row.technician_id && !FINAL_STATUSES.includes(row.status),
    clienteNome: cliente.nome,
    cidade: cliente.endereco ? cliente.endereco.cidade : "",
    bairro: cliente.endereco ? cliente.endereco.bairro : "",
    kitResumo: first ? first.nome + (kit.itens.length > 1 ? ` (+${kit.itens.length - 1})` : "") : "",
    potenciaKw: kit.potenciaKw || null,
    agendadaPara: row.agendada_para,
    reagendamentos: row.reagendamentos,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    minha: ctx ? row.technician_id === ctx.id : false,
  };
}

function canSee(row, ctx) {
  if (ctx.isManager) return true;
  return row.technician_id === ctx.id || row.technician_id == null;
}

async function list(ctx, { status, q, escopo, tecnico } = {}) {
  const where = [];
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };

  if (ctx.isTech) {
    const me = add(ctx.id);
    where.push(`(w.technician_id = ${me} OR w.technician_id IS NULL)`);
    where.push("w.status <> 'cancelada'");
    if (escopo === "minhas") where.push(`w.technician_id = ${me}`);
    if (escopo === "disponiveis") where.push("w.technician_id IS NULL");
  } else {
    if (escopo === "disponiveis") where.push("w.technician_id IS NULL");
    if (tecnico && /^\d+$/.test(String(tecnico))) where.push(`w.technician_id = ${add(parseInt(tecnico, 10))}`);
  }
  if (status && STATUSES.includes(status)) where.push(`w.status = ${add(status)}`);
  if (q) {
    const like = add(`%${String(q).trim()}%`);
    where.push(
      `(w.os_number ILIKE ${like} OR o.order_number ILIKE ${like}
        OR (w.cliente_json::jsonb->>'nome') ILIKE ${like}
        OR (w.cliente_json::jsonb->'endereco'->>'cidade') ILIKE ${like})`
    );
  }
  const sql = `${SELECT_OS} ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY (w.status IN ('concluida','cancelada')) ASC, w.agendada_para ASC NULLS LAST, w.id DESC`;
  const { rows } = await pool.query(sql, params);
  return rows.map((r) => rowToSummary(r, ctx));
}

async function counts(ctx) {
  const items = await list(ctx);
  const c = { total: items.length, disponiveis: 0 };
  STATUSES.forEach((s) => (c[s] = 0));
  items.forEach((i) => { c[i.status] += 1; if (i.disponivel) c.disponiveis += 1; });
  return c;
}

async function getRow(id) {
  const { rows } = await pool.query(`${SELECT_OS} WHERE w.id = $1`, [id]);
  return rows[0] || null;
}

async function get(id, ctx) {
  const row = await getRow(id);
  if (!row || !canSee(row, ctx)) throw err(404, "OS não encontrada.");
  const cliente = parse(row.cliente_json, {});
  const kit = parse(row.kit_json, { itens: [] });

  // Técnico não precisa de CPF, e-mail nem valores.
  if (ctx.isTech) {
    delete cliente.cpf;
    delete cliente.email;
    delete kit.total;
    delete kit.pagamento;
    kit.itens.forEach((i) => delete i.preco);
  }
  const e = cliente.endereco || {};
  const linhaEndereco = [[e.rua, e.numero].filter(Boolean).join(", "), e.complemento, e.bairro, [e.cidade, e.estado].filter(Boolean).join("/"), e.cep && `CEP ${e.cep}`]
    .filter(Boolean).join(" - ");
  cliente.enderecoTexto = linhaEndereco;
  cliente.mapsUrl = linhaEndereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(linhaEndereco)}` : "";

  const ev = await pool.query("SELECT * FROM work_order_events WHERE work_order_id = $1 ORDER BY id DESC", [id]);
  const ph = await pool.query(
    "SELECT id, categoria, legenda, tipo, nome, autor_id, autor_nome, created_at FROM work_order_photos WHERE work_order_id = $1 ORDER BY id ASC",
    [id]
  );
  return {
    ...rowToSummary(row, ctx),
    cliente,
    kit,
    conclusaoObs: row.conclusao_obs,
    iniciadaEm: row.iniciada_em,
    concluidaEm: row.concluida_em,
    events: ev.rows.map((x) => ({
      id: x.id, tipo: x.tipo, texto: x.texto, de: x.de_data, para: x.para_data, autor: x.autor_nome, createdAt: x.created_at,
    })),
    photos: ph.rows.map((x) => ({
      id: x.id, categoria: x.categoria, legenda: x.legenda, autor: x.autor_nome, createdAt: x.created_at,
      url: `/api/admin/os/fotos/${x.id}`, minha: x.autor_id === ctx.id,
    })),
    permissoes: {
      podeAssumir: ctx.isTech && !row.technician_id && !FINAL_STATUSES.includes(row.status),
      podeOperar: (ctx.isManager || row.technician_id === ctx.id) && !FINAL_STATUSES.includes(row.status),
      ehGestor: ctx.isManager,
    },
  };
}

async function listTechnicians() {
  const rows = await listTechniciansRaw();
  return rows.map((r) => ({ id: r.id, nome: r.name || r.email, telefone: r.phone || "" }));
}

/* ---------------------- CRIAÇÃO ---------------------- */
async function createFromOrder(orderId, { autor = null, force = false } = {}) {
  const existing = await pool.query("SELECT id FROM work_orders WHERE order_id = $1", [orderId]);
  if (existing.rows[0]) return { id: existing.rows[0].id, created: false };

  const order = await orders.getOrderById(orderId);
  if (!order) throw err(404, "Pedido não encontrado.");
  const { installable, kit } = await buildKit(order);
  if (!installable && !force) return { id: null, created: false, motivo: "Pedido sem equipamento a instalar." };

  const cliente = buildCliente(order);
  const now = nowIso();
  let id;
  try {
    const ins = await pool.query(
      `INSERT INTO work_orders (os_number, order_id, status, cliente_json, kit_json, created_at, updated_at)
       VALUES ($1,$2,'nova',$3,$4,$5,$5) RETURNING id`,
      [`TMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`, orderId, JSON.stringify(cliente), JSON.stringify(kit), now]
    );
    id = ins.rows[0].id;
  } catch (e) {
    if (e.code === "23505") {
      const again = await pool.query("SELECT id FROM work_orders WHERE order_id = $1", [orderId]);
      if (again.rows[0]) return { id: again.rows[0].id, created: false };
    }
    throw e;
  }
  const osNumber = `OS-${String(id).padStart(6, "0")}`;
  await pool.query("UPDATE work_orders SET os_number = $1 WHERE id = $2", [osNumber, id]);
  await addEvent(id, "criada", `OS gerada a partir do pedido ${order.orderNumber}.`, autor);

  // Aviso por WhatsApp sem segurar a resposta de quem confirmou a venda.
  notifyNewOs({ id, osNumber, cliente, kit }).catch((e) => console.error("[os] falha ao avisar técnicos:", e.message));
  return { id, created: true, osNumber };
}

// Pedido cancelado: a OS (se ainda aberta) é cancelada junto.
async function onOrderCancelled(orderId) {
  const { rows } = await pool.query("SELECT id, os_number, technician_id, status FROM work_orders WHERE order_id = $1", [orderId]);
  const os = rows[0];
  if (!os || FINAL_STATUSES.includes(os.status)) return;
  await pool.query("UPDATE work_orders SET status = 'cancelada', updated_at = $1 WHERE id = $2", [nowIso(), os.id]);
  await addEvent(os.id, "status", "OS cancelada porque o pedido foi cancelado.", null);
  if (os.technician_id) {
    notifyTech(os.technician_id, "os_cancelada", [os.os_number, "pedido cancelado"], `❌ A ${os.os_number} foi cancelada (pedido cancelado). Não é mais necessário instalar.`).catch(() => {});
  }
}

/* ---------------------- AÇÕES ---------------------- */
function assertOperable(row, ctx) {
  if (!row || !canSee(row, ctx)) throw err(404, "OS não encontrada.");
  if (ctx.isTech && row.technician_id !== ctx.id) throw err(403, "Assuma a OS antes de mexer nela.");
  if (FINAL_STATUSES.includes(row.status)) throw err(409, "Essa OS já foi encerrada.");
}

async function assumir(id, ctx) {
  const row = await getRow(id);
  if (!row || !canSee(row, ctx)) throw err(404, "OS não encontrada.");
  if (!ctx.isTech) throw err(403, "Gestores atribuem a OS a um técnico.");
  const r = await pool.query(
    "UPDATE work_orders SET technician_id = $1, updated_at = $2 WHERE id = $3 AND technician_id IS NULL AND status NOT IN ('concluida','cancelada')",
    [ctx.id, nowIso(), id]
  );
  if (!r.rowCount) throw err(409, "Outro técnico já assumiu essa OS.");
  await addEvent(id, "assumida", `${ctx.nome} assumiu a OS.`, ctx);
}

async function atribuir(id, technicianId, ctx) {
  if (!ctx.isManager) throw err(403, "Só o gestor atribui técnico.");
  const row = await getRow(id);
  if (!row) throw err(404, "OS não encontrada.");
  if (FINAL_STATUSES.includes(row.status)) throw err(409, "Essa OS já foi encerrada.");
  const { rows } = await pool.query("SELECT id, name, email FROM admins WHERE id = $1 AND company = 'instalacao'", [technicianId]);
  if (!rows[0]) throw err(400, "Técnico não encontrado.");
  await pool.query("UPDATE work_orders SET technician_id = $1, updated_at = $2 WHERE id = $3", [technicianId, nowIso(), id]);
  const nome = rows[0].name || rows[0].email;
  await addEvent(id, "atribuida", `OS atribuída a ${nome} por ${ctx.nome}.`, ctx);
  notifyTech(technicianId, "os_atribuida", [row.os_number, osLink(id)], `🔧 Você recebeu a ${row.os_number}.\nAbra o painel e agende com o cliente:\n${osLink(id)}`).catch(() => {});
}

async function devolver(id, texto, ctx) {
  const row = await getRow(id);
  assertOperable(row, ctx);
  if (!row.technician_id) throw err(409, "Essa OS já está disponível.");
  if (!String(texto || "").trim()) throw err(400, "Explique o motivo de devolver a OS.");
  await pool.query(
    "UPDATE work_orders SET technician_id = NULL, status = 'nova', agendada_para = NULL, updated_at = $1 WHERE id = $2",
    [nowIso(), id]
  );
  await addEvent(id, "devolvida", `OS devolvida: ${String(texto).trim().slice(0, 500)}`, ctx);
  notifyNewOs({ id, osNumber: row.os_number, cliente: parse(row.cliente_json, {}), kit: parse(row.kit_json, { itens: [] }) })
    .catch((e) => console.error("[os] falha ao reavisar técnicos:", e.message));
}

function parseDate(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) throw err(400, "Informe uma data e hora válidas.");
  if (d.getTime() < Date.now() - 60 * 60 * 1000) throw err(400, "Essa data já passou.");
  if (d.getTime() > Date.now() + 2 * 365 * 24 * 3600 * 1000) throw err(400, "Data distante demais.");
  return d.toISOString();
}

// 1º agendamento: só a data. Reagendamento (já havia data): o motivo é
// obrigatório e fica na linha do tempo com a data anterior e a nova.
async function agendar(id, { data, motivo, obs }, ctx) {
  const row = await getRow(id);
  assertOperable(row, ctx);
  if (!row.technician_id) throw err(409, "Atribua ou assuma a OS antes de agendar.");
  const para = parseDate(data);
  const de = row.agendada_para;
  const reagendando = !!de;
  const motivoTxt = String(motivo || "").trim().slice(0, 500);
  if (reagendando && !motivoTxt) throw err(400, "Informe o motivo do reagendamento.");
  if (reagendando && new Date(de).getTime() === new Date(para).getTime()) throw err(400, "Essa já é a data agendada.");
  const novoStatus = ["nova", "pendente"].includes(row.status) ? "agendada" : row.status;
  await pool.query(
    "UPDATE work_orders SET agendada_para = $1, status = $2, reagendamentos = reagendamentos + $3, updated_at = $4 WHERE id = $5",
    [para, novoStatus, reagendando ? 1 : 0, nowIso(), id]
  );
  const extra = String(obs || "").trim().slice(0, 500);
  await addEvent(
    id,
    reagendando ? "reagendada" : "agendada",
    reagendando
      ? `Reagendada. Motivo: ${motivoTxt}${extra ? ` | ${extra}` : ""}`
      : (extra ? `Visita agendada com o cliente. ${extra}` : "Visita agendada com o cliente."),
    ctx,
    { de, para }
  );
}

async function mudarStatus(id, { acao, texto }, ctx) {
  const t = String(texto || "").trim().slice(0, 2000);

  if (acao === "reabrir") {
    if (!ctx.isManager) throw err(403, "Só o gestor reabre uma OS.");
    const row = await getRow(id);
    if (!row) throw err(404, "OS não encontrada.");
    if (!FINAL_STATUSES.includes(row.status)) throw err(409, "Essa OS não está encerrada.");
    await pool.query("UPDATE work_orders SET status = 'pendente', concluida_em = NULL, updated_at = $1 WHERE id = $2", [nowIso(), id]);
    await addEvent(id, "status", `OS reaberta por ${ctx.nome}.${t ? " " + t : ""}`, ctx);
    return;
  }

  const row = await getRow(id);
  assertOperable(row, ctx);

  if (acao === "cancelar") {
    if (!ctx.isManager) throw err(403, "Só o gestor cancela uma OS.");
    if (!t) throw err(400, "Informe o motivo do cancelamento.");
    await pool.query("UPDATE work_orders SET status = 'cancelada', updated_at = $1 WHERE id = $2", [nowIso(), id]);
    await addEvent(id, "status", `OS cancelada: ${t}`, ctx);
    if (row.technician_id) notifyTech(row.technician_id, "os_cancelada", [row.os_number, t], `❌ A ${row.os_number} foi cancelada.\nMotivo: ${t}`).catch(() => {});
    return;
  }

  if (!row.technician_id) throw err(409, "Atribua ou assuma a OS primeiro.");

  if (acao === "iniciar") {
    if (row.status === "em_andamento") throw err(409, "A instalação já está em andamento.");
    await pool.query(
      "UPDATE work_orders SET status = 'em_andamento', iniciada_em = COALESCE(iniciada_em, $1), updated_at = $1 WHERE id = $2",
      [nowIso(), id]
    );
    await addEvent(id, "status", "Instalação iniciada.", ctx);
    return;
  }

  if (acao === "pendenciar") {
    if (!t) throw err(400, "Descreva a pendência (o que está impedindo a instalação).");
    await pool.query("UPDATE work_orders SET status = 'pendente', updated_at = $1 WHERE id = $2", [nowIso(), id]);
    await addEvent(id, "status", `Pendência: ${t}`, ctx);
    return;
  }

  if (acao === "concluir") {
    if (!t) throw err(400, "Escreva o relatório da instalação antes de concluir.");
    const fotos = await pool.query("SELECT COUNT(*)::int AS c FROM work_order_photos WHERE work_order_id = $1", [id]);
    if (!fotos.rows[0].c) throw err(400, "Anexe ao menos uma foto da instalação antes de concluir.");
    const now = nowIso();
    await pool.query(
      "UPDATE work_orders SET status = 'concluida', conclusao_obs = $1, concluida_em = $2, iniciada_em = COALESCE(iniciada_em, $2), updated_at = $2 WHERE id = $3",
      [t, now, id]
    );
    await addEvent(id, "status", `Instalação concluída. ${t}`, ctx);
    notifications.notifyAdmins({
      subject: `${row.os_number} concluída`,
      text: `A ${row.os_number} (pedido ${row.order_number}) foi concluída por ${ctx.nome}.\n\nRelatório: ${t}\n\n${osLink(id)}`,
      html: `<p>A <strong>${row.os_number}</strong> (pedido ${row.order_number}) foi concluída por ${esc(ctx.nome)}.</p><p><strong>Relatório:</strong> ${esc(t)}</p><p><a href="${osLink(id)}">Abrir a OS</a></p>`,
    }).catch(() => {});
    return;
  }

  throw err(400, "Ação inválida.");
}

async function addObs(id, texto, ctx) {
  const row = await getRow(id);
  if (!row || !canSee(row, ctx)) throw err(404, "OS não encontrada.");
  if (ctx.isTech && row.technician_id !== ctx.id) throw err(403, "Assuma a OS antes de mexer nela.");
  if (ctx.isTech && FINAL_STATUSES.includes(row.status)) throw err(409, "Essa OS já foi encerrada.");
  const t = String(texto || "").trim();
  if (!t) throw err(400, "Escreva a observação.");
  await addEvent(id, "observacao", t.slice(0, 2000), ctx);
}

/* ---------------------- FOTOS ---------------------- */
async function addPhoto(id, { buffer, mime, nome, categoria, legenda }, ctx) {
  const row = await getRow(id);
  assertOperable(row, ctx);
  if (!PHOTO_MIMES.includes(mime)) throw err(400, "A foto precisa ser JPG ou PNG.");
  if (!buffer || !buffer.length) throw err(400, "Escolha uma foto.");
  if (buffer.length > MAX_PHOTO_BYTES) throw err(400, "Foto grande demais (máx. 6 MB).");
  const cat = PHOTO_CATEGORIES.includes(categoria) ? categoria : "durante";
  const total = await pool.query("SELECT COUNT(*)::int AS c FROM work_order_photos WHERE work_order_id = $1", [id]);
  if (total.rows[0].c >= MAX_PHOTOS_PER_OS) throw err(400, `Limite de ${MAX_PHOTOS_PER_OS} fotos por OS.`);
  const ins = await pool.query(
    `INSERT INTO work_order_photos (work_order_id, categoria, legenda, dados, tipo, nome, autor_id, autor_nome, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [id, cat, String(legenda || "").trim().slice(0, 200) || null, buffer, mime, String(nome || "foto").slice(0, 120), ctx.id, ctx.nome, nowIso()]
  );
  await pool.query("UPDATE work_orders SET updated_at = $1 WHERE id = $2", [nowIso(), id]);
  await addEvent(id, "foto", `Foto adicionada (${cat})${legenda ? `: ${String(legenda).trim().slice(0, 200)}` : ""}.`, ctx);
  return ins.rows[0].id;
}

async function getPhoto(photoId, ctx) {
  const { rows } = await pool.query(
    `SELECT p.dados, p.tipo, p.nome, w.technician_id
     FROM work_order_photos p JOIN work_orders w ON w.id = p.work_order_id WHERE p.id = $1`,
    [photoId]
  );
  const r = rows[0];
  if (!r || !canSee({ technician_id: r.technician_id }, ctx)) return null;
  return { data: r.dados, tipo: r.tipo, nome: r.nome };
}

async function deletePhoto(photoId, ctx) {
  const { rows } = await pool.query(
    `SELECT p.id, p.work_order_id, p.autor_id, w.technician_id, w.status
     FROM work_order_photos p JOIN work_orders w ON w.id = p.work_order_id WHERE p.id = $1`,
    [photoId]
  );
  const r = rows[0];
  if (!r || !canSee({ technician_id: r.technician_id }, ctx)) throw err(404, "Foto não encontrada.");
  if (ctx.isTech && (r.technician_id !== ctx.id || FINAL_STATUSES.includes(r.status))) throw err(403, "Você não pode remover essa foto.");
  await pool.query("DELETE FROM work_order_photos WHERE id = $1", [photoId]);
  await addEvent(r.work_order_id, "foto", "Foto removida.", ctx);
}

module.exports = {
  STATUSES, PHOTO_CATEGORIES, MAX_PHOTO_BYTES,
  ctxOf, list, counts, get, listTechnicians,
  createFromOrder, onOrderCancelled,
  assumir, atribuir, devolver, agendar, mudarStatus, addObs,
  addPhoto, getPhoto, deletePhoto,
};
