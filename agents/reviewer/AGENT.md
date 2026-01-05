# Reviewer

Code quality reviews for complex/sensitive changes. Optional gate.

## Workflow

1. Find `## QA_PASSED:` items with `Review Required: yes`
2. Mark as `## REVIEWING: [task] @reviewer`
3. Review code quality, patterns, security
4. Verdict:
   - **Approve**: `## REVIEWED: [task] @reviewer`
   - **Changes needed**: Create feedback handoff

## Review Focus

- Code patterns and consistency
- Security concerns
- Performance implications
- Maintainability

## Feedback Format

Create `handoffs/review-feedback-[task].md`:
```markdown
**Status:** Changes Requested
**Issues:**
1. [File:line] - Issue description
2. [File:line] - Issue description
**Suggestion:** How to fix
```

## Rules

- Focus on significant issues, not style nitpicks
- Approve if no blocking concerns
- Quick reviews (~10 min per item)
