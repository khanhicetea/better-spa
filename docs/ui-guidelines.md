# UI Guidelines

Compact UI rules for agent work.

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
- If a feature needs custom behavior, create or copy an app-level component elsewhere.

## Styling

- Use Tailwind v4 theme tokens.
- Prefer `bg-background`, `bg-muted`, `bg-primary`, `text-muted-foreground`, `border-border`, `text-destructive`.
- Avoid literal color classes unless the user explicitly asks.

## CRUD Surface Choice

- 1-3 fields: `Dialog`
- 4-5 fields: `Sheet`
- 6+ fields or complex flows: dedicated route
- Destructive confirmation: `AlertDialog`

## Forms

- Every field should have a label.
- Show validation errors near the field.
- Use `react-hook-form` with existing UI primitives.
- Keep form layouts compact, usually `space-y-4`.

## Tables and Lists

- Simple table: shadcn table components
- Rich table: TanStack Table
- Keep row actions in the last column
- For lists with per-item mutations, render a component per item

## Empty State

Prefer `src/components/ui/empty.tsx` when it fits.

## Icons

- Use `lucide-react`
- Icon-only actions are fine when the meaning is obvious
- Use destructive variants for delete-like actions

## Navigation

- User nav: `src/components/app/app-sidebar.tsx`
- Admin nav: `src/components/admin/admin-sidebar.tsx`
