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
    telefono: "864 62 76 21",
    envio: 4,              // gastos de envío (€)
    minimo: 15,            // pedido mínimo a domicilio (€), sin envío
    envase: 0.5,           // envase para llevar, por pizza o pasta (€)
    sinGlutenPan: 1,       // suplemento pan sin gluten en ensaladas (€)
    sinGluten: 2.5,        // suplemento base sin gluten, solo pizzas (€)
    pizzaBase: 10,         // «Crea tu pizza»: base con masa y tomate (€). PROVISIONAL
    pizzaIng: 0.8,         // «Crea tu pizza»: cada ingrediente (€). PROVISIONAL
    restaurante: { lat: 41.4900513, lng: 2.3660209 },  // Marina Port Premià
    zonasReparto: [[2, [15, 20]], [6, [20, 40]]],     // [km máx., [min, máx.] minutos] — PROVISIONAL
    mediodia: [13, 16],    // franja de comida: ahí el tiempo depende de la zona
    tiempoEntrega: [35, 50],  // minutos, horquilla orientativa
    tiempoRecogida: [20, 30],
    margenCierre: 30,      // último pedido: X minutos antes de cerrar
    codigosPostales: {
      "08330": "Premià de Mar",
      "08338": "Premià de Dalt",
      "08340": "Vilassar de Mar",
      "08320": "El Masnou"
    }
  }
};
