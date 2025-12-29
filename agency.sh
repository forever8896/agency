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

usage() {
    banner
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start           Start all agents in background"
    echo "  stop            Stop all agents"
    echo "  status          Show agent status and DORA metrics"
    echo "  <agent-name>    Run single agent in foreground"
    echo ""
    echo "Agents: ${AGENTS[*]}"
    echo ""
    echo "Quick start:"
    echo "  1. Add a request to: $AGENCY_DIR/inbox.md"
    echo "  2. Run: $0 start"
    echo "  3. Watch: $AGENCY_DIR/backlog.md and $AGENCY_DIR/standup.md"
    echo ""
}

case "${1:-start}" in
    start)
        start_all
        ;;
    stop)
        stop_all
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
