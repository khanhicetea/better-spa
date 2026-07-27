# Utility Libraries

Common helpers already used in this repo.

## Dates

Prefer project helpers from `packages/shared/src/helpers/date.ts`, exported as
`@better-spa/shared/helpers/date`:

- `formatDate`
- `formatTime`
- `formatDateOnly`
- `formatRelativeTime`
- `formatSmart`
- `toUTCString`
- `getUserTimeZone`
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

Prefer plain JavaScript for small object transformations. The starter intentionally does
not depend on `lodash-es`.
