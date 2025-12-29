# The Agency v2: Squad Model

An autonomous multi-agent development team powered by Claude Code - redesigned based on data-driven research.

## What Changed in v2?

This version implements findings from peer-reviewed research and industry data on high-performing engineering teams:

| v1 Problem | Research Finding | v2 Solution |
|------------|-----------------|-------------|
| 1 developer | 5-6 devs per 1-2 QA is optimal | 3 developers + tech lead who can code |
| 4 handoffs per task | Handoffs are "silent killers" | Direct claiming, 1-2 handoffs max |
| QA gates everything | Only 20-25% of effort should be QA | Selective QA for critical paths only |
| No real standups | Async saves ~4 hrs/week | Real async standup with blockers |
| No metrics | DORA metrics correlate with performance | Built-in DORA tracking |

## Research Sources

The redesign is based on:

- [DORA State of DevOps Report](https://dora.dev/research/) - 10 years, 32,000+ professionals
- [Spotify Squad Model](https://engineering.atspotify.com/) - Cross-functional autonomous teams
- [Amazon Two-Pizza Teams](https://www.thesandreckoner.co.uk/how-google-amazon-and-spotify-set-up-their-teams-for-success/) - Max 7 people with end-to-end ownership
- [Handoffs Research](https://www.scrum.org/resources/blog/why-handoffs-are-killing-your-agility) - Each handoff is a failure point
- [Developer:QA Ratio Studies](https://www.prolifics-testing.com/news/optimal-tester-to-developer-ratios) - 5-6 devs per 1-2 testers
- [Async Standup Research](https://www.parabol.co/blog/virtual-standups-vs-async-standups/) - 23 min focus recovery per interrupt

## The Squad

```
┌────────────────────────────────────────────────────────────────┐
│                        THE AGENCY v2                           │
│                      Squad Model                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌─────────────┐                                              │
│   │ Product     │─── Triages inbox, defines acceptance         │
│   │ Owner       │    criteria, prioritizes backlog             │
│   └─────────────┘                                              │
│          │                                                     │
│          ▼                                                     │
│   ┌─────────────┐                                              │
│   │ Tech Lead   │─── Architecture, unblocks devs,              │
│   │             │    CAN ALSO CODE (playing coach)             │
│   └─────────────┘                                              │
│          │                                                     │
│    ┌─────┼─────┐                                               │
│    ▼     ▼     ▼                                               │
│ ┌─────┐┌─────┐┌─────┐                                          │
│ │Dev α││Dev β││Dev γ│─── Parallel builders, claim              │
│ └─────┘└─────┘└─────┘    work directly, self-test              │
│    │     │     │                                               │
│    └─────┼─────┘                                               │
│          │                                                     │
│          ▼         (only if flagged)                           │
│   ┌─────────────┐  - - - - - - - - - ┐                         │
│   │ QA          │◄ - Security/payment │ Selective, not gate    │
│   └─────────────┘  - - - - - - - - - ┘                         │
│          │                                                     │
│          ▼                                                     │
│   ┌─────────────┐                                              │
│   │ DevOps      │─── Deploys, monitors, tracks DORA            │
│   └─────────────┘                                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Key Differences

### 1. Direct Claiming (No Dispatcher Bottleneck)
```
v1: Request → Dispatcher → Architect → Developer → QA → Reviewer → Done
v2: Request → PO → Backlog ← Devs claim → Self-test → DevOps deploy → Done
```

### 2. Selective QA
```
v1: ALL work goes through QA
v2: Only work flagged "QA Required: yes" goes to QA:
    - Security-sensitive features
    - Payment flows
    - Data migrations
    - Breaking changes
```

### 3. Parallel Development
```
v1: 1 developer, sequential work
v2: 3 developers, can work in parallel on different tasks
```

### 4. Async Standups
```
v1: standup.md was static
v2: standup.md is living document:
    - Each agent updates when starting/finishing work
    - BLOCKED: items are monitored by Tech Lead
    - No interrupt cost from synchronous meetings
```

### 5. DORA Metrics
```
v1: No metrics
v2: Track what matters:
    - Deployment Frequency (target: daily)
    - Lead Time (target: < 1 day)
    - Change Failure Rate (target: < 15%)
    - MTTR (target: < 1 hour)
```

## Quick Start

```bash
# 1. Add a request
cat >> inbox.md << 'EOF'
## NEW: Build a simple CLI todo app
**Priority:** P1
**Description:** Command-line todo app with add, list, complete, delete
**Context:** Use Python, keep it simple
EOF

# 2. Start the squad
./agency.sh start

# 3. Watch progress
watch -n 5 'cat standup.md && echo "---" && cat backlog.md'
```

## Directory Structure

```
agency/
├── inbox.md              # Drop requests here (## NEW: ...)
├── backlog.md            # Prioritized work for devs to claim
├── board.md              # Kanban overview with DORA metrics
├── standup.md            # Async standup updates
├── metrics.md            # DORA metrics tracking
├── agents/
│   ├── product-owner/    # Triages, prioritizes
│   ├── tech-lead/        # Designs, unblocks, codes
│   ├── dev-alpha/        # Builder (general)
│   ├── dev-beta/         # Builder (backend focus)
│   ├── dev-gamma/        # Builder (frontend focus)
│   ├── qa/               # Selective testing
│   └── devops/           # Deploys, monitors
├── handoffs/             # Inter-agent communication (minimal)
├── projects/             # Project specs
├── knowledge/            # Shared context
├── agency.sh             # Main orchestrator
└── run-agent.sh          # Individual agent runner
```

## Workflow

1. **You** add a request to `inbox.md` with `## NEW:`
2. **Product Owner** triages, adds to `backlog.md` as `## READY:`
3. **Developers** claim from backlog, mark `## IN_PROGRESS: @dev-name`
4. **Developers** complete, self-test, mark `## DONE:`
   - If `QA Required: yes`, create handoff to QA
   - Otherwise, straight to DevOps
5. **DevOps** deploys, marks `## SHIPPED:`, updates metrics
6. **Tech Lead** monitors standup for `BLOCKED:` items, unblocks within 1 cycle

## Observability

Three files to watch:

| File | Purpose |
|------|---------|
| `standup.md` | Real-time: who's doing what, blockers |
| `backlog.md` | Work states: Ready → In Progress → Done → Shipped |
| `metrics.md` | DORA metrics: are we improving? |

## Commands

```bash
./agency.sh start      # Start all agents
./agency.sh stop       # Stop all agents
./agency.sh status     # Show status + DORA metrics
./agency.sh dev-alpha  # Run single agent in foreground (debugging)
```

## Philosophy

This is an experiment in applying organizational research to AI agents:

> "Speed and stability are not tradeoffs. Elite teams excel at both." — DORA Research

> "Handoffs are a silent killer in software development." — Scrum.org

> "No team should be set up that cannot be fed by two pizzas." — Jeff Bezos

The goal is not just to build software, but to observe how different organizational structures affect autonomous agent performance.

## License

MIT - do whatever you want with this.

## Credits

- Research: DORA, Spotify Engineering, Amazon/Google team structure studies
- Original concept: [Denislav Gavrilov](https://x.com/kuberdenis)
