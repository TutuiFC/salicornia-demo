/* =========================================================================
   SALICORNIA — seguimiento del pedido
   seguimiento.html?ref=SAL-XXXX&t=TOKEN (el cliente lo recibe al pedir).
   · Hora prevista de llegada (o de recogida) con cuenta atrás y barra de progreso.
     Fuente: estimación al pedir → hora que confirma el restaurante → repartidor en directo.
   · Mapa (Leaflet + OpenStreetMap) con el local, la dirección y el repartidor, que se mueve
     suave y deja su recorrido.
   · Aviso (texto destacado, título de la pestaña y vibración) cuando cambia el estado.
   ========================================================================= */
(function () {
  "use strict";

  var cfg = (window.SAL_CONFIG && window.SAL_CONFIG.pedidos) || {};
  var API = cfg.api || "api/pedido.php";
  var LAST_KEY = "salicornia_ultimo_v1";

  function q(sel) { return document.querySelector(sel); }
  var els = {
    root: q("[data-sg]"), ref: q("[data-sg-ref]"), msg: q("[data-sg-msg]"), steps: q("[data-sg-steps]"),
    map: q("[data-sg-map]"), addr: q("[data-sg-addr]"),
    eta: q("[data-sg-eta]"), etaLabel: q("[data-sg-eta-label]"), etaTime: q("[data-sg-eta-time]"),
    etaLeft: q("[data-sg-eta-left]"), etaSrc: q("[data-sg-eta-src]"), bar: q("[data-sg-bar]"),
    review: q("[data-sg-review]"), reviewLink: q("[data-sg-review-link]")
  };
  if (!els.root) return;
  var baseTitle = document.title;

  var L10N = {
    es: {
      ref: "Pedido {ref}",
      s_nuevo: "Pedido recibido", s_aceptado: "Pedido aceptado", s_preparando: "En cocina", s_ruta: "En reparto",
      s_listo: "Listo para recoger", s_entregado: "Entregado", s_entregado_p: "Recogido",
      m_nuevo: "Hemos recibido tu pedido. Enseguida lo confirmamos.",
      m_aceptado: "¡Pedido aceptado! Ya tienes hora de llegada.",
      m_aceptado_p: "¡Pedido aceptado! Ya tienes hora de recogida.",
      m_preparando: "Tu pedido está en el horno.",
      m_listo_d_sin: "Tu pedido está listo: el repartidor sale ahora.",
      m_listo_d: "Tu pedido va de camino.",
      m_listo_d_cerca: "¡Tu repartidor está llegando!",
      m_listo_p: "Tu pedido está listo. Puedes pasar a recogerlo a Marina Port Premià.",
      m_entregado: "Pedido entregado. ¡Que aproveche!",
      m_entregado_p: "Pedido recogido. ¡Que aproveche!",
      m_cancelado: "El pedido se ha cancelado. Si tienes dudas, llámanos.",
      m_pendiente_pago: "Falta confirmar el pago de este pedido.",
      lbl_d: "Llegada estimada", lbl_p: "Listo para recoger", lbl_done_d: "Entregado a las", lbl_done_p: "Recogido a las",
      left_min: "en unos {min} min", left_range: "en {a}–{b} min", left_1: "en 1 min", left_now: "en cualquier momento",
      left_late: "va un poco tarde: llegará en breve", left_late_p: "un poco tarde: estará en breve",
      src_estimado: "Estimación según la hora y tu zona. Se ajusta cuando el restaurante confirme.",
      src_restaurante: "Hora confirmada por el restaurante.",
      src_repartidor: "En directo, con la posición del repartidor.",
      src_programado: "Pedido programado para esta hora.",
      title_new: "{msg} · Salicornia",
      review: "¿Qué tal todo? Déjanos tu opinión en Google",
      nada: "No encontramos este pedido. Revisa el enlace que te dimos al pedir o llámanos.",
      err: "No se puede conectar ahora mismo. Lo intentamos de nuevo…",
      rest: "Salicornia", casa: "Tu dirección", rider: "Repartidor",
      attrib: "Mapa © colaboradores de OpenStreetMap"
    },
    ca: {
      ref: "Comanda {ref}",
      s_nuevo: "Comanda rebuda", s_aceptado: "Comanda acceptada", s_preparando: "A la cuina", s_ruta: "En repartiment",
      s_listo: "Llesta per recollir", s_entregado: "Lliurada", s_entregado_p: "Recollida",
      m_nuevo: "Hem rebut la teva comanda. De seguida la confirmem.",
      m_aceptado: "Comanda acceptada! Ja tens hora d'arribada.",
      m_aceptado_p: "Comanda acceptada! Ja tens hora de recollida.",
      m_preparando: "La teva comanda és al forn.",
      m_listo_d_sin: "La teva comanda està llesta: el repartidor surt ara.",
      m_listo_d: "La teva comanda va de camí.",
      m_listo_d_cerca: "El teu repartidor està arribant!",
      m_listo_p: "La teva comanda està llesta. Pots passar a recollir-la a Marina Port Premià.",
      m_entregado: "Comanda lliurada. Bon profit!",
      m_entregado_p: "Comanda recollida. Bon profit!",
      m_cancelado: "La comanda s'ha cancel·lat. Si tens dubtes, truca'ns.",
      m_pendiente_pago: "Falta confirmar el pagament d'aquesta comanda.",
      lbl_d: "Arribada estimada", lbl_p: "Llesta per recollir", lbl_done_d: "Lliurada a les", lbl_done_p: "Recollida a les",
      left_min: "d'aquí a uns {min} min", left_range: "d'aquí a {a}–{b} min", left_1: "d'aquí a 1 min", left_now: "en qualsevol moment",
      left_late: "va una mica tard: arribarà aviat", left_late_p: "una mica tard: estarà aviat",
      src_estimado: "Estimació segons l'hora i la teva zona. S'ajusta quan el restaurant la confirmi.",
      src_restaurante: "Hora confirmada pel restaurant.",
      src_repartidor: "En directe, amb la posició del repartidor.",
      src_programado: "Comanda programada per a aquesta hora.",
      title_new: "{msg} · Salicornia",
      review: "Què tal tot? Deixa'ns la teva opinió a Google",
      nada: "No trobem aquesta comanda. Revisa l'enllaç que et vam donar en demanar o truca'ns.",
      err: "No es pot connectar ara mateix. Ho tornem a provar…",
      rest: "Salicornia", casa: "La teva adreça", rider: "Repartidor",
      attrib: "Mapa © col·laboradors d'OpenStreetMap"
    },
    en: {
      ref: "Order {ref}",
      s_nuevo: "Order received", s_aceptado: "Order accepted", s_preparando: "In the kitchen", s_ruta: "On its way",
      s_listo: "Ready for collection", s_entregado: "Delivered", s_entregado_p: "Collected",
      m_nuevo: "We have received your order. We'll confirm it shortly.",
      m_aceptado: "Order accepted! You now have an arrival time.",
      m_aceptado_p: "Order accepted! You now have a collection time.",
      m_preparando: "Your order is in the oven.",
      m_listo_d_sin: "Your order is ready: the courier is leaving now.",
      m_listo_d: "Your order is on its way.",
      m_listo_d_cerca: "Your courier is arriving!",
      m_listo_p: "Your order is ready. You can collect it at Marina Port Premià.",
      m_entregado: "Order delivered. Enjoy your meal!",
      m_entregado_p: "Order collected. Enjoy your meal!",
      m_cancelado: "The order has been cancelled. If you have any questions, call us.",
      m_pendiente_pago: "The payment for this order still needs to be confirmed.",
      lbl_d: "Estimated arrival", lbl_p: "Ready for collection", lbl_done_d: "Delivered at", lbl_done_p: "Collected at",
      left_min: "in about {min} min", left_range: "in {a}–{b} min", left_1: "in 1 min", left_now: "any minute now",
      left_late: "running a little late: arriving shortly", left_late_p: "a little late: ready shortly",
      src_estimado: "Estimate based on the time and your area. It is updated when the restaurant confirms.",
      src_restaurante: "Time confirmed by the restaurant.",
      src_repartidor: "Live, using the courier's position.",
      src_programado: "Order scheduled for this time.",
      title_new: "{msg} · Salicornia",
      review: "How was everything? Leave us a review on Google",
      nada: "We can't find this order. Check the link we gave you when ordering or call us.",
      err: "We can't connect right now. Trying again…",
      rest: "Salicornia", casa: "Your address", rider: "Courier",
      attrib: "Map © OpenStreetMap contributors"
    }
  };

  function lang() {
    try {
      var l = localStorage.getItem("salicornia_lang");
      if (l === "ca" || l === "en" || l === "es") return l;
    } catch (e) { /* noop */ }
    return "es";
  }
  function t(k, vars) {
    var s = (L10N[lang()] || L10N.es)[k];
    if (s == null) s = L10N.es[k] != null ? L10N.es[k] : "";
    if (vars) Object.keys(vars).forEach(function (v) { s = s.replace("{" + v + "}", vars[v]); });
    return s;
  }
  function esc(x) { return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function hhmm(sec) {
    var d = new Date(sec * 1000);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  /* de dónde sale el pedido: el enlace, o el último que hizo este navegador */
  var params = new URLSearchParams(location.search);
  var ref = params.get("ref") || "";
  var token = params.get("t") || "";
  if (!ref || !token) {
    try {
      var last = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
      if (last && last.ref && last.t) { ref = last.ref; token = last.t; }
    } catch (e) { /* noop */ }
  }

  var map = null, layers = {}, userMoved = false, data = null, timer = null, fails = 0;
  var skew = 0;          /* diferencia de reloj servidor − este dispositivo (s) */
  var lastStatus = null; /* para avisar cuando cambia */
  var trail = [];        /* recorrido del repartidor */
  function nowSec() { return Date.now() / 1000 + skew; }

  /* --- mapa ------------------------------------------------------------------------------ */
  function pin(cls, txt) {
    return L.divIcon({ className: "", html: '<div class="sg-pin ' + cls + '">' + txt + "</div>", iconSize: [34, 34], iconAnchor: [17, 17] });
  }
  function ensureMap(d) {
    if (map || !window.L) return;
    els.map.hidden = false;
    map = L.map(els.map, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: t("attrib") }).addTo(map);
    /* si el cliente mueve o acerca el mapa, no se lo recolocamos más */
    map.on("dragstart", function () { userMoved = true; });
    els.map.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".leaflet-control-zoom")) userMoved = true; });
    layers.rest = L.marker([d.restaurant.lat, d.restaurant.lng], { icon: pin("sg-pin--rest", "S"), title: t("rest") }).addTo(map);
    if (d.dest) layers.home = L.marker([d.dest.lat, d.dest.lng], { icon: pin("sg-pin--home", "&#8962;"), title: t("casa") }).addTo(map);
    var pts = [[d.restaurant.lat, d.restaurant.lng]];
    if (d.dest) pts.push([d.dest.lat, d.dest.lng]);
    map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  }
  /* mueve el marcador del repartidor deslizándolo en ~1 s en vez de saltar */
  function glide(marker, to) {
    var from = marker.getLatLng(), t0 = performance.now(), dur = 1000;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return marker.setLatLng(to);
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur);
      k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      marker.setLatLng([from.lat + (to[0] - from.lat) * k, from.lng + (to[1] - from.lng) * k]);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function paintMap(d) {
    if (!map) return;
    if (d.courier) {
      var p = [d.courier.lat, d.courier.lng];
      var lastP = trail[trail.length - 1];
      if (!lastP || lastP[0] !== p[0] || lastP[1] !== p[1]) trail.push(p);
      if (trail.length > 200) trail.shift();
      if (layers.rider) glide(layers.rider, p);
      else layers.rider = L.marker(p, { icon: pin("sg-pin--rider", "&#9654;"), title: t("rider"), zIndexOffset: 500 }).addTo(map);
      /* recorrido hecho (línea continua) y lo que falta (discontinua) */
      if (layers.trail) layers.trail.setLatLngs(trail);
      else layers.trail = L.polyline(trail, { color: "#2f7a3e", weight: 4, opacity: 0.7 }).addTo(map);
      if (d.dest) {
        var rest = [p, [d.dest.lat, d.dest.lng]];
        if (layers.todo) layers.todo.setLatLngs(rest);
        else layers.todo = L.polyline(rest, { color: "#6a2b26", weight: 2, opacity: 0.6, dashArray: "6 8" }).addTo(map);
      }
      if (!userMoved) {
        var pts = [p];
        if (d.dest) pts.push([d.dest.lat, d.dest.lng]);
        map.fitBounds(pts, { padding: [50, 50], maxZoom: 17, animate: true });
      }
    } else {
      ["rider", "todo"].forEach(function (k) { if (layers[k]) { map.removeLayer(layers[k]); layers[k] = null; } });
    }
  }

  /* --- estados ---------------------------------------------------------------------------- */
  function steps(d) {
    var delivery = d.mode === "delivery";
    var order = ["nuevo", "aceptado", "preparando", "listo", "entregado"];
    var labels = {
      nuevo: t("s_nuevo"), aceptado: t("s_aceptado"), preparando: t("s_preparando"),
      listo: delivery ? t("s_ruta") : t("s_listo"), entregado: delivery ? t("s_entregado") : t("s_entregado_p")
    };
    var cur = order.indexOf(d.status);
    els.steps.innerHTML = order.map(function (k, i) {
      var cls = i < cur ? "is-done" : (i === cur ? "is-now" : "");
      if (d.status === "entregado" && i === cur) cls = "is-done";
      return '<li class="' + cls + '">' + esc(labels[k]) + "</li>";
    }).join("");
  }
  function message(d) {
    var s = d.status, delivery = d.mode === "delivery";
    if (s === "cancelado") return t("m_cancelado");
    if (s === "pendiente_pago") return t("m_pendiente_pago");
    if (s === "entregado") return delivery ? t("m_entregado") : t("m_entregado_p");
    if (s === "aceptado") return delivery ? t("m_aceptado") : t("m_aceptado_p");
    if (s === "listo") {
      if (!delivery) return t("m_listo_p");
      if (!d.courier) return t("m_listo_d_sin");
      if (typeof d.etaMin === "number" && d.etaMin <= 2) return t("m_listo_d_cerca");
      return t("m_listo_d");
    }
    return t("m_" + s);
  }

  /* --- hora prevista ---------------------------------------------------------------------- */
  function paintEta() {
    var d = data;
    if (!d || !d.eta || !els.eta) { if (els.eta) els.eta.hidden = true; return; }
    var e = d.eta, delivery = d.mode === "delivery", now = nowSec();
    els.eta.hidden = false;
    els.eta.classList.toggle("is-live", e.source === "repartidor");
    if (e.done) {
      els.etaLabel.textContent = delivery ? t("lbl_done_d") : t("lbl_done_p");
      els.etaTime.textContent = hhmm(e.done);
      els.etaLeft.textContent = "";
      els.etaSrc.textContent = "";
      els.bar.style.transform = "scaleX(1)";
      els.eta.classList.remove("is-late");
      return;
    }
    els.etaLabel.textContent = delivery ? t("lbl_d") : t("lbl_p");
    var exact = e.source === "restaurante" || e.source === "repartidor";
    var mid = Math.round((e.from + e.to) / 2);
    els.etaTime.textContent = exact ? hhmm(e.source === "repartidor" ? e.from + 60 : mid) : hhmm(e.from) + "–" + hhmm(e.to);
    var target = exact ? (e.source === "repartidor" ? e.from + 60 : mid) : e.to;
    var left = Math.round((target - now) / 60);
    var late = now > e.to + 60;
    els.eta.classList.toggle("is-late", late);
    var leftFrom = Math.round((e.from - now) / 60);
    els.etaLeft.textContent = late ? (delivery ? t("left_late") : t("left_late_p"))
      : left <= 0 ? t("left_now") : left === 1 ? t("left_1")
      : (!exact && leftFrom > 0 && left - leftFrom >= 3) ? t("left_range", { a: leftFrom, b: left })
      : t("left_min", { min: left });
    els.etaSrc.textContent = t("src_" + e.source);
    var start = d.created || now, total = Math.max(60, target - start);
    var pct = Math.max(0.04, Math.min(late ? 0.97 : 0.95, (now - start) / total));
    els.bar.style.transform = "scaleX(" + pct.toFixed(3) + ")";
  }

  function notifyChange(d, msg) {
    if (lastStatus === null) { lastStatus = d.status; return; }
    if (d.status === lastStatus) return;
    lastStatus = d.status;
    els.msg.classList.remove("is-new");
    void els.msg.offsetWidth;
    els.msg.classList.add("is-new");
    document.title = t("title_new", { msg: msg });
    try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) { /* noop */ }
  }

  function render(d) {
    data = d;
    if (typeof d.now === "number") skew = d.now - Date.now() / 1000;
    var msg = message(d);
    els.ref.textContent = t("ref", { ref: ref });
    els.msg.textContent = msg;
    notifyChange(d, msg);
    steps(d);
    paintEta();
    els.addr.textContent = d.address || "";
    if (els.review) {
      els.review.hidden = d.status !== "entregado";
      els.reviewLink.textContent = t("review");
    }
    if (d.mode === "delivery" && d.restaurant && (d.dest || d.courier)) {
      ensureMap(d);
      paintMap(d);
    } else if (els.map) {
      els.map.hidden = true;
    }
    if (d.status === "entregado" || d.status === "cancelado") stop();
  }

  function stop() { if (timer) { clearTimeout(timer); timer = null; } }
  function next(ms) { stop(); timer = setTimeout(poll, ms); }

  function poll() {
    if (document.hidden) return next(10000);
    fetch(API + "?track=1&ref=" + encodeURIComponent(ref) + "&t=" + encodeURIComponent(token), { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (res) {
        if (res.status === 404) { els.msg.textContent = t("nada"); els.steps.innerHTML = ""; if (els.eta) els.eta.hidden = true; return stop(); }
        if (!res.d || !res.d.ok) throw new Error("bad");
        fails = 0;
        render(res.d);
        if (res.d.status !== "entregado" && res.d.status !== "cancelado") next(res.d.courier ? 5000 : 10000);
      })
      .catch(function () {
        fails++;
        if (!data) els.msg.textContent = t("err");
        next(Math.min(30000, 6000 * fails));
      });
  }

  /* la cuenta atrás avanza aunque no llegue nada nuevo del servidor */
  setInterval(paintEta, 20000);
  document.addEventListener("sal:lang", function () { if (data) render(data); });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      document.title = baseTitle;
      if (data && data.status !== "entregado" && data.status !== "cancelado") poll();
    }
  });

  if (!ref || !token) {
    els.msg.textContent = t("nada");
    return;
  }
  els.ref.textContent = t("ref", { ref: ref });
  poll();
})();
