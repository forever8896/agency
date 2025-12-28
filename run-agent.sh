#!/bin/bash
#
# The Agency - Individual Agent Runner
# Usage: ./run-agent.sh <agent-name>
#

set -e

# Configure this to your installation path
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
    ["dispatcher"]="$MAGENTA"
    ["architect"]="$BLUE"
    ["developer"]="$GREEN"
    ["qa"]="$YELLOW"
    ["reviewer"]="$CYAN"
)

usage() {
    echo -e "${CYAN}The Agency - Agent Runner${NC}"
    echo ""
    echo "Usage: $0 <agent-name>"
    echo ""
    echo "Available agents:"
    echo "  dispatcher  - Triages requests, assigns work"
    echo "  architect   - Designs systems, creates specs"
    echo "  developer   - Implements features, writes code"
    echo "  qa          - Tests and verifies work"
    echo "  reviewer    - Final quality gate"
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
AGENT_GOALS="$AGENT_DIR/goals.md"
AGENT_STATUS="$AGENT_DIR/status.md"
COLOR="${AGENT_COLORS[$AGENT_NAME]:-$NC}"

log() {
    echo -e "${COLOR}[$(date '+%Y-%m-%d %H:%M:%S')] [$AGENT_NAME]${NC} $1"
}

has_work() {
    case "$AGENT_NAME" in
        dispatcher)
            grep -q "## NEW:" "$AGENCY_DIR/inbox.md" 2>/dev/null
            ;;
        *)
            grep -q "## PENDING:" "$AGENT_GOALS" 2>/dev/null
            ;;
    esac
}

build_prompt() {
    local prompt
    prompt=$(cat "$AGENT_PROMPT")

    prompt="$prompt

## Agency Structure

- Inbox: $AGENCY_DIR/inbox.md
- Board: $AGENCY_DIR/board.md
- Handoffs: $AGENCY_DIR/handoffs/
- Projects: $AGENCY_DIR/projects/
- Knowledge: $AGENCY_DIR/knowledge/
- Your Goals: $AGENCY_DIR/agents/$AGENT_NAME/goals.md
- Your Status: $AGENCY_DIR/agents/$AGENT_NAME/status.md

## Current Time
$(date '+%Y-%m-%d %H:%M:%S')
"
    echo "$prompt"
}

main() {
    log "${CYAN}Agent $AGENT_NAME coming online...${NC}"
    log "Goals: $AGENT_GOALS"
    log "Status: $AGENT_STATUS"
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
