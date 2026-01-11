# React Conventions

Best practices and naming conventions for React development in this project.

---

## React Compiler Rules (CRITICAL)

This project uses **React Compiler** - manual memoization is forbidden.

### Never Use Manual Memoization

```tsx
// WRONG - React Compiler handles this automatically
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);

const computedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

const MemoizedComponent = memo(MyComponent);

// CORRECT - Write normal code
const handleClick = () => {
  doSomething();
};

const computedValue = expensiveCalculation(data);

function MyComponent() { ... }
```

### Why?

React Compiler automatically:
- Memoizes component renders
- Caches expensive computations
- Optimizes callback references

Manual memoization conflicts with the compiler and causes issues.

---

## Naming Conventions

### Components

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile`, `ProductCard` |
| Page components | PascalCase | `DashboardPage`, `SettingsPage` |
| Layout components | PascalCase + suffix | `AdminLayout`, `AuthLayout` |

```tsx
// Component file: user-profile.tsx or UserProfile.tsx
export function UserProfile() { ... }

// Page route file: src/routes/admin/users.tsx
function UsersPage() { ... }
```

### Hooks

| Type | Convention | Example |
|------|------------|---------|
| Custom hooks | camelCase with `use` prefix | `useAuth`, `useProducts` |
| Query hooks | `use` + resource + action | `useUserList`, `useProductDetails` |

```tsx
// Custom hook
export function useAuth() {
  // ...
}

// Query hook
export function useProducts(categoryId: string) {
  return useSuspenseQuery(
    orpc.product.list.queryOptions({ input: { categoryId } })
  );
}
```

### Variables & Functions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `isLoading` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_ITEMS`, `API_TIMEOUT` |
| Functions | camelCase | `handleSubmit`, `formatDate` |
| Event handlers | `handle` + event | `handleClick`, `handleSubmit` |
| Boolean variables | `is`, `has`, `can`, `should` prefix | `isOpen`, `hasError`, `canEdit` |

```tsx
// Variables
const userName = "John";
const isLoading = true;
const hasPermission = false;

// Constants
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;

// Event handlers
const handleClick = () => { ... };
const handleFormSubmit = (data: FormData) => { ... };
```

### Props

| Type | Convention | Example |
|------|------------|---------|
| Props interface | ComponentName + `Props` | `UserCardProps`, `ButtonProps` |
| Callback props | `on` + action | `onClick`, `onSubmit`, `onChange` |
| Boolean props | `is`, `has`, `can` prefix | `isDisabled`, `hasIcon` |
| Render props | `render` + element | `renderHeader`, `renderItem` |

```tsx
interface UserCardProps {
  user: User;
  isSelected?: boolean;
  hasActions?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  renderActions?: () => React.ReactNode;
}

function UserCard({
  user,
  isSelected = false,
  hasActions = true,
  onSelect,
  onDelete,
  renderActions,
}: UserCardProps) {
  // ...
}
```

### Files & Folders

| Type | Convention | Example |
|------|------------|---------|
| Component files | kebab-case | `user-profile.tsx`, `product-card.tsx` |
| Hook files | kebab-case | `use-auth.ts`, `use-products.ts` |
| Utility files | kebab-case | `format-date.ts`, `validation.ts` |
| Route files | kebab-case | `src/routes/admin/user-settings.tsx` |

---

## Component Patterns

### Function Components Only

Always use function components, never class components.

```tsx
// CORRECT
function ProductCard({ product }: ProductCardProps) {
  return <div>{product.name}</div>;
}

// WRONG - No class components
class ProductCard extends React.Component { ... }
```

### Props Destructuring

Destructure props in the function signature.

```tsx
// CORRECT - Destructure in signature
function UserCard({ user, isActive, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect(user.id)}>
      {user.name} {isActive && "(Active)"}
    </div>
  );
}

// AVOID - Destructure inside function body
function UserCard(props: UserCardProps) {
  const { user, isActive, onSelect } = props;
  // ...
}
```

### Default Props

Use default parameter values, not `defaultProps`.

```tsx
// CORRECT
function Button({
  variant = "default",
  size = "md",
  disabled = false,
  children,
}: ButtonProps) {
  // ...
}

// WRONG - Don't use defaultProps
Button.defaultProps = {
  variant: "default",
  size: "md",
};
```

### Component Organization

Order elements within a component consistently:

```tsx
function ProductForm({ productId, onSuccess }: ProductFormProps) {
  // 1. Hooks (queries, mutations, state, refs)
  const { data: product } = useSuspenseQuery(
    orpc.product.get.queryOptions({ input: { id: productId } })
  );
  const mutation = useMutation(orpc.product.update.mutationOptions());
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // 2. Derived/computed values
  const isEditing = !!productId;
  const formTitle = isEditing ? "Edit Product" : "New Product";

  // 3. Complex event handlers (only if needed - prefer inline for simple ones)
  const handleSubmit = (data: ProductFormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  // 4. Early returns (loading, error states)
  if (!product && isEditing) {
    return <div>Product not found</div>;
  }

  // 5. Render (use inline handlers for simple operations)
  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {/* Simple state toggle - use inline */}
      <button type="button" onClick={() => setOpenPreviewDialog(true)}>
        Preview
      </button>
      {/* ... */}
    </form>
  );
}
```

---

## State Management

### Local State

Use `useState` for component-local state. For simple state updates, use inline handlers.

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  // Simple state updates - use inline handlers directly
  return (
    <div>
      <button onClick={() => setCount((prev) => prev - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount((prev) => prev + 1)}>+</button>
    </div>
  );
}
```

### State Naming - Be Declarative

**"Let the code present itself"** - State names should be self-documenting and describe their purpose clearly.

```tsx
// WRONG - Generic, unclear what "open" refers to
const [open, setOpen] = useState(false);
const [loading, setLoading] = useState(false);
const [selected, setSelected] = useState<string | null>(null);

// CORRECT - Declarative, self-documenting
const [openFormDialog, setOpenFormDialog] = useState(false);
const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
const [loadingExport, setLoadingExport] = useState(false);
const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
const [editingUserId, setEditingUserId] = useState<string | null>(null);
```

| Pattern | Good Example | Bad Example |
|---------|--------------|-------------|
| Dialog state | `openCreateDialog`, `openEditModal` | `open`, `isOpen` |
| Loading state | `loadingSubmit`, `loadingExport` | `loading`, `isLoading` |
| Selected item | `selectedUserId`, `selectedProduct` | `selected`, `id` |
| Editing state | `editingRowId`, `editingComment` | `editing`, `isEditing` |
| Filter state | `filterByStatus`, `productFilters` | `filter`, `filters` |

```tsx
// Full example - clear what each state controls
function ProductsPage() {
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [filterByCategory, setFilterByCategory] = useState<string>("all");
  const [searchProductQuery, setSearchProductQuery] = useState("");

  // Reading this code, you immediately understand what each state does
}
```

### Server State

Use TanStack Query for server state - never store server data in `useState`.

```tsx
// CORRECT - Server state with TanStack Query
function ProductList() {
  const { data: products } = useSuspenseQuery(
    orpc.product.list.queryOptions({ input: { page: 1 } })
  );

  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}

// WRONG - Don't store server data in useState
function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);
  // ...
}
```

### Lifting State

Lift state to the nearest common ancestor when needed.

```tsx
// Parent manages shared state
function ProductPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  return (
    <div>
      <ProductList
        selectedId={selectedProductId}
        onSelect={setSelectedProductId}
      />
      <ProductDetails productId={selectedProductId} />
    </div>
  );
}

// Children receive state via props
function ProductList({ selectedId, onSelect }: ProductListProps) {
  // ...
}

function ProductDetails({ productId }: ProductDetailsProps) {
  // ...
}
```

---

## Props Patterns

### Required vs Optional Props

Use `?` for optional props, provide sensible defaults.

```tsx
interface ButtonProps {
  // Required
  children: React.ReactNode;

  // Optional with defaults
  variant?: "default" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;

  // Optional callbacks
  onClick?: () => void;
}

function Button({
  children,
  variant = "default",
  size = "md",
  disabled = false,
  onClick,
}: ButtonProps) {
  // ...
}
```

### Callback Props

Name callbacks with `on` prefix. Use inline when calling them is simple.

```tsx
interface FormProps {
  onSubmit: (data: FormData) => void;  // Callback prop
  onCancel?: () => void;
}

function Form({ onSubmit, onCancel }: FormProps) {
  // Complex handler - declare as function
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
      {/* Simple callback - use inline */}
      <button type="button" onClick={() => onCancel?.()}>Cancel</button>
    </form>
  );
}
```

### Children Props

Use `children` for component composition.

```tsx
interface CardProps {
  children: React.ReactNode;
  title?: string;
}

function Card({ children, title }: CardProps) {
  return (
    <div className="rounded-lg border p-4">
      {title && <h3 className="font-semibold">{title}</h3>}
      {children}
    </div>
  );
}

// Usage
<Card title="User Info">
  <p>Name: {user.name}</p>
  <p>Email: {user.email}</p>
</Card>
```

### Spread Props

Use spread for extending HTML elements.

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive";
}

function Button({
  variant = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
```

---

## Event Handling

### Inline vs Declared Handlers (IMPORTANT)

**Use inline handlers** when:
- Handler is used only once (single-use)
- Handler is simple (1-2 lines, just setting state or calling a function)

**Declare handler functions** when:
- Handler is reused in multiple places
- Handler is complex (3+ lines, multiple operations)
- Handler needs to be passed to child components

```tsx
// CORRECT - Inline for simple, single-use handlers
function ProductCard({ product, onDelete }: ProductCardProps) {
  const [openDetails, setOpenDetails] = useState(false);

  return (
    <div>
      {/* Simple state toggle - inline */}
      <button onClick={() => setOpenDetails(true)}>View</button>

      {/* Simple function call - inline */}
      <button onClick={() => onDelete(product.id)}>Delete</button>

      {/* Simple state update - inline */}
      <input onChange={(e) => setSearchQuery(e.target.value)} />
    </div>
  );
}

// WRONG - Don't declare handlers for simple single-use operations
function ProductCard({ product, onDelete }: ProductCardProps) {
  const [openDetails, setOpenDetails] = useState(false);

  // Unnecessary - only used once and it's simple
  const handleOpenDetails = () => setOpenDetails(true);
  // Unnecessary - only used once and it's simple
  const handleDelete = () => onDelete(product.id);

  return (
    <div>
      <button onClick={handleOpenDetails}>View</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

```tsx
// CORRECT - Declare handlers when complex or reused
function ProductForm({ onSuccess }: ProductFormProps) {
  const mutation = useMutation(orpc.product.create.mutationOptions());

  // Complex logic - declare as function
  const handleSubmit = (data: ProductFormData) => {
    if (!validateProduct(data)) {
      toast.error("Invalid product data");
      return;
    }

    mutation.mutate(data, {
      onSuccess: (result) => {
        toast.success("Product created!");
        onSuccess?.(result);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  // Reused in multiple places - declare as function
  const handleReset = () => {
    form.reset();
    setOpenPreview(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
      <button type="button" onClick={handleReset}>Reset</button>
      <button type="button" onClick={handleReset}>Cancel</button>
    </form>
  );
}
```

### Event Handler Naming

When declaring handlers, use the `handle` + action pattern:

```tsx
// Pattern: handle + Element + Event (or just handle + Action)
const handleFormSubmit = (data: FormData) => { ... };
const handleProductDelete = (id: string) => { ... };
const handleImageUpload = (file: File) => { ... };

// Simpler when context is clear
const handleSubmit = () => { ... };
const handleDelete = () => { ... };
```

### Event Types

Use proper TypeScript event types.

```tsx
function Form() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ...
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // ...
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </form>
  );
}
```

---

## Using `key` for State Reset (IMPORTANT)

Use the `key` prop to reset component state instead of `useEffect`. When `key` changes, React unmounts and remounts the component, resetting all internal state.

### Reset Form When Editing Different Items

```tsx
// CORRECT - Use key to reset form when editing different products
function ProductsPage() {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  return (
    <div>
      <ProductList onEdit={setEditingProductId} />

      {editingProductId && (
        // key={editingProductId} resets form when switching products
        <ProductEditForm
          key={editingProductId}
          productId={editingProductId}
          onClose={() => setEditingProductId(null)}
        />
      )}
    </div>
  );
}

// WRONG - Using useEffect to reset form
function ProductEditForm({ productId }: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);

  // Don't do this - use key instead
  useEffect(() => {
    // Reset form when productId changes
    setName("");
    setPrice(0);
    fetchProduct(productId).then((p) => {
      setName(p.name);
      setPrice(p.price);
    });
  }, [productId]);
}
```

### Reset Dialog State When Reopening

```tsx
// CORRECT - Use key to reset dialog state each time it opens
function ProductsPage() {
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [createDialogKey, setCreateDialogKey] = useState(0);

  const handleOpenCreate = () => {
    setCreateDialogKey((k) => k + 1); // Increment key to reset dialog
    setOpenCreateDialog(true);
  };

  return (
    <>
      <Button onClick={handleOpenCreate}>Create Product</Button>

      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        {/* key resets all form state when dialog reopens */}
        <CreateProductForm
          key={createDialogKey}
          onSuccess={() => setOpenCreateDialog(false)}
        />
      </Dialog>
    </>
  );
}

// Alternative - use the dialog open state as part of key
function ProductsPage() {
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  return (
    <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
      {/* Reset form each time dialog opens */}
      <CreateProductForm
        key={openCreateDialog ? "open" : "closed"}
        onSuccess={() => setOpenCreateDialog(false)}
      />
    </Dialog>
  );
}
```

### Common `key` Patterns

| Scenario | Key Value | Example |
|----------|-----------|---------|
| Edit different items | Item ID | `key={editingProductId}` |
| Reset on reopen | Counter | `key={dialogOpenCount}` |
| Reset on reopen | Open state | `key={isOpen ? "open" : "closed"}` |
| Reset list item forms | Item ID | `key={product.id}` |
| Force re-fetch | Timestamp | `key={lastRefreshTime}` |

```tsx
// List with independent edit forms per item
function ProductList({ products }: Props) {
  return (
    <ul>
      {products.map((product) => (
        // Each ProductRow has independent state, reset when product.id changes
        <ProductRow key={product.id} product={product} />
      ))}
    </ul>
  );
}
```

---

## TypeScript Integration

### Type Definitions

Define types close to where they're used, or in shared files.

```tsx
// Types for a specific component - define in same file
interface ProductCardProps {
  product: Product;
  onSelect?: (id: string) => void;
}

function ProductCard({ product, onSelect }: ProductCardProps) {
  // ...
}

// Shared types - define in types file
// src/lib/types/product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
}
```

### Generic Components

Use generics for reusable components.

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// Usage
<List
  items={users}
  renderItem={(user) => <span>{user.name}</span>}
  keyExtractor={(user) => user.id}
/>
```

---

## Component Composition

### Co-location

Co-locate single-use components in the same file.

```tsx
// src/routes/admin/products.tsx

// Helper component - only used in this file
function ProductRow({ product, onDelete }: ProductRowProps) {
  return (
    <tr>
      <td>{product.name}</td>
      <td>{product.price}</td>
      <td>
        <button onClick={() => onDelete(product.id)}>Delete</button>
      </td>
    </tr>
  );
}

// Main page component
function ProductsPage() {
  const { data: products } = useSuspenseQuery(
    orpc.product.list.queryOptions({ input: {} })
  );

  const handleDelete = (id: string) => { ... };

  return (
    <table>
      <tbody>
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            onDelete={handleDelete}
          />
        ))}
      </tbody>
    </table>
  );
}
```

### Extract Reusable Components

Extract to `src/components/` when used in multiple places.

```
src/components/
├── ui/              # shadcn/ui components
├── app/             # App-wide components (sidebar, header)
├── admin/           # Admin-specific shared components
└── shared/          # Truly shared across app/admin
```

---

## Anti-Patterns to Avoid

### Don't Use

```tsx
// 1. No index as key for dynamic lists
// WRONG
{items.map((item, index) => <Item key={index} />)}

// CORRECT
{items.map((item) => <Item key={item.id} />)}

// 2. No unnecessary fragments
// WRONG
<>{children}</>

// CORRECT
{children}

// 3. No prop drilling beyond 2 levels - use composition or context
// WRONG
<A user={user}>
  <B user={user}>
    <C user={user}>
      <D user={user} />
    </C>
  </B>
</A>

// CORRECT - Use context or composition
<UserProvider user={user}>
  <A><B><C><D /></C></B></A>
</UserProvider>

// 4. No useEffect for resetting form state - use key instead
// WRONG
useEffect(() => {
  form.reset();
  setName(product.name);
}, [productId]);

// CORRECT
<ProductForm key={productId} product={product} />

// 5. No unnecessary handler declarations for simple operations
// WRONG
const handleClick = () => setOpen(true);
<button onClick={handleClick}>Open</button>

// CORRECT
<button onClick={() => setOpenDialog(true)}>Open</button>
```

---

## Quick Reference

| Category | Convention |
|----------|------------|
| Components | PascalCase |
| Hooks | camelCase with `use` prefix |
| Callback props | `on` + action name |
| Boolean props/state | `is`, `has`, `can` prefix |
| Files | kebab-case |
| Constants | SCREAMING_SNAKE_CASE |
| No memoization | React Compiler handles it |
| State naming | Declarative: `openFormDialog`, not `open` |
| Simple handlers | Inline: `onClick={() => setOpen(true)}` |
| Complex handlers | Declare: `const handleSubmit = () => { ... }` |
| Reset state | Use `key` prop, not `useEffect` |
