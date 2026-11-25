# zoom-signal: PeerJS signalling + TURN credentials (see server.js)
FROM node:20.20-alpine3.22
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --loglevel=error
COPY server.js ./
ENV NODE_ENV=production BIND=0.0.0.0 PORT=9000
USER node
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:9000/zoom/signal-health || exit 1
CMD ["node", "server.js"]
