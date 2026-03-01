#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build and deploy ClientHub
#
# Usage:
#   ./deploy.sh           # deploy both frontend and backend
#   ./deploy.sh frontend  # deploy frontend only
#   ./deploy.sh backend   # deploy backend only
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail # Exit on error, undefined variable, or pipe failure.

# --- Configuration ---
# SSH and server details for a cPanel-like environment
SSH_USER="faithharborclien"
SSH_HOST="faithharborclienthub.com"
FRONTEND_REMOTE_DIR="~/public_html"
BACKEND_REMOTE_DIR="~/public_html/api.faithharborclienthub.com"
HEALTH_CHECK_URL="https://api.faithharborclienthub.com/health"

# --- Project Structure ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Determine which part of the app to deploy from the first argument
MODE="${1:-both}"

# --- Functions ---

deploy_frontend() {
  echo "🚀 Deploying Frontend..."
  cd "$FRONTEND_DIR"

  echo "  → Building production assets..."
  npm run build

  echo "  → Uploading frontend assets..."
  if command -v rsync &>/dev/null; then
    rsync -avz --delete --exclude 'api.faithharborclienthub.com' --exclude '.well-known' --exclude 'cgi-bin' "$FRONTEND_DIR/dist/" "$SSH_USER@$SSH_HOST:$FRONTEND_REMOTE_DIR/"
  else
    # rsync not available — use tar pipe over SSH (clears existing assets first)
    ssh "$SSH_USER@$SSH_HOST" "find $FRONTEND_REMOTE_DIR -maxdepth 1 -not -name 'api.faithharborclienthub.com' -not -name '.well-known' -not -name 'cgi-bin' -not -path '$FRONTEND_REMOTE_DIR' -delete 2>/dev/null; mkdir -p $FRONTEND_REMOTE_DIR"
    tar -czf - -C "$FRONTEND_DIR/dist" . | ssh "$SSH_USER@$SSH_HOST" "tar -xzf - -C $FRONTEND_REMOTE_DIR"
  fi
  echo "✅ Frontend deployment successful!"
}

check_health() {
  echo "  → Verifying API health..."
  local retries=5
  local delay=5
  local attempt=0

  # Allow time for the server to restart before checking
  echo "    Waiting 10 seconds for server to initialize..."
  sleep 10

  while [ $attempt -lt $retries ]; do
    attempt=$((attempt + 1))
    echo "    Attempt ${attempt}/${retries}: Pinging ${HEALTH_CHECK_URL}"
    # Use curl to get the HTTP status code, follow redirects, and set a timeout
    local status_code=$(curl -L -s -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_CHECK_URL}")

    if [ "$status_code" -eq 200 ]; then
      echo "  ✅ API is healthy and responding with status 200."
      return 0 # Success
    fi
    echo "    ⚠️ API returned status ${status_code}. Retrying in ${delay} seconds..."
    sleep $delay
  done

  echo "  ❌ Health check failed after ${retries} attempts. Please check the server logs."
  exit 1
}

deploy_backend() {
  echo "🚀 Deploying Backend..."

  echo "  → Uploading backend source files..."
  if command -v rsync &>/dev/null; then
    rsync -avz --delete --exclude 'node_modules' --exclude '.env' --exclude 'uploads' "$BACKEND_DIR/" "$SSH_USER@$SSH_HOST:$BACKEND_REMOTE_DIR/"
  else
    tar --exclude='./node_modules' --exclude='./.env' --exclude='./uploads' -czf - -C "$BACKEND_DIR" . | ssh "$SSH_USER@$SSH_HOST" "mkdir -p $BACKEND_REMOTE_DIR && tar -xzf - -C $BACKEND_REMOTE_DIR"
  fi

  echo "  → Running remote commands (install dependencies, restart server)..."
  # Use bash -l (login shell) so /etc/profile.d/limits.sh runs and sets ulimit -n 65536.
  # Then kill + restart PM2 daemon so the new daemon inherits the correct fd limit.
  ssh "$SSH_USER@$SSH_HOST" "bash -l -c '
    set -e
    cd $BACKEND_REMOTE_DIR
    echo \"    → Installing npm dependencies...\"
    NODE_OPTIONS=\"--jitless\" npm install --production 2>/dev/null || echo \"    ⚠ npm install skipped (run as root if new packages were added)\"
    echo \"    → Restarting PM2 daemon with correct fd limits...\"
    pm2 kill 2>/dev/null || true
    pm2 start ecosystem.config.cjs --env production
  '"
  echo "✅ Backend deployment successful!"
}

# --- Main Execution ---

case "$MODE" in
  frontend)
    deploy_frontend
    ;;
  backend)
    deploy_backend
    check_health
    ;;
  both)
    deploy_frontend
    deploy_backend
    check_health
    ;;
  *)
    echo "Usage: $0 [frontend|backend|both]"
    exit 1
    ;;
esac

echo ""
echo "🎉 Deployment finished. Live at https://faithharborclienthub.com"
