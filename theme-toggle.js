/* =====================================================================
   TEMA CLARO/ESCURO
   ---------------------------------------------------------------------
   Carregado no <head> de toda página (antes do <body>), pra aplicar o
   tema salvo o quanto antes e evitar flash da cor errada. A parte que
   aplica o tema roda na hora (síncrona); a que monta o botão espera o
   DOM ficar pronto. Assim, cada página só precisa de UMA linha:
     <script src="theme-toggle.js"></script>  (ajuste o caminho conforme
     a pasta — "../theme-toggle.js" em conta/ e admin/).
   O botão se encaixa sozinho no cabeçalho (.header-actions no site,
   .admin-topbar-right no painel) — não precisa mexer no HTML de cada
   página pra ele aparecer.
   ===================================================================== */
(function () {
  var KEY = "mes_theme";

  function readSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writeSaved(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  function apply(theme) {
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }

  // Aplica na hora, antes do <body> renderizar — evita flash do tema errado.
  var current = readSaved() === "light" ? "light" : "dark";
  apply(current);

  var SUN = '<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var MOON = '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  // O ícone mostra pra qual tema o clique leva (padrão comum nesse tipo de
  // botão): escuro agora -> mostra sol (clique acende); claro agora ->
  // mostra lua (clique apaga).
  function iconFor(theme) { return theme === "light" ? MOON : SUN; }

  var buttons = [];
  function refreshButtons() {
    buttons.forEach(function (btn) { btn.innerHTML = iconFor(current); });
  }

  function toggle() {
    current = current === "light" ? "dark" : "light";
    apply(current);
    writeSaved(current);
    refreshButtons();
    document.dispatchEvent(new CustomEvent("mes-theme-change", { detail: { theme: current } }));
  }

  window.MES_THEME = { get: function () { return current; }, toggle: toggle, refresh: refreshButtons };

  function mountButton() {
    if (document.querySelector(".theme-toggle-btn")) return; // já montado (ex: script incluído 2x)
    var container = document.querySelector(".header-actions") || document.querySelector(".admin-topbar-right") || document.querySelector(".pay-topbar-actions");
    if (!container) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle-btn";
    btn.setAttribute("aria-label", "Alternar tema claro/escuro");
    btn.title = "Alternar tema claro/escuro";
    btn.innerHTML = iconFor(current);
    btn.addEventListener("click", toggle);
    container.insertBefore(btn, container.firstChild);
    buttons.push(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton);
  } else {
    mountButton();
  }
})();
