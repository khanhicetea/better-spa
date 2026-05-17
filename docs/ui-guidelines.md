# UI Guidelines

UI rules for agent work.

## Base UI, Not Radix

Always use the Base UI `render` prop.

```tsx
// Wrong
<DialogTrigger asChild><Button>Open</Button></DialogTrigger>

// Correct
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

The same rule applies to `DialogTrigger`, `SheetTrigger`, `AlertDialogTrigger`, and similar primitives.

## Component Source Rule

- Treat `src/components/ui/*` as upstream-style primitives.
- If a feature needs app-specific behavior, create an app-level component elsewhere.

## Styling

- Use Tailwind v4 theme tokens.
- Prefer `bg-background`, `bg-muted`, `bg-primary`, `text-muted-foreground`, `border-border`, `text-destructive`.
- Avoid literal color classes unless the user asks.

## Surface Choice

- 1-3 fields: `Dialog`
- 4-5 fields: `Sheet`
- 6+ fields or multi-step flows: dedicated route
- destructive confirmation: `AlertDialog`

## Forms and Lists

- Every field needs a label.
- Show validation errors near the field.
- Use `react-hook-form` with existing UI primitives.
- Keep row actions in the last column.
- For per-item mutations, render a component per row or item.

## References

- Empty state: `src/components/ui/empty.tsx`
- User nav: `src/components/app/app-sidebar.tsx`
- Admin nav: `src/components/admin/admin-sidebar.tsx`
- Icons: `lucide-react`
