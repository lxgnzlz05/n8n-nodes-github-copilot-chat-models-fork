#!/usr/bin/env bash
# get-copilot-token.sh
#
# Obtain a GitHub Copilot OAuth token (ghu_...) via the device authorization
# flow using OpenCode Copilot OAuth client ID.
#
# The Copilot API (api.githubcopilot.com) only accepts tokens obtained this
# way — regular PATs and fine-grained tokens are rejected with HTTP 400.
#
# Usage:
#   bash get-copilot-token.sh
#   bash get-copilot-token.sh enterprise company.ghe.com   # for GHES

set -euo pipefail

# OpenCode GitHub Copilot OAuth app client ID (public, used by all Copilot clients)
CLIENT_ID=${CLIENT_ID:-"Ov23li8tweQw6odWQebz"}

# GitHub domain — override for GHES (e.g. company.ghe.com)
if [[ "${1:-}" == "enterprise" && -n "${2:-}" ]]; then
  DOMAIN="${2}"
  echo "Using GitHub Enterprise Server: ${DOMAIN}"
else
  DOMAIN="github.com"
fi

DEVICE_URL="https://${DOMAIN}/login/device/code"
TOKEN_URL="https://${DOMAIN}/login/oauth/access_token"

echo ""
echo "==> Requesting device code..."
DEVICE_RESPONSE=$(curl -s -X POST "${DEVICE_URL}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"client_id\":\"${CLIENT_ID}\",\"scope\":\"read:user\"}")

DEVICE_CODE=$(echo "${DEVICE_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['device_code'])")
USER_CODE=$(echo "${DEVICE_RESPONSE}"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['user_code'])")
VERIFY_URI=$(echo "${DEVICE_RESPONSE}"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['verification_uri'])")
INTERVAL=$(echo "${DEVICE_RESPONSE}"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('interval', 5))")

echo ""
echo "============================================"
echo "  1. Open this URL in your browser:"
echo "     ${VERIFY_URI}"
echo ""
echo "  2. Enter this code: ${USER_CODE}"
echo "============================================"
echo ""
echo "Waiting for you to authorize..."

# Poll until we get the token or fail
while true; do
  sleep "${INTERVAL}"

  TOKEN_RESPONSE=$(curl -s -X POST "${TOKEN_URL}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d "{\"client_id\":\"${CLIENT_ID}\",\"device_code\":\"${DEVICE_CODE}\",\"grant_type\":\"urn:ietf:params:oauth:grant-type:device_code\"}")

  ERROR=$(echo "${TOKEN_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || true)

  if [[ "${ERROR}" == "authorization_pending" ]]; then
    echo "  ...waiting..."
    continue
  elif [[ "${ERROR}" == "slow_down" ]]; then
    INTERVAL=$((INTERVAL + 5))
    continue
  elif [[ -n "${ERROR}" ]]; then
    echo "Error: ${ERROR}"
    echo "Full response: ${TOKEN_RESPONSE}"
    exit 1
  fi

  ACCESS_TOKEN=$(echo "${TOKEN_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || true)

  if [[ -n "${ACCESS_TOKEN}" ]]; then
    echo ""
    echo "============================================"
    echo "  Success! Your Copilot OAuth token:"
    echo ""
    echo "  ${ACCESS_TOKEN}"
    echo ""
    echo "  Paste this into the n8n 'OAuth Token' field"
    echo "  of the GitHub Copilot API credential."
    echo "============================================"
    echo ""

    # Quick validation
    echo "==> Validating token against Copilot API..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.githubcopilot.com/models" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Copilot-Integration-Id: vscode-chat" \
      -H "x-initiator: user")

    if [[ "${HTTP_CODE}" == "200" ]]; then
      echo "    Token valid (HTTP 200)"
    else
      echo "    Warning: validation returned HTTP ${HTTP_CODE}"
      echo "    The account may not have an active Copilot subscription."
    fi
    exit 0
  fi

  echo "Unexpected response: ${TOKEN_RESPONSE}"
  exit 1
done
