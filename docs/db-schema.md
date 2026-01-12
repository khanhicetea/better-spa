# Database Schema

**For Agents**: Read this doc to understand the current database structure.

> **IMPORTANT**: This file must be updated after every database migration. See CLAUDE.md for instructions.

**Last Updated**: 2026-01-06

**Database Convention**:

- **Table names**: Singular form (e.g., `user`, `todo_category`, `job`)
- **Column names**: `snake_case` in database, `camelCase` in TypeScript code
- **Reserved keyword note**: `user` is a reserved keyword in PostgreSQL, always quote as `"user"` in raw SQL
- **No numbered array JSON fields**: Avoid using JSON fields with directly numbered keys (e.g., `[item1, item2]`), wrap them in an object with a string key (e.g., `{"items": [...]}` or `{"values": [...]}`).

---

## Tables

### `user`

User accounts managed by Better Auth.

| Column           | Type          | Nullable | Default | Description               |
| ---------------- | ------------- | -------- | ------- | ------------------------- |
| `id`             | `text`        | NO       | -       | Primary key (UUID)        |
| `name`           | `text`        | NO       | -       | User's display name       |
| `email`          | `text`        | NO       | -       | User's email address      |
| `email_verified` | `boolean`     | NO       | `false` | Email verification status |
| `image`          | `text`        | YES      | -       | Profile image URL         |
| `role`           | `text`        | YES      | -       | User role (e.g., "admin") |
| `banned`         | `boolean`     | YES      | -       | Ban status flag           |
| `ban_reason`     | `text`        | YES      | -       | Reason for ban            |
| `ban_expires`    | `timestamptz` | YES      | -       | Ban expiration timestamp  |
| `created_at`     | `timestamptz` | NO       | `now()` | Account creation time     |
| `updated_at`     | `timestamptz` | NO       | `now()` | Last update time          |

**Indexes**:

- `idx_user_email` on `email`

---

### `session`

User sessions for authentication.

| Column            | Type          | Nullable | Default | Description               |
| ----------------- | ------------- | -------- | ------- | ------------------------- |
| `id`              | `text`        | NO       | -       | Primary key (UUID)        |
| `expires_at`      | `timestamptz` | NO       | -       | Session expiration time   |
| `token`           | `text`        | NO       | -       | Unique session token      |
| `user_id`         | `text`        | NO       | -       | Foreign key to `user.id`  |
| `impersonated_by` | `text`        | YES      | -       | ID of admin impersonating |
| `ip_address`      | `text`        | YES      | -       | Client IP address         |
| `user_agent`      | `text`        | YES      | -       | Client user agent         |
| `created_at`      | `timestamptz` | NO       | `now()` | Session creation time     |
| `updated_at`      | `timestamptz` | NO       | `now()` | Last update time          |

**Indexes**:

- `idx_session_user_id` on `user_id`
- `idx_session_expires_at` on `expires_at`

**Foreign Keys**:

- `user_id` → `user.id` (CASCADE DELETE, CASCADE UPDATE)

---

### `account`

OAuth/password provider accounts linked to users.

| Column                     | Type          | Nullable | Default | Description                     |
| -------------------------- | ------------- | -------- | ------- | ------------------------------- |
| `id`                       | `text`        | NO       | -       | Primary key (UUID)              |
| `account_id`               | `text`        | NO       | -       | Provider's account ID           |
| `provider_id`              | `text`        | NO       | -       | OAuth provider (e.g., "google") |
| `user_id`                  | `text`        | NO       | -       | Foreign key to `user.id`        |
| `access_token`             | `text`        | YES      | -       | OAuth access token              |
| `refresh_token`            | `text`        | YES      | -       | OAuth refresh token             |
| `id_token`                 | `text`        | YES      | -       | OAuth ID token                  |
| `access_token_expires_at`  | `timestamptz` | YES      | -       | Access token expiry             |
| `refresh_token_expires_at` | `timestamptz` | YES      | -       | Refresh token expiry            |
| `scope`                    | `text`        | YES      | -       | OAuth scope                     |
| `password`                 | `text`        | YES      | -       | Hashed password (if applicable) |
| `created_at`               | `timestamptz` | NO       | `now()` | Account link time               |
| `updated_at`               | `timestamptz` | NO       | `now()` | Last update time                |

**Indexes**:

- `idx_account_user_id` on `user_id`
- `idx_account_provider_account` on (`provider_id`, `account_id`)

**Foreign Keys**:

- `user_id` → `user.id` (CASCADE DELETE, CASCADE UPDATE)

---

### `verification`

Email/phone verification tokens.

| Column       | Type          | Nullable | Default | Description             |
| ------------ | ------------- | -------- | ------- | ----------------------- |
| `id`         | `text`        | NO       | -       | Primary key (UUID)      |
| `identifier` | `text`        | NO       | -       | Email/phone to verify   |
| `value`      | `text`        | NO       | -       | Verification code/token |
| `expires_at` | `timestamptz` | NO       | -       | Token expiration time   |
| `created_at` | `timestamptz` | NO       | `now()` | Token creation time     |
| `updated_at` | `timestamptz` | NO       | `now()` | Last update time        |

---

### `todo_category`

Categories for organizing todo items.

| Column       | Type          | Nullable | Default | Description              |
| ------------ | ------------- | -------- | ------- | ------------------------ |
| `id`         | `text`        | NO       | -       | Primary key (UUID)       |
| `user_id`    | `text`        | NO       | -       | Foreign key to `user.id` |
| `name`       | `text`        | NO       | -       | Category name            |
| `created_at` | `timestamptz` | NO       | `now()` | Creation time            |
| `updated_at` | `timestamptz` | NO       | `now()` | Last update time         |

**Indexes**:

- `idx_todo_category_user_id` on `user_id`

**Foreign Keys**:

- `user_id` → `user.id` (CASCADE DELETE, CASCADE UPDATE)

---

### `todo_item`

Individual todo tasks.

| Column         | Type          | Nullable | Default | Description                       |
| -------------- | ------------- | -------- | ------- | --------------------------------- |
| `id`           | `text`        | NO       | -       | Primary key (UUID)                |
| `user_id`      | `text`        | NO       | -       | Foreign key to `user.id`          |
| `category_id`  | `text`        | NO       | -       | Foreign key to `todo_category.id` |
| `content`      | `text`        | NO       | -       | Todo item content                 |
| `completed_at` | `timestamptz` | YES      | -       | Completion time (null = active)   |
| `created_at`   | `timestamptz` | NO       | `now()` | Creation time                     |
| `updated_at`   | `timestamptz` | NO       | `now()` | Last update time                  |

**Indexes**:

- `idx_todo_item_user_id` on `user_id`
- `idx_todo_item_category_id` on `category_id`
- `idx_todo_item_completed_at` on `completed_at`

**Foreign Keys**:

- `user_id` → `user.id` (CASCADE DELETE, CASCADE UPDATE)
- `category_id` → `todo_category.id` (CASCADE DELETE, CASCADE UPDATE)

---

### `job`

Background job queue for async tasks (exports, reports, emails, etc.).

| Column         | Type          | Nullable | Default     | Description                                        |
| -------------- | ------------- | -------- | ----------- | -------------------------------------------------- |
| `id`           | `text`        | NO       | -           | Primary key (UUID)                                 |
| `user_id`      | `text`        | NO       | -           | Foreign key to `user.id`                           |
| `type`         | `text`        | NO       | -           | Job type (handler name)                            |
| `label`        | `text`        | NO       | -           | Human-readable job label                           |
| `status`       | `text`        | NO       | `'pending'` | `pending`, `running`, `completed`, `failed`        |
| `progress`     | `integer`     | NO       | `0`         | Progress percentage (0-100)                        |
| `priority`     | `integer`     | NO       | `5`         | Job priority (0=low, 5=normal, 10=high, 20=urgent) |
| `payload`      | `jsonb`       | YES      | -           | Job input data                                     |
| `result`       | `jsonb`       | YES      | -           | Job output data                                    |
| `error`        | `text`        | YES      | -           | Error message (if failed)                          |
| `retry_count`  | `integer`     | NO       | `0`         | Number of retry attempts                           |
| `max_retries`  | `integer`     | NO       | `3`         | Maximum retry attempts                             |
| `run_at`       | `timestamptz` | NO       | `now()`     | Scheduled execution time                           |
| `started_at`   | `timestamptz` | YES      | -           | Job start time                                     |
| `completed_at` | `timestamptz` | YES      | -           | Job completion time                                |
| `created_at`   | `timestamptz` | NO       | `now()`     | Job creation time                                  |
| `updated_at`   | `timestamptz` | NO       | `now()`     | Last update time                                   |

**Indexes**:

- `idx_job_user_id` on `user_id`
- `idx_job_status_priority_created` on (`status`, `priority`, `created_at`)
- `idx_job_run_at` on (`run_at`, `status`)

**Foreign Keys**:

- `user_id` → `user.id` (CASCADE DELETE, CASCADE UPDATE)

---

### `product`

User products with S3 images stored as JSONB (private ACL).

| Column        | Type          | Nullable | Default | Description                                               |
| ------------- | ------------- | -------- | ------- | --------------------------------------------------------- |
| `id`          | `text`        | NO       | -       | Primary key (UUID)                                        |
| `user_id`     | `text`        | NO       | -       | Foreign key to `user.id`                                  |
| `name`        | `text`        | NO       | -       | Product name                                              |
| `description` | `text`        | YES      | -       | Product description                                       |
| `images`      | `jsonb`       | YES      | -       | S3 files (PrivateS3Files: `{ files: [{ key: string }] }`) |
| `created_at`  | `timestamptz` | NO       | `now()` | Creation time                                             |
| `updated_at`  | `timestamptz` | NO       | `now()` | Last update time                                          |

**Indexes**:

- `idx_product_user_id` on `user_id`

**Foreign Keys**:

- `user_id` → `user.id` (CASCADE DELETE, CASCADE UPDATE)

**Notes**:

- Images are stored with private ACL on S3
- Presigned URLs with TTL 3600s are generated on-demand for accessing images

---

### `kysely_migration`

Kysely migration tracking table (auto-managed).

### `kysely_migration_lock`

Kysely migration lock table (auto-managed).

---

## ER Diagram (Text)

```
user (1) ----< (N) session
  |
  +----< account
  |
  +----< verification
  |
  +----< todo_category (1) ----< (N) todo_item
  |
  +----< job
  |
  +----< product
```

---

## Query Examples for Agent Debugging

**Important**: Always quote `"user"` table in raw SQL (it's a reserved keyword).

```sql
-- Find user by name
SELECT * FROM "user" WHERE "name" ILIKE '%Khanh%';

-- Get user's todo categories
SELECT tc.* FROM todo_category tc
JOIN "user" u ON u.id = tc.user_id
WHERE u.name = 'Khanh';

-- Get pending jobs with priority
SELECT * FROM job
WHERE status = 'pending' AND run_at <= now()
ORDER BY priority DESC, created_at ASC;

-- Get todo items with category
SELECT ti.id, ti.content, tc.name as category_name
FROM todo_item ti
JOIN todo_category tc ON ti.category_id = tc.id
WHERE ti.user_id = 'USER_ID_HERE'
ORDER BY ti.created_at DESC;
```
