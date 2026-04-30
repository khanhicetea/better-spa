# Utility Libraries

Compact reference for common helpers.

## Dates

Prefer project helpers in `src/lib/helpers/date.ts`:

- `formatDate`
- `formatTime`
- `formatDateOnly`
- `formatRelativeTime`
- `formatSmart`
- `toUTCString`
- `formatForDateTimeLocal`
- `isPast`
- `isFuture`

Rules:

- Store timestamps in PostgreSQL as `timestamptz`
- Send dates across boundaries as ISO strings when possible
- Format for display at the edge of the UI

## `date-fns`

Import directly when project helpers are not enough:

- `format`
- `parseISO`
- `addDays`
- `subMonths`
- `isBefore`
- `isAfter`

## `lodash-es`

Use named imports only.

Common utilities already used in the repo:

- `pickBy`
- `pick`
- `omit`
- `uniqBy`
- `groupBy`
- `debounce`
- `throttle`

Use them sparingly; prefer plain JS when the native code is clearer.
