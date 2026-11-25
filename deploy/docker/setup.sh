#!/bin/sh
# Video call (/zoom) on the owner's server, docker variant. Run as root; safe to run again (= update).
#   git clone --depth 1 https://github.com/DmitryPodyachev/DmitryPodyachev.github.io.git /opt/zoom
#   sh /opt/zoom/deploy/docker/setup.sh
# Update later:  cd /opt/zoom && git pull && sh deploy/docker/setup.sh
# Does: .env with a generated TURN secret (kept on re-runs), app files -> /var/www/zoom,
#       nginx snippet -> /etc/nginx/snippets/zoom.conf (host nginx), firewall ports,
#       docker compose up (zoom-signal on 127.0.0.1:9000 + coturn on 3478 / 49160-49250 udp), checks.
set -eu
HOST=static.137.100.245.188.clients.your-server.de
DIR=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$DIR/../.." && pwd)
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }

echo "== docker"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-compose-v2 >/dev/null
fi
docker compose version >/dev/null 2>&1 || { echo "docker compose plugin missing: apt-get install docker-compose-v2 (or docker-compose-plugin)"; exit 1; }
systemctl enable -q --now docker 2>/dev/null || true

echo "== .env"
if [ ! -f "$DIR/.env" ]; then
  sed "s/^TURN_SECRET=.*/TURN_SECRET=$(openssl rand -hex 32)/" "$DIR/.env.example" > "$DIR/.env"
  # keep the secret of an earlier non-docker install, if there was one
  if [ -f /etc/zoom-signal.env ]; then
    OLD=$(sed -n 's/^TURN_SECRET=//p' /etc/zoom-signal.env)
    [ -z "$OLD" ] || sed -i "s/^TURN_SECRET=.*/TURN_SECRET=$OLD/" "$DIR/.env"
  fi
fi
chmod 600 "$DIR/.env"

echo "== stop non-docker variant (if installed by zoom-server-install.sh)"
for s in zoom-signal coturn; do
  if systemctl is-enabled -q "$s" 2>/dev/null || systemctl is-active -q "$s" 2>/dev/null; then
    systemctl disable -q --now "$s" && echo "stopped $s (host service)"
  fi
done

echo "== app files -> /var/www/zoom"
rm -rf /var/www/zoom.new && cp -a "$REPO/mobile_v8" /var/www/zoom.new
rm -f /var/www/zoom.new/*.md /var/www/zoom.new/QUICK_ANSWER.txt
rm -rf /var/www/zoom.old
if [ -d /var/www/zoom ]; then mv /var/www/zoom /var/www/zoom.old; fi
mv /var/www/zoom.new /var/www/zoom && rm -rf /var/www/zoom.old
chown -R www-data:www-data /var/www/zoom 2>/dev/null || true

echo "== firewall"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 3478/udp >/dev/null; ufw allow 3478/tcp >/dev/null; ufw allow 49160:49250/udp >/dev/null
  echo "ufw: opened 3478/udp, 3478/tcp, 49160-49250/udp"
else
  echo "ufw not active - if a Hetzner Cloud Firewall is used, open there: 3478 UDP+TCP, 49160-49250 UDP"
fi

echo "== containers"
cd "$DIR"
docker compose pull -q coturn
docker compose up -d --build --remove-orphans
docker compose ps

echo "== nginx"
mkdir -p /etc/nginx/snippets
cp "$REPO/deploy/nginx-zoom.conf" /etc/nginx/snippets/zoom.conf
grep -rqs "snippets/zoom.conf" /etc/nginx/sites-enabled /etc/nginx/conf.d /etc/nginx/nginx.conf \
  || echo "!! add 'include snippets/zoom.conf;' into the HTTPS server block of $HOST"
nginx -t && systemctl reload nginx

echo "== checks"
sleep 3
curl -fsS "https://$HOST/zoom/signal-health"; echo
curl -fsS "https://$HOST/zoom/peerjs/peerjs/id?ts=1&key=peerjs"; echo
curl -fsS "https://$HOST/zoom/turn" | head -c 100; echo " ..."
ss -lnu | grep -q ':3478 ' && echo "coturn: listening on 3478/udp" || echo "!! coturn not listening - docker compose logs coturn"
echo "OK - open https://$HOST/zoom/ and press the diagnostics button"
