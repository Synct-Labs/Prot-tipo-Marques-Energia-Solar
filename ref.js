/* =====================================================================
   INDICAÇÃO DE PARCEIRO: guarda o código do link (?ref=CODIGO) por 7
   dias (último link vence) e o expõe pro checkout e pro formulário de
   crédito enviarem junto. Quem valida o código é o backend.
   ===================================================================== */
window.MES_REF = (function () {
  const KEY = "mes_ref";
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && raw.code && raw.exp > Date.now()) return raw.code;
      localStorage.removeItem(KEY);
    } catch (e) { /* storage indisponível: segue sem indicação */ }
    return "";
  }

  try {
    const code = (new URLSearchParams(location.search).get("ref") || "").trim().toUpperCase();
    if (/^[A-Z0-9]{4,12}$/.test(code)) {
      localStorage.setItem(KEY, JSON.stringify({ code, exp: Date.now() + TTL_MS }));
    }
  } catch (e) { /* idem */ }

  return { get: read };
})();
