// Presence + diagnostics for the video-call PWA (mobile_v8).
// POST /api/ping   – client heartbeat (who is online, state, diagnostics)
// POST /api/event  – client event (call failed, ICE failed, peer error …)
// GET  /api/hello  – reachability check for client diagnostics
// GET  /admin, /api/peers – admin page / JSON (Basic Auth, secret ADMIN_USERS "login:pass" per line)
// GET  /admin2, /api/peers2 – the same WITHOUT password (owner's request, for tests; remove when not needed)
// All state lives in one Durable Object "Hub" (SQLite-backed, free plan).

const APP_URL = "https://dmitrypodyachev.github.io/mobile_v8/";
const ORIGINS = ["https://dmitrypodyachev.github.io", "http://127.0.0.1:8822", "http://localhost:8822",
  "https://static.137.100.245.188.clients.your-server.de", "http://static.137.100.245.188.clients.your-server.de"];
const ONLINE_MS = 120 * 1000;        // online if last ping < 2 min
const KEEP_MS = 24 * 3600 * 1000;    // forget peers after 24 h
const MAX_EVENTS = 300;

function cors(req) {
  const o = req.headers.get("Origin");
  return ORIGINS.includes(o) ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" } : {};
}
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });
}
function same(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function authed(req, env) {
  const h = req.headers.get("Authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  let cred; try { cred = atob(h.slice(6)); } catch (_) { return false; }
  return String(env.ADMIN_USERS || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).some((u) => same(u, cred));
}
const deny = () => new Response("Auth required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="vcall admin"', "Cache-Control": "no-store" } });
const str = (v, n) => (v == null ? "" : String(v)).slice(0, n);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const c = cors(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: c });
    const hub = env.HUB.get(env.HUB.idFromName("main"));
    if (url.pathname === "/api/hello") return json({ ok: true, country: req.cf?.country || null, t: Date.now() }, 200, c);
    if ((url.pathname === "/api/ping" || url.pathname === "/api/event") && req.method === "POST") {
      const text = await req.text();
      if (text.length > 8000) return json({ error: "too big" }, 413, c);
      let body; try { body = JSON.parse(text); } catch (_) { return json({ error: "bad json" }, 400, c); }
      const net = { country: req.cf?.country || "", city: req.cf?.city || "", asn: req.cf?.asn || "", org: req.cf?.asOrganization || "" };
      const r = await hub.fetch("https://hub" + url.pathname, { method: "POST", body: JSON.stringify({ body, net }) });
      return json(await r.json(), r.status, c);
    }
    if (url.pathname === "/api/peers2") return hub.fetch("https://hub/list");
    if (url.pathname === "/admin2" || url.pathname === "/admin2/")
      return new Response(ADMIN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
    if (url.pathname === "/api/peers" || url.pathname === "/admin" || url.pathname === "/admin/") {
      if (!authed(req, env)) return deny();
      if (url.pathname === "/api/peers") return hub.fetch("https://hub/list");
      return new Response(ADMIN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
    }
    if (url.pathname === "/") return Response.redirect(APP_URL, 302);
    return new Response("Not found", { status: 404 });
  }
};

export class Hub {
  constructor(ctx) {
    this.ctx = ctx;
    this.peers = null; this.events = null;
  }
  async load() {
    if (this.peers) return;
    this.peers = (await this.ctx.storage.get("peers")) || {};
    this.events = (await this.ctx.storage.get("events")) || [];
  }
  async fetch(req) {
    await this.load();
    const url = new URL(req.url);
    const now = Date.now();
    if (url.pathname === "/list") {
      for (const k of Object.keys(this.peers)) if (now - this.peers[k].lastSeen > KEEP_MS) delete this.peers[k];
      const list = Object.values(this.peers).map((p) => ({ ...p, online: now - p.lastSeen < ONLINE_MS }))
        .sort((a, b) => b.lastSeen - a.lastSeen);
      return json({ now, peers: list, events: this.events.slice(-150).reverse(), app: APP_URL });
    }
    const { body, net } = await req.json();
    const code = str(body.code, 40).toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(code)) return json({ error: "bad code" }, 400);
    if (url.pathname === "/api/ping") {
      const prev = this.peers[code] || { firstSeen: now };
      this.peers[code] = {
        code, firstSeen: prev.firstSeen, lastSeen: now,
        room: str(body.room, 40), role: str(body.role, 10), name: str(body.name, 40),
        state: str(body.state, 20), peerWith: str(body.peerWith, 40), ice: str(body.ice, 20),
        lang: str(body.lang, 5), device: str(body.device, 80), standalone: !!body.standalone,
        media: str(body.media, 40), diag: (body.diag && typeof body.diag === "object") ? JSON.parse(JSON.stringify(body.diag).slice(0, 3000) || "{}") : prev.diag || null,
        net
      };
      if (!prev.lastSeen || now - prev.lastSeen > ONLINE_MS) this.pushEvent(now, code, "online", (net.country || "") + " " + (net.org || ""), net);
      await this.ctx.storage.put("peers", this.peers);
      return json({ ok: true });
    }
    if (url.pathname === "/api/event") {
      this.pushEvent(now, code, str(body.type, 30), str(body.detail, 300), net);
      if (this.peers[code]) {
        if (body.type === "offline") { this.peers[code].lastSeen = now - ONLINE_MS; this.peers[code].state = "closed"; }
        else this.peers[code].lastSeen = now;
      }
      await this.ctx.storage.put("peers", this.peers);
      return json({ ok: true });
    }
    return json({ error: "not found" }, 404);
  }
  pushEvent(t, code, type, detail, net) {
    this.events.push({ t, code, type, detail, country: net.country || "" });
    if (this.events.length > MAX_EVENTS) this.events = this.events.slice(-MAX_EVENTS);
    this.ctx.storage.put("events", this.events);
  }
}

const ADMIN_HTML = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Video call admin</title><meta name="robots" content="noindex">
<style>
:root{--bg:#111418;--card:#1a1f27;--fg:#e8ecf2;--mut:#8a93a6;--ok:#2ecc71;--warn:#f1c40f;--err:#e74c3c;--b:#2a313c}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif;padding:16px}
h1{font-size:20px;margin:0 0 4px}.mut{color:var(--mut)}
table{width:100%;border-collapse:collapse;margin:12px 0 24px;background:var(--card);border-radius:10px;overflow:hidden}
th,td{padding:8px;border-bottom:1px solid var(--b);text-align:left;vertical-align:top}th{color:var(--mut);font-weight:500;font-size:12px}
code{font-size:15px}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
.on{background:var(--ok)}.off{background:#555}.ok{color:var(--ok)}.warn{color:var(--warn)}.err{color:var(--err)}
a.btn{display:inline-block;padding:6px 12px;border-radius:8px;background:#2f6fed;color:#fff;text-decoration:none;white-space:nowrap}
.d{font-size:12px;line-height:1.5}.wrap{overflow-x:auto}label{margin-right:12px}
@media(max-width:700px){.hide-m{display:none}}
</style></head><body>
<h1>Video call — online</h1><div class="mut" id="sum">…</div>
<div style="margin-top:8px"><label><input type="checkbox" id="all"> показать офлайн (24 ч)</label><span class="mut">обновление каждые 5 с</span></div>
<div class="wrap"><table><thead><tr><th>Код</th><th>Состояние</th><th>Сеть</th><th class="hide-m">Устройство</th><th>Диагностика</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>
<h1 style="font-size:16px">События</h1>
<div class="wrap"><table><thead><tr><th>Время</th><th>Код</th><th>Событие</th><th>Детали</th></tr></thead><tbody id="ev"></tbody></table></div>
<script>
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const ago=ms=>{const s=Math.round(ms/1000);return s<60?s+" с":s<3600?Math.round(s/60)+" мин":Math.round(s/3600)+" ч"};
const flag=c=>c&&c.length===2?String.fromCodePoint(...[...c.toUpperCase()].map(x=>127397+x.charCodeAt(0))):"";
const cls=v=>v===true||v==="ok"?"ok":v==="warn"?"warn":v===false||v==="fail"||v==="err"?"err":"mut";
function diag(d){if(!d)return '<span class="mut">—</span>';const L={lib:"PeerJS",signal:"сигнализация",stun:"STUN/UDP",media:"камера/мик",presence:"сервер"};
 return Object.keys(L).filter(k=>d[k]).map(k=>'<span class="'+cls(d[k].s)+'">'+L[k]+': '+esc(d[k].m||d[k].s)+'</span>').join("<br>")}
// /admin -> /api/peers (пароль), /admin2 -> /api/peers2; за прокси (nginx /zoom/admin2) – относительно префикса
const P=location.pathname.replace(/[/]+$/,"");const BASE=P.replace(/[/]admin2?$/,"");const OPEN=/admin2$/.test(P);
async function load(){
 try{const r=await fetch(BASE+(OPEN?"/api/peers2":"/api/peers"),{cache:"no-store"});const j=await r.json();if(BASE)j.app=location.origin+BASE+"/";const all=document.getElementById("all").checked;
  const ps=j.peers.filter(p=>all||p.online);const on=j.peers.filter(p=>p.online).length;
  document.getElementById("sum").textContent="Онлайн: "+on+" · всего за 24 ч: "+j.peers.length;
  document.getElementById("tb").innerHTML=ps.map(p=>{const n=p.net||{};const st=p.state==="incall"?'<span class="ok">в звонке</span>'+(p.peerWith?' с <code>'+esc(p.peerWith)+'</code>':''):esc(p.state||"");
   return '<tr><td><span class="dot '+(p.online?"on":"off")+'"></span><code>'+esc(p.code)+'</code>'+(p.name?'<div class="mut">'+esc(p.name)+'</div>':'')+(p.room&&p.room!==p.code?'<div class="mut d">комната '+esc(p.room)+' ('+esc(p.role)+')</div>':'')+'</td>'
   +'<td>'+st+(p.ice?'<div class="d '+(p.ice==="failed"?"err":"mut")+'">ICE: '+esc(p.ice)+'</div>':'')+'<div class="mut d">'+ago(j.now-p.lastSeen)+' назад</div></td>'
   +'<td>'+flag(n.country)+' '+esc(n.country)+' '+esc(n.city)+'<div class="mut d">'+esc(n.org)+(n.asn?' AS'+esc(n.asn):'')+'</div></td>'
   +'<td class="hide-m d">'+esc(p.device)+(p.standalone?' · PWA':'')+'<div class="mut">'+esc(p.lang)+' · media: '+esc(p.media)+'</div></td>'
   +'<td class="d">'+diag(p.diag)+'</td>'
   +'<td>'+(p.online&&p.state!=="incall"?'<a class="btn" target="_blank" rel="noopener" href="'+esc(j.app)+'?room='+encodeURIComponent(p.code)+'">Позвонить</a>':'')+'</td></tr>'}).join("")||'<tr><td colspan="6" class="mut">никого</td></tr>';
  document.getElementById("ev").innerHTML=j.events.map(e=>'<tr><td class="d">'+new Date(e.t).toLocaleString()+'</td><td><code>'+esc(e.code)+'</code></td><td class="'+(/fail|err|block/.test(e.type)?"err":"")+'">'+esc(e.type)+'</td><td class="d">'+flag(e.country)+' '+esc(e.detail)+'</td></tr>').join("");
 }catch(e){document.getElementById("sum").textContent="Ошибка загрузки: "+e.message}}
document.getElementById("all").onchange=load;load();setInterval(load,5000);
</script></body></html>`;
