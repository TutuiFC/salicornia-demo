/* =========================================================================
   SALICORNIA — «Crea tu pizza»
   El cliente toca los ingredientes, ve la pizza como lista con su precio y
   la guarda en el pedido (el mismo carrito que usa pedido.html).
   El precio de verdad lo calcula el servidor al enviar el pedido.
   ========================================================================= */
(function () {
  "use strict";

  var STORE_KEY = "salicornia_pedido_v1"; /* el mismo borrador que pedido.js */
  var CUSTOM_ID = "pizzas-crea-tu-pizza";
  var MAX_EACH = 4;
  var MAX_TOTAL = 30;

  var cfg = (window.SAL_CONFIG && window.SAL_CONFIG.pedidos) || {};
  var BASE = typeof cfg.pizzaBase === "number" ? cfg.pizzaBase : 10;
  var PER_ING = typeof cfg.pizzaIng === "number" ? cfg.pizzaIng : 0.8;
  var GF = typeof cfg.sinGluten === "number" ? cfg.sinGluten : 2.5;

  var L = {
    es: {
      base: "Masa y tomate (base)", empty: "Toca un ingrediente para añadirlo.", total: "Total",
      gf: "Pizza sin gluten (+{x})", save: "Guardar pedido", more: "Añadir uno más", less: "Quitar uno",
      remove: "Quitar", min: "Añade al menos un ingrediente.", max: "Has llegado al máximo de ingredientes.",
      maxEach: "Ese ingrediente ya está al máximo.", saved: "Pizza guardada en tu pedido. Te llevamos al menú para seguir pidiendo…", order: "Ver mi pedido ({n})", err: "No se ha podido guardar el pedido en este navegador.",
      noIng: "Solo masa y tomate", oneIng: "1 ingrediente", nIng: "{n} ingredientes"
    },
    ca: {
      base: "Massa i tomàquet (base)", empty: "Toca un ingredient per afegir-lo.", total: "Total",
      gf: "Pizza sense gluten (+{x})", save: "Desar comanda", more: "Afegir-ne un més", less: "Treure'n un",
      remove: "Treure", min: "Afegeix com a mínim un ingredient.", max: "Has arribat al màxim d'ingredients.",
      maxEach: "Aquest ingredient ja és al màxim.", saved: "Pizza desada a la comanda. Et portem al menú per seguir demanant…", order: "Veure la comanda ({n})", err: "No s'ha pogut desar la comanda en aquest navegador.",
      noIng: "Només massa i tomàquet", oneIng: "1 ingredient", nIng: "{n} ingredients"
    },
    en: {
      base: "Dough and tomato (base)", empty: "Tap an ingredient to add it.", total: "Total",
      gf: "Gluten-free pizza (+{x})", save: "Save order", more: "Add one more", less: "Remove one",
      remove: "Remove", min: "Add at least one ingredient.", max: "You have reached the maximum number of ingredients.",
      maxEach: "That ingredient is already at the maximum.", saved: "Pizza saved to your order. Taking you to the menu so you can keep ordering…", order: "See my order ({n})", err: "The order could not be saved in this browser.",
      noIng: "Just dough and tomato", oneIng: "1 ingredient", nIng: "{n} ingredients"
    }
  };

  var els = {
    lines: document.querySelector("[data-cp-lines]"),
    gf: document.querySelector("[data-cp-gf]"),
    gfLabel: document.querySelector("[data-cp-gf-label]"),
    total: document.querySelector("[data-cp-total]"),
    totalLabel: document.querySelector("[data-cp-total-label]"),
    save: document.querySelector("[data-cp-save]"),
    msg: document.querySelector("[data-cp-msg]"),
    pizza: document.querySelector("[data-cp-pizza]"),
    cap: document.querySelector("[data-cp-cap]"),
    order: document.querySelector("[data-cp-order]")
  };
  if (!els.lines) return;
  /* dibujo de la pizza (pizza-render.js); si no carga, la página funciona igual */
  var view = window.SalPizzaView && els.pizza ? window.SalPizzaView(els.pizza) : null;

  var buttons = Array.prototype.slice.call(document.querySelectorAll(".ing-btn"));
  var meta = {}; /* id -> nombre en castellano */
  buttons.forEach(function (b) { meta[b.getAttribute("data-ing")] = b.getAttribute("data-es"); });
  var order = buttons.map(function (b) { return b.getAttribute("data-ing"); });
  var counts = {};

  function lang() {
    try {
      var l = localStorage.getItem("salicornia_lang");
      if (l === "ca" || l === "en" || l === "es") return l;
    } catch (e) { /* noop */ }
    var h = (document.documentElement.lang || "es").slice(0, 2);
    return L[h] ? h : "es";
  }
  function s(k, vars) {
    var t = (L[lang()] || L.es)[k] || L.es[k] || k;
    if (vars) Object.keys(vars).forEach(function (v) { t = t.replace("{" + v + "}", vars[v]); });
    return t;
  }
  function norm(t) { return String(t || "").replace(/\s+/g, " ").trim(); }
  function name(id) {
    var es = meta[id], l = lang();
    var tbl = window.SAL_I18N && window.SAL_I18N[l];
    return (l !== "es" && tbl && tbl[norm(es)]) || es;
  }
  function money(n) {
    return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }
  function totalCount() {
    return Object.keys(counts).reduce(function (a, k) { return a + counts[k]; }, 0);
  }
  function say(t) { els.msg.textContent = t || ""; }
  /* «Ver mi pedido (N)»: cuántos platos hay ya en el carrito */
  function cartCount() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      return d && Array.isArray(d.cart) ? d.cart.reduce(function (a, l) { return a + (l.qty || 0); }, 0) : 0;
    } catch (e) { return 0; }
  }
  function paintOrder() {
    if (!els.order) return;
    var n = cartCount();
    els.order.hidden = !n;
    els.order.textContent = s("order", { n: n });
  }

  function add(id) {
    if (totalCount() >= MAX_TOTAL) return say(s("max"));
    if ((counts[id] || 0) >= MAX_EACH) return say(s("maxEach"));
    counts[id] = (counts[id] || 0) + 1;
    say("");
    render();
  }
  function sub(id) {
    if (!counts[id]) return;
    counts[id] -= 1;
    if (counts[id] <= 0) delete counts[id];
    say("");
    render();
  }
  function drop(id) { delete counts[id]; say(""); render(); }

  function price() {
    return BASE + totalCount() * PER_ING + (els.gf.checked ? GF : 0);
  }

  function render() {
    var ids = order.filter(function (id) { return counts[id]; });
    var h = '<li><span>' + esc(s("base")) + '</span><span class="cp__price">' + esc(money(BASE)) + "</span></li>";
    if (!ids.length) h += '<li class="cp__empty">' + esc(s("empty")) + "</li>";
    ids.forEach(function (id) {
      var n = counts[id], nm = name(id);
      h += "<li><span>" + esc(nm) + (n > 1 ? " ×" + n : "") + '</span><span class="cp__price">' + esc(money(n * PER_ING)) + "</span>" +
        '<span class="cp__ctl">' +
        '<button type="button" class="cp__step" data-sub="' + id + '" aria-label="' + esc(s("less") + ": " + nm) + '">−</button>' +
        '<button type="button" class="cp__step" data-add="' + id + '" aria-label="' + esc(s("more") + ": " + nm) + '">+</button>' +
        '<button type="button" class="cp__step" data-drop="' + id + '" aria-label="' + esc(s("remove") + ": " + nm) + '">×</button>' +
        "</span></li>";
    });
    els.lines.innerHTML = h;
    els.gfLabel.textContent = s("gf", { x: money(GF) });
    els.totalLabel.textContent = s("total");
    els.total.textContent = money(price());
    els.save.textContent = s("save");
    if (view) view.update(counts);
    if (els.cap) {
      var n = totalCount();
      els.cap.textContent = (n ? (n === 1 ? s("oneIng") : s("nIng", { n: n })) : s("noIng")) + " · " + money(price());
    }
    buttons.forEach(function (b) {
      var id = b.getAttribute("data-ing"), n = counts[id] || 0;
      b.classList.toggle("is-on", n > 0);
      b.setAttribute("aria-pressed", n > 0 ? "true" : "false");
      var badge = b.querySelector(".ing-btn__n");
      if (n > 0) {
        if (!badge) { badge = document.createElement("span"); badge.className = "ing-btn__n"; badge.setAttribute("data-i18n-skip", ""); b.appendChild(badge); }
        badge.textContent = "×" + n;
      } else if (badge) badge.remove();
    });
  }
  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function save() {
    var n = totalCount();
    if (!n) return say(s("min"));
    var ing = [], ingN = [];
    order.forEach(function (id) {
      for (var i = 0; i < (counts[id] || 0); i++) { ing.push(id); ingN.push(meta[id]); }
    });
    var gf = !!els.gf.checked;
    var key = "custom|" + (gf ? "gf" : "") + "|" + ing.slice().sort().join(",");
    var data = { mode: "delivery", cart: [], customer: {}, pay: {} };
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { var d = JSON.parse(raw); if (d && typeof d === "object") data = d; }
      if (!Array.isArray(data.cart)) data.cart = [];
      var found = data.cart.filter(function (l) { return l.key === key; })[0];
      if (found) found.qty = Math.min((found.qty || 1) + 1, 99);
      else data.cart.push({ key: key, id: CUSTOM_ID, qty: 1, gf: gf, note: "", ing: ing, ingN: ingN });
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      return say(s("err"));
    }
    /* la pizza queda en el pedido y el creador se vacía para hacer otra */
    counts = {};
    els.gf.checked = false;
    render();
    say(s("saved"));
    paintOrder();
    /* de vuelta al menú de pedir, en la sección de pizzas: ahí puede elegir otra pizza o crear otra */
    els.save.disabled = true;
    setTimeout(function () { location.href = "pedido.html#cat-pizzas"; }, 900);
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest(".ing-btn, [data-add], [data-sub], [data-drop], [data-cp-save]") : null;
    if (!t) return;
    if (t.classList.contains("ing-btn")) return add(t.getAttribute("data-ing"));
    if (t.hasAttribute("data-add")) return add(t.getAttribute("data-add"));
    if (t.hasAttribute("data-sub")) return sub(t.getAttribute("data-sub"));
    if (t.hasAttribute("data-drop")) return drop(t.getAttribute("data-drop"));
    if (t.hasAttribute("data-cp-save")) return save();
  });
  els.gf.addEventListener("change", render);
  document.addEventListener("sal:lang", function () { render(); paintOrder(); });
  /* al volver con «atrás» o si el carrito cambia en otra pestaña */
  window.addEventListener("pageshow", function () { els.save.disabled = false; paintOrder(); });
  window.addEventListener("storage", function (e) { if (e.key === STORE_KEY) paintOrder(); });
  render();
  paintOrder();
})();
