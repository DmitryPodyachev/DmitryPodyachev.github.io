(() => {
  "use strict";

  const I18N = {
    ru: {
      title: "Видеозвонок v4",
      subtitle: "Откройте страницу → скопируйте ссылку или ID → второй открывает ссылку и звонит",
      yourId: "Ваш ID:", link: "Ссылка:", copyId: "Копировать ID", copyLink: "Копировать ссылку",
      remotePlaceholder: "ID собеседника", call: "Позвонить", hangup: "Сбросить",
      mic: "Микрофон", micOff: "Микрофон выкл", cam: "Камера", camOff: "Камера выкл",
      screen: "Экран", screenStop: "Стоп экран", shotMe: "Скриншот (я)", shotThem: "Скриншот (он)",
      you: "Вы", screenLabel: "Экран", peer: "Собеседник", lang: "Язык",
      hint: "Камера и микрофон. «Экран» — демонстрация. Fullscreen — ⛶. Скриншоты PNG. Страна по IP. Чат — после звонка.",
      init: "Инициализация…", connecting: "подключение…", ready: "Готово. Скопируйте ссылку или ID.",
      idFromLink: "ID из ссылки подставлен. Нажмите «Позвонить».",
      callEnded: "Звонок завершён.", connectingCall: "Соединение…", connected: "Связь установлена",
      incoming: "Входящий звонок…", noMedia: "Нет доступа к камере/микрофону: ",
      enterId: "Введите ID", noStream: "Нет медиапотока", selfCall: "Нельзя звонить себе",
      callFail: "Не удалось начать звонок", callErr: "Ошибка звонка: ", peerErr: "Ошибка PeerJS: ",
      disconnected: "Отключены от сервера. Обновите страницу.",
      idCopied: "ID скопирован", linkCopied: "Ссылка скопирована", backCam: "Снова камера",
      screenOn: "Экран включён", screenOff: "Экран выключен", screenFail: "Ошибка экрана: ",
      noFrame: "Нет кадра", shotFail: "Скриншот не создан", shotOk: "Скриншот сохранён", fsErr: "Fullscreen: ",
      myCountry: "Вы:", peerCountry: "Собеседник:", countryUnknown: "страна неизвестна", countryLoading: "определение страны…",
      remoteVideoOn: "Видео вкл", remoteVideoOff: "Видео выкл",
      chat: "Чат", chatPlaceholder: "Сообщение…", send: "Отправить",
      chatYou: "Вы", chatPeer: "Собеседник", chatNeedCall: "Сначала установите звонок"
    },
    ua: {
      title: "Відеодзвінок v4",
      subtitle: "Відкрийте сторінку → скопіюйте посилання або ID → другий відкриває і дзвонить",
      yourId: "Ваш ID:", link: "Посилання:", copyId: "Копіювати ID", copyLink: "Копіювати посилання",
      remotePlaceholder: "ID співрозмовника", call: "Зателефонувати", hangup: "Скинути",
      mic: "Мікрофон", micOff: "Мікрофон вимк", cam: "Камера", camOff: "Камера вимк",
      screen: "Екран", screenStop: "Стоп екран", shotMe: "Скріншот (я)", shotThem: "Скріншот (він)",
      you: "Ви", screenLabel: "Екран", peer: "Співрозмовник", lang: "Мова",
      hint: "Камера і мікрофон. «Екран» — демонстрація. Fullscreen — ⛶. Скріншоти PNG. Країна за IP. Чат — після дзвінка.",
      init: "Ініціалізація…", connecting: "підключення…", ready: "Готово. Скопіюйте посилання або ID.",
      idFromLink: "ID з посилання підставлено. Натисніть «Зателефонувати».",
      callEnded: "Дзвінок завершено.", connectingCall: "З'єднання…", connected: "Зв'язок встановлено",
      incoming: "Вхідний дзвінок…", noMedia: "Немає доступу до камери/мікрофона: ",
      enterId: "Введіть ID", noStream: "Немає медіапотоку", selfCall: "Не можна дзвонити собі",
      callFail: "Не вдалося почати дзвінок", callErr: "Помилка дзвінка: ", peerErr: "Помилка PeerJS: ",
      disconnected: "Відключено. Оновіть сторінку.",
      idCopied: "ID скопійовано", linkCopied: "Посилання скопійовано", backCam: "Знову камера",
      screenOn: "Екран увімкнено", screenOff: "Екран вимкнено", screenFail: "Помилка екрана: ",
      noFrame: "Немає кадру", shotFail: "Скріншот не створено", shotOk: "Скріншот збережено", fsErr: "Fullscreen: ",
      myCountry: "Ви:", peerCountry: "Співрозмовник:", countryUnknown: "країна невідома", countryLoading: "визначення країни…",
      remoteVideoOn: "Відео ввімк", remoteVideoOff: "Відео вимк",
      chat: "Чат", chatPlaceholder: "Повідомлення…", send: "Надіслати",
      chatYou: "Ви", chatPeer: "Співрозмовник", chatNeedCall: "Спочатку встановіть дзвінок"
    },
    en: {
      title: "Video call v4",
      subtitle: "Open the page → copy the link or ID → the other person opens the link and calls",
      yourId: "Your ID:", link: "Link:", copyId: "Copy ID", copyLink: "Copy link",
      remotePlaceholder: "Peer ID", call: "Call", hangup: "Hang up",
      mic: "Mic", micOff: "Mic off", cam: "Camera", camOff: "Camera off",
      screen: "Screen", screenStop: "Stop screen", shotMe: "Screenshot (me)", shotThem: "Screenshot (them)",
      you: "You", screenLabel: "Screen", peer: "Peer", lang: "Language",
      hint: "Allow camera & mic. Screen shares display. Fullscreen — ⛶. Screenshots PNG. Country via IP. Chat after call connects.",
      init: "Starting…", connecting: "connecting…", ready: "Ready. Copy the link or ID.",
      idFromLink: "ID from link filled in. Press Call.",
      callEnded: "Call ended.", connectingCall: "Connecting…", connected: "Connected",
      incoming: "Incoming call…", noMedia: "No camera/mic access: ",
      enterId: "Enter peer ID", noStream: "No local stream", selfCall: "Cannot call yourself",
      callFail: "Could not start call", callErr: "Call error: ", peerErr: "PeerJS error: ",
      disconnected: "Disconnected. Reload the page.",
      idCopied: "ID copied", linkCopied: "Link copied", backCam: "Back to camera",
      screenOn: "Screen sharing on", screenOff: "Screen sharing stopped", screenFail: "Screen error: ",
      noFrame: "No frame", shotFail: "Screenshot failed", shotOk: "Screenshot saved", fsErr: "Fullscreen: ",
      myCountry: "You:", peerCountry: "Peer:", countryUnknown: "country unknown", countryLoading: "detecting country…",
      remoteVideoOn: "Video on", remoteVideoOff: "Video off",
      chat: "Chat", chatPlaceholder: "Message…", send: "Send",
      chatYou: "You", chatPeer: "Peer", chatNeedCall: "Connect a call first"
    },
    de: {
      title: "Videoanruf",
      subtitle: "Seite öffnen → Link/ID kopieren → die andere Person öffnet den Link und ruft an",
      yourId: "Ihre ID:", link: "Link:", copyId: "ID kopieren", copyLink: "Link kopieren",
      remotePlaceholder: "Peer-ID", call: "Anrufen", hangup: "Auflegen",
      mic: "Mikrofon", micOff: "Mikrofon aus", cam: "Kamera", camOff: "Kamera aus",
      screen: "Bildschirm", screenStop: "Bildschirm stop", shotMe: "Screenshot (ich)", shotThem: "Screenshot (Partner)",
      you: "Sie", screenLabel: "Bildschirm", peer: "Partner", lang: "Sprache",
      hint: "Kamera & Mikrofon. Bildschirm teilen. Fullscreen — ⛶. Screenshots PNG. Land per IP. Chat nach Verbindung.",
      init: "Start…", connecting: "verbinde…", ready: "Bereit. Link oder ID kopieren.",
      idFromLink: "ID aus dem Link. Auf Anrufen tippen.",
      callEnded: "Anruf beendet.", connectingCall: "Verbindung…", connected: "Verbunden",
      incoming: "Eingehender Anruf…", noMedia: "Kein Kamera-/Mikrofonzugriff: ",
      enterId: "Peer-ID eingeben", noStream: "Kein Stream", selfCall: "Nicht sich selbst anrufen",
      callFail: "Anruf fehlgeschlagen", callErr: "Fehler: ", peerErr: "PeerJS: ",
      disconnected: "Getrennt. Seite neu laden.",
      idCopied: "ID kopiert", linkCopied: "Link kopiert", backCam: "Zurück zur Kamera",
      screenOn: "Bildschirm an", screenOff: "Bildschirm aus", screenFail: "Bildschirm-Fehler: ",
      noFrame: "Kein Bild", shotFail: "Screenshot fehlgeschlagen", shotOk: "Screenshot gespeichert", fsErr: "Fullscreen: ",
      myCountry: "Sie:", peerCountry: "Partner:", countryUnknown: "Land unbekannt", countryLoading: "Land wird ermittelt…",
      remoteVideoOn: "Video an", remoteVideoOff: "Video aus",
      chat: "Chat", chatPlaceholder: "Nachricht…", send: "Senden",
      chatYou: "Sie", chatPeer: "Partner", chatNeedCall: "Zuerst anrufen"
    },
    el: {
      title: "Βιντεοκλήση",
      subtitle: "Ανοίξτε τη σελίδα → αντιγράψτε σύνδεσμο/ID → ο άλλος ανοίγει και καλεί",
      yourId: "Το ID σας:", link: "Σύνδεσμος:", copyId: "Αντιγραφή ID", copyLink: "Αντιγραφή συνδέσμου",
      remotePlaceholder: "ID συνομιλητή", call: "Κλήση", hangup: "Τερματισμός",
      mic: "Μικρόφωνο", micOff: "Μικρ. off", cam: "Κάμερα", camOff: "Κάμερα off",
      screen: "Οθόνη", screenStop: "Διακοπή", shotMe: "Στιγμιότυπο (εγώ)", shotThem: "Στιγμιότυπο (άλλος)",
      you: "Εσείς", screenLabel: "Οθόνη", peer: "Συνομιλητής", lang: "Γλώσσα",
      hint: "Κάμερα & μικρόφωνο. Οθόνη. Fullscreen — ⛶. Στιγμιότυπα PNG. Χώρα μέσω IP. Συνομιλία μετά την κλήση.",
      init: "Εκκίνηση…", connecting: "σύνδεση…", ready: "Έτοιμο. Αντιγράψτε σύνδεσμο ή ID.",
      idFromLink: "ID από σύνδεσμο. Πατήστε Κλήση.",
      callEnded: "Η κλήση έληξε.", connectingCall: "Σύνδεση…", connected: "Συνδέθηκε",
      incoming: "Εισερχόμενη κλήση…", noMedia: "Χωρίς πρόσβαση: ",
      enterId: "Εισαγάγετε ID", noStream: "Χωρίς ροή", selfCall: "Όχι στον εαυτό σας",
      callFail: "Αποτυχία κλήσης", callErr: "Σφάλμα: ", peerErr: "PeerJS: ",
      disconnected: "Αποσύνδεση. Ανανεώστε.",
      idCopied: "ID αντιγράφηκε", linkCopied: "Σύνδεσμος αντιγράφηκε", backCam: "Πίσω στην κάμερα",
      screenOn: "Οθόνη ενεργή", screenOff: "Οθόνη σταμάτησε", screenFail: "Σφάλμα οθόνης: ",
      noFrame: "Χωρίς καρέ", shotFail: "Αποτυχία", shotOk: "Αποθηκεύτηκε", fsErr: "Fullscreen: ",
      myCountry: "Εσείς:", peerCountry: "Συνομιλητής:", countryUnknown: "άγνωστη χώρα", countryLoading: "εντοπισμός…",
      remoteVideoOn: "Βίντεο on", remoteVideoOff: "Βίντεο off",
      chat: "Συνομιλία", chatPlaceholder: "Μήνυμα…", send: "Αποστολή",
      chatYou: "Εσείς", chatPeer: "Συνομιλητής", chatNeedCall: "Πρώτα κάντε κλήση"
    },
    fr: {
      title: "Appel vidéo",
      subtitle: "Ouvrez la page → copiez le lien ou l’ID → l’autre ouvre le lien et appelle",
      yourId: "Votre ID :", link: "Lien :", copyId: "Copier l’ID", copyLink: "Copier le lien",
      remotePlaceholder: "ID du correspondant", call: "Appeler", hangup: "Raccrocher",
      mic: "Micro", micOff: "Micro off", cam: "Caméra", camOff: "Caméra off",
      screen: "Écran", screenStop: "Arrêter", shotMe: "Capture (moi)", shotThem: "Capture (lui)",
      you: "Vous", screenLabel: "Écran", peer: "Correspondant", lang: "Langue",
      hint: "Caméra et micro. Écran. Plein écran — ⛶. Captures PNG. Pays via IP. Chat après connexion.",
      init: "Démarrage…", connecting: "connexion…", ready: "Prêt. Copiez le lien ou l’ID.",
      idFromLink: "ID du lien prérempli. Appuyez sur Appeler.",
      callEnded: "Appel terminé.", connectingCall: "Connexion…", connected: "Connecté",
      incoming: "Appel entrant…", noMedia: "Pas d’accès caméra/micro : ",
      enterId: "Entrez l’ID", noStream: "Pas de flux", selfCall: "Pas s’appeler soi-même",
      callFail: "Échec de l’appel", callErr: "Erreur : ", peerErr: "PeerJS : ",
      disconnected: "Déconnecté. Rechargez.",
      idCopied: "ID copié", linkCopied: "Lien copié", backCam: "Retour caméra",
      screenOn: "Partage d’écran", screenOff: "Écran arrêté", screenFail: "Erreur écran : ",
      noFrame: "Pas d’image", shotFail: "Échec capture", shotOk: "Capture enregistrée", fsErr: "Plein écran : ",
      myCountry: "Vous :", peerCountry: "Correspondant :", countryUnknown: "pays inconnu", countryLoading: "détection…",
      remoteVideoOn: "Vidéo on", remoteVideoOff: "Vidéo off",
      chat: "Chat", chatPlaceholder: "Message…", send: "Envoyer",
      chatYou: "Vous", chatPeer: "Correspondant", chatNeedCall: "Connectez d’abord l’appel"
    }
  };

  const SUPPORTED = Object.keys(I18N);
  const $ = (id) => document.getElementById(id);

  let lang = "en", t = I18N.en;
  let peer, cameraStream, localStream, currentCall, dataConn;
  let audioEnabled = true, videoEnabled = true, isScreenSharing = false;
  let remoteVideoVisible = true;
  let myGeo = null, peerGeo = null;

  const el = {
    status: $("status"), myId: $("myId"), roomLink: $("roomLink"), remoteId: $("remoteId"),
    callBtn: $("callBtn"), hangupBtn: $("hangupBtn"), copyIdBtn: $("copyIdBtn"), copyLinkBtn: $("copyLinkBtn"),
    muteBtn: $("muteBtn"), camBtn: $("camBtn"), screenBtn: $("screenBtn"),
    shotLocalBtn: $("shotLocalBtn"), shotRemoteBtn: $("shotRemoteBtn"),
    remoteVideoBtn: $("remoteVideoBtn"),
    localVideo: $("localVideo"), remoteVideo: $("remoteVideo"),
    localLabel: $("localLabel"), remoteLabel: $("remoteLabel"),
    langSelect: $("langSelect"), myGeo: $("myGeo"), peerGeo: $("peerGeo"),
    chatLog: $("chatLog"), chatInput: $("chatInput"), chatSendBtn: $("chatSendBtn")
  };

  function setStatus(text, type) {
    el.status.textContent = text;
    el.status.className = "status" + (type ? " " + type : "");
  }

  function updateRoomLink(id) {
    el.roomLink.textContent = location.origin + location.pathname + "?call=" + encodeURIComponent(id);
  }

  function flagEmoji(code) {
    if (!code || code.length !== 2) return "";
    return [...code.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");
  }

  function formatGeo(g) {
    if (!g) return t.countryUnknown;
    const parts = [flagEmoji(g.country_code), g.country_name || g.country, g.city].filter(Boolean);
    return parts.join(" ") || t.countryUnknown;
  }

  function renderGeo() {
    if (el.myGeo) {
      el.myGeo.innerHTML = "<strong>" + t.myCountry + "</strong> " + (myGeo ? formatGeo(myGeo) : t.countryLoading);
    }
    if (el.peerGeo) {
      el.peerGeo.innerHTML = peerGeo ? "<strong>" + t.peerCountry + "</strong> " + formatGeo(peerGeo) : "";
    }
  }

  async function detectCountry() {
    const urls = ["https://ipapi.co/json/", "https://ipwho.is/"];
    for (const url of urls) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const d = await res.json();
        if (d.error || d.success === false) continue;
        return {
          country_code: (d.country_code || d.country || "").toString().slice(0, 2),
          country_name: d.country_name || d.country || "",
          city: d.city || "",
          ip: d.ip || ""
        };
      } catch (_) { /* next */ }
    }
    return null;
  }

  function detectLang() {
    const saved = localStorage.getItem("vc_lang");
    if (saved && SUPPORTED.includes(saved)) return saved;
    for (const p of navigator.languages || [navigator.language || "en"]) {
      const c = (p || "").toLowerCase().split("-")[0];
      if (c === "uk") return "ua";
      if (c === "gr") return "el";
      if (SUPPORTED.includes(c)) return c;
    }
    return "en";
  }

  function applyI18n() {
    t = I18N[lang] || I18N.en;
    document.documentElement.lang = lang === "ua" ? "uk" : lang;
    document.title = t.title + " · WebRTC";
    const set = (id, val) => { const n = $(id); if (n) n.textContent = val; };
    set("tTitle", t.title);
    set("tSubtitle", t.subtitle);
    set("tYourId", t.yourId);
    set("tLink", t.link);
    set("langLabel", t.lang);
    set("tChat", t.chat);
    set("tHint", t.hint);
    if (el.copyIdBtn) el.copyIdBtn.textContent = t.copyId;
    if (el.copyLinkBtn) el.copyLinkBtn.textContent = t.copyLink;
    if (el.remoteId) el.remoteId.placeholder = t.remotePlaceholder;
    if (el.callBtn) el.callBtn.textContent = t.call;
    if (el.hangupBtn) el.hangupBtn.textContent = t.hangup;
    if (el.muteBtn) el.muteBtn.textContent = audioEnabled ? t.mic : t.micOff;
    if (el.camBtn) el.camBtn.textContent = videoEnabled ? t.cam : t.camOff;
    if (el.screenBtn) el.screenBtn.textContent = isScreenSharing ? t.screenStop : t.screen;
    if (el.shotLocalBtn) el.shotLocalBtn.textContent = t.shotMe;
    if (el.shotRemoteBtn) el.shotRemoteBtn.textContent = t.shotThem;
    if (el.remoteVideoBtn) {
      el.remoteVideoBtn.textContent = remoteVideoVisible ? t.remoteVideoOn : t.remoteVideoOff;
    }
    if (el.localLabel) el.localLabel.textContent = isScreenSharing ? t.screenLabel : t.you;
    if (el.remoteLabel) {
      el.remoteLabel.textContent = peerGeo ? t.peer + " · " + formatGeo(peerGeo) : t.peer;
    }
    if (el.chatInput) el.chatInput.placeholder = t.chatPlaceholder;
    if (el.chatSendBtn) el.chatSendBtn.textContent = t.send;
    if (el.langSelect) el.langSelect.value = lang;
    renderGeo();
  }

  async function initCamera() {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });
      localStream = cameraStream;
      el.localVideo.srcObject = localStream;
      el.muteBtn.disabled = el.camBtn.disabled = el.screenBtn.disabled = el.shotLocalBtn.disabled = false;
      return true;
    } catch (err) {
      setStatus(t.noMedia + err.message, "err");
      return false;
    }
  }

  function replaceTrackInCall(track) {
    if (!currentCall?.peerConnection || !track) return;
    const sender = currentCall.peerConnection.getSenders().find((s) => s.track?.kind === "video");
    if (sender) sender.replaceTrack(track).catch(console.warn);
  }

  function setChatEnabled(on) {
    if (el.chatInput) el.chatInput.disabled = !on;
    if (el.chatSendBtn) el.chatSendBtn.disabled = !on;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function appendChat(text, fromMe) {
    if (!el.chatLog || !text) return;
    const div = document.createElement("div");
    div.className = "chat-msg " + (fromMe ? "me" : "peer");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    div.innerHTML =
      '<span class="who">' + (fromMe ? t.chatYou : t.chatPeer) + "</span>" +
      escapeHtml(text) +
      '<span class="time">' + time + "</span>";
    el.chatLog.appendChild(div);
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
  }

  function sendChat() {
    const text = (el.chatInput?.value || "").trim();
    if (!text) return;
    if (!dataConn?.open) {
      setStatus(t.chatNeedCall, "err");
      return;
    }
    dataConn.send({ type: "chat", text: text.slice(0, 500) });
    appendChat(text, true);
    el.chatInput.value = "";
    el.chatInput.focus();
  }

  function setupDataConn(conn) {
    dataConn = conn;
    conn.on("open", () => {
      setChatEnabled(true);
      if (myGeo) conn.send({ type: "geo", geo: myGeo });
    });
    conn.on("data", (msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "geo" && msg.geo) {
        peerGeo = msg.geo;
        renderGeo();
        if (el.remoteLabel) el.remoteLabel.textContent = t.peer + " · " + formatGeo(peerGeo);
      }
      if (msg.type === "chat" && msg.text) {
        appendChat(String(msg.text).slice(0, 500), false);
      }
    });
    conn.on("close", () => {
      dataConn = null;
      setChatEnabled(false);
    });
  }

  function openDataTo(remoteId) {
    if (!peer || dataConn?.open) return;
    setupDataConn(peer.connect(remoteId, { reliable: true }));
  }

  function endCall() {
    try { currentCall?.close(); } catch (_) {}
    try { dataConn?.close(); } catch (_) {}
    currentCall = null;
    dataConn = null;
    el.remoteVideo.srcObject = null;
    el.shotRemoteBtn.disabled = true;
    if (el.remoteVideoBtn) {
      el.remoteVideoBtn.disabled = true;
      el.remoteVideoBtn.classList.remove("btn-active");
      el.remoteVideoBtn.textContent = t.remoteVideoOn;
    }
    remoteVideoVisible = true;
    el.remoteVideo.style.visibility = "visible";
    el.hangupBtn.hidden = true;
    el.callBtn.disabled = false;
    peerGeo = null;
    renderGeo();
    if (el.remoteLabel) el.remoteLabel.textContent = t.peer;
    setChatEnabled(false);
    if (el.chatLog) el.chatLog.innerHTML = "";
    setStatus(t.callEnded, "ok");
  }

  function attachCall(call) {
    currentCall = call;
    el.hangupBtn.hidden = false;
    el.callBtn.disabled = true;
    setStatus(t.connectingCall, "");
    openDataTo(call.peer);
    call.on("stream", (rs) => {
      el.remoteVideo.srcObject = rs;
      el.shotRemoteBtn.disabled = false;
      if (el.remoteVideoBtn) el.remoteVideoBtn.disabled = false;
      el.remoteVideo.style.visibility = remoteVideoVisible ? "visible" : "hidden";
      setStatus(t.connected, "ok");
    });
    call.on("close", endCall);
    call.on("error", (err) => {
      setStatus(t.callErr + err, "err");
      endCall();
    });
  }

  async function startPeer() {
    el.myId.textContent = t.connecting;
    setStatus(t.init, "");
    if (!(await initCamera())) return;

    peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      }
    });

    peer.on("open", (id) => {
      el.myId.textContent = id;
      updateRoomLink(id);
      el.callBtn.disabled = false;
      setStatus(t.ready, "ok");
      const join = new URLSearchParams(location.search).get("call");
      if (join && join !== id) {
        el.remoteId.value = join;
        setStatus(t.idFromLink, "ok");
      }
    });
    peer.on("call", (call) => {
      setStatus(t.incoming, "");
      call.answer(localStream);
      attachCall(call);
    });
    peer.on("connection", setupDataConn);
    peer.on("error", (err) => setStatus(t.peerErr + (err.type || err.message || err), "err"));
    peer.on("disconnected", () => setStatus(t.disconnected, "err"));
  }

  el.callBtn.addEventListener("click", () => {
    const remoteId = el.remoteId.value.trim();
    if (!remoteId) return setStatus(t.enterId, "err");
    if (!localStream) return setStatus(t.noStream, "err");
    if (remoteId === el.myId.textContent) return setStatus(t.selfCall, "err");
    const call = peer.call(remoteId, localStream);
    if (!call) return setStatus(t.callFail, "err");
    attachCall(call);
  });

  el.hangupBtn.addEventListener("click", endCall);

  async function copyText(text, ok) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(ok, "ok");
    } catch {
      setStatus(text, "");
    }
  }

  el.copyIdBtn.addEventListener("click", () => {
    const id = el.myId.textContent;
    if (id && id !== t.connecting && id !== "…") copyText(id, t.idCopied);
  });

  el.copyLinkBtn.addEventListener("click", () => {
    const link = el.roomLink.textContent;
    if (link && link !== "—") copyText(link, t.linkCopied);
  });

  el.muteBtn.addEventListener("click", () => {
    if (!localStream) return;
    audioEnabled = !audioEnabled;
    localStream.getAudioTracks().forEach((tr) => { tr.enabled = audioEnabled; });
    cameraStream?.getAudioTracks().forEach((tr) => { tr.enabled = audioEnabled; });
    el.muteBtn.textContent = audioEnabled ? t.mic : t.micOff;
  });

  el.camBtn.addEventListener("click", () => {
    if (!localStream) return;
    videoEnabled = !videoEnabled;
    localStream.getVideoTracks().forEach((tr) => { tr.enabled = videoEnabled; });
    el.camBtn.textContent = videoEnabled ? t.cam : t.camOff;
  });

  el.screenBtn.addEventListener("click", async () => {
    if (isScreenSharing) {
      localStream.getVideoTracks().forEach((tr) => {
        if (tr !== cameraStream?.getVideoTracks()[0]) tr.stop();
      });
      localStream = cameraStream;
      el.localVideo.srcObject = localStream;
      el.localLabel.textContent = t.you;
      isScreenSharing = false;
      el.screenBtn.textContent = t.screen;
      el.screenBtn.classList.remove("btn-active");
      const camTrack = cameraStream?.getVideoTracks()[0];
      if (camTrack) {
        camTrack.enabled = videoEnabled;
        replaceTrackInCall(camTrack);
      }
      setStatus(t.backCam, "ok");
      return;
    }
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });
      const screenTrack = ss.getVideoTracks()[0];
      localStream = new MediaStream([screenTrack, ...(cameraStream?.getAudioTracks() || [])]);
      el.localVideo.srcObject = localStream;
      el.localLabel.textContent = t.screenLabel;
      isScreenSharing = true;
      el.screenBtn.textContent = t.screenStop;
      el.screenBtn.classList.add("btn-active");
      replaceTrackInCall(screenTrack);
      screenTrack.onended = () => {
        if (!isScreenSharing) return;
        localStream = cameraStream;
        el.localVideo.srcObject = localStream;
        el.localLabel.textContent = t.you;
        isScreenSharing = false;
        el.screenBtn.textContent = t.screen;
        el.screenBtn.classList.remove("btn-active");
        const camTrack = cameraStream?.getVideoTracks()[0];
        if (camTrack) replaceTrackInCall(camTrack);
        setStatus(t.screenOff, "ok");
      };
      setStatus(t.screenOn, "ok");
    } catch (err) {
      if (err.name !== "NotAllowedError") setStatus(t.screenFail + err.message, "err");
    }
  });

  function takeScreenshot(videoEl, prefix) {
    if (!videoEl?.videoWidth) return setStatus(t.noFrame, "err");
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    canvas.getContext("2d").drawImage(videoEl, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return setStatus(t.shotFail, "err");
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: prefix + "-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".png"
      });
      a.click();
      URL.revokeObjectURL(url);
      setStatus(t.shotOk, "ok");
    }, "image/png");
  }

  el.shotLocalBtn.addEventListener("click", () => takeScreenshot(el.localVideo, "local"));
  el.shotRemoteBtn.addEventListener("click", () => takeScreenshot(el.remoteVideo, "remote"));

  el.remoteVideoBtn?.addEventListener("click", () => {
    if (!el.remoteVideo.srcObject) return;
    remoteVideoVisible = !remoteVideoVisible;
    el.remoteVideo.style.visibility = remoteVideoVisible ? "visible" : "hidden";
    el.remoteVideo.srcObject.getVideoTracks().forEach((tr) => {
      tr.enabled = remoteVideoVisible;
    });
    el.remoteVideoBtn.textContent = remoteVideoVisible ? t.remoteVideoOn : t.remoteVideoOff;
    el.remoteVideoBtn.classList.toggle("btn-active", !remoteVideoVisible);
  });

  el.chatSendBtn?.addEventListener("click", sendChat);
  el.chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  document.querySelectorAll("[data-fs]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrap = $(btn.getAttribute("data-fs"));
      if (!wrap) return;
      if (document.fullscreenElement === wrap) document.exitFullscreen().catch(() => {});
      else if (wrap.requestFullscreen) wrap.requestFullscreen().catch((e) => setStatus(t.fsErr + e.message, "err"));
      else wrap.webkitRequestFullscreen?.();
    });
  });

  el.langSelect?.addEventListener("change", () => {
    lang = el.langSelect.value;
    localStorage.setItem("vc_lang", lang);
    applyI18n();
  });

  async function boot() {
    lang = detectLang();
    applyI18n();
    myGeo = await detectCountry();
    renderGeo();
    if (dataConn?.open && myGeo) dataConn.send({ type: "geo", geo: myGeo });
    startPeer();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
