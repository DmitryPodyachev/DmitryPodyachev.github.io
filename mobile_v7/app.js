(() => {
  "use strict";

  const SUPPORTED = Object.keys(I18N);
  const $ = (id) => document.getElementById(id);
  const CONTACTS_KEY = "vc_contacts";
  const CHUNK_SIZE = 16384;           // 16KB - safe for WebRTC Data Channel
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
  const CHUNK_DELAY_MS = 10;          // Throttle to avoid overwhelming

  let lang = "en", t = I18N.en;
  let peer, cameraStream, localStream, currentCall, dataConn;
  let audioEnabled = true, videoEnabled = true, isScreenSharing = false;
  let remoteVideoVisible = true;
  let qualityLevel = localStorage.getItem("vc_quality") || "medium";
  if (!QUALITY[qualityLevel]) qualityLevel = "medium";
  let blurEnabled = false, blurCanvas, blurCtx, blurRAF, blurTrack, blurVideoElement = null;
  let myGeo = null, peerGeo = null;
  let currentUpload = null;           // { fileId, name, total, sent }
  const incomingFiles = new Map();    // fileId -> { meta, chunks[], received }
  let ringtoneStop = null;            // Function to stop ringtone
  let pendingCall = null;             // Pending incoming call

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
    contactAddBtn: $("contactAddBtn"), contactList: $("contactList"), stage: $("stage"),
    fileInput: $("fileInput"), attachBtn: $("attachBtn"),
    fileProgress: $("fileProgress"), fileProgressName: $("fileProgressName"),
    fileProgressSize: $("fileProgressSize"), fileProgressBar: $("fileProgressBar"),
    fileProgressPercent: $("fileProgressPercent"), fileCancelBtn: $("fileCancelBtn"),
    incomingCall: $("incomingCall"), incomingTitle: $("incomingTitle"),
    incomingFrom: $("incomingFrom"), acceptCallBtn: $("acceptCallBtn"), rejectCallBtn: $("rejectCallBtn")
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
    if (el.attachBtn) el.attachBtn.title = t.attachFile;
    if (el.acceptCallBtn) el.acceptCallBtn.textContent = t.accept;
    if (el.rejectCallBtn) el.rejectCallBtn.textContent = t.reject;
    if (el.incomingTitle) el.incomingTitle.textContent = t.incomingCallTitle;
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
    if (blurVideoElement) {
      blurVideoElement.pause();
      blurVideoElement.srcObject = null;
      blurVideoElement = null;
    }
    blurCanvas = null; blurCtx = null;
  }
  function startBlurFrom(sourceStream) {
    stopBlur();
    const vTrack = sourceStream.getVideoTracks()[0];
    if (!vTrack) return sourceStream;
    blurVideoElement = document.createElement("video");
    blurVideoElement.playsInline = true;
    blurVideoElement.muted = true;
    blurVideoElement.srcObject = new MediaStream([vTrack]);
    blurVideoElement.play().catch(function () {});
    const q = getQuality();
    blurCanvas = document.createElement("canvas");
    blurCanvas.width = q.w; blurCanvas.height = q.h;
    blurCtx = blurCanvas.getContext("2d", { alpha: false });
    const draw = function () {
      if (!blurEnabled || !blurCtx || !blurVideoElement) return;
      try {
        if (blurVideoElement.videoWidth) {
          blurCanvas.width = blurVideoElement.videoWidth;
          blurCanvas.height = blurVideoElement.videoHeight;
          blurCtx.filter = "blur(12px)";
          blurCtx.drawImage(blurVideoElement, 0, 0, blurCanvas.width, blurCanvas.height);
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
    if (el.attachBtn) el.attachBtn.disabled = !on;
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
  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + " " + sizes[i];
  }
  function getFileIcon(filename) {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "🖼️";
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "🎥";
    if (["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) return "🎵";
    if (["pdf"].includes(ext)) return "📄";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "📦";
    if (["doc", "docx", "txt", "rtf", "odt"].includes(ext)) return "📝";
    if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "📊";
    return "📎";
  }
  function showFileProgress(name, size, isSending) {
    if (!el.fileProgress) return;
    el.fileProgress.hidden = false;
    el.fileProgressName.textContent = (isSending ? t.fileSending : t.fileReceiving) + ": " + name;
    el.fileProgressSize.textContent = formatBytes(size);
    el.fileProgressBar.value = 0;
    el.fileProgressPercent.textContent = "0%";
  }
  function updateFileProgress(current, total) {
    if (!el.fileProgressBar) return;
    const percent = Math.round((current / total) * 100);
    el.fileProgressBar.value = percent;
    el.fileProgressPercent.textContent = percent + "%";
  }
  function hideFileProgress() {
    if (el.fileProgress) el.fileProgress.hidden = true;
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
  function appendFileToChat(name, size, fromMe, blob = null) {
    if (!el.chatLog) return;
    const msg = document.createElement("div");
    msg.className = "chat-msg chat-" + (fromMe ? "me" : "peer");
    const card = document.createElement("div");
    card.className = "file-card";
    const icon = document.createElement("span");
    icon.className = "file-icon";
    icon.textContent = getFileIcon(name);
    const details = document.createElement("div");
    details.className = "file-details";
    const nameEl = document.createElement("div");
    nameEl.className = "file-name";
    nameEl.textContent = name;
    const sizeEl = document.createElement("div");
    sizeEl.className = "file-size";
    sizeEl.textContent = size;
    details.appendChild(nameEl);
    details.appendChild(sizeEl);
    card.appendChild(icon);
    card.appendChild(details);
    if (blob && !fromMe) {
      const btn = document.createElement("button");
      btn.className = "btn btn-primary btn-sm";
      btn.textContent = t.download;
      btn.onclick = () => downloadBlob(blob, name);
      card.appendChild(btn);
    }
    msg.appendChild(card);
    el.chatLog.appendChild(msg);
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
  }
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setStatus(t.fileTooLarge, "err");
      return;
    }
    if (!dataConn || !dataConn.open) {
      setStatus(t.chatNeedCall, "err");
      return;
    }
    sendFile(file);
    if (el.fileInput) el.fileInput.value = "";
  }
  async function sendFile(file) {
    const fileId = Date.now().toString();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    currentUpload = { fileId, name: file.name, total: totalChunks, sent: 0 };
    showFileProgress(file.name, file.size, true);
    dataConn.send({
      type: "file-meta",
      fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      totalChunks
    });
    for (let i = 0; i < totalChunks; i++) {
      if (!currentUpload) break;
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const buffer = await chunk.arrayBuffer();
      dataConn.send({
        type: "file-chunk",
        fileId,
        index: i,
        data: buffer
      });
      currentUpload.sent = i + 1;
      updateFileProgress(i + 1, totalChunks);
      if (CHUNK_DELAY_MS > 0) await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
    }
    if (currentUpload) {
      dataConn.send({ type: "file-complete", fileId });
      hideFileProgress();
      appendFileToChat(file.name, formatBytes(file.size), true);
      currentUpload = null;
    }
  }
  function handleFileData(msg) {
    if (msg.type === "file-meta") {
      const fileId = msg.fileId;
      incomingFiles.set(fileId, {
        meta: msg,
        chunks: new Array(msg.totalChunks),
        received: 0
      });
      showFileProgress(msg.name, msg.size, false);
    }
    if (msg.type === "file-chunk") {
      const file = incomingFiles.get(msg.fileId);
      if (!file) return;
      file.chunks[msg.index] = msg.data;
      file.received++;
      updateFileProgress(file.received, file.meta.totalChunks);
    }
    if (msg.type === "file-complete") {
      const file = incomingFiles.get(msg.fileId);
      if (!file) return;
      const blob = new Blob(file.chunks, { type: file.meta.mimeType });
      hideFileProgress();
      appendFileToChat(file.meta.name, formatBytes(file.meta.size), false, blob);
      incomingFiles.delete(msg.fileId);
    }
    if (msg.type === "file-cancel") {
      incomingFiles.delete(msg.fileId);
      hideFileProgress();
      setStatus(t.fileCancelledByPeer, "err");
    }
  }
  function cancelFileTransfer() {
    if (currentUpload && dataConn && dataConn.open) {
      dataConn.send({ type: "file-cancel", fileId: currentUpload.fileId });
    }
    currentUpload = null;
    hideFileProgress();
    setStatus(t.fileCancelled, "ok");
  }
  function playRingtone() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      let isPlaying = true;
      function beep() {
        if (!isPlaying) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.value = 0.15;
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.stop(audioContext.currentTime + 0.4);
        setTimeout(() => {
          if (!isPlaying) return;
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 600;
          osc2.type = "sine";
          gain2.gain.value = 0.15;
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          osc2.stop(audioContext.currentTime + 0.4);
          setTimeout(beep, 2000);
        }, 500);
      }
      beep();
      return () => { isPlaying = false; };
    } catch (e) {
      console.warn("Ringtone failed:", e);
      return () => {};
    }
  }
  function vibrate() {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }
  function showNotification(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "icon-128.png", tag: "videocall" });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: "icon-128.png", tag: "videocall" });
        }
      });
    }
  }
  function showIncomingCall(call) {
    pendingCall = call;
    if (el.incomingCall) el.incomingCall.hidden = false;
    if (el.incomingTitle) el.incomingTitle.textContent = t.incomingCallTitle;
    if (el.incomingFrom) el.incomingFrom.textContent = call.peer || "";
    ringtoneStop = playRingtone();
    vibrate();
    showNotification(t.incomingCallTitle, call.peer || t.incoming);
  }
  function hideIncomingCall() {
    if (el.incomingCall) el.incomingCall.hidden = true;
    if (ringtoneStop) { ringtoneStop(); ringtoneStop = null; }
    pendingCall = null;
  }
  function acceptCall() {
    if (!pendingCall) return;
    hideIncomingCall();
    pendingCall.answer(localStream);
    attachCall(pendingCall);
    setStatus(t.connected, "ok");
  }
  function rejectCall() {
    if (!pendingCall) {
      hideIncomingCall();
      return;
    }
    hideIncomingCall();
    try { pendingCall.close(); } catch (_) {}
    setStatus(t.callRejected, "ok");
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
      if (msg.type === "file-meta" || msg.type === "file-chunk" || msg.type === "file-complete" || msg.type === "file-cancel") {
        handleFileData(msg);
      }
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
      showIncomingCall(call);
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
  if (el.attachBtn) el.attachBtn.addEventListener("click", function () {
    if (el.fileInput) el.fileInput.click();
  });
  if (el.fileInput) el.fileInput.addEventListener("change", handleFileSelect);
  if (el.fileCancelBtn) el.fileCancelBtn.addEventListener("click", cancelFileTransfer);
  if (el.acceptCallBtn) el.acceptCallBtn.addEventListener("click", acceptCall);
  if (el.rejectCallBtn) el.rejectCallBtn.addEventListener("click", rejectCall);
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
