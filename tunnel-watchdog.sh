#!/bin/bash
# QFM Studio Cloudflare Tunnel Watchdog
# Keeps the quick tunnel alive. If it dies, restarts it and updates the frontend.
# Usage: ./tunnel-watchdog.sh [--deploy]

TUNNEL_LOG="/tmp/cf-tunnel.log"
TUNNEL_URL_FILE="/tmp/cf-tunnel-url.txt"
FRONTEND_DIR="/home/anson/qfm-studio/apps/web"
GH_PAGES_DIR="/tmp/gh-pages-deploy"
BACKEND_URL="http://192.168.0.2:8000"

echo "[watchdog] Starting Cloudflare tunnel..."
pkill -f "cloudflared tunnel --url" 2>/dev/null
sleep 1

cloudflared tunnel --url "$BACKEND_URL" > "$TUNNEL_LOG" 2>&1 &
CF_PID=$!
echo "[watchdog] cloudflared PID: $CF_PID"

# Wait for URL to appear in log
echo "[watchdog] Waiting for tunnel URL..."
URL=""
for i in $(seq 1 30); do
    sleep 2
    URL=$(grep -oP 'https://[a-z-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | tail -1)
    if [ -n "$URL" ]; then
        break
    fi
done

if [ -z "$URL" ]; then
    echo "[watchdog] ERROR: No tunnel URL found after 60s"
    exit 1
fi

echo "$URL" > "$TUNNEL_URL_FILE"
echo "[watchdog] Tunnel URL: $URL"

# Test the tunnel
echo "[watchdog] Testing tunnel..."
HEALTH=$(curl -s "$URL/api/v1/health" 2>&1)
echo "[watchdog] Health check: $HEALTH"

if [ "$1" = "--deploy" ]; then
    echo "[watchdog] Rebuilding frontend with new tunnel URL..."
    cd "$FRONTEND_DIR"
    echo "VITE_API_URL=$URL" > .env
    npx vite build 2>&1 | tail -5
    
    echo "[watchdog] Deploying to GitHub Pages..."
    mkdir -p "$GH_PAGES_DIR"
    cd "$GH_PAGES_DIR"
    git fetch origin gh-pages 2>/dev/null
    git checkout gh-pages 2>/dev/null || git checkout -b gh-pages 2>/dev/null
    rm -rf *
    cp -r "$FRONTEND_DIR/dist/"* .
    git add -A
    git commit -m "deploy: tunnel URL $URL" --allow-empty 2>/dev/null
    git push origin gh-pages 2>&1
    echo "[watchdog] Deployed!"
fi

echo "[watchdog] Done. Tunnel PID=$CF_PID, URL=$URL"