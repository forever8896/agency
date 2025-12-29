#!/bin/bash
#
# The Agency v2 - Individual Agent Runner
# Usage: ./run-agent.sh <agent-name>
#

set -e

# Auto-detect installation path (override with AGENCY_DIR env var if needed)
AGENCY_DIR="${AGENCY_DIR:-$(dirname "$(realpath "$0")")}"
AGENT_NAME="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

declare -A AGENT_COLORS=(
    ["product-owner"]="$MAGENTA"
    ["tech-lead"]="$BLUE"
    ["dev-alpha"]="$GREEN"
    ["dev-beta"]="$GREEN"
    ["dev-gamma"]="$GREEN"
    ["qa"]="$YELLOW"
    ["devops"]="$CYAN"
)

usage() {
    echo -e "${CYAN}The Agency v2 - Squad Model${NC}"
    echo ""
    echo "Usage: $0 <agent-name>"
    echo ""
    echo "Available agents:"
    echo "  product-owner - Triages requests, defines acceptance criteria"
    echo "  tech-lead     - Technical decisions, unblocks devs, can code"
    echo "  dev-alpha     - Builder (general)"
    echo "  dev-beta      - Builder (backend/optimization focus)"
    echo "  dev-gamma     - Builder (frontend/UX focus)"
    echo "  qa            - Selective testing for critical paths"
    echo "  devops        - Deployment, monitoring, DORA metrics"
    exit 1
}

if [[ -z "$AGENT_NAME" ]]; then
    usage
fi

AGENT_DIR="$AGENCY_DIR/agents/$AGENT_NAME"

if [[ ! -d "$AGENT_DIR" ]]; then
    echo -e "${RED}Error: Unknown agent '$AGENT_NAME'${NC}"
    usage
fi

AGENT_PROMPT="$AGENT_DIR/AGENT.md"
AGENT_STATUS="$AGENT_DIR/status.md"
COLOR="${AGENT_COLORS[$AGENT_NAME]:-$NC}"

log() {
    echo -e "${COLOR}[$(date '+%Y-%m-%d %H:%M:%S')] [$AGENT_NAME]${NC} $1"
}

has_work() {
    case "$AGENT_NAME" in
        product-owner)
            # PO checks inbox for new requests
            grep -q "## NEW:" "$AGENCY_DIR/inbox.md" 2>/dev/null
            ;;
        tech-lead)
            # TL checks standup for blockers or backlog for complex items
            grep -q "BLOCKED:" "$AGENCY_DIR/standup.md" 2>/dev/null || \
            grep -q "## READY:" "$AGENCY_DIR/backlog.md" 2>/dev/null
            ;;
        dev-alpha|dev-beta|dev-gamma)
            # Devs check backlog for ready items not claimed
            grep -q "## READY:" "$AGENCY_DIR/backlog.md" 2>/dev/null
            ;;
        qa)
            # QA checks handoffs for qa-required items
            ls "$AGENCY_DIR/handoffs/"dev-to-qa-*.md 2>/dev/null | head -1 | grep -q . 2>/dev/null
            ;;
        devops)
            # DevOps checks for completed items to deploy
            grep -q "## DONE:" "$AGENCY_DIR/backlog.md" 2>/dev/null
            ;;
        *)
            return 1
            ;;
    esac
}

build_prompt() {
    local prompt
    prompt=$(cat "$AGENT_PROMPT")

    prompt="$prompt

## Squad Structure

- Inbox: $AGENCY_DIR/inbox.md
- Backlog: $AGENCY_DIR/backlog.md
- Board: $AGENCY_DIR/board.md
- Standup: $AGENCY_DIR/standup.md
- Handoffs: $AGENCY_DIR/handoffs/
- Projects: $AGENCY_DIR/projects/
- Knowledge: $AGENCY_DIR/knowledge/
- Metrics: $AGENCY_DIR/metrics.md
- Your Status: $AGENCY_DIR/agents/$AGENT_NAME/status.md

## Current Time
$(date '+%Y-%m-%d %H:%M:%S')

## Key Files Quick Reference

### backlog.md states:
- READY: - Available for devs to claim
- IN_PROGRESS: @dev-name - Being worked on
- DONE: - Completed, waiting for deploy
- SHIPPED: - Live in production

### standup.md
Update your section when starting/finishing work. Tech Lead monitors BLOCKED: items.

### Workflow
1. PO triages inbox → adds to backlog as READY
2. Devs claim READY items → mark IN_PROGRESS
3. Devs complete → mark DONE (create handoff to QA only if flagged)
4. DevOps deploys DONE items → mark SHIPPED
"
    echo "$prompt"
}

main() {
    log "${CYAN}Agent $AGENT_NAME coming online (v2 Squad Model)...${NC}"
    log "Status: $AGENT_STATUS"
    log "Backlog: $AGENCY_DIR/backlog.md"
    log "Standup: $AGENCY_DIR/standup.md"
    log "Press Ctrl+C to stop"
    echo ""

    while true; do
        if has_work; then
            log "${GREEN}Work detected, $AGENT_NAME engaging...${NC}"

            PROMPT=$(build_prompt)

            claude -p "$PROMPT" --dangerously-skip-permissions

            EXIT_CODE=$?
            log "Session ended (exit: $EXIT_CODE). Checking for more work in 10s..."
            sleep 10
        else
            log "No pending work. Waiting..."
            sleep 30
        fi
    done
}

trap 'echo ""; log "Agent $AGENT_NAME signing off..."; exit 0' INT

main
