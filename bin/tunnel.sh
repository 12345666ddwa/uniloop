#!/bin/bash
# 隧道守护：断线自动重连，把当前公网地址写到 TUNNEL_URL.txt
cd "$(dirname "$0")/.." || exit 1
LOG=/tmp/uniloop_tunnel.log
URLFILE=TUNNEL_URL.txt
while true; do
  : > "$LOG"
  ~/.local/bin/cloudflared tunnel --url http://localhost:3400 --no-autoupdate >> "$LOG" 2>&1 &
  PID=$!
  for i in $(seq 1 40); do
    sleep 1
    U=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | head -1)
    if [ -n "$U" ]; then
      echo "$U" > "$URLFILE"
      echo "[$(date +%H:%M:%S)] new url: $U"
      break
    fi
  done
  wait $PID
  echo "[$(date +%H:%M:%S)] tunnel exited, restarting in 2s…"
  sleep 2
done
