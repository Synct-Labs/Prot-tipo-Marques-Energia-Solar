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
      -- endereço salvo pra pré-preencher o checkout nas próximas compras
      -- (ver saveAddress em customers.js) — opcional, só existe depois que
      -- a pessoa finaliza o primeiro pedido.
      endereco_cep            TEXT,
      endereco_cidade         TEXT,
      endereco_estado         TEXT,
      endereco_rua            TEXT,
      endereco_numero         TEXT,
      endereco_bairro         TEXT,
      endereco_complemento    TEXT,
      -- verificação em duas etapas: por app autenticador (TOTP) ou por
      -- código enviado por e-mail — 'app' ou 'email' em two_factor_method
      two_factor_enabled      BOOLEAN NOT NULL DEFAULT false,
      two_factor_method       TEXT,
      two_factor_secret       TEXT,
      two_factor_backup_codes TEXT,
      created_at              TEXT NOT NULL,
      updated_at              TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pay_accounts (
      id               SERIAL PRIMARY KEY,
      customer_id      INTEGER UNIQUE NOT NULL REFERENCES customers(id),
      numero_conta     TEXT UNIQUE NOT NULL,
      agencia          TEXT NOT NULL DEFAULT '0001',
      status           TEXT NOT NULL DEFAULT 'ativa',
      aceite_termos_em TEXT NOT NULL,
      created_at       TEXT NOT NULL
    );

    -- Cadastro completo (KYC) exigido para abrir a conta Marques Pay. É o
    -- mesmo conjunto de dados que um parceiro bancário (BaaS) pede; quando
    -- o parceiro existir, partner_name/partner_ref ligam este registro ao
    -- titular criado lá.
    CREATE TABLE IF NOT EXISTS pay_kyc (
      id                 SERIAL PRIMARY KEY,
      customer_id        INTEGER UNIQUE NOT NULL REFERENCES customers(id),
      status             TEXT NOT NULL DEFAULT 'rascunho',
      nome_completo      TEXT,
      cpf                TEXT,
      data_nascimento    TEXT,
      nome_mae           TEXT,
      nome_pai           TEXT,
      nacionalidade      TEXT,
      naturalidade       TEXT,
      estado_civil       TEXT,
      telefone           TEXT,
      doc_tipo           TEXT,
      doc_numero         TEXT,
      doc_orgao          TEXT,
      doc_uf             TEXT,
      doc_emissao        TEXT,
      ocupacao           TEXT,
      renda_mensal       DOUBLE PRECISION,
      origem_recursos    TEXT,
      finalidade         TEXT,
      pep                BOOLEAN,
      pep_detalhe        TEXT,
      end_cep            TEXT,
      end_rua            TEXT,
      end_numero         TEXT,
      end_complemento    TEXT,
      end_bairro         TEXT,
      end_cidade         TEXT,
      end_uf             TEXT,
      consent_version    TEXT,
      consent_at         TEXT,
      consent_ip         TEXT,
      consent_ua         TEXT,
      motivo_reprovacao  TEXT,
      revisado_por       TEXT,
      revisado_em        TEXT,
      partner_name       TEXT,
      partner_ref        TEXT,
      submitted_at       TEXT,
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pay_kyc_documents (
      id         SERIAL PRIMARY KEY,
      kyc_id     INTEGER NOT NULL REFERENCES pay_kyc(id) ON DELETE CASCADE,
      tipo       TEXT NOT NULL,
      mime       TEXT NOT NULL,
      nome       TEXT,
      dados      BYTEA NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (kyc_id, tipo)
    );

    -- Trilha de auditoria: quem fez o quê no cadastro (envio, aprovação,
    -- reprovação, visualização de documento por um administrador).
    CREATE TABLE IF NOT EXISTS pay_kyc_events (
      id         SERIAL PRIMARY KEY,
      kyc_id     INTEGER NOT NULL REFERENCES pay_kyc(id) ON DELETE CASCADE,
      evento     TEXT NOT NULL,
      autor      TEXT NOT NULL,
      detalhe    TEXT,
      created_at TEXT NOT NULL
    );

    -- Programa de Parceiros: pessoa (com conta de cliente) que indica vendas
    -- da loja e de crédito e ganha comissão. "codigo" é o que vai no link
    -- (?ref=CODIGO). comissao_*_pct nulo = usa a regra geral (app_settings).
    CREATE TABLE IF NOT EXISTS partners (
      id                  SERIAL PRIMARY KEY,
      customer_id         INTEGER UNIQUE NOT NULL REFERENCES customers(id),
      codigo              TEXT UNIQUE NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pendente',
      pix_tipo            TEXT,
      pix_chave           TEXT,
      comissao_loja_pct   DOUBLE PRECISION,
      comissao_credito_pct DOUBLE PRECISION,
      termos_versao       TEXT,
      termos_aceite_em    TEXT,
      termos_aceite_ip    TEXT,
      motivo              TEXT,
      revisado_por        TEXT,
      revisado_em         TEXT,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
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
      parcelas             INTEGER,
      itens_json           TEXT NOT NULL,
      subtotal             DOUBLE PRECISION NOT NULL,
      total                DOUBLE PRECISION NOT NULL,
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );

    -- Catálogo da loja — antes era um array fixo em app.js, agora fica no
    -- banco pra o admin poder adicionar/remover produto, mudar preço e
    -- criar promoção sem precisar mexer em código. "id" mantém os códigos
    -- curtos que já existiam (kit1, pn3, iv2...) porque o carrinho e o
    -- configurador guardam esses ids; produtos novos ganham um id gerado
    -- (ver products.js). specs e bundleItems ficam como JSON em texto.
    CREATE TABLE IF NOT EXISTS products (
      id                SERIAL PRIMARY KEY,
      product_id        TEXT UNIQUE NOT NULL,
      cat               TEXT NOT NULL,
      brand             TEXT,
      sku               TEXT,
      emb_venda         TEXT,
      subcategoria      TEXT,
      facet_value       TEXT,
      name              TEXT NOT NULL,
      price             DOUBLE PRECISION NOT NULL,
      promo_price       DOUBLE PRECISION,
      promo_label       TEXT,
      image             TEXT,
      is_launch         BOOLEAN NOT NULL DEFAULT false,
      power_kw          DOUBLE PRECISION,
      specs_json        TEXT NOT NULL DEFAULT '{}',
      bundle_items_json TEXT,
      sort_order        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
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

    -- Empréstimos/financiamentos contratados com a Marques (ex: Financiamento
    -- Solar, Crédito CLT) — aparece em "Meus Boletos" no Marques Pay. O admin
    -- cadastra o contrato (título, valor da parcela, quantas parcelas) e o
    -- sistema já gera todas as parcelas (loan_installments) de uma vez, com
    -- vencimento mensal a partir da primeira parcela.
    CREATE TABLE IF NOT EXISTS loan_contracts (
      id             SERIAL PRIMARY KEY,
      customer_id    INTEGER NOT NULL REFERENCES customers(id),
      titulo         TEXT NOT NULL,
      valor_parcela  DOUBLE PRECISION NOT NULL,
      total_parcelas INTEGER NOT NULL,
      status         TEXT NOT NULL DEFAULT 'ativo',
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loan_installments (
      id          SERIAL PRIMARY KEY,
      contract_id INTEGER NOT NULL REFERENCES loan_contracts(id),
      numero      INTEGER NOT NULL,
      vencimento  TEXT NOT NULL,
      valor       DOUBLE PRECISION NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pendente',
      pago_em     TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    -- Contrato de participação nos lucros — aparece em "Participação nos
    -- Lucros" no Marques Pay. Diferente do empréstimo, os repasses não têm
    -- data/valor fixos de antemão (dependem do lucro do período), então o
    -- admin lança cada um manualmente conforme o pagamento é feito (por
    -- fora do site), anexando o comprovante.
    CREATE TABLE IF NOT EXISTS profit_share_contracts (
      id              SERIAL PRIMARY KEY,
      customer_id     INTEGER NOT NULL REFERENCES customers(id),
      numero_contrato TEXT NOT NULL,
      percentual      DOUBLE PRECISION NOT NULL,
      periodicidade   TEXT,
      data_inicio     TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'ativo',
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profit_share_payments (
      id                SERIAL PRIMARY KEY,
      contract_id       INTEGER NOT NULL REFERENCES profit_share_contracts(id),
      valor             DOUBLE PRECISION NOT NULL,
      data_pagamento    TEXT NOT NULL,
      observacao        TEXT,
      -- comprovante fica salvo direto no banco (bytea) — sem storage externo,
      -- suficiente pra um recibo/print de comprovante de transferência.
      comprovante_dados BYTEA,
      comprovante_tipo  TEXT,
      comprovante_nome  TEXT,
      created_at        TEXT NOT NULL
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
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS parcelas INTEGER;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);

    ALTER TABLE customers ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS two_factor_method TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;

    ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_cep TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_cidade TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_estado TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_rua TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_numero TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_bairro TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_complemento TEXT;

    ALTER TABLE pay_kyc ADD COLUMN IF NOT EXISTS pep_relacao TEXT;
    ALTER TABLE pay_kyc ADD COLUMN IF NOT EXISTS pep_cargo TEXT;
    ALTER TABLE pay_kyc ADD COLUMN IF NOT EXISTS pep_orgao TEXT;
    ALTER TABLE pay_kyc ADD COLUMN IF NOT EXISTS pep_periodo TEXT;
    ALTER TABLE pay_kyc ADD COLUMN IF NOT EXISTS pep_nome TEXT;
    ALTER TABLE pay_kyc ADD COLUMN IF NOT EXISTS pep_cpf TEXT;
    ALTER TABLE pay_kyc ADD COLUMN IF NOT EXISTS pep_grau TEXT;

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id);
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id);

    -- Uma comissão por venda indicada (pedido da loja ou solicitação de
    -- crédito). prevista -> liberada (pedido entregue / crédito convertido)
    -- -> paga (admin lança o PIX com comprovante) ou cancelada.
    CREATE TABLE IF NOT EXISTS partner_commissions (
      id               SERIAL PRIMARY KEY,
      partner_id       INTEGER NOT NULL REFERENCES partners(id),
      tipo             TEXT NOT NULL,
      order_id         INTEGER UNIQUE REFERENCES orders(id),
      lead_id          INTEGER UNIQUE REFERENCES credit_leads(id),
      referencia       TEXT NOT NULL,
      base_valor       DOUBLE PRECISION NOT NULL DEFAULT 0,
      percentual       DOUBLE PRECISION NOT NULL DEFAULT 0,
      valor            DOUBLE PRECISION NOT NULL DEFAULT 0,
      status           TEXT NOT NULL DEFAULT 'prevista',
      observacao       TEXT,
      pago_em          TEXT,
      comprovante_dados BYTEA,
      comprovante_tipo  TEXT,
      comprovante_nome  TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );

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
