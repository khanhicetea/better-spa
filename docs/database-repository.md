# Database and Repository Pattern

**For Agents**: Read this doc when implementing database queries or creating new repositories.

**CRITICAL**: No Kysely codegen. Types are manually defined in `src/lib/db/schema/`.

---

## Database Schema

Kysely uses TypeScript interfaces for type-safe database queries. Schema definitions are organized in `src/lib/db/schema/`:

- `schema/auth.ts`: Contains authentication table interfaces (user, session, account, verification)
- `schema/todo.ts`: Contains feature-related table interfaces (todoCategory, todoItem)
- `schema/index.ts`: Central Database interface that aggregates all table interfaces
- Each schema file exports:
  - `Table` interface (e.g., `UserTable`)
  - `Selectable` type (e.g., `User`) - for query results
  - `Insertable` type (e.g., `UserInsert`) - for insert operations
  - `Updateable` type (e.g., `UserUpdate`) - for update operations

## Repository Pattern

The project uses a repository pattern for database operations to provide a clean, type-safe abstraction over Kysely queries. Repositories are located in `src/lib/db/repositories/`:

### Structure

```
src/lib/db/repositories/
├── base.ts              # BaseRepository interface and Repository class
├── index.ts             # Exports all repos and createRepos factory
├── user.repo.ts         # UserRepository
└── [model].repo.ts     # TodoItemRepository
```

### Available Repositories

- `repos.user`: User table operations
- `repos.[model]`: Model table operations

### BaseRepository Methods

- `find<T>(conditions?)` - Find multiple records
- `findSelect<T, K>(columns, conditions?)` - Find records with specific columns only
- `findById(id)` - Find record by ID
- `findByIdOrFail(id)` - Find record by ID or throw `NotFoundError`
- `findOne<T>(conditions)` - Find single record matching conditions
- `findOneOrFail<T>(conditions)` - Find single record or throw `NotFoundError`
- `findAll()` - Get all records
- `findPaginated(page, pageSize, conditions?)` - Paginated results with metadata (properly applies limit/offset)
- `count<T>(conditions?)` - Count records
- `exists(id)` - Check if record exists by ID (optimized with SELECT 1 LIMIT 1)
- `existsBy<T>(conditions)` - Check if any record matches conditions (optimized)
- `deleteById(id)` - Delete by ID
- `deleteMany<T>(conditions)` - Delete multiple records
- `updateById(id, data)` - Update record by ID
- `updateMany<T>(conditions, data)` - Update multiple records
- `insertReturn(data)` - Insert single record and return it
- `insertMany(data[])` - Insert multiple records and return them
- `upsert(data, conflictColumns, updateData?)` - Insert or update on conflict

### Query Conditions

Repositories support two types of conditions:

1. **Simple object conditions** (partial matches):

```typescript
// Simple equality conditions
const users = await repos.user.find({ email: "test@test.com", role: "admin" });
const todos = await repos.todoItem.find({ userId: "user-id", completed: null });
```

2. **Query builder function** (complex queries with full type inference):

```typescript
// Complex conditions with full Kysely API
const users = await repos.user.find((qb) =>
  qb
    .where("email", "=", "test@test.com")
    .where("role", "=", "admin")
    .orderBy("createdAt", "desc")
    .limit(10),
);

// Paginated with ordering
const result = await repos.user.findPaginated(page, pageSize, (qb) =>
  qb.orderBy("createdAt", "desc"),
);
```

### Creating New Repositories

1. Create new file in `src/lib/db/repositories/[name].repo.ts`
2. Extend Repository base class with table name
3. Add domain-specific methods (only if complex/reusable)
4. Register in `createRepos()` factory in `index.ts`

### Repository Design Guidelines

- **DON'T** create simple one-line wrapper methods like `findByUser`, `findByCategoryId` in concrete repositories
- **DON'T** pollute repositories with methods that just call **BaseRepository Methods** with simple arguments
- **DON'T** put methods in UserRepository. If the main subject is Product - put them in ProductRepository
- **DO** only create methods in repositories when:
  - Implementation is more than 3 lines of logic
  - Logic is complex or involves multiple operations
  - OR Logic is reused in multiple places

### Cross-Repository Access

Repositories can access other repositories via `this.repos` for complex operations that span multiple tables:

````typescript
// src/lib/db/repositories/order.repo.ts
export class OrderRepository extends Repository<"order"> {
  async createOrderWithItems(
    orderData: OrderInsert,
    items: OrderItemInsert[],
  ) {
    // Access other repositories via this.repos
    const order = await this.insertReturn(orderData);
    if (!order) throw new Error("Failed to create order");

    // Use another repository
    const orderItems = await (this.repos.orderItem as OrderItemRepository)
      .insertMany(items.map((item) => ({ ...item, orderId: order.id })));

    return { order, orderItems };
  }
}

**Bad Example (don't do this):**

```typescript
// src/lib/db/repositories/todoItem.repo.ts
export class TodoItemRepository extends Repository<"todoItem"> {
  async findByUserId(userId: string) {
    return this.find({ userId }); // Too simple, just use find directly
  }

  async findByCategoryId(categoryId: string) {
    return this.find({ categoryId }); // Too simple, just use find directly
  }
}

// Usage - just use find directly instead
const todos = await repos.todoItem.find({ userId: "123" });
````

**Good Example (do this):**

```typescript
// src/lib/db/repositories/product.repo.ts
import type { DB } from "../init";
import { Repository } from "./base";

export class ProductRepository extends Repository<"product"> {
  async searchByKeyword(keyword: string) {
    return this.find((qb) =>
      qb
        .where("name", "ilike", `%${keyword}%`)
        .orWhere("description", "ilike", `%${keyword}%`)
        .orderBy("popularity", "desc")
        .limit(50),
    );
  }

  async findAvailableProducts(filters: ProductFilters) {
    // Complex logic worth extracting
    return this.find((qb) => {
      let query = qb.where("stock", ">", 0);
      if (filters.minPrice) {
        query = query.where("price", ">=", filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.where("price", "<=", filters.maxPrice);
      }
      return query.orderBy("createdAt", "desc");
    });
  }
}
```

Then register in `index.ts`:

```typescript
import { ProductRepository } from "./product.repo";

export function createRepos(db: DB) {
  return {
    user: new UserRepository(db),
    todoCategory: new TodoCategoryRepository(db),
    todoItem: new TodoItemRepository(db),
    product: new ProductRepository(db), // Add new repo
  };
}
```

### Using Repositories Correctly

```typescript
// ✅ Good - use base methods directly for simple queries
const todos = await repos.todoItem.find({ userId: "123" });
const user = await repos.user.findById("456");
const category = await repos.todoCategory.findOne({ name: "Work" });

// ✅ Good - use query builder for complex conditions
const recentTodos = await repos.todoItem.find((qb) =>
  qb
    .where("userId", "=", "123")
    .where("createdAt", ">", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .orderBy("createdAt", "desc"),
);

// ✅ Good - use custom method for reusable complex logic
const availableProducts = await repos.product.findAvailableProducts({
  minPrice: 10,
  maxPrice: 100,
});

// ✅ Good - use findSelect for fetching specific columns only
const userIds = await repos.user.findSelect(["id", "email"], { role: "admin" });

// ✅ Good - use findByIdOrFail/findOneOrFail when record must exist
import { NotFoundError } from "~/lib/db/repositories";

try {
  const user = await repos.user.findByIdOrFail(userId);
  const admin = await repos.user.findOneOrFail({ role: "admin" });
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle not found - return 404, show error, etc.
  }
}

// ✅ Good - use upsert for insert-or-update operations
const setting = await repos.userSetting.upsert(
  { userId: "123", key: "theme", value: "dark" },
  ["userId", "key"], // conflict columns
  { value: "dark" }, // optional: only update specific fields
);
```

### Repository Context Access

Repositories are available in RPC handlers via `context.repos`:

- `baseProcedure`, `authedProcedure`, `adminProcedure` all have access to `repos`
- Each repository is type-safe with full autocomplete
- All database operations should go through repositories, not direct Kysely queries
