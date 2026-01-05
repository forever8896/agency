#!/bin/bash
#
# Event Emitter - Sends real-time events to the dashboard
#
# Usage:
#   source emit-event.sh
#   emit "work_started" "dev-alpha" "Building login feature"
#
# Or standalone:
#   ./emit-event.sh work_started dev-alpha "Building login feature"
#
# Event Types:
#   agent_started   - Agent process started
#   agent_stopped   - Agent process stopped
#   work_found      - Agent found work to do
#   work_started    - Agent began working on a task
#   work_completed  - Agent finished a task
#   status_changed  - Task status changed (e.g., READY → IN_PROGRESS)
#   handoff_created - New handoff document created
#   error           - Something went wrong
#

# Dashboard server URL (can be overridden)
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3000}"

# Emit an event to the dashboard
# Args: event_type, agent_name, message, [extra_json_fields]
emit() {
    local event_type="${1:-unknown}"
    local agent="${2:-system}"
    local message="${3:-}"
    local extra="${4:-}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Build JSON payload
    local json="{\"type\":\"$event_type\",\"agent\":\"$agent\",\"message\":\"$message\",\"timestamp\":\"$timestamp\""

    # Add extra fields if provided
    if [[ -n "$extra" ]]; then
        json="${json},${extra}"
    fi

    json="${json}}"

    # Send to dashboard (async, don't block the agent)
    curl -s -X POST "$DASHBOARD_URL/api/events" \
        -H "Content-Type: application/json" \
        -d "$json" \
        --max-time 1 \
        >/dev/null 2>&1 &
}

# Convenience functions for common events
emit_started() {
    emit "agent_started" "$1" "Agent started"
}

emit_stopped() {
    emit "agent_stopped" "$1" "Agent stopped"
}

emit_work_found() {
    emit "work_found" "$1" "$2"
}

emit_work_started() {
    local agent="$1"
    local task="$2"
    local status="${3:-IN_PROGRESS}"
    emit "work_started" "$agent" "$task" "\"task\":\"$task\",\"status\":\"$status\""
}

emit_work_completed() {
    local agent="$1"
    local task="$2"
    local new_status="${3:-DONE}"
    emit "work_completed" "$agent" "$task" "\"task\":\"$task\",\"status\":\"$new_status\""
}

emit_status_change() {
    local agent="$1"
    local task="$2"
    local from_status="$3"
    local to_status="$4"
    emit "status_changed" "$agent" "$task: $from_status → $to_status" "\"task\":\"$task\",\"from\":\"$from_status\",\"to\":\"$to_status\""
}

emit_handoff() {
    local from="$1"
    local to="$2"
    local topic="$3"
    emit "handoff_created" "$from" "Handoff to $to: $topic" "\"from\":\"$from\",\"to\":\"$to\",\"topic\":\"$topic\""
}

emit_error() {
    emit "error" "$1" "$2"
}

# If run directly (not sourced), emit the event from args
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    emit "$@"
fi
