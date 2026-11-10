/* Menú de grupo (más de 20 personas): envía la solicitud a api/grupo.php.
   En la demo pública (GitHub Pages, Netlify o archivo local) no se envía nada. */
(function () {
  "use strict";
  var form = document.querySelector("[data-grupo]");
  if (!form) return;
  var DEMO = location.protocol === "file:" || /\.(netlify\.app|github\.io)$/.test(location.hostname);
  var MIN = 21;

  var L = {
    es: {
      people: "Para grupos son necesarias 21 personas o más. Para menos, reserva en la página de reservas.",
      name: "Escribe tu nombre.", phone: "Escribe un teléfono válido.", email: "El email no parece válido.",
      date: "Elige una fecha de hoy en adelante.", amount: "Indica el importe en euros.", types: "Elige al menos un tipo de plato.",
      send: "Enviar solicitud", sending: "Enviando…", fail: "No hemos podido enviar la solicitud. Inténtalo de nuevo o llámanos al 864 62 76 21.",
      perPerson: "Euros por comensal", total: "Euros en total", estPer: "Total aproximado: {t}", estTot: "Unos {p} por persona",
      ok: "Hemos recibido tu solicitud (ref. {ref}). Te llamaremos para confirmar el menú, el precio y la fecha.",
      demo: "Esto es una demostración: la solicitud no se ha enviado a ningún sitio."
    },
    ca: {
      people: "Per a grups calen 21 persones o més. Per a menys, reserva a la pàgina de reserves.",
      name: "Escriu el teu nom.", phone: "Escriu un telèfon vàlid.", email: "L'email no sembla vàlid.",
      date: "Tria una data d'avui endavant.", amount: "Indica l'import en euros.", types: "Tria almenys un tipus de plat.",
      send: "Enviar sol·licitud", sending: "Enviant…", fail: "No hem pogut enviar la sol·licitud. Torna-ho a provar o truca'ns al 864 62 76 21.",
      perPerson: "Euros per comensal", total: "Euros en total", estPer: "Total aproximat: {t}", estTot: "Uns {p} per persona",
      ok: "Hem rebut la teva sol·licitud (ref. {ref}). Et trucarem per confirmar el menú, el preu i la data.",
      demo: "Això és una demostració: la sol·licitud no s'ha enviat enlloc."
    },
    en: {
      people: "Groups need 21 people or more. For fewer, book on the reservations page.",
      name: "Enter your name.", phone: "Enter a valid phone number.", email: "That email doesn't look valid.",
      date: "Pick a date from today on.", amount: "Enter the amount in euros.", types: "Choose at least one type of dish.",
      send: "Send request", sending: "Sending…", fail: "We couldn't send your request. Try again or call us on 864 62 76 21.",
      perPerson: "Euros per person", total: "Euros in total", estPer: "Approximate total: {t}", estTot: "About {p} per person",
      ok: "We've received your request (ref. {ref}). We'll call you to confirm the menu, the price and the date.",
      demo: "This is a demo: the request has not been sent anywhere."
    }
  };
  function lang() {
    try {
      var l = localStorage.getItem("salicornia_lang");
      if (l === "ca" || l === "en" || l === "es") return l;
    } catch (e) { /* noop */ }
    var h = (document.documentElement.lang || "es").slice(0, 2);
    return L[h] ? h : "es";
  }
  function s(k, v) {
    var t = (L[lang()] || L.es)[k] || L.es[k] || k;
    if (v) Object.keys(v).forEach(function (x) { t = t.replace("{" + x + "}", v[x]); });
    return t;
  }
  function eur(n) {
    return new Intl.NumberFormat(lang() === "en" ? "en-GB" : lang() === "ca" ? "ca-ES" : "es-ES", { style: "currency", currency: "EUR" }).format(n);
  }

  var el = {
    err: form.querySelector("[data-grupo-error]"),
    send: form.querySelector("[data-grupo-send]"),
    amountLabel: form.querySelector("[data-grupo-amount-label]"),
    est: form.querySelector("[data-grupo-estimate]"),
    people: form.elements.people, amount: form.elements.amount, date: form.elements.date,
    done: document.querySelector("[data-grupo-done]"), doneText: document.querySelector("[data-grupo-done-text]")
  };
  var d = new Date();
  el.date.min = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);

  function mode() { return form.elements.mode.value; }
  function refresh() {
    var star = ' <span class="field__req">*</span>';
    el.amountLabel.innerHTML = s(mode() === "per_person" ? "perPerson" : "total") + star;
    var a = parseFloat(el.amount.value), p = parseInt(el.people.value, 10);
    el.est.textContent = "";
    if (a > 0 && p >= MIN) {
      el.est.textContent = mode() === "per_person" ? s("estPer", { t: eur(a * p) }) : s("estTot", { p: eur(a / p) });
    }
  }
  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  document.addEventListener("sal:lang", refresh);
  refresh();

  function fail(msg, field) {
    el.err.textContent = msg;
    el.err.hidden = false;
    if (field && form.elements[field]) form.elements[field].focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    el.err.hidden = true;
    var f = form.elements;
    var types = Array.prototype.map.call(form.querySelectorAll('input[name="types"]:checked'), function (c) { return c.value; });
    var people = parseInt(f.people.value, 10);
    var amount = parseFloat(String(f.amount.value).replace(",", "."));
    if (!f.name.value.trim()) return fail(s("name"), "name");
    if (f.phone.value.replace(/[^\d]/g, "").length < 9) return fail(s("phone"), "phone");
    if (f.email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value)) return fail(s("email"), "email");
    if (!f.date.value || f.date.value < el.date.min) return fail(s("date"), "date");
    if (!(people >= MIN)) return fail(s("people"), "people");
    if (!(amount > 0)) return fail(s("amount"), "amount");
    if (!types.length) return fail(s("types"));

    var body = {
      name: f.name.value, phone: f.phone.value, email: f.email.value, date: f.date.value, time: f.time.value,
      people: people, mode: mode(), amount: amount, types: types, allergies: f.allergies.value, notes: f.notes.value,
      website: f.website.value
    };
    function finish(ref, demo) {
      form.hidden = true;
      el.doneText.textContent = demo ? s("demo") : s("ok", { ref: ref });
      el.done.hidden = false;
      el.done.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (DEMO) return finish("", true);
    el.send.disabled = true;
    el.send.textContent = s("sending");
    fetch("api/grupo.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (r.ok && r.j && r.j.ok) return finish(r.j.ref, false);
        throw new Error("bad");
      })
      .catch(function () {
        el.send.disabled = false;
        el.send.textContent = s("send");
        fail(s("fail"));
      });
  });
})();
