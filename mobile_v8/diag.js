// Диагностика соединения + сообщение «я онлайн» серверу присутствия (админ-страница vc.goldberg.pp.ua/admin).
// app.js вызывает: VCDiag.init(getState), VCDiag.set(key, status, msg), VCDiag.event(type, detail), VCDiag.watchCall(call, onFail).
(function () {
  "use strict";
  let PRESENCE = "https://static.137.100.245.188.clients.your-server.de/zoom";   // nginx-прокси на vc.goldberg.pp.ua (Cloudflare из России работает плохо)
  try { PRESENCE = localStorage.getItem("vc_presence") || PRESENCE; } catch (_) {}   // для тестов
  const PING_MS = 45000;
  const TX = {
    ru: { turn: "TURN (ретранслятор)", turnOk: "работает – звонок пройдёт даже при заблокированном UDP", turnNone: "не настроен", turnFail: "не отвечает: ", title: "Диагностика", lib: "Библиотека PeerJS", signal: "Сервер сигнализации", stun: "STUN / UDP (внешний адрес)", media: "Камера / микрофон", presence: "Сервер присутствия",
      wait: "проверка…", ok: "OK", libFail: "не загрузилась (unpkg.com заблокирован?) – звонки невозможны", sigFail: "нет связи с 0.peerjs.com – звонки невозможны (блокировка/сеть)",
      stunOk: "внешний адрес получен", stunFail: "внешний адрес не получен: UDP/STUN заблокирован – прямой звонок вероятно не соединится, нужен TURN",
      stunRelay: "только через ретранслятор", iceFail: "Соединение не удалось: прямой канал заблокирован (UDP/NAT). Нужен TURN-сервер.",
      timeout: "Нет соединения за 25 с. ICE: ", presFail: "недоступен (админ-страница не увидит вас; звонку не мешает)", rerun: "Проверить снова", close: "Закрыть",
      hint: "Если «STUN / UDP» красный – провайдер режет WebRTC (часто в России, в корпоративных сетях). Попробуйте мобильный интернет или VPN." },
    ua: { turn: "TURN (ретранслятор)", turnOk: "працює – дзвінок пройде навіть із заблокованим UDP", turnNone: "не налаштовано", turnFail: "не відповідає: ", title: "Діагностика", lib: "Бібліотека PeerJS", signal: "Сервер сигналізації", stun: "STUN / UDP (зовнішня адреса)", media: "Камера / мікрофон", presence: "Сервер присутності",
      wait: "перевірка…", ok: "OK", libFail: "не завантажилась (unpkg.com заблоковано?) – дзвінки неможливі", sigFail: "немає зв'язку з 0.peerjs.com – дзвінки неможливі",
      stunOk: "зовнішню адресу отримано", stunFail: "зовнішню адресу не отримано: UDP/STUN заблоковано – потрібен TURN",
      stunRelay: "лише через ретранслятор", iceFail: "З'єднання не вдалося: прямий канал заблоковано (UDP/NAT). Потрібен TURN-сервер.",
      timeout: "Немає з'єднання за 25 с. ICE: ", presFail: "недоступний (дзвінку не заважає)", rerun: "Перевірити знову", close: "Закрити",
      hint: "Якщо «STUN / UDP» червоний – провайдер ріже WebRTC. Спробуйте мобільний інтернет або VPN." },
    en: { turn: "TURN (relay)", turnOk: "works – calls connect even if UDP is blocked", turnNone: "not configured", turnFail: "no answer: ", title: "Diagnostics", lib: "PeerJS library", signal: "Signalling server", stun: "STUN / UDP (public address)", media: "Camera / microphone", presence: "Presence server",
      wait: "checking…", ok: "OK", libFail: "not loaded (unpkg.com blocked?) – calls impossible", sigFail: "no connection to 0.peerjs.com – calls impossible (blocked/network)",
      stunOk: "public address found", stunFail: "no public address: UDP/STUN blocked – a direct call will likely fail, TURN needed",
      stunRelay: "relay only", iceFail: "Connection failed: direct path blocked (UDP/NAT). A TURN server is needed.",
      timeout: "No connection after 25 s. ICE: ", presFail: "unreachable (admin page won't see you; the call is not affected)", rerun: "Check again", close: "Close",
      hint: "If “STUN / UDP” is red, the network blocks WebRTC (common in Russia and corporate networks). Try mobile data or a VPN." },
    de: { turn: "TURN (Relay)", turnOk: "funktioniert – Anrufe klappen auch bei blockiertem UDP", turnNone: "nicht konfiguriert", turnFail: "keine Antwort: ", title: "Diagnose", lib: "PeerJS-Bibliothek", signal: "Signalisierungsserver", stun: "STUN / UDP (öffentliche Adresse)", media: "Kamera / Mikrofon", presence: "Präsenzserver",
      wait: "prüfe…", ok: "OK", libFail: "nicht geladen (unpkg.com blockiert?) – keine Anrufe möglich", sigFail: "keine Verbindung zu 0.peerjs.com – keine Anrufe möglich",
      stunOk: "öffentliche Adresse gefunden", stunFail: "keine öffentliche Adresse: UDP/STUN blockiert – TURN nötig",
      stunRelay: "nur über Relay", iceFail: "Verbindung fehlgeschlagen: direkter Weg blockiert (UDP/NAT). TURN-Server nötig.",
      timeout: "Keine Verbindung nach 25 s. ICE: ", presFail: "nicht erreichbar (Anruf nicht betroffen)", rerun: "Erneut prüfen", close: "Schließen",
      hint: "Ist „STUN / UDP“ rot, blockiert das Netz WebRTC. Mobile Daten oder VPN versuchen." }
  };
  const KEYS = ["lib", "signal", "stun", "turn", "media", "presence"];
  const diag = {};
  let getState = function () { return {}; };
  let pingTimer = null;
  let iceState = "";
  const tx = function () {
    const l = (getState().lang || document.documentElement.lang || "en").slice(0, 2);
    return TX[l === "uk" ? "ua" : l] || TX.en;
  };

  function post(path, data) {
    try {
      return fetch(PRESENCE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), keepalive: true, mode: "cors" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); set("presence", "ok", tx().ok); })
        .catch(function (e) { set("presence", "warn", tx().presFail + " – " + e.message); });
    } catch (_) { return Promise.resolve(); }
  }
  function set(key, s, m) {
    const prev = diag[key];
    diag[key] = { s: s, m: String(m || "").slice(0, 200) };
    render();
    if (key !== "presence" && (!prev || prev.s !== s)) {
      if (s === "fail") event("diag-" + key + "-fail", m);
      ping();
    }
  }
  function device() {
    const ua = navigator.userAgent;
    const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "?";
    const br = /Telegram/i.test(ua) ? "Telegram webview" : /Instagram|FBAN|FBAV/.test(ua) ? "in-app" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera"
      : /YaBrowser/.test(ua) ? "Yandex" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "?";
    return os + " · " + br;
  }
  function ping() {
    const st = getState();
    if (!st.code) return;
    clearTimeout(pingTimer);
    pingTimer = setTimeout(ping, PING_MS);
    return post("/api/ping", Object.assign({}, st, {
      ice: st.state === "incall" ? iceState : "",
      device: device(), standalone: window.matchMedia && matchMedia("(display-mode: standalone)").matches, diag: diag
    }));
  }
  function event(type, detail) {
    const st = getState();
    if (!st.code) return;
    post("/api/event", { code: st.code, type: type, detail: String(detail || "").slice(0, 300) });
  }

  // STUN: удаётся ли получить внешний адрес (srflx). Нет – UDP/STUN режется.
  function testStun(iceServers) {
    set("stun", "wait", tx().wait);
    let pc;
    try { pc = new RTCPeerConnection({ iceServers: iceServers }); } catch (e) { set("stun", "fail", "RTCPeerConnection: " + e.message); return; }
    const types = {};
    let done = false;
    const finish = function () {
      if (done) return; done = true;
      try { pc.close(); } catch (_) {}
      if (types.srflx) set("stun", "ok", tx().stunOk);
      else if (types.relay) set("stun", "warn", tx().stunRelay);
      else set("stun", "fail", tx().stunFail + (types.host ? " (host only)" : " (no candidates)"));
    };
    pc.onicecandidate = function (e) {
      if (!e.candidate) return finish();
      const m = / typ (\w+)/.exec(e.candidate.candidate || "");
      if (m) types[m[1]] = true;
      if (types.srflx) finish();
    };
    pc.createDataChannel("x");
    pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).catch(function (e) { set("stun", "fail", e.message); done = true; });
    setTimeout(finish, 6000);
  }
  // TURN: получаем ли relay-кандидата через наш ретранслятор (с временным паролем от /zoom/turn)
  function testTurn(iceServers) {
    const turns = (iceServers || []).filter(function (x) { return [].concat(x.urls).some(function (u) { return /^turns?:/.test(u); }); });
    if (!turns.length) { set("turn", "warn", tx().turnNone); return; }
    set("turn", "wait", tx().wait);
    let pc, done = false, err = "";
    try { pc = new RTCPeerConnection({ iceServers: turns, iceTransportPolicy: "relay" }); } catch (e) { set("turn", "fail", e.message); return; }
    const finish = function (ok) {
      if (done) return; done = true;
      try { pc.close(); } catch (_) {}
      if (ok) set("turn", "ok", tx().turnOk); else set("turn", "fail", tx().turnFail + (err || "timeout"));
    };
    pc.onicecandidate = function (e) { if (e.candidate && / typ relay/.test(e.candidate.candidate)) finish(true); else if (!e.candidate) finish(false); };
    pc.onicecandidateerror = function (e) { err = (e.errorCode || "") + " " + (e.errorText || ""); };
    pc.createDataChannel("t");
    pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).catch(function (e) { err = e.message; finish(false); });
    setTimeout(function () { finish(false); }, 6000);
  }
  function testPresence() {
    fetch(PRESENCE + "/api/hello", { cache: "no-store", mode: "cors" })
      .then(function (r) { return r.json(); })
      .then(function (j) { set("presence", "ok", tx().ok + (j.country ? " · " + j.country : "")); })
      .catch(function (e) { set("presence", "warn", tx().presFail + " – " + e.message); });
  }

  // Во время звонка: следим за ICE; failed / нет соединения за 25 с – понятное сообщение и событие в админку.
  function watchCall(call, onFail) {
    const pc = call && call.peerConnection;
    const started = Date.now();
    let reported = false;
    const fail = function (msg, type) {
      if (reported) return; reported = true;
      if (onFail) onFail(msg);
      event(type, msg + " · " + (pc ? pc.iceConnectionState + "/" + pc.connectionState : "no pc"));
    };
    if (pc) {
      pc.addEventListener("iceconnectionstatechange", function () {
        const s = pc.iceConnectionState;
        iceState = s;
        ping();
        if (s === "failed") fail(tx().iceFail, "ice-failed");
        if (s === "connected" || s === "completed") event("call-connected", String(call.peer).replace(/^vc8-/, "") + " · " + Math.round((Date.now() - started) / 1000) + " s");
      });
    }
    setTimeout(function () {
      const p = call.peerConnection;
      const s = p ? p.iceConnectionState : "none";
      if (call.open !== false && s !== "connected" && s !== "completed" && s !== "closed") fail(tx().timeout + s + ". " + (diag.stun && diag.stun.s === "fail" ? tx().iceFail : tx().hint), "call-timeout");
    }, 25000);
  }

  // ---- UI ----
  let dlg = null;
  function render() {
    if (!dlg || !dlg.open) return;
    const T = tx();
    dlg.querySelector("h3").textContent = T.title;
    dlg.querySelector("ul").innerHTML = KEYS.map(function (k) {
      const d = diag[k] || { s: "wait", m: T.wait };
      const icon = d.s === "ok" ? "✅" : d.s === "warn" ? "⚠️" : d.s === "fail" ? "❌" : "⏳";
      return "<li><b>" + icon + " " + T[k] + "</b><br><span>" + String(d.m).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</span></li>";
    }).join("");
    dlg.querySelector(".diag-hint").textContent = T.hint;
    dlg.querySelector("[data-a=re]").textContent = T.rerun;
    dlg.querySelector("[data-a=close]").textContent = T.close;
  }
  function open() {
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "diag-dialog";
      dlg.innerHTML = '<h3></h3><ul></ul><p class="diag-hint"></p><div class="diag-actions"><button type="button" class="btn btn-secondary" data-a="re"></button> <button type="button" class="btn btn-primary" data-a="close"></button></div>';
      dlg.addEventListener("click", function (e) {
        const a = e.target.getAttribute && e.target.getAttribute("data-a");
        if (a === "close" || e.target === dlg) dlg.close();
        if (a === "re") runAll();
      });
      document.body.appendChild(dlg);
    }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    render();
  }
  let iceCfg = [{ urls: "stun:stun.l.google.com:19302" }];
  function runAll() {
    set("lib", typeof window.Peer === "function" ? "ok" : "fail", typeof window.Peer === "function" ? tx().ok : tx().libFail);
    testStun(iceCfg);
    testTurn(iceCfg);
    testPresence();
  }
  function init(getter, iceServers) {
    getState = getter;
    if (iceServers) iceCfg = iceServers;
    runAll();
    const b = document.getElementById("diagBtn");
    if (b) b.addEventListener("click", open);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) ping(); });
    window.addEventListener("pagehide", function () { const st = getState(); if (st.code) post("/api/event", { code: st.code, type: "offline", detail: "page closed" }); });
  }
  window.VCDiag = { testTurn: function (s) { if (s) iceCfg = s; testTurn(iceCfg); }, init: init, set: set, event: event, ping: ping, watchCall: watchCall, open: open, TX: TX };
})();
