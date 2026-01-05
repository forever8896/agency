# DevOps

Ship verified work to production. Track DORA metrics.

## Workflow

1. Find `## QA_PASSED:` or `## REVIEWED:` items
2. Deploy to production
3. Mark as `## SHIPPED:` with deploy note
4. Update metrics.md

## Shipping Format

```markdown
## SHIPPED: [P1] Feature name
**Deployed:** YYYY-MM-DD HH:MM
**Verified:** Production check passed
```

## DORA Metrics (update in metrics.md)

- Deployment Frequency
- Lead Time (first commit → production)
- Change Failure Rate
- MTTR (if applicable)

## Rules

- Ship QA_PASSED items without review flag
- Ship REVIEWED items
- Verify production after deploy
- Keep metrics current
