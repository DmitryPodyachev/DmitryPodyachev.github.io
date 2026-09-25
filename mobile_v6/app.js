(() => {
  "use strict";

  const SUPPORTED = Object.keys(I18N);
  const $ = (id) => document.getElementById(id);
  const CONTACTS_KEY = "vc_contacts";

  let lang = "en", t = I18N.en;
  let peer, cameraStream, localStream, currentCall, dataConn;
  let audioEnabled = true, videoEnabled = true, isScreenSharing = false;
  let remoteVideoVisible = true;
  let qualityLevel = localStorage.getItem("vc_quality") || "medium";
  if (!QUALITY[qualityLevel]) qualityLevel = "medium";
  let blurEnabled = false, blurCanvas, blurCtx, blurRAF, blurTrack;
  let myGeo = null, peerGeo = null;

  const el = {
    status: $("status"), myId: $("myId"), roomLink: $("roomLink"), remoteId: $("remoteId"),
    callBtn: $("callBtn"), hangupBtn: $("hangupBtn"), copyIdBtn: $("copyIdBtn"), copyLinkBtn: $("copyLinkBtn"),
    muteBtn: $("muteBtn"), camBtn: $("camBtn"), screenBtn: $("screenBtn"),
    shotLocalBtn: $("shotLocalBtn"), shotRemoteBtn: $("shotRemoteBtn"),
    remoteVideoBtn: $("remoteVideoBtn"), qualitySelect: $("qualitySelect"), blurBtn: $("blurBtn"),
    localVideo: $("localVideo"), remoteVideo: $("remoteVideo"),
    localLabel: $("localLabel"), remoteLabel: $("remoteLabel"),
    langSelect: $("langSelect"), myGeo: $("myGeo"), peerGeo: $("peerGeo"),
    chatLog: $("chatLog"), chatInput: $("chatInput"), chatSendBtn: $("chatSendBtn"),
    contactName: $("contactName"), contactPeerId: $("contactPeerId"),
    contactAddBtn: $("contactAddBtn"), contactList: $("contactList"), stage: $("stage")
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
    return [flagEmoji(g.country_code), g.country_name || g.country, g.city].filter(Boolean).join(" ") || t.countryUnknown;
  }
  function renderGeo() {
    if (el.myGeo) el.myGeo.innerHTML = "<strong>" + t.myCountry + "</strong> " + (myGeo ? formatGeo(myGeo) : t.countryLoading);
    if (el.peerGeo) el.peerGeo.innerHTML = peerGeo ? "<strong>" + t.peerCountry + "</strong> " + formatGeo(peerGeo) : "";
  }
  async function detectCountry() {
    for (const url of ["https://ipapi.co/json/", "https://ipwho.is/"]) {
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
          city: d.city || "", ip: d.ip || ""
        };
      } catch (_) {}
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
    set("tTitle", t.title); set("tSubtitle", t.subtitle); set("tYourId", t.yourId);
    set("tLink", t.link); set("langLabel", t.lang); set("tChat", t.chat); set("tHint", t.hint);
    set("tQuality", t.quality); set("tContacts", t.contacts);
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
    if (el.remoteVideoBtn) el.remoteVideoBtn.textContent = remoteVideoVisible ? t.remoteVideoOn : t.remoteVideoOff;
    if (el.blurBtn) el.blurBtn.textContent = blurEnabled ? t.blurOn : t.blurOff;
    if (el.localLabel) el.localLabel.textContent = isScreenSharing ? t.screenLabel : t.you;
    if (el.remoteLabel) el.remoteLabel.textContent = peerGeo ? t.peer + " · " + formatGeo(peerGeo) : t.peer;
    if (el.chatInput) el.chatInput.placeholder = t.chatPlaceholder;
    if (el.chatSendBtn) el.chatSendBtn.textContent = t.send;
    if (el.contactName) el.contactName.placeholder = t.contactName;
    if (el.contactPeerId) el.contactPeerId.placeholder = t.contactId;
    if (el.langSelect) el.langSelect.value = lang;
    if (el.qualitySelect) {
      el.qualitySelect.value = qualityLevel;
      const o = el.qualitySelect.options;
      if (o[0]) o[0].text = t.qHigh;
      if (o[1]) o[1].text = t.qMedium;
      if (o[2]) o[2].text = t.qLow;
    }
    renderGeo();
    renderContacts();
  }
  function getQuality() { return QUALITY[qualityLevel] || QUALITY.medium; }
  async function applyCameraConstraints() {
    const q = getQuality();
    const track = cameraStream && cameraStream.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        width: { ideal: q.w }, height: { ideal: q.h },
        frameRate: { ideal: q.fps, max: q.fps }
      });
    } catch (e) { console.warn(e); }
  }
  async function applySenderBitrate() {
    if (!currentCall || !currentCall.peerConnection) return;
    const q = getQuality();
    const sender = currentCall.peerConnection.getSenders().find((s) => s.track && s.track.kind === "video");
    if (!sender) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || !params.encodings.length) params.encodings = [{}];
      params.encodings[0].maxBitrate = q.bitrate;
      params.encodings[0].maxFramerate = q.fps;
      await sender.setParameters(params);
    } catch (e) { console.warn(e); }
  }
  async function setQuality(level) {
    if (!QUALITY[level]) return;
    qualityLevel = level;
    localStorage.setItem("vc_quality", level);
    if (!isScreenSharing) {
      await applyCameraConstraints();
      if (blurEnabled) {
        stopBlur();
        localStream = startBlurFrom(cameraStream);
        el.localVideo.srcObject = localStream;
        const vt = localStream.getVideoTracks()[0];
        if (vt) { vt.enabled = videoEnabled; replaceTrackInCall(vt); }
      }
    }
    await applySenderBitrate();
    setStatus(t.qualityApplied + t[QUALITY[level].labelKey], "ok");
  }
  function stopBlur() {
    if (blurRAF) cancelAnimationFrame(blurRAF);
    blurRAF = null;
    if (blurTrack) { try { blurTrack.stop(); } catch (_) {} blurTrack = null; }
    blurCanvas = null; blurCtx = null;
  }
  function startBlurFrom(sourceStream) {
    stopBlur();
    const vTrack = sourceStream.getVideoTracks()[0];
    if (!vTrack) return sourceStream;
    const video = document.createElement("video");
    video.playsInline = true; video.muted = true;
    video.srcObject = new MediaStream([vTrack]);
    video.play().catch(function () {});
    const q = getQuality();
    blurCanvas = document.createElement("canvas");
    blurCanvas.width = q.w; blurCanvas.height = q.h;
    blurCtx = blurCanvas.getContext("2d", { alpha: false });
    const draw = function () {
      if (!blurEnabled || !blurCtx) return;
      try {
        if (video.videoWidth) {
          blurCanvas.width = video.videoWidth;
          blurCanvas.height = video.videoHeight;
          blurCtx.filter = "blur(12px)";
          blurCtx.drawImage(video, 0, 0, blurCanvas.width, blurCanvas.height);
          blurCtx.filter = "none";
        }
      } catch (_) {}
      blurRAF = requestAnimationFrame(draw);
    };
    draw();
    const out = blurCanvas.captureStream(Math.min(q.fps, 30));
    blurTrack = out.getVideoTracks()[0];
    return new MediaStream([blurTrack].concat(sourceStream.getAudioTracks()));
  }
  async function setBlur(on) {
    if (isScreenSharing) return;
    blurEnabled = on;
    if (el.blurBtn) {
      el.blurBtn.textContent = blurEnabled ? t.blurOn : t.blurOff;
      el.blurBtn.classList.toggle("btn-active", blurEnabled);
    }
    if (!cameraStream) return;
    if (blurEnabled) localStream = startBlurFrom(cameraStream);
    else { stopBlur(); localStream = cameraStream; }
    el.localVideo.srcObject = localStream;
    const vt = localStream.getVideoTracks()[0];
    if (vt) { vt.enabled = videoEnabled; replaceTrackInCall(vt); }
  }
  async function initCamera() {
    try {
      const q = getQuality();
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: q.w }, height: { ideal: q.h }, frameRate: { ideal: q.fps, max: q.fps } },
        audio: true
      });
      localStream = blurEnabled ? startBlurFrom(cameraStream) : cameraStream;
      el.localVideo.srcObject = localStream;
      el.muteBtn.disabled = el.camBtn.disabled = el.screenBtn.disabled = el.shotLocalBtn.disabled = false;
      if (el.blurBtn) el.blurBtn.disabled = false;
      if (el.qualitySelect) el.qualitySelect.disabled = false;
      return true;
    } catch (err) {
      setStatus(t.noMedia + err.message, "err");
      return false;
    }
  }
  function replaceTrackInCall(track) {
    if (!currentCall || !currentCall.peerConnection || !track) return;
    const sender = currentCall.peerConnection.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender) sender.replaceTrack(track).catch(console.warn);
  }
  function setChatEnabled(on) {
    if (el.chatInput) el.chatInput.disabled = !on;
    if (el.chatSendBtn) el.chatSendBtn.disabled = !on;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  } // /"
  function appendChat(text, fromMe) {
    if (!el.chatLog || !text) return;
    const div = document.createElement("div");
    div.className = "chat-msg " + (fromMe ? "me" : "peer");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    div.innerHTML = '<span class="who">' + (fromMe ? t.chatYou : t.chatPeer) + "</span>" + escapeHtml(text) + '<span class="time">' + time + "</span>";
    el.chatLog.appendChild(div);
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
  }
  function sendChat() {
    const text = ((el.chatInput && el.chatInput.value) || "").trim();
    if (!text) return;
    if (!dataConn || !dataConn.open) return setStatus(t.chatNeedCall, "err");
    dataConn.send({ type: "chat", text: text.slice(0, 500) });
    appendChat(text, true);
    el.chatInput.value = "";
    el.chatInput.focus();
  }
  function setupDataConn(conn) {
    dataConn = conn;
    conn.on("open", function () {
      setChatEnabled(true);
      if (myGeo) conn.send({ type: "geo", geo: myGeo });
    });
    conn.on("data", function (msg) {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "geo" && msg.geo) {
        peerGeo = msg.geo; renderGeo();
        if (el.remoteLabel) el.remoteLabel.textContent = t.peer + " · " + formatGeo(peerGeo);
      }
      if (msg.type === "chat" && msg.text) appendChat(String(msg.text).slice(0, 500), false);
    });
    conn.on("close", function () { dataConn = null; setChatEnabled(false); });
  }
  function openDataTo(remoteId) {
    if (!peer || (dataConn && dataConn.open)) return;
    setupDataConn(peer.connect(remoteId, { reliable: true }));
  }
  function endCall() {
    try { if (currentCall) currentCall.close(); } catch (_) {}
    try { if (dataConn) dataConn.close(); } catch (_) {}
    currentCall = null; dataConn = null;
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
    peerGeo = null; renderGeo();
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

    call.on("stream", function (rs) {
      el.remoteVideo.srcObject = rs;
      el.shotRemoteBtn.disabled = false;
      if (el.remoteVideoBtn) el.remoteVideoBtn.disabled = false;
      el.remoteVideo.style.visibility = remoteVideoVisible ? "visible" : "hidden";
      setStatus(t.connected, "ok");
      applySenderBitrate();
      offerSavePeer(call.peer);   // ← сохранить контакт
    });
    call.on("close", endCall);
    call.on("error", function (err) { setStatus(t.callErr + err, "err"); endCall(); });
  }
  async function startPeer() {
    el.myId.textContent = t.connecting;
    setStatus(t.init, "");
    if (!(await initCamera())) return;
    peer = new Peer({
      debug: 1,
      config: { iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ] }
    });
    peer.on("open", function (id) {
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
    peer.on("call", function (call) {
      setStatus(t.incoming, "");
      call.answer(localStream);
      attachCall(call);
    });
    peer.on("connection", setupDataConn);
    peer.on("error", function (err) { setStatus(t.peerErr + (err.type || err.message || err), "err"); });
    peer.on("disconnected", function () { setStatus(t.disconnected, "err"); });
  }

  function loadContacts() {
    try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || "[]"); } catch (_) { return []; }
  }
  function saveContacts(list) { localStorage.setItem(CONTACTS_KEY, JSON.stringify(list)); }
  function renderContacts() {
    if (!el.contactList) return;
    el.contactList.innerHTML = "";
    loadContacts().forEach(function (c, i) {
      const li = document.createElement("li");
      const name = document.createElement("span"); name.className = "name"; name.textContent = c.name;
      const pid = document.createElement("span"); pid.className = "pid"; pid.textContent = c.peerId;
      const callB = document.createElement("button"); callB.type = "button"; callB.className = "btn btn-primary"; callB.textContent = "\u260E";
      callB.addEventListener("click", function () {
        if (el.remoteId) el.remoteId.value = c.peerId;
        if (el.callBtn && !el.callBtn.disabled) el.callBtn.click();
      });
      const delB = document.createElement("button"); delB.type = "button"; delB.className = "btn btn-secondary"; delB.textContent = "\u00D7";
      delB.addEventListener("click", function () {
        saveContacts(loadContacts().filter(function (_, j) { return j !== i; }));
        renderContacts();
      });
      li.appendChild(name); li.appendChild(pid); li.appendChild(callB); li.appendChild(delB);
      el.contactList.appendChild(li);
    });
  }
  function offerSavePeer(peerId) {
    if (!peerId) return;
    if (loadContacts().some(function (c) { return c.peerId === peerId; })) return;
    var name = window.prompt((t.peer || "Peer") + " — " + (t.contactName || "name") + "?", peerId.slice(0, 8));
    if (!name || !name.trim()) return;
    var list = loadContacts();
    list.push({ name: name.trim(), peerId: peerId });
    saveContacts(list);
    renderContacts();
    setStatus(t.contactSaved || "OK", "ok");
  }
  if (el.contactAddBtn) {
    el.contactAddBtn.addEventListener("click", function () {
      const name = ((el.contactName && el.contactName.value) || "").trim();
      const peerId = ((el.contactPeerId && el.contactPeerId.value) || "").trim();
      if (!name || !peerId) return;
      const list = loadContacts();
      if (list.some(function (c) { return c.peerId === peerId; })) return;
      list.push({ name: name, peerId: peerId });
      saveContacts(list);
      if (el.contactName) el.contactName.value = "";
      if (el.contactPeerId) el.contactPeerId.value = "";
      renderContacts();
      setStatus(t.contactSaved, "ok");
    });
  }

  function showChatPanel(on) { if (el.stage) el.stage.classList.toggle("show-chat", !!on); }

  var toChat = $("stageToChat");
  var toVideo = $("stageToVideo");
  if (toChat) toChat.addEventListener("click", function () { showChatPanel(true); });
  if (toVideo) toVideo.addEventListener("click", function () { showChatPanel(false); });

  (function () {
    if (!el.stage) return;
    var x0 = 0, y0 = 0;
    el.stage.addEventListener("touchstart", function (e) {
      x0 = e.changedTouches[0].clientX; y0 = e.changedTouches[0].clientY;
    }, { passive: true });
    el.stage.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) showChatPanel(true); else showChatPanel(false);
    }, { passive: true });
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") showChatPanel(true);
      if (e.key === "ArrowRight") showChatPanel(false);
    });
  })();

  el.callBtn.addEventListener("click", function () {
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
    try { await navigator.clipboard.writeText(text); setStatus(ok, "ok"); }
    catch (_) { setStatus(text, ""); }
  }
  el.copyIdBtn.addEventListener("click", function () {
    const id = el.myId.textContent;
    if (id && id !== t.connecting) copyText(id, t.idCopied);
  });
  el.copyLinkBtn.addEventListener("click", function () {
    const link = el.roomLink.textContent;
    if (link && link !== "—") copyText(link, t.linkCopied);
  });
  el.muteBtn.addEventListener("click", function () {
    if (!localStream) return;
    audioEnabled = !audioEnabled;
    localStream.getAudioTracks().forEach(function (tr) { tr.enabled = audioEnabled; });
    if (cameraStream) cameraStream.getAudioTracks().forEach(function (tr) { tr.enabled = audioEnabled; });
    el.muteBtn.textContent = audioEnabled ? t.mic : t.micOff;
  });
  el.camBtn.addEventListener("click", function () {
    if (!localStream) return;
    videoEnabled = !videoEnabled;
    localStream.getVideoTracks().forEach(function (tr) { tr.enabled = videoEnabled; });
    el.camBtn.textContent = videoEnabled ? t.cam : t.camOff;
  });
  el.screenBtn.addEventListener("click", async function () {
    if (isScreenSharing) {
      localStream.getVideoTracks().forEach(function (tr) {
        const cam = cameraStream && cameraStream.getVideoTracks()[0];
        if (tr !== cam && tr !== blurTrack) tr.stop();
      });
      isScreenSharing = false;
      el.screenBtn.textContent = t.screen;
      el.screenBtn.classList.remove("btn-active");
      if (el.blurBtn) el.blurBtn.disabled = false;
      localStream = blurEnabled ? startBlurFrom(cameraStream) : cameraStream;
      el.localVideo.srcObject = localStream;
      el.localLabel.textContent = t.you;
      const vt = localStream.getVideoTracks()[0];
      if (vt) { vt.enabled = videoEnabled; replaceTrackInCall(vt); }
      setStatus(t.backCam, "ok");
      return;
    }
    try {
      if (blurEnabled) {
        blurEnabled = false; stopBlur();
        if (el.blurBtn) { el.blurBtn.textContent = t.blurOff; el.blurBtn.classList.remove("btn-active"); }
      }
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
      const screenTrack = ss.getVideoTracks()[0];
      const audioTracks = cameraStream ? cameraStream.getAudioTracks() : [];
      localStream = new MediaStream([screenTrack].concat(audioTracks));
      el.localVideo.srcObject = localStream;
      el.localLabel.textContent = t.screenLabel;
      isScreenSharing = true;
      el.screenBtn.textContent = t.screenStop;
      el.screenBtn.classList.add("btn-active");
      if (el.blurBtn) el.blurBtn.disabled = true;
      replaceTrackInCall(screenTrack);
      screenTrack.onended = function () {
        if (!isScreenSharing) return;
        isScreenSharing = false;
        el.screenBtn.textContent = t.screen;
        el.screenBtn.classList.remove("btn-active");
        if (el.blurBtn) el.blurBtn.disabled = false;
        localStream = cameraStream;
        el.localVideo.srcObject = localStream;
        el.localLabel.textContent = t.you;
        const camTrack = cameraStream && cameraStream.getVideoTracks()[0];
        if (camTrack) replaceTrackInCall(camTrack);
        setStatus(t.screenOff, "ok");
      };
      setStatus(t.screenOn, "ok");
    } catch (err) {
      if (err.name !== "NotAllowedError") setStatus(t.screenFail + err.message, "err");
    }
  });
  function takeScreenshot(videoEl, prefix) {
    if (!videoEl || !videoEl.videoWidth) return setStatus(t.noFrame, "err");
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    canvas.getContext("2d").drawImage(videoEl, 0, 0);
    canvas.toBlob(function (blob) {
      if (!blob) return setStatus(t.shotFail, "err");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = prefix + "-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".png";
      a.click();
      URL.revokeObjectURL(url);
      setStatus(t.shotOk, "ok");
    }, "image/png");
  }
  el.shotLocalBtn.addEventListener("click", function () { takeScreenshot(el.localVideo, "local"); });
  el.shotRemoteBtn.addEventListener("click", function () { takeScreenshot(el.remoteVideo, "remote"); });
  if (el.remoteVideoBtn) {
    el.remoteVideoBtn.addEventListener("click", function () {
      if (!el.remoteVideo.srcObject) return;
      remoteVideoVisible = !remoteVideoVisible;
      el.remoteVideo.style.visibility = remoteVideoVisible ? "visible" : "hidden";
      el.remoteVideo.srcObject.getVideoTracks().forEach(function (tr) { tr.enabled = remoteVideoVisible; });
      el.remoteVideoBtn.textContent = remoteVideoVisible ? t.remoteVideoOn : t.remoteVideoOff;
      el.remoteVideoBtn.classList.toggle("btn-active", !remoteVideoVisible);
    });
  }
  if (el.qualitySelect) el.qualitySelect.addEventListener("change", function () { setQuality(el.qualitySelect.value); });
  if (el.blurBtn) el.blurBtn.addEventListener("click", function () { setBlur(!blurEnabled); });
  if (el.chatSendBtn) el.chatSendBtn.addEventListener("click", sendChat);
  if (el.chatInput) {
    el.chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
  }
  document.querySelectorAll("[data-fs]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const wrap = $(btn.getAttribute("data-fs"));
      if (!wrap) return;
      if (document.fullscreenElement === wrap) document.exitFullscreen().catch(function () {});
      else if (wrap.requestFullscreen) wrap.requestFullscreen().catch(function (e) { setStatus(t.fsErr + e.message, "err"); });
      else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
    });
  });
  if (el.langSelect) {
    el.langSelect.addEventListener("change", function () {
      lang = el.langSelect.value;
      localStorage.setItem("vc_lang", lang);
      applyI18n();
    });
  }
  async function boot() {
    lang = detectLang();
    applyI18n();
    if (el.qualitySelect) { el.qualitySelect.value = qualityLevel; el.qualitySelect.disabled = true; }
    if (el.blurBtn) el.blurBtn.disabled = true;
    myGeo = await detectCountry();
    renderGeo();
    startPeer();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
