# Database Schema

Current database snapshot for agent use.

Last updated: 2026-05-17

## Global Rules

- SQL tables are singular.
- SQL columns use `snake_case`.
- TypeScript schema properties use `camelCase`.
- Quote `"user"` in raw SQL because `user` is reserved in PostgreSQL.
- Store JSON arrays under an object key, for example `{ files: [...] }`.

## Tables

### `user`

Better Auth user plus app profile fields.

Columns:

- `id`
- `name`
- `email`
- `email_verified`
- `image`
- `role`
- `banned`
- `ban_reason`
- `ban_expires`
- `username`
- `timezone`
- `created_at`
- `updated_at`

Indexes:

- `idx_user_email` on `email`
- unique `idx_user_username` on `username`

### `session`

Better Auth session.

Columns:

- `id`
- `expires_at`
- `token`
- `created_at`
- `updated_at`
- `ip_address`
- `user_agent`
- `user_id`
- `impersonated_by`

Indexes:

- `idx_session_user_id` on `user_id`
- `idx_session_expires_at` on `expires_at`

### `account`

Auth provider linkage.

Columns:

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

Indexes:

- `idx_account_user_id` on `user_id`
- `idx_account_provider_account` on `provider_id`, `account_id`

### `verification`

Verification tokens.

Columns:

- `id`
- `identifier`
- `value`
- `expires_at`
- `created_at`
- `updated_at`

### `todo_item`

Current user-facing feature table.

Columns:

- `id`
- `user_id`
- `content`
- `completed_at`
- `created_at`
- `updated_at`

Indexes:

- `idx_todo_item_user_id` on `user_id`
- `idx_todo_item_completed_at` on `completed_at`

### Kysely Internal Tables

- `kysely_migration`
- `kysely_migration_lock`

## Removed Tables

- `job` was created in `2026-04-18_00-02_job.ts` and dropped in `2026-05-12-01-00_remove-job.ts`.
- Do not write new code against `job` unless a new migration reintroduces it.

## Relationships

- `user` -> `session`
- `user` -> `account`
- `user` -> `todo_item`

## Raw SQL Reminders

```sql
SELECT * FROM "user" WHERE email = 'test@example.com';

SELECT * FROM todo_item
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```
