# The Agency

An autonomous multi-agent development team powered by Claude Code.

Drop a request in the inbox. Watch five AI agents research, design, build, test, and ship.

## What This Is

A bash-based orchestration system that runs multiple Claude Code sessions as specialized agents. Each agent has a role, a personality, and a task queue. They communicate through markdown files.

```
You                     The Agency
 │                          │
 ├─► inbox.md              │
 │                          │
 │                Dispatcher │─► triages, assigns
 │                          │
 │                Architect  │─► designs, specs
 │                          │
 │                Developer  │─► builds code
 │                          │
 │                QA         │─► tests, verifies
 │                          │
 │                Reviewer   │─► approves, ships
 │                          │
 │◄── board.md ─────────────┤
```

## Disclaimer

**This is an experiment, not production software.**

Token usage is high. The agents work, but coordination overhead adds up. I'm sharing this so others can experiment with their own setups. I'll keep iterating on mine to find what makes sense in terms of speed, cost, and coordination.

Use at your own risk. Monitor your usage.

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- Bash shell (Linux/macOS/WSL)
- A Claude subscription (for `--dangerously-skip-permissions` to work economically)

## Setup

```bash
# Clone the repo
git clone https://github.com/forever8896/agency.git
cd agency

# Make scripts executable
chmod +x agency.sh run-agent.sh

# Edit the AGENCY_DIR path in both scripts to point to your installation
# Default is ~/agency - change if needed

# Optional: create global command
sudo ln -sf $(pwd)/agency.sh /usr/local/bin/agency
```

## Quick Start

```bash
# 1. Add a request
cat >> inbox.md << 'EOF'
## NEW: Build a simple CLI todo app
**Priority:** high
**Description:** Command-line todo app with add, list, complete, delete
**Context:** Use Python, keep it simple, single file
EOF

# 2. Start the agency
./agency.sh start

# 3. Watch progress
tail -f logs/*.log

# Or watch the board
watch cat board.md
```

## Commands

```bash
./agency.sh start      # Start all agents in background
./agency.sh stop       # Stop all agents
./agency.sh status     # Show what each agent is doing
./agency.sh dispatcher # Run single agent in foreground (for debugging)
```

## Directory Structure

```
agency/
├── inbox.md              # Drop requests here (## NEW: ...)
├── board.md              # Kanban view of all work
├── standup.md            # Agent status summary
├── agents/
│   ├── dispatcher/
│   │   ├── AGENT.md      # Role definition and instructions
│   │   ├── goals.md      # Task queue (## PENDING: ...)
│   │   └── status.md     # Current status
│   ├── architect/
│   ├── developer/
│   ├── qa/
│   └── reviewer/
├── handoffs/             # Inter-agent communication
├── projects/             # Project specs and docs
├── knowledge/            # Shared context, decisions
├── logs/                 # Session logs
├── agency.sh             # Main orchestrator
└── run-agent.sh          # Individual agent runner
```

## How It Works

1. **You** add a request to `inbox.md` with the `## NEW:` header
2. **Dispatcher** sees it, triages, creates tasks, assigns to specialists
3. **Architect** designs the system, writes specs, hands off to Developer
4. **Developer** builds the code, hands off to QA
5. **QA** tests everything, hands off to Reviewer
6. **Reviewer** approves or sends back for changes
7. **Board** shows the final status

Communication happens through markdown files in `handoffs/`. Each agent writes structured handoff documents explaining what they did and what the next agent needs to know.

## Request Format

```markdown
## NEW: Your Request Title
**Priority:** critical/high/medium/low
**Description:** What you want built
**Context:** Background, preferences, constraints
```

## Customizing Agents

Edit `agents/<name>/AGENT.md` to change:
- Personality and tone
- Workflow rules
- Output formats
- What they pay attention to

The agent prompts are designed to be modified. Experiment with different instructions.

## Watching Progress

- **board.md** - See tasks flow through columns
- **agents/*/status.md** - What each agent is thinking
- **handoffs/** - Communication between agents
- **logs/*.log** - Full Claude session output

## Known Limitations

- **Token usage is high** - Multiple agents means multiple sessions means lots of tokens
- **Latency** - File-based communication isn't instant
- **No parallelism** - Each agent runs one task at a time
- **Requires babysitting** - Agents can get stuck, loop, or misunderstand
- **Experimental** - This is a proof of concept, not a polished tool

## Tips

1. **Be specific** - Vague requests lead to vague results
2. **Start small** - Test with simple tasks first
3. **Watch the logs** - You'll learn a lot about how agents think
4. **Intervene** - Edit any file to redirect work
5. **Monitor costs** - Check your Claude usage dashboard

## Why File-Based?

Everything is readable markdown. You can:
- Open in Obsidian or any editor
- Track changes with git
- Edit files to intervene
- Read agent thinking as it happens
- Keep a record of what was built and why

## License

MIT - do whatever you want with this.

## Credits

Inspired by the experiments of [Denislav Gavrilov](https://x.com/kuberdenis) and many others exploring autonomous AI systems.
