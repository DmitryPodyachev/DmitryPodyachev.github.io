# File Transfer Implementation Plan

## Architecture

### Data Channel Messages (3 types):

```javascript
// 1. File metadata (sent first)
{
  type: "file-meta",
  fileId: "1695647890123",
  name: "photo.jpg",
  size: 1048576,      // bytes
  mimeType: "image/jpeg",
  totalChunks: 64
}

// 2. File chunks (sent in loop)
{
  type: "file-chunk",
  fileId: "1695647890123",
  index: 0,           // chunk number
  data: ArrayBuffer   // 16KB binary data
}

// 3. Transfer complete (sent last)
{
  type: "file-complete",
  fileId: "1695647890123"
}
```

### Constants

```javascript
const CHUNK_SIZE = 16384;           // 16KB - safe for WebRTC Data Channel
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
const CHUNK_DELAY_MS = 10;          // Throttle to avoid overwhelming
```

### State Management

```javascript
// Receiving files
const incomingFiles = new Map();    // fileId -> { meta, chunks[], received }

// Sending file
let currentUpload = null;           // { fileId, name, progress }
```

## UI Changes

### 1. HTML additions (index.html):

```html
<!-- File input (hidden) -->
<input type="file" id="fileInput" style="display:none" />

<!-- Attach button in chat -->
<button type="button" class="btn btn-secondary" id="attachBtn" disabled title="Attach file">📎</button>

<!-- Progress indicator -->
<div class="file-progress" id="fileProgress" hidden>
  <div class="file-info">
    <span id="fileProgressName">Sending photo.jpg...</span>
    <span id="fileProgressSize">1.5 MB</span>
  </div>
  <progress id="fileProgressBar" max="100" value="0"></progress>
  <span id="fileProgressPercent">0%</span>
  <button type="button" class="btn btn-sm" id="fileCancelBtn">Cancel</button>
</div>
```

### 2. CSS additions (style.css):

```css
.file-progress {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-progress progress {
  width: 100%;
  height: 8px;
  border-radius: 4px;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  padding: 12px;
  border-radius: 8px;
  margin: 4px 0;
  border: 1px solid var(--border);
}

.file-icon {
  font-size: 32px;
  line-height: 1;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 0.875rem;
  color: var(--muted);
}

.chat-msg .file-card {
  max-width: 100%;
}
```

### 3. i18n additions (locales.js):

```javascript
// Add to each language:
attachFile: "Attach file",
fileTooLarge: "File too large (max 100MB)",
fileReceived: "File received",
fileSending: "Sending",
fileReceiving: "Receiving",
fileComplete: "Complete",
fileCancelled: "Cancelled",
download: "Download"
```

## JavaScript Implementation

### Functions to add (app.js):

```javascript
// 1. File selection handler
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
}

// 2. Send file in chunks
async function sendFile(file) {
  const fileId = Date.now().toString();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  currentUpload = { fileId, name: file.name, total: totalChunks, sent: 0 };
  
  // Show progress UI
  showFileProgress(file.name, file.size, true);
  
  // Send metadata
  dataConn.send({
    type: "file-meta",
    fileId,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    totalChunks
  });
  
  // Send chunks
  for (let i = 0; i < totalChunks; i++) {
    if (!currentUpload) break; // Cancelled
    
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
    
    // Throttle to avoid overwhelming
    await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
  }
  
  // Send complete signal
  dataConn.send({ type: "file-complete", fileId });
  
  hideFileProgress();
  appendFileToChat(file.name, formatBytes(file.size), true);
  currentUpload = null;
}

// 3. Handle incoming file data
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
}

// 4. UI helpers
function showFileProgress(name, size, isSending) {
  el.fileProgress.hidden = false;
  el.fileProgressName.textContent = (isSending ? t.fileSending : t.fileReceiving) + ": " + name;
  el.fileProgressSize.textContent = formatBytes(size);
  el.fileProgressBar.value = 0;
  el.fileProgressPercent.textContent = "0%";
}

function updateFileProgress(current, total) {
  const percent = Math.round((current / total) * 100);
  el.fileProgressBar.value = percent;
  el.fileProgressPercent.textContent = percent + "%";
}

function hideFileProgress() {
  el.fileProgress.hidden = true;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 10) / 10 + " " + sizes[i];
}

function appendFileToChat(name, size, fromMe, blob = null) {
  const msg = document.createElement("div");
  msg.className = "chat-msg" + (fromMe ? " chat-me" : " chat-peer");
  
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

function getFileIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "🖼️";
  if (["mp4", "webm", "mov", "avi"].includes(ext)) return "🎥";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "🎵";
  if (["pdf"].includes(ext)) return "📄";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "📦";
  if (["doc", "docx", "txt", "rtf"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  return "📎";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function cancelFileTransfer() {
  currentUpload = null;
  hideFileProgress();
  setStatus(t.fileCancelled, "ok");
}
```

### Integration points:

1. **setupDataConn()** - add file handler:
```javascript
conn.on("data", function (msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "geo" && msg.geo) { /* ... */ }
  if (msg.type === "chat" && msg.text) { /* ... */ }
  
  // ✅ ADD THIS:
  if (msg.type === "file-meta" || msg.type === "file-chunk" || msg.type === "file-complete") {
    handleFileData(msg);
  }
});
```

2. **Event listeners** - add attach button:
```javascript
el.attachBtn.addEventListener("click", () => el.fileInput.click());
el.fileInput.addEventListener("change", handleFileSelect);
el.fileCancelBtn.addEventListener("click", cancelFileTransfer);
```

3. **Enable/disable attach button**:
```javascript
function setChatEnabled(on) {
  el.chatInput.disabled = !on;
  el.chatSendBtn.disabled = !on;
  el.attachBtn.disabled = !on; // ✅ ADD THIS
}
```

## Testing Checklist

- [ ] Small file (1KB) sends successfully
- [ ] Medium file (1MB) sends with progress
- [ ] Large file (50MB) sends without errors
- [ ] Progress bar updates correctly
- [ ] File download works on receiver side
- [ ] Multiple files can be sent sequentially
- [ ] Cancel works during transfer
- [ ] Different file types (image, pdf, video) work
- [ ] File icons display correctly
- [ ] Works in both directions (A→B and B→A)
- [ ] Connection loss during transfer handled
- [ ] File size limit enforced
- [ ] i18n strings display correctly

## Implementation Order

1. ✅ Add constants (CHUNK_SIZE, MAX_FILE_SIZE)
2. ✅ Add HTML elements (file input, attach button, progress UI)
3. ✅ Add CSS styles (file cards, progress bar)
4. ✅ Add i18n strings (all 6 languages)
5. ✅ Implement sendFile() function
6. ✅ Implement handleFileData() receiver
7. ✅ Add UI helpers (progress, formatting)
8. ✅ Wire up event listeners
9. ✅ Test with small file
10. ✅ Test with large file
