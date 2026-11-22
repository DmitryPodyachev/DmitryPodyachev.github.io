#!/bin/sh
# Installs on the owner's Ubuntu server (nginx already serves /zoom):
#   1) zoom-signal  – own PeerJS signalling server + TURN credentials (Node, systemd, 127.0.0.1:9000)
#   2) coturn       – TURN relay (3478 udp/tcp, relay ports 49160-49250/udp)
#   3) updated nginx snippet (/etc/nginx/snippets/zoom.conf) + fresh app files (/var/www/zoom)
# Safe to run again (updates code/config, keeps the generated TURN secret).
# Usage (as root):  curl -fsSL https://raw.githubusercontent.com/DmitryPodyachev/DmitryPodyachev.github.io/main/deploy/zoom-server-install.sh | sh
set -eu
REPO=https://raw.githubusercontent.com/DmitryPodyachev/DmitryPodyachev.github.io/main
HOST=static.137.100.245.188.clients.your-server.de
ORIGINS="https://dmitrypodyachev.github.io,https://$HOST"

[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
echo "== packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nodejs npm coturn git curl ca-certificates >/dev/null
node -v

echo "== zoom-signal"
id zoomsig >/dev/null 2>&1 || useradd --system --home /opt/zoom-signal --shell /usr/sbin/nologin zoomsig
mkdir -p /opt/zoom-signal
curl -fsSL "$REPO/zoom-server/server.js"    -o /opt/zoom-signal/server.js
curl -fsSL "$REPO/zoom-server/package.json" -o /opt/zoom-signal/package.json
(cd /opt/zoom-signal && npm install --omit=dev --no-audit --no-fund --loglevel=error)
chown -R root:root /opt/zoom-signal

if [ ! -f /etc/zoom-signal.env ]; then
  SECRET=$(openssl rand -hex 32)
  printf 'PORT=9000\nTURN_HOST=%s\nTURN_SECRET=%s\nORIGINS=%s\n' "$HOST" "$SECRET" "$ORIGINS" > /etc/zoom-signal.env
fi
chown root:zoomsig /etc/zoom-signal.env; chmod 640 /etc/zoom-signal.env
SECRET=$(sed -n 's/^TURN_SECRET=//p' /etc/zoom-signal.env)

curl -fsSL "$REPO/deploy/zoom-signal.service" -o /etc/systemd/system/zoom-signal.service
systemctl daemon-reload
systemctl enable -q zoom-signal
systemctl restart zoom-signal

echo "== coturn"
[ -f /etc/turnserver.conf ] && [ ! -f /etc/turnserver.conf.orig ] && cp /etc/turnserver.conf /etc/turnserver.conf.orig
curl -fsSL "$REPO/deploy/turnserver.conf" | sed "s/__TURN_SECRET__/$SECRET/; s/__TURN_HOST__/$HOST/g" > /etc/turnserver.conf
chown root:turnserver /etc/turnserver.conf 2>/dev/null || true; chmod 640 /etc/turnserver.conf
touch /var/log/turnserver.log; chown turnserver:turnserver /var/log/turnserver.log 2>/dev/null || true
[ -f /etc/default/coturn ] && sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
systemctl enable -q coturn
systemctl restart coturn

echo "== firewall"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 3478/udp >/dev/null; ufw allow 3478/tcp >/dev/null; ufw allow 49160:49250/udp >/dev/null
  echo "ufw: opened 3478/udp, 3478/tcp, 49160-49250/udp"
else
  echo "ufw not active – if a Hetzner Cloud Firewall is used, open there: 3478 UDP+TCP, 49160-49250 UDP"
fi

echo "== nginx + app"
curl -fsSL "$REPO/deploy/nginx-zoom.conf" -o /etc/nginx/snippets/zoom.conf
curl -fsSL "$REPO/deploy/zoom-sync.sh" | sh
nginx -t && systemctl reload nginx

echo "== checks"
sleep 2
systemctl is-active zoom-signal coturn
curl -fsS "https://$HOST/zoom/signal-health"; echo
curl -fsS "https://$HOST/zoom/peerjs/peerjs/id?ts=1&key=peerjs"; echo
curl -fsS "https://$HOST/zoom/turn" | head -c 120; echo
echo "OK – open https://$HOST/zoom/ and press the diagnostics button"
