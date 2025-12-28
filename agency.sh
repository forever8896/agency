#!/bin/bash
#
# The Agency - Multi-Agent Orchestrator
#
# Usage:
#   ./agency.sh              - Start all agents
#   ./agency.sh start        - Start all agents
#   ./agency.sh stop         - Stop all agents
#   ./agency.sh status       - Show agent status
#   ./agency.sh <agent>      - Run single agent (dispatcher, architect, developer, qa, reviewer)
#

set -e

# Configure this to your installation path
AGENCY_DIR="${AGENCY_DIR:-$(dirname "$(realpath "$0")")}"
PID_DIR="$AGENCY_DIR/logs/pids"
AGENTS=("dispatcher" "architect" "developer" "qa" "reviewer")

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
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║                      THE AGENCY                            ║"
    echo "║                                                            ║"
    echo "║          Autonomous Multi-Agent Development Team           ║"
    echo "║                                                            ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Dispatcher  │  Architect  │  Developer  │  QA  │ Reviewer ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

start_agent() {
    local agent=$1
    local pid_file="$PID_DIR/${agent}.pid"

    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo -e "${YELLOW}[$agent]${NC} Already running (PID: $(cat "$pid_file"))"
        return
    fi

    echo -e "${GREEN}[$agent]${NC} Starting..."
    nohup "$AGENCY_DIR/run-agent.sh" "$agent" > "$AGENCY_DIR/logs/${agent}.log" 2>&1 &
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
    local status_file="$AGENCY_DIR/agents/$agent/status.md"

    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        local pid=$(cat "$pid_file")
        echo -e "${GREEN}●${NC} $agent (PID: $pid)"
        if [[ -f "$status_file" ]]; then
            local current=$(grep "^\*\*Current:\*\*" "$status_file" 2>/dev/null | head -1 | sed 's/\*\*Current:\*\* //')
            if [[ -n "$current" ]]; then
                echo -e "  └─ $current"
            fi
        fi
    else
        echo -e "${RED}○${NC} $agent (stopped)"
    fi
}

start_all() {
    banner
    echo -e "${BOLD}Starting all agents...${NC}"
    echo ""
    for agent in "${AGENTS[@]}"; do
        start_agent "$agent"
    done
    echo ""
    echo -e "${GREEN}Agency is now operational.${NC}"
    echo -e "Add requests to: ${CYAN}$AGENCY_DIR/inbox.md${NC}"
    echo -e "Watch progress on: ${CYAN}$AGENCY_DIR/board.md${NC}"
    echo ""
    echo -e "View logs: tail -f $AGENCY_DIR/logs/*.log"
    echo -e "Stop all: $0 stop"
}

stop_all() {
    echo -e "${BOLD}Stopping all agents...${NC}"
    echo ""
    for agent in "${AGENTS[@]}"; do
        stop_agent "$agent"
    done
    echo ""
    echo -e "${RED}Agency is now offline.${NC}"
}

show_status() {
    banner
    echo -e "${BOLD}Agent Status:${NC}"
    echo ""
    for agent in "${AGENTS[@]}"; do
        status_agent "$agent"
    done
    echo ""
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
    echo "  status          Show agent status"
    echo "  <agent-name>    Run single agent in foreground"
    echo ""
    echo "Agents: ${AGENTS[*]}"
    echo ""
    echo "Quick start:"
    echo "  1. Add a request to: $AGENCY_DIR/inbox.md"
    echo "  2. Run: $0 start"
    echo "  3. Watch: $AGENCY_DIR/board.md"
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
    dispatcher|architect|developer|qa|reviewer)
        run_single "$1"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        usage
        exit 1
        ;;
esac
