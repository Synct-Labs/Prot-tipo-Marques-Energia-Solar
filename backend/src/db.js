/* =====================================================================
   BANCO DE DADOS (Postgres, Supabase)
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
      -- company: qual empresa esse funcionário enxerga no painel.
      -- 'energia_solar' -> só pedidos da loja | 'promotora' -> só solicitações
      -- de crédito | 'ambas' -> as duas (dono/admin geral).
      company       TEXT NOT NULL DEFAULT 'ambas',
      -- role: 'owner' pode gerenciar a equipe; 'funcionario' só usa o painel.
      role          TEXT NOT NULL DEFAULT 'funcionario',
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT PRIMARY KEY,
      admin_id    INTEGER NOT NULL REFERENCES admins(id),
      created_at  TEXT NOT NULL,
      expires_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id                      SERIAL PRIMARY KEY,
      email                   TEXT UNIQUE NOT NULL,
      password_hash           TEXT NOT NULL,
      nome                    TEXT NOT NULL,
      cpf                     TEXT,
      telefone                TEXT,
      -- verificação em duas etapas (TOTP, tipo Google Authenticator)
      two_factor_enabled      BOOLEAN NOT NULL DEFAULT false,
      two_factor_secret       TEXT,
      two_factor_backup_codes TEXT,
      created_at              TEXT NOT NULL,
      updated_at              TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_sessions (
      token       TEXT PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
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

      -- dados da simulação (preenchidos no Passo 2, antes do formulário)
      sim_valor_sistema     DOUBLE PRECISION,
      sim_parcelas          INTEGER,
      sim_fgts_disponivel   DOUBLE PRECISION,
      sim_parcela_estimada  DOUBLE PRECISION,

      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );
  `);

  // Colunas novas em bancos que já existiam antes desta versão (o
  // CREATE TABLE IF NOT EXISTS acima não altera tabelas já criadas).
  await pool.query(`
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS sim_valor_sistema DOUBLE PRECISION;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS sim_parcelas INTEGER;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS sim_fgts_disponivel DOUBLE PRECISION;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS sim_parcela_estimada DOUBLE PRECISION;

    ALTER TABLE admins ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT 'ambas';
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'funcionario';

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);

    ALTER TABLE customers ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;
  `);

  // Garante que sempre exista pelo menos um "owner" (dono/admin geral que
  // enxerga as duas empresas) — promove a conta mais antiga se nenhuma
  // ainda tiver esse papel (cobre bancos que já tinham só o admin único).
  await pool.query(`
    UPDATE admins SET role = 'owner', company = 'ambas'
    WHERE id = (SELECT id FROM admins ORDER BY id ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM admins WHERE role = 'owner')
  `);
}

module.exports = { pool, initSchema };
