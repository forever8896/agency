# Backlog

Prioritized work for the squad. Devs claim directly - no dispatcher needed.

---

## How This Works

1. **PO** adds items as `## READY:`
2. **Devs** claim by changing to `## IN_PROGRESS: @dev-name`
3. **Devs** complete by changing to `## DONE: @dev-name`
4. **DevOps** deploys and changes to `## SHIPPED:`

No handoff chain. No waiting. Claim it, build it, ship it.

---

## Priority Guide

- **P0** - Production down, drop everything
- **P1** - Core feature, high impact
- **P2** - Important, can wait
- **P3** - Nice to have

---

## Ready for Work
<!-- Devs: claim these by adding @your-name and changing to IN_PROGRESS -->

---

## Done

## DONE: [P1] Research existing crypto trackers @dev-alpha
**Files:** /home/deepseek/projects/financeapp/research-crypto-trackers.md
**Summary:** Researched CoinTracker ($59-$3499/yr, 3M users), Delta ($99.99/yr, multi-asset), CoinStats ($119.99/yr, 1M users). Key gaps: no education layer, no privacy-first/self-hosted option, live data paywalled. Recommended MVP stack: Next.js + CoinGecko free API + local storage.
<!-- Completed, waiting for deployment -->

## QA_TESTING: Event-driven architecture refactor @qa
- **Description**: Major refactor removing file watching, implementing POST events from agency scripts to `/api/events`, dashboard broadcasts events via SSE instead of watching files
- **Changes**: Removed `file-watcher.ts`, `events.ts`, `websocket.ts`, simplified `vite.config.ts`, added debounced data refresh (500ms)
- **Commit**: e8fd765

---

## Shipped
<!-- Deployed to production -->

