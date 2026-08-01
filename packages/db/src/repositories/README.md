# Focused repositories

Repositories are the default database path for RPC handlers. They use Drizzle schema
objects and expose only operations required by the application.

- `BaseRepository` provides protected `findOne`, `insertOne`, `insertMany`, `updateOne`, and
  `deleteOne` building blocks. It does not expose a public generic CRUD API.
- `TodoRepository` owns list/create/update/delete operations; ownership remains in update
  and delete SQL predicates.
- `UserRepository` owns ID lookup, profile update, and admin pagination.

Concrete repositories extend `BaseRepository<Table, Insert, Update>`. Pass the inferred table
and insert types plus a deliberately narrow update type:

```ts
class ExampleRepository extends BaseRepository<typeof example, ExampleInsert, ExampleUpdate> {
  constructor(db: DB) {
    super(db, example);
  }
}
```

`insertMany` inserts a non-empty readonly array in one statement and returns every inserted
row; it rejects an empty input. The other base mutation helpers always require a predicate and
reject an undefined predicate at runtime. Concrete repositories must still build authorization
and ownership into those predicates. Keep all base helpers protected so callers cannot bypass
domain rules.

Select and insert types are inferred from table objects. Mutation inputs use narrow update
types so identity and ownership fields cannot be changed. Add focused public methods rather
than recreating a public generic CRUD abstraction.
