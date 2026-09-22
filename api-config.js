/* =====================================================================
   CONFIGURAÇÃO DA API
   ---------------------------------------------------------------------
   Site e backend rodam juntos no mesmo VPS/domínio (marquespromotora.com,
   atrás do Nginx) — mesma origem, por isso "" (o site já assume o próprio
   domínio; é o mesmo valor usado rodando local com "npm start").

   Se um dia o backend voltar a ficar num domínio separado do site (ex:
   GitHub Pages pro site + API em outro host), troque para a URL completa
   do backend aqui (sem barra no final) e confirme o CORS_ORIGIN dele.
   ===================================================================== */
window.MES_API_BASE = "";
