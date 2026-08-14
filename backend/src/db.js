/* =====================================================================
   BANCO DE DADOS (SQLite embutido do Node — sem dependências externas)
   ---------------------------------------------------------------------
   Usa o módulo nativo `node:sqlite` (disponível a partir do Node 22.5+).
   Não é necessário instalar nenhum pacote para o banco funcionar.
   ===================================================================== */
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "mes.db");
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    admin_id    INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number         TEXT UNIQUE NOT NULL,
    status               TEXT NOT NULL DEFAULT 'novo',
    customer_nome        TEXT NOT NULL,
    customer_cpf         TEXT NOT NULL,
    customer_email       TEXT NOT NULL,
    customer_telefone    TEXT NOT NULL,
    endereco_cep         TEXT,
    endereco_cidade      TEXT,
    endereco_estado      TEXT,
    endereco_rua         TEXT,
    endereco_numero      TEXT,
    endereco_bairro      TEXT,
    endereco_complemento TEXT,
    pagamento            TEXT,
    itens_json           TEXT NOT NULL,
    subtotal             REAL NOT NULL,
    total                REAL NOT NULL,
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credit_leads (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_number         TEXT UNIQUE NOT NULL,
    status              TEXT NOT NULL DEFAULT 'novo',
    modalidade_interesse TEXT,

    -- dados básicos
    nome                TEXT NOT NULL,
    cpf                 TEXT NOT NULL,
    data_nascimento     TEXT NOT NULL,
    estado_civil        TEXT,
    telefone            TEXT NOT NULL,
    email               TEXT NOT NULL,
    cidade_uf           TEXT NOT NULL,

    -- dados profissionais
    profissao           TEXT NOT NULL,
    tipo_vinculo        TEXT NOT NULL,
    empresa             TEXT NOT NULL,
    tempo_trabalho      TEXT NOT NULL,
    renda_bruta         REAL NOT NULL,
    renda_liquida       REAL NOT NULL,

    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
  );
`);

module.exports = db;
