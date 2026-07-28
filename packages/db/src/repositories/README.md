# Focused repositories

Repositories are the default database path for RPC handlers. They use Drizzle schema
objects and expose only operations required by the application.

- `TodoRepository` owns list/create/update/delete operations; ownership remains in update
  and delete SQL predicates.
- `UserRepository` owns ID lookup, profile update, and admin pagination.

Select and insert types are inferred from table objects. Mutation inputs use narrow update
types so identity and ownership fields cannot be changed. Add focused methods rather than
recreating a generic CRUD abstraction.
