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
- Catálogo com 25 produtos em 5 categorias: **kits prontos** (2 kits com orçamento real — os únicos produtos reais do catálogo por enquanto, o resto é placeholder), painéis solares, inversores, kits de cabos/fios, parafusos e estrutura de fixação.
- Comparação lado a lado (2–3 produtos da mesma categoria).
- Carrinho funcional (adicionar/remover/qtd/total).
- Configurador "Monte seu Projeto" (wizard guiado de kit completo, com kWp calculado no resumo).
- Checkout completo (dados pessoais, endereço, resumo do pedido) — o pedido é **salvo de verdade** no backend ao finalizar. **Sem gateway de pagamento real.**
- Botão "Crédito Solar" no cabeçalho leva de volta para `index.html`.

### Painel de administrador (`/admin`)
- Login protegido, lista de pedidos com busca/filtro por status, detalhe de cada pedido (cliente, endereço, itens) e atualização de status (novo → confirmado → em preparação → enviado → entregue / cancelado).

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
- Rotas principais da API:
  - `POST /api/orders` — cria um pedido (usado pelo checkout do site).
  - `POST /api/credit-leads` — cria uma solicitação de análise de crédito (usado pelo formulário em `index.html`).
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`.
  - `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id`, `GET /api/admin/stats` — todas protegidas por login.
  - `GET /api/admin/credit-leads`, `GET /api/admin/credit-leads/:id`, `PATCH /api/admin/credit-leads/:id`, `GET /api/admin/credit-leads/stats` — idem, para as solicitações de crédito.

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

### ⚠️ Decisões/contas que só você pode resolver
1. **Catálogo real de produtos** — os 2 kits prontos (`kit1`, `kit2` em `app.js`) já são orçamento real (TSUN + Solis); o restante dos itens (painéis, inversores, cabos e estrutura avulsos), preços, SKUs e fotos ainda são de exemplo. Este é o maior gap entre "parece pronto" e "é real": sem completar isso, boa parte dos pedidos feitos na loja hoje ainda seria sobre produtos fictícios.
2. **Domínio próprio** — hoje o site vive em `synct-labs.github.io` e a API em `onrender.com`. Se quiser `marquesenergiasolar.com.br` (aparece hoje só como texto no rodapé), é preciso registrar o domínio e configurar DNS (CNAME pro GitHub Pages + domínio customizado no Render).
3. **Supabase no plano gratuito pausa o projeto após ~7 dias sem nenhuma atividade** — isso derrubaria login do admin e o site inteiro até alguém reativar manualmente no painel do Supabase. Se o site vai ficar "no ar de verdade" recebendo pouco tráfego no início, vale considerar o plano pago (US$25/mês) ou algum ping periódico pra manter o projeto ativo.
4. **Render no plano gratuito "dorme" após ~15 min sem uso** (primeira requisição demora 30-50s pra responder). Plano pago (~US$7/mês) elimina isso.
5. **Integração de pagamento real** — ponto comentado em `app.js` (busque "PONTO DE INTEGRAÇÃO DE PAGAMENTO") e no handler de `POST /api/orders` em `backend/src/server.js`. Hoje o fluxo é "pedido registrado → equipe entra em contato pra combinar pagamento", o que é uma opção válida de lançamento — mas se quiser cobrança automática (Pix/cartão/boleto na hora), precisa integrar um gateway (Mercado Pago, PagSeguro, Stripe) e isso é um projeto à parte.
6. **Cálculo de frete real** (hoje o checkout mostra "A combinar").
7. **E-mail/WhatsApp automático** avisando a equipe quando entra um pedido novo ou uma solicitação de crédito nova — hoje só aparece no painel admin, alguém precisa checar manualmente.
8. **Backup do banco** — Supabase faz backup automático nos planos pagos; no gratuito, vale exportar o schema/dados periodicamente.
9. Dois arquivos do SQLite antigo (`backend/data/mes.db` e `mes.db-journal`) ficaram versionados no Git por engano antes da migração pro Postgres — não afetam o funcionamento, mas valem uma limpeza: `git rm -r backend/data && git commit` (não consegui remover por aqui por causa de uma trava no `.git` local — rode esse comando quando puder).
10. **Fotos dos kits prontos (`assets/products/`) são de sites de revenda, não do fabricante** — a do inversor Solis bate com o modelo exato (S6-GR1P3K-M); a do módulo TSUN é da variante de 620W da mesma linha "RIO" bifacial preta (não achamos foto de revenda específica da variante 630W). Vale confirmar com o fornecedor/distribuidor se pode usar essas imagens comercialmente, ou pedir fotos oficiais direto da TSUN/Solis.

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
