/* Registro de pedidos (registro.html): lee lo que guarda pedido.js en localStorage */
(function () {
  "use strict";

  var LOG_KEY = "salicornia_registro_v1";
  var METHODS = {
    cash: "Efectivo",
    card: "Tarjeta al recibir",
    "online-card": "Tarjeta online",
    "google-pay": "Google Pay",
    "apple-pay": "Apple Pay",
    bizum: "Bizum"
  };
  var view = { period: "day", offset: 0, method: "" };

  var $ = function (sel) { return document.querySelector(sel); };
  var els = {
    tabs: document.querySelectorAll("[data-period]"),
    nav: $("[data-nav]"),
    range: $("[data-range]"),
    method: $("[data-method]"),
    stats: $("[data-stats]"),
    split: $("[data-split]"),
    list: $("[data-list]"),
    clear: $("[data-clear]"),
    exportBtn: $("[data-export]"),
    exportInfo: $("[data-export-info]")
  };
  var current = [];

  var eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  var fmtDay = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  var fmtShort = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
  var fmtMonth = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
  var fmtStamp = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function readLog() {
    try {
      var log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      return Array.isArray(log) ? log : [];
    } catch (e) { return []; }
  }

  /* [inicio, fin) del periodo elegido */
  function range() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth(), d = now.getDate(), o = view.offset;
    var a, b;
    if (view.period === "day") {
      a = new Date(y, m, d + o); b = new Date(y, m, d + o + 1);
    } else if (view.period === "week") {
      var monday = d - ((now.getDay() + 6) % 7) + o * 7;
      a = new Date(y, m, monday); b = new Date(y, m, monday + 7);
    } else if (view.period === "month") {
      a = new Date(y, m + o, 1); b = new Date(y, m + o + 1, 1);
    } else if (view.period === "quarter") {
      var q = Math.floor(m / 3) * 3 + o * 3;
      a = new Date(y, q, 1); b = new Date(y, q + 3, 1);
    } else {
      return null;
    }
    return { a: a, b: b };
  }

  function rangeLabel(r) {
    if (!r) return "Todos los pedidos";
    if (view.period === "day") {
      if (view.offset === 0) return "Hoy, " + fmtShort.format(r.a) + " " + r.a.getFullYear();
      if (view.offset === -1) return "Ayer, " + fmtShort.format(r.a) + " " + r.a.getFullYear();
      return cap(fmtDay.format(r.a));
    }
    if (view.period === "week") {
      var end = new Date(r.b.getTime() - 1);
      var from = r.a.getMonth() === end.getMonth() ? String(r.a.getDate()) : fmtShort.format(r.a);
      return from + " – " + fmtShort.format(end) + " " + end.getFullYear();
    }
    if (view.period === "month") return cap(fmtMonth.format(r.a));
    var last = new Date(r.b.getTime() - 1);
    return "T" + (Math.floor(r.a.getMonth() / 3) + 1) + " " + r.a.getFullYear() + " · " +
      fmtShort.format(r.a).split(" ").pop() + " – " + fmtShort.format(last).split(" ").pop();
  }

  function render() {
    var r = range();
    els.tabs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-period") === view.period)); });
    els.nav.hidden = !r;
    els.range.textContent = rangeLabel(r);
    if (r) els.nav.querySelector('[data-step="1"]').disabled = view.offset >= 0;

    var log = readLog();
    els.clear.hidden = !log.length;
    var inRange = log.filter(function (o) {
      var t = new Date(o.at);
      return !r || (t >= r.a && t < r.b);
    });
    var rows = inRange.filter(function (o) { return !view.method || o.method === view.method; });
    rows.sort(function (x, y) { return x.at < y.at ? 1 : -1; });
    current = rows;
    els.exportBtn.disabled = !rows.length;
    els.exportInfo.textContent = rows.length
      ? rows.length + (rows.length === 1 ? " pedido" : " pedidos") + " · " + rangeLabel(r) + " · " + (view.method ? METHODS[view.method] : "todos los pagos")
      : "";

    var total = rows.reduce(function (s, o) { return s + (o.total || 0); }, 0);
    var items = rows.reduce(function (s, o) {
      return s + (o.items || []).reduce(function (n, i) { return n + (i.qty || 0); }, 0);
    }, 0);
    var delivery = rows.filter(function (o) { return o.mode === "delivery"; }).length;
    els.stats.innerHTML =
      stat("Pedidos", String(rows.length)) +
      stat("Facturado", eur.format(total)) +
      stat("Ticket medio", rows.length ? eur.format(total / rows.length) : "—") +
      stat("Productos", String(items)) +
      stat("Domicilio / recoger", delivery + " / " + (rows.length - delivery));

    /* reparto por método: siempre sobre el periodo completo, resaltando el filtrado */
    var by = {};
    inRange.forEach(function (o) {
      var k = o.method || "cash";
      by[k] = by[k] || { n: 0, sum: 0 };
      by[k].n++;
      by[k].sum += o.total || 0;
    });
    var all = inRange.reduce(function (s, o) { return s + (o.total || 0); }, 0);
    var keys = Object.keys(METHODS).filter(function (k) { return by[k]; });
    els.split.innerHTML = keys.length
      ? '<ul class="rg-bars">' + keys.map(function (k) {
          var pct = all ? (by[k].sum / all) * 100 : 0;
          var on = !view.method || view.method === k;
          return '<li class="rg-bar' + (on ? "" : " is-dim") + '"><button type="button" data-pick="' + k + '">' +
            '<span class="rg-bar__name">' + esc(METHODS[k]) + '</span>' +
            '<span class="rg-bar__track"><span class="rg-bar__fill" style="width:' + pct.toFixed(1) + '%"></span></span>' +
            '<span class="rg-bar__val">' + eur.format(by[k].sum) + ' · ' + by[k].n + (by[k].n === 1 ? " pedido" : " pedidos") + "</span>" +
            "</button></li>";
        }).join("") + "</ul>"
      : '<p class="rg-empty">Sin pagos en este periodo.</p>';

    els.list.innerHTML = rows.length
      ? '<div class="rg-table" role="table" aria-label="Pedidos">' +
        '<div class="rg-row rg-row--head" role="row">' +
        '<span role="columnheader">Fecha</span><span role="columnheader">Pedido</span><span role="columnheader">Tipo</span>' +
        '<span role="columnheader">Pago</span><span role="columnheader" class="rg-num">Total</span></div>' +
        rows.map(row).join("") + "</div>"
      : '<p class="rg-empty">No hay pedidos' + (view.method ? " con " + esc(METHODS[view.method]) : "") + " en este periodo. " +
        '<a href="pedido.html">Haz un pedido</a> y aparecerá aquí.</p>';
  }

  function stat(label, value) {
    return '<div class="rg-stat"><span class="rg-stat__l">' + esc(label) + '</span><span class="rg-stat__v">' + esc(value) + "</span></div>";
  }

  function row(o) {
    var lines = (o.items || []).map(function (i) {
      return "<li>" + i.qty + "× " + esc(i.name) + (i.gf ? " (sin gluten)" : "") + '<span>' + eur.format((i.price || 0) * i.qty) + "</span></li>";
    }).join("");
    var extra = [];
    if (o.envaseCost) extra.push("<li>Envases<span>" + eur.format(o.envaseCost) + "</span></li>");
    if (o.fee) extra.push("<li>Envío<span>" + eur.format(o.fee) + "</span></li>");
    return '<details class="rg-item" role="row"><summary class="rg-row">' +
      '<span role="cell">' + esc(fmtStamp.format(new Date(o.at))) + "</span>" +
      '<span role="cell" class="rg-ref">' + esc(o.ref || "—") + (o.demo ? ' <em class="rg-tag">simulado</em>' : "") + "</span>" +
      '<span role="cell">' + (o.mode === "delivery" ? "Domicilio" : "Recoger") + "</span>" +
      '<span role="cell">' + esc(METHODS[o.method] || o.method || "—") + "</span>" +
      '<span role="cell" class="rg-num">' + eur.format(o.total || 0) + "</span></summary>" +
      '<div class="rg-detail">' + (o.customer ? "<p>Cliente: " + esc(o.customer) + "</p>" : "") +
      "<ul>" + lines + extra.join("") + "</ul></div></details>";
  }

  els.tabs.forEach(function (b) {
    b.addEventListener("click", function () {
      view.period = b.getAttribute("data-period");
      view.offset = 0;
      render();
    });
  });
  els.nav.addEventListener("click", function (e) {
    var step = e.target.closest("[data-step]");
    if (step) view.offset += Number(step.getAttribute("data-step"));
    else if (e.target.closest("[data-today]")) view.offset = 0;
    else return;
    render();
  });
  els.method.addEventListener("change", function () {
    view.method = els.method.value;
    render();
  });
  els.split.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pick]");
    if (!b) return;
    var k = b.getAttribute("data-pick");
    view.method = view.method === k ? "" : k;
    els.method.value = view.method;
    render();
  });

  /* CSV para Excel en español: separador ";", coma decimal y BOM para los acentos */
  function num(n) { return (n || 0).toFixed(2).replace(".", ","); }
  function cell(v) {
    v = String(v == null ? "" : v);
    return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function exportCSV() {
    if (!current.length) return;
    var head = ["Fecha", "Hora", "Pedido", "Simulado", "Tipo", "Método de pago", "Productos", "Unidades", "Subtotal", "Envases", "Envío", "Total", "Cliente"];
    var lines = [head.join(";")];
    var sum = 0;
    current.slice().reverse().forEach(function (o) {
      var d = new Date(o.at);
      var items = o.items || [];
      sum += o.total || 0;
      lines.push([
        pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(),
        pad(d.getHours()) + ":" + pad(d.getMinutes()),
        o.ref || "",
        o.demo ? "Sí" : "No",
        o.mode === "delivery" ? "Domicilio" : "Recoger",
        METHODS[o.method] || o.method || "",
        items.map(function (i) { return i.qty + "x " + i.name + (i.gf ? " (sin gluten)" : ""); }).join(" | "),
        items.reduce(function (n, i) { return n + (i.qty || 0); }, 0),
        num(o.subtotal), num(o.envaseCost), num(o.fee), num(o.total),
        o.customer || ""
      ].map(cell).join(";"));
    });
    lines.push(["", "", "", "", "", "", "", "", "", "", "TOTAL", num(sum), ""].join(";"));

    var r = range();
    var tag = view.period === "all" ? "todo" : view.period === "day"
      ? r.a.getFullYear() + "-" + pad(r.a.getMonth() + 1) + "-" + pad(r.a.getDate())
      : { week: "semana-", month: "mes-", quarter: "trimestre-" }[view.period] + r.a.getFullYear() + "-" + pad(r.a.getMonth() + 1) + "-" + pad(r.a.getDate());
    var name = "salicornia-pedidos-" + tag + (view.method ? "-" + view.method : "") + ".csv";

    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  els.exportBtn.addEventListener("click", exportCSV);

  var armed = null;
  els.clear.addEventListener("click", function () {
    if (!armed) {
      els.clear.textContent = "Pulsa otra vez para borrar todo";
      els.clear.classList.add("is-armed");
      armed = setTimeout(function () {
        armed = null;
        els.clear.textContent = "Borrar registro";
        els.clear.classList.remove("is-armed");
      }, 4000);
      return;
    }
    clearTimeout(armed);
    armed = null;
    try { localStorage.removeItem(LOG_KEY); } catch (e) { /* noop */ }
    els.clear.textContent = "Borrar registro";
    els.clear.classList.remove("is-armed");
    render();
  });

  /* pedidos hechos en otra pestaña aparecen solos */
  window.addEventListener("storage", function (e) { if (e.key === LOG_KEY || e.key === null) render(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });

  render();
})();
