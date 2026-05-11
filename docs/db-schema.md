# Database Schema

Current database snapshot for agent use.

Last updated: 2026-05-11

## Global Rules

- SQL tables are singular.
- SQL columns use `snake_case`.
- TypeScript schema properties use `camelCase`.
- Quote `"user"` in raw SQL because `user` is reserved in PostgreSQL.
- When storing JSON arrays, wrap them in an object key such as `{ files: [...] }`.

## Tables

### `user`

Better Auth user record.

Key columns:

- `id`
- `name`
- `email`
- `email_verified`
- `image`
- `role`
- `banned`
- `ban_reason`
- `ban_expires`
- `timezone`
- `username`
- `created_at`
- `updated_at`

Notes:

- `email` is indexed
- `role` is nullable
- `username` is unique and indexed, may be null until set

### `session`

Better Auth session record.

Key columns:

- `id`
- `expires_at`
- `token`
- `ip_address`
- `user_agent`
- `user_id`
- `impersonated_by`
- `created_at`
- `updated_at`

Notes:

- indexed by `user_id`
- foreign key to `user.id`

### `account`

Auth provider linkage.

Key columns:

- `id`
- `account_id`
- `provider_id`
- `user_id`
- `access_token`
- `refresh_token`
- `id_token`
- `access_token_expires_at`
- `refresh_token_expires_at`
- `scope`
- `password`
- `created_at`
- `updated_at`

### `verification`

Verification tokens.

Key columns:

- `id`
- `identifier`
- `value`
- `expires_at`
- `created_at`
- `updated_at`

### `todo_item`

Current user-facing feature table.

Key columns:

- `id`
- `user_id`
- `content`
- `completed_at`
- `created_at`
- `updated_at`

Notes:

- indexed by `user_id`
- foreign key to `user.id`

### `job`

Reserved for background work.

Key columns:

- `id`
- `user_id`
- `type`
- `label`
- `status`
- `progress`
- `payload`
- `result`
- `error`
- `retry_count`
- `max_retries`
- `priority`
- `run_at`
- `lease_owner`
- `lease_expires_at`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

Notes:

- supports queue-style leasing and retries
- the current repo does not yet include a dedicated worker runtime

### `kysely_migration`

Kysely internal migration tracking.

### `kysely_migration_lock`

Kysely internal migration lock table.

## Relationships

- `user` -> `session`
- `user` -> `account`
- `user` -> `todo_item`
- `user` -> `job`

## Raw SQL Reminders

```sql
SELECT * FROM "user" WHERE email = 'test@example.com';

SELECT * FROM todo_item
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```
