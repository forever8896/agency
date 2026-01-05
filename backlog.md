# Backlog

Prioritized work for the squad. Devs claim directly - no dispatcher needed.

---

## Workflow

```
READY → IN_PROGRESS → DONE → QA_TESTING → QA_PASSED → SHIPPED
                               ↓                ↓
                          QA_FAILED      (if Review Required)
                          (back to dev)        ↓
                                          REVIEWING → REVIEWED → SHIPPED
```

1. **PO** adds items as `## READY:`
2. **Devs** claim by changing to `## IN_PROGRESS: @dev-name`
3. **Devs** complete by changing to `## DONE: @dev-name`
4. **QA** verifies and changes to `## QA_PASSED:` or `## QA_FAILED:`
5. **Reviewer** (if flagged) reviews and changes to `## REVIEWED:`
6. **DevOps** deploys and changes to `## SHIPPED:`

---

## Priority Guide

- **P0** - Production down, drop everything
- **P1** - Core feature, high impact
- **P2** - Important, can wait
- **P3** - Nice to have

---

## Flags

Add these to items when creating them:
- `Review Required: yes` - Triggers code review after QA pass

---

## Ready for Work
<!-- Devs: claim these by adding @your-name and changing to IN_PROGRESS -->

## SHIPPED: [P0] Add Educational Tooltips to Finance Dashboard
**Deployed:** 2026-01-05 03:08
**Verified:** Production check passed

## QA_PASSED: [P1] Implement Real-Time SSE Updates for Finance Data @dev-alpha
- **Priority**: P1
- **Files**: dashboard/src/lib/stores/finance.ts, dashboard/src/routes/api/finance/stream/+server.ts, dashboard/src/lib/components/finance/NetWorthCard.svelte
- **Summary**: SSE store with auto-reconnect, 5s update interval, heartbeat. Number scroll animation (800ms easeOutQuart). "Live" badge with pulse animation. Build verified.

## SHIPPED: [P0] Build Mock Data Service
**Deployed:** 2026-01-05 03:08
**Verified:** Production check passed

## QA_PASSED: [P1] Privacy Indicator Component @tech-lead
- **Priority**: P1
- **Files**: dashboard/src/lib/components/finance/PrivacyIndicator.svelte
- **Summary**: Lock/cloud icon with Local/Cloud modes. Transparency panel shows data storage/sharing. CSV/JSON export. Mobile-responsive fixed panel.

---

## In Progress
<!-- Currently being built -->

---

## Done (Awaiting QA)
<!-- Completed by dev, waiting for QA verification -->

## SHIPPED: [P0] Educational Tooltip System
**Deployed:** 2026-01-05 02:54
**Verified:** Production check passed

## SHIPPED: [P1] Finance Tracking App - Research & Discovery
**Deployed:** 2026-01-05 02:54
**Verified:** Production check passed

## SHIPPED: [P1] Finance Tracking App - Core MVP Definition
**Deployed:** 2026-01-05 02:57
**Verified:** Production check passed

---

## SHIPPED: [P0] Dashboard Skeleton + Mock Data Components
**Deployed:** 2026-01-05 03:00
**Verified:** Production check passed

## QA Passed (Ready for Deploy)
<!-- Verified working, ready for deployment (unless Review Required) -->

---

## Reviewed
<!-- Code reviewed and approved, ready for deployment -->

---

## Shipped
<!-- Deployed to production -->

