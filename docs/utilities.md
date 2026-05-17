# Utility Libraries

Common helpers already used in this repo.

## Dates

Prefer project helpers from `src/lib/helpers/date.ts`:

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

- store timestamps as `timestamptz`
- send dates across boundaries as ISO strings when possible
- format for display at the edge of the UI

## `date-fns`

Use direct imports only when project helpers are not enough.

Common cases:

- `format`
- `parseISO`
- `addDays`
- `subMonths`
- `isBefore`
- `isAfter`

## `lodash-es`

Use named imports only.

Already used in the repo:

- `pickBy`
- `pick`
- `omit`
- `uniqBy`
- `groupBy`
- `debounce`
- `throttle`

Prefer plain JS when it is clearer.
