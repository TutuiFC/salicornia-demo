/* =========================================================================
   SALICORNIA — configuración pública de la web (la ve cualquier visitante)
   Aquí NO va ninguna clave ni secreto. Las claves (IA, Stripe, panel) viven
   en el servidor, en _private/config.php.
   ========================================================================= */
window.SAL_CONFIG = {
  /* Asistente del chat: el servidor añade las instrucciones y la clave. */
  api: {
    proxy: "api/asistente.php",
    timeoutMs: 50000
  },
  db: "assets/data/asistente.json",

  /* Pedidos a domicilio y para recoger (pedido.html).
     PROVISIONAL: confirmar con el restaurante envío, mínimo, tiempos y zona.
     Los platos y precios se leen directamente de carta.html. */
  pedidos: {
    /* Número de WhatsApp que recibe los pedidos, con prefijo y sin "+" ni
       espacios (p. ej. "34600111222"). Vacío = modo demo: el cliente ve la
       confirmación pero el pedido no se envía a ningún sitio. */
    whatsapp: "",
    /* Servidor de pedidos (guarda el pedido, avisa al restaurante y cobra online).
       Vacío = sin servidor: se usa WhatsApp o el modo demo de arriba. */
    api: "api/pedido.php",
    telefono: "932 47 17 02",       // pedidos y para llevar (reservas: 864 62 76 21)
    envio: 4,              // gastos de envío (€)
    minimo: 15,            // pedido mínimo a domicilio (€), sin envío
    envase: 0.5,           // envase para llevar, por pizza o pasta (€)
    sinGlutenPan: 1,       // suplemento pan sin gluten en ensaladas (€)
    sinGluten: 2.5,        // suplemento base sin gluten, solo pizzas (€)
    pizzaBase: 10,         // «Crea tu pizza»: base con masa y tomate (€). PROVISIONAL
    ensaladaBase: 10,      // «Crea tu ensalada»: base con mezclum y pan (€). PROVISIONAL
    ensaladaIngPrecios: {
      "aceitunas": 1.00,
      "aguacate": 1.50,
      "ajo-y-perejil": 0.50,
      "albahaca": 0.50,
      "albaricoque-deshidratado": 1.00,
      "alcachofas": 0.50,
      "alcaparras": 1.00,
      "almendra-tostada": 2.00,
      "anchoas": 4.50,
      "anchoas-del-cantabrico": 1.50,
      "atun": 1.50,
      "bacalao-marinado-ahumado": 4.00,
      "berenjena": 2.00,
      "bresaola": 3.50,
      "burrata": 4.00,
      "burrata-ahumada": 4.50,
      "burrata-tartufata": 4.50,
      "calabacin": 1.50,
      "capocollo": 3.00,
      "cebolla-roja-asada": 1.50,
      "cebolla-roja-cruda": 1.50,
      "champinones": 1.50,
      "crema-de-huevo-con-pecorino": 1.00,
      "escamas-de-parmesano": 2.00,
      "ventresca-de-atun": 3.00,
      "friarelli-grelos": 3.50,
      "gambas": 1.50,
      "gorgonzola": 1.50,
      "granel-de-pistacho": 0.50,
      "hierbas-aromaticas": 0.50,
      "jamon-de-parma": 4.00,
      "jamon-dulce": 2.00,
      "jamon-tartufado": 3.00,
      "lamina-almendras": 1.50,
      "manzana-verde": 1.00,
      "mezclum": 0.50,
      "miel": 2.00,
      "mix-de-setas": 3.50,
      "mortadela": 1.50,
      "mozzarella-fior-di-latte": 1.50,
      "nduja": 1.50,
      "nueces": 1.50,
      "oregano": 0.50,
      "pancetta-italiana-curada": 3.00,
      "parmesano": 1.00,
      "pate-de-aceitunas": 1.00,
      "pesto-de-pistacho": 2.00,
      "pimiento-amarillo": 1.50,
      "pimiento-rojo-asado": 1.50,
      "pimiento-verde-crudo": 1.50,
      "porchetta-italiana": 3.50,
      "provola-ahumada": 2.50,
      "queso-fresco-curado": 2.50,
      "queso-fresco-semi": 0.50,
      "romero": 1.00,
      "rucula": 3.00,
      "salame-dulce": 3.00,
      "salame-piccante": 1.50,
      "salsa-ajo-y-perejil": 1.00,
      "salsa-de-tomate": 0.50,
      "salsiccia": 2.50,
      "salvia": 0.50,
      "speck": 3.00,
      "tomate-cherry": 1.50,
      "tomate-cherry-amarillo-confitado": 1.50,
      "tomate-semiseco": 2.00,
      "tomate-temporada": 0.00
    },
    pizzaIng: 0.8,         // «Crea tu pizza»: cada ingrediente (€). PROVISIONAL
    /* precio por ingrediente (suplemento del TPV); lo que no esté aquí cuesta pizzaIng */
    pizzaIngPrecios: {
      "almendra-tostada": 3.50,
      "mozzarella-fior-di-latte": 3.50,
      "anchoas-italianas": 4.50,
      "anchoas-del-cantabrico": 4.50,
      "granel-de-pistacho": 1.50,
      "parmesano": 1.00,
      "aceitunas": 1.00,
      "guanciale-croccante": 4.00,
      "laminas-de-trufa": 4.50,
      "salsa-de-tomate": 0.50,
      "salsiccia": 2.50,
      "speck": 3.00,
      "tomate-cherry": 1.50,
      "tomate-cherry-amarillo-confitado": 1.50,
      "tomate-semiseco": 2.00,
      "porchetta-italiana": 3.50,
      "provola-ahumada": 2.50,
      "rucula": 1.00,
      "salame-piccante": 3.00,
      "aceite-de-ajo-y-perejil": 1.00,
      "nduja": 1.50,
      "nueces": 1.50,
      "oregano": 0.50,
      "pancetta-italiana-curada": 3.00,
      "pate-de-aceitunas": 2.00,
      "pesto-de-pistacho": 1.50,
      "pimientos-rojo-y-amarillo-asados": 1.50,
      "pimiento-verde-crudo": 1.50,
      "jamon-dulce": 2.00,
      "miel": 2.00,
      "mix-de-setas": 3.50,
      "mortadela": 1.50,
      "mozzarella-di-bufala": 1.50,
      "champinones": 1.50,
      "crema-de-huevo-con-pecorino": 1.00,
      "ventresca-de-atun": 3.00,
      "friarelli-grelos": 1.50,
      "gorgonzola": 1.50,
      "jamon-de-parma": 4.00,
      "bacalao-marinado-ahumado": 4.00,
      "berenjena": 2.00,
      "bresaola": 3.50,
      "burrata": 4.00,
      "burrata-ahumada": 4.50,
      "burrata-tartufata": 4.50,
      "calabacin": 1.50,
      "capocollo": 3.00,
      "cebolla-roja-asada": 1.50,
      "cebolla-roja-cruda": 1.50,
      "alcachofas": 1.00,
      "alcaparras": 0.50,
      "albahaca": 0.50
    },
    restaurante: { lat: 41.4900513, lng: 2.3660209 },  // Marina Port Premià
    zonasReparto: [[2, [15, 20]], [6, [20, 40]], [15, [30, 50]]],     // [km máx., [min, máx.] minutos] — PROVISIONAL
    mediodia: [13, 16],    // franja de comida: ahí el tiempo depende de la zona
    tiempoEntrega: [35, 50],  // minutos, horquilla orientativa
    tiempoRecogida: [20, 30],
    margenCierre: 30,      // último pedido: X minutos antes de cerrar
    /* Aviso de que el pedido puede llegar más frío: a más de lejosKm km (con GPS)
       o, sin GPS, si el código postal está en codigosLejos (pueblos a más de 6 km). */
    lejosKm: 6,
    codigosLejos: ["08317","08188","08390","08310","08391","08301","08302","08303","08304","08410","08170","08105","08911","08912","08913","08914","08915","08916","08917","08918","08430","08319","08160","08107","08392","08921","08922","08923","08924","08930"],
    codigosPostales: {
      "08330": "Premià de Mar",
      "08338": "Premià de Dalt",
      "08340": "Vilassar de Mar",
      "08339": "Vilassar de Dalt",
      "08329": "Teià",
      "08320": "El Masnou",
      "08348": "Cabrils",
      "08349": "Cabrera de Mar",
      "08328": "Alella",
      "08317": "Òrrius",
      "08188": "Vallromanes",
      "08390": "Montgat",
      "08310": "Argentona",
      "08391": "Tiana",
      "08301": "Mataró",
      "08302": "Mataró",
      "08303": "Mataró",
      "08304": "Mataró",
      "08410": "Vilanova del Vallès",
      "08170": "Montornès del Vallès",
      "08105": "Sant Fost de Campsentelles",
      "08911": "Badalona",
      "08912": "Badalona",
      "08913": "Badalona",
      "08914": "Badalona",
      "08915": "Badalona",
      "08916": "Badalona",
      "08917": "Badalona",
      "08918": "Badalona",
      "08430": "La Roca del Vallès",
      "08319": "Dosrius",
      "08160": "Montmeló",
      "08107": "Martorelles",
      "08392": "Sant Andreu de Llavaneres",
      "08921": "Santa Coloma de Gramenet",
      "08922": "Santa Coloma de Gramenet",
      "08923": "Santa Coloma de Gramenet",
      "08924": "Santa Coloma de Gramenet",
      "08930": "Sant Adrià de Besòs"
    }
  }
};
