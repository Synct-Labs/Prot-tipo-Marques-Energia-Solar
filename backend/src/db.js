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
      token        TEXT PRIMARY KEY,
      admin_id     INTEGER NOT NULL REFERENCES admins(id),
      created_at   TEXT NOT NULL,
      expires_at   TEXT NOT NULL,
      -- Atualizado a cada requisição autenticada — usado pra derrubar a
      -- sessão por inatividade (timeout), separado do expires_at absoluto.
      last_seen_at TEXT
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

    -- Compra Programada (ex-Consórcio): grupos criados pelo admin, com cotas
    -- limitadas. "visivel_site" libera a contratação direta pelo cliente no
    -- catálogo público; "visivel_parceiro" libera o parceiro ver o grupo e
    -- lançar vendas pra ele. Vagas restantes = cotas_total menos adesões
    -- não canceladas (calculado na consulta, não guardado aqui).
    CREATE TABLE IF NOT EXISTS consorcio_grupos (
      id                      SERIAL PRIMARY KEY,
      nome                    TEXT NOT NULL,
      cotas_total             INTEGER NOT NULL,
      valor_cota              DOUBLE PRECISION NOT NULL,
      prazo_meses             INTEGER NOT NULL,
      taxa_administracao_pct  DOUBLE PRECISION NOT NULL DEFAULT 0,
      regras                  TEXT,
      visivel_site            BOOLEAN NOT NULL DEFAULT false,
      visivel_parceiro        BOOLEAN NOT NULL DEFAULT false,
      encerrado               BOOLEAN NOT NULL DEFAULT false,
      created_at              TEXT NOT NULL,
      updated_at              TEXT NOT NULL
    );

    -- Adesão a um grupo de Compra Programada. "origem" = 'cliente' (o
    -- próprio cliente contratou pelo catálogo do site: nasce
    -- 'aguardando_pagamento') ou 'parceiro' (o parceiro lançou a venda pro
    -- cliente: fica 'aguardando_cliente' até ele entrar e confirmar, e aí
    -- também vai pra 'aguardando_pagamento'). Em ambos, só o admin torna a
    -- adesão 'confirmada', depois de conferir o PIX — e só então a comissão
    -- do parceiro é criada (ver confirmarPagamento em consorcio.js).
    CREATE TABLE IF NOT EXISTS consorcio_adesoes (
      id             SERIAL PRIMARY KEY,
      grupo_id       INTEGER NOT NULL REFERENCES consorcio_grupos(id),
      customer_id    INTEGER REFERENCES customers(id),
      partner_id     INTEGER REFERENCES partners(id),
      origem         TEXT NOT NULL,
      nome           TEXT NOT NULL,
      telefone       TEXT,
      email          TEXT,
      status         TEXT NOT NULL DEFAULT 'aguardando_cliente',
      confirmada_em  TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
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

    -- Pastas do cliente (aba "Pastas", só dono): documentos anexados à mão
    -- pelo admin — além disso, na busca também aparecem (sem duplicar aqui)
    -- os documentos que o cliente já enviou em outras partes do sistema
    -- (KYC, pedidos, contratos), lidos direto das tabelas originais.
    -- Fotos de produto enviadas pelo admin (aba Catálogo): ficam aqui como
    -- BYTEA (mesmo padrão dos documentos) e o produto só guarda a URL
    -- "/api/product-images/<id>" na lista de imagens dele (products.images_json).
    CREATE TABLE IF NOT EXISTS product_images (
      id         SERIAL PRIMARY KEY,
      mime       TEXT NOT NULL,
      nome       TEXT,
      dados      BYTEA NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folder_documents (
      id          SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      categoria   TEXT NOT NULL,
      mime        TEXT NOT NULL,
      nome        TEXT NOT NULL,
      dados       BYTEA NOT NULL,
      autor       TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );
  `);

  // Colunas novas em bancos que já existiam antes desta versão (o
  // CREATE TABLE IF NOT EXISTS acima não altera tabelas já criadas).
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS images_json TEXT;
    -- Novos status da análise de crédito (novo, em_analise, aprovado, digitado,
    -- pendenciado, pago, recusado): converte os antigos. Idempotente — depois
    -- da 1ª vez não sobra nenhuma linha com esses valores.
    UPDATE credit_leads SET status = CASE status
        WHEN 'contatado' THEN 'em_analise'
        WHEN 'proposta_enviada' THEN 'digitado'
        WHEN 'convertido' THEN 'pago'
      END
      WHERE status IN ('contatado', 'proposta_enviada', 'convertido');
    -- QR code de pagamento da cota do grupo (Compra Programada): enviado pelo
    -- admin, mostrado só pro cliente que contratou o grupo (ver consorcio.js).
    ALTER TABLE consorcio_grupos ADD COLUMN IF NOT EXISTS qr_dados BYTEA;
    ALTER TABLE consorcio_grupos ADD COLUMN IF NOT EXISTS qr_tipo TEXT;
    ALTER TABLE consorcio_grupos ADD COLUMN IF NOT EXISTS qr_nome TEXT;
    -- PIX "copia e cola" (ou link de pagamento) do grupo: o cliente copia pelo
    -- botão do card de pagamento. Mesmo acesso do QR code (só dono da adesão).
    ALTER TABLE consorcio_grupos ADD COLUMN IF NOT EXISTS pix_copia_cola TEXT;
    -- Comprovante de pagamento da cota, anexado pelo cliente no card de
    -- pagamento (Marques Pay) — o admin vê na hora de confirmar o PIX.
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS comprovante_dados BYTEA;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS comprovante_tipo TEXT;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS comprovante_em TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS sim_valor_sistema DOUBLE PRECISION;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS sim_parcelas INTEGER;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS sim_fgts_disponivel DOUBLE PRECISION;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS sim_parcela_estimada DOUBLE PRECISION;

    -- Endereço: só é obrigatório no formulário pras modalidades CLT e
    -- Financiamento Solar (análise de crédito / instalação do sistema),
    -- mas a coluna fica opcional pra não quebrar leads antigos/outras modalidades.
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS endereco_cep TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS endereco_cidade TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS endereco_estado TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS endereco_rua TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS endereco_numero TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS endereco_bairro TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS endereco_complemento TEXT;

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

    ALTER TABLE profit_share_contracts ADD COLUMN IF NOT EXISTS valor_investido DOUBLE PRECISION;
    ALTER TABLE profit_share_contracts ADD COLUMN IF NOT EXISTS visivel_cliente BOOLEAN NOT NULL DEFAULT true;

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

    ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS adesao_id INTEGER UNIQUE REFERENCES consorcio_adesoes(id);
    ALTER TABLE partners ADD COLUMN IF NOT EXISTS comissao_consorcio_pct DOUBLE PRECISION;

    -- Anexo do contrato assinado (PDF/imagem), opcional, pra pedido da loja
    -- e solicitação de crédito — aparece na aba "Meus Contratos" do cliente.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS contrato_dados BYTEA;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS contrato_tipo TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS contrato_nome TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS contrato_dados BYTEA;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS contrato_tipo TEXT;
    ALTER TABLE credit_leads ADD COLUMN IF NOT EXISTS contrato_nome TEXT;

    -- Anexo do contrato assinado (PDF/imagem), opcional, pra empréstimo e
    -- participação nos lucros — guardado direto no Postgres, sem storage
    -- externo, mesmo padrão do comprovante de pagamento.
    ALTER TABLE loan_contracts ADD COLUMN IF NOT EXISTS contrato_dados BYTEA;
    ALTER TABLE loan_contracts ADD COLUMN IF NOT EXISTS contrato_tipo TEXT;
    ALTER TABLE loan_contracts ADD COLUMN IF NOT EXISTS contrato_nome TEXT;
    ALTER TABLE profit_share_contracts ADD COLUMN IF NOT EXISTS contrato_dados BYTEA;
    ALTER TABLE profit_share_contracts ADD COLUMN IF NOT EXISTS contrato_tipo TEXT;
    ALTER TABLE profit_share_contracts ADD COLUMN IF NOT EXISTS contrato_nome TEXT;

    -- Saldo do Marques Pay: por enquanto é lançado manualmente pelo admin
    -- (representativo, até a integração de verdade com o banco parceiro
    -- ficar pronta) — mesmo espírito de ledger dos repasses de participação
    -- nos lucros: soma dos lançamentos, nunca um número solto editável.
    CREATE TABLE IF NOT EXISTS pay_balance_entries (
      id          SERIAL PRIMARY KEY,
      account_id  INTEGER NOT NULL REFERENCES pay_accounts(id),
      valor       DOUBLE PRECISION NOT NULL,
      descricao   TEXT NOT NULL,
      autor       TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    -- Verificação em duas etapas obrigatória do admin: sessão derruba se
    -- ficar inativa (ver ADMIN_IDLE_TIMEOUT_MINUTES em config.js).
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TEXT;

    -- Mesma regra de sessão do admin (timeout por inatividade), agora
    -- também pra cliente — ver CUSTOMER_IDLE_TIMEOUT_MINUTES em config.js.
    ALTER TABLE customer_sessions ADD COLUMN IF NOT EXISTS last_seen_at TEXT;

    -- Comprovante de endereço e documento com foto: obrigatórios em todo
    -- pedido da loja (comprado pelo próprio cliente ou por um parceiro em
    -- nome dele, na "compra assistida") — mesmo padrão de anexo binário
    -- direto no Postgres já usado pro contrato/comprovante.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS doc_endereco_dados BYTEA;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS doc_endereco_tipo TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS doc_endereco_nome TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS doc_foto_dados BYTEA;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS doc_foto_tipo TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS doc_foto_nome TEXT;

    -- Link de pagamento (ou boleto): o admin lança e o sistema avisa por
    -- e-mail quem repassa pro cliente — o parceiro, na compra assistida ou
    -- venda indicada, ou o próprio cliente quando comprou direto.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_link TEXT;
    -- Pendência: o admin sinaliza um problema (ex: comprovante de endereço
    -- ilegível) com uma observação livre; um pedido tem no máximo uma
    -- pendência aberta por vez (vira NULL de novo quando resolvida).
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendencia_texto TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendencia_criada_em TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendencia_autor TEXT;
    -- Resposta do parceiro (ou do cliente, se comprou direto) à pendência:
    -- anexo obrigatório com o documento corrigido + observação opcional.
    -- Limpa junto quando a pendência é resolvida (ver clearPendencia).
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendencia_resposta_dados BYTEA;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendencia_resposta_tipo TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendencia_resposta_nome TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendencia_resposta_texto TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pendencia_resposta_em TEXT;

    -- Compra Programada: contratar direto pelo catálogo deixou de confirmar
    -- a cota na hora — agora exige CPF + comprovante de endereço + documento
    -- com foto (mesmo padrão do checkout da loja), fica "aguardando_pagamento"
    -- até o admin lançar o link de pagamento/PIX e confirmar que caiu.
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS cpf TEXT;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS doc_endereco_dados BYTEA;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS doc_endereco_tipo TEXT;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS doc_endereco_nome TEXT;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS doc_foto_dados BYTEA;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS doc_foto_tipo TEXT;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS doc_foto_nome TEXT;
    ALTER TABLE consorcio_adesoes ADD COLUMN IF NOT EXISTS payment_link TEXT;

    -- E-mails do dono/equipe que recebem aviso de evento novo (pedido,
    -- solicitação de crédito, solicitação de análise de conta Marques Pay).
    -- Configurável pelo próprio admin (aba "Notificações", só dono).
    -- Textos do site editáveis pelo admin (hoje: descrição da Compra
    -- Programada). Chave/valor simples; sem linha = usa o texto padrão do site.
    CREATE TABLE IF NOT EXISTS site_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS notification_emails (
      id         SERIAL PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    -- "Esqueci minha senha": token de uso único enviado por e-mail, mesma
    -- tabela pra admin e cliente (kind + account_id decide qual conta),
    -- já que os dois fluxos são idênticos (ver auth.js/customers.js).
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token      TEXT PRIMARY KEY,
      kind       TEXT NOT NULL, -- 'admin' ou 'customer'
      account_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at    TEXT
    );

    -- Telefone do funcionário (WhatsApp do técnico de instalação).
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone TEXT;

    -- ORDENS DE SERVIÇO (instalação). Uma OS por pedido (order_id UNIQUE), gerada
    -- quando a venda é confirmada. kit_json e os dados do cliente/endereço são
    -- uma FOTO do pedido no momento da geração: a OS não muda se o catálogo mudar.
    -- status: nova | agendada | em_andamento | pendente | concluida | cancelada
    -- technician_id vazio = OS disponível (qualquer técnico pode assumir).
    CREATE TABLE IF NOT EXISTS work_orders (
      id              SERIAL PRIMARY KEY,
      os_number       TEXT UNIQUE NOT NULL,
      order_id        INTEGER UNIQUE NOT NULL REFERENCES orders(id),
      status          TEXT NOT NULL DEFAULT 'nova',
      technician_id   INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      cliente_json    TEXT NOT NULL,
      kit_json        TEXT NOT NULL,
      agendada_para   TEXT,
      reagendamentos  INTEGER NOT NULL DEFAULT 0,
      conclusao_obs   TEXT,
      iniciada_em     TEXT,
      concluida_em    TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_work_orders_tech ON work_orders(technician_id);

    -- Linha do tempo da OS: criação, assunção, agendamento/reagendamento (com
    -- motivo e datas), mudança de status, observações e fotos.
    CREATE TABLE IF NOT EXISTS work_order_events (
      id            SERIAL PRIMARY KEY,
      work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      tipo          TEXT NOT NULL,
      texto         TEXT,
      de_data       TEXT,
      para_data     TEXT,
      autor_id      INTEGER,
      autor_nome    TEXT,
      created_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_work_order_events_os ON work_order_events(work_order_id);

    CREATE TABLE IF NOT EXISTS work_order_photos (
      id            SERIAL PRIMARY KEY,
      work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      categoria     TEXT NOT NULL DEFAULT 'durante', -- antes | durante | depois | problema
      legenda       TEXT,
      dados         BYTEA NOT NULL,
      tipo          TEXT NOT NULL,
      nome          TEXT,
      autor_id      INTEGER,
      autor_nome    TEXT,
      created_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_work_order_photos_os ON work_order_photos(work_order_id);
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
