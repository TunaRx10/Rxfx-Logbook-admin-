#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────
#  pii-lint.sh — CI guard against unscrubbed PII in Cloud Logging output
# ────────────────────────────────────────────────────────────────────
#
#  Purpose: prevent regression of the 2026 PII audit fixes by blocking
#  any new `logger.X("label", { uid | email | customerEmail | ... })`
#  call site that does NOT first wrap the payload in `scrubPii(...)`.
#
#  Exit codes:
#    0  clean (no leaks detected)
#    1  leaks detected — counted + first 5 sample lines echoed
#    2  rg missing — script error
#
#  Usage:  bash scripts/pii-lint.sh
#
#  The grep pattern matches any `logger.{info,warn,error,debug}("LABEL",
#  { ...pii-keyword... })` site and the script ABORTS if any such
#  line is found WITHOUT an enclosing `scrubPii(` reference in the
#  immediately preceding 4 lines (a defense-in-depth heuristic: the
#  scrub call typically sits on the line right above the logger call).
# ────────────────────────────────────────────────────────────────────

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FUNCTIONS_DIR="${ROOT_DIR}/functions"

# Sanity check
if [[ ! -d "${FUNCTIONS_DIR}" ]]; then
  echo "❌ pii-lint: functions/ directory not found at ${FUNCTIONS_DIR}" >&2
  exit 2
fi
if ! command -v rg >/dev/null 2>&1; then
  echo "❌ pii-lint: ripgrep (rg) is required. Install via your package manager." >&2
  exit 2
fi

echo "🔒 pii-lint: scanning ${FUNCTIONS_DIR} for unscrubbed PII in logger.X(...)"

# 1. Find every logger.X call site with a PII keyword in the same payload.
#    We capture the file + line number + the matched line so the audit
#    output is actionable. The `(?i)` case-insensitive match catches
#    any of the canonical PII identifiers (uid / userId / email /
#    customerEmail / customerDiscordId / customerId / etc.).
LEAKS_FILE="$(mktemp)"
trap 'rm -f "${LEAKS_FILE}"' EXIT

# Pattern: logger.(info|warn|error|debug)("label", { ...any-pii-key... })
rg --line-number --color never \
   --type js \
   -e 'logger\.(info|warn|error|debug)\([^,)]*,\s*\{[^}]*\b(uid|userId|user_id|email|customerEmail|customerId|customerDiscordId|customerTelegramId)\b' \
   "${FUNCTIONS_DIR}" \
   > "${LEAKS_FILE}" || true

LEAK_COUNT=$(wc -l < "${LEAKS_FILE}" | tr -d ' ')

if [[ "${LEAK_COUNT}" == "0" ]]; then
  echo "  ✅ clean — no unscrubbed PII in any logger payload"
  exit 0
fi

# 2. For each leak, check whether `scrubPii(` appears in the 4 lines
#    immediately above (the typical scrub-call pattern). If yes, the
#    log call is already wrapped and we skip it.
echo "  ⚠️  found ${LEAK_COUNT} potential PII log site(s); checking each for scrubPii(...) wrapper..." >&2

VERIFIED_LEAKS_FILE="$(mktemp)"
trap 'rm -f "${LEAKS_FILE}" "${VERIFIED_LEAKS_FILE}"' EXIT

while IFS= read -r line; do
  filepath="$(echo "${line}" | cut -d: -f1)"
  lineno="$(echo "${line}" | cut -d: -f2)"

  # Resolve to absolute path
  if [[ "${filepath}" != /* ]]; then
    filepath="${FUNCTIONS_DIR}/${filepath}"
  fi

  # Pull a 4-line window BEFORE the offending line and grep for `scrubPii`
  if [[ -f "${filepath}" ]]; then
    START_LINE=$(( lineno - 4 ))
    [[ "${START_LINE}" -lt 1 ]] && START_LINE=1
    WINDOW=$(sed -n "${START_LINE},$(( lineno - 1 ))p" "${filepath}")
    if echo "${WINDOW}" | grep -q "scrubPii"; then
      # Already wrapped — skip.
      continue
    fi
  fi

  echo "${line}" >> "${VERIFIED_LEAKS_FILE}"
done < "${LEAKS_FILE}"

VERIFIED_COUNT=$(wc -l < "${VERIFIED_LEAKS_FILE}" | tr -d ' ')

if [[ "${VERIFIED_COUNT}" == "0" ]]; then
  echo "  ✅ clean — every flagged logger.X site already wraps payload in scrubPii(...)"
  exit 0
fi

echo "" >&2
echo "❌ pii-lint: ${VERIFIED_COUNT} unscrubbed PII leak(s) detected:" >&2
echo "" >&2
head -5 "${VERIFIED_LEAKS_FILE}" >&2
if [[ "${VERIFIED_COUNT}" -gt 5 ]]; then
  echo "... +$(( VERIFIED_COUNT - 5 )) more" >&2
fi
echo "" >&2
echo "Fix: wrap the offending payload in scrubPii(...) BEFORE the logger call." >&2
echo "Example:" >&2
echo '  logger.info("suby webhook: ✓ payment", { eventType, uid, paymentId });' >&2
echo "" >&2
echo "becomes:" >&2
echo '  logger.info("suby webhook: ✓ payment", scrubPii({ eventType, uid, paymentId }));' >&2

exit 1
