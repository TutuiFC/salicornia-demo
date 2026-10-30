/* =========================================================================
   SALICORNIA — dibujo de la pizza de «Crea tu pizza» (SVG)
   window.SalPizzaView(contenedor) devuelve { update(counts) }.
   counts = { idIngrediente: veces }. Cada ingrediente tiene su forma y color;
   las piezas se colocan siempre en el mismo sitio (semilla por ingrediente),
   así al añadir uno más no se mueven las que ya estaban.
   ========================================================================= */
(function () {
  "use strict";

  var MAX_EACH = 4;
  var R_TOP = 74; /* radio útil para ingredientes (la salsa llega a 80) */
  var SCALE = 1.3; /* tamaño de las piezas: se ven bien también en el móvil */

  /* --- azar con semilla ---------------------------------------------------- */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rngFrom(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function f1(n) { return Math.round(n * 10) / 10; }

  /* --- formas básicas ------------------------------------------------------ */
  /* mancha irregular cerrada (queso fundido, migas, salsas…) */
  function blob(rnd, r, o) {
    o = o || {};
    var n = o.n || 8, irr = o.irr != null ? o.irr : 0.22, sx = o.sx || 1, sy = o.sy || 1;
    var step = (Math.PI * 2) / n, pts = [], i;
    for (i = 0; i < n; i++) {
      var a = i * step + (rnd() - 0.5) * step * 0.6;
      var rr = r * (1 - irr + 2 * irr * rnd());
      pts.push([Math.cos(a) * rr * sx, Math.sin(a) * rr * sy]);
    }
    var last = pts[n - 1], d = "M" + f1((last[0] + pts[0][0]) / 2) + "," + f1((last[1] + pts[0][1]) / 2);
    for (i = 0; i < n; i++) {
      var p = pts[i], q = pts[(i + 1) % n];
      d += "Q" + f1(p[0]) + "," + f1(p[1]) + " " + f1((p[0] + q[0]) / 2) + "," + f1((p[1] + q[1]) / 2);
    }
    return d + "Z";
  }
  function P(d, fill, stroke, sw, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 0.6) + '"' : "") + (extra || "") + "/>";
  }
  function C(r, fill, stroke, sw, cx, cy, extra) {
    return '<circle cx="' + f1(cx || 0) + '" cy="' + f1(cy || 0) + '" r="' + f1(r) + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 0.6) + '"' : "") + (extra || "") + "/>";
  }
  function line(d, stroke, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '" stroke-linecap="round"' + (extra || "") + "/>";
  }
  function dots(rnd, n, rmax, r, fill) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var a = rnd() * 6.2832, d = rmax * Math.sqrt(rnd());
      s += C(r * (0.8 + rnd() * 0.4), fill, null, 0, Math.cos(a) * d, Math.sin(a) * d);
    }
    return s;
  }
  function leaf(len, w, fill, vein) {
    var h = f1(len / 2);
    return P("M0," + -len + " C" + w + "," + -h + " " + w + "," + h + " 0," + len + " C" + -w + "," + h + " " + -w + "," + -h + " 0," + -len + "Z", fill) +
      line("M0," + f1(-len * 0.8) + " L0," + f1(len * 0.85), vein, 0.5);
  }
  function melted(rnd, r, fill, stroke) {
    return P(blob(rnd, r * (0.85 + 0.3 * rnd()), { n: 9, irr: 0.28 }), fill, stroke, 0.5) +
      P(blob(rnd, r * 0.42, { irr: 0.3 }), "#ffffff", null, 0, ' opacity="0.4" transform="translate(-1.6 -1.6)"');
  }
  function burrata(rnd, fill, stroke, truffle) {
    return P(blob(rnd, 15, { n: 10, irr: 0.14 }), fill, stroke, 0.7) +
      P(blob(rnd, 8.5, { irr: 0.25 }), "#ffffff", null, 0, ' opacity="0.8"') +
      (truffle ? dots(rnd, 10, 11, 0.8, "#3a2a1f") : "");
  }
  function mushroom(fill, stroke) {
    return P("M-7,0.5 C-7,-5.6 7,-5.6 7,0.5 L2.3,0.5 L2,6 L-2,6 L-2.3,0.5Z", fill, stroke, 0.6) +
      line("M-5.4,-0.4 C-4,-3.8 4,-3.8 5.4,-0.4", stroke, 0.4);
  }
  function cherry(rnd, skin, edge, flesh, seeds) {
    var s = C(5, skin, edge, 0.7) + C(3.4, flesh);
    for (var i = 0; i < 4; i++) {
      var a = i * 1.57 + rnd() * 0.4;
      s += '<ellipse cx="' + f1(Math.cos(a) * 1.9) + '" cy="' + f1(Math.sin(a) * 1.9) + '" rx="0.7" ry="0.45" fill="' + seeds + '"/>';
    }
    return s;
  }
  function artichoke(fill, stroke, charred) {
    var s = "";
    for (var i = 0; i < 5; i++) {
      s += '<ellipse cx="0" cy="-3" rx="2.4" ry="4.2" transform="rotate(' + i * 72 + ')" fill="' + fill + '" stroke="' + stroke + '" stroke-width="0.5"/>';
    }
    s += C(2, "#cfcb8f");
    if (charred) s += line("M-5,-1.2 L5,-1.2 M-5,1.8 L5,1.8", "#3a2e1f", 0.8, ' opacity="0.7"');
    return s;
  }
  /* hilo que cruza la pizza (miel, aceite, pesto); se dibuja en coordenadas absolutas */
  function drizzle(rnd, color, w, op) {
    var a = rnd() * 6.2832, b = a + Math.PI + (rnd() - 0.5) * 1.2;
    var r1 = 50 + rnd() * 14, r2 = 50 + rnd() * 14;
    return line(
      "M" + f1(Math.cos(a) * r1) + "," + f1(Math.sin(a) * r1) +
      " C" + f1((rnd() - 0.5) * 90) + "," + f1((rnd() - 0.5) * 90) + " " + f1((rnd() - 0.5) * 90) + "," + f1((rnd() - 0.5) * 90) +
      " " + f1(Math.cos(b) * r2) + "," + f1(Math.sin(b) * r2),
      color, w, ' opacity="' + op + '"'
    );
  }

  /* --- cada ingrediente: capa, piezas por unidad, tamaño y dibujo -----------
     capa 1 = quesos que se funden; 2 = lo que va al horno; 3 = lo que se pone
     al salir del horno; 4 = hierbas, especias e hilos por encima. */
  var K = {};
  function def(ids, o) { ids.split(" ").forEach(function (id) { K[id] = o; }); }

  def("mozzarella-fior-di-latte", { layer: 1, k: 7, size: 10, draw: function (r) { return melted(r, 9.5, "#fbf4df", "#ecdcb4"); } });
  def("mozzarella-di-bufala", { layer: 1, k: 5, size: 12, draw: function (r) { return melted(r, 11.5, "#fffaf0", "#eadfc6"); } });
  def("provola-ahumada", { layer: 1, k: 6, size: 10, draw: function (r) {
    return melted(r, 9, "#f2d9a2", "#c99a55") + P(blob(r, 3, { irr: 0.4 }), "#b98243", null, 0, ' opacity="0.35"');
  } });
  def("gorgonzola", { layer: 1, k: 8, size: 6, draw: function (r) {
    return P(blob(r, 5.2, { irr: 0.3 }), "#f4eedb", "#d9cfb2", 0.5) + dots(r, 4, 3, 0.7, "#5f7f74");
  } });
  def("crema-de-huevo-con-pecorino", { layer: 1, k: 5, size: 8, draw: function (r) {
    return P(blob(r, 7.5, { n: 10, irr: 0.3 }), "#f5d97f", "#e6c260", 0.5, ' opacity="0.92"');
  } });

  def("salsiccia", { layer: 2, k: 9, size: 5, draw: function (r) {
    return P(blob(r, 3.6 + r() * 1.4, { n: 7, irr: 0.38 }), "#8b4a2c", "#6a361e", 0.5);
  } });
  def("salame-piccante", { layer: 2, k: 6, size: 8, draw: function (r) {
    return C(7, "#b5302a", "#8a211c", 0.8) + dots(r, 6, 5, 0.75, "#efc3b0");
  } });
  def("nduja", { layer: 2, k: 7, size: 5, draw: function (r) {
    return P(blob(r, 4, { irr: 0.45 }), "#c2382a", null, 0, ' opacity="0.9"') + P(blob(r, 2, { irr: 0.4 }), "#8f2219");
  } });
  def("jamon-dulce", { layer: 2, k: 6, size: 7, draw: function () {
    return '<rect x="-5.5" y="-4.5" width="11" height="9" rx="3" fill="#f0a39a" stroke="#d9837a" stroke-width="0.6"/>';
  } });
  def("pancetta-italiana-curada", { layer: 2, k: 5, size: 7, draw: function () {
    return '<rect x="-6.5" y="-2.2" width="13" height="4.4" rx="1.6" fill="#e6a093"/><rect x="-6.5" y="-0.5" width="13" height="1.2" fill="#fae6dc"/>';
  } });
  def("guanciale-croccante", { layer: 2, k: 9, size: 4, draw: function () {
    return '<rect x="-3" y="-1.8" width="6" height="3.6" rx="1" fill="#c98a54" stroke="#9d6332" stroke-width="0.5"/><rect x="-3" y="-1.8" width="6" height="1" rx="0.5" fill="#f0d0a8"/>';
  } });
  def("porchetta-italiana", { layer: 2, k: 5, size: 8, draw: function (r) {
    return P(blob(r, 6.5, { sx: 1.25, sy: 0.85, irr: 0.15 }), "#dba67a", "#a8683c", 1) + line("M-2,0 a2,2 0 1 1 2,2", "#b67a48", 0.6);
  } });
  def("speck", { layer: 2, k: 5, size: 7, draw: function () {
    return '<rect x="-6" y="-2.5" width="12" height="5" rx="2" fill="#a23b33"/><rect x="-6" y="0.9" width="12" height="1.1" fill="#f0d0c2"/>';
  } });
  def("alcaparras", { layer: 2, k: 12, size: 3, draw: function () {
    return C(1.8, "#6c7d38", "#55632b", 0.4) + C(0.6, "#9cad62", null, 0, -0.5, -0.5);
  } });
  def("berenjena", { layer: 2, k: 5, size: 8, draw: function (r) {
    return C(7, "#ead8a4", "#4a2550", 1.5) + dots(r, 6, 4, 0.45, "#c8ad6e");
  } });
  def("calabacin", { layer: 2, k: 6, size: 7, draw: function () {
    return C(6.2, "#e6ecbd", "#4c7a33", 1.3) + C(3.2, "none", "#cdd79a", 0.6);
  } });
  def("champinones", { layer: 2, k: 7, size: 7, draw: function () { return mushroom("#e2ccaa", "#b8976f"); } });
  def("mix-de-setas", { layer: 2, k: 7, size: 7, draw: function (r) {
    var c = ["#b98d5f", "#8f6a48", "#d7b88e"][Math.floor(r() * 3)];
    return '<g transform="scale(' + f1(0.75 + r() * 0.35) + ')">' + mushroom(c, "#6f4f33") + "</g>";
  } });
  def("alcachofas", { layer: 2, k: 5, size: 7, draw: function () { return artichoke("#a3a65c", "#6f7536", false); } });
  def("alcachofa-a-la-brasa", { layer: 2, k: 5, size: 7, draw: function () { return artichoke("#8c8648", "#5d5a2e", true); } });
  def("tomate-cherry", { layer: 2, k: 5, size: 6, draw: function (r) { return cherry(r, "#d33b2b", "#a92a1d", "#ea6a52", "#f7d9a6"); } });
  def("tomate-cherry-amarillo-confitado", { layer: 2, k: 5, size: 6, draw: function (r) { return cherry(r, "#f0b52f", "#c98d15", "#f7cf62", "#fff0c4"); } });
  def("tomate-semiseco", { layer: 2, k: 6, size: 6, draw: function (r) {
    return P(blob(r, 4.5, { sx: 1.3, sy: 0.8, irr: 0.25 }), "#9a2b21", "#741d16", 0.6) + P(blob(r, 1.8), "#c0503e", null, 0, ' opacity="0.5"');
  } });
  def("cebolla-roja-asada", { layer: 2, k: 7, size: 6, draw: function () {
    return line("M-5.5,1.5 A6,6 0 0 1 5.5,1.5", "#8d3a6f", 1.9) + line("M-3.6,1.5 A4,4 0 0 1 3.6,1.5", "#c27aa8", 0.8);
  } });
  def("pimientos-rojo-y-amarillo-asados", { layer: 2, k: 8, size: 7, draw: function (r, j) {
    return line("M-6.5,0 Q0,-3.2 6.5,0", j % 2 ? "#f0bf2c" : "#d33a28", 2.8) + line("M-5,-0.6 Q0,-2.6 5,-0.6", "#ffffff", 0.6, ' opacity="0.3"');
  } });
  def("friarielli-grelos", { layer: 2, k: 7, size: 7, draw: function () { return leaf(7.5, 4, "#2f5f25", "#244b1c"); } });
  def("aceitunas", { layer: 2, k: 7, size: 4, draw: function () {
    return C(3, "none", "#2a221d", 2.2) + line("M-2.4,-1.6 A3,3 0 0 1 0.6,-3", "#5a4a3f", 0.6);
  } });

  def("burrata", { layer: 3, k: 1, size: 16, center: true, draw: function (r) { return burrata(r, "#fffaf0", "#e7dac0", false); } });
  def("burrata-ahumada", { layer: 3, k: 1, size: 16, center: true, draw: function (r) { return burrata(r, "#f1e2c4", "#d6bb8c", false); } });
  def("burrata-tartufata", { layer: 3, k: 1, size: 16, center: true, draw: function (r) { return burrata(r, "#fffaf0", "#e7dac0", true); } });
  def("perlas-de-mozzarella-de-bufala", { layer: 3, k: 9, size: 4, draw: function () {
    return C(3.1, "#fffdf5", "#e6dbc0", 0.5) + C(1, "#ffffff", null, 0, -0.9, -0.9);
  } });
  def("parmesano", { layer: 3, k: 10, size: 4, draw: function (r) {
    var j = function () { return f1((r() - 0.5) * 1.4); };
    return P("M" + (-4 + +j()) + "," + (-1.2 + +j()) + " L" + (3.6 + +j()) + ",-1.8 L4.2," + (0.9 + +j()) + " L-3.4,1.6Z", "#f0dc96", "#d9c070", 0.3);
  } });
  def("jamon-de-parma", { layer: 3, k: 4, size: 11, draw: function (r) {
    return P(blob(r, 8, { n: 9, irr: 0.3, sx: 1.5, sy: 0.7 }), "#d8695f", "#f5d7c9", 1.3) + line("M-7,0.5 Q0,-2 7,0.8", "#f6dccf", 0.8, ' opacity="0.8"');
  } });
  def("mortadela", { layer: 3, k: 4, size: 10, draw: function (r) {
    return C(9, "#f2b3ad", "#e39890", 0.6) + dots(r, 6, 7, 0.9, "#fdf0ea") + dots(r, 2, 6, 0.7, "#7da552");
  } });
  def("bresaola", { layer: 3, k: 5, size: 8, draw: function (r) {
    return P(blob(r, 7, { n: 9, irr: 0.12 }), "#8c1e22", "#68151a", 0.6) + P(blob(r, 3, { irr: 0.3 }), "#a83a3c", null, 0, ' opacity="0.6"');
  } });
  def("capocollo", { layer: 3, k: 5, size: 8, draw: function (r) {
    return C(7.5, "#c5544b", "#9f3a33", 0.6) + dots(r, 5, 5.5, 1.1, "#f4cfc4");
  } });
  def("anchoas-del-cantabrico", { layer: 3, k: 5, size: 9, draw: function () {
    return P("M-9,0 C-6,-1.9 6,-1.9 9.5,0 C6,1.9 -6,1.9 -9,0Z", "#8b6a50", "#6f533d", 0.4) + line("M-8,0 L8.5,0", "#d0c8b8", 0.5);
  } });
  def("anchoas-italianas", { layer: 3, k: 5, size: 9, draw: function () {
    return P("M-8.5,0 C-6,-1.8 6,-1.8 9,0 C6,1.8 -6,1.8 -8.5,0Z", "#7a5a42", "#5f4431", 0.4) + line("M-7.5,0 L8,0", "#c8bfae", 0.5);
  } });
  def("ventresca-de-atun", { layer: 3, k: 6, size: 6, draw: function (r) {
    return P(blob(r, 4.8, { n: 7, irr: 0.35 }), "#e2b49a", "#c99a7e", 0.5) + line("M-2.5,-1 L2.5,1", "#f1d2c0", 0.5);
  } });
  def("bacalao-marinado-ahumado", { layer: 3, k: 6, size: 6, draw: function (r) {
    return P(blob(r, 4.8, { n: 7, irr: 0.35 }), "#f4ede0", "#dccfb8", 0.5) + line("M-2.5,-1 L2.5,1", "#e6dccb", 0.5);
  } });
  def("rucula", { layer: 3, k: 9, size: 6, draw: function () {
    return P("M0,-7 C1.5,-6 0.8,-4.8 2.6,-4.2 C1.6,-3 2.8,-2 1.4,-1 C3,0 1.8,1.6 1,2.4 C1.6,4 0.6,5.6 0,7 C-0.6,5.6 -1.6,4 -1,2.4 C-1.8,1.6 -3,0 -1.4,-1 C-2.8,-2 -1.6,-3 -2.6,-4.2 C-0.8,-4.8 -1.5,-6 0,-7Z", "#4e8a2e", "#3b6b22", 0.3) +
      line("M0,-6 L0,6.5", "#3b6b22", 0.4);
  } });
  def("cebolla-roja-cruda", { layer: 3, k: 7, size: 6, draw: function () {
    return C(4.8, "none", "#b0508f", 1.1) + C(3.2, "none", "#e4b6d4", 0.7);
  } });
  def("pimiento-verde-crudo", { layer: 3, k: 6, size: 6, draw: function () {
    return C(5, "none", "#4b8b2c", 1.6) + C(3.5, "none", "#a7cf7c", 0.5);
  } });
  def("crema-tartufata", { layer: 3, k: 5, size: 6, draw: function (r) {
    return P(blob(r, 5, { irr: 0.35 }), "#b48d63", "#8d6a45", 0.5) + dots(r, 4, 3, 0.5, "#4a3524");
  } });
  def("pate-de-aceitunas", { layer: 3, k: 7, size: 5, draw: function (r) {
    return P(blob(r, 3.8, { irr: 0.4 }), "#3b3029", "#2a211b", 0.5);
  } });
  def("almendra-tostada", { layer: 3, k: 9, size: 4, draw: function () {
    return '<ellipse rx="3.2" ry="1.3" fill="#efd9ae" stroke="#c39f6a" stroke-width="0.5"/>';
  } });
  def("nueces", { layer: 3, k: 6, size: 5, draw: function (r) {
    return P(blob(r, 4, { n: 8, irr: 0.45 }), "#87562f", "#5f3a1d", 0.5) + line("M-2,-1 Q0,1 2,-1 M-1.5,1.5 Q0,0 1.5,1.5", "#5a3519", 0.5);
  } });
  def("laminas-de-trufa", { layer: 3, k: 5, size: 6, draw: function () {
    return C(5.2, "#4b3527", "#2f2118", 0.5) + line("M-3.5,-1 Q-1,1 1,-1.5 T4,0 M-3,2 Q0,0.5 3,2.5", "#8a6d57", 0.45);
  } });

  def("albahaca", { layer: 4, k: 4, size: 8, draw: function () {
    return leaf(8.5, 5, "#3f8f3a", "#2b6b2a") + line("M-1.6,-4 Q-2.4,0 -1.4,4", "#7fc06a", 0.6, ' opacity="0.5"');
  } });
  def("perejil", { layer: 4, k: 22, size: 2, draw: function (r) { return C(0.8 + r() * 0.4, "#3e7b2c"); } });
  def("oregano", { layer: 4, k: 28, size: 2, draw: function (r) { return C(0.55 + r() * 0.35, "#6d7b3b"); } });
  def("pimienta-negra", { layer: 4, k: 28, size: 2, draw: function (r) { return C(0.45 + r() * 0.25, "#1d1a17"); } });
  def("granel-de-pistacho", { layer: 4, k: 20, size: 2, draw: function (r) {
    return P(blob(r, 1.3, { n: 5, irr: 0.4 }), r() < 0.5 ? "#8db054" : "#6f9440");
  } });
  def("miel", { layer: 4, k: 3, abs: true, draw: function (r) { return drizzle(r, "#e8a72a", 1.5, 0.85); } });
  def("pesto-de-pistacho", { layer: 4, k: 3, abs: true, draw: function (r) { return drizzle(r, "#8aa94a", 2.2, 0.9); } });
  def("aceite-de-ajo-y-perejil", { layer: 4, k: 3, abs: true, draw: function (r) {
    return drizzle(r, "#e6c44c", 1.3, 0.6) + dots(r, 7, 66, 0.8, "#3f7a2c");
  } });

  /* ingrediente nuevo que aún no tenga dibujo: una pieza neutra */
  var FALLBACK = { layer: 2, k: 5, size: 6, draw: function (r) { return P(blob(r, 4.5, { irr: 0.3 }), "#b07a4a", "#8a5a33", 0.5); } };

  /* --- colocación estable --------------------------------------------------
     Reparte las k×4 piezas posibles de cada ingrediente en espiral (girasol) y
     las baraja con su semilla: las primeras ya quedan repartidas por toda la pizza. */
  var permCache = {};
  function perm(id, n) {
    var key = id + "|" + n;
    if (permCache[key]) return permCache[key];
    var r = rngFrom(hash(id + "perm")), a = [], i;
    for (i = 0; i < n; i++) a.push(i);
    for (i = n - 1; i > 0; i--) { var k = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[k]; a[k] = t; }
    return (permCache[key] = a);
  }
  function position(id, kind, j) {
    var rnd = rngFrom(hash(id + "@" + j));
    var rot = rnd() * 360, ang, rad;
    if (kind.center) {
      ang = rnd() * 6.2832;
      rad = j === 0 ? 6 * rnd() : 26 + 20 * rnd();
    } else {
      var maxR = R_TOP - (kind.size || 6) * SCALE;
      var N = kind.k * MAX_EACH;
      var p = perm(id, N)[j % N];
      ang = p * 2.39996 + (hash(id) % 628) / 100 + (rnd() - 0.5) * 0.5;
      rad = Math.max(0, Math.min(maxR, maxR * Math.sqrt((p + 0.5) / N) + (rnd() - 0.5) * 4));
    }
    return { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, rot: rot };
  }
  function piece(id, kind, j, delay) {
    var inner = kind.draw(rngFrom(hash(id + "#" + j)), j);
    var st = ' style="animation-delay:' + delay + 'ms"';
    if (kind.abs) return '<g class="pz-p"><g class="pz-fade"' + st + ">" + inner + "</g></g>";
    var pos = position(id, kind, j);
    return '<g class="pz-p" transform="translate(' + f1(pos.x) + " " + f1(pos.y) + ") rotate(" + Math.round(pos.rot) + ") scale(" + SCALE + ')"><g class="pz-new"' + st + ">" + inner + "</g></g>";
  }

  /* --- masa y tomate ------------------------------------------------------- */
  function baseSVG() {
    var r = rngFrom(20261029), s, i, a, d;
    s = '<svg viewBox="-103 -103 206 206" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<radialGradient id="pzCrust" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="97">' +
      '<stop offset="0.8" stop-color="#edc98c"/><stop offset="0.87" stop-color="#e3b26c"/><stop offset="0.95" stop-color="#c7884a"/><stop offset="1" stop-color="#9e612c"/>' +
      "</radialGradient>" +
      '<radialGradient id="pzSauce" gradientUnits="userSpaceOnUse" cx="-18" cy="-22" r="105">' +
      '<stop offset="0" stop-color="#d9532f"/><stop offset="1" stop-color="#ad321e"/>' +
      "</radialGradient>" +
      '<filter id="pzSh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0.4" dy="0.9" stdDeviation="0.6" flood-color="#3b1606" flood-opacity="0.35"/></filter>' +
      "</defs>" +
      '<circle cx="1.5" cy="3" r="98" fill="#2a1a0e" opacity="0.12"/>' +
      '<path d="' + blob(r, 97, { n: 28, irr: 0.012 }) + '" fill="url(#pzCrust)"/>';
    /* manchas tostadas del borde */
    for (i = 0; i < 26; i++) {
      a = r() * 6.2832; d = 86 + r() * 9;
      s += '<path d="' + blob(r, 1.4 + r() * 2.4, { n: 6, irr: 0.35 }) + '" transform="translate(' + f1(Math.cos(a) * d) + " " + f1(Math.sin(a) * d) +
        ')" fill="#5b3214" opacity="' + f1(0.25 + r() * 0.4) + '"/>';
    }
    s += '<path d="' + blob(r, 80, { n: 26, irr: 0.035 }) + '" fill="url(#pzSauce)"/>';
    /* textura de la salsa */
    for (i = 0; i < 16; i++) {
      a = r() * 6.2832; d = 72 * Math.sqrt(r());
      s += '<path d="' + blob(r, 3 + r() * 6, { irr: 0.35 }) + '" transform="translate(' + f1(Math.cos(a) * d) + " " + f1(Math.sin(a) * d) +
        ')" fill="' + (i % 3 ? "#9b2915" : "#e46b48") + '" opacity="0.22"/>';
    }
    return s + '<g data-layer="1"></g><g data-layer="2" filter="url(#pzSh)"></g><g data-layer="3" filter="url(#pzSh)"></g><g data-layer="4"></g></svg>';
  }

  window.SalPizzaView = function (host) {
    host.innerHTML = baseSVG();
    var svg = host.querySelector("svg");
    var layers = {};
    [1, 2, 3, 4].forEach(function (n) { layers[n] = svg.querySelector('[data-layer="' + n + '"]'); });
    var groups = {}, have = {};

    function update(counts) {
      var ids = {};
      Object.keys(counts).forEach(function (id) { ids[id] = 1; });
      Object.keys(have).forEach(function (id) { ids[id] = 1; });
      var added = 0;
      Object.keys(ids).forEach(function (id) {
        var kind = K[id] || FALLBACK;
        var want = Math.min(counts[id] || 0, MAX_EACH) * kind.k;
        var got = have[id] || 0;
        var g = groups[id];
        if (!g) {
          if (!want) return;
          g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("data-ing", id);
          layers[kind.layer].appendChild(g);
          groups[id] = g;
        }
        if (want > got) {
          var html = "";
          for (var j = got; j < want; j++) html += piece(id, kind, j, Math.min(added++, 30) * 18);
          g.insertAdjacentHTML("beforeend", html);
        } else {
          for (var x = got; x > want; x--) if (g.lastChild) g.removeChild(g.lastChild);
        }
        have[id] = want;
      });
    }
    return { update: update };
  };
})();
