/* =========================================================================
   SALICORNIA — panel del restaurante, VERSIÓN DE DEMOSTRACIÓN
   Todo ocurre en el navegador con pedidos de ejemplo: no hay servidor ni datos
   reales. Replica lo que hace el panel de verdad (/admin/) para poder enseñarlo
   con un enlace.
   ========================================================================= */
(function () {
  "use strict";

  var KEY = "salicornia_panel_demo_v1";
  var MIN = 60000;
  var STATUS = {
    nuevo: "Nuevo", aceptado: "Aceptado", preparando: "En preparación",
    listo: "Listo / en reparto", entregado: "Entregado", cancelado: "Cancelado"
  };
  var PAY = { cash: "Efectivo", card: "Tarjeta al recibir", bizum: "Bizum", "online-card": "Tarjeta online" };
  var TIMES = { delivery: [30, 45, 60], pickup: [15, 20, 30] };
  var WINDOW = { delivery: [35, 50], pickup: [20, 30] };

  var view = "pedidos";
  var filter = "activos";
  var state = null;
  var accepting = true;
  var sharing = {};
  var sound = false;
  var audio = null;
  var flashId = 0;

  /* --- utilidades ------------------------------------------------------------------ */
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function money(n) { return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
  function hhmm(ms) { var d = new Date(ms); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(t) {
    var el = $("#toast");
    el.textContent = t;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.hidden = true; }, 2800);
  }
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach(function (t) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = "sine"; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.4, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.2);
        o.connect(g).connect(audio.destination);
        o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.22);
      });
    } catch (e) { /* sin audio */ }
  }

  /* --- datos de ejemplo ------------------------------------------------------------- */
  var ENVASE = 0.5, ENVIO = 4;
  function item(q, name, unit, o) { o = o || {}; return { q: q, name: name, unit: unit, note: o.note || "", gf: !!o.gf, pack: o.pack !== false }; }
  function mk(o) {
    var sub = 0, packs = 0;
    o.items.forEach(function (it) { sub += it.q * it.unit; if (it.pack) packs += it.q; });
    o.envases = packs;
    o.total = sub + packs * ENVASE + (o.mode === "delivery" ? ENVIO : 0);
    o.sub = sub;
    return o;
  }
  var TEMPLATES = [
    function (n) {
      return mk({ ref: "SAL-" + n, mode: "delivery", asap: true, name: "Carla F.", phone: "612 345 678", addr: "Passeig Marítim 8, 3º 2ª, 08330 Premià de Mar", km: 0.8,
        rider: "Timbre roto: llamar al móvil", pay: "card", paid: false, allergies: "",
        items: [item(1, "Pizza Burrata y Parma", 16), item(1, "Tiramisú", 7, { pack: false })] });
    },
    function (n) {
      return mk({ ref: "SAL-" + n, mode: "delivery", asap: true, name: "Joan T.", phone: "654 111 222", addr: "Carrer de Sant Miquel 21, 08330 Premià de Mar", km: 1.4,
        rider: "", pay: "cash", cashWith: "50", paid: false, allergies: "Celíaco: todo sin gluten",
        items: [item(1, "Crea tu pizza", 15.7, { note: "Ingredientes: Mozzarella fior di latte ×2, Albahaca, Rúcula", gf: true }), item(1, "Coca-Cola Zero", 2.9, { pack: false })] });
    },
    function (n) {
      return mk({ ref: "SAL-" + n, mode: "pickup", asap: true, name: "Nuria G.", phone: "600 987 654", addr: "", km: null, rider: "", pay: "cash", paid: false, allergies: "",
        items: [item(2, "Pizza Margherita", 11), item(1, "Gnocchi alla Sorrentina", 15)] });
    }
  ];
  function sample() {
    var now = Date.now();
    var a = mk({ ref: "SAL-7KQ2XM", mode: "delivery", asap: true, status: "nuevo", created: now - 2 * MIN, name: "Laura M.", phone: "633 210 987",
      addr: "Carrer de la Terra Alta 12, 08330 Premià de Mar", km: 0.5, rider: "", pay: "card", paid: false, allergies: "Alergia a los frutos secos",
      items: [item(1, "Crea tu pizza", 12.4, { note: "Ingredientes: Burrata, Rúcula, Jamón de Parma" }), item(1, "Tiramisú", 7, { pack: false })] });
    var b = mk({ ref: "SAL-4RTP9C", mode: "pickup", asap: false, whenText: "Hoy a las 21:00", whenMs: now + 40 * MIN, status: "nuevo", created: now - 9 * MIN, name: "Marc P.", phone: "677 456 123",
      addr: "", km: null, rider: "", pay: "cash", paid: false, allergies: "", items: [item(2, "Pizza Margherita", 11)] });
    var c = mk({ ref: "SAL-A82LZD", mode: "delivery", asap: true, status: "aceptado", created: now - 6 * MIN, eta: now + 28 * MIN, name: "Ana R.", phone: "622 345 111",
      addr: "Carrer de Mar 35, 08330 Premià de Mar", km: 1.1, rider: "Portal azul, 2º", pay: "bizum", paid: true, allergies: "",
      items: [item(1, "Ensalada Caprese", 13.5, { gf: true, note: "Pan sin gluten", pack: false }), item(1, "Pizza Diavola", 16)] });
    var d = mk({ ref: "SAL-W3NC6B", mode: "delivery", asap: true, status: "preparando", created: now - 21 * MIN, eta: now + 15 * MIN, name: "Jordi S.", phone: "699 222 333",
      addr: "Avinguda de Joan Carles I 40, 08330 Premià de Mar", km: 2.3, rider: "", pay: "cash", cashWith: "30", paid: false, allergies: "",
      items: [item(1, "Picio alla Carbonara", 18, { note: "Pasta: Tagliatelle" }), item(1, "Coca-Cola", 2.9, { pack: false })] });
    var e = mk({ ref: "SAL-Q5HJ1V", mode: "delivery", asap: true, status: "listo", created: now - 33 * MIN, eta: now + 6 * MIN, name: "Eva C.", phone: "611 808 909",
      addr: "Carrer del Doctor Marti Casas 9, 08330 Premià de Mar", km: 0.9, rider: "", pay: "online-card", paid: true, allergies: "",
      items: [item(1, "Pizza Quattro Formaggi (blanca)", 17, { gf: true, note: "" }), item(1, "Tabla de embutidos italianos", 16, { pack: false })] });
    var f = mk({ ref: "SAL-M9PD4T", mode: "pickup", asap: true, status: "entregado", created: now - 85 * MIN, doneAt: now - 52 * MIN, name: "Pere V.", phone: "666 000 111",
      addr: "", km: null, rider: "", pay: "card", paid: false, allergies: "", items: [item(1, "Pizza Marinara", 10), item(1, "Pizza Napoli", 14)] });
    var list = [a, b, c, d, e, f];
    list.forEach(function (o, i) { o.id = i + 1; });
    return list;
  }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && raw.orders && Date.now() - raw.at < 4 * 3600000) return raw.orders;
    } catch (e) { /* noop */ }
    return sample();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), orders: state })); } catch (e) { /* noop */ } }
  function byId(id) { return state.filter(function (o) { return o.id === id; })[0]; }

  /* --- hora prevista --------------------------------------------------------------------- */
  function etaText(o) {
    if (o.status === "cancelado" || o.status === "entregado") return "";
    var label = o.mode === "delivery" ? "Llegada prevista " : "Listo hacia ";
    if (o.eta) return '<span class="a-order__eta">' + label + hhmm(o.eta) + " ✓</span>";
    if (!o.asap) return "";
    var w = WINDOW[o.mode];
    return '<span class="a-order__eta">' + label + hhmm(o.created + w[0] * MIN) + "–" + hhmm(o.created + w[1] * MIN) + " (estimada)</span>";
  }
  function whenText(o) { return o.asap ? "Lo antes posible" : o.whenText; }

  /* --- acciones ------------------------------------------------------------------------------ */
  function flow(o) {
    var f = o.mode === "delivery"
      ? { nuevo: ["aceptado", "Aceptar"], aceptado: ["preparando", "A cocina"], preparando: ["listo", "Sale en reparto"], listo: ["entregado", "Entregado"] }
      : { nuevo: ["aceptado", "Aceptar"], aceptado: ["preparando", "A cocina"], preparando: ["listo", "Listo para recoger"], listo: ["entregado", "Recogido"] };
    return f[o.status] || null;
  }
  function setStatus(o, st, minutes) {
    o.status = st;
    if (st === "aceptado" && minutes) o.eta = Date.now() + minutes * MIN;
    if (st === "entregado") { o.doneAt = Date.now(); delete sharing[o.id]; }
    if (st !== "listo") delete sharing[o.id];
    save();
  }

  /* --- vistas ----------------------------------------------------------------------------------- */
  function card(o) {
    var created = hhmm(o.created);
    var h = '<article class="a-order a-order--' + o.status + (o.id === flashId ? " is-new" : "") + '" data-id="' + o.id + '">' +
      '<header class="a-order__head"><div><strong class="a-order__ref">' + esc(o.ref) + '</strong>' +
      '<span class="a-badge a-badge--' + o.status + '">' + STATUS[o.status] + '</span>' +
      '<span class="a-badge a-badge--mode">' + (o.mode === "delivery" ? "Domicilio" : "Recoger") + "</span></div>" +
      '<span class="a-order__time">Hoy ' + created + "</span></header>" +
      '<p class="a-order__when"><strong>' + esc(whenText(o)) + "</strong>" + etaText(o) + "</p>" +
      '<p class="a-order__who">' + esc(o.name) + ' · <a href="tel:' + esc(o.phone.replace(/\s/g, "")) + '">' + esc(o.phone) + "</a></p>";
    if (o.mode === "delivery") {
      h += '<p class="a-order__addr">' + esc(o.addr) + ' · <a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.addr) + '" target="_blank" rel="noopener">Ver en el mapa</a>' +
        (o.km != null ? " <small>(" + o.km.toLocaleString("es-ES", { minimumFractionDigits: 1 }) + " km)</small>" : "") + "</p>";
      if (o.rider) h += '<p class="a-order__note">Indicaciones: ' + esc(o.rider) + "</p>";
    }
    h += '<ul class="a-order__items">';
    o.items.forEach(function (it) {
      h += "<li><span>" + it.q + "×</span><span>" + esc(it.name) + (it.gf ? ' <b class="a-gf">SIN GLUTEN</b>' : "") +
        (it.note ? "<small>" + esc(it.note) + "</small>" : "") + "</span><span>" + money(it.q * it.unit) + "</span></li>";
    });
    h += "</ul>";
    if (o.allergies) h += '<p class="a-order__allergy">Alergias: ' + esc(o.allergies) + "</p>";
    h += '<p class="a-order__total"><span>' + PAY[o.pay] + (o.cashWith ? " (paga con " + esc(o.cashWith) + " €)" : "") +
      (o.paid ? ' <b class="a-paid">PAGADO</b>' : ' <b class="a-unpaid">cobrar</b>') + "</span><strong>" + money(o.total) + "</strong></p>";
    h += '<div class="a-order__actions">';
    var next = flow(o);
    if (next && o.status === "nuevo" && o.asap) {
      TIMES[o.mode].forEach(function (m, i) {
        h += '<button type="button" class="a-btn ' + (i === 0 ? "a-btn--primary" : "a-btn--ghost") + '" data-act="accept" data-min="' + m + '">Aceptar · ' + m + " min</button>";
      });
    } else if (next) {
      h += '<button type="button" class="a-btn a-btn--primary" data-act="next">' + next[1] + "</button>";
    }
    if (["aceptado", "preparando", "listo"].indexOf(o.status) !== -1 && o.asap) {
      h += '<button type="button" class="a-btn a-btn--ghost" data-act="delay" title="Avisa al cliente de que tardará 10 minutos más">+10 min</button>';
    }
    h += '<button type="button" class="a-btn a-btn--ghost" data-act="ticket">Ticket</button>';
    if (o.status !== "entregado" && o.status !== "cancelado") h += '<button type="button" class="a-btn a-btn--danger" data-act="cancel">Cancelar</button>';
    return h + "</div></article>";
  }

  function viewPedidos() {
    var active = ["nuevo", "aceptado", "preparando", "listo"];
    var list = state.filter(function (o) {
      if (filter === "activos") return active.indexOf(o.status) !== -1;
      return true;
    });
    list.sort(function (a, b) { return filter === "activos" ? a.created - b.created : b.created - a.created; });
    var tabs = { activos: "En curso", hoy: "Hoy", historial: "Historial" };
    var h = '<div class="a-toolbar"><nav class="a-tabs" aria-label="Filtro">' +
      Object.keys(tabs).map(function (k) { return '<button type="button" data-filter="' + k + '"' + (k === filter ? ' aria-current="page"' : "") + ">" + tabs[k] + "</button>"; }).join("") +
      '</nav><button type="button" class="a-btn a-btn--primary d-sim" data-sim>+ Simular pedido nuevo</button>' +
      '<div class="a-live-opts"><label><input type="checkbox" data-sound' + (sound ? " checked" : "") + "> Sonido</label></div></div>";
    h += '<div class="a-orders">' + (list.length ? list.map(card).join("") : '<p class="a-empty">No hay pedidos en curso. Pulsa «Simular pedido nuevo» para ver cómo llega uno.</p>') + "</div>";
    h += '<p class="a-muted a-live-note">En el panel real la lista se actualiza sola cada 15 segundos y los pedidos nuevos suenan.</p>';
    return h;
  }

  function viewReparto() {
    var list = state.filter(function (o) { return o.mode === "delivery" && (o.status === "preparando" || o.status === "listo"); });
    var n = Object.keys(sharing).length;
    var h = '<h1 class="a-h1">Reparto</h1><p class="a-muted">Pulsa «Compartir mi ubicación» en cada pedido que lleves. El cliente verá en el mapa por dónde vas. ' +
      "Mantén esta pantalla abierta con la pantalla encendida mientras repartes.</p>";
    h += '<div class="a-rider" style="display:grid;gap:.9rem;max-width:640px"><p class="a-rider__status" role="status">' +
      (n ? "Compartiendo ubicación con " + n + (n === 1 ? " pedido" : " pedidos") + " (en la demo no se envía nada)." : "Sin compartir ubicación.") + "</p>";
    if (!list.length) return h + '<p class="a-empty">No hay pedidos a domicilio en cocina ni en reparto.</p></div>';
    list.forEach(function (o) {
      var on = !!sharing[o.id];
      h += '<article class="a-order a-order--' + o.status + (on ? " is-sharing" : "") + '" data-id="' + o.id + '">' +
        '<header class="a-order__head"><div><strong class="a-order__ref">' + esc(o.ref) + '</strong><span class="a-badge a-badge--' + o.status + '">' + STATUS[o.status] + "</span></div>" +
        '<span class="a-order__time">' + esc(whenText(o)) + (o.eta ? " · llegada " + hhmm(o.eta) : "") + "</span></header>" +
        '<p class="a-order__who">' + esc(o.name) + ' · <a href="tel:' + esc(o.phone.replace(/\s/g, "")) + '">' + esc(o.phone) + "</a></p>" +
        '<p class="a-order__addr">' + esc(o.addr) + " <small>(" + o.km.toLocaleString("es-ES", { minimumFractionDigits: 1 }) + " km)</small></p>" +
        (o.rider ? '<p class="a-order__note">Indicaciones: ' + esc(o.rider) + "</p>" : "") +
        '<p class="a-order__total"><span>' + PAY[o.pay] + (o.cashWith ? " (paga con " + esc(o.cashWith) + " €)" : "") + (o.paid ? ' <b class="a-paid">PAGADO</b>' : ' <b class="a-unpaid">cobrar</b>') +
        "</span><strong>" + money(o.total) + "</strong></p>" +
        '<div class="a-order__actions"><a class="a-btn a-btn--ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(o.addr) + '">Cómo llegar</a>';
      if (o.status === "listo") {
        h += '<button type="button" class="a-btn ' + (on ? "a-btn--ghost" : "a-btn--primary") + '" data-act="share">' + (on ? "Dejar de compartir" : "Compartir mi ubicación") + "</button>" +
          '<button type="button" class="a-btn a-btn--ghost" data-act="next">Entregado</button>';
      } else {
        h += '<button type="button" class="a-btn a-btn--primary" data-act="next">Sale en reparto</button>';
      }
      h += "</div></article>";
    });
    return h + "</div>";
  }

  function viewInformes() {
    var ok = state.filter(function (o) { return o.status !== "cancelado"; });
    var total = ok.reduce(function (a, o) { return a + o.total; }, 0);
    var n = ok.length, avg = n ? total / n : 0, base = total / 1.1;
    function sum(fn) { var m = {}; ok.forEach(function (o) { var k = fn(o); m[k] = m[k] || { n: 0, t: 0 }; m[k].n++; m[k].t += o.total; }); return m; }
    var byPay = sum(function (o) { return PAY[o.pay]; }), byMode = sum(function (o) { return o.mode === "delivery" ? "A domicilio" : "Recoger en local"; });
    function rows(m) { return Object.keys(m).map(function (k) { return "<tr><td>" + esc(k) + "</td><td>" + m[k].n + "</td><td>" + money(m[k].t) + "</td></tr>"; }).join(""); }
    var prod = {};
    ok.forEach(function (o) { o.items.forEach(function (it) { prod[it.name] = prod[it.name] || { q: 0, t: 0 }; prod[it.name].q += it.q; prod[it.name].t += it.q * it.unit; }); });
    var h = '<h1 class="a-h1">Hoy (datos de ejemplo)</h1><section class="a-kpis">' +
      '<div class="a-kpi"><span>Ventas (IVA incl.)</span><strong>' + money(total) + "</strong></div>" +
      '<div class="a-kpi"><span>Pedidos</span><strong>' + n + "</strong></div>" +
      '<div class="a-kpi"><span>Ticket medio</span><strong>' + money(avg) + "</strong></div>" +
      '<div class="a-kpi"><span>Base imponible</span><strong>' + money(base) + "</strong><small>IVA 10%: " + money(total - base) + "</small></div></section>";
    h += '<div class="a-grid2" style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><section class="a-card" style="background:#fff;border:1px solid var(--line);padding:1rem">' +
      '<h2>Por forma de pago</h2><table class="a-table" style="width:100%"><thead><tr><th align="left">Forma de pago</th><th align="left">Pedidos</th><th align="left">Importe</th></tr></thead><tbody>' + rows(byPay) + "</tbody></table>" +
      '<h2 style="margin-top:1rem">Por tipo</h2><table class="a-table" style="width:100%"><tbody>' + rows(byMode) + "</tbody></table></section>" +
      '<section class="a-card" style="background:#fff;border:1px solid var(--line);padding:1rem"><h2>Productos vendidos</h2><table class="a-table" style="width:100%"><thead><tr><th align="left">Plato</th><th align="left">Uds.</th><th align="left">Importe</th></tr></thead><tbody>' +
      Object.keys(prod).map(function (k) { return "<tr><td>" + esc(k) + "</td><td>" + prod[k].q + "</td><td>" + money(prod[k].t) + "</td></tr>"; }).join("") + "</tbody></table></section></div>";
    h += '<p class="a-muted">En el panel real hay informes por día, semana, mes, trimestre y año, separados por forma de pago, con IVA y descarga en Excel. Es un informe de ventas, no una factura.</p>';
    return h;
  }

  function viewAjustes() {
    return '<h1 class="a-h1">Ajustes</h1><section class="a-card" style="background:#fff;border:1px solid var(--line);padding:1rem;max-width:640px"><p>En el panel real, aquí se cambia la contraseña, se ve qué servicios están activos (pago online, correo, asistente) ' +
      "y se borran los datos personales de pedidos antiguos (se borran solos a los 12 meses).</p><p class=\"a-muted\">No disponible en la demo.</p></section>";
  }

  function render() {
    var app = $("#app");
    app.innerHTML = view === "reparto" ? viewReparto() : view === "informes" ? viewInformes() : view === "ajustes" ? viewAjustes() : viewPedidos();
    document.querySelectorAll("[data-view]").forEach(function (b) {
      if (b.getAttribute("data-view") === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    var pill = $("[data-accepting]");
    pill.className = "a-pill " + (accepting ? "a-pill--on" : "a-pill--off");
    pill.textContent = accepting ? "Pedidos web: abiertos" : "Pedidos web: EN PAUSA";
    flashId = 0;
  }

  function ticketText(o) {
    var L = ["SALICORNIA", "Pizza i Pasta", "--------------------------------", o.ref + " · " + (o.mode === "delivery" ? "A DOMICILIO" : "RECOGER"),
      "Hora: " + whenText(o)];
    var e = etaText(o).replace(/<[^>]+>/g, "").replace(" ✓", "");
    if (e) L.push(e);
    if (o.mode === "delivery") { L.push(o.addr); if (o.rider) L.push("Indicaciones: " + o.rider); }
    L.push("--------------------------------");
    o.items.forEach(function (it) {
      L.push(it.q + " x " + it.name + (it.gf ? " (SIN GLUTEN)" : "") + "  " + money(it.q * it.unit));
      if (it.note) L.push("   " + it.note);
    });
    L.push("--------------------------------");
    if (o.envases) L.push("Envases (" + o.envases + "): " + money(o.envases * ENVASE));
    if (o.mode === "delivery") L.push("Envío: " + money(ENVIO));
    L.push("TOTAL: " + money(o.total), "Pago: " + PAY[o.pay] + (o.paid ? " - PAGADO" : " - cobrar"));
    if (o.allergies) L.push("ALERGIAS: " + o.allergies);
    L.push("", o.name + " · " + o.phone, "", "(Ticket de ejemplo)");
    return L.join("\n");
  }

  /* --- eventos --------------------------------------------------------------------------------------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button, a") : null;
    if (!t) return;
    var v = t.getAttribute("data-view");
    if (v) { view = v; render(); return; }
    var f = t.getAttribute("data-filter");
    if (f) { filter = f; render(); return; }
    if (t.hasAttribute("data-reset")) { try { localStorage.removeItem(KEY); } catch (x) { /* noop */ } state = sample(); sharing = {}; save(); render(); toast("Demo reiniciada"); return; }
    if (t.hasAttribute("data-accepting")) { accepting = !accepting; render(); toast(accepting ? "Pedidos online activados." : "Pedidos online en pausa: la web no acepta pedidos nuevos."); return; }
    if (t.hasAttribute("data-logout")) { toast("En la demo no hay sesión: aquí se saldría del panel."); return; }
    if (t.hasAttribute("data-close-ticket")) { $("#ticket").close(); return; }
    if (t.hasAttribute("data-sim")) {
      var tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      var o = tpl(Math.random().toString(36).slice(2, 8).toUpperCase());
      o.id = Math.max.apply(null, state.map(function (x) { return x.id; })) + 1;
      o.status = "nuevo"; o.created = Date.now();
      state.push(o); flashId = o.id; save(); view = "pedidos"; filter = "activos"; render();
      if (sound) beep();
      toast("Pedido nuevo: " + o.ref + " (" + o.name + ")");
      return;
    }
    var act = t.getAttribute("data-act");
    if (!act) return;
    var card = t.closest("[data-id]");
    var order = card && byId(Number(card.getAttribute("data-id")));
    if (!order) return;
    if (act === "accept") { setStatus(order, "aceptado", Number(t.getAttribute("data-min"))); toast("Aceptado: el cliente ya ve que llega a las " + hhmm(order.eta)); }
    else if (act === "next") { var nx = flow(order); if (nx) { setStatus(order, nx[0]); toast(order.ref + " → " + STATUS[nx[0]]); } }
    else if (act === "delay") { order.eta = Math.max(Date.now(), order.eta || (order.created + WINDOW[order.mode][1] * MIN)) + 10 * MIN; save(); toast("Hora retrasada 10 minutos: el cliente ya lo ve."); }
    else if (act === "ticket") { $("#ticket-text").textContent = ticketText(order); $("#ticket").showModal(); return; }
    else if (act === "cancel") { if (!window.confirm("¿Cancelar el pedido " + order.ref + "?")) return; setStatus(order, "cancelado"); toast("Pedido cancelado."); }
    else if (act === "share") { if (sharing[order.id]) delete sharing[order.id]; else sharing[order.id] = true; }
    render();
  });
  document.addEventListener("change", function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute("data-sound")) { sound = e.target.checked; if (sound) beep(); }
  });

  state = load();
  save();
  render();
})();
