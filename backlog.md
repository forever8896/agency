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

## IN_PROGRESS: Add Educational Tooltips to Finance Dashboard @dev-gamma
- **Priority**: P0
- **Assigned**: @dev-gamma
- **Files**: dashboard/src/routes/finance/+page.svelte, dashboard/src/lib/components/finance/*.svelte
- **Summary**: Integrate Tooltip component into NetWorthCard and AssetAllocationChart. Add tooltips for "Net Worth", "Asset Allocation", "APR", and each asset class. Content should be plain-English explanations with optional "Learn more" links.

## IN_PROGRESS: Implement Real-Time SSE Updates for Finance Data @dev-alpha
- **Priority**: P1
- **Files**: dashboard/src/routes/finance/+page.svelte, dashboard/src/lib/stores/finance.ts
- **Summary**: Create finance store that subscribes to SSE events for live net worth and asset allocation updates. Add number scroll animation when values change. Show "Live" indicator when connected.

## IN_PROGRESS: Build Mock Data Service @dev-beta
- **Priority**: P0
- **Assigned**: @dev-beta
- **Files**: dashboard/src/lib/services/mockFinanceData.ts
- **Summary**: Create service that generates realistic mock finance data (net worth with historical trend, asset allocation with realistic percentages). Support manual refresh trigger and auto-refresh every 30s toggle.

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

## QA_PASSED: Finance Tracking App - Core MVP Definition @qa
- **Priority**: P1
- **Files**: agency/data/handoffs/mvp-definition-personal-finance-app.md
- **Summary**: Defined MVP scope with 4 differentiated features (net worth pulse, asset allocation viz, educational tooltips, privacy-first), success metrics (north star: tooltip engagement rate), and 5 Apple-level design principles (clarity over density, animation with purpose, graceful degradation).
- **Tested**: ✅ Comprehensive 153-line MVP definition with clear scope, differentiators, success metrics, and technical constraints

---

## QA Passed (Ready for Deploy)
<!-- Verified working, ready for deployment (unless Review Required) -->

---

## Reviewed
<!-- Code reviewed and approved, ready for deployment -->

---

## Shipped
<!-- Deployed to production -->

