# React Conventions

Best practices and naming conventions for React development in this project.

**CRITICAL**: React Compiler is enabled - see CLAUDE.md for the no-memoization rule.

---

## Naming Conventions

### Components & Files

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile`, `ProductCard` |
| Page components | PascalCase | `DashboardPage`, `SettingsPage` |
| Custom hooks | `use` prefix | `useAuth`, `useProducts` |
| Component files | kebab-case | `user-profile.tsx` |
| Hook files | kebab-case | `use-auth.ts` |

### Variables & Functions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `isLoading` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_ITEMS`, `API_TIMEOUT` |
| Event handlers | `handle` + event | `handleClick`, `handleSubmit` |
| Boolean | `is`, `has`, `can` prefix | `isOpen`, `hasError`, `canEdit` |
| Callback props | `on` + action | `onClick`, `onSubmit` |

---

## State Naming - Be Declarative

State names should be self-documenting:

```tsx
// WRONG - Generic, unclear
const [open, setOpen] = useState(false);
const [loading, setLoading] = useState(false);

// CORRECT - Declarative
const [openFormDialog, setOpenFormDialog] = useState(false);
const [loadingExport, setLoadingExport] = useState(false);
const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
```

---

## Component Patterns

### Function Components Only

```tsx
// CORRECT
function ProductCard({ product }: ProductCardProps) {
  return <div>{product.name}</div>;
}

// WRONG - No class components
class ProductCard extends React.Component { ... }
```

### Props Destructuring in Signature

```tsx
// CORRECT
function UserCard({ user, isActive, onSelect }: UserCardProps) {
  return <div onClick={() => onSelect(user.id)}>{user.name}</div>;
}
```

### Default Parameter Values

```tsx
function Button({
  variant = "default",
  size = "md",
  children,
}: ButtonProps) {
  // ...
}
```

---

## Component Organization

Order elements consistently:

```tsx
function ProductForm({ productId, onSuccess }: ProductFormProps) {
  // 1. Hooks (queries, mutations, state, refs)
  const { data: product } = useSuspenseQuery(...);
  const mutation = useMutation(...);
  const [openPreview, setOpenPreview] = useState(false);

  // 2. Derived values
  const isEditing = !!productId;

  // 3. Complex handlers (only if needed)
  const handleSubmit = (data: ProductFormData) => {
    mutation.mutate(data, { onSuccess });
  };

  // 4. Early returns
  if (!product && isEditing) return <div>Not found</div>;

  // 5. Render
  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Event Handling

### Inline vs Declared Handlers

**Use inline** for simple, single-use handlers:

```tsx
<button onClick={() => setOpenDialog(true)}>Open</button>
<button onClick={() => onDelete(product.id)}>Delete</button>
```

**Declare functions** when complex or reused:

```tsx
const handleSubmit = (data: FormData) => {
  if (!validate(data)) return toast.error("Invalid");
  mutation.mutate(data, { onSuccess, onError });
};
```

---

## Using `key` for State Reset

Use `key` to reset component state instead of `useEffect`:

```tsx
// Reset form when editing different items
<ProductEditForm key={editingProductId} productId={editingProductId} />

// Reset dialog when reopening
<CreateForm key={dialogOpenCount} />
```

---

## Server State

Use TanStack Query - never store server data in `useState`:

```tsx
// CORRECT
const { data: products } = useSuspenseQuery(orpc.product.list.queryOptions(...));

// WRONG
const [products, setProducts] = useState([]);
useEffect(() => { fetchProducts().then(setProducts); }, []);
```

---

## Anti-Patterns

```tsx
// 1. No index as key for dynamic lists
{items.map((item) => <Item key={item.id} />)}  // CORRECT
{items.map((item, i) => <Item key={i} />)}     // WRONG

// 2. No prop drilling beyond 2 levels - use context

// 3. No useEffect for resetting form state - use key

// 4. No unnecessary handler declarations
<button onClick={() => setOpen(true)}>Open</button>  // CORRECT
const handleOpen = () => setOpen(true);              // WRONG if single-use
```

---

## Quick Reference

| Category | Convention |
|----------|------------|
| Components | PascalCase |
| Hooks | camelCase with `use` prefix |
| Callback props | `on` + action |
| Boolean state | `is`, `has`, `can` prefix |
| Files | kebab-case |
| State naming | Declarative: `openFormDialog`, not `open` |
| Simple handlers | Inline |
| Reset state | Use `key` prop |
