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

## DONE: Add Educational Tooltips to Finance Dashboard @dev-gamma
- **Priority**: P0
- **Assigned**: @dev-gamma
- **Files**: dashboard/src/routes/finance/+page.svelte, dashboard/src/lib/components/finance/*.svelte, dashboard/src/lib/components/Tooltip.svelte
- **Summary**: Created finance dashboard page with NetWorthCard and AssetAllocationChart components. Integrated Tooltip component with hover/tap interactions. Added tooltips for "Net Worth", "Asset Allocation", and 5 asset classes (Stocks, Real Estate, Cash, Crypto, Other) with plain-English explanations and Investopedia "Learn more" links.

## IN_PROGRESS: Implement Real-Time SSE Updates for Finance Data @dev-alpha
- **Priority**: P1
- **Files**: dashboard/src/routes/finance/+page.svelte, dashboard/src/lib/stores/finance.ts
- **Summary**: Create finance store that subscribes to SSE events for live net worth and asset allocation updates. Add number scroll animation when values change. Show "Live" indicator when connected.

## DONE: Build Mock Data Service @dev-beta
- **Priority**: P0
- **Assigned**: @dev-beta
- **Files**: dashboard/src/lib/services/mockFinanceData.ts
- **Summary:** Created service with realistic mock data (net worth with 30-day history, 5 asset classes). Implements pub/sub pattern, manual refresh, auto-refresh toggle (30s default), and utility formatters. TypeScript compilation verified.

## DONE: Privacy Indicator Component @tech-lead
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

## QA_PASSED: [P0] Dashboard Skeleton + Mock Data Components @qa
**Files**: dashboard/src/routes/finance/+page.svelte, dashboard/src/lib/components/finance/NetWorthCard.svelte
- **Priority**: P0
- **Summary**: Finance dashboard page with responsive layout and NetWorthCard component displaying animated net worth values with change indicators
- **Tested**: ✅ Build passes successfully, components render properly, basic functionality verified

## QA Passed (Ready for Deploy)
<!-- Verified working, ready for deployment (unless Review Required) -->

---

## Reviewed
<!-- Code reviewed and approved, ready for deployment -->

---

## Shipped
<!-- Deployed to production -->

