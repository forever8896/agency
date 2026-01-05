#!/bin/bash
#
# The Agency v2 - Individual Agent Runner
#
# Token-efficient design:
# - Agents spawn fresh for EACH task (no accumulated context)
# - Minimal prompt - just what's needed for current work
# - Exit after completing ONE task
#
# Usage: ./run-agent.sh <agent-name>
#

set -e

# ============================================================================
# CONFIGURATION - Override these with environment variables
# ============================================================================

# Agency files location (can be your Obsidian vault)
AGENCY_DIR="${AGENCY_DIR:-$(dirname "$(realpath "$0")")}"

# Runtime data directory (gitignored, contains actual work state)
DATA_DIR="${DATA_DIR:-$AGENCY_DIR/agency/data}"

# Where to create actual code projects (not specs, real code)
PROJECTS_DIR="${PROJECTS_DIR:-$HOME/projects}"

# How long to wait between checking for work (seconds)
POLL_INTERVAL="${POLL_INTERVAL:-30}"

# ============================================================================

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
    ["reviewer"]="$MAGENTA"
    ["devops"]="$CYAN"
)

usage() {
    echo -e "${CYAN}The Agency v2 - Squad Model${NC}"
    echo ""
    echo "Usage: $0 <agent-name>"
    echo ""
    echo "Configuration (via environment):"
    echo "  AGENCY_DIR    - Agency files location (default: script directory)"
    echo "  PROJECTS_DIR  - Where to create code projects (default: ~/projects)"
    echo "  POLL_INTERVAL - Seconds between work checks (default: 30)"
    echo ""
    echo "Examples:"
    echo "  AGENCY_DIR=~/obsidian/Agency ./run-agent.sh dev-alpha"
    echo "  PROJECTS_DIR=~/code ./run-agent.sh tech-lead"
    echo ""
    echo "Available agents:"
    echo "  product-owner - Triages requests, defines acceptance criteria"
    echo "  tech-lead     - Technical decisions, unblocks devs, can code"
    echo "  dev-alpha     - Builder (general)"
    echo "  dev-beta      - Builder (backend/optimization focus)"
    echo "  dev-gamma     - Builder (frontend/UX focus)"
    echo "  qa            - Quality gate, verifies work before shipping"
    echo "  reviewer      - Code quality reviews (optional)"
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
COLOR="${AGENT_COLORS[$AGENT_NAME]:-$NC}"

# ============================================================================
# TOKEN OPTIMIZATION: Smart model selection
# Use cheaper/faster models for simple verification tasks
# ============================================================================

# Model selection based on task complexity
# Override with MODEL env var: MODEL=opus ./run-agent.sh dev-alpha
get_model_for_agent() {
    # Allow override
    if [[ -n "${MODEL:-}" ]]; then
        echo "$MODEL"
        return
    fi

    case "$AGENT_NAME" in
        # Simple verification tasks - use haiku (fast, cheap)
        qa|devops)
            echo "haiku"
            ;;
        # Moderate complexity - use sonnet (balanced)
        product-owner|reviewer)
            echo "sonnet"
            ;;
        # Complex tasks - use sonnet (or opus for critical work)
        tech-lead|dev-alpha|dev-beta|dev-gamma)
            echo "sonnet"
            ;;
        *)
            echo "sonnet"
            ;;
    esac
}

AGENT_MODEL=$(get_model_for_agent)

log() {
    echo -e "${COLOR}[$(date '+%H:%M:%S')] [$AGENT_NAME]${NC} $1"
}

# Check if there's work for this agent type
# Returns 0 (true) if work exists, 1 (false) otherwise
has_work() {
    case "$AGENT_NAME" in
        product-owner)
            grep -q "## NEW:" "$DATA_DIR/inbox.md" 2>/dev/null
            ;;
        tech-lead)
            grep -q "BLOCKED:" "$DATA_DIR/standup.md" 2>/dev/null || \
            grep -q "## READY:" "$DATA_DIR/backlog.md" 2>/dev/null
            ;;
        dev-alpha|dev-beta|dev-gamma)
            grep -q "## READY:" "$DATA_DIR/backlog.md" 2>/dev/null
            ;;
        qa)
            # QA verifies completed work before shipping
            grep -q "## DONE:" "$DATA_DIR/backlog.md" 2>/dev/null
            ;;
        reviewer)
            # Reviewer handles QA_PASSED items flagged for review, or explicit review requests
            grep -q "## QA_PASSED:.*Review Required: yes" "$DATA_DIR/backlog.md" 2>/dev/null || \
            grep -q "Review Required: yes" "$DATA_DIR/backlog.md" 2>/dev/null && \
            grep -q "## QA_PASSED:" "$DATA_DIR/backlog.md" 2>/dev/null || \
            ls "$DATA_DIR/handoffs/review-request-"*.md >/dev/null 2>&1
            ;;
        devops)
            # DevOps ships QA_PASSED items (no review) or REVIEWED items (review done)
            grep -q "## QA_PASSED:" "$DATA_DIR/backlog.md" 2>/dev/null || \
            grep -q "## REVIEWED:" "$DATA_DIR/backlog.md" 2>/dev/null
            ;;
        *)
            return 1
            ;;
    esac
}

# ============================================================================
# TOKEN OPTIMIZATION: Pre-filter context for each agent type
# Instead of loading full files, extract only relevant sections
# ============================================================================

# Extract only relevant backlog items for this agent (saves ~80% tokens)
get_filtered_backlog() {
    local backlog="$DATA_DIR/backlog.md"
    [[ ! -f "$backlog" ]] && return

    case "$AGENT_NAME" in
        product-owner)
            # PO needs: header + READY items count only
            head -30 "$backlog" | grep -E "^(#|## READY:)" 2>/dev/null
            echo ""
            echo "<!-- $(grep -c "## READY:" "$backlog" 2>/dev/null || echo 0) items ready -->"
            ;;
        tech-lead)
            # TL needs: READY items + any BLOCKED mentions
            grep -E "^(## READY:|## IN_PROGRESS:)" "$backlog" 2>/dev/null | head -10
            ;;
        dev-alpha|dev-beta|dev-gamma)
            # Devs need: READY items only (first 5), their own IN_PROGRESS
            echo "=== Available Work ==="
            grep -A 5 "## READY:" "$backlog" 2>/dev/null | head -30
            echo ""
            echo "=== Your Current Work ==="
            grep -A 3 "## IN_PROGRESS:.*@$AGENT_NAME" "$backlog" 2>/dev/null
            ;;
        qa)
            # QA needs: DONE items only (compact: just title + Files line)
            echo "=== Items to Verify ==="
            grep -A 2 "## DONE:" "$backlog" 2>/dev/null | grep -E "(## DONE:|^\*\*Files:)" | head -20
            ;;
        reviewer)
            # Reviewer needs: QA_PASSED items flagged for review
            grep -A 3 "## QA_PASSED:.*Review Required: yes" "$backlog" 2>/dev/null | head -20
            ;;
        devops)
            # DevOps needs: QA_PASSED or REVIEWED items
            grep -E "^## (QA_PASSED|REVIEWED):" "$backlog" 2>/dev/null | head -10
            ;;
    esac
}

# Extract only relevant standup entries (saves ~50% tokens)
get_filtered_standup() {
    local standup="$DATA_DIR/standup.md"
    [[ ! -f "$standup" ]] && return

    case "$AGENT_NAME" in
        tech-lead)
            # TL needs: BLOCKED entries only
            grep -B 2 -A 3 "BLOCKED:" "$standup" 2>/dev/null
            ;;
        dev-alpha|dev-beta|dev-gamma)
            # Devs need: their own section + any relevant blockers
            awk "/## $AGENT_NAME/,/^## [a-z]/" "$standup" 2>/dev/null | head -10
            ;;
        *)
            # Others: minimal or none
            echo "<!-- standup context not needed for $AGENT_NAME -->"
            ;;
    esac
}

# Get recent handoffs relevant to this agent (max 2)
get_relevant_handoffs() {
    local handoffs_dir="$DATA_DIR/handoffs"
    [[ ! -d "$handoffs_dir" ]] && return

    case "$AGENT_NAME" in
        dev-alpha|dev-beta|dev-gamma)
            # Get handoffs addressed to this dev (newest first, max 2)
            ls -t "$handoffs_dir"/tl-to-"$AGENT_NAME"-*.md 2>/dev/null | head -2 | while read f; do
                echo "=== $(basename "$f") ==="
                head -30 "$f"
                echo ""
            done
            ;;
        tech-lead)
            # Get any qa-bug reports (newest first, max 2)
            ls -t "$handoffs_dir"/qa-bug-*.md 2>/dev/null | head -2 | while read f; do
                echo "=== $(basename "$f") ==="
                head -20 "$f"
                echo ""
            done
            ;;
    esac
}

# Build minimal prompt - just what the agent needs for THIS task
# Key insight: Don't load everything, just the relevant context
# OPTIMIZATION: Pre-filter context to reduce tokens by ~70%
build_prompt() {
    local prompt
    prompt=$(cat "$AGENT_PROMPT")

    # Add paths (minimal)
    prompt="$prompt

## Paths
- **Data:** $DATA_DIR
- **Projects:** $PROJECTS_DIR
- **Time:** $(date '+%Y-%m-%d %H:%M:%S')

## PRE-FILTERED CONTEXT (saves tokens - don't re-read full files)

### Backlog (filtered for your role)
$(get_filtered_backlog)

### Standup (filtered)
$(get_filtered_standup)

### Relevant Handoffs
$(get_relevant_handoffs)

## RULES

1. **ONE TASK, THEN EXIT** - Complete one item, update files, stop
2. **DON'T RE-READ** - Context above is pre-filtered, use it directly
3. **CONCISE UPDATES** - Max 2-3 sentences in standup/summaries
4. **EXIT WHEN DONE** - Just stop responding after completing work

When done (or no actionable work), stop immediately.
"
    echo "$prompt"
}

main() {
    log "Starting (DATA_DIR=$DATA_DIR, PROJECTS_DIR=$PROJECTS_DIR, MODEL=$AGENT_MODEL)"

    while true; do
        if has_work; then
            log "${GREEN}Work found - spawning $AGENT_MODEL session...${NC}"

            PROMPT=$(build_prompt)

            # Spawn fresh Claude session for this ONE task
            # Using --dangerously-skip-permissions for autonomous operation
            # Session ends when agent completes task and stops responding
            # Model selection: haiku for QA/DevOps, sonnet for devs
            # Note: haiku supports vision for Playwright screenshot verification
            claude -p "$PROMPT" --dangerously-skip-permissions --model "$AGENT_MODEL"

            EXIT_CODE=$?
            log "Session ended (exit: $EXIT_CODE)"

            # Brief pause before checking for more work
            sleep 5
        else
            log "No work. Sleeping ${POLL_INTERVAL}s..."
            sleep "$POLL_INTERVAL"
        fi
    done
}

trap 'echo ""; log "Shutting down..."; exit 0' INT TERM

main
