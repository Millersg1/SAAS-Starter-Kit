#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build and deploy ClientHub to cPanel
#
# Usage:
#   ./deploy.sh           # deploy both frontend and backend
#   ./deploy.sh frontend  # deploy frontend only
#   ./deploy.sh backend   # deploy backend only
# ─────────────────────────────────────────────────────────────────────────────

set -e

SSH_USER="faithharborclien"
SSH_HOST="faithharborclienthub.com"
FRONTEND_REMOTE="~/public_html"
BACKEND_REMOTE="~/public_html/api.faithharborclienthub.com"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

MODE="${1:-both}"

deploy_frontend() {
  echo "→ Building frontend..."
  cd "$FRONTEND_DIR"
  npm run build

  echo "→ Uploading frontend..."
  scp "$FRONTEND_DIR/dist/index.html" \
      "$SSH_USER@$SSH_HOST:$FRONTEND_REMOTE/index.html"
  scp -r "$FRONTEND_DIR/dist/assets/." \
      "$SSH_USER@$SSH_HOST:$FRONTEND_REMOTE/assets/"
  echo "✓ Frontend deployed"
}

deploy_backend() {
  echo "→ Uploading backend source files..."
  scp -r "$BACKEND_DIR/src/." \
      "$SSH_USER@$SSH_HOST:$BACKEND_REMOTE/src/"
  scp "$BACKEND_DIR/package.json" \
      "$SSH_USER@$SSH_HOST:$BACKEND_REMOTE/package.json"
  scp "$BACKEND_DIR/server.js" \
      "$SSH_USER@$SSH_HOST:$BACKEND_REMOTE/server.js"

  echo "→ Restarting backend (PM2)..."
  ssh "$SSH_USER@$SSH_HOST" "cd $BACKEND_REMOTE && pm2 restart clienthub-api --update-env 2>/dev/null || pm2 start server.js --name clienthub-api"
  echo "✓ Backend deployed and restarted"
}

case "$MODE" in
  frontend) deploy_frontend ;;
  backend)  deploy_backend  ;;
  both)
    deploy_frontend
    deploy_backend
    ;;
  *)
    echo "Usage: $0 [frontend|backend|both]"
    exit 1
    ;;
esac

echo ""
echo "Done. Live at https://faithharborclienthub.com"
