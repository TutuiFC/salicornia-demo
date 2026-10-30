/* =========================================================================
   SALICORNIA — asistente del chat
   - Inyecta un botón flotante + panel de chat en todas las páginas.
   - Habla con el servidor (api/asistente.php), que añade las instrucciones,
     los datos del restaurante (assets/data/asistente.json, generado desde la web) y la clave de la IA.
     La clave nunca llega al navegador.
   - Idioma de la respuesta = idioma actual de la web (I18N.lang).
   - Degradación elegante: si falla la red o el servidor, muestra un mensaje
     con el teléfono del restaurante.
   ========================================================================= */
(function () {
  "use strict";

  var cfg = window.SAL_CONFIG;
  if (!cfg || !cfg.api || !cfg.api.proxy) return;

  function t(key, fallback) {
    return window.I18N ? window.I18N.t(key, fallback) : fallback;
  }

  var history = [];   /* [{role, content}] */
  var busy = false;
  var lastFocused = null;

  /* --- modo local (file://): sin PHP, llama a la IA con _private/local-ai.js ---
     Ese archivo (con la clave) solo existe en este ordenador: en el servidor
     _private está bloqueado y en web-demo no se copia. */
  var localAI = null;
  function loadLocalAI() {
    if (localAI) return localAI;
    localAI = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "_private/local-ai.js";
      s.onload = function () { window.SAL_LOCAL_AI ? resolve(window.SAL_LOCAL_AI) : reject(new Error("local")); };
      s.onerror = function () { reject(new Error("local")); };
      document.head.appendChild(s);
    });
    return localAI;
  }
  function askLocal(messages, signal) {
    return loadLocalAI().then(function (ai) {
      var msgs = [{ role: "system", content: ai.system(window.I18N ? I18N.lang : "es") }].concat(
        messages.slice(-10).map(function (m) { return { role: m.role, content: String(m.content).slice(0, 1500) }; })
      );
      return fetch(ai.baseUrl.replace(/\/$/, "") + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + ai.key },
        body: JSON.stringify({ model: ai.model, messages: msgs, max_completion_tokens: ai.maxTokens, stream: false, thinking: { type: "disabled" } }),
        signal: signal
      });
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!res.ok || !text || !String(text).trim()) throw new Error("api " + res.status);
        return String(text).trim();
      });
    });
  }

  /* --- llamada al servidor ------------------------------------------------- */
  function ask(messages) {
    if (location.protocol === "file:") {
      var c = typeof AbortController !== "undefined" ? new AbortController() : null;
      var tm = c ? setTimeout(function () { c.abort(); }, cfg.api.timeoutMs || 50000) : null;
      return askLocal(messages, c ? c.signal : undefined).then(
        function (a) { if (tm) clearTimeout(tm); return a; },
        function (e) { if (tm) clearTimeout(tm); throw e; }
      );
    }
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, cfg.api.timeoutMs || 50000) : null;

    return fetch(cfg.api.proxy, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ lang: window.I18N ? I18N.lang : "es", messages: messages }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok || !data || !data.ok || !data.answer) {
          var err = new Error("api " + res.status);
          err.status = res.status;
          throw err;
        }
        return String(data.answer).trim();
      });
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  /* --- UI -------------------------------------------------------------------- */
  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  var btn = el("button", "sal-fab", {
    type: "button",
    "aria-expanded": "false",
    "aria-controls": "sal-panel"
  });

  var panel = el("div", "sal-panel", { id: "sal-panel", role: "dialog", "aria-hidden": "true", "aria-label": "Asistente" });
  panel.hidden = true;

  btn.innerHTML =
    '<svg width="22" height="22" aria-hidden="true" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 12a8 8 0 0 1-8 8H5.6L3 21l1.2-3.4A8 8 0 1 1 21 12Z"/>' +
    '<path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';
  btn.setAttribute("aria-label", t("as.open", "Abrir asistente"));

  var head = el("div", "sal-head");
  var headTitle = el("span", "sal-head__title");
  headTitle.textContent = t("as.title", "Asistente Salicornia");
  var headClose = el("button", "sal-head__close", { type: "button", "aria-label": t("as.close", "Cerrar asistente") });
  headClose.innerHTML = '<svg width="18" height="18" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg>';
  head.appendChild(headTitle);
  head.appendChild(headClose);

  var log = el("div", "sal-log");
  log.setAttribute("aria-live", "polite");

  var form = el("form", "sal-form");
  var input = el("input", "sal-input", {
    type: "text",
    autocomplete: "off",
    maxlength: "400",
    "aria-label": t("as.placeholder", "Escribe tu pregunta…")
  });
  input.placeholder = t("as.placeholder", "Escribe tu pregunta…");
  var send = el("button", "sal-send", { type: "submit", "aria-label": t("as.send", "Enviar mensaje") });
  send.innerHTML = '<svg width="18" height="18" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15"/><path d="M13.5 6.5 19 12l-5.5 5.5"/></svg>';
  form.appendChild(input);
  form.appendChild(send);

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(form);
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  /* --- mensajes -------------------------------------------------------------- */
  /* Formato de las respuestas: **negrita**, *cursiva*, listas y enlaces.
     Se construye con nodos DOM (nunca innerHTML): el texto de la IA no puede inyectar HTML,
     y solo se enlazan páginas de la propia web, http(s), tel: y mailto:. */
  var INLINE_RE = /(\*\*|__)(.+?)\1|\[([^\]\n]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|((?:\+34\s?)?[6-9]\d{2}(?:\s?\d{2}){3})(?!\d)|\*([^*\s](?:[^*\n]*[^*\s])?)\*|`([^`\n]+)`/g;

  function safeHref(url) {
    if (/^https?:\/\//i.test(url) || /^(tel|mailto):/i.test(url)) return url;
    if (/^(?:\.\/)?[a-z0-9-]+\.html(?:#[\w-]+)?$/i.test(url) || /^#[\w-]+$/.test(url)) return url.replace(/^\.\//, "");
    return null;
  }

  function addLink(parent, label, href) {
    var safe = safeHref(href);
    if (!safe) { parent.appendChild(document.createTextNode(label)); return; }
    var a = document.createElement("a");
    a.href = safe;
    a.textContent = label;
    if (/^https?:/i.test(safe) && safe.indexOf(location.origin) !== 0) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    parent.appendChild(a);
  }

  function renderInline(parent, s) {
    var last = 0, m;
    var re = new RegExp(INLINE_RE.source, "g");
    while ((m = re.exec(s))) {
      if (m.index > last) parent.appendChild(document.createTextNode(s.slice(last, m.index)));
      if (m[2] !== undefined) {
        var b = document.createElement("strong");
        renderInline(b, m[2]);
        parent.appendChild(b);
      } else if (m[3] !== undefined) {
        addLink(parent, m[3], m[4]);
      } else if (m[5] !== undefined) {
        addLink(parent, m[5].replace(/^https?:\/\//, ""), m[5]);
      } else if (m[6] !== undefined) {
        addLink(parent, m[6], "mailto:" + m[6]);
      } else if (m[7] !== undefined) {
        addLink(parent, m[7], "tel:+34" + m[7].replace(/^\+34/, "").replace(/\s/g, ""));
      } else if (m[8] !== undefined) {
        var i = document.createElement("em");
        i.textContent = m[8];
        parent.appendChild(i);
      } else {
        parent.appendChild(document.createTextNode(m[9]));
      }
      last = re.lastIndex;
    }
    if (last < s.length) parent.appendChild(document.createTextNode(s.slice(last)));
  }

  function renderRich(parent, text) {
    var lines = String(text).replace(/\r/g, "").split("\n");
    var list = null, para = null;
    lines.forEach(function (raw) {
      var line = raw.trim();
      var item = /^(?:[-*•]|(\d+)[.)])\s+(.*)$/.exec(line);
      if (!line) { list = null; para = null; return; }
      if (item) {
        var kind = item[1] ? "ol" : "ul";
        if (!list || list.tagName.toLowerCase() !== kind) { list = document.createElement(kind); parent.appendChild(list); }
        var li = document.createElement("li");
        renderInline(li, item[2]);
        list.appendChild(li);
        para = null;
        return;
      }
      list = null;
      line = line.replace(/^#{1,6}\s+/, function () { return ""; });
      if (!para) { para = document.createElement("p"); parent.appendChild(para); }
      else para.appendChild(document.createElement("br"));
      renderInline(para, line);
    });
  }

  function addMsg(role, text) {
    var wrap = el("div", "sal-msg sal-msg--" + (role === "user" ? "user" : "bot"));
    var bubble = el("div", "sal-bubble");
    if (role === "user") bubble.textContent = text;
    else { bubble.classList.add("sal-bubble--rich"); renderRich(bubble, text); }
    wrap.appendChild(bubble);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return wrap;
  }

  function addWelcome() {
    addMsg("bot", t("as.welcome", "Hola 👋 Soy el asistente de Salicornia. Pregúntame por la carta, el horario, cómo llegar o reservas."));
  }

  function addTyping() {
    var wrap = el("div", "sal-msg sal-msg--bot sal-typing");
    wrap.innerHTML = '<div class="sal-bubble sal-bubble--typing"><span></span><span></span><span></span></div>';
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return wrap;
  }

  var welcomed = false;

  function openPanel() {
    lastFocused = document.activeElement;
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("is-open");
    requestAnimationFrame(function () { panel.classList.add("is-open"); });
    if (!welcomed) {
      welcomed = true;
      addWelcome();
    }
    input.focus({ preventScroll: true });
  }

  function closePanel() {
    panel.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    window.setTimeout(function () { panel.hidden = true; }, 300);
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }

  btn.addEventListener("click", function () {
    if (btn.getAttribute("aria-expanded") === "true") closePanel();
    else openPanel();
  });
  headClose.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") closePanel();
  });

  /* --- enviar ------------------------------------------------------------------ */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    addMsg("user", text);
    busy = true;
    send.disabled = true;

    var typing = addTyping();

    history.push({ role: "user", content: text });
    /* recortar historial para no inflar tokens */
    ask(history.slice(-10)).then(function (answer) {
      history.push({ role: "assistant", content: answer });
      typing.remove();
      addMsg("bot", answer);
    }).catch(function (err) {
      typing.remove();
      /* quitar el mensaje del usuario del historial si la llamada falló */
      if (history.length && history[history.length - 1].content === text &&
          history[history.length - 1].role === "user") {
        history.pop();
      }
      var isNetError = err && (err.name === "AbortError" || err.name === "TypeError");
      var msg = isNetError
        ? t("as.error_net", "No he podido conectar. Comprueba tu conexión e inténtalo de nuevo.")
        : t("as.error_api", "El asistente no está disponible ahora mismo. Para cualquier consulta, llámanos al 864 62 76 21.");
      addMsg("bot", msg);
    }).then(function () {
      busy = false;
      send.disabled = false;
      input.focus({ preventScroll: true });
    });
  });

  /* --- refrescar textos al cambiar de idioma ------------------------------------ */
  document.addEventListener("sal:lang", function () {
    headTitle.textContent = t("as.title", "Asistente Salicornia");
    headClose.setAttribute("aria-label", t("as.close", "Cerrar asistente"));
    btn.setAttribute("aria-label", t("as.open", "Abrir asistente"));
    input.placeholder = t("as.placeholder", "Escribe tu pregunta…");
    input.setAttribute("aria-label", t("as.placeholder", "Escribe tu pregunta…"));
    send.setAttribute("aria-label", t("as.send", "Enviar mensaje"));
    /* el saludo de bienvenida se regenera con el nuevo idioma */
    welcomed = false;
    log.textContent = "";
  });
})();
