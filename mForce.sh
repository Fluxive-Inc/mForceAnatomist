#!/bin/bash
# mForce.sh (v2) — Standard Automation Script · delegates deploy to mForceOS1.sh / mForceAPPs.sh
set -uo pipefail
NEON='\033[1;36m'; BLUE='\033[1;34m'; DEEP='\033[0;34m'; STAR='\033[1;37m'; NC='\033[0m'
print_header() { echo -e "${NEON}◆ mForce^OS · $PROJECT_NAME${NC}"; }

# --- CONFIG (must match the mForceAPPs.sh registry row) ---
PROJECT_NAME="mForceAnatomist"
OS1_NAME="anatomist"                 # short name in mForceAPPs.sh
GCP_PROJECT="mforceanatomist"
CR_SERVICE="mforceanatomist"
REGION="us-east1"
DATE=$(date +%Y%m%d_%H%M%S)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"    # resolves to fluxive-apps

cmd_info()   { print_header; echo -e "  Name: $PROJECT_NAME\n  Service: $CR_SERVICE ($GCP_PROJECT)\n  Date: $DATE"; }
cmd_doc()    { local f="${PROJECT_NAME}_documentation.md"; { echo "# $PROJECT_NAME"; echo "Generated $DATE"; echo '```'; find . -maxdepth 2 -not -path '*/.*'; echo '```'; } > "$f"; echo "→ $f"; }
cmd_status() { git status; }
cmd_checkout(){ git pull; }
cmd_checkin() { read -p "commit msg (default Update $DATE): " m; git add .; git commit -m "${m:-Update $DATE}"; git push; }
cmd_backup() { gsutil -q mb "gs://${OS1_NAME}-backups" 2>/dev/null; gsutil -mq cp -r . "gs://${OS1_NAME}-backups/backup_${DATE}" 2>/dev/null || echo "backup skipped (no gsutil/bucket)"; }
cmd_test()   { echo "Running tests..."; } # Stub for local tests
cmd_deploy() { bash "$ROOT/mForceAPPs.sh" deploy "$OS1_NAME"; }
cmd_clean()  { rm -rf dist build ./*.log; }
cmd_package(){ tar -czf "${PROJECT_NAME}_${DATE}.mForce" --exclude=node_modules --exclude=.git .; }
cmd_debug()  { git diff --stat; }
cmd_bake()   {
  echo -e "${NEON}🔥 BAKE $PROJECT_NAME${NC}"
  if ! cmd_test; then echo -e "${DEEP}❌ tests failed — aborting bake (nothing shipped).${NC}"; return 1; fi
  git add .; git commit -m "mForceBAKED_${PROJECT_NAME}_${DATE}" || true
  cmd_deploy
}

CMD="${1:-}"; [ -z "$CMD" ] && { print_header; read -p "cmd (info|test|deploy|bake|…): " CMD; }
case "$CMD" in
  0|info) cmd_info;; 1|doc) cmd_doc;; 2|status) cmd_status;; 3|checkout) cmd_checkout;;
  4|checkin) cmd_checkin;; 5|backup) cmd_backup;; 6|test) shift||true; cmd_test "$@";;
  7|deploy) cmd_deploy;; 8|clean) cmd_clean;; 9|package) cmd_package;; 10|debug) cmd_debug;;
  420|bake) cmd_bake;; *) echo "unknown: $CMD";;
esac
