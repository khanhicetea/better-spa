# React Conventions

React rules for this repo.

## React Compiler

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

## Component Rules

- Use function components only.
- Destructure props in the function signature.
- Use default parameter values instead of `defaultProps`.
- Keep simple event handlers inline. Extract only when reused or long.

## File and State Rules

- Components use PascalCase names.
- Helper and component files use kebab-case.
- Route-adjacent support code belongs in a sibling `-folder`.
- Keep server state in TanStack Query.
- Avoid derived state that can be computed during render.
- Prefer one mutation owner per row or card when list items act independently.

## Resetting Local State

Use `key` when a dialog, form, or detail panel must reset when its backing record changes.

Typical cases:

- switching an edit form between records
- reopening a create flow as a fresh form

## Query and Mutation Pattern

- Query with `useSuspenseQuery(orpc.domain.action.queryOptions(...))`
- Mutate with `useMutation(orpc.domain.action.mutationOptions(...))`
- Refetch from the screen that owns the data

## Anti-Patterns

- class components
- manual memoization
- optimistic updates by default
- giant route files that should be split into a `-folder`
