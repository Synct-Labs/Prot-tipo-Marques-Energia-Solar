# Marques Energia Solar — Site + Loja Online

Site em HTML/CSS/JS puro (sem build) da **Marques Energia Solar** (Mato Grosso): simulação de crédito, catálogo/loja e um backend real (Node + Postgres) com painel de administrador. Em produção roda em três partes — GitHub Pages + Render + Supabase — ver "Deploy em produção" abaixo.

> **Status:** infraestrutura de produção no ar (site publicado, backend publicado, banco real). O que ainda falta pra ser 100% real está listado em ["Pendências para produção"](#pendências-para-produção) — o principal é trocar o catálogo de exemplo por produtos/preços reais e decidir a forma de pagamento.

## Como rodar (local, com front e backend juntos)

O site precisa do backend rodando (checkout, solicitação de crédito e login do admin salvam de verdade num banco de dados). Não dá para simplesmente abrir o `index.html` no navegador.

Pré-requisito: **Node.js 18+** e uma **connection string de um Postgres** (recomendado: um projeto gratuito no [Supabase](https://supabase.com) — ver seção "Deploy em produção" abaixo para o passo a passo de criar um).

```bash
cd backend
npm install
copy .env.example .env      # no Windows (ou "cp .env.example .env" no Mac/Linux)
```

Abra o arquivo `backend/.env` e defina pelo menos:
- `DATABASE_URL` — connection string do Postgres (Supabase)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — login inicial do administrador (pode trocar a senha depois pelo próprio painel)

Rodando localmente (front + backend no mesmo domínio), pode deixar `CORS_ORIGIN` em branco.

Depois:

```bash
npm start
```

Isso sobe o site inteiro (as duas páginas + painel + API) em **http://localhost:3000**, com os dados persistidos no Postgres do Supabase.

- Página de Crédito Solar (home): http://localhost:3000
- Loja: http://localhost:3000/loja.html
- Painel de administrador: http://localhost:3000/admin/login.html

## O que tem

O site é dividido em **duas páginas HTML independentes** (não é mais uma SPA única):

### `index.html` — Crédito Solar (página inicial)
- Simulação de crédito em 4 modalidades: Crédito CLT, Saque FGTS, Consórcio de placa solar, Financiamento bancário — todas com valores **ilustrativos**, sem integração real com instituição financeira.
- Se o cliente já usou a calculadora de dimensionamento na loja, a simulação compara a parcela com a conta de luz informada por lá (via `localStorage`, chave `mes_conta_atual`).
- Comunicação de alcance nacional ("comprar no Brasil inteiro") e garantia de 25 anos.
- Botão "Comprar" leva para `loja.html`.

### `loja.html` — Loja (SPA por hash, dentro da própria página)
- Home da loja com identidade visual da marca, calculadora de dimensionamento, propostas de valor, produtos em destaque, depoimentos e FAQ.
- Calculadora de dimensionamento: consumo (kWh ou valor da conta) → potência recomendada em **kWp**, usando a fórmula `consumo (kWh) ÷ 119`; o botão "Montar kit com essa potência" já abre o configurador com a quantidade de painéis sugerida.
- Catálogo com 36 produtos em 7 categorias — **agora vem do banco** (`GET /api/products`), não é mais um array fixo no código: **kits prontos** (9), **painéis solares** (5), **inversores** (6), **cabos e conectores** (6), **parafusos e estrutura** (6, vendida peça a peça — trilho, terminal, parafuso — como o mercado realmente vende), **baterias** (2) e **controlador de carga** (2). Painéis/inversores/baterias/controlador/cabos/estrutura usam preço de um concorrente (Apex Energia Solar, cotado em dezembro/2026) + 30% de margem como referência de mercado até a Marques definir fornecedor próprio; os kits prontos já são orçamento real "chave na mão" da própria Marques. O admin adiciona, remove, edita preço/specs e cria promoção pelo painel — ver "Painel de administrador" abaixo.
- Comparação lado a lado (2–3 produtos da mesma categoria).
- Carrinho funcional (adicionar/remover/qtd/total).
- Configurador "Monte seu Projeto" (wizard guiado de kit completo, com kWp calculado no resumo).
- Checkout completo (dados pessoais, endereço, resumo do pedido) — o pedido é **salvo de verdade** no backend ao finalizar. **Sem gateway de pagamento real.**
- Botão "Crédito Solar" no cabeçalho leva de volta para `index.html`.

### Painel de administrador (`/admin`)
- Login protegido, sem link visível no menu do site — acesso é um ponto discreto (baixa opacidade, sem rótulo "Admin") no rodapé de `index.html`/`loja.html`, que leva pra `admin/login.html`. Continua sendo um link de verdade, só não chama atenção do cliente.
- Aba **Pedidos**: lista com busca/filtro por status, detalhe de cada pedido (cliente, endereço, itens) e atualização de status (novo → confirmado → em preparação → enviado → entregue / cancelado).
- Aba **Solicitações de Crédito**: mesmo padrão, pras solicitações de análise de crédito da Marques Promotora.
- Aba **Marques Pay** (`marques-pay.html`): cadastro de contratos de empréstimo/financiamento (gera as parcelas automaticamente) e de participação nos lucros (lançamento manual de cada repasse, com comprovante) — ver detalhe na seção "Já resolvido nesta rodada" abaixo.
- Aba **Catálogo** (`catalogo.html`): adicionar/editar/excluir produto do catálogo da loja, mudar preço, e criar promoção (preço promocional + rótulo, com o preço normal aparecendo riscado no site) — ver detalhe abaixo.
- Aba **Equipe** (só "dono"): cadastro de funcionários, cada um só enxergando a empresa (`energia_solar`/`promotora`/`ambas`) definida no cadastro — é esse campo que decide quais abas aparecem pra cada um.

### `conta-digital-dashboard.html` — Marques Pay (conta digital)
Prévia do painel desktop da conta digital Marques Pay. A maior parte é protótipo visual (saldo, cartão virtual, extrato geral, metas) — viraria real só com um parceiro bancário (Banking-as-a-Service), fora do escopo deste projeto. As seções **Meus Boletos** e **Participação nos Lucros** são a exceção: dados reais, exigem login (mesma conta da loja/crédito) e são alimentados pelo painel admin.

Design responsivo mobile-first nas duas páginas.

### Handoff entre páginas (calculadora → simulação de crédito)

A calculadora de dimensionamento e o configurador de kit vivem os dois em `loja.html`, então não precisam mais de ponte entre páginas. A única travessia que resta é a inversa: como `index.html` e `loja.html` são documentos HTML separados (recarregam a página ao navegar entre eles), o valor da conta de luz calculado na loja precisa sobreviver à troca pra a simulação de crédito comparar com a parcela. Isso usa o `localStorage` como ponte:

1. Em `app.js`, ao calcular o dimensionamento, o código grava `localStorage.setItem("mes_conta_atual", valor)`.
2. Em `credito.js`, a simulação de crédito lê `localStorage.getItem("mes_conta_atual")` (se existir) e mostra a comparação; caso contrário, convida o cliente a calcular na loja primeiro.

## Backend

- Pasta `backend/`, servidor HTTP em Node puro (módulos nativos: `http`, `crypto`, `fs`, `path`) + o pacote `pg` para falar com o Postgres.
- Banco de dados: **Postgres, hospedado no Supabase** (antes era SQLite local — migrado para permitir hospedar o backend fora do GitHub Pages, ver seção abaixo). O schema é criado automaticamente na primeira execução (`CREATE TABLE IF NOT EXISTS...` em `db.js`).
- Autenticação de administrador: sessão por cookie `HttpOnly` (token opaco guardado no banco, senha com hash `scrypt`). Só existe um administrador por padrão (criado a partir do `.env` na primeira execução); é possível trocar a senha pelo próprio painel.
- CORS: liberado apenas para as origens listadas em `CORS_ORIGIN` (backend/.env) — necessário porque em produção o site (GitHub Pages) e a API (Render) ficam em domínios diferentes.
- Conta de cliente obrigatória: desde a v2, `POST /api/orders` (checkout) e `POST /api/credit-leads` (solicitação de crédito) exigem sessão de cliente logado — sem conta, o site manda pra `conta/entrar.html` antes de deixar comprar ou simular.
- Verificação em duas etapas (2FA) opcional pra clientes:
  - **Ativação sempre por e-mail** — código de 6 dígitos (`backend/src/mailer.js`, via API da [Resend](https://resend.com); ver "Configurar envio de e-mail" abaixo), pra provar que a pessoa tem acesso à caixa de entrada antes de ligar qualquer coisa.
  - Depois de ativa, dá pra **trocar pro app autenticador** (TOTP compatível com Google Authenticator/Authy — `backend/src/totp.js`, implementação própria, sem dependência externa, validada contra o vetor de teste oficial do RFC 6238) em Minha Conta > Segurança, ou voltar pro e-mail quando quiser — cada troca pede confirmação pelo método de destino.
  - 5 códigos de backup de uso único são gerados na ativação, funcionam com qualquer método.
  - WhatsApp não é uma opção: um link `wa.me` só abre uma conversa pra a pessoa mandar mensagem, não permite o servidor mandar uma automática — isso exigiria a API oficial do WhatsApp Business (conta comercial paga, via Meta ou um parceiro tipo Twilio/Zenvia).
- Rotas principais da API:
  - `POST /api/orders` — cria um pedido (usado pelo checkout do site; exige cliente logado).
  - `POST /api/credit-leads` — cria uma solicitação de análise de crédito (usado pelo formulário em `index.html`; exige cliente logado).
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`.
  - `POST /api/customers/register`, `POST /api/customers/login` (retorna `requires2FA` + `method` se a conta tiver 2FA ativo), `POST /api/customers/login/2fa`, `POST /api/customers/logout`, `GET /api/customers/me`, `PATCH /api/customers/me`, `POST /api/customers/change-password`.
  - `POST /api/customers/2fa/setup`, `POST /api/customers/2fa/confirm` (ativação inicial, sempre e-mail), `POST /api/customers/2fa/switch/start`, `POST /api/customers/2fa/switch/confirm` (trocar de método), `POST /api/customers/2fa/disable` — todas protegidas por login de cliente.
  - `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id`, `GET /api/admin/stats` — todas protegidas por login.
  - `GET /api/admin/credit-leads`, `GET /api/admin/credit-leads/:id`, `PATCH /api/admin/credit-leads/:id`, `GET /api/admin/credit-leads/stats` — idem, para as solicitações de crédito.

### Configurar envio de e-mail (2FA por e-mail)

Sem isso configurado, o 2FA por e-mail continua funcionando em **modo de teste**: o código de verificação aparece no log do servidor (terminal, ou "Logs" no painel do Render) em vez de chegar numa caixa de entrada de verdade. Bom pra testar o fluxo; não serve pra cliente real usar.

1. Crie uma conta grátis em [resend.com](https://resend.com) (o plano grátis cobre 100 e-mails/dia, 3.000/mês).
2. No painel da Resend, vá em **API Keys** → **Create API Key** e copie a chave gerada.
3. Em `backend/.env` (local) ou nas variáveis de ambiente do serviço no Render (produção), defina:
   - `RESEND_API_KEY` — a chave copiada no passo 2.
   - `MAIL_FROM` — quem aparece como remetente. Pra testar sem configurar mais nada, deixe o padrão `Marques <onboarding@resend.dev>` — mas repare que esse domínio de teste da Resend **só envia pro e-mail com que você criou a conta**. Pra mandar pra qualquer cliente de verdade, verifique um domínio próprio em **Domains** no painel da Resend e troque para algo como `Marques <verificacao@marquesenergiasolar.com.br>`.
4. Reinicie o backend (local: pare e rode `npm start` de novo; Render: redeploy automático ao salvar a variável).

## Deploy em produção (GitHub Pages + Render + Supabase)

O GitHub Pages hospeda só arquivos estáticos — ele não executa este backend Node. Por isso a arquitetura em produção fica dividida em três partes:

| Peça | Onde roda | O que faz |
|---|---|---|
| Site (`index.html`, `loja.html`, `styles.css`, `app.js`, `credito.js`, `admin/`) | **GitHub Pages** (já publicado) | Front-end estático |
| API (`backend/`) | **Render** (Web Service) | Roda o `server.js`, expõe `/api/*` |
| Banco de dados | **Supabase** (Postgres) | Guarda admins, sessões, pedidos, solicitações de crédito |

### 1. Criar o banco no Supabase
1. Crie uma conta e um novo projeto em [supabase.com](https://supabase.com) (escolha uma senha forte para o banco — vai precisar dela na connection string).
2. Em **Project Settings → Database → Connection string**, copie a opção **Transaction pooler** (porta `6543` — funciona melhor com hosts como o Render do que a conexão direta).
3. Guarde essa URL — é o `DATABASE_URL`.

### 2. Publicar o backend no Render
1. Crie uma conta em [render.com](https://render.com) e clique em **New → Web Service**, apontando para este repositório do GitHub.
2. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Em **Environment**, adicione as variáveis (mesmas do `.env.example`):
   - `DATABASE_URL` — a connection string do Supabase (passo 1)
   - `CORS_ORIGIN` — a URL exata do site no GitHub Pages, ex: `https://synct-labs.github.io`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — login inicial do admin
   - `NODE_ENV` — `production`
   - `SESSION_TTL_HOURS` — `168` (opcional, esse é o padrão)
4. Depois do deploy, copie a URL pública do serviço (algo como `https://mes-backend.onrender.com`).

> No plano gratuito, o Render "dorme" o serviço depois de ~15 min sem uso — a primeira requisição depois disso demora uns 30–50s pra responder (ele está "acordando"). É esperado, não é bug.

### 3. Apontar o site para o backend
1. Edite `api-config.js` (na raiz do projeto) e troque `window.MES_API_BASE = "";` pela URL do Render do passo 2, ex:
   ```js
   window.MES_API_BASE = "https://mes-backend.onrender.com";
   ```
2. Faça commit e push — o GitHub Pages republica automaticamente.

Depois disso, checkout, formulário de crédito e login do admin funcionam de verdade também na versão publicada em `github.io`.

## Pendências para produção

### ✅ Já resolvido nesta rodada
- Headers de segurança HTTP (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security` em produção) — `backend/src/server.js`.
- `robots.txt` e `sitemap.xml` na raiz, pra indexação no Google.
- Meta tags Open Graph / Twitter Card em `index.html` e `loja.html` (prévia correta ao compartilhar no WhatsApp/redes).
- Política de Privacidade (`privacidade.html`) e Termos de Uso (`termos.html`), com checkbox de consentimento LGPD nos formulários de crédito e checkout.
- Copy do checkout/confirmação ajustada: não fala mais em "protótipo" pro cliente final, e explica com clareza que o pagamento é combinado por contato (Pix/cartão/boleto) — condizente com o fato de ainda não haver gateway de pagamento real conectado.
- Arquivos do SQLite antigo (`backend/data/mes.db` e `mes.db-journal`) removidos do Git e ignorados daqui pra frente.
- **Cabos/conectores e estrutura de fixação agora também com preço e ficha técnica reais** (Apex Energia Solar, 12/2026), e "estrutura" deixou de ser "kit pra 6 painéis" e virou peça avulsa (trilho, terminal, parafuso, emenda) — é assim que o mercado (inclusive a Apex) realmente vende.
- **Preço dos kits prontos revisado**: `kit1` de R$9.486 → **R$12.900** e `kit2` de R$11.280 → **R$18.900**. Cálculo: custo real de equipamento (painel + inversor, cotado na Apex) representando ~45-50% do preço final instalado, aproximado à referência que a própria Apex divulga pra ~500 kWh/mês ("em torno de R$20.000"). Ver comentário em `app.js` junto de cada kit — ajuste livremente se quiser outra margem.
- **Frete grátis para todo o Brasil (bônus de lançamento)** — substituiu a estimativa de frete por zona que existia antes. Aparece no carrinho, no checkout e como tag de destaque na home da loja. Continua sem integração real de transportadora por trás (ver item 6 abaixo pro que fazer quando o bônus acabar).
- **API real dos Correios investigada e descartada por ora**: testamos direto — o endpoint público antigo está fora do ar (timeout) e o oficial novo exige contrato empresarial com "cartão de postagem" que a Marques não tem. Ver item 6 abaixo pro caminho realista (Melhor Envio/Frenet).
- **Fotos reais em todos os 29 produtos do catálogo** (antes: só 2 tinham foto, o resto caía no ícone da categoria). Buscadas uma a uma por SKU em sites de revenda/fabricante — a fonte de cada imagem está comentada no `app.js`, ao lado de cada `image:`. Ver item 9 abaixo pra ressalvas (fonte não é o fornecedor final da Marques, e uma delas parece ser de um concorrente local).
- **Parcelamento em até 10x sem juros no cartão** — mostrado no preço de cada produto (catálogo e página de detalhe) e como opção real no checkout (aparece um seletor de parcelas quando o cliente marca "Cartão de Crédito", com o valor de cada parcela já calculado). O número de parcelas escolhido é salvo no pedido (coluna `parcelas` em `orders`, exposta pro admin em "Pagamento"). Já sai "engatilhado" pro gateway: ver item 5 abaixo.
- **Margem de 30% aplicada no preço de todo o catálogo, exceto nos kits prontos** — painéis, inversores, baterias, controlador, cabos e estrutura agora somam +30% sobre a cotação de referência da Apex (ver comentário no topo do `app.js`). Os kits ficam de fora porque já são o valor final "chave na mão" (equipamento + instalação + mão de obra), então aplicar o mesmo percentual seria cobrar margem em cima de margem.
- **Preço dos kits agora deixa explícito que inclui instalação e mão de obra** — aparece como selo "Preço já inclui instalação e mão de obra" na página do kit e "Instalação inclusa" no card do catálogo, pra não dar a entender que é só o equipamento (como os demais itens avulsos).
- **Galeria de fotos dos kits corrigida**: antes as miniaturas abaixo da foto principal eram só um ícone genérico repetido 3x, sem clicar em nada de verdade. Agora mostram as fotos reais de cada equipamento do kit (painel, inversor) e clicar troca a imagem principal.
- **Checkout pré-preenchido com os dados da conta**: nome, CPF, e-mail e telefone vêm automaticamente do cadastro, e o endereço de entrega usado na última compra também — sem sobrescrever o que a pessoa já tiver digitado nesta visita. Ao confirmar o pedido, o endereço (editado ou não) é salvo de volta na conta pra já vir pronto da próxima vez. Novidade no backend: colunas de endereço em `customers` e `customers.saveAddress()`.
- **"Meus Boletos" e "Participação nos Lucros" do Marques Pay agora são reais** (o resto do painel — saldo, cartão, extrato geral, metas — continua só protótipo visual, porque isso exigiria um parceiro bancário de verdade). O admin cadastra o contrato de empréstimo/financiamento (título, valor da parcela, quantidade) ou de participação nos lucros (número, percentual, periodicidade) numa aba nova do painel, **Marques Pay** (`admin/marques-pay.html`); pra empréstimo, o sistema já gera as parcelas mensais automaticamente e o admin marca cada uma como paga conforme recebe (nenhuma cobrança automática — é a mesma lógica de "pagamento combinado" já usada no checkout). Pra participação nos lucros, o admin lança cada repasse manualmente (valor, data, comprovante em PDF/imagem, guardado direto no Postgres). O cliente logado vê tudo isso de verdade em `conta-digital-dashboard.html`, ligado à mesma conta da loja/crédito — nada de dinheiro circula dentro do site, só o registro do que já aconteceu por fora. Tabelas novas: `loan_contracts`, `loan_installments`, `profit_share_contracts`, `profit_share_payments` (ver `backend/src/loans.js` e `backend/src/profitShare.js`).
- **Catálogo da loja migrado pra o banco de dados** — antes era um array fixo em `app.js` (só mudava com deploy de código); agora o admin adiciona, edita e exclui produto, muda preço e cria promoção (preço promocional + rótulo, o preço normal aparece riscado ao lado no site) direto pela nova aba **Catálogo** (`admin/catalogo.html`), sem precisar de deploy. O catálogo original (36 produtos) virou a carga inicial do banco na primeira vez que o servidor sobe — ver `backend/src/productSeed.js` e `backend/src/products.js`. `loja.html`/`app.js` agora buscam o catálogo via `GET /api/products` em vez de ter os dados embutidos.
- **Acesso ao painel de administrador discreto** — antes não tinha nenhum link no site pra `/admin`; agora tem um ponto (`•`) de baixa opacidade no rodapé de `index.html` e `loja.html`, ao lado do "©", que leva pro login. Não chama atenção do cliente, mas continua sendo um link de verdade, sempre no mesmo lugar.
- **Corrigido um bug de exibição que existia desde a rodada anterior**: o selo "Preço já inclui instalação e mão de obra" (só devia aparecer nos kits) ficava preso visível ao navegar de um kit pra um produto avulso na mesma sessão, porque o CSS da classe forçava `display:flex` e ignorava o atributo `hidden`. Corrigido com uma regra `[hidden]{ display:none }` explícita (mesmo ajuste aplicado preventivamente em `.sizing-calc-result`, que tinha o mesmo padrão de risco).

### ⚠️ Decisões/contas que só você pode resolver
1. **Fornecedor definitivo do catálogo** — painéis, inversores, baterias, controlador, cabos e estrutura já têm preço/ficha técnica reais (referência: Apex Energia Solar, concorrente em Cuiabá-MT) com margem de 30% já aplicada por cima, mas ainda é preço de um concorrente, não o fornecedor que a Marques vai efetivamente fechar contrato. Falta decidir isso e trocar as fotos de estoque por fotos próprias (ver item 9) — e revisar se 30% é a margem certa depois de ter o custo real do fornecedor definitivo. Boa notícia: como o catálogo agora vive no banco (ver "Já resolvido nesta rodada"), ajustar preço/margem/fornecedor não precisa mais de deploy de código — é só editar pelo painel admin.
2. **Domínio próprio** — hoje o site vive em `synct-labs.github.io` e a API em `onrender.com`. Se quiser `marquesenergiasolar.com.br` (aparece hoje só como texto no rodapé), é preciso registrar o domínio e configurar DNS (CNAME pro GitHub Pages + domínio customizado no Render).
3. **Supabase no plano gratuito pausa o projeto após ~7 dias sem nenhuma atividade** — isso derrubaria login do admin e o site inteiro até alguém reativar manualmente no painel do Supabase. Se o site vai ficar "no ar de verdade" recebendo pouco tráfego no início, vale considerar o plano pago (US$25/mês) ou algum ping periódico pra manter o projeto ativo.
4. **Render no plano gratuito "dorme" após ~15 min sem uso** (primeira requisição demora 30-50s pra responder). Plano pago (~US$7/mês) elimina isso.
5. **Integração de pagamento real** — ponto comentado em `app.js` (busque "PONTO DE INTEGRAÇÃO DE PAGAMENTO") e no handler de `POST /api/orders` em `backend/src/server.js`. Hoje o fluxo é "pedido registrado → equipe entra em contato pra combinar pagamento", o que é uma opção válida de lançamento — mas se quiser cobrança automática (Pix/cartão/boleto na hora), precisa integrar um gateway (Mercado Pago, PagSeguro, Stripe) e isso é um projeto à parte. Forma de pagamento e parcelas (1 a 10x, no cartão) já são capturadas no checkout e chegam prontas no payload do pedido — é só passar `payload.pagamento`/`payload.parcelas` pra API do gateway escolhido antes de confirmar o pedido.
6. **Frete está grátis como bônus de lançamento, sem prazo definido pra acabar** — é uma decisão de negócio, não uma limitação técnica; quando quiser cobrar frete de novo, é só trocar o texto fixo "Grátis (bônus de lançamento)" no carrinho/checkout/home por um valor real. Pra isso vai precisar de cálculo de frete de verdade: testamos direto a API dos Correios e não dá — o endpoint público antigo (`CalcPrecoPrazo`) está fora do ar (timeout, descontinuado há anos) e a API nova oficial (`api.correios.com.br`) exige contrato empresarial ativo com "cartão de postagem" que a Marques não tem. Caminho realista: contratar uma API de frete que resolve isso por trás (Melhor Envio, Frenet etc. — cadastro simples, usam o contrato deles com os Correios) e alimentar peso/cubagem real de cada produto — outro projeto à parte.
7. **E-mail/WhatsApp automático** avisando a equipe quando entra um pedido novo ou uma solicitação de crédito nova — hoje só aparece no painel admin, alguém precisa checar manualmente.
8. **Backup do banco** — Supabase faz backup automático nos planos pagos; no gratuito, vale exportar o schema/dados periodicamente.
9. **Fotos dos produtos são de revenda/fabricante, não do fornecedor real que a Marques vai usar.** Hoje os 29 produtos têm foto (buscamos uma por uma, sempre pelo SKU exato quando possível — a fonte de cada uma está comentada ao lado do campo `image` em `app.js`), mas vieram de sites de revenda (NeoSolar, Energia Total, Recarga Solar, Minha Casa Solar, Leroy Merlin) ou do site oficial do fabricante (Embrastec), não são fotos próprias da Marques nem necessariamente do fornecedor que ela vai fechar. Um ponto de atenção: várias vieram da **Energia Total**, que parece ser outra revenda de energia solar em Cuiabá-MT (mesmo DDD 65 do WhatsApp) — ou seja, possivelmente um concorrente local direto, não só uma loja nacional qualquer. Vale (a) confirmar com cada fornecedor/distribuidor se pode usar essas imagens comercialmente ou pedir fotos oficiais, e (b) o pn2 (TSUN 600W), bt2 (Epever lítio) e cb5 (Embrastec string box) usam foto de uma variante/linha próxima, não o SKU exato — está anotado no comentário de cada um.

## Estrutura

```
index.html         → página "Crédito Solar" (simulação de crédito)
credito.js         → lógica isolada de index.html (simulação, menu mobile)
loja.html           → página da loja (SPA por hash: calculadora de kWp, catálogo, comparação, configurador, carrinho, checkout)
app.js             → dados do catálogo + lógica da loja (calculadora de kWp, catálogo, comparação, carrinho, checkout, configurador)
api-config.js      → URL do backend em produção (editar depois do deploy no Render — ver "Deploy em produção")
styles.css         → sistema de design (cores, tipografia, componentes) — compartilhado pelas duas páginas
logo-*.png         → logo oficial recortado em diferentes tamanhos
admin/
  login.html         → tela de login do administrador
  dashboard.html     → lista de pedidos, filtros, detalhe e atualização de status
  credit-leads.html  → lista de solicitações de análise de crédito, filtros, detalhe e status
  admin.js           → helpers de API/autenticação compartilhados pelo painel
  admin.css          → estilos do painel (reaproveita as variáveis de styles.css)
backend/
  package.json     → depende só do pacote "pg" (driver do Postgres)
  .env.example     → copie para .env e preencha antes de rodar
  src/
    server.js       → servidor HTTP + rotas da API + CORS
    db.js           → conexão com o Postgres (Supabase) + schema
    auth.js         → login, sessão, hash de senha
    orders.js       → criação/listagem/atualização de pedidos
    creditLeads.js   → criação/listagem/atualização de solicitações de crédito
    config.js       → leitura do .env
    http-utils.js   → helpers de request/response
    static.js       → serve os arquivos do site (usado só rodando local)
```

## Marques Pay: o que já está pronto para o parceiro bancário

Pronto e funcionando de verdade (sem parceiro): cadastro completo de abertura de conta (KYC: dados pessoais, documento, endereço, renda, PEP, fotos/PDFs, consentimento versionado com IP), fila de análise no admin (aba "Contas (KYC)" em Marques Pay) com trilha de auditoria, e a conta só existe depois de aprovada. Meus Boletos e Participação nos Lucros também são reais.

Fica com o parceiro (não existe no código de propósito): saldo, Pix, cartão, extrato.

Para plugar o parceiro, tudo passa por `backend/src/payPartner.js`:
1. Criar um provedor em `providers` (`submitKyc` envia dados e documentos; `parseEvent` traduz o webhook) e ligar com `PAY_PARTNER=<nome>`.
2. Configurar `PAY_PARTNER_WEBHOOK_SECRET`; o parceiro chama `POST /api/webhooks/pay-partner` com o corpo assinado em HMAC-SHA256 no header `x-signature` (sem segredo, o webhook recusa tudo).
3. Revisar com o jurídico o texto de consentimento (`CONSENT_VERSION` em `payKyc.js`) e os Termos/Política de Privacidade antes de abrir ao público: os documentos ficam guardados no Postgres, então vale definir prazo de retenção e backup.

## Programa de Parceiros (vendas por indicação com comissão)

A pessoa usa a conta de cliente, cadastra a chave PIX e aceita as condições (`parceiros.html`). Depois de aprovada no admin (aba **Parceiros**, só o dono), recebe um link `?ref=CODIGO` para a loja e para o crédito. `ref.js` guarda o código por 30 dias (último link vence) e o checkout e o formulário de crédito o enviam; o backend só atribui se o parceiro estiver ativo e não for o próprio comprador.

Comissão: `prevista` (venda registrada) → `liberada` (pedido **entregue** ou crédito **convertido**) → `paga` (admin faz o PIX e anexa o comprovante, que o parceiro vê no painel) ou `cancelada` (pedido cancelado / crédito recusado). Padrão: 5% loja e 2% crédito (sobre `sim_valor_sistema`), editável em "Regras gerais" e por parceiro; vendas já registradas mantêm o percentual da data.

Pontos que exigem decisão/jurídico antes de abrir ao público: `parceiros-termos.html` é um texto-base (prazo de pagamento de 15 dias e demais cláusulas são sugestão); quem indica **crédito** pode precisar ser formalizado como correspondente da instituição financeira; a nomenclatura evita "franquia" de propósito (franquia tem regime legal próprio). Percentuais padrão são sugestão, não regra de negócio definida.

## Compra assistida do parceiro (desconto x comissão)

Quando o próprio parceiro entra logado e acessa a loja pelo link do painel dele (`loja.html?ref=SEU_CODIGO`), o checkout mostra uma caixa "Você está comprando para um cliente" com 3 opções, sempre somando 10: sem desconto (comissão 10%), 5% de desconto (comissão 5%), 10% de desconto (sem comissão). O total e o parcelamento já saem com o desconto aplicado, e a comissão prevista aparece em R$ em tempo real. No checkout, o parceiro troca os dados pré-preenchidos (que são os dele) pelos do cliente antes de enviar.

A comissão padrão da loja (regra geral, "Regras gerais" no admin) subiu de 5% para 10%, pra bater com o topo da faixa acima. Um cliente comum que só clica no link do parceiro (não é o parceiro logado) não vê essa caixa e continua gerando a comissão normal (regra geral ou override do parceiro), sem desconto nenhum — a troca desconto↔comissão só existe nessa compra assistida.

Validado no backend: o nível de desconto só é aceito quando o código `?ref=` pertence à própria conta logada (`resolveSelfAssisted` em `backend/src/partners.js`); qualquer outra pessoa que tente forjar esse campo é ignorada e cai na atribuição normal.
