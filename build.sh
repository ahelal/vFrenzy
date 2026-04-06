#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── helpers ───────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $(basename "$0") [command]

Commands:
  package     Compile and package into a .vsix file (default)
  publish     Compile, package, and publish to the VS Code Marketplace
  clean       Remove build output and .vsix files
  help        Show this help message
EOF
}

log()  { echo "[$(date +%H:%M:%S)] $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }

check_deps() {
  command -v node  >/dev/null 2>&1 || die "node is not installed"
  command -v npm   >/dev/null 2>&1 || die "npm is not installed"
  command -v vsce  >/dev/null 2>&1 || die "vsce is not installed — run: npm install -g @vscode/vsce"
}

# ── steps ─────────────────────────────────────────────────────────────────────
do_clean() {
  log "Cleaning build output..."
  rm -rf out/
  rm -f ./*.vsix
  log "Clean done."
}

do_compile() {
  log "Installing dependencies..."
  npm install

  log "Compiling TypeScript..."
  npm run compile
}

do_package() {
  do_compile

  log "Packaging extension..."
  vsce package

  local vsix
  vsix=$(ls -1t ./*.vsix | head -n1)
  log "Package created: $vsix"
}

do_publish() {
  do_compile

  log "Publishing to VS Code Marketplace..."
  vsce publish
  log "Published successfully."
}

# ── main ──────────────────────────────────────────────────────────────────────
CMD="${1:-package}"

case "$CMD" in
  package)  check_deps; do_package ;;
  publish)  check_deps; do_publish ;;
  clean)    do_clean ;;
  help|-h|--help) usage ;;
  *) echo "Unknown command: $CMD"; usage; exit 1 ;;
esac
