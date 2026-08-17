/* =====================================================================
   BANCO DE DADOS (Postgres — Supabase)
   ---------------------------------------------------------------------
   Usa o pacote "pg" para conectar num Postgres hospedado (Supabase).
   A connection string vem de DATABASE_URL (backend/.env).
   ===================================================================== */
const { Pool } = require("pg");
const config = require("./config");

if (!config.DATABASE_URL) {
  console.error(
    "\n[ERRO] DATABASE_URL não definida.\n" +
    "Copie backend/.env.example para backend/.env e preencha a connection " +
    "string do Postgres (Supabase: Project Settings > Database > Connection string).\n"
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  // Supabase exige TLS; rejectUnauthorized:false evita erro de certificado
  // autoassinado em alguns ambientes (padrão recomendado pelo Supabase
  // para conexões de servidor a servidor).
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("[erro no pool do Postgres]", err);
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT PRIMARY KEY,
      admin_id    INTEGER NOT NULL REFERENCES admins(id),
      created_at  TEXT NOT NULL,
      expires_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                   SERIAL PRIMARY KEY,
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
      subtotal             DOUBLE PRECISION NOT NULL,
      total                DOUBLE PRECISION NOT NULL,
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credit_leads (
      id                   SERIAL PRIMARY KEY,
      lead_number          TEXT UNIQUE NOT NULL,
      status               TEXT NOT NULL DEFAULT 'novo',
      modalidade_interesse TEXT,

      -- dados básicos
      nome                 TEXT NOT NULL,
      cpf                  TEXT NOT NULL,
      data_nascimento      TEXT NOT NULL,
      estado_civil         TEXT,
      telefone             TEXT NOT NULL,
      email                TEXT NOT NULL,
      cidade_uf            TEXT NOT NULL,

      -- dados profissionais
      profissao            TEXT NOT NULL,
      tipo_vinculo         TEXT NOT NULL,
      empresa              TEXT NOT NULL,
      tempo_trabalho       TEXT NOT NULL,
      renda_bruta          DOUBLE PRECISION NOT NULL,
      renda_liquida        DOUBLE PRECISION NOT NULL,

      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );
  `);
}

module.exports = { pool, initSchema };
