# Code Review: WebRTC Video Call App (mobile_v6)

**Reviewer:** Claude Sonnet 4.5  
**Date:** 2026-09-25  
**Project:** P2P WebRTC Video Call with Chat

---

## 📋 Project Overview

**Type:** PWA (Progressive Web App)  
**Tech Stack:**
- Vanilla JavaScript (ES6+)
- PeerJS 1.5.4 (WebRTC abstraction)
- Service Worker for offline capability
- CSS custom properties (dark theme)
- i18n support (6 languages)

**Files:**
- `index.html` (132 lines) - UI structure
- `app.js` (575 lines) - Main application logic
- `style.css` (271 lines) - Styling
- `locales.js` - Internationalization
- `sw.js` - Service Worker
- `manifest.webmanifest` - PWA manifest

---

## ✅ **STRENGTHS**

### 1. **Architecture**
- ✅ Clean separation of concerns
- ✅ Modular function design
- ✅ Single file app (good for small projects)
- ✅ No build step required

### 2. **WebRTC Implementation**
- ✅ Proper use of PeerJS for signaling
- ✅ Data Channel for chat messages (reliable: true)
- ✅ Quality controls (bitrate, resolution, FPS)
- ✅ Screen sharing support
- ✅ Camera blur effect via Canvas

### 3. **User Experience**
- ✅ Dark theme optimized for mobile
- ✅ PWA installable on mobile devices
- ✅ Responsive design with swipe gestures
- ✅ Fullscreen support for videos
- ✅ Screenshot functionality
- ✅ Contact list (localStorage)
- ✅ Geo-location display (country/city)

### 4. **i18n Support**
- ✅ 6 languages supported
- ✅ Auto-detection from browser
- ✅ Persistent language selection
- ✅ All UI text localized

### 5. **Security**
- ✅ Input sanitization (`escapeHtml()`)
- ✅ Message length limits (500 chars)
- ✅ No eval() usage
- ✅ CSP-friendly (inline scripts minimal)

---

## ⚠️ **ISSUES & RECOMMENDATIONS**

### 🔴 **Critical Issues**

#### 1. **External CDN Dependency**
**Location:** `index.html:14`
```html
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
```

**Problem:** 
- Single point of failure
- HTTPS required for WebRTC, but CDN can go down
- No offline fallback
- Supply chain security risk

**Recommendation:**
```html
<!-- Download peerjs.min.js locally -->
<script src="./peerjs.min.js"></script>
```

#### 2. **No File Transfer Support** ⭐ **YOUR FEATURE REQUEST**
**Location:** Missing entirely

**Problem:** Chat only supports text messages (500 char limit)

**What's needed:**
- File attachment button (📎 icon)
- Chunked file transfer via Data Channel
- Progress indicator
- File type/size validation
- Download trigger on receiver side

**Current Data Channel Usage:**
```javascript
// app.js:251
dataConn.send({ type: "chat", text: text.slice(0, 500) });
```

**Missing:**
```javascript
// Needed:
dataConn.send({ type: "file-chunk", ... });
dataConn.send({ type: "file-meta", name, size, type });
```

---

### 🟠 **Medium Priority Issues**

#### 3. **No Error Boundaries**
**Location:** Throughout `app.js`

**Problem:** Unhandled promise rejections can crash UI

**Example:**
```javascript
// app.js:49-67 - detectCountry()
async function detectCountry() {
  for (const url of ...) {
    try {
      // ...
    } catch (_) {} // Silent failure - good!
  }
  return null;
}
```

**But elsewhere:**
```javascript
// app.js:208 - initCamera()
async function initCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: getQuality()
    });
    // ...
  } catch (err) {
    setStatus(t.noMedia + err.message, "err");
    throw err; // ❌ Uncaught rejection if called without try/catch
  }
}
```

**Recommendation:** Add top-level error handler:
```javascript
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  setStatus('Error: ' + e.reason, 'err');
  e.preventDefault();
});
```

#### 4. **Memory Leaks in Blur Feature**
**Location:** `app.js:164-193`

**Problem:** Video element and RAF never cleaned up properly

```javascript
function startBlurFrom(sourceStream) {
  stopBlur(); // ✅ Good cleanup
  const video = document.createElement("video");
  video.srcObject = new MediaStream([vTrack]);
  video.play().catch(function () {});
  
  // ❌ Video element never removed from memory
  // ❌ If user toggles blur multiple times, creates multiple videos
}
```

**Recommendation:**
```javascript
let blurVideoElement = null;

function stopBlur() {
  // ... existing code ...
  if (blurVideoElement) {
    blurVideoElement.srcObject = null;
    blurVideoElement = null;
  }
}

function startBlurFrom(sourceStream) {
  stopBlur();
  blurVideoElement = document.createElement("video");
  // ...
}
```

#### 5. **No Data Channel Chunk Size Limit**
**Location:** `app.js:256-271`

**Problem:** WebRTC Data Channel has ~16KB message size limit

```javascript
conn.on("data", function (msg) {
  if (!msg || typeof msg !== "object") return;
  // ❌ No size validation
  // ❌ Will break if msg is very large
});
```

**This will be CRITICAL for file transfer!**

**Recommendation:** Implement chunked transfer:
```javascript
const CHUNK_SIZE = 16384; // 16KB safe limit

function sendFileChunked(file) {
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const reader = new FileReader();
    reader.onload = () => {
      dataConn.send({
        type: "file-chunk",
        chunk: reader.result,
        index: i,
        total: chunks,
        fileId: Date.now() // unique ID
      });
    };
    reader.readAsArrayBuffer(chunk);
  }
}
```

#### 6. **LocalStorage Quota Not Checked**
**Location:** `app.js:6, 12, 69, 144, 408-426`

**Problem:** Contacts saved to localStorage without quota check

```javascript
// app.js:417
function addContact() {
  contacts.push({ name: name, peerId: peerId });
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  // ❌ Can throw QuotaExceededError
}
```

**Recommendation:**
```javascript
function saveContacts(contacts) {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      setStatus('Storage full. Delete old contacts.', 'err');
    }
  }
}
```

---

### 🟡 **Low Priority / Nice-to-Have**

#### 7. **No TypeScript / JSDoc**
**Problem:** No type safety, hard to maintain

**Recommendation:**
```javascript
/**
 * @typedef {Object} Message
 * @property {string} type - Message type ("chat"|"geo"|"file")
 * @property {string} [text] - Chat text
 * @property {Object} [geo] - Geo data
 */

/**
 * Sets up data connection listeners
 * @param {DataConnection} conn - PeerJS data connection
 */
function setupDataConn(conn) {
  // ...
}
```

#### 8. **Magic Numbers**
**Location:** Throughout

```javascript
// app.js:251
text.slice(0, 500) // ❌ Magic number

// Better:
const MAX_CHAT_LENGTH = 500;
text.slice(0, MAX_CHAT_LENGTH)
```

#### 9. **No Tests**
**Problem:** No unit tests, integration tests, or E2E tests

**Recommendation:** Add Vitest or Playwright:
```javascript
// tests/app.test.js
import { describe, it, expect } from 'vitest';

describe('escapeHtml', () => {
  it('should escape HTML entities', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });
});
```

#### 10. **PeerJS Server Dependency**
**Problem:** Uses default PeerJS server (peerjs.com)

**Current:** No explicit server config (uses default)

**Risk:** 
- Server downtime = app broken
- Privacy: PeerJS sees all IDs
- Rate limiting

**Recommendation:** Self-host PeerJS server:
```javascript
peer = new Peer(savedId || undefined, {
  host: 'your-peerjs-server.com',
  port: 443,
  path: '/myapp',
  secure: true
});
```

---

## 🎯 **FILE TRANSFER FEATURE - IMPLEMENTATION PLAN**

### Requirements
1. ✅ Peer-to-peer file transfer (no server upload)
2. ✅ UI: Attachment button (📎) in chat
3. ✅ Support files up to ~100MB
4. ✅ Progress indicator for sender & receiver
5. ✅ File type validation (images, docs, videos OK)
6. ✅ Auto-download on receiver side

### Architecture

**Data Channel Messages:**
```javascript
// 1. File metadata
{
  type: "file-meta",
  fileId: "1234567890",
  name: "photo.jpg",
  size: 1024000,
  mimeType: "image/jpeg",
  chunks: 63 // total chunks
}

// 2. File chunk
{
  type: "file-chunk",
  fileId: "1234567890",
  index: 0,
  data: ArrayBuffer
}

// 3. Transfer complete
{
  type: "file-complete",
  fileId: "1234567890"
}
```

### UI Changes Needed

**1. Add attachment button to HTML:**
```html
<!-- In chat-input-row -->
<input type="file" id="fileInput" style="display:none" />
<button type="button" class="btn btn-secondary" id="attachBtn" disabled>
  📎
</button>
```

**2. Add progress UI:**
```html
<div class="file-progress" id="fileProgress" hidden>
  <div class="file-info">
    <span id="fileName">Sending photo.jpg...</span>
    <span id="fileSize">1.5 MB</span>
  </div>
  <progress id="progressBar" max="100" value="0"></progress>
  <span id="progressPercent">0%</span>
</div>
```

**3. Add file message to chat:**
```html
<div class="chat-msg chat-file">
  <strong>You</strong>
  <div class="file-card">
    <span class="file-icon">📄</span>
    <div>
      <div class="file-name">document.pdf</div>
      <div class="file-size">2.3 MB</div>
    </div>
    <button class="btn btn-sm" onclick="downloadFile('...')">
      Download
    </button>
  </div>
</div>
```

### JavaScript Implementation

**Core functions needed:**

```javascript
// File upload handler
function handleFileSelect(file) {
  if (file.size > 100 * 1024 * 1024) {
    return setStatus('File too large (max 100MB)', 'err');
  }
  sendFile(file);
}

// Send file in chunks
async function sendFile(file) {
  const fileId = Date.now().toString();
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // Send metadata
  dataConn.send({
    type: "file-meta",
    fileId, name: file.name, size: file.size,
    mimeType: file.type, chunks
  });
  
  // Send chunks
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const buffer = await chunk.arrayBuffer();
    dataConn.send({
      type: "file-chunk",
      fileId, index: i, data: buffer
    });
    
    updateProgress(i + 1, chunks);
    await sleep(10); // Throttle to avoid overwhelming
  }
  
  dataConn.send({ type: "file-complete", fileId });
}

// Receive file
const incomingFiles = new Map();

function handleFileData(msg) {
  if (msg.type === "file-meta") {
    incomingFiles.set(msg.fileId, {
      meta: msg,
      chunks: new Array(msg.chunks),
      received: 0
    });
    showFileProgress(msg.name, msg.size);
  }
  
  if (msg.type === "file-chunk") {
    const file = incomingFiles.get(msg.fileId);
    file.chunks[msg.index] = msg.data;
    file.received++;
    updateProgress(file.received, file.meta.chunks);
  }
  
  if (msg.type === "file-complete") {
    const file = incomingFiles.get(msg.fileId);
    const blob = new Blob(file.chunks, { type: file.meta.mimeType });
    downloadBlob(blob, file.meta.name);
    incomingFiles.delete(msg.fileId);
  }
}

// Trigger download
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  appendChat(`📎 File received: ${filename}`, false);
}
```

### CSS Additions

```css
.file-progress {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  padding: 8px;
  border-radius: 8px;
}

.file-icon {
  font-size: 32px;
}

.chat-file {
  max-width: 100%;
}
```

### i18n Additions

```javascript
// Add to I18N object
attachFile: "Attach file",
fileTooLarge: "File too large (max 100MB)",
fileReceived: "File received",
fileSending: "Sending file...",
fileProgress: "Progress"
```

---

## 📊 **METRICS**

| Metric | Value | Status |
|--------|-------|--------|
| **Lines of Code** | ~575 (app.js) | ✅ Reasonable |
| **Complexity** | Medium | ✅ Manageable |
| **Dependencies** | 1 (PeerJS) | ✅ Minimal |
| **Bundle Size** | ~30KB (unminified) | ✅ Small |
| **Load Time** | <1s (local) | ✅ Fast |
| **Mobile Support** | ✅ Yes (PWA) | ✅ Good |
| **Browser Support** | Chrome, Firefox, Safari | ✅ Modern |
| **Accessibility** | Basic ARIA | ⚠️ Could improve |

---

## 🎯 **PRIORITY RECOMMENDATIONS**

### Immediate (Before File Transfer)
1. ✅ Download PeerJS locally (remove CDN)
2. ✅ Add error boundary for promise rejections
3. ✅ Fix blur memory leak
4. ✅ Add localStorage quota check

### File Transfer Implementation (2-3 hours)
1. ✅ Add UI elements (button, progress, file cards)
2. ✅ Implement chunked file sending
3. ✅ Implement file receiving & reconstruction
4. ✅ Add file size validation
5. ✅ Add progress indicators
6. ✅ Test with various file types/sizes
7. ✅ Add i18n translations

### Long-term
1. ✅ Add TypeScript or JSDoc
2. ✅ Self-host PeerJS server
3. ✅ Add unit tests
4. ✅ Improve accessibility (keyboard nav, screen readers)
5. ✅ Add E2E encryption for messages/files

---

## 🏁 **CONCLUSION**

**Overall Quality:** 7.5/10

**Strengths:**
- Clean, readable code
- Good UX
- Solid WebRTC implementation
- No major security holes

**Main Weakness:**
- Missing file transfer feature (your request!)
- External dependencies (CDN, default PeerJS server)
- No tests

**Ready for File Transfer?** ✅ YES
- Data Channel already established
- Chat messaging works
- Just need to add chunked binary transfer

**Estimated Implementation Time:**
- Basic file transfer: 2-3 hours
- Polish & testing: 1-2 hours
- **Total: 3-5 hours**

---

**Next Steps:**
1. Should I implement the file transfer feature now?
2. Which fixes do you want me to apply first?
3. New folder or work here in `ARC/mobile_v6`?
