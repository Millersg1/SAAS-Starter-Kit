#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-secrets.sh — A simple script to generate secure JWT secrets.
#
# Usage:
#   ./generate-secrets.sh
#
# This script uses OpenSSL to generate cryptographically secure random strings
# suitable for use in a .env file.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "🔑 Generating new secure secrets for your .env file..."
echo ""

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

echo "✅ Secrets generated successfully."
echo ""
echo "📋 Copy the following lines and paste them into your .env file:"
echo "----------------------------------------------------------------"
echo "JWT_SECRET=${JWT_SECRET}"
echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
echo "----------------------------------------------------------------"