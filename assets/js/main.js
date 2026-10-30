/* =========================================================================
   SALICORNIA PIZZA I PASTA — comportamiento de la web
   Sin dependencias. Todo degrada con elegancia si falla algo.
   ========================================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- i18n: acceso cómodo (i18n.js carga antes gracias a defer) --------- */
  function t(key, fallback) {
    return window.I18N ? window.I18N.t(key, fallback) : fallback;
  }
  function dateLocale() {
    if (!window.I18N) return "es-ES";
    return I18N.lang === "ca" ? "ca-ES" : I18N.lang === "en" ? "en-GB" : "es-ES";
  }
  function peopleLabel(raw) {
    if (raw === "9") return t("r.group", "Más de 8 · grupo");
    return raw + (raw === "1" ? t("r.person_one", " persona") : t("r.person_many", " personas"));
  }

  /* --- Header sólido al hacer scroll ---------------------------------- */
  var header = document.querySelector(".site-header");
  var mobileBar = document.querySelector(".mobile-bar");
  var footer = document.querySelector(".site-footer");

  // en páginas sin hero la cabecera va siempre sólida
  var hasHero = !!document.querySelector(".hero, .page-hero");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-solid", y > 40 || !hasHero);

    if (mobileBar) {
      var nearFooter = false;
      if (footer) {
        var rect = footer.getBoundingClientRect();
        nearFooter = rect.top < window.innerHeight - 80;
      }
      mobileBar.classList.toggle("is-visible", y > 420 && !nearFooter);
    }

    if (typeof revealVisible === "function") revealVisible(0.94);
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
    },
    { passive: true }
  );
  onScroll();

  /* --- Menú móvil ------------------------------------------------------ */
  var navToggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  function closeNav() {
    if (!navToggle || !mobileNav) return;
    navToggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("is-locked");
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      mobileNav.classList.toggle("is-open", !open);
      document.body.classList.toggle("is-locked", !open);
      if (!open) {
        var first = mobileNav.querySelector("a");
        if (first) first.focus({ preventScroll: true });
      }
    });

    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeNav();
    closeLightbox();
  });

  /* --- Revelado al entrar en pantalla ---------------------------------- */
  /* El estado oculto sólo existe cuando hay JS (clase .js en <html>), así que
     si algo fallara el contenido se ve igualmente. Además del observador, un
     repaso durante el scroll garantiza que nada se quede invisible. */
  var revealables = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  var pending = revealables.slice();

  function show(el) {
    el.classList.add("is-in");
  }

  function revealVisible(factor) {
    // puede invocarse antes de que exista la lista (onScroll inicial)
    if (!pending || !pending.length) return;
    pending = pending.filter(function (el) {
      if (el.classList.contains("is-in")) return false;
      if (el.getBoundingClientRect().top < window.innerHeight * factor) {
        show(el);
        return false;
      }
      return true;
    });
  }

  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealables.forEach(show);
    pending = [];
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          show(entry.target);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
    window.setTimeout(function () {
      revealVisible(1.2);
    }, 2500);
  }

  /* --- Pestañas de la carta -------------------------------------------- */
  var tablist = document.querySelector("[data-tabs]");
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.setAttribute("tabindex", selected ? "0" : "-1");
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    }

    tablist.addEventListener("click", function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab) selectTab(tab, false);
    });

    tablist.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        selectTab(next, true);
      }
    });
  }

  /* --- Galería con visor ------------------------------------------------ */
  var lightbox = document.querySelector("[data-lightbox]");
  var lightboxImg = lightbox ? lightbox.querySelector("img") : null;
  var lightboxCaption = lightbox ? lightbox.querySelector(".lightbox__caption") : null;
  var lastFocused = null;

  function openLightbox(src, alt, caption) {
    if (!lightbox || !lightboxImg) return;
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    if (lightboxCaption) lightboxCaption.textContent = caption || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    var closeBtn = lightbox.querySelector(".lightbox__close");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastFocused) lastFocused.focus({ preventScroll: true });
  }

  document.querySelectorAll("[data-full]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var img = btn.querySelector("img");
      openLightbox(
        btn.getAttribute("data-full"),
        img ? img.alt : "",
        btn.getAttribute("data-caption") || (img ? img.alt : "")
      );
    });
  });

  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.closest(".lightbox__close")) closeLightbox();
    });
  }

  /* --- Mapa bajo demanda (sin cookies de terceros hasta que se pide) ---- */
  var mapBtn = document.querySelector("[data-map-load]");
  if (mapBtn) {
    mapBtn.addEventListener("click", function () {
      var frame = document.querySelector("[data-map-frame]");
      var placeholder = mapBtn.closest(".map-placeholder");
      if (!frame) return;
      frame.setAttribute("src", frame.getAttribute("data-src"));
      if (placeholder) placeholder.remove();
    });
  }

  /* --- Horario: día de hoy y estado abierto/cerrado -------------------- */
  var SCHEDULE = {
    1: null,
    2: [[13, 0, 23, 0]],
    3: [[13, 0, 23, 30]],
    4: [[13, 0, 23, 30]],
    5: [[13, 0, 23, 30]],
    6: [[13, 0, 23, 30]],
    7: [[13, 0, 23, 0]]
  };

  function madridNow() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) {
      map[p.type] = p.value;
    });
    var days = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    var hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;
    return {
      day: days[map.weekday] || new Date().getDay() || 7,
      minutes: hour * 60 + parseInt(map.minute, 10)
    };
  }

  var now;
  try {
    now = madridNow();
  } catch (err) {
    var d = new Date();
    now = { day: d.getDay() === 0 ? 7 : d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
  }

  document.querySelectorAll("[data-day]").forEach(function (li) {
    var days = li.getAttribute("data-day").split(",");
    if (days.indexOf(String(now.day)) !== -1) li.classList.add("is-today");
  });

  var statusEls = document.querySelectorAll("[data-open-status]");
  function renderOpenStatus() {
    if (!statusEls.length) return;
    var today = SCHEDULE[now.day];
    var label = t("status.closed_now", "Cerrado ahora");
    var isOpen = false;
    if (today) {
      today.forEach(function (range) {
        var start = range[0] * 60 + range[1];
        var end = range[2] * 60 + range[3];
        if (now.minutes >= start && now.minutes < end) isOpen = true;
      });
      if (isOpen) {
        label = t("status.open_now", "Abierto ahora");
      } else if (now.minutes < today[0][0] * 60 + today[0][1]) {
        label = t("status.opens_at", "Hoy abrimos a las") + " " + String(today[0][0]).padStart(2, "0") + ":" + String(today[0][1]).padStart(2, "0");
      }
    } else {
      label = t("status.closed_today", "Hoy cerrado");
    }
    statusEls.forEach(function (el) {
      el.textContent = label;
      el.classList.remove("is-open-now", "is-closed-now");
      el.classList.add(isOpen ? "is-open-now" : "is-closed-now");
    });
  }
  renderOpenStatus();
  document.addEventListener("sal:lang", renderOpenStatus);

  /* --- Reservas: módulo de CoverManager en el idioma de la web ---------- */
  var cmFrame = document.querySelector("[data-cm-frame]");
  if (cmFrame) {
    var CM_LANGS = { es: "spanish", ca: "catalan", en: "english" };
    var CM_BASE = "https://www.covermanager.com/reservation/module_restaurant/restaurante-salicornia-pizzeria/";
    var syncCM = function () {
      var url = CM_BASE + (CM_LANGS[window.I18N ? I18N.lang : "es"] || "spanish");
      if (cmFrame.src !== url) cmFrame.src = url;
    };
    syncCM();
    document.addEventListener("sal:lang", syncCM);
    var cmResizer = document.createElement("script");
    cmResizer.src = "https://www.covermanager.com/js/iframeResizer/iframeResizer.min.js";
    cmResizer.onload = function () {
      if (typeof window.iFrameResize === "function") window.iFrameResize({ checkOrigin: ["https://www.covermanager.com"] }, cmFrame);
    };
    document.head.appendChild(cmResizer);
  }

  /* --- Formulario de reserva (demo sin backend) ------------------------- */
    var reserveForm = document.querySelector("[data-reserve-form]");
    var lastReserve = null;

    /* al cambiar de idioma se reformatean resumen, errores y estado */
    document.addEventListener("sal:lang", function () {
      document.querySelectorAll(".field__error[data-i18n-key]").forEach(function (err) {
        if (!err.hidden) err.textContent = t(err.dataset.i18nKey, err.dataset.i18nFallback);
      });
      if (!lastReserve || !confirmBox || confirmBox.hidden) return;
      var f = new Date(lastReserve.fecha + "T12:00:00");
      var sd = document.querySelector("[data-summary-fecha]");
      var sp = document.querySelector("[data-summary-personas]");
      if (sd) sd.textContent = f.toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "long" });
      if (sp) sp.textContent = peopleLabel(lastReserve.count);
    });
    if (reserveForm) {
    reserveForm.setAttribute("novalidate", "");
    var confirmBox = document.querySelector("[data-reserve-confirm]");
    var fecha = reserveForm.elements.fecha;
    var hora = reserveForm.elements.hora;
    var personas = reserveForm.elements.personas;
    var nombre = reserveForm.elements.nombre;
    var telefono = reserveForm.elements.telefono;
    var email = reserveForm.elements.email;
    var personHint = document.getElementById("r-personas-hint");

    // fechas permitidas: de hoy a 60 días
    function toISO(d) {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }
    var today = new Date();
    var maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    fecha.min = toISO(today);
    fecha.max = toISO(maxDate);

    function dayFromValue(value) {
      var d = new Date(value + "T12:00:00");
      return d.getDay() === 0 ? 7 : d.getDay();
    }

    function setError(field, key, fallback) {
      var wrap = field.closest(".field");
      var err = document.getElementById(field.id + "-error");
      if (err) {
        err.textContent = t(key, fallback);
        err.dataset.i18nKey = key;
        err.dataset.i18nFallback = fallback;
        err.hidden = false;
      }
      field.setAttribute("aria-invalid", "true");
      if (wrap) wrap.classList.add("is-invalid");
    }

    function clearError(field) {
      var wrap = field.closest(".field");
      var err = document.getElementById(field.id + "-error");
      if (err) err.hidden = true;
      field.removeAttribute("aria-invalid");
      if (wrap) wrap.classList.remove("is-invalid");
    }

    function validPhone(v) {
      var digits = v.replace(/[^\d]/g, "");
      return digits.length >= 9 && digits.length <= 15;
    }

    function validEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function syncPersonHint() {
      if (personHint) personHint.hidden = personas.value !== "9";
    }
    personas.addEventListener("change", syncPersonHint);
    syncPersonHint();

    [fecha, hora, personas, nombre, telefono, email].forEach(function (el) {
      var ev = el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(ev, function () { clearError(el); });
    });

    function validate() {
      var firstBad = null;

      if (!fecha.value) {
        setError(fecha, "r.err_fecha", "Elige el día de la reserva.");
        firstBad = firstBad || fecha;
      } else if (fecha.value < fecha.min) {
        setError(fecha, "r.err_fecha_past", "Elige una fecha a partir de hoy.");
        firstBad = firstBad || fecha;
      } else if (SCHEDULE[dayFromValue(fecha.value)] === null) {
        setError(fecha, "r.err_monday", "Los lunes estamos cerrados. Elige otro día.");
        firstBad = firstBad || fecha;
      } else {
        clearError(fecha);
      }

      if (!hora.value) {
        setError(hora, "r.err_hora", "Elige una hora.");
        firstBad = firstBad || hora;
      } else {
        clearError(hora);
      }

      if (!nombre.value.trim()) {
        setError(nombre, "r.err_nombre", "Pon tu nombre.");
        firstBad = firstBad || nombre;
      } else {
        clearError(nombre);
      }

      if (!telefono.value.trim()) {
        setError(telefono, "r.err_tel", "Pon un teléfono para confirmar la reserva.");
        firstBad = firstBad || telefono;
      } else if (!validPhone(telefono.value)) {
        setError(telefono, "r.err_tel_bad", "Este teléfono no parece correcto.");
        firstBad = firstBad || telefono;
      } else {
        clearError(telefono);
      }

      if (!email.value.trim()) {
        setError(email, "r.err_email_req", "Pon tu email para enviarte la confirmación.");
        firstBad = firstBad || email;
      } else if (!validEmail(email.value)) {
        setError(email, "r.err_email", "Este email no parece correcto.");
        firstBad = firstBad || email;
      } else {
        clearError(email);
      }

      return firstBad;
    }

    reserveForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = validate();
      if (firstBad) {
        firstBad.focus({ preventScroll: false });
        return;
      }

      var f = new Date(fecha.value + "T12:00:00");
      var people = peopleLabel(personas.value);
      var sd = document.querySelector("[data-summary-fecha]");
      var sh = document.querySelector("[data-summary-hora]");
      var sp = document.querySelector("[data-summary-personas]");
      var sn = document.querySelector("[data-summary-nombre]");
      lastReserve = { fecha: fecha.value, hora: hora.value, count: personas.value, nombre: nombre.value.trim() };
      if (sd) sd.textContent = f.toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "long" });
      if (sh) sh.textContent = hora.value;
      if (sp) sp.textContent = people;
      if (sn) sn.textContent = nombre.value.trim();

      reserveForm.hidden = true;
      if (confirmBox) {
        confirmBox.hidden = false;
        confirmBox.classList.add("is-in");
        var title = confirmBox.querySelector("#r-confirm-title");
        if (title) title.focus({ preventScroll: true });
      }
    });

    var resetBtn = document.querySelector("[data-reserve-reset]");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (confirmBox) {
          confirmBox.hidden = true;
          confirmBox.classList.remove("is-in");
        }
        reserveForm.hidden = false;
        reserveForm.reset();
        syncPersonHint();
        [fecha, hora, personas, nombre, telefono, email].forEach(clearError);
      });
    }
  }

  /* --- Navegación de la carta (sección activa) ------------------------- */
  var menuNavLinks = document.querySelectorAll(".menu-nav a");
  if (menuNavLinks.length && "IntersectionObserver" in window) {
    var sections = [];
    menuNavLinks.forEach(function (link) {
      var target = document.querySelector(link.getAttribute("href"));
      if (target) sections.push({ link: link, el: target });
    });
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          menuNavLinks.forEach(function (l) {
            l.classList.remove("is-active");
          });
          var match = sections.filter(function (s) {
            return s.el === entry.target;
          })[0];
          if (match) match.link.classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (s) {
      spy.observe(s.el);
    });
  }

  /* --- Carrusel de pizzas: flechas, puntos, avance cada 4 s y bucle ------- */
  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector(".carousel__track");
    var slides = root.querySelectorAll(".carousel__slide");
    var dotsBox = root.querySelector(".carousel__dots");
    var n = slides.length;
    var i = 0;
    var timer = null;
    var dots = [];
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (var k = 0; k < n; k++) {
      (function (idx) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "carousel__dot";
        d.setAttribute("role", "tab");
        d.setAttribute("aria-label", "Foto " + (idx + 1));
        d.addEventListener("click", function () { go(idx); restart(); });
        dotsBox.appendChild(d);
        dots.push(d);
      })(k);
    }

    function go(idx) {
      i = (idx + n) % n;
      track.style.transform = "translateX(" + -100 * i + "%)";
      slides.forEach(function (s, j) { s.setAttribute("aria-hidden", j === i ? "false" : "true"); });
      dots.forEach(function (d, j) { d.setAttribute("aria-selected", j === i ? "true" : "false"); });
    }
    function start() {
      if (reduce || timer) return;
      timer = setInterval(function () { go(i + 1); }, 4000);
    }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    root.querySelector(".carousel__btn--prev").addEventListener("click", function () { go(i - 1); restart(); });
    root.querySelector(".carousel__btn--next").addEventListener("click", function () { go(i + 1); restart(); });
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

    var sx = null;
    root.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; stop(); }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (sx !== null) {
        var dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      }
      sx = null;
      start();
    });

    go(0);
    start();
  });

  /* --- Año en el pie ---------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* --- Botón del asistente: oculto en móvil mientras se ve la portada --- */
  var heroEl = document.querySelector(".hero");
  if (heroEl && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      document.body.classList.toggle("hero-visible", entries[0].intersectionRatio > 0.35);
    }, { threshold: [0, 0.35, 1] }).observe(heroEl);
  }
})();
