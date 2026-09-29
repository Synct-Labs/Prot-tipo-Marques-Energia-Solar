/* =====================================================================
   IDIOMA: PORTUGUÊS / INGLÊS
   ---------------------------------------------------------------------
   Dicionário PT -> EN (texto exato) aplicado sobre o DOM depois que a
   página carrega. Troca de idioma recarrega a página (mais simples e
   confiável do que desfazer a tradução na hora). Cada página só precisa
   de UMA linha:
     <script src="i18n.js"></script>        (páginas na raiz)
     <script src="../i18n.js"></script>     (páginas em conta/ e admin/)
   O botão se encaixa sozinho, do lado do botão de tema.
   ===================================================================== */
(function () {
  var KEY = "mes_lang";
  var DICT = window.MES_I18N_DICT || {};

  function readSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writeSaved(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  var current = readSaved() === "en" ? "en" : "pt";

  // Evita mostrar o português por uma fração de segundo antes da troca
  // pro inglês: esconde o body até a tradução terminar.
  if (current === "en") {
    document.write('<style id="mes-i18n-hide">body{visibility:hidden !important;}</style>');
  }

  function tr(text) {
    if (current !== "en") return text;
    var v = DICT[text];
    return v === undefined ? text : v;
  }

  function translateAttrs(attr) {
    document.querySelectorAll("[" + attr + "]").forEach(function (el) {
      var v = el.getAttribute(attr);
      var t = DICT[v];
      if (t !== undefined) el.setAttribute(attr, t);
    });
  }

  function applyToDOM() {
    if (current !== "en") return;

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "NOSCRIPT") {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(function (n) {
      var raw = n.nodeValue;
      var trimmed = raw.trim();
      if (!trimmed) return;
      var t = DICT[trimmed];
      if (t === undefined) return;
      var lead = raw.slice(0, raw.length - raw.replace(/^\s+/, "").length);
      var trail = raw.slice(raw.replace(/\s+$/, "").length);
      n.nodeValue = lead + t + trail;
    });

    translateAttrs("placeholder");
    translateAttrs("title");
    translateAttrs("alt");
    translateAttrs("aria-label");

    document.querySelectorAll("input[type=submit],input[type=button]").forEach(function (el) {
      var t = DICT[el.value];
      if (t !== undefined) el.value = t;
    });

    var t = DICT[document.title];
    if (t !== undefined) document.title = t;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      var td = DICT[metaDesc.content];
      if (td !== undefined) metaDesc.content = td;
    }

    document.documentElement.lang = "en";
  }

  function reveal() {
    var style = document.getElementById("mes-i18n-hide");
    if (style) style.remove();
  }

  function toggle() {
    current = current === "en" ? "pt" : "en";
    writeSaved(current);
    location.reload();
  }

  window.MES_I18N = {
    get: function () { return current; },
    toggle: toggle,
    t: tr,
  };

  function mountButton() {
    if (document.querySelector(".lang-toggle-btn")) return;
    var container = document.querySelector(".header-actions") || document.querySelector(".admin-topbar-right");
    if (!container) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-toggle-btn";
    btn.setAttribute("aria-label", "Switch language / Trocar idioma");
    btn.title = "Switch language / Trocar idioma";
    btn.textContent = current === "en" ? "PT" : "EN";
    btn.addEventListener("click", toggle);
    container.insertBefore(btn, container.firstChild);
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    applyToDOM();
    mountButton();
    reveal();
  });
})();
