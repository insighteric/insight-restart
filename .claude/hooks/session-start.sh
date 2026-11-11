#!/bin/bash
# Claude Code 클라우드 세션 시작 시 의존성 설치 (로컬 PC에서는 실행되지 않음)
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# npm 의존성 (.) : 매니페스트가 바뀐 경우에만 설치
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  npm install --no-save --no-audit --no-fund
  sha256sum .claude/hooks/session-start.sh package.json package-lock.json > "$hashes" 2>/dev/null || rm -f "$hashes"
fi
