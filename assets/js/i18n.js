/* =========================================================================
   SALICORNIA — i18n (castellano / catalán / inglés)
   Motor de traducción sin dependencias.

   Estrategia:
   - El castellano vive en el HTML (funciona sin JS y es lo que ve el SEO).
   - i18n-ca.js define window.SAL_I18N.ca y .ui.es/.ui.ca;
     i18n-en.js añade .en y .ui.en (se cargan antes que este archivo).
   - Cada clave es el texto en castellano tal cual aparece en el HTML
     (normalizado: espacios/saltos de línea colapsados a un solo espacio).
   - Al cargar se recorre el DOM: nodos de texto y atributos traducibles
     (aria-label, placeholder, alt, title, content, label, data-caption).
     Si la normalización coincide con una clave del idioma activo, se
     sustituye; si no, se ignora (nombres propios, precios, horarios…).
   - Los originales se cachean en el primer recorrido; al volver a "es" se
     restauran byte a byte.
   - Excluidos: script/style/noscript/template/textarea/code/pre,
     .sal-fab/.sal-panel (gestiona asistente.js), [data-i18n-skip],
     [data-open-status] y [data-year] (los pinta main.js).
   - Persistencia: localStorage["salicornia_lang"] = es | ca | en.
   - Expone window.I18N = { t, lang, set } para main.js y el asistente.
   ========================================================================= */
(function () {
  "use strict";

  var STORE_KEY = "salicornia_lang";
  var LANGS = ["es", "ca", "en"];
  var OG_LOCALES = { es: "es_ES", ca: "ca_ES", en: "en_GB" };
  var dict = window.SAL_I18N || { ca: {}, en: {}, ui: { es: {}, ca: {}, en: {} } };
  var textCache = new WeakMap();
  var attrCache = new WeakMap();

  var ATTRS = ["aria-label", "placeholder", "alt", "title", "content", "label", "data-caption"];
  var SKIP_SELECTOR = "script,style,noscript,template,textarea,code,pre,.sal-fab,.sal-panel";
  var SKIP_UI = "[data-i18n-skip],[data-open-status],[data-year]";

  /* --- idioma actual ---------------------------------------------------- */
  function detectLang() {
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (LANGS.indexOf(saved) !== -1) return saved;
    } catch (e) { /* localStorage no disponible */ }
    var nav = (navigator.language || navigator.userLanguage || "es").toLowerCase();
    if (nav.indexOf("ca") === 0) return "ca";
    if (nav.indexOf("en") === 0) return "en";
    return "es";
  }

  var lang = detectLang();

  /* --- normalización de claves ------------------------------------------ */
  function normalize(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function splitWs(raw) {
    var lead = (raw.match(/^\s*/) || [""])[0];
    var trail = (raw.match(/\s*$/) || [""])[0];
    return { lead: lead, trail: trail };
  }

  /* tabla de traducción del idioma activo (null en castellano) ------------ */
  function table() {
    return lang === "es" ? null : dict[lang];
  }

  /* --- nodos de texto ---------------------------------------------------- */
  function applyTextNode(node) {
    var entry = textCache.get(node);
    if (!entry) {
      entry = { raw: node.data, mid: normalize(node.data) };
      textCache.set(node, entry);
    }
    var ws = splitWs(entry.raw);
    var tbl = table();
    if (tbl && tbl[entry.mid] != null) {
      node.data = ws.lead + tbl[entry.mid] + ws.trail;
    } else {
      node.data = entry.raw;
    }
  }

  function shouldSkipText(node) {
    var el = node.parentElement;
    if (!el) return true;
    if (el.closest(SKIP_SELECTOR)) return true;
    if (el.closest(SKIP_UI)) return true;
    return false;
  }

  /* --- atributos ---------------------------------------------------------- */
  function applyAttr(el, name) {
    var current = el.getAttribute(name);
    if (current == null) return;
    var store = attrCache.get(el);
    if (!store) {
      store = {};
      attrCache.set(el, store);
    }
    if (!(name in store)) store[name] = current;
    var original = store[name];
    var mid = normalize(original);
    var ws = splitWs(original);
    var tbl = table();
    if (tbl && tbl[mid] != null) {
      el.setAttribute(name, ws.lead + tbl[mid] + ws.trail);
    } else {
      el.setAttribute(name, original);
    }
  }

  /* --- recorrido completo -------------------------------------------------- */
  function walk(root) {
    if (root.nodeType === 1 && root.matches && root.matches(SKIP_SELECTOR)) return;

    if (root.nodeType === Node.TEXT_NODE) {
      if (!shouldSkipText(root)) applyTextNode(root);
      return;
    }
    if (root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.ELEMENT_NODE) return;

    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          if (shouldSkipText(node)) return NodeFilter.FILTER_REJECT;
          if (!normalize(node.data)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    var n;
    while ((n = walker.nextNode())) applyTextNode(n);

    var scope = root.querySelectorAll ? root : document;
    for (var i = 0; i < ATTRS.length; i++) {
      var name = ATTRS[i];
      var sel = "[" + name + "]";
      var els = scope.querySelectorAll(sel);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        if (el.closest(SKIP_SELECTOR)) continue;
        if (el.closest(SKIP_UI) && name !== "label") continue;
        if (el.classList && el.classList.contains("lang-switch__btn")) continue;
        applyAttr(el, name);
      }
    }
  }

  /* --- selector de idioma -------------------------------------------------- */
  function paintSwitcher() {
    var btns = document.querySelectorAll("[data-set-lang]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", String(btns[i].getAttribute("data-set-lang") === lang));
    }
  }

  function wireSwitcher() {
    var btns = document.querySelectorAll("[data-set-lang]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        set(this.getAttribute("data-set-lang"));
      });
    }
  }

  /* --- aplicar todo --------------------------------------------------------- */
  function applyAll() {
    document.documentElement.lang = lang;
    walk(document);
    var og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute("content", OG_LOCALES[lang] || "es_ES");
    paintSwitcher();
    document.dispatchEvent(new CustomEvent("sal:lang", { detail: lang }));
  }

  function set(next) {
    if (LANGS.indexOf(next) === -1 || next === lang) return;
    lang = next;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* noop */ }
    applyAll();
  }

  /* --- cadenas dinámicas (main.js / asistente) ------------------------------ */
  function t(key, fallback) {
    var tbl = dict.ui && dict.ui[lang];
    if (tbl && tbl[key] != null) return tbl[key];
    if (dict.ui && dict.ui.es && dict.ui.es[key] != null) return dict.ui.es[key];
    return fallback != null ? fallback : key;
  }

  window.I18N = {
    t: t,
    set: set,
    get lang() { return lang; }
  };

  /* --- arranque (defer: el DOM ya está parseado) ----------------------------- */
  wireSwitcher();
  applyAll();
})();
