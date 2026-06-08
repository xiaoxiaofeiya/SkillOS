#!/usr/bin/env bash
set -euo pipefail

SAFETY="approve"
CLIENTS="codex,claude-code,cursor,windsurf,openhands,openclaw"
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --safety)
      SAFETY="$2"
      shift 2
      ;;
    --clients)
      CLIENTS="$2"
      shift 2
      ;;
    --no-link|--skip-setup)
      EXTRA_ARGS+=("$1")
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required. Install Node.js first, then rerun this script." >&2
  exit 1
fi

node "$SCRIPT_DIR/install-local.mjs" --safety "$SAFETY" --clients "$CLIENTS" "${EXTRA_ARGS[@]}"
