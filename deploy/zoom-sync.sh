#!/bin/sh
# Copy mobile_v8 from GitHub into /var/www/zoom (run as root; again after every update).
set -e
TMP=$(mktemp -d)
git clone -q --depth 1 https://github.com/DmitryPodyachev/DmitryPodyachev.github.io.git "$TMP/repo"
rm -f "$TMP"/repo/mobile_v8/*.md "$TMP/repo/mobile_v8/QUICK_ANSWER.txt"
rm -rf /var/www/zoom.new && cp -a "$TMP/repo/mobile_v8" /var/www/zoom.new
rm -rf /var/www/zoom.old && { [ -d /var/www/zoom ] && mv /var/www/zoom /var/www/zoom.old || true; }
mv /var/www/zoom.new /var/www/zoom && rm -rf /var/www/zoom.old
chown -R www-data:www-data /var/www/zoom 2>/dev/null || true
rm -rf "$TMP"
echo "zoom updated: $(ls /var/www/zoom | tr '\n' ' ')"
