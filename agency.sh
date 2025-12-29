#!/bin/bash
#
# The Agency v2 - Squad Model Orchestrator
#
# Based on data-driven research:
# - DORA metrics for measuring performance
# - Spotify squad model for team structure
# - Amazon two-pizza teams for sizing
# - Async standups to reduce interrupt cost
# - Reduced handoffs for faster cycle time
# - Token-efficient stateless agents
#
# Usage:
#   ./agency.sh              - Start all agents
#   ./agency.sh start        - Start all agents
#   ./agency.sh stop         - Stop all agents
#   ./agency.sh status       - Show agent status
#   ./agency.sh <agent>      - Run single agent
#
# Configuration (environment variables):
#   AGENCY_DIR    - Agency files (default: script dir, can be Obsidian vault)
#   PROJECTS_DIR  - Code projects location (default: ~/projects)
#   POLL_INTERVAL - Seconds between work checks (default: 30)
#
# Examples:
#   AGENCY_DIR=~/obsidian/Agency ./agency.sh start
#   PROJECTS_DIR=~/code AGENCY_DIR=~/obsidian/Agency ./agency.sh start
#

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

# Agency files location (can point to your Obsidian vault)
AGENCY_DIR="${AGENCY_DIR:-$(dirname "$(realpath "$0")")}"

# Where agents create actual code projects (not specs)
PROJECTS_DIR="${PROJECTS_DIR:-$HOME/projects}"

# How often agents check for work (seconds)
POLL_INTERVAL="${POLL_INTERVAL:-30}"

# Export for child processes (run-agent.sh)
export AGENCY_DIR PROJECTS_DIR POLL_INTERVAL

PID_DIR="$AGENCY_DIR/.pids"

# Squad composition based on research:
# - 5-6 devs per 1-2 QA (we have 3 devs + tech-lead who can code = ~4 builders)
# - Cross-functional team with end-to-end ownership
AGENTS=("product-owner" "tech-lead" "dev-alpha" "dev-beta" "dev-gamma" "qa" "devops")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Agent colors for logging
declare -A AGENT_COLORS=(
    ["product-owner"]="$MAGENTA"
    ["tech-lead"]="$BLUE"
    ["dev-alpha"]="$GREEN"
    ["dev-beta"]="$GREEN"
    ["dev-gamma"]="$GREEN"
    ["qa"]="$YELLOW"
    ["devops"]="$CYAN"
)

mkdir -p "$PID_DIR"

banner() {
    echo -e "${BOLD}${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                    ║"
    echo "║                      THE AGENCY v2                                 ║"
    echo "║                                                                    ║"
    echo "║               Squad Model - Data-Driven Design                     ║"
    echo "║                                                                    ║"
    echo "╠════════════════════════════════════════════════════════════════════╣"
    echo "║  PO │ Tech Lead │ Dev α │ Dev β │ Dev γ │ QA │ DevOps             ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "${YELLOW}Research-backed improvements:${NC}"
    echo "  • 3 developers (vs 1) - optimal dev:QA ratio"
    echo "  • Async standups - saves ~4 hrs/week interrupt cost"
    echo "  • Selective QA - not every change needs full testing"
    echo "  • Direct claiming - reduced handoff bottlenecks"
    echo "  • DORA metrics - tracking what matters"
    echo "  • Stateless agents - spawn fresh, exit when done (token efficient)"
    echo ""
    echo -e "${BLUE}Configuration:${NC}"
    echo "  AGENCY_DIR=$AGENCY_DIR"
    echo "  PROJECTS_DIR=$PROJECTS_DIR"
    echo "  POLL_INTERVAL=${POLL_INTERVAL}s"
    echo ""
}

start_agent() {
    local agent=$1
    local pid_file="$PID_DIR/${agent}.pid"

    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo -e "${YELLOW}[$agent]${NC} Already running (PID: $(cat "$pid_file"))"
        return
    fi

    echo -e "${GREEN}[$agent]${NC} Starting..."
    nohup "$AGENCY_DIR/run-agent.sh" "$agent" > /dev/null 2>&1 &
    echo $! > "$pid_file"
    echo -e "${GREEN}[$agent]${NC} Started (PID: $!)"
}

stop_agent() {
    local agent=$1
    local pid_file="$PID_DIR/${agent}.pid"

    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}[$agent]${NC} Stopping (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            rm -f "$pid_file"
            echo -e "${RED}[$agent]${NC} Stopped"
        else
            echo -e "${YELLOW}[$agent]${NC} Not running (stale PID file removed)"
            rm -f "$pid_file"
        fi
    else
        echo -e "${YELLOW}[$agent]${NC} Not running"
    fi
}

status_agent() {
    local agent=$1
    local pid_file="$PID_DIR/${agent}.pid"

    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        local pid=$(cat "$pid_file")
        echo -e "${GREEN}●${NC} $agent (PID: $pid)"
        # Try to get status from standup
        local standup_status=$(grep -A 5 "## $agent" "$AGENCY_DIR/standup.md" 2>/dev/null | grep "Working on:" | head -1 | sed 's/\*\*Working on:\*\* //')
        if [[ -n "$standup_status" && "$standup_status" != "--" ]]; then
            echo -e "  └─ $standup_status"
        fi
    else
        echo -e "${RED}○${NC} $agent (stopped)"
    fi
}

start_all() {
    banner
    echo -e "${BOLD}Starting squad...${NC}"
    echo ""
    for agent in "${AGENTS[@]}"; do
        start_agent "$agent"
    done
    echo ""
    echo -e "${GREEN}Squad is now operational.${NC}"
    echo ""
    echo -e "Add requests to:    ${CYAN}$AGENCY_DIR/inbox.md${NC}"
    echo -e "Watch backlog:      ${CYAN}$AGENCY_DIR/backlog.md${NC}"
    echo -e "See standup:        ${CYAN}$AGENCY_DIR/standup.md${NC}"
    echo -e "Track DORA metrics: ${CYAN}$AGENCY_DIR/metrics.md${NC}"
    echo -e "Code projects in:   ${CYAN}$PROJECTS_DIR${NC}"
    echo ""
    echo -e "Stop all: $0 stop"
}

stop_all() {
    echo -e "${BOLD}Stopping squad...${NC}"
    echo ""
    for agent in "${AGENTS[@]}"; do
        stop_agent "$agent"
    done
    echo ""
    echo -e "${RED}Squad is now offline.${NC}"
}

show_status() {
    banner
    echo -e "${BOLD}Squad Status:${NC}"
    echo ""
    for agent in "${AGENTS[@]}"; do
        status_agent "$agent"
    done
    echo ""

    # Show DORA metrics summary if available
    if [[ -f "$AGENCY_DIR/metrics.md" ]]; then
        echo -e "${BOLD}DORA Metrics:${NC}"
        grep -A 4 "## Current Period" "$AGENCY_DIR/metrics.md" 2>/dev/null | tail -4 || true
        echo ""
    fi
}

run_single() {
    local agent=$1
    if [[ ! -d "$AGENCY_DIR/agents/$agent" ]]; then
        echo -e "${RED}Error: Unknown agent '$agent'${NC}"
        echo "Available: ${AGENTS[*]}"
        exit 1
    fi
    banner
    echo -e "${BOLD}Running $agent in foreground...${NC}"
    echo ""
    exec "$AGENCY_DIR/run-agent.sh" "$agent"
}

# ============================================================================
# WATCH MODE - Live event logging without token usage
# ============================================================================

# Store file checksums for change detection
declare -A FILE_CHECKSUMS

get_checksum() {
    md5sum "$1" 2>/dev/null | cut -d' ' -f1 || echo "none"
}

init_checksums() {
    FILE_CHECKSUMS["inbox"]=$(get_checksum "$AGENCY_DIR/inbox.md")
    FILE_CHECKSUMS["backlog"]=$(get_checksum "$AGENCY_DIR/backlog.md")
    FILE_CHECKSUMS["standup"]=$(get_checksum "$AGENCY_DIR/standup.md")
    FILE_CHECKSUMS["board"]=$(get_checksum "$AGENCY_DIR/board.md")
}

log_event() {
    local icon="$1"
    local color="$2"
    local message="$3"
    echo -e "${color}$icon ${NC}[$(date '+%H:%M:%S')] $message"
}

check_inbox_changes() {
    local new_checksum=$(get_checksum "$AGENCY_DIR/inbox.md")
    if [[ "${FILE_CHECKSUMS["inbox"]}" != "$new_checksum" ]]; then
        FILE_CHECKSUMS["inbox"]="$new_checksum"
        # Check for new requests
        local new_count=$(grep -c "## NEW:" "$AGENCY_DIR/inbox.md" 2>/dev/null || echo 0)
        if [[ "$new_count" -gt 0 ]]; then
            log_event "📥" "$MAGENTA" "Inbox: $new_count new request(s) waiting"
        fi
        local triaged=$(grep "## TRIAGED:" "$AGENCY_DIR/inbox.md" 2>/dev/null | tail -1 | sed 's/## TRIAGED: //')
        if [[ -n "$triaged" ]]; then
            log_event "✓ " "$GREEN" "PO triaged: $triaged"
        fi
    fi
}

check_backlog_changes() {
    local new_checksum=$(get_checksum "$AGENCY_DIR/backlog.md")
    if [[ "${FILE_CHECKSUMS["backlog"]}" != "$new_checksum" ]]; then
        FILE_CHECKSUMS["backlog"]="$new_checksum"

        # Check for state changes
        local ready=$(grep -c "## READY:" "$AGENCY_DIR/backlog.md" 2>/dev/null || echo 0)
        local in_progress=$(grep "## IN_PROGRESS:" "$AGENCY_DIR/backlog.md" 2>/dev/null | tail -1)
        local done=$(grep "## DONE:" "$AGENCY_DIR/backlog.md" 2>/dev/null | tail -1)
        local shipped=$(grep "## SHIPPED:" "$AGENCY_DIR/backlog.md" 2>/dev/null | tail -1)

        if [[ -n "$in_progress" ]]; then
            local task=$(echo "$in_progress" | sed 's/## IN_PROGRESS: //')
            log_event "🔨" "$GREEN" "Work started: $task"
        fi
        if [[ -n "$done" ]]; then
            local task=$(echo "$done" | sed 's/## DONE: //')
            log_event "✅" "$CYAN" "Completed: $task"
        fi
        if [[ -n "$shipped" ]]; then
            local task=$(echo "$shipped" | sed 's/## SHIPPED: //')
            log_event "🚀" "$BOLD" "SHIPPED: $task"
        fi
        if [[ "$ready" -gt 0 ]]; then
            log_event "📋" "$YELLOW" "Backlog: $ready item(s) ready for claiming"
        fi
    fi
}

check_standup_changes() {
    local new_checksum=$(get_checksum "$AGENCY_DIR/standup.md")
    if [[ "${FILE_CHECKSUMS["standup"]}" != "$new_checksum" ]]; then
        FILE_CHECKSUMS["standup"]="$new_checksum"

        # Check for blockers
        if grep -q "BLOCKED:" "$AGENCY_DIR/standup.md" 2>/dev/null; then
            local blocker=$(grep -A 1 "BLOCKED:" "$AGENCY_DIR/standup.md" | tail -1)
            log_event "🚫" "$RED" "BLOCKED: $blocker"
        fi

        # Check who's working
        for agent in "${AGENTS[@]}"; do
            local status=$(grep -A 2 "## $agent" "$AGENCY_DIR/standup.md" 2>/dev/null | grep "Status:" | sed 's/\*\*Status:\*\* //')
            if [[ "$status" == "Building" ]]; then
                local working=$(grep -A 3 "## $agent" "$AGENCY_DIR/standup.md" 2>/dev/null | grep "Working on:" | sed 's/\*\*Working on:\*\* //')
                if [[ -n "$working" && "$working" != "--" ]]; then
                    log_event "⚡" "${AGENT_COLORS[$agent]:-$NC}" "$agent: $working"
                fi
            fi
        done
    fi
}

check_handoffs() {
    local handoff_count=$(ls "$AGENCY_DIR/handoffs/"*.md 2>/dev/null | grep -v gitkeep | wc -l || echo 0)
    if [[ "$handoff_count" -gt 0 ]]; then
        for f in "$AGENCY_DIR/handoffs/"*.md; do
            [[ -f "$f" ]] || continue
            [[ "$f" == *".gitkeep" ]] && continue
            local basename=$(basename "$f")
            local checksum=$(get_checksum "$f")
            if [[ "${FILE_CHECKSUMS["$basename"]}" != "$checksum" ]]; then
                FILE_CHECKSUMS["$basename"]="$checksum"
                log_event "📨" "$BLUE" "Handoff: $basename"
            fi
        done
    fi
}

watch_loop() {
    banner
    echo -e "${BOLD}Live Activity Log${NC} (Ctrl+C to stop)"
    echo -e "${YELLOW}No token usage - just watching files${NC}"
    echo ""
    echo "─────────────────────────────────────────────────────────────"

    init_checksums

    while true; do
        check_inbox_changes
        check_backlog_changes
        check_standup_changes
        check_handoffs
        sleep 2
    done
}

# ============================================================================

usage() {
    banner
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start           Start all agents in background"
    echo "  stop            Stop all agents"
    echo "  watch           Live activity log (no token usage)"
    echo "  status          Show agent status and DORA metrics"
    echo "  <agent-name>    Run single agent in foreground"
    echo ""
    echo "Agents: ${AGENTS[*]}"
    echo ""
    echo "Quick start:"
    echo "  1. Add a request to: $AGENCY_DIR/inbox.md"
    echo "  2. Run: $0 start"
    echo "  3. Run: $0 watch   # See live activity"
    echo ""
}

case "${1:-start}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    watch)
        trap 'echo ""; echo -e "${YELLOW}Watch stopped.${NC}"; exit 0' INT TERM
        watch_loop
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        usage
        ;;
    product-owner|tech-lead|dev-alpha|dev-beta|dev-gamma|qa|devops)
        run_single "$1"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        usage
        exit 1
        ;;
esac
