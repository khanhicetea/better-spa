# React Conventions

Compact React rules for this repo.

## Critical Rule: React Compiler

Do not add manual memoization.

```tsx
// Wrong
useCallback(...)
useMemo(...)
memo(Component)

// Correct
const handleClick = () => {}
const value = deriveValue(data)
function Component() {}
```

## Component Style

- Use function components only.
- Destructure props in the function signature.
- Use default parameter values instead of `defaultProps`.
- Keep simple event handlers inline; extract only when the logic is reused or long.

## File and Naming Pattern

- Components: PascalCase names
- Files: kebab-case for helpers/components, route file names follow route structure
- Route-adjacent support code belongs in a sibling `-folder`

## State Rules

- Keep server state in TanStack Query, not duplicated local state.
- Avoid derived state when it can be computed during render.
- Prefer one mutation owner per item row/card when a list supports independent actions.

## Resetting Local State

Use `key` when a dialog, form, or detail panel must reset when its backing record changes.

Examples:

- edit form switching between two records
- dialog reopened for a fresh create flow

## Query and Mutation Pattern

- Query with `useSuspenseQuery(orpc.domain.action.queryOptions(...))`
- Mutate with `useMutation(orpc.domain.action.mutationOptions(...))`
- Refetch from the screen that owns the data

## Anti-Patterns

- No class components
- No manual memoization
- No optimistic updates by default
- No giant route files when a `-folder` would make the route clearer
