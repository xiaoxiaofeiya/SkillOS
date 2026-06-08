#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${SKILLOS_INSTALL_DIR:-$HOME/.local/share/skillos}"
SAFETY="approve"
CLIENTS="codex,claude-code,cursor,windsurf,openhands,openclaw"
EXTRA_ARGS=()
REPO="https://github.com/xiaoxiaofeiya/SkillOS.git"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
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

if ! command -v git >/dev/null 2>&1; then
  echo "Git is required for this installer." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required. Install Node.js first, then rerun this script." >&2
  exit 1
fi

if [[ ! -d "$INSTALL_DIR" ]]; then
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone "$REPO" "$INSTALL_DIR"
elif [[ -d "$INSTALL_DIR/.git" ]]; then
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "Install directory exists but is not a git repository: $INSTALL_DIR" >&2
  exit 1
fi

bash "$INSTALL_DIR/scripts/install.sh" --safety "$SAFETY" --clients "$CLIENTS" "${EXTRA_ARGS[@]}"
