# Marques Energia Solar — Protótipo de E-commerce

Protótipo navegável (HTML/CSS/JS puro no front, sem build) para aprovação visual do cliente **Marques Energia Solar** (Mato Grosso). Agora inclui um backend real para persistência de pedidos e um painel de administrador com login.

## Como rodar

Diferente da primeira versão, o site precisa do backend rodando (o checkout salva o pedido de verdade em um banco de dados). Não dá mais para simplesmente abrir o `index.html` no navegador.

Pré-requisito: **Node.js 22.5 ou mais recente** (o backend usa o SQLite nativo do Node, sem precisar instalar nada com `npm install`).

```bash
cd backend
copy .env.example .env      # no Windows (ou "cp .env.example .env" no Mac/Linux)
```

Abra o arquivo `backend/.env` e defina:
- `ADMIN_EMAIL` — e-mail de login do administrador
- `ADMIN_PASSWORD` — senha inicial (pode trocar depois pelo próprio painel)

Depois:

```bash
npm start
```

Isso sobe o site inteiro (loja + painel + API) em **http://localhost:3000**. Não precisa de mais nenhum comando — sem `npm install`, sem banco externo.

- Loja: http://localhost:3000
- Painel de administrador: http://localhost:3000/admin/login.html

## O que tem

- Home com identidade visual da marca (logo real, hero, propostas de valor).
- Catálogo com 23 produtos placeholder em 4 categorias: painéis solares, inversores, kits de cabos/fios, parafusos e estrutura de fixação.
- Comparação lado a lado (2–3 produtos da mesma categoria).
- Carrinho funcional (adicionar/remover/qtd/total).
- Configurador "Monte seu Projeto" (wizard guiado de kit completo).
- Checkout completo (dados pessoais, endereço, resumo do pedido) — o pedido é **salvo de verdade** no backend ao finalizar. **Sem gateway de pagamento real.**
- **Painel de administrador** (`/admin`): login protegido, lista de pedidos com busca/filtro por status, detalhe de cada pedido (cliente, endereço, itens) e atualização de status (novo → confirmado → em preparação → enviado → entregue / cancelado).
- Design responsivo mobile-first.

## Backend

- Pasta `backend/`, servidor HTTP em Node puro — **zero dependências de terceiros** (só módulos nativos: `http`, `node:sqlite`, `crypto`, `fs`, `path`). Não precisa de `npm install`.
- Banco de dados: SQLite (arquivo `backend/data/mes.db`, criado automaticamente na primeira execução — não versionado no Git).
- Autenticação de administrador: sessão por cookie `HttpOnly` (token opaco guardado no banco, senha com hash `scrypt`). Só existe um administrador por padrão (criado a partir do `.env` na primeira execução); é possível trocar a senha pelo próprio painel.
- Rotas principais da API:
  - `POST /api/orders` — cria um pedido (usado pelo checkout do site).
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`.
  - `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id`, `GET /api/admin/stats` — todas protegidas por login.

## Pendências para produção

1. Catálogo real de produtos (os dados atuais são de exemplo, ainda vivem em `app.js`).
2. Integração de pagamento real — ponto de integração comentado em `app.js` (busque por "PONTO DE INTEGRAÇÃO DE PAGAMENTO") e no handler de `POST /api/orders` em `backend/src/server.js`.
3. Cálculo de frete real (hoje o checkout mostra "Grátis (protótipo)").
4. Envio de e-mail transacional ao cliente e à loja quando um pedido é criado ou muda de status.
5. Antes de ir para produção com dados reais de clientes: colocar o backend atrás de HTTPS (setar `NODE_ENV=production` no `.env` para ativar o cookie `Secure`), revisar política de backup do banco SQLite e considerar um processo gerenciado (ex: PM2, systemd) em vez de rodar `npm start` manualmente.

## Estrutura

```
index.html        → estrutura e conteúdo das páginas da loja (SPA por hash)
styles.css         → sistema de design (cores, tipografia, componentes)
app.js             → dados do catálogo + lógica da loja (catálogo, comparação, carrinho, checkout)
logo-*.png         → logo oficial recortado em diferentes tamanhos
admin/
  login.html       → tela de login do administrador
  dashboard.html   → lista de pedidos, filtros, detalhe e atualização de status
  admin.js         → helpers de API/autenticação compartilhados pelo painel
  admin.css        → estilos do painel (reaproveita as variáveis de styles.css)
backend/
  package.json
  .env.example     → copie para .env e preencha antes de rodar
  src/
    server.js      → servidor HTTP + rotas da API
    db.js          → schema do SQLite
    auth.js        → login, sessão, hash de senha
    orders.js       → criação/listagem/atualização de pedidos
    config.js       → leitura do .env
    http-utils.js   → helpers de request/response
    static.js       → serve os arquivos do site
  data/            → banco SQLite (criado ao rodar, não versionado)
```
