# Marques Energia Solar — Protótipo de E-commerce

Protótipo navegável (HTML/CSS/JS puro, sem build) para aprovação visual do cliente **Marques Energia Solar** (Mato Grosso).

## Como abrir

Basta abrir `index.html` no navegador. Não precisa de servidor, build ou instalação.

## O que tem

- Home com identidade visual da marca (logo real, hero, propostas de valor).
- Catálogo com 23 produtos placeholder em 4 categorias: painéis solares, inversores, kits de cabos/fios, parafusos e estrutura de fixação.
- Comparação lado a lado (2–3 produtos da mesma categoria).
- Carrinho funcional (adicionar/remover/qtd/total).
- Checkout completo (dados pessoais, endereço, resumo do pedido) — **sem gateway de pagamento real**.
- Design responsivo mobile-first.

## Pendências para produção

1. Catálogo real de produtos (os dados atuais são de exemplo).
2. Integração de pagamento real — ponto de integração comentado em `app.js` (busque por "PONTO DE INTEGRAÇÃO DE PAGAMENTO").
3. Backend para persistência de pedidos, envio de e-mail e cálculo de frete.

## Estrutura

```
index.html   → estrutura e conteúdo das páginas (SPA por hash)
styles.css   → sistema de design (cores, tipografia, componentes)
app.js       → dados do catálogo + lógica (catálogo, comparação, carrinho, checkout)
logo-*.png   → logo oficial recortado em diferentes tamanhos
```
