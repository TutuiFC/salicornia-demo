/* =========================================================================
   SALICORNIA — pedidos a domicilio y para recoger (pedido.html)

   - Los platos, precios y alérgenos se leen de carta.html al cargar: la
     carta es la única fuente de verdad (cambias un precio allí y aparece
     aquí). Necesita servidor (fetch no funciona con file://).
   - Envío, mínimo, envase, tiempos y zona: SAL_CONFIG.pedidos (config.js).
   - Sin backend: si hay número de WhatsApp en config.js, al confirmar se
     abre WhatsApp con el pedido escrito; si no, es una demo (como el
     formulario de reservas) y el pedido no se envía a ningún sitio.
   - Textos de la interfaz en STR (es/ca/en). Nombres y descripciones de
     platos se traducen con los diccionarios de la web (SAL_I18N).
   - El carrito y los datos del cliente se recuerdan en localStorage.
   ========================================================================= */
(function () {
  "use strict";

  var app = document.querySelector("[data-order-app]");
  if (!app) return;

  /* --- configuración ------------------------------------------------------ */
  var CFG = Object.assign(
    {
      whatsapp: "",
      api: "",
      telefono: "864 62 76 21",
      envio: 4,
      minimo: 15,
      envase: 0.5,
      sinGluten: 2.5,
      pizzaBase: 10,
      pizzaIng: 0.8,
      restaurante: { lat: 41.4900513, lng: 2.3660209 },
      zonasReparto: [[2, [15, 20]], [6, [20, 40]]],
      mediodia: [13, 16],
      tiempoEntrega: [35, 50],
      tiempoRecogida: [20, 30],
      margenCierre: 30,
      codigosPostales: { "08330": "Premià de Mar" }
    },
    (window.SAL_CONFIG && window.SAL_CONFIG.pedidos) || {}
  );
  var TEL_HREF = "tel:+34" + CFG.telefono.replace(/\D/g, "");

  /* mismo horario que main.js: día ISO (1 = lunes) → [hIni, mIni, hFin, mFin] */
  var SCHEDULE = {
    1: null,
    2: [[13, 0, 23, 0]],
    3: [[13, 0, 23, 30]],
    4: [[13, 0, 23, 30]],
    5: [[13, 0, 23, 30]],
    6: [[13, 0, 23, 30]],
    7: [[13, 0, 23, 0]]
  };

  var CATS = ["entrantes", "ensaladas", "pizzas", "especiales", "pasta", "postres", "bebidas"];
  var ENVASE_CATS = { pizzas: 1, especiales: 1, pasta: 1 };
  var PHOTOS = {
    "Tabla de embutidos italianos": { base: "tabla-embutidos", w: [460, 680] },
    "Burrata y Parma": { base: "pizza-burrata-parma", w: [420, 550] },
    "Picio alla Carbonara": { base: "pasta-carbonara", w: [460, 680] },
    "Cannoli alla siciliana": { base: "cannoli", w: [480, 720] },
    "Margherita": { base: "platos/margherita", w: [320, 400] },
    "Mezzemaniche alla Matriciana": { base: "platos/mezzemaniche-alla-matriciana", w: [320, 390] },
    "Pan sin gluten": { base: "platos/pan-sin-gluten", w: [320, 620] },
    "+39": { base: "platos/39", w: [320, 640] },
    "Aceitunas variadas": { base: "platos/aceitunas-variadas", w: [320, 640] },
    "Anchoas del Cantábrico (6 uds.)": { base: "platos/anchoas-del-cantabrico-6-uds", w: [320, 640] },
    "Azzurra": { base: "platos/azzurra", w: [320, 640] },
    "Barbara": { base: "platos/barbara", w: [320, 640] },
    "Calzone (pizza cerrada)": { base: "platos/calzone-pizza-cerrada", w: [320, 500] },
    "Capricciosa": { base: "platos/capricciosa", w: [320, 550] },
    "Crudaiola (blanca)": { base: "platos/crudaiola-blanca", w: [320, 640] },
    "Diavola": { base: "platos/diavola", w: [320, 640] },
    "Dragone": { base: "platos/dragone", w: [320, 640] },
    "Fornarina": { base: "platos/fornarina", w: [320, 640] },
    "Gnocchi alla Sorrentina": { base: "platos/gnocchi-alla-sorrentina", w: [320, 640] },
    "Huerta": { base: "platos/huerta", w: [320, 640] },
    "Lasaña de carne": { base: "platos/lasana-de-carne", w: [320, 640] },
    "Luna Rossa": { base: "platos/luna-rossa", w: [320, 640] },
    "Marinara": { base: "platos/marinara", w: [320, 640] },
    "Mascalzone Latino": { base: "platos/mascalzone-latino", w: [320, 640] },
    "Mediterránea": { base: "platos/mediterranea", w: [320, 640] },
    "Moro di Venezia": { base: "platos/moro-di-venezia", w: [320, 640] },
    "Napoli": { base: "platos/napoli", w: [320, 640] },
    "Panzanella": { base: "platos/panzanella", w: [320, 640] },
    "Parmigiana": { base: "platos/parmigiana", w: [320, 640] },
    "Patatas bravas al horno": { base: "platos/patatas-bravas-al-horno", w: [320, 640] },
    "Port Premià": { base: "platos/port-premia", w: [320, 640] },
    "Prosciutto e funghi": { base: "platos/prosciutto-e-funghi", w: [320, 640] },
    "Quattro formaggi (blanca)": { base: "platos/quattro-formaggi-blanca", w: [320, 640] },
    "Ravioli de ricotta e spinaci, burro e salvia": { base: "platos/ravioli-de-ricotta-e-spinaci-burro-e-salvia", w: [320, 640] },
    "Ravioli de ricotta e spinaci, salsa de tomate": { base: "platos/ravioli-de-ricotta-e-spinaci-salsa-de-tomate", w: [320, 640] },
    "Regina Margherita": { base: "platos/regina-margherita", w: [320, 640] },
    "Salicornia": { base: "platos/salicornia", w: [320, 640] },
    "Spaghetti alla chitarra alle vongole e bottarga": { base: "platos/spaghetti-alla-chitarra-alle-vongole-e-bottarga", w: [320, 640] },
    "Speck y gorgonzola (blanca)": { base: "platos/speck-y-gorgonzola-blanca", w: [320, 640] },
    "Tagliatelle Boloñesa": { base: "platos/tagliatelle-bolonesa", w: [320, 640] },
    "Tartufata": { base: "platos/tartufata", w: [320, 640] },
    "Tiramisú": { base: "platos/tiramisu", w: [320, 640] },
    "Tirrenia": { base: "platos/tirrenia", w: [320, 640] },
    "Vegetariana": { base: "platos/vegetariana", w: [320, 640] },
    "Vitello tonnato": { base: "platos/vitello-tonnato", w: [320, 640] }
  };
  var FEATURED = ["Tabla de embutidos italianos", "Burrata y Parma", "Picio alla Carbonara", "Cannoli alla siciliana"];
  var ENTRY_HASH = location.hash; /* si entran con #cat-pizzas (por ejemplo desde «Crea tu pizza»), se baja a esa sección */
  var STORE_KEY = "salicornia_pedido_v1";
  var PROFILE_KEY = "salicornia_datos_v1"; /* datos de contacto, solo si el cliente marca «recordar» */
  var PAY_KEY = "salicornia_pago_v1";
  /* lo que dice el servidor: si se aceptan pedidos y qué pagos online están activos */
  var server = { accepting: true, online: [] };
  var ONLINE_METHODS = [
    { id: "online-card", logos: ["visa", "mastercard"], key: "ck.online_card" },
    { id: "google-pay", logo: "google-pay", label: "Google Pay" },
    { id: "apple-pay", logo: "apple-pay", label: "Apple Pay" },
    { id: "bizum", logo: "bizum", label: "Bizum" }
  ];
  function payMark(m) {
    if (m.logo) return '<img class="o-paylogo o-paylogo--' + m.id + '" src="assets/img/pay/' + m.logo + '.svg" alt="' + esc(m.label) + '" height="24" loading="lazy">';
    return '<span class="o-choice__t">' + esc(s(m.key)) + '</span><span class="o-paylogos" aria-hidden="true">' +
      m.logos.map(function (l) { return '<img src="assets/img/pay/' + l + '.svg" alt="" width="26" height="26" loading="lazy">'; }).join("") + "</span>";
  }
  function onlineMethod(id) {
    return ONLINE_METHODS.filter(function (m) { return m.id === id; })[0] || null;
  }

  /* --- textos de la interfaz ----------------------------------------------- */
  var STR = {
    es: {
      "hero.eyebrow": "Salicornia a domicilio",
      "hero.title": "Pide a casa",
      "hero.reviews": "+900 reseñas en Google",
      "hero.cuisine": "Pizza italiana · Pasta fresca",
      "crumb.home": "Inicio",
      "crumb.here": "Pedir",
      "mode.label": "Cómo quieres tu pedido",
      "mode.delivery": "A domicilio",
      "mode.pickup": "Recoger en local",
      "mode.delivery_sub": "{min}–{max} min · envío {fee}",
      "mode.pickup_sub": "{min}–{max} min · sin gastos",
      "fact.min": "Pedido mínimo {x}",
      "fact.zone": "Repartimos en {zones}",
      "fact.pay": "Pagas al recibir: efectivo o tarjeta",
      "status.open": "Abierto · aceptamos pedidos hasta las {t}",
      "status.later_today": "Abrimos hoy a las {t} · ya puedes programar tu pedido",
      "status.closed": "Ahora cerrado · programa tu pedido para {when}",
      "search.placeholder": "Buscar plato o ingrediente",
      "search.label": "Buscar en la carta",
      "search.none": "No hemos encontrado nada para «{q}».",
      "search.clear": "Borrar búsqueda",
      "cats.label": "Categorías de la carta",
      "featured.title": "Destacados de la casa",
      "create.cta": "Crea tu pizza",
      "create.hint": "Elige tú los ingredientes",
      "loading": "Cargando la carta…",
      "load.error": "No hemos podido cargar la carta. Llámanos al {tel} y te tomamos el pedido por teléfono.",
      "card.add": "Añadir",
      "card.ask": "Consultar",
      "card.gf": "Opción sin gluten",
      "card.in_cart": "{n} en tu pedido",
      "card.open": "{name}, {price}. Ver detalles y añadir",
      "dlg.close": "Cerrar",
      "dlg.base": "Base",
      "dlg.base_normal": "Masa normal",
      "dlg.base_gf": "Masa sin gluten",
      "dlg.pan_normal": "Pan normal (con gluten)",
      "dlg.pan_gf": "Pan sin gluten",
      "card.gf_pan": "Opción pan sin gluten",
      "cart.gf_pan": "Pan sin gluten (plato sin gluten)",
      "cart.pan_normal": "Pan normal (con gluten)",
      "dlg.notes": "Indicaciones para cocina",
      "dlg.optional": "opcional",
      "dlg.notes_ph": "Ej.: sin cebolla, bien hecha…",
      "dlg.pasta": "Tipo de pasta",
      "dlg.notes_hint": "Quitar ingredientes no cambia el precio.",
      "dlg.envase": "Incluye envase para llevar: +{x} por unidad.",
      "dlg.add": "Añadir {n} · {total}",
      "dlg.qty": "Cantidad",
      "dlg.less": "Quitar uno",
      "dlg.more": "Añadir uno",
      "dlg.ask": "Cambia cada día según el mercado. Pregúntanos por teléfono y te lo añadimos al pedido.",
      "dlg.call": "Llamar · {tel}",
      "cart.title": "Tu pedido",
      "cart.empty_t": "Tu pedido está vacío",
      "cart.empty_p": "Elige tus platos de la carta y aparecerán aquí.",
      "cart.subtotal": "Subtotal",
      "cart.envases": "Envases para llevar ({n})",
      "cart.delivery": "Gastos de envío",
      "cart.pickup": "Recogida en local",
      "cart.free": "Gratis",
      "cart.total": "Total",
      "cart.min_left": "Te faltan {x} para el pedido mínimo a domicilio ({min}).",
      "cart.checkout": "Tramitar pedido",
      "cart.remove": "Eliminar {name}",
      "cart.less": "Quitar uno de {name}",
      "cart.more": "Añadir uno de {name}",
      "cart.gf": "Sin gluten",
      "cart.view": "Ver pedido",
      "cart.items_one": "{n} plato",
      "cart.items_many": "{n} platos",
      "cart.added": "Añadido: {name}",
      "cart.vat": "Precios con IVA incluido.",
      "ck.back": "Volver a la carta",
      "ck.title": "Tramitar pedido",
      "ck.s1": "Entrega",
      "ck.street": "Calle",
      "ck.number": "Número",
      "ck.floor": "Piso, puerta",
      "ck.cp": "Población",
      "ck.cp_ph": "Elige tu población",
      "ck.rider": "Indicaciones para el repartidor",
      "ck.rider_ph": "Ej.: portal azul, timbre 2B",
      "ck.zone_note": "Solo repartimos en estas poblaciones. Si estás en otra, elige «Recoger en local».",
      "ck.pickup_at": "Recoge tu pedido en",
      "ck.pickup_addr": "Marina Port Premià, Local 408/409 · 08330 Premià de Mar",
      "ck.map": "Cómo llegar",
      "ck.s2": "¿Cuándo?",
      "ck.asap": "Lo antes posible",
      "ck.asap_eta": "Aprox. {from}–{to}",
      "ck.asap_off": "No disponible: ahora estamos cerrados.",
      "ck.later": "Programar",
      "ck.later_sub": "Elige día y hora",
      "ck.day": "Día",
      "ck.time": "Hora",
      "ck.today": "Hoy",
      "ck.tomorrow": "Mañana",
      "ck.s3": "Tus datos",
      "ck.name": "Nombre",
      "ck.phone": "Teléfono",
      "ck.email": "Email",
      "ck.phone_hint": "Solo te llamaremos si hay que confirmar algo.",
      "ck.remember": "Recordar mis datos en este dispositivo para el próximo pedido",
      "ck.remember_hint": "Se guardan solo en tu navegador, no en nuestro servidor. Desmarca la casilla para borrarlos.",
      "ck.s4": "Pago",
      "ck.cash": "Efectivo",
      "ck.card": "Tarjeta al recibir",
      "ck.card_pickup": "Tarjeta en el local",
      "ck.cash_with": "¿Con cuánto pagarás?",
      "ck.cash_hint": "Para llevarte el cambio justo.",
      "ck.pay_online": "Pagar ahora, online",
      "ck.pay_deliver_d": "Pagar al recibir",
      "ck.pay_deliver_p": "Pagar en el local",
      "ck.online_card": "Tarjeta de crédito o débito",
      "ck.soon": "Próximamente",
      "ck.pay_now": "Pagar {total}",
      "pay.soon_t": "Pago online no disponible todavía",
      "pay.soon_p": "Estamos preparando el pago con {method}. De momento puedes pagar el pedido al recibirlo, en efectivo o con tarjeta.",
      "pay.soon_b": "Pagar al recibir",
      "pay.soon_c": "Elegir otro método",
      "ck.pay_note": "El pago online llegará pronto. Por ahora pagas al recibir el pedido.",
      "ck.s5": "Alergias e intolerancias",
      "ck.allergy_ph": "Cuéntanos cualquier alergia o intolerancia",
      "ck.allergy_hint": "Revisamos cada plato y te llamamos si hay algún problema.",
      "ck.privacy_a": "Al hacer el pedido, aceptas que usemos tus datos solo para preparar y entregar este pedido. Más información en la ",
      "ck.privacy_link": "política de privacidad",
      "ck.confirm": "Comprar · {total}",
      "ck.terms_a": "He leído y acepto las ",
      "ck.terms_link": "condiciones de venta",
      "err.terms": "Para hacer el pedido tienes que aceptar las condiciones de venta.",
      "ck.sending": "Enviando pedido…",
      "ck.redirect": "Abriendo el pago seguro…",
      "err.send": "No hemos podido enviar el pedido. Comprueba la conexión e inténtalo de nuevo, o llámanos al {tel}.",
      "err.paused": "Ahora mismo no aceptamos pedidos online. Llámanos al {tel} y te lo tomamos por teléfono.",
      "err.closed": "Ya no aceptamos pedidos para «lo antes posible». Elige una hora programada.",
      "err.rate": "Has hecho varios pedidos seguidos. Espera unos minutos o llámanos al {tel}.",
      "err.invalid": "Revisa los datos del pedido e inténtalo de nuevo.",
      "err.pay": "No hemos podido iniciar el pago online. Inténtalo de nuevo o elige pagar al recibir.",
      "pay.cancelled": "Has cancelado el pago. El pedido no se ha realizado: puedes intentarlo de nuevo.",
      "done.n4_paid": "Ya está pagado online ({method}).",
      "done.n4_sim": "Pago de prueba ({method}): no se ha cobrado nada. Pagas al recibirlo.",
      "done.pay_check": "Estamos confirmando tu pago con el banco. Si tienes cualquier duda, llámanos al {tel}.",
      "status.paused": "Pedidos online en pausa ahora mismo · Llámanos al {tel}",
      "ck.summary": "Resumen",
      "ck.edit": "Editar",
      "ck.req": "obligatorio",
      "err.street": "Escribe la calle.",
      "err.number": "Falta el número.",
      "err.cp": "Elige tu población.",
      "err.time": "Elige una hora.",
      "err.name": "Pon tu nombre.",
      "err.phone": "Pon un teléfono de contacto.",
      "err.phone_bad": "Este teléfono no parece correcto.",
      "err.email_req": "Pon tu email para enviarte la confirmación.",
      "err.email": "Este email no parece correcto.",
      "err.cash": "Pon un importe igual o mayor que el total.",
      "err.min": "El pedido mínimo a domicilio es de {min}.",
      "done.eyebrow": "Pedido {ref}",
      "done.title": "¡Gracias, {name}! Pedido recibido",
      "done.title_wa": "Último paso: envíanos el pedido por WhatsApp",
      "done.wa_p": "Se ha abierto WhatsApp con tu pedido ya escrito. Pulsa enviar para que nos llegue.",
      "done.wa_btn": "Abrir WhatsApp",
      "done.eta_delivery": "Llegará aprox. entre las {from} y las {to} a {addr}.",
      "done.eta_pickup": "Podrás recogerlo a partir de las {from} en Marina Port Premià, Local 408/409.",
      "done.sched_delivery": "Te lo llevamos {day} a las {time} a {addr}.",
      "done.on_date": "el {date}",
      "done.sched_pickup": "Podrás recogerlo {day} a las {time} en Marina Port Premià, Local 408/409.",
      "done.next": "Qué pasa ahora",
      "done.n1": "Revisamos tu pedido. Si hay que confirmar algo, te llamamos al {phone}.",
      "done.n2": "Lo preparamos al momento en cocina.",
      "done.n3_delivery": "Nuestro repartidor te lo lleva a casa.",
      "done.n3_pickup": "Te lo tenemos listo en el local.",
      "done.n4": "Pagas al recibirlo: {method}.",
      "done.call": "Llamar al restaurante",
      "done.again": "Hacer otro pedido",
      "geo.btn": "Usar mi ubicación",
      "geo.hint": "Rellena la dirección y calcula cuánto tardamos. Tu ubicación solo se usa para este pedido.",
      "geo.finding": "Buscando tu ubicación…",
      "geo.ok": "Estás a {km} km de nosotros.",
      "geo.ok_eta": "Estás a {km} km de nosotros. A esta hora tardamos {min}–{max} min en tu zona.",
      "geo.out": "Estás a {km} km y repartimos hasta {max} km. Elige «Recoger en local» o llámanos.",
      "geo.noaddr": "Hemos guardado tu ubicación, pero no hemos podido leer la calle. Escríbela tú.",
      "geo.denied": "No tenemos permiso para usar tu ubicación. Actívalo en el navegador o escribe la dirección.",
      "geo.unavailable": "No se ha podido obtener tu ubicación. Escribe la dirección.",
      "geo.cleared": "Has cambiado la dirección: ya no usamos la ubicación del GPS.",
      "geo.server_out": "Tu ubicación queda fuera de nuestra zona de reparto. Elige «Recoger en local» o llámanos al {tel}.",
      "done.track": "Seguir mi pedido en el mapa",
      "done.receipt": "Tu pedido"
    },
    ca: {
      "hero.eyebrow": "Salicornia a domicili",
      "hero.title": "Demana a casa",
      "hero.reviews": "+900 ressenyes a Google",
      "hero.cuisine": "Pizza italiana · Pasta fresca",
      "crumb.home": "Inici",
      "crumb.here": "Demanar",
      "mode.label": "Com vols la comanda",
      "mode.delivery": "A domicili",
      "mode.pickup": "Recollir al local",
      "mode.delivery_sub": "{min}–{max} min · enviament {fee}",
      "mode.pickup_sub": "{min}–{max} min · sense despeses",
      "fact.min": "Comanda mínima {x}",
      "fact.zone": "Repartim a {zones}",
      "fact.pay": "Pagues en rebre-la: efectiu o targeta",
      "status.open": "Obert · acceptem comandes fins a les {t}",
      "status.later_today": "Obrim avui a les {t} · ja pots programar la comanda",
      "status.closed": "Ara tancat · programa la comanda per a {when}",
      "search.placeholder": "Cerca un plat o ingredient",
      "search.label": "Cerca a la carta",
      "search.none": "No hem trobat res per a «{q}».",
      "search.clear": "Esborra la cerca",
      "cats.label": "Categories de la carta",
      "featured.title": "Destacats de la casa",
      "create.cta": "Crea la teva pizza",
      "create.hint": "Tria tu els ingredients",
      "loading": "Carregant la carta…",
      "load.error": "No hem pogut carregar la carta. Truca'ns al {tel} i et prenem la comanda per telèfon.",
      "card.add": "Afegeix",
      "card.ask": "Consulta",
      "card.gf": "Opció sense gluten",
      "card.in_cart": "{n} a la comanda",
      "card.open": "{name}, {price}. Mostra detalls i afegeix",
      "dlg.close": "Tanca",
      "dlg.base": "Base",
      "dlg.base_normal": "Massa normal",
      "dlg.base_gf": "Massa sense gluten",
      "dlg.pan_normal": "Pa normal (amb gluten)",
      "dlg.pan_gf": "Pa sense gluten",
      "card.gf_pan": "Opció pa sense gluten",
      "cart.gf_pan": "Pa sense gluten (plat sense gluten)",
      "cart.pan_normal": "Pa normal (amb gluten)",
      "dlg.notes": "Indicacions per a la cuina",
      "dlg.optional": "opcional",
      "dlg.notes_ph": "Ex.: sense ceba, ben cuita…",
      "dlg.pasta": "Tipus de pasta",
      "dlg.notes_hint": "Treure ingredients no canvia el preu.",
      "dlg.envase": "Inclou envàs per emportar: +{x} per unitat.",
      "dlg.add": "Afegeix {n} · {total}",
      "dlg.qty": "Quantitat",
      "dlg.less": "Treu-ne un",
      "dlg.more": "Afegeix-ne un",
      "dlg.ask": "Canvia cada dia segons el mercat. Pregunta'ns per telèfon i te'l afegim a la comanda.",
      "dlg.call": "Truca · {tel}",
      "cart.title": "La teva comanda",
      "cart.empty_t": "La teva comanda és buida",
      "cart.empty_p": "Tria els plats de la carta i apareixeran aquí.",
      "cart.subtotal": "Subtotal",
      "cart.envases": "Envasos per emportar ({n})",
      "cart.delivery": "Despeses d'enviament",
      "cart.pickup": "Recollida al local",
      "cart.free": "Gratuït",
      "cart.total": "Total",
      "cart.min_left": "Et falten {x} per a la comanda mínima a domicili ({min}).",
      "cart.checkout": "Tramita la comanda",
      "cart.remove": "Elimina {name}",
      "cart.less": "Treu una unitat de {name}",
      "cart.more": "Afegeix una unitat de {name}",
      "cart.gf": "Sense gluten",
      "cart.view": "Veure la comanda",
      "cart.items_one": "{n} plat",
      "cart.items_many": "{n} plats",
      "cart.added": "Afegit: {name}",
      "cart.vat": "Preus amb IVA inclòs.",
      "ck.back": "Torna a la carta",
      "ck.title": "Tramita la comanda",
      "ck.s1": "Lliurament",
      "ck.street": "Carrer",
      "ck.number": "Número",
      "ck.floor": "Pis, porta",
      "ck.cp": "Població",
      "ck.cp_ph": "Tria la població",
      "ck.rider": "Indicacions per al repartidor",
      "ck.rider_ph": "Ex.: portal blau, timbre 2B",
      "ck.zone_note": "Només repartim en aquestes poblacions. Si ets en una altra, tria «Recollir al local».",
      "ck.pickup_at": "Recull la comanda a",
      "ck.pickup_addr": "Marina Port Premià, Local 408/409 · 08330 Premià de Mar",
      "ck.map": "Com arribar-hi",
      "ck.s2": "Quan?",
      "ck.asap": "Com més aviat millor",
      "ck.asap_eta": "Aprox. {from}–{to}",
      "ck.asap_off": "No disponible: ara som tancats.",
      "ck.later": "Programa-la",
      "ck.later_sub": "Tria dia i hora",
      "ck.day": "Dia",
      "ck.time": "Hora",
      "ck.today": "Avui",
      "ck.tomorrow": "Demà",
      "ck.s3": "Les teves dades",
      "ck.name": "Nom",
      "ck.phone": "Telèfon",
      "ck.email": "Correu electrònic",
      "ck.phone_hint": "Només et trucarem si cal confirmar alguna cosa.",
      "ck.remember": "Recordar les meves dades en aquest dispositiu per a la propera comanda",
      "ck.remember_hint": "Es guarden només al teu navegador, no al nostre servidor. Desmarca la casella per esborrar-les.",
      "ck.s4": "Pagament",
      "ck.cash": "Efectiu",
      "ck.card": "Targeta en rebre-la",
      "ck.card_pickup": "Targeta al local",
      "ck.cash_with": "Amb quant pagaràs?",
      "ck.cash_hint": "Per portar-te el canvi just.",
      "ck.pay_online": "Paga ara, en línia",
      "ck.pay_deliver_d": "Pagar en rebre",
      "ck.pay_deliver_p": "Pagar al local",
      "ck.online_card": "Targeta de crèdit o dèbit",
      "ck.soon": "Properament",
      "ck.pay_now": "Paga {total}",
      "pay.soon_t": "Pagament en línia encara no disponible",
      "pay.soon_p": "Estem preparant el pagament amb {method}. De moment pots pagar la comanda en rebre-la, en efectiu o amb targeta.",
      "pay.soon_b": "Pagar en rebre",
      "pay.soon_c": "Triar un altre mètode",
      "ck.pay_note": "El pagament en línia arribarà aviat. De moment pagues en rebre la comanda.",
      "ck.s5": "Al·lèrgies i intoleràncies",
      "ck.allergy_ph": "Explica'ns qualsevol al·lèrgia o intolerància",
      "ck.allergy_hint": "Revisem cada plat i et truquem si hi ha cap problema.",
      "ck.privacy_a": "En fer la comanda, acceptes que fem servir les teves dades només per preparar i lliurar aquesta comanda. Més informació a la ",
      "ck.privacy_link": "política de privacitat",
      "ck.confirm": "Comprar · {total}",
      "ck.terms_a": "He llegit i accepto les ",
      "ck.terms_link": "condicions de venda",
      "err.terms": "Per fer la comanda has d’acceptar les condicions de venda.",
      "ck.sending": "Enviant la comanda…",
      "ck.redirect": "Obrint el pagament segur…",
      "err.send": "No hem pogut enviar la comanda. Comprova la connexió i torna-ho a provar, o truca’ns al {tel}.",
      "err.paused": "Ara mateix no acceptem comandes en línia. Truca’ns al {tel} i te la prenem per telèfon.",
      "err.closed": "Ja no acceptem comandes per a «al més aviat possible». Tria una hora programada.",
      "err.rate": "Has fet diverses comandes seguides. Espera uns minuts o truca’ns al {tel}.",
      "err.invalid": "Revisa les dades de la comanda i torna-ho a provar.",
      "err.pay": "No hem pogut iniciar el pagament en línia. Torna-ho a provar o tria pagar en rebre-la.",
      "pay.cancelled": "Has cancel·lat el pagament. La comanda no s’ha fet: pots tornar-ho a provar.",
      "done.n4_paid": "Ja està pagada en línia ({method}).",
      "done.n4_sim": "Pagament de prova ({method}): no s'ha cobrat res. Pagues en rebre-la.",
      "done.pay_check": "Estem confirmant el pagament amb el banc. Si tens qualsevol dubte, truca’ns al {tel}.",
      "status.paused": "Comandes en línia en pausa ara mateix · Truca’ns al {tel}",
      "ck.summary": "Resum",
      "ck.edit": "Edita",
      "ck.req": "obligatori",
      "err.street": "Escriu el carrer.",
      "err.number": "Falta el número.",
      "err.cp": "Tria la població.",
      "err.time": "Tria una hora.",
      "err.name": "Escriu el teu nom.",
      "err.phone": "Escriu un telèfon de contacte.",
      "err.phone_bad": "Aquest telèfon no sembla correcte.",
      "err.email_req": "Escriu el teu correu per enviar-te la confirmació.",
      "err.email": "Aquest correu no sembla correcte.",
      "err.cash": "Posa un import igual o superior al total.",
      "err.min": "La comanda mínima a domicili és de {min}.",
      "done.eyebrow": "Comanda {ref}",
      "done.title": "Gràcies, {name}! Comanda rebuda",
      "done.title_wa": "Últim pas: envia'ns la comanda per WhatsApp",
      "done.wa_p": "S'ha obert WhatsApp amb la comanda ja escrita. Prem enviar perquè ens arribi.",
      "done.wa_btn": "Obre WhatsApp",
      "done.eta_delivery": "Arribarà aprox. entre les {from} i les {to} a {addr}.",
      "done.eta_pickup": "La podràs recollir a partir de les {from} a Marina Port Premià, Local 408/409.",
      "done.sched_delivery": "Te la portem {day} a les {time} a {addr}.",
      "done.on_date": "el {date}",
      "done.sched_pickup": "La podràs recollir {day} a les {time} a Marina Port Premià, Local 408/409.",
      "done.next": "Què passa ara",
      "done.n1": "Revisem la comanda. Si cal confirmar alguna cosa, et truquem al {phone}.",
      "done.n2": "La preparem al moment a la cuina.",
      "done.n3_delivery": "El nostre repartidor te la porta a casa.",
      "done.n3_pickup": "Te la tenim a punt al local.",
      "done.n4": "Pagues en rebre-la: {method}.",
      "done.call": "Truca al restaurant",
      "done.again": "Fes una altra comanda",
      "geo.btn": "Usar la meva ubicació",
      "geo.hint": "Omple l'adreça i calcula quant tardem. La teva ubicació només s'usa per a aquesta comanda.",
      "geo.finding": "Buscant la teva ubicació…",
      "geo.ok": "Ets a {km} km de nosaltres.",
      "geo.ok_eta": "Ets a {km} km de nosaltres. A aquesta hora tardem {min}–{max} min a la teva zona.",
      "geo.out": "Ets a {km} km i repartim fins a {max} km. Tria «Recollir al local» o truca'ns.",
      "geo.noaddr": "Hem desat la teva ubicació, però no hem pogut llegir el carrer. Escriu-lo tu.",
      "geo.denied": "No tenim permís per usar la teva ubicació. Activa-ho al navegador o escriu l'adreça.",
      "geo.unavailable": "No s'ha pogut obtenir la teva ubicació. Escriu l'adreça.",
      "geo.cleared": "Has canviat l'adreça: ja no fem servir la ubicació del GPS.",
      "geo.server_out": "La teva ubicació queda fora de la nostra zona de repartiment. Tria «Recollir al local» o truca'ns al {tel}.",
      "done.track": "Seguir la meva comanda al mapa",
      "done.receipt": "La teva comanda"
    },
    en: {
      "hero.eyebrow": "Salicornia delivered",
      "hero.title": "Order to your door",
      "hero.reviews": "900+ Google reviews",
      "hero.cuisine": "Italian pizza · Fresh pasta",
      "crumb.home": "Home",
      "crumb.here": "Order",
      "mode.label": "How would you like your order",
      "mode.delivery": "Delivery",
      "mode.pickup": "Collection",
      "mode.delivery_sub": "{min}–{max} min · {fee} delivery",
      "mode.pickup_sub": "{min}–{max} min · no fee",
      "fact.min": "Minimum order {x}",
      "fact.zone": "We deliver to {zones}",
      "fact.pay": "Pay on delivery: cash or card",
      "status.open": "Open · taking orders until {t}",
      "status.later_today": "We open today at {t} · you can schedule your order now",
      "status.closed": "Closed now · schedule your order for {when}",
      "search.placeholder": "Search dishes or ingredients",
      "search.label": "Search the menu",
      "search.none": "Nothing found for “{q}”.",
      "search.clear": "Clear search",
      "cats.label": "Menu categories",
      "featured.title": "House favourites",
      "create.cta": "Create your pizza",
      "create.hint": "Choose the ingredients yourself",
      "loading": "Loading the menu…",
      "load.error": "We couldn't load the menu. Call us on {tel} and we'll take your order by phone.",
      "card.add": "Add",
      "card.ask": "Ask",
      "card.gf": "Gluten-free option",
      "card.in_cart": "{n} in your order",
      "card.open": "{name}, {price}. See details and add",
      "dlg.close": "Close",
      "dlg.base": "Base",
      "dlg.base_normal": "Regular base",
      "dlg.base_gf": "Gluten-free base",
      "dlg.pan_normal": "Regular bread (contains gluten)",
      "dlg.pan_gf": "Gluten-free bread",
      "card.gf_pan": "Gluten-free bread option",
      "cart.gf_pan": "Gluten-free bread (gluten-free dish)",
      "cart.pan_normal": "Regular bread (contains gluten)",
      "dlg.notes": "Notes for the kitchen",
      "dlg.optional": "optional",
      "dlg.notes_ph": "E.g. no onion, well done…",
      "dlg.pasta": "Pasta type",
      "dlg.notes_hint": "Removing ingredients doesn't change the price.",
      "dlg.envase": "Includes takeaway packaging: +{x} each.",
      "dlg.add": "Add {n} · {total}",
      "dlg.qty": "Quantity",
      "dlg.less": "Remove one",
      "dlg.more": "Add one",
      "dlg.ask": "It changes daily with the market. Ask us by phone and we'll add it to your order.",
      "dlg.call": "Call · {tel}",
      "cart.title": "Your order",
      "cart.empty_t": "Your order is empty",
      "cart.empty_p": "Pick dishes from the menu and they'll appear here.",
      "cart.subtotal": "Subtotal",
      "cart.envases": "Takeaway packaging ({n})",
      "cart.delivery": "Delivery fee",
      "cart.pickup": "Collection",
      "cart.free": "Free",
      "cart.total": "Total",
      "cart.min_left": "Add {x} more to reach the {min} delivery minimum.",
      "cart.checkout": "Go to checkout",
      "cart.remove": "Remove {name}",
      "cart.less": "One less {name}",
      "cart.more": "One more {name}",
      "cart.gf": "Gluten-free",
      "cart.view": "View order",
      "cart.items_one": "{n} item",
      "cart.items_many": "{n} items",
      "cart.added": "Added: {name}",
      "cart.vat": "Prices include VAT.",
      "ck.back": "Back to the menu",
      "ck.title": "Checkout",
      "ck.s1": "Delivery or collection",
      "ck.street": "Street",
      "ck.number": "Number",
      "ck.floor": "Flat, floor",
      "ck.cp": "Town",
      "ck.cp_ph": "Choose your town",
      "ck.rider": "Notes for the rider",
      "ck.rider_ph": "E.g. blue door, bell 2B",
      "ck.zone_note": "We only deliver to these towns. If you're elsewhere, choose “Collection”.",
      "ck.pickup_at": "Collect your order at",
      "ck.pickup_addr": "Marina Port Premià, Unit 408/409 · 08330 Premià de Mar",
      "ck.map": "Get directions",
      "ck.s2": "When?",
      "ck.asap": "As soon as possible",
      "ck.asap_eta": "Approx. {from}–{to}",
      "ck.asap_off": "Not available: we're closed right now.",
      "ck.later": "Schedule",
      "ck.later_sub": "Pick a day and time",
      "ck.day": "Day",
      "ck.time": "Time",
      "ck.today": "Today",
      "ck.tomorrow": "Tomorrow",
      "ck.s3": "Your details",
      "ck.name": "Name",
      "ck.phone": "Phone",
      "ck.email": "Email",
      "ck.phone_hint": "We'll only call if we need to confirm something.",
      "ck.remember": "Remember my details on this device for my next order",
      "ck.remember_hint": "Stored only in your browser, not on our server. Untick the box to delete them.",
      "ck.s4": "Payment",
      "ck.cash": "Cash",
      "ck.card": "Card on delivery",
      "ck.card_pickup": "Card at the restaurant",
      "ck.cash_with": "How much will you pay with?",
      "ck.cash_hint": "So we bring the right change.",
      "ck.pay_online": "Pay now, online",
      "ck.pay_deliver_d": "Pay on delivery",
      "ck.pay_deliver_p": "Pay at the restaurant",
      "ck.online_card": "Credit or debit card",
      "ck.soon": "Coming soon",
      "ck.pay_now": "Pay {total}",
      "pay.soon_t": "Online payment not available yet",
      "pay.soon_p": "We are getting {method} ready. For now you can pay when you receive your order, in cash or by card.",
      "pay.soon_b": "Pay on receipt",
      "pay.soon_c": "Choose another method",
      "ck.pay_note": "Online payment is coming soon. For now you pay when you get your order.",
      "ck.s5": "Allergies and intolerances",
      "ck.allergy_ph": "Tell us about any allergy or intolerance",
      "ck.allergy_hint": "We check every dish and call you if there's a problem.",
      "ck.privacy_a": "By placing your order, you agree that we use your details only to prepare and deliver it. More in our ",
      "ck.privacy_link": "privacy policy",
      "ck.confirm": "Buy now · {total}",
      "ck.terms_a": "I have read and accept the ",
      "ck.terms_link": "terms of sale",
      "err.terms": "To place your order you need to accept the terms of sale.",
      "ck.sending": "Sending your order…",
      "ck.redirect": "Opening secure payment…",
      "err.send": "We couldn’t send your order. Check your connection and try again, or call us on {tel}.",
      "err.paused": "We’re not taking online orders right now. Call us on {tel} and we’ll take it by phone.",
      "err.closed": "We’re no longer taking orders for “as soon as possible”. Please choose a time.",
      "err.rate": "You’ve placed several orders in a row. Wait a few minutes or call us on {tel}.",
      "err.invalid": "Please check your order details and try again.",
      "err.pay": "We couldn’t start the online payment. Try again or choose to pay on receipt.",
      "pay.cancelled": "You cancelled the payment. Your order hasn’t been placed: you can try again.",
      "done.n4_paid": "It’s already paid online ({method}).",
      "done.n4_sim": "Test payment ({method}): nothing has been charged. You pay on delivery.",
      "done.pay_check": "We’re confirming your payment with the bank. If you have any questions, call us on {tel}.",
      "status.paused": "Online orders paused right now · Call us on {tel}",
      "ck.summary": "Summary",
      "ck.edit": "Edit",
      "ck.req": "required",
      "err.street": "Enter your street.",
      "err.number": "Enter the number.",
      "err.cp": "Choose your town.",
      "err.time": "Choose a time.",
      "err.name": "Please enter your name.",
      "err.phone": "Please enter a contact phone number.",
      "err.phone_bad": "This phone number doesn't look right.",
      "err.email_req": "Please enter your email so we can send you the confirmation.",
      "err.email": "This email doesn't look right.",
      "err.cash": "Enter an amount equal to or above the total.",
      "err.min": "The minimum for delivery is {min}.",
      "done.eyebrow": "Order {ref}",
      "done.title": "Thank you, {name}! Order received",
      "done.title_wa": "Last step: send us your order on WhatsApp",
      "done.wa_p": "WhatsApp has opened with your order already written. Tap send so it reaches us.",
      "done.wa_btn": "Open WhatsApp",
      "done.eta_delivery": "It should arrive between {from} and {to} at {addr}.",
      "done.eta_pickup": "It'll be ready to collect from {from} at Marina Port Premià, Unit 408/409.",
      "done.sched_delivery": "We'll bring it {day} at {time} to {addr}.",
      "done.on_date": "on {date}",
      "done.sched_pickup": "It'll be ready to collect {day} at {time} at Marina Port Premià, Unit 408/409.",
      "done.next": "What happens next",
      "done.n1": "We check your order. If we need to confirm anything, we'll call you on {phone}.",
      "done.n2": "We make it fresh in our kitchen.",
      "done.n3_delivery": "Our rider brings it to your door.",
      "done.n3_pickup": "We'll have it ready for you at the restaurant.",
      "done.n4": "You pay on receipt: {method}.",
      "done.call": "Call the restaurant",
      "done.again": "Place another order",
      "geo.btn": "Use my location",
      "geo.hint": "Fills in your address and works out how long we take. Your location is only used for this order.",
      "geo.finding": "Finding your location…",
      "geo.ok": "You are {km} km from us.",
      "geo.ok_eta": "You are {km} km from us. At this time we take {min}–{max} min in your area.",
      "geo.out": "You are {km} km away and we deliver up to {max} km. Choose “Collection” or call us.",
      "geo.noaddr": "We saved your location but couldn't read the street. Please type it.",
      "geo.denied": "We don't have permission to use your location. Turn it on in your browser or type your address.",
      "geo.unavailable": "We couldn't get your location. Please type your address.",
      "geo.cleared": "You changed the address: we no longer use the GPS location.",
      "geo.server_out": "Your location is outside our delivery area. Choose “Collection” or call us on {tel}.",
      "done.track": "Track my order on the map",
      "done.receipt": "Your order"
    }
  };

  /* --- utilidades ------------------------------------------------------------ */
  function lang() {
    return (window.I18N && window.I18N.lang) || "es";
  }
  function locale() {
    return { es: "es-ES", ca: "ca-ES", en: "en-GB" }[lang()] || "es-ES";
  }
  function s(key, vars, forceLang) {
    var tbl = STR[forceLang || lang()] || STR.es;
    var v = tbl[key] != null ? tbl[key] : STR.es[key];
    if (v == null) return key;
    if (vars) {
      v = v.replace(/\{(\w+)\}/g, function (m, k) {
        return vars[k] != null ? vars[k] : m;
      });
    }
    return v;
  }
  function norm(txt) {
    return (txt || "").replace(/\s+/g, " ").trim();
  }
  /* traduce textos de la carta con los diccionarios de la web */
  function tr(txt) {
    var l = lang();
    if (l === "es" || !window.SAL_I18N || !window.SAL_I18N[l]) return txt;
    var v = window.SAL_I18N[l][norm(txt)];
    return v != null ? v : txt;
  }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function money(n, forceLang) {
    var loc = forceLang ? "es-ES" : locale();
    return new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(n);
  }
  function fold(txt) {
    return norm(txt).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function slug(txt) {
    return fold(txt).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function hhmm(min) {
    min = ((min % 1440) + 1440) % 1440;
    return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
  }
  function isoDay(d) {
    return d.getDay() === 0 ? 7 : d.getDay();
  }
  function dateKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function nowMin() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  function icon(name, size) {
    return '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" aria-hidden="true"><use href="#' + name + '"/></svg>';
  }

  /* --- estado y persistencia ---------------------------------------------------- */
  var state = {
    mode: "delivery",
    cart: [],
    customer: { name: "", phone: "", email: "", street: "", number: "", floor: "", cp: "", rider: "", lat: "", lng: "", distM: "" },
    when: { type: "asap", day: "", time: "" },
    pay: { method: "cash", cashWith: "" },
    allergies: "",
    terms: false,
    remember: false
  };

  var PROFILE_FIELDS = ["name", "phone", "email", "street", "number", "floor", "cp", "rider"];
  function saveProfile() {
    try {
      var p = {};
      PROFILE_FIELDS.forEach(function (k) { p[k] = state.customer[k] || ""; });
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (e) { /* noop */ }
  }
  function forgetProfile() {
    try { localStorage.removeItem(PROFILE_KEY); } catch (e) { /* noop */ }
  }

  function load() {
    try {
      var rawP = localStorage.getItem(PROFILE_KEY);
      if (rawP) {
        var prof = JSON.parse(rawP);
        PROFILE_FIELDS.forEach(function (k) { if (typeof prof[k] === "string") state.customer[k] = prof[k]; });
        state.remember = true;
      }
    } catch (e) { /* noop */ }
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved.mode === "pickup" || saved.mode === "delivery") state.mode = saved.mode;
      if (Array.isArray(saved.cart)) state.cart = saved.cart;
      if (saved.customer) {
        Object.keys(saved.customer).forEach(function (k) {
          /* el borrador solo pisa los datos recordados si trae algo escrito */
          if (saved.customer[k] || !state.remember) state.customer[k] = saved.customer[k];
        });
      }
      if (saved.pay && (saved.pay.method === "cash" || saved.pay.method === "card")) state.pay.method = saved.pay.method;
    } catch (e) { /* sin almacenamiento: se empieza de cero */ }
  }
  function save() {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ mode: state.mode, cart: state.cart, customer: state.customer, pay: { method: state.pay.method } })
      );
    } catch (e) { /* noop */ }
  }

  /* --- carta: se lee de carta.html ----------------------------------------------- */
  var products = [];
  var byId = {};
  var sections = [];

  function parseCarta(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    CATS.forEach(function (catId) {
      var sec = doc.getElementById(catId);
      if (!sec) return;
      var h2 = sec.querySelector("h2");
      var lede = sec.querySelector(".lede");
      var section = {
        id: catId,
        label: h2 ? norm(h2.textContent) : catId,
        lede: lede ? norm(lede.textContent) : "",
        items: []
      };
      var headGroup = sec.querySelector(".menu-group--head > h3");
      sec.querySelectorAll("li").forEach(function (li) {
        var priceEl = li.querySelector(":scope > .menu-price");
        var nameEl = li.querySelector(":scope > h3, :scope > h4");
        if (!priceEl || !nameEl) return;
        var name = norm(nameEl.textContent);
        var m = priceEl.textContent.match(/(\d+)[,.](\d{2})/);
        var group = li.closest(".menu-group");
        var groupH = (group && group.querySelector(":scope > h3")) || headGroup;
        var descEl = li.querySelector(":scope > p");
        var tags = [];
        var gfOption = false;
        li.querySelectorAll(":scope > .tags .tag").forEach(function (t) {
          var txt = norm(t.textContent);
          var ic = t.getAttribute("data-icon") || "";
          if (ic === "sin-gluten" && /^Opci/i.test(txt)) {
            gfOption = true;
            return;
          }
          tags.push({ icon: ic, text: txt });
        });
        var p = {
          id: slug(catId + "-" + name),
          cat: catId,
          group: groupH ? norm(groupH.textContent) : "",
          name: name,
          desc: descEl ? norm(descEl.textContent) : "",
          price: m ? parseFloat(m[1] + "." + m[2]) : null,
          tags: tags,
          gfOption: gfOption,
          variantsLabel: li.getAttribute("data-variants-label") || "Pasta",
          variants: (li.getAttribute("data-variants") || "").split("|").map(function (v) { return v.trim(); }).filter(Boolean),
          envase: !!ENVASE_CATS[catId],
          photo: PHOTOS[name] || null
        };
        if (byId[p.id]) return;
        byId[p.id] = p;
        products.push(p);
        section.items.push(p);
      });
      if (section.items.length) sections.push(section);
    });
  }

  /* --- horario, franjas y estado --------------------------------------------------- */
  function rangesFor(date) {
    return SCHEDULE[isoDay(date)] || [];
  }
  function leadMin(mode) {
    return (mode || state.mode) === "delivery" ? CFG.tiempoEntrega[1] : CFG.tiempoRecogida[1];
  }
  /* último momento para hacer un pedido ese día (en minutos) */
  function lastOrderMin(range) {
    return range[2] * 60 + range[3] - CFG.margenCierre;
  }
  function openNow() {
    var n = nowMin();
    return rangesFor(new Date()).some(function (r) {
      return n >= r[0] * 60 + r[1] && n <= lastOrderMin(r);
    });
  }
  function slotsFor(date, mode) {
    var out = [];
    var lead = leadMin(mode);
    var isToday = dateKey(date) === dateKey(new Date());
    rangesFor(date).forEach(function (r) {
      var start = r[0] * 60 + r[1] + lead;
      if (isToday) start = Math.max(start, nowMin() + lead);
      start = Math.ceil(start / 15) * 15;
      var end = lastOrderMin(r) + lead;
      for (var t = start; t <= end; t += 15) out.push(hhmm(t));
    });
    return out;
  }
  function scheduleDays(mode) {
    var days = [];
    var base = new Date();
    for (var i = 0; i < 8 && days.length < 4; i++) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      var slots = slotsFor(d, mode);
      if (slots.length) days.push({ key: dateKey(d), date: d, offset: i, slots: slots });
    }
    return days;
  }
  function dayLabel(day, forceLang) {
    if (day.offset === 0) return s("ck.today", null, forceLang);
    if (day.offset === 1) return s("ck.tomorrow", null, forceLang);
    var loc = forceLang ? "es-ES" : locale();
    return day.date.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
  }
  /* --- GPS: distancia al local y zona de reparto -------------------------------------------- */
  function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function zoneFor(km) {
    var z = CFG.zonasReparto || [];
    for (var i = 0; i < z.length; i++) if (km <= z[i][0]) return z[i];
    return null;
  }
  function maxKm() {
    var z = CFG.zonasReparto || [];
    return z.length ? z[z.length - 1][0] : 0;
  }
  function fmtKm(km) { return km.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  /* a la hora de comer, el tiempo de reparto depende de lo lejos que esté el cliente */
  function lunchZone() {
    var c = state.customer;
    if (state.mode !== "delivery" || c.distM === "" || c.distM == null) return null;
    var h = new Date().getHours(), m = CFG.mediodia || [13, 16];
    if (h < m[0] || h >= m[1]) return null;
    var z = zoneFor(Number(c.distM) / 1000);
    return z ? z[1] : null;
  }
  function etaRange() {
    var r = lunchZone() || (state.mode === "delivery" ? CFG.tiempoEntrega : CFG.tiempoRecogida);
    var n = nowMin();
    return { from: hhmm(n + r[0]), to: hhmm(n + r[1]) };
  }

  /* --- carrito ------------------------------------------------------------------ */
  function gfExtraOf(p) { return p && p.cat === "ensaladas" ? CFG.sinGlutenPan : CFG.sinGluten; }
  /* «Crea tu pizza»: base + cada ingrediente (los repetidos cuentan). El servidor lo recalcula. */
  var CUSTOM_ID = "pizzas-crea-tu-pizza";
  function ingCost(line) {
    return line.ing && line.ing.length ? Math.round(line.ing.length * CFG.pizzaIng * 100) / 100 : 0;
  }
  function ingSub(line) {
    var order = [], n = {};
    (line.ingN || []).forEach(function (x) { if (!n[x]) { n[x] = 0; order.push(x); } n[x]++; });
    return order.map(function (x) { return tr(x) + (n[x] > 1 ? " ×" + n[x] : ""); }).join(", ");
  }
  function addCustomProduct() {
    byId[CUSTOM_ID] = {
      id: CUSTOM_ID, cat: "pizzas", group: "", name: "Crea tu pizza", desc: "", price: CFG.pizzaBase, tags: [],
      gfOption: true, variantsLabel: "Pasta", variants: [], envase: true, photo: null, custom: true
    };
  }
  function unitPrice(line) {
    var p = byId[line.id];
    if (!p) return 0;
    return p.price + ingCost(line) + (line.gf ? gfExtraOf(p) : 0);
  }
  function totals() {
    var subtotal = 0;
    var count = 0;
    var envases = 0;
    state.cart.forEach(function (l) {
      var p = byId[l.id];
      if (!p) return;
      subtotal += unitPrice(l) * l.qty;
      count += l.qty;
      if (p.envase) envases += l.qty;
    });
    var envaseCost = envases * CFG.envase;
    var fee = state.mode === "delivery" && count ? CFG.envio : 0;
    return {
      subtotal: subtotal,
      count: count,
      envases: envases,
      envaseCost: envaseCost,
      fee: fee,
      total: subtotal + envaseCost + fee,
      minLeft: state.mode === "delivery" ? Math.max(0, CFG.minimo - subtotal) : 0
    };
  }
  function lineKey(id, gf, note) {
    return id + "|" + (gf ? "gf" : "") + "|" + fold(note || "");
  }
  function addToCart(id, qty, gf, note) {
    var key = lineKey(id, gf, note);
    var line = state.cart.filter(function (l) { return l.key === key; })[0];
    if (line) line.qty = Math.min(line.qty + qty, 99);
    else state.cart.push({ key: key, id: id, qty: qty, gf: !!gf, note: note || "" });
    save();
    renderCartAll();
    paintCardCounts();
    toast(s("cart.added", { name: tr(byId[id].name) }));
  }
  function changeQty(key, delta) {
    state.cart = state.cart
      .map(function (l) {
        if (l.key === key) l.qty = Math.max(0, Math.min(99, l.qty + delta));
        return l;
      })
      .filter(function (l) { return l.qty > 0; });
    save();
    renderCartAll();
    paintCardCounts();
    if (step === "checkout") renderCheckoutSummary();
  }

  /* --- vistas ------------------------------------------------------------------- */
  var step = "menu";
  var els = {
    status: app.querySelector("[data-order-status]"),
    modes: app.querySelectorAll("[data-mode]"),
    facts: app.querySelector("[data-order-facts]"),
    cats: app.querySelector("[data-cats]"),
    search: app.querySelector("[data-search]"),
    searchClear: app.querySelector("[data-search-clear]"),
    menu: app.querySelector("[data-menu]"),
    cart: app.querySelector("[data-cart-panel]"),
    checkout: app.querySelector("[data-checkout]"),
    done: app.querySelector("[data-done]"),
    bar: document.querySelector("[data-cart-bar]"),
    sheet: document.querySelector("[data-cart-sheet]"),
    sheetBody: document.querySelector("[data-cart-sheet-body]"),
    dialog: document.querySelector("[data-product-dialog]"),
    toast: document.querySelector("[data-toast]")
  };

  /* menu → tramitar (#tramitar, entrada nueva en el historial para que «atrás»
     vuelva a la carta) → confirmado (#confirmado, sustituye a #tramitar) */
  var menuScroll = 0;
  function setStep(next, opts) {
    opts = opts || {};
    if (step === "menu" && next !== "menu") menuScroll = window.scrollY || 0;
    step = next;
    document.body.setAttribute("data-order-step", next);
    app.querySelectorAll("[data-view]").forEach(function (v) {
      v.hidden = v.getAttribute("data-view") !== next;
    });
    if (els.sheet && els.sheet.open) els.sheet.close();
    renderBar();
    var y = next === "menu" && opts.restore ? menuScroll : 0;
    if (!opts.keepScroll) {
      try { window.scrollTo({ top: y, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
    }
    if (opts.fromPop) return;
    try {
      if (next === "checkout") history.pushState({ o: "checkout" }, "", "#tramitar");
      else if (next === "done") history.replaceState({ o: "done" }, "", "#confirmado");
      else if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    } catch (e) { /* noop */ }
  }
  function backToMenu() {
    if (location.hash === "#tramitar") history.back();
    else setStep("menu", { restore: true });
  }

  /* textos estáticos marcados con data-t / data-t-attr */
  function paintStatic() {
    document.querySelectorAll("[data-t]").forEach(function (el) {
      el.textContent = s(el.getAttribute("data-t"));
    });
    document.querySelectorAll("[data-t-attr]").forEach(function (el) {
      el.getAttribute("data-t-attr").split(";").forEach(function (pair) {
        var bits = pair.split(":");
        el.setAttribute(bits[0], s(bits[1]));
      });
    });
    var zones = Object.keys(CFG.codigosPostales).map(function (k) { return CFG.codigosPostales[k]; });
    if (els.facts) {
      els.facts.innerHTML =
        '<li>' + icon("i-bag", 16) + esc(s("fact.min", { x: money(CFG.minimo) })) + "</li>" +
        '<li>' + icon("i-pin", 16) + esc(s("fact.zone", { zones: zones.join(", ") })) + "</li>" +
        '<li>' + icon("i-card", 16) + esc(s("fact.pay")) + "</li>";
    }
    els.modes.forEach(function (btn) {
      var m = btn.getAttribute("data-mode");
      btn.setAttribute("aria-checked", String(m === state.mode));
      btn.querySelector("[data-mode-sub]").textContent =
        m === "delivery"
          ? s("mode.delivery_sub", { min: CFG.tiempoEntrega[0], max: CFG.tiempoEntrega[1], fee: money(CFG.envio) })
          : s("mode.pickup_sub", { min: CFG.tiempoRecogida[0], max: CFG.tiempoRecogida[1] });
    });
    renderStatus();
  }

  function renderStatus() {
    if (!els.status) return;
    var today = new Date();
    var ranges = rangesFor(today);
    var n = nowMin();
    var txt;
    var open = openNow();
    if (open) {
      var r = ranges.filter(function (x) { return n <= lastOrderMin(x); })[0];
      txt = s("status.open", { t: hhmm(lastOrderMin(r)) });
    } else if (ranges.length && n < ranges[0][0] * 60 + ranges[0][1]) {
      txt = s("status.later_today", { t: hhmm(ranges[0][0] * 60 + ranges[0][1]) });
    } else {
      var days = scheduleDays();
      txt = days.length ? s("status.closed", { when: dayLabel(days[0]).toLowerCase() + ", " + days[0].slots[0] }) : "";
    }
    if (!server.accepting) {
      txt = s("status.paused", { tel: CFG.telefono });
      open = false;
    }
    els.status.textContent = txt;
    els.status.classList.toggle("is-open", open);
  }

  /* --- carta ---------------------------------------------------------------------- */
  function allergenIcons(p) {
    return p.tags
      .filter(function (t) { return t.icon; })
      .map(function (t) {
        return '<span class="o-ico" data-icon="' + esc(t.icon) + '" title="' + esc(tr(t.text)) + '"></span>';
      })
      .join("");
  }
  function photoHTML(p, sizes, cls) {
    var ph = p.photo;
    var src = "assets/img/" + ph.base + "-";
    return (
      '<picture class="' + cls + '"><source type="image/webp" srcset="' +
      ph.w.map(function (w) { return src + w + ".webp " + w + "w"; }).join(", ") + '" sizes="' + sizes + '">' +
      '<img src="' + src + ph.w[0] + '.jpg" srcset="' +
      ph.w.map(function (w) { return src + w + ".jpg " + w + "w"; }).join(", ") + '" sizes="' + sizes +
      '" width="' + ph.w[1] + '" height="' + ph.w[1] + '" loading="lazy" decoding="async" alt=""></picture>'
    );
  }
  function priceLabel(p) {
    return p.price == null ? s("card.ask") : money(p.price);
  }
  function cardHTML(p) {
    var tagsText = p.tags.map(function (t) { return tr(t.text); }).join(" ");
    return (
      '<li class="o-card' + (p.photo ? " has-photo" : "") + (p.price == null ? " is-ask" : "") +
      '" data-card="' + p.id + '" data-search-text="' + esc(fold(p.name + " " + tr(p.name) + " " + p.desc + " " + tr(p.desc) + " " + tagsText + " " + p.group)) + '">' +
      '<button type="button" class="o-card__hit" data-open="' + p.id + '" data-label="' +
      esc(s("card.open", { name: tr(p.name), price: priceLabel(p) })) + '">' +
      '<span class="o-card__body">' +
      '<span class="o-card__name">' + esc(tr(p.name)) + "</span>" +
      (p.desc ? '<span class="o-card__desc">' + esc(tr(p.desc)) + "</span>" : "") +
      '<span class="o-card__foot"><span class="o-card__price">' + esc(priceLabel(p)) + "</span>" +
      '<span class="o-card__icons">' + allergenIcons(p) + "</span></span>" +
      (p.gfOption ? '<span class="o-card__gf">' + esc(p.cat === "ensaladas" ? s("card.gf_pan") : s("card.gf")) + " +" + esc(money(gfExtraOf(p))) + "</span>" : "") +
      "</span>" +
      (p.photo ? photoHTML(p, "120px", "o-card__photo") : "") +
      '<span class="o-card__add" aria-hidden="true">' + (p.price == null ? icon("i-phone", 16) : icon("i-plus", 18)) + "</span>" +
      '<span class="o-card__count" data-count hidden></span>' +
      "</button></li>"
    );
  }
  function renderMenu() {
    var featured = FEATURED.map(function (n) { return products.filter(function (p) { return p.name === n && p.photo && p.price != null; })[0]; }).filter(Boolean);
    var html = "";
    if (featured.length) {
      html +=
        '<section class="o-featured" data-featured aria-labelledby="o-feat-t"><h2 class="o-section__title" id="o-feat-t">' +
        esc(s("featured.title")) + '</h2><ul class="o-featured__row">' +
        featured.map(function (p) {
          return (
            '<li><button type="button" class="o-feat" data-open="' + p.id + '" aria-label="' +
            esc(s("card.open", { name: tr(p.name), price: priceLabel(p) })) + '">' +
            photoHTML(p, "(min-width: 700px) 260px, 70vw", "o-feat__photo") +
            '<span class="o-feat__add" aria-hidden="true">' + icon("i-plus", 18) + "</span>" +
            '<span class="o-feat__name">' + esc(tr(p.name)) + "</span>" +
            '<span class="o-feat__price">' + esc(money(p.price)) + "</span></button></li>"
          );
        }).join("") +
        "</ul></section>";
    }
    sections.forEach(function (sec) {
      html += '<section class="o-section" id="cat-' + sec.id + '" data-section="' + sec.id + '" aria-labelledby="o-t-' + sec.id + '">';
      html += '<header class="o-section__head"><h2 class="o-section__title" id="o-t-' + sec.id + '">' + esc(tr(sec.label)) + "</h2>";
      if (sec.lede) html += '<p class="o-section__lede">' + esc(tr(sec.lede)) + "</p>";
      /* «Crea tu pizza»: se puede volver a entrar desde aquí tantas veces como se quiera */
      if (sec.id === "pizzas") {
        html += '<a class="o-create" href="crea-tu-pizza.html"><span class="o-create__t">' + esc(s("create.cta")) + "</span>" +
          '<span class="o-create__h">' + esc(s("create.hint")) + "</span>" + icon("i-plus", 18) + "</a>";
      }
      html += "</header>";
      var groups = [];
      sec.items.forEach(function (p) {
        var g = groups[groups.length - 1];
        if (!g || g.name !== p.group) groups.push((g = { name: p.group, items: [] }));
        g.items.push(p);
      });
      groups.forEach(function (g) {
        html += '<div class="o-group">';
        if (g.name && groups.length > 1) html += '<h3 class="o-group__title">' + esc(tr(g.name)) + "</h3>";
        html += '<ul class="o-grid">' + g.items.map(cardHTML).join("") + "</ul></div>";
      });
      html += "</section>";
    });
    html += '<p class="o-empty" data-search-empty hidden></p>';
    els.menu.innerHTML = html;
    els.menu.removeAttribute("aria-busy");

    els.cats.innerHTML = sections
      .map(function (sec) {
        return '<li><a href="#cat-' + sec.id + '" data-cat-link="' + sec.id + '">' + esc(tr(sec.label)) + "</a></li>";
      })
      .join("");
    paintCardCounts();
    applySearch();
    setupSpy();
  }
  function paintCardCounts() {
    var counts = {};
    state.cart.forEach(function (l) { counts[l.id] = (counts[l.id] || 0) + l.qty; });
    els.menu.querySelectorAll("[data-card]").forEach(function (card) {
      var n = counts[card.getAttribute("data-card")] || 0;
      var c = card.querySelector("[data-count]");
      var hit = card.querySelector("[data-label]");
      card.classList.toggle("in-cart", n > 0);
      c.hidden = !n;
      c.textContent = n ? String(n) : "";
      hit.setAttribute("aria-label", hit.getAttribute("data-label") + (n ? ". " + s("card.in_cart", { n: n }) : ""));
    });
  }

  /* --- búsqueda ------------------------------------------------------------------- */
  function applySearch() {
    if (!els.search) return;
    var q = fold(els.search.value);
    var any = false;
    els.menu.querySelectorAll("[data-card]").forEach(function (card) {
      var hit = !q || card.getAttribute("data-search-text").indexOf(q) !== -1;
      card.hidden = !hit;
      if (hit) any = true;
    });
    els.menu.querySelectorAll(".o-group").forEach(function (g) {
      g.hidden = !g.querySelector("[data-card]:not([hidden])");
    });
    els.menu.querySelectorAll("[data-section]").forEach(function (sec) {
      sec.hidden = !sec.querySelector("[data-card]:not([hidden])");
    });
    var feat = els.menu.querySelector("[data-featured]");
    if (feat) feat.hidden = !!q;
    var empty = els.menu.querySelector("[data-search-empty]");
    if (empty) {
      empty.hidden = any;
      empty.textContent = any ? "" : s("search.none", { q: els.search.value.trim() });
    }
    if (els.searchClear) els.searchClear.hidden = !q;
  }

  /* --- categoría activa al hacer scroll ------------------------------------------------ */
  var spy;
  function setupSpy() {
    if (spy) spy.disconnect();
    if (!("IntersectionObserver" in window)) return;
    spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = e.target.getAttribute("data-section");
          els.cats.querySelectorAll("a").forEach(function (a) {
            var on = a.getAttribute("data-cat-link") === id;
            a.classList.toggle("is-active", on);
            if (on) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
            if (on && a.scrollIntoView && els.cats.scrollWidth > els.cats.clientWidth) {
              var box = els.cats.getBoundingClientRect();
              var r = a.getBoundingClientRect();
              if (r.left < box.left || r.right > box.right) {
                els.cats.scrollTo({ left: els.cats.scrollLeft + r.left - box.left - 16, behavior: "smooth" });
              }
            }
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    els.menu.querySelectorAll("[data-section]").forEach(function (sec) { spy.observe(sec); });
  }

  /* --- ficha de producto --------------------------------------------------------------- */
  var dlgState = null;
  function openProduct(id, opener) {
    var p = byId[id];
    if (!p || !els.dlgBody) return;
    dlgState = { id: id, qty: 1, gf: false, variant: p.variants && p.variants.length ? p.variants[0] : "", opener: opener };
    var tags = p.tags
      .map(function (t) {
        return '<li class="tag"' + (t.icon ? ' data-icon="' + esc(t.icon) + '"' : "") + ">" + esc(tr(t.text)) + "</li>";
      })
      .join("");
    var html =
      (p.photo ? photoHTML(p, "(min-width: 620px) 560px, 100vw", "o-dlg__photo") : "") +
      '<div class="o-dlg__body">' +
      '<p class="o-dlg__cat">' + esc(tr(sectionLabel(p.cat))) + (p.group ? " · " + esc(tr(p.group)) : "") + "</p>" +
      '<h2 class="o-dlg__title" id="o-dlg-title">' + esc(tr(p.name)) + "</h2>" +
      '<p class="o-dlg__price">' + esc(priceLabel(p)) + "</p>" +
      (p.desc ? '<p class="o-dlg__desc">' + esc(tr(p.desc)) + "</p>" : "") +
      (tags ? '<ul class="tags tags--dish o-dlg__tags">' + tags + "</ul>" : "");
    if (p.price == null) {
      html += '<p class="o-dlg__ask">' + esc(s("dlg.ask")) + "</p></div>" +
        '<div class="o-dlg__foot"><a class="btn btn--block" href="' + TEL_HREF + '">' + icon("i-phone", 17) + esc(s("dlg.call", { tel: CFG.telefono })) + "</a></div>";
    } else {
      if (p.variants && p.variants.length > 1) {
        html += '<fieldset class="o-opt"><legend class="o-opt__legend">' + esc(p.variantsLabel === "Pasta" ? s("dlg.pasta") : tr(p.variantsLabel)) + "</legend>" +
          p.variants.map(function (v, i) {
            return '<label class="o-choice"><input type="radio" name="o-var" value="' + esc(v) + '"' + (i === 0 ? " checked" : "") + '><span class="o-choice__box"><span class="o-choice__t">' + esc(tr(v)) + "</span></span></label>";
          }).join("") + "</fieldset>";
      }
      if (p.gfOption) {
        html +=
          '<fieldset class="o-opt"><legend class="o-opt__legend">' + esc(s("dlg.base")) + "</legend>" +
          '<label class="o-choice"><input type="radio" name="o-gf" value="0" checked><span class="o-choice__box"><span class="o-choice__t">' + esc(p.cat === "ensaladas" ? s("dlg.pan_normal") : s("dlg.base_normal")) + '</span></span></label>' +
          '<label class="o-choice"><input type="radio" name="o-gf" value="1"><span class="o-choice__box"><span class="o-choice__t">' + esc(p.cat === "ensaladas" ? s("dlg.pan_gf") : s("dlg.base_gf")) +
          '</span><span class="o-choice__s">+' + esc(money(gfExtraOf(p))) + "</span></span></label></fieldset>";
      }
      html +=
        '<div class="field o-dlg__notes"><label class="field__label" for="o-note">' + esc(s("dlg.notes")) +
        ' <span class="field__opt">(' + esc(s("dlg.optional")) + ")</span></label>" +
        '<textarea class="field__input" id="o-note" rows="2" maxlength="140" placeholder="' + esc(s("dlg.notes_ph")) + '"></textarea>' +
        '<p class="field__hint">' + esc(s("dlg.notes_hint")) + "</p></div>" +
        (p.envase ? '<p class="o-dlg__envase">' + esc(s("dlg.envase", { x: money(CFG.envase) })) + "</p>" : "") +
        "</div>" +
        '<div class="o-dlg__foot">' +
        '<div class="o-step" role="group" aria-label="' + esc(s("dlg.qty")) + '">' +
        '<button type="button" class="o-step__btn" data-dlg-qty="-1" aria-label="' + esc(s("dlg.less")) + '">' + icon("i-minus", 16) + "</button>" +
        '<output class="o-step__n" data-dlg-n aria-live="polite">1</output>' +
        '<button type="button" class="o-step__btn" data-dlg-qty="1" aria-label="' + esc(s("dlg.more")) + '">' + icon("i-plus", 16) + "</button></div>" +
        '<button type="button" class="btn o-dlg__add" data-dlg-add></button></div>';
    }
    els.dlgBody.innerHTML = html;
    paintDialogTotal();
    if (typeof els.dialog.showModal === "function") els.dialog.showModal();
    else els.dialog.setAttribute("open", "");
    els.dialog.scrollTop = 0;
    els.dlgBody.scrollTop = 0;
  }
  function paintDialogTotal() {
    if (!dlgState) return;
    var p = byId[dlgState.id];
    var btn = els.dlgBody.querySelector("[data-dlg-add]");
    var n = els.dlgBody.querySelector("[data-dlg-n]");
    var less = els.dlgBody.querySelector('[data-dlg-qty="-1"]');
    if (!btn || p.price == null) return;
    var unit = p.price + (dlgState.gf ? gfExtraOf(p) : 0);
    n.textContent = String(dlgState.qty);
    less.disabled = dlgState.qty <= 1;
    btn.textContent = s("dlg.add", { n: dlgState.qty, total: money(unit * dlgState.qty) });
  }
  function closeDialog() {
    if (els.dialog.open) {
      if (typeof els.dialog.close === "function") els.dialog.close();
      else els.dialog.removeAttribute("open");
    }
  }
  function sectionLabel(catId) {
    var sec = sections.filter(function (x) { return x.id === catId; })[0];
    return sec ? sec.label : catId;
  }

  /* --- panel del pedido (escritorio), hoja (móvil) y barra inferior ----------------------- */
  function cartHTML(opts) {
    var t = totals();
    var html = '<div class="o-cart">';
    html += '<div class="o-cart__head"><h2 class="o-cart__title">' + esc(s("cart.title")) + "</h2>";
    if (opts && opts.closable) {
      html += '<button type="button" class="o-x" data-sheet-close aria-label="' + esc(s("dlg.close")) + '">' + icon("i-close", 18) + "</button>";
    }
    html += "</div>";
    html += '<div class="o-seg o-seg--sm" role="radiogroup" aria-label="' + esc(s("mode.label")) + '">' +
      ["delivery", "pickup"].map(function (m) {
        return '<button type="button" role="radio" class="o-seg__btn" data-set-mode="' + m + '" aria-checked="' + (state.mode === m) + '">' +
          icon(m === "delivery" ? "i-scooter" : "i-store", 17) + esc(s("mode." + m)) + "</button>";
      }).join("") + "</div>";

    if (!state.cart.length) {
      html += '<div class="o-cart__empty">' + icon("i-bag", 34) + '<p class="o-cart__empty-t">' + esc(s("cart.empty_t")) +
        '</p><p>' + esc(s("cart.empty_p")) + "</p></div></div>";
      return html;
    }
    html += '<ul class="o-lines">' + state.cart.map(function (l) {
      var p = byId[l.id];
      if (!p) return "";
      var name = tr(p.name);
      var sub = [];
      if (p.cat === "ensaladas") sub.push(s(l.gf ? "cart.gf_pan" : "cart.pan_normal"));
      else if (l.gf) sub.push(s("cart.gf"));
      if (l.ing && l.ing.length) sub.push(ingSub(l));
      if (l.note) sub.push("«" + l.note + "»");
      return (
        '<li class="o-line"><div class="o-line__main"><span class="o-line__name">' + esc(name) + "</span>" +
        (sub.length ? '<span class="o-line__sub">' + esc(sub.join(" · ")) + "</span>" : "") +
        '<span class="o-line__price">' + esc(money(unitPrice(l) * l.qty)) + "</span></div>" +
        '<div class="o-step o-step--sm" role="group" aria-label="' + esc(s("dlg.qty")) + '">' +
        '<button type="button" class="o-step__btn" data-line-qty="-1" data-key="' + esc(l.key) + '" aria-label="' +
        esc(l.qty === 1 ? s("cart.remove", { name: name }) : s("cart.less", { name: name })) + '">' +
        icon(l.qty === 1 ? "i-trash" : "i-minus", 15) + "</button>" +
        '<span class="o-step__n">' + l.qty + "</span>" +
        '<button type="button" class="o-step__btn" data-line-qty="1" data-key="' + esc(l.key) + '" aria-label="' +
        esc(s("cart.more", { name: name })) + '">' + icon("i-plus", 15) + "</button></div></li>"
      );
    }).join("") + "</ul>";

    if (t.minLeft > 0) {
      var pct = Math.min(100, Math.round((t.subtotal / CFG.minimo) * 100));
      html += '<div class="o-min"><p>' + esc(s("cart.min_left", { x: money(t.minLeft), min: money(CFG.minimo) })) +
        '</p><span class="o-min__bar"><span style="transform:scaleX(' + (pct / 100) + ')"></span></span></div>';
    }
    html += totalsHTML(t);
    if (!(opts && opts.noCta)) {
      html += '<button type="button" class="btn btn--block o-cart__cta" data-go-checkout' + (t.minLeft > 0 ? " disabled" : "") + ">" +
        "<span>" + esc(s("cart.checkout")) + "</span><span>" + esc(money(t.total)) + "</span></button>";
    }
    html += '<p class="o-cart__vat">' + esc(s("cart.vat")) + "</p></div>";
    return html;
  }
  function totalsHTML(t) {
    return '<dl class="o-totals">' +
      "<div><dt>" + esc(s("cart.subtotal")) + "</dt><dd>" + esc(money(t.subtotal)) + "</dd></div>" +
      (t.envases ? "<div><dt>" + esc(s("cart.envases", { n: t.envases })) + "</dt><dd>" + esc(money(t.envaseCost)) + "</dd></div>" : "") +
      (state.mode === "delivery"
        ? "<div><dt>" + esc(s("cart.delivery")) + "</dt><dd>" + esc(money(t.fee)) + "</dd></div>"
        : "<div><dt>" + esc(s("cart.pickup")) + "</dt><dd>" + esc(s("cart.free")) + "</dd></div>") +
      '<div class="o-totals__total"><dt>' + esc(s("cart.total")) + "</dt><dd>" + esc(money(t.total)) + "</dd></div></dl>";
  }
  function renderCartAll() {
    if (els.cart) els.cart.innerHTML = cartHTML();
    if (els.sheetBody && els.sheet && els.sheet.open) els.sheetBody.innerHTML = cartHTML({ closable: true });
    renderBar();
  }
  function renderBar() {
    if (!els.bar) return;
    var t = totals();
    var show = step === "menu" && t.count > 0;
    els.bar.hidden = !show;
    document.body.classList.toggle("has-order-bar", show);
    if (!show) return;
    els.bar.querySelector("[data-bar-count]").textContent = String(t.count);
    els.bar.querySelector("[data-bar-label]").textContent = s("cart.view");
    els.bar.querySelector("[data-bar-total]").textContent = money(t.total);
    els.bar.querySelector("button").setAttribute(
      "aria-label",
      s("cart.view") + ", " + s(t.count === 1 ? "cart.items_one" : "cart.items_many", { n: t.count }) + ", " + money(t.total)
    );
  }
  function openSheet() {
    if (!els.sheet) return;
    els.sheetBody.innerHTML = cartHTML({ closable: true });
    if (typeof els.sheet.showModal === "function") els.sheet.showModal();
    else els.sheet.setAttribute("open", "");
  }

  var toastTimer;
  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("is-on"); }, 2200);
  }

  function setMode(m) {
    if (m !== "delivery" && m !== "pickup") return;
    state.mode = m;
    save();
    paintStatic();
    renderCartAll();
    if (step === "checkout") renderCheckout();
  }

  /* --- tramitar pedido --------------------------------------------------------------- */
  function renderCheckout() {
    var c = state.customer;
    var days = scheduleDays();
    var asapOk = openNow();
    if (!asapOk && state.when.type === "asap") state.when.type = "later";
    if (state.when.type === "later") {
      if (!days.some(function (d) { return d.key === state.when.day; })) state.when.day = days[0] ? days[0].key : "";
    }
    var eta = etaRange();
    var zoneOptions = Object.keys(CFG.codigosPostales).map(function (cp) {
      return '<option value="' + cp + '"' + (c.cp === cp ? " selected" : "") + ">" + cp + " · " + esc(CFG.codigosPostales[cp]) + "</option>";
    }).join("");

    function field(id, key, type, value, opts) {
      opts = opts || {};
      return '<div class="field' + (opts.cls ? " " + opts.cls : "") + '"><label class="field__label" for="' + id + '">' + esc(s(key)) +
        (opts.req ? ' <span class="field__req" aria-hidden="true">*</span>' : ' <span class="field__opt">(' + esc(s("dlg.optional")) + ")</span>") + "</label>" +
        '<input class="field__input" id="' + id + '" name="' + id + '" type="' + type + '" value="' + esc(value) + '"' +
        (opts.ac ? ' autocomplete="' + opts.ac + '"' : "") + (opts.ph ? ' placeholder="' + esc(s(opts.ph)) + '"' : "") +
        (opts.req ? ' aria-required="true"' : "") + (opts.im ? ' inputmode="' + opts.im + '"' : "") +
        ' aria-describedby="' + id + '-error' + (opts.hint ? " " + id + "-hint" : "") + '">' +
        (opts.hint ? '<p class="field__hint" id="' + id + '-hint">' + esc(s(opts.hint)) + "</p>" : "") +
        '<p class="field__error" id="' + id + '-error" hidden></p></div>';
    }

    var html =
      '<div class="container o-ck">' +
      '<div class="o-ck__main">' +
      '<button type="button" class="o-back" data-back>' + icon("i-back", 18) + esc(s("ck.back")) + "</button>" +
      '<h1 class="o-ck__title" tabindex="-1" data-ck-title>' + esc(s("ck.title")) + "</h1>" +
      '<form class="o-ck__form" novalidate data-ck-form>' +

      /* 1. entrega */
      '<section class="o-ck__step"><h2><span class="o-ck__num">1</span>' + esc(s("ck.s1")) + "</h2>" +
      '<div class="o-seg" role="radiogroup" aria-label="' + esc(s("mode.label")) + '">' +
      ["delivery", "pickup"].map(function (m) {
        return '<button type="button" role="radio" class="o-seg__btn" data-set-mode="' + m + '" aria-checked="' + (state.mode === m) + '">' +
          icon(m === "delivery" ? "i-scooter" : "i-store", 18) + esc(s("mode." + m)) + "</button>";
      }).join("") + "</div>";
    if (state.mode === "delivery") {
      html += '<div class="o-geo"><button type="button" class="btn btn--ghost" data-geo-btn>' + icon("i-pin", 17) + esc(s("geo.btn")) + "</button>" +
        '<p class="o-geo__hint">' + esc(s("geo.hint")) + '</p><p class="o-geo__msg" data-geo-msg role="status" aria-live="polite">' + esc(geoMsg()) + "</p></div>";
      html += '<div class="o-ck__grid">' +
        field("ck-street", "ck.street", "text", c.street, { req: true, ac: "address-line1", cls: "o-span-2" }) +
        field("ck-number", "ck.number", "text", c.number, { req: true, im: "numeric" }) +
        field("ck-floor", "ck.floor", "text", c.floor, { ac: "address-line2" }) +
        '<div class="field o-span-2"><label class="field__label" for="ck-cp">' + esc(s("ck.cp")) +
        ' <span class="field__req" aria-hidden="true">*</span></label>' +
        '<select class="field__input" id="ck-cp" name="ck-cp" aria-required="true" aria-describedby="ck-cp-hint ck-cp-error"><option value="">' +
        esc(s("ck.cp_ph")) + "</option>" + zoneOptions + "</select>" +
        '<p class="field__hint" id="ck-cp-hint">' + esc(s("ck.zone_note")) + "</p>" +
        '<p class="field__error" id="ck-cp-error" hidden></p></div>' +
        field("ck-rider", "ck.rider", "text", c.rider, { ph: "ck.rider_ph", cls: "o-span-2" }) +
        "</div>";
    } else {
      html += '<div class="o-pickup">' + icon("i-pin", 22) + "<div><p class=\"o-pickup__t\">" + esc(s("ck.pickup_at")) + "</p><p>" +
        esc(s("ck.pickup_addr")) + '</p><a class="link-arrow" href="https://www.google.com/maps/dir/?api=1&destination=Salicornia+Pizza+i+Pasta+Marina+Port+Premia" target="_blank" rel="noopener">' +
        esc(s("ck.map")) + " " + icon("i-arrow", 16) + "</a></div></div>";
    }
    html += "</section>";

    /* 2. cuándo */
    html += '<section class="o-ck__step"><h2><span class="o-ck__num">2</span>' + esc(s("ck.s2")) + "</h2>" +
      '<div class="o-choices">' +
      '<label class="o-choice o-choice--card' + (asapOk ? "" : " is-disabled") + '"><input type="radio" name="ck-when" value="asap"' +
      (state.when.type === "asap" ? " checked" : "") + (asapOk ? "" : " disabled") + '><span class="o-choice__box">' + icon("i-clock", 20) +
      '<span class="o-choice__t">' + esc(s("ck.asap")) + '</span><span class="o-choice__s">' +
      esc(asapOk ? s("ck.asap_eta", eta) : s("ck.asap_off")) + "</span></span></label>" +
      '<label class="o-choice o-choice--card"><input type="radio" name="ck-when" value="later"' + (state.when.type === "later" ? " checked" : "") +
      '><span class="o-choice__box">' + icon("i-calendar", 20) + '<span class="o-choice__t">' + esc(s("ck.later")) +
      '</span><span class="o-choice__s">' + esc(s("ck.later_sub")) + "</span></span></label></div>";
    if (state.when.type === "later") {
      var day = days.filter(function (d) { return d.key === state.when.day; })[0] || days[0];
      if (day && day.slots.indexOf(state.when.time) === -1) state.when.time = "";
      html += '<div class="o-ck__grid">' +
        '<div class="field"><label class="field__label" for="ck-day">' + esc(s("ck.day")) + "</label>" +
        '<select class="field__input" id="ck-day" name="ck-day">' + days.map(function (d) {
          return '<option value="' + d.key + '"' + (day && d.key === day.key ? " selected" : "") + ">" + esc(cap(dayLabel(d))) + "</option>";
        }).join("") + "</select></div>" +
        '<div class="field"><label class="field__label" for="ck-time">' + esc(s("ck.time")) + ' <span class="field__req" aria-hidden="true">*</span></label>' +
        '<select class="field__input" id="ck-time" name="ck-time" aria-required="true" aria-describedby="ck-time-error"><option value="">—</option>' +
        (day ? day.slots.map(function (t) {
          return '<option value="' + t + '"' + (state.when.time === t ? " selected" : "") + ">" + t + "</option>";
        }).join("") : "") + "</select>" +
        '<p class="field__error" id="ck-time-error" hidden></p></div></div>';
    }
    html += "</section>";

    /* 3. datos */
    html += '<section class="o-ck__step"><h2><span class="o-ck__num">3</span>' + esc(s("ck.s3")) + "</h2>" +
      '<div class="o-ck__grid">' +
      field("ck-name", "ck.name", "text", c.name, { req: true, ac: "name", cls: "o-span-2" }) +
      field("ck-phone", "ck.phone", "tel", c.phone, { req: true, ac: "tel", im: "tel", hint: "ck.phone_hint" }) +
      field("ck-email", "ck.email", "email", c.email, { req: true, ac: "email", im: "email" }) +
      "</div>" +
      '<label class="o-terms o-terms--remember"><input type="checkbox" name="ck-remember" id="ck-remember"' + (state.remember ? " checked" : "") +
      "><span>" + esc(s("ck.remember")) + '<small class="field__hint">' + esc(s("ck.remember_hint")) + "</small></span></label>" +
      "</section>";

    /* 4. pago */
    html += '<section class="o-ck__step"><h2><span class="o-ck__num">4</span>' + esc(s("ck.s4")) + "</h2>" +
      '<p class="o-paygroup">' + esc(s("ck.pay_online")) + "</p>" +
      '<div class="o-choices o-choices--pay">' +
      ONLINE_METHODS.map(function (m) {
        return '<label class="o-choice o-choice--card o-choice--online"><input type="radio" name="ck-pay" value="' + m.id + '"' + (state.pay.method === m.id ? " checked" : "") +
          '><span class="o-choice__box">' + payMark(m) + '<span class="o-choice__s">' + esc(s("ck.soon")) + "</span></span></label>";
          '<span class="o-choice__t">' + esc(m.key ? s(m.key) : m.label) + '</span><span class="o-choice__s">' + esc(s("ck.soon")) + "</span></span></label>";
      }).join("") + "</div>" +
      '<p class="o-paygroup">' + esc(s(state.mode === "delivery" ? "ck.pay_deliver_d" : "ck.pay_deliver_p")) + "</p>" +
      '<div class="o-choices">' +
      '<label class="o-choice o-choice--card"><input type="radio" name="ck-pay" value="cash"' + (state.pay.method === "cash" ? " checked" : "") +
      '><span class="o-choice__box">' + icon("i-cash", 20) + '<span class="o-choice__t">' + esc(s("ck.cash")) + "</span></span></label>" +
      '<label class="o-choice o-choice--card"><input type="radio" name="ck-pay" value="card"' + (state.pay.method === "card" ? " checked" : "") +
      '><span class="o-choice__box">' + icon("i-card", 20) + '<span class="o-choice__t">' +
      esc(s(state.mode === "delivery" ? "ck.card" : "ck.card_pickup")) + "</span></span></label></div>";
    if (state.pay.method === "cash") {
      html += '<div class="o-ck__grid">' +
        field("ck-cash", "ck.cash_with", "text", state.pay.cashWith, { im: "decimal", hint: "ck.cash_hint" }) + "</div>";
    }
    html += '<p class="o-ck__note">' + icon("i-lock", 16) + esc(s("ck.pay_note")) + "</p></section>";

    /* 5. alergias */
    html += '<section class="o-ck__step"><h2><span class="o-ck__num">5</span>' + esc(s("ck.s5")) + "</h2>" +
      '<div class="field"><label class="field__label" for="ck-allergy">' + esc(s("ck.s5")) +
      ' <span class="field__opt">(' + esc(s("dlg.optional")) + ")</span></label>" +
      '<textarea class="field__input" id="ck-allergy" name="ck-allergy" rows="3" maxlength="400" placeholder="' + esc(s("ck.allergy_ph")) +
      '" aria-describedby="ck-allergy-hint">' + esc(state.allergies) + "</textarea>" +
      '<p class="field__hint" id="ck-allergy-hint">' + esc(s("ck.allergy_hint")) + "</p></div></section>";

    html += '<label class="o-terms"><input type="checkbox" name="ck-terms" id="ck-terms" aria-describedby="ck-terms-error"' + (state.terms ? " checked" : "") +
      '><span>' + esc(s("ck.terms_a")) + '<a href="condiciones.html" target="_blank" rel="noopener">' + esc(s("ck.terms_link")) + "</a>.</span></label>" +
      '<p class="field__error" id="ck-terms-error" hidden></p>' +
      '<div class="o-hp" aria-hidden="true"><label for="ck-website">Web</label><input type="text" id="ck-website" name="ck-website" tabindex="-1" autocomplete="off"></div>' +
      '<p class="o-ck__privacy">' + esc(s("ck.privacy_a")) + '<a href="privacidad.html">' + esc(s("ck.privacy_link")) + "</a>.</p>" +
      '<p class="field__error o-ck__formerr" data-ck-formerr hidden></p>' +
      '<button type="submit" class="btn btn--block o-ck__submit" data-ck-submit></button>' +
      "</form></div>" +
      '<aside class="o-ck__aside" aria-labelledby="o-sum-t"><div class="o-sum" data-ck-summary></div></aside>' +
      "</div>";

    els.checkout.innerHTML = html;
    renderCheckoutSummary();
  }
  function cap(txt) {
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }
  function renderCheckoutSummary() {
    var box = els.checkout.querySelector("[data-ck-summary]");
    if (!box) return;
    var t = totals();
    box.innerHTML =
      '<div class="o-sum__head"><h2 id="o-sum-t">' + esc(s("ck.summary")) + '</h2><button type="button" class="o-link" data-back>' +
      esc(s("ck.edit")) + "</button></div>" +
      '<ul class="o-sum__lines">' + state.cart.map(function (l) {
        var p = byId[l.id];
        if (!p) return "";
        var sub = [];
        if (p.cat === "ensaladas") sub.push(s(l.gf ? "cart.gf_pan" : "cart.pan_normal"));
      else if (l.gf) sub.push(s("cart.gf"));
      if (l.ing && l.ing.length) sub.push(ingSub(l));
        if (l.note) sub.push("«" + l.note + "»");
        return '<li><span class="o-sum__q">' + l.qty + "×</span><span class=\"o-sum__n\">" + esc(tr(p.name)) +
          (sub.length ? "<small>" + esc(sub.join(" · ")) + "</small>" : "") + "</span><span>" + esc(money(unitPrice(l) * l.qty)) + "</span></li>";
      }).join("") + "</ul>" + totalsHTML(t);
    var submit = els.checkout.querySelector("[data-ck-submit]");
    if (submit) submit.textContent = s(onlineMethod(state.pay.method) ? "ck.pay_now" : "ck.confirm", { total: money(t.total) });
  }

  /* --- ubicación del cliente ----------------------------------------------------------------- */
  var geoState = ""; /* texto que se muestra bajo el botón */
  function geoMsg() { return geoState; }
  function setGeoMsg(t) {
    geoState = t || "";
    var el = document.querySelector("[data-geo-msg]");
    if (el) el.textContent = geoState;
  }
  function clearGeo() {
    var c = state.customer;
    c.lat = ""; c.lng = ""; c.distM = "";
  }
  function setField(id, value) {
    var el = document.getElementById(id);
    if (el && value != null) el.value = value;
  }
  /* nombre de la calle y número a partir de la respuesta de OpenStreetMap (Nominatim) */
  function reverseGeocode(lat, lng) {
    var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=" +
      encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lng) + "&accept-language=" + lang();
    return fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return d && d.address ? d.address : null; })
      .catch(function () { return null; });
  }
  function useLocation(btn) {
    if (!navigator.geolocation) return setGeoMsg(s("geo.unavailable"));
    btn.disabled = true;
    setGeoMsg(s("geo.finding"));
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lng = pos.coords.longitude;
      var km = haversineKm(CFG.restaurante.lat, CFG.restaurante.lng, lat, lng);
      if (!zoneFor(km)) {
        clearGeo();
        btn.disabled = false;
        setGeoMsg(s("geo.out", { km: fmtKm(km), max: fmtKm(maxKm()) }));
        save();
        return;
      }
      var c = state.customer;
      c.lat = Math.round(lat * 1e5) / 1e5;
      c.lng = Math.round(lng * 1e5) / 1e5;
      c.distM = Math.round(km * 1000);
      reverseGeocode(lat, lng).then(function (a) {
        btn.disabled = false;
        var okAddr = false;
        if (a) {
          var road = a.road || a.pedestrian || a.footway || a.path || a.cycleway || "";
          if (road) {
            c.street = road; setField("ck-street", road); okAddr = true;
            c.number = a.house_number || ""; setField("ck-number", c.number);
          }
          if (a.postcode && CFG.codigosPostales[a.postcode]) { c.cp = a.postcode; setField("ck-cp", c.cp); }
        }
        var lz = lunchZone();
        var msg = lz ? s("geo.ok_eta", { km: fmtKm(km), min: lz[0], max: lz[1] }) : s("geo.ok", { km: fmtKm(km) });
        setGeoMsg(okAddr ? msg : msg + " " + s("geo.noaddr"));
        save();
        renderCartAll();
      });
    }, function (err) {
      btn.disabled = false;
      setGeoMsg(s(err && err.code === 1 ? "geo.denied" : "geo.unavailable"));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  /* lee el formulario al estado (se llama en cada cambio) */
  function readForm(form) {
    var c = state.customer;
    function v(name) {
      var el = form.elements[name];
      return el ? el.value : null;
    }
    var before = c.street + "|" + c.cp; /* el número se puede añadir sin perder la ubicación */
    ["street", "number", "floor", "cp", "rider", "name", "phone", "email"].forEach(function (k) {
      var val = v("ck-" + k);
      if (val != null) c[k] = val.trim();
    });
    if (c.lat !== "" && before !== c.street + "|" + c.cp) {
      clearGeo();
      setGeoMsg(s("geo.cleared"));
    }
    var w = form.querySelector('input[name="ck-when"]:checked');
    if (w) state.when.type = w.value;
    if (v("ck-day") != null) state.when.day = v("ck-day");
    if (v("ck-time") != null) state.when.time = v("ck-time");
    var pay = form.querySelector('input[name="ck-pay"]:checked');
    if (pay) state.pay.method = pay.value;
    if (v("ck-cash") != null) state.pay.cashWith = v("ck-cash").trim();
    if (v("ck-allergy") != null) state.allergies = v("ck-allergy").trim();
    var terms = form.querySelector("#ck-terms");
    if (terms) state.terms = terms.checked;
    var rem = form.querySelector("#ck-remember");
    if (rem) {
      state.remember = rem.checked;
      if (!rem.checked) forgetProfile(); /* al desmarcar se borran ya los datos guardados */
    }
    save();
  }

  function setErr(form, id, key, vars) {
    var input = form.querySelector("#" + id);
    var err = form.querySelector("#" + id + "-error");
    if (err) {
      err.textContent = s(key, vars);
      err.hidden = false;
    }
    if (input) {
      input.setAttribute("aria-invalid", "true");
      var f = input.closest(".field");
      if (f) f.classList.add("is-invalid");
    }
    return input;
  }
  function clearErr(input) {
    if (!input || !input.id) return;
    var err = document.getElementById(input.id + "-error");
    if (err) err.hidden = true;
    input.removeAttribute("aria-invalid");
    var f = input.closest(".field");
    if (f) f.classList.remove("is-invalid");
  }
  function parseEuro(txt) {
    var n = parseFloat(String(txt).replace(/[^\d,.]/g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }

  function validate(form) {
    var c = state.customer;
    var first = null;
    function bad(id, key, vars) {
      var el = setErr(form, id, key, vars);
      if (!first) first = el;
    }
    form.querySelectorAll("[aria-invalid]").forEach(clearErr);
    if (state.mode === "delivery") {
      if (!c.street) bad("ck-street", "err.street");
      if (!c.number) bad("ck-number", "err.number");
      if (!c.cp || !CFG.codigosPostales[c.cp]) bad("ck-cp", "err.cp");
    }
    if (state.when.type === "later" && !state.when.time) bad("ck-time", "err.time");
    if (!c.name) bad("ck-name", "err.name");
    var digits = c.phone.replace(/\D/g, "");
    if (!c.phone) bad("ck-phone", "err.phone");
    else if (digits.length < 9 || digits.length > 15) bad("ck-phone", "err.phone_bad");
    if (!c.email) bad("ck-email", "err.email_req");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) bad("ck-email", "err.email");
    if (state.pay.method === "cash" && state.pay.cashWith) {
      var n = parseEuro(state.pay.cashWith);
      if (n == null || n < totals().total) bad("ck-cash", "err.cash");
    }
    if (!state.terms) bad("ck-terms", "err.terms");
    var formErr = form.querySelector("[data-ck-formerr]");
    var t = totals();
    var msg = "";
    if (!t.count) msg = s("cart.empty_t");
    else if (t.minLeft > 0) msg = s("err.min", { min: money(CFG.minimo) });
    else if (!server.accepting) msg = s("err.paused", { tel: CFG.telefono });
    formErr.hidden = !msg;
    formErr.textContent = msg;
    if (msg && !first) first = formErr;
    return first;
  }

  /* --- pago online: aún no disponible -------------------------------------------------------- */
  var payDlg = null;
  function openPayDialog(m) {
    if (!payDlg) {
      payDlg = document.createElement("dialog");
      payDlg.className = "o-dlg o-dlg--pay";
      payDlg.setAttribute("data-i18n-skip", "");
      payDlg.setAttribute("aria-labelledby", "o-pay-t");
      payDlg.addEventListener("click", function (e) {
        if (e.target === payDlg) {
          payDlg.close();
        } else if (e.target.closest("[data-pay-cash]")) {
          payDlg.close();
          state.pay.method = "cash";
          save();
          renderCheckout();
          var c = els.checkout.querySelector('input[name="ck-pay"][value="cash"]');
          if (c) c.focus({ preventScroll: true });
        } else if (e.target.closest("[data-pay-close]")) {
          payDlg.close();
        }
      });
      document.body.appendChild(payDlg);
    }
    var name = m.key ? s(m.key) : m.label;
    payDlg.innerHTML =
      '<button type="button" class="o-x o-dlg__x" data-pay-close aria-label="' + esc(s("dlg.close")) + '">' + icon("i-close", 18) + "</button>" +
      '<div class="o-dlg__inner o-paybox">' +
      '<span class="o-paybox__mark" aria-hidden="true">' + icon("i-lock", 26) + "</span>" +
      '<h2 class="o-paybox__t" id="o-pay-t">' + esc(s("pay.soon_t")) + "</h2>" +
      '<p class="o-paybox__p">' + esc(s("pay.soon_p", { method: name })) + "</p>" +
      '<div class="o-paybox__actions">' +
      '<button type="button" class="btn" data-pay-cash>' + esc(s("pay.soon_b")) + "</button>" +
      '<button type="button" class="btn btn--ghost o-paybox__alt" data-pay-close>' + esc(s("pay.soon_c")) + "</button></div></div>";
    if (typeof payDlg.showModal === "function") payDlg.showModal();
    else payDlg.setAttribute("open", "");
  }

  /* --- pago simulado (file:// o demo en Netlify): no cobra ni envía nada ----------------- */
  /* demo pública (sin servidor de pedidos): el pedido se simula y no se envía a ningún sitio */
  var DEMO = location.protocol === "file:" || /\.(netlify\.app|github\.io)$/.test(location.hostname);
  var DEMO_STR = {
    es: { t: "Pago seguro", demo: "SIMULACIÓN · no se cobra nada ni se envía a ningún sitio", card: "Número de tarjeta", exp: "Caducidad", cvc: "CVC", pay: "Pagar", cancel: "Cancelar", paying: "Procesando…" },
    ca: { t: "Pagament segur", demo: "SIMULACIÓ · no es cobra res ni s'envia enlloc", card: "Número de targeta", exp: "Caducitat", cvc: "CVC", pay: "Pagar", cancel: "Cancel·lar", paying: "Processant…" },
    en: { t: "Secure payment", demo: "SIMULATION · nothing is charged or sent anywhere", card: "Card number", exp: "Expiry", cvc: "CVC", pay: "Pay", cancel: "Cancel", paying: "Processing…" }
  };
  function openDemoPay(m) {
    var D = DEMO_STR[lang()] || DEMO_STR.es;
    var dlg = document.createElement("dialog");
    dlg.className = "o-dlg o-dlg--pay";
    dlg.setAttribute("data-i18n-skip", "");
    dlg.setAttribute("aria-labelledby", "o-demo-t");
    var name = m.key ? s(m.key) : m.label;
    var total = money(totals().total);
    dlg.innerHTML =
      '<button type="button" class="o-x o-dlg__x" data-demo-cancel aria-label="' + esc(s("dlg.close")) + '">' + icon("i-close", 18) + "</button>" +
      '<div class="o-dlg__inner o-paybox o-demopay">' +
      '<span class="o-paybox__mark" aria-hidden="true">' + icon("i-lock", 26) + "</span>" +
      '<h2 class="o-paybox__t" id="o-demo-t">' + esc(D.t) + "</h2>" +
      '<p class="o-demopay__method">' + esc(name) + "</p>" +
      '<p class="o-demopay__flag">' + esc(D.demo) + "</p>" +
      '<form class="o-demopay__form" novalidate>' +
      '<label>' + esc(D.card) + '<input type="text" inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242" value="4242 4242 4242 4242"></label>' +
      '<div class="o-demopay__row"><label>' + esc(D.exp) + '<input type="text" autocomplete="off" placeholder="12/30" value="12/30"></label>' +
      '<label>' + esc(D.cvc) + '<input type="text" autocomplete="off" placeholder="123" value="123"></label></div>' +
      '<div class="o-paybox__actions"><button type="submit" class="btn">' + esc(D.pay) + " " + esc(total) + "</button>" +
      '<button type="button" class="btn btn--ghost o-paybox__alt" data-demo-cancel>' + esc(D.cancel) + "</button></div></form></div>";
    var timer = null;
    /* Esc, ✕, Cancelar o clic fuera: cierra, anula el "pago" en curso y quita el diálogo */
    dlg.addEventListener("close", function () {
      clearTimeout(timer);
      dlg.remove();
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-demo-cancel]")) dlg.close();
    });
    dlg.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = dlg.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = D.paying;
      timer = setTimeout(function () {
        var o = buildOrder();
        timer = null;
        dlg.close();
        finishOrder(o);
      }, 1400);
    });
    document.body.appendChild(dlg);
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  /* --- pedido confirmado -------------------------------------------------------------- */
  var lastOrder = null;
  function orderRef() {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "";
    for (var i = 0; i < 5; i++) out += a.charAt(Math.floor(Math.random() * a.length));
    return "SAL-" + out;
  }
  function addressText(c) {
    return c.street + " " + c.number + (c.floor ? ", " + c.floor : "") + ", " + c.cp + " " + (CFG.codigosPostales[c.cp] || "");
  }
  function whatsappText(o) {
    var L = "es";
    var lines = [];
    lines.push("*Nuevo pedido " + o.ref + "*");
    lines.push(o.mode === "delivery" ? "🛵 A domicilio" : "🏪 Recoger en local");
    if (o.mode === "delivery") {
      lines.push("📍 " + addressText(o.customer));
      if (o.customer.rider) lines.push("   Indicaciones: " + o.customer.rider);
    }
    lines.push("🕒 " + (o.when.type === "asap" ? "Lo antes posible (aprox. " + o.eta.from + "–" + o.eta.to + ")" : cap(o.when.dayLabelEs) + " a las " + o.when.time));
    lines.push("");
    o.cart.forEach(function (l) {
      var p = byId[l.id];
      lines.push(l.qty + "× " + p.name + (l.gf ? (p.cat === "ensaladas" ? " (pan sin gluten)" : " (masa sin gluten)") : "") + " — " + money(unitPrice(l) * l.qty, L));
      if (l.ing && l.ing.length) lines.push("   Ingredientes: " + (l.ingN || []).join(", "));
      if (l.note) lines.push("   Nota: " + l.note);
    });
    lines.push("");
    lines.push("Subtotal: " + money(o.totals.subtotal, L));
    if (o.totals.envases) lines.push("Envases (" + o.totals.envases + "): " + money(o.totals.envaseCost, L));
    if (o.mode === "delivery") lines.push("Envío: " + money(o.totals.fee, L));
    lines.push("*Total: " + money(o.totals.total, L) + "*");
    lines.push("💳 Pago: " + (o.pay.method === "cash" ? "efectivo" + (o.pay.cashWith ? " (paga con " + o.pay.cashWith + " €)" : "") : "tarjeta"));
    if (o.allergies) lines.push("⚠️ Alergias: " + o.allergies);
    lines.push("");
    lines.push("👤 " + o.customer.name + " · " + o.customer.phone + (o.customer.email ? " · " + o.customer.email : ""));
    return lines.join("\n");
  }
  function waLink(o) {
    return "https://wa.me/" + String(CFG.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(whatsappText(o));
  }

  function buildOrder() {
    var days = scheduleDays();
    var day = days.filter(function (d) { return d.key === state.when.day; })[0];
    return {
      ref: orderRef(),
      mode: state.mode,
      cart: JSON.parse(JSON.stringify(state.cart)),
      customer: Object.assign({}, state.customer),
      when: { type: state.when.type, day: day || null, time: state.when.time, dayLabelEs: day ? dayLabel(day, "es") : "" },
      eta: etaRange(),
      pay: Object.assign({}, state.pay),
      allergies: state.allergies,
      totals: totals()
    };
  }

  /* registro local de pedidos: lo lee registro.html (solo este navegador) */
  var LOG_KEY = "salicornia_registro_v1";
  function logOrder(o) {
    try {
      var log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      if (!Array.isArray(log)) log = [];
      var om = onlineMethod(o.pay.method);
      log.push({
        ref: o.ref,
        at: new Date().toISOString(),
        demo: DEMO || !o.server,
        mode: o.mode,
        method: o.pay.method,
        online: !!om,
        total: o.totals.total,
        subtotal: o.totals.subtotal,
        fee: o.totals.fee,
        envaseCost: o.totals.envaseCost,
        items: o.cart.map(function (l) {
          var p = byId[l.id] || {};
          return { name: p.name || l.id, qty: l.qty, gf: !!l.gf, price: unitPrice(l) };
        }),
        customer: o.customer.name || ""
      });
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch (e) { /* noop */ }
  }

  /* el pedido ya está hecho: vacía el carrito y enseña la confirmación */
  function finishOrder(o) {
    logOrder(o);
    lastOrder = o;
    state.cart = [];
    state.allergies = "";
    state.pay.cashWith = "";
    state.when = { type: "asap", day: "", time: "" };
    if (state.remember) saveProfile(); /* se guarda lo que escribió, para el próximo pedido */
    else forgetProfile();
    if (!state.remember) Object.keys(state.customer).forEach(function (k) { state.customer[k] = ""; });
    clearGeo();
    geoState = "";
    /* para volver al seguimiento desde este navegador */
    if (o.server && o.token && o.ref) {
      try { localStorage.setItem("salicornia_ultimo_v1", JSON.stringify({ ref: o.ref, t: o.token, at: Date.now() })); } catch (e) { /* noop */ }
    }
    save();
    renderCartAll();
    paintCardCounts();
    renderDone();
    setStep("done");
    var h = els.done.querySelector("[data-done-title]");
    if (h) h.focus({ preventScroll: true });
  }

  function showFormError(form, msg, field) {
    if (field) {
      var el = setErr(form, field.id, field.key);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
        return;
      }
    }
    var formErr = form.querySelector("[data-ck-formerr]");
    formErr.textContent = msg;
    formErr.hidden = false;
    formErr.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  var sending = false;
  function sendOrder(form) {
    if (sending) return;
    sending = true;
    var submit = form.querySelector("[data-ck-submit]");
    var label = submit.textContent;
    submit.disabled = true;
    submit.textContent = s("ck.sending");
    var o = buildOrder();
    var hp = form.querySelector("#ck-website");
    var body = {
      mode: state.mode,
      cart: state.cart.map(function (l) { return { id: l.id, qty: l.qty, gf: !!l.gf, note: l.note || "", ing: l.ing || [] }; }),
      customer: state.customer,
      when: { type: state.when.type, day: state.when.type === "later" ? (state.when.day || (o.when.day && o.when.day.key) || "") : "", time: state.when.time },
      pay: { method: state.pay.method, cashWith: state.pay.cashWith },
      allergies: state.allergies,
      lang: lang(),
      acceptTerms: !!state.terms,
      website: hp ? hp.value : ""
    };
    function fail(msg, field) {
      sending = false;
      submit.disabled = false;
      submit.textContent = label;
      showFormError(form, msg, field);
    }
    fetch(CFG.api, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) { return { status: r.status, data: data || {} }; });
      })
      .then(function (res) {
        var d = res.data;
        if (d.ok) {
          o.ref = d.ref;
          o.token = d.token || "";
          o.server = true;
          o.simulated = !!d.simulated;
          if (d.totals) Object.assign(o.totals, d.totals);
          if (d.checkoutUrl) {
            try { sessionStorage.setItem(PAY_KEY, JSON.stringify({ o: o, ref: d.ref, t: d.token })); } catch (e) { /* noop */ }
            submit.textContent = s("ck.redirect");
            location.assign(d.checkoutUrl);
            return;
          }
          sending = false;
          submit.disabled = false;
          finishOrder(o);
          return;
        }
        var f = d.fields || [];
        var tel = { tel: CFG.telefono };
        if (d.error === "paused") {
          server.accepting = false;
          renderStatus();
          return fail(s("err.paused", tel));
        }
        if (d.error === "rate_limited") return fail(s("err.rate", tel));
        if (d.error === "payment_unavailable") {
          fail("");
          form.querySelector("[data-ck-formerr]").hidden = true;
          var om = onlineMethod(state.pay.method);
          if (om) openPayDialog(om);
          return;
        }
        if (d.error === "payment_error") return fail(s("err.pay"));
        if (f.indexOf("closed") !== -1) return fail(s("err.closed"));
        if (f.indexOf("zone") !== -1) return fail(s("geo.server_out", tel));
        if (f.indexOf("time") !== -1) return fail(s("err.time"), { id: "ck-time", key: "err.time" });
        if (f.indexOf("min") !== -1) return fail(s("err.min", { min: money(CFG.minimo) }));
        if (f.indexOf("terms") !== -1) return fail(s("err.terms"), { id: "ck-terms", key: "err.terms" });
        var map = { name: "ck-name", phone: "ck-phone", email: "ck-email", street: "ck-street", number: "ck-number", cp: "ck-cp", cash: "ck-cash" };
        for (var i = 0; i < f.length; i++) {
          if (map[f[i]]) return fail(s("err.invalid"), { id: map[f[i]], key: "err." + (f[i] === "phone" ? "phone_bad" : f[i]) });
        }
        if (res.status >= 500 || !d.error) return fail(s("err.send", tel));
        fail(s("err.invalid"));
      })
      .catch(function () {
        fail(s("err.send", { tel: CFG.telefono }));
      });
  }

  /* vuelta desde la página de pago de Stripe */
  function handlePayReturn() {
    var params = new URLSearchParams(location.search);
    var result = params.get("pago");
    if (!result || !CFG.api) return;
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(PAY_KEY) || "null"); } catch (e) { /* noop */ }
    history.replaceState(null, "", location.pathname);
    if (result === "cancelado") {
      try { sessionStorage.removeItem(PAY_KEY); } catch (e) { /* noop */ }
      toast(s("pay.cancelled"));
      return;
    }
    var ref = params.get("ref");
    var token = params.get("t");
    if (result !== "ok" || !ref || !token) return;
    var tries = 0;
    (function check() {
      fetch(CFG.api + "?ref=" + encodeURIComponent(ref) + "&t=" + encodeURIComponent(token), { headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.ok && d.payStatus === "pendiente" && ++tries < 6) {
            setTimeout(check, 2000);
            return;
          }
          var o = saved && saved.ref === ref ? saved.o : null;
          if (!o) return;
          o.token = token;
          if (o.when.day && o.when.day.date) o.when.day.date = new Date(o.when.day.date);
          o.paid = !!(d && d.payStatus === "pagado");
          o.payPending = !o.paid;
          try { sessionStorage.removeItem(PAY_KEY); } catch (e) { /* noop */ }
          finishOrder(o);
        })
        .catch(function () {
          if (++tries < 6) setTimeout(check, 2000);
        });
    })();
  }

  function loadServerConfig() {
    if (!CFG.api || DEMO) return;
    fetch(CFG.api + "?config=1", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.ok) return;
        server.accepting = d.accepting !== false;
        server.online = Array.isArray(d.online) ? d.online : [];
        renderStatus();
      })
      .catch(function () { /* sin servidor: se comprobará al enviar */ });
  }

  function placeOrder() {
    var days = scheduleDays();
    var day = days.filter(function (d) { return d.key === state.when.day; })[0];
    var o = {
      ref: orderRef(),
      mode: state.mode,
      cart: JSON.parse(JSON.stringify(state.cart)),
      customer: Object.assign({}, state.customer),
      when: { type: state.when.type, day: day || null, time: state.when.time, dayLabelEs: day ? dayLabel(day, "es") : "" },
      eta: etaRange(),
      pay: Object.assign({}, state.pay),
      allergies: state.allergies,
      totals: totals()
    };
    logOrder(o);
    lastOrder = o;
    if (CFG.whatsapp) {
      window.open(waLink(o), "_blank", "noopener");
    } else if (window.console) {
      console.info("[Salicornia] Pedido en modo demo (sin WhatsApp en config.js):\n" + whatsappText(o));
    }
    state.cart = [];
    state.allergies = "";
    state.pay.cashWith = "";
    state.when = { type: "asap", day: "", time: "" };
    save();
    renderCartAll();
    paintCardCounts();
    renderDone();
    setStep("done");
    var h = els.done.querySelector("[data-done-title]");
    if (h) h.focus({ preventScroll: true });
  }

  function renderDone() {
    var o = lastOrder;
    if (!o) return;
    var addr = o.mode === "delivery" ? addressText(o.customer) : "";
    var when;
    if (o.when.type === "asap") {
      when = o.mode === "delivery" ? s("done.eta_delivery", { from: o.eta.from, to: o.eta.to, addr: addr }) : s("done.eta_pickup", { from: o.eta.to });
    } else {
      var d = o.when.day;
      var dl = !d ? "" : d.offset < 2 ? dayLabel(d).toLowerCase() : s("done.on_date", { date: dayLabel(d) });
      when = s(o.mode === "delivery" ? "done.sched_delivery" : "done.sched_pickup", { day: dl, time: o.when.time, addr: addr });
    }
    var om = onlineMethod(o.pay.method);
    var method = om ? (om.key ? s(om.key) : om.label) : o.pay.method === "cash" ? s("ck.cash").toLowerCase() : s(o.mode === "delivery" ? "ck.card" : "ck.card_pickup").toLowerCase();
    var payLine = om ? (o.simulated ? s("done.n4_sim", { method: method }) : o.paid ? s("done.n4_paid", { method: method }) : s("done.pay_check", { tel: CFG.telefono })) : s("done.n4", { method: method });
    var wa = !o.server && !!CFG.whatsapp;
    var html =
      '<div class="container container--narrow o-done">' +
      '<span class="o-done__mark" aria-hidden="true">' + icon(wa ? "i-chat" : "i-check", 30) + "</span>" +
      '<p class="eyebrow">' + esc(s("done.eyebrow", { ref: o.ref })) + "</p>" +
      '<h1 class="o-done__title" tabindex="-1" data-done-title>' + esc(wa ? s("done.title_wa") : s("done.title", { name: o.customer.name.split(" ")[0] })) + "</h1>" +
      '<div class="rule-pair rule-pair--center" aria-hidden="true"><span></span><span></span></div>' +
      (wa ? '<p class="o-done__lead">' + esc(s("done.wa_p")) + "</p>" : "") +
      '<p class="o-done__lead">' + esc(when) + "</p>" +
      '<div class="btn-row o-done__actions">' +
      (wa ? '<a class="btn" href="' + esc(waLink(o)) + '" target="_blank" rel="noopener">' + icon("i-chat", 17) + esc(s("done.wa_btn")) + "</a>" : "") +
      (o.server && o.token && o.mode === "delivery"
        ? '<a class="btn" href="seguimiento.html?ref=' + encodeURIComponent(o.ref) + "&t=" + encodeURIComponent(o.token) + '">' + icon("i-pin", 17) + esc(s("done.track")) + "</a>"
        : "") +
      '<a class="btn' + ((wa || (o.server && o.token && o.mode === "delivery")) ? " btn--ghost" : "") + '" href="' + TEL_HREF + '">' + icon("i-phone", 17) + esc(s("done.call")) + "</a>" +
      '<button type="button" class="btn btn--ghost" data-again>' + esc(s("done.again")) + "</button></div>" +
      '<div class="o-done__grid">' +
      '<section class="o-done__card"><h2>' + esc(s("done.next")) + '</h2><ol class="o-next">' +
      "<li>" + esc(s("done.n1", { phone: o.customer.phone })) + "</li>" +
      "<li>" + esc(s("done.n2")) + "</li>" +
      "<li>" + esc(s(o.mode === "delivery" ? "done.n3_delivery" : "done.n3_pickup")) + "</li>" +
      "<li>" + esc(payLine) + "</li></ol></section>" +
      '<section class="o-done__card"><h2>' + esc(s("done.receipt")) + '</h2><ul class="o-sum__lines">' +
      o.cart.map(function (l) {
        var p = byId[l.id];
        return '<li><span class="o-sum__q">' + l.qty + "×</span><span class=\"o-sum__n\">" + esc(tr(p.name)) +
          (l.gf ? "<small>" + esc(s(p.cat === "ensaladas" ? "cart.gf_pan" : "cart.gf")) + "</small>" : "") + "</span><span>" + esc(money(unitPrice(l) * l.qty)) + "</span></li>";
      }).join("") + "</ul>" +
      '<dl class="o-totals"><div class="o-totals__total"><dt>' + esc(s("cart.total")) + "</dt><dd>" + esc(money(o.totals.total)) + "</dd></div></dl>" +
      "</section></div></div>";
    els.done.innerHTML = html;
  }

  /* --- eventos -------------------------------------------------------------------------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    var el;
    if ((el = t.closest("[data-open]"))) {
      openProduct(el.getAttribute("data-open"), el);
      return;
    }
    if ((el = t.closest("[data-dlg-close]"))) {
      closeDialog();
      return;
    }
    if ((el = t.closest("[data-dlg-qty]"))) {
      dlgState.qty = Math.max(1, Math.min(20, dlgState.qty + parseInt(el.getAttribute("data-dlg-qty"), 10)));
      paintDialogTotal();
      return;
    }
    if ((el = t.closest("[data-dlg-add]"))) {
      var note = els.dlgBody.querySelector("#o-note");
      var extra = note ? note.value.trim() : "";
      if (dlgState.variant) extra = byId[dlgState.id].variantsLabel + ": " + dlgState.variant + (extra ? " · " + extra : "");
      addToCart(dlgState.id, dlgState.qty, dlgState.gf, extra);
      closeDialog();
      return;
    }
    if ((el = t.closest("[data-line-qty]"))) {
      changeQty(el.getAttribute("data-key"), parseInt(el.getAttribute("data-line-qty"), 10));
      return;
    }
    if ((el = t.closest("[data-geo-btn]"))) {
      useLocation(el);
      return;
    }
    if ((el = t.closest("[data-set-mode]"))) {
      setMode(el.getAttribute("data-set-mode"));
      return;
    }
    if ((el = t.closest("[data-mode]"))) {
      setMode(el.getAttribute("data-mode"));
      return;
    }
    if ((el = t.closest("[data-go-checkout]"))) {
      if (el.disabled) return;
      renderCheckout();
      setStep("checkout");
      var h = els.checkout.querySelector("[data-ck-title]");
      if (h) h.focus({ preventScroll: true });
      return;
    }
    if ((el = t.closest("[data-open-sheet]"))) {
      openSheet();
      return;
    }
    if ((el = t.closest("[data-sheet-close]"))) {
      els.sheet.close();
      return;
    }
    if ((el = t.closest("[data-back]"))) {
      backToMenu();
      return;
    }
    if ((el = t.closest("[data-again]"))) {
      setStep("menu");
      return;
    }
    if ((el = t.closest("[data-search-clear]"))) {
      els.search.value = "";
      applySearch();
      els.search.focus();
      return;
    }
    if ((el = t.closest("[data-cat-link]"))) {
      e.preventDefault();
      if (els.search && els.search.value) {
        els.search.value = "";
        applySearch();
      }
      var target = document.getElementById("cat-" + el.getAttribute("data-cat-link"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  /* clic en el fondo del diálogo = cerrar */
  [els.dialog, els.sheet].forEach(function (d) {
    if (!d) return;
    d.addEventListener("click", function (e) {
      if (e.target === d) d.close();
    });
  });
  if (els.dialog) {
    els.dialog.addEventListener("change", function (e) {
      if (e.target.name === "o-var") dlgState.variant = e.target.value;
      if (e.target.name === "o-gf") {
        dlgState.gf = e.target.value === "1";
        paintDialogTotal();
      }
    });
    els.dialog.addEventListener("close", function () {
      if (dlgState && dlgState.opener && document.contains(dlgState.opener)) dlgState.opener.focus({ preventScroll: true });
      dlgState = null;
    });
  }

  if (els.search) {
    els.search.addEventListener("input", applySearch);
    els.search.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && els.search.value) {
        els.search.value = "";
        applySearch();
      }
    });
  }

  /* formulario de tramitar: cambios que re-pintan secciones */
  if (els.checkout) {
    els.checkout.addEventListener("input", function (e) {
      var form = e.target.form;
      if (!form) return;
      clearErr(e.target);
      readForm(form);
    });
    els.checkout.addEventListener("change", function (e) {
      var form = e.target.form;
      if (!form) return;
      readForm(form);
      var name = e.target.name;
      if (name === "ck-when" || name === "ck-day" || name === "ck-pay") {
        /* re-pinta (aparecen/desaparecen campos) y devuelve el foco al control */
        var focusSel = e.target.type === "radio"
          ? 'input[name="' + name + '"][value="' + e.target.value + '"]'
          : "#" + e.target.id;
        renderCheckout();
        var back = els.checkout.querySelector(focusSel);
        if (back) back.focus({ preventScroll: true });
      }
    });
    els.checkout.addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      readForm(form);
      var bad = validate(form);
      if (bad) {
        bad.scrollIntoView({ behavior: "smooth", block: "center" });
        if (bad.focus) bad.focus({ preventScroll: true });
        return;
      }
      var om = onlineMethod(state.pay.method);
      if (DEMO) {
        if (om) openDemoPay(om);
        else finishOrder(buildOrder());
        return;
      }
      if (om && !(CFG.api && server.online.indexOf(om.id) !== -1)) {
        openPayDialog(om);
        return;
      }
      if (CFG.api) sendOrder(form);
      else placeOrder();
    });
  }

  /* botón atrás / adelante del navegador */
  window.addEventListener("popstate", function () {
    if (location.hash === "#tramitar" && state.cart.length && step !== "checkout") {
      renderCheckout();
      setStep("checkout", { fromPop: true });
    } else if (!location.hash && step !== "menu") {
      setStep("menu", { fromPop: true, restore: true });
    }
  });

  document.addEventListener("sal:lang", function () {
    paintStatic();
    if (!products.length) return;
    renderMenu();
    renderCartAll();
    if (step === "checkout") renderCheckout();
    if (step === "done") renderDone();
  });

  /* estado cada minuto (abierto/cerrado, horas) */
  setInterval(function () {
    renderStatus();
  }, 60000);

  /* --- arranque ------------------------------------------------------------------------- */
  els.dlgBody = els.dialog && els.dialog.querySelector("[data-dlg-body]");
  load();
  paintStatic();
  loadServerConfig();
  setStep("menu", { keepScroll: true }); /* limpia #tramitar/#confirmado si se recarga */
  renderCartAll();

  fetch("carta.html", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    })
    .catch(function (err) {
      /* file://: fetch está bloqueado; usa la copia de carta-embed.js */
      if (window.SAL_CARTA_HTML) return window.SAL_CARTA_HTML;
      throw err;
    })
    .then(function (html) {
      parseCarta(html);
      if (!products.length) throw new Error("carta vacía");
      addCustomProduct();
      /* descarta del carrito platos que ya no existen en la carta */
      state.cart = state.cart.filter(function (l) { return byId[l.id] && byId[l.id].price != null; });
      save();
      renderMenu();
      renderCartAll();
      handlePayReturn();
      if (/^#cat-[a-z]+$/.test(ENTRY_HASH)) {
        var target = document.getElementById(ENTRY_HASH.slice(1));
        if (target) setTimeout(function () { target.scrollIntoView(); }, 80);
      }
    })
    .catch(function (err) {
      if (window.console) console.warn("[Salicornia] No se pudo leer carta.html:", err);
      els.menu.removeAttribute("aria-busy");
      els.menu.innerHTML =
        '<div class="o-error"><p>' + esc(s("load.error", { tel: CFG.telefono })) + '</p><a class="btn" href="' + TEL_HREF + '">' +
        icon("i-phone", 17) + esc(CFG.telefono) + "</a></div>";
    });
})();
