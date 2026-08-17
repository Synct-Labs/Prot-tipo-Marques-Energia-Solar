# Marques Energia Solar — Protótipo de E-commerce

Protótipo navegável (HTML/CSS/JS puro no front, sem build) para aprovação visual do cliente **Marques Energia Solar** (Mato Grosso). Agora inclui um backend real para persistência de pedidos e um painel de administrador com login.

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
- Calculadora de dimensionamento: consumo (kWh ou valor da conta) → potência recomendada em **kWp**, usando a fórmula `consumo (kWh) ÷ 119`.
- Simulação de crédito em 4 modalidades: Crédito CLT, Saque FGTS, Consórcio de placa solar, Financiamento bancário — todas com valores **ilustrativos**, sem integração real com instituição financeira.
- Comunicação de alcance nacional ("comprar no Brasil inteiro") e garantia de 25 anos.
- Botão "Comprar" leva para `loja.html`. O botão "Montar kit com essa potência" da calculadora também leva para lá, já passando a quantidade de painéis sugerida (ver "Handoff entre páginas" abaixo).

### `loja.html` — Loja (SPA por hash, dentro da própria página)
- Home da loja com identidade visual da marca, propostas de valor, produtos em destaque, depoimentos e FAQ.
- Catálogo com 23 produtos placeholder em 4 categorias: painéis solares, inversores, kits de cabos/fios, parafusos e estrutura de fixação.
- Comparação lado a lado (2–3 produtos da mesma categoria).
- Carrinho funcional (adicionar/remover/qtd/total).
- Configurador "Monte seu Projeto" (wizard guiado de kit completo, com kWp calculado no resumo).
- Checkout completo (dados pessoais, endereço, resumo do pedido) — o pedido é **salvo de verdade** no backend ao finalizar. **Sem gateway de pagamento real.**
- Botão "Crédito Solar" no cabeçalho leva de volta para `index.html`.

### Painel de administrador (`/admin`)
- Login protegido, lista de pedidos com busca/filtro por status, detalhe de cada pedido (cliente, endereço, itens) e atualização de status (novo → confirmado → em preparação → enviado → entregue / cancelado).

Design responsivo mobile-first nas duas páginas.

### Handoff entre páginas (calculadora → configurador)

Como `index.html` e `loja.html` são documentos HTML separados (recarregam a página ao navegar entre eles), o estado do JavaScript não sobrevive à troca. Para levar a quantidade de painéis sugerida pela calculadora de `index.html` até o configurador de `loja.html`, usamos o `localStorage` como ponte:

1. Em `credito.js`, o botão "Montar kit com essa potência" grava `localStorage.setItem("mes_sizing_qtd", qtd)` e navega para `loja.html#configurador`.
2. Em `app.js`, ao carregar a view `configurador`, o código lê `localStorage.getItem("mes_sizing_qtd")`, aplica a quantidade ao estado do wizard, remove a chave do `localStorage` (uso único) e abre o wizard já com essa sugestão.

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

1. Catálogo real de produtos (os dados atuais são de exemplo, ainda vivem em `app.js`).
2. Integração de pagamento real — ponto de integração comentado em `app.js` (busque por "PONTO DE INTEGRAÇÃO DE PAGAMENTO") e no handler de `POST /api/orders` em `backend/src/server.js`.
3. Cálculo de frete real (hoje o checkout mostra "Grátis (protótipo)").
4. Envio de e-mail transacional ao cliente e à loja quando um pedido é criado ou muda de status.
5. Backup do banco: o Supabase já faz backup automático nos planos pagos; no plano gratuito, vale exportar o schema/dados periodicamente.

## Estrutura

```
index.html         → página "Crédito Solar" (calculadora de kWp + simulação de crédito)
credito.js         → lógica isolada de index.html (calculadora, simulação, menu mobile)
loja.html           → página da loja (SPA por hash: catálogo, comparação, configurador, carrinho, checkout)
app.js             → dados do catálogo + lógica da loja (catálogo, comparação, carrinho, checkout, configurador)
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
