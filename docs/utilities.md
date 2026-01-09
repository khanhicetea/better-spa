# Utility Libraries

**For Agents**: Read this doc when working with dates or object/array utilities.

---

## Date Handling (date-fns)

### Project Utilities

Use `src/lib/helpers/date.ts` for common formatting:

```typescript
import { formatDate, formatRelativeTime, formatSmart, formatTime, formatDateOnly } from "@/lib/helpers/date";

formatDate(date, "MMM d, yyyy h:mm a")  // "Jan 6, 2026 3:45 PM"
formatRelativeTime(date)                 // "2 hours ago", "in 3 days"
formatSmart(date)                        // "Today at 3:45 PM", "Yesterday at..."
formatTime(date)                         // "3:45 PM"
formatDateOnly(date)                     // "Jan 6, 2026"
```

### Direct date-fns Usage

For advanced operations, import directly:

```typescript
import { addDays, subMonths, differenceInHours, isBefore, format, parseISO, isValid } from "date-fns";

addDays(new Date(), 7);              // Add 7 days
subMonths(new Date(), 1);            // Subtract 1 month
differenceInHours(date1, date2);     // Diff in hours
isBefore(date1, date2);              // Compare dates
format(date, "yyyy-MM-dd");          // Custom format
parseISO("2026-01-06");              // Parse ISO string
isValid(date);                       // Validate date
```

### Best Practices

- **Database**: Use `timestamptz` (stores UTC internally)
- **Server**: Work in UTC, use `Date.toISOString()` for communication
- **Frontend**: Use project utilities for timezone-aware display

## Object/Array Utilities (lodash-es)

Tree-shakeable ES modules - import only what you need:

```typescript
import { cloneDeep, debounce, throttle, uniqBy, groupBy, omit, pick } from "lodash-es";

// Deep clone
const copy = cloneDeep(original);

// Debounce (delay execution)
const debouncedSearch = debounce(handleSearch, 300);

// Throttle (limit frequency)
const throttledScroll = throttle(handleScroll, 100);

// Array operations
const unique = uniqBy(items, "id");
const grouped = groupBy(items, "category");

// Object operations
const subset = pick(obj, ["id", "name"]);
const filtered = omit(obj, ["password", "secret"]);
```

### Common Patterns

```typescript
// Debounced search input
const handleSearch = debounce((query: string) => {
  searchMutation.mutate({ query });
}, 300);

// Throttled scroll handler
const handleScroll = throttle(() => {
  // Update scroll position
}, 100);

// Remove duplicates by ID
const uniqueItems = uniqBy([...existingItems, ...newItems], "id");

// Group items by category
const byCategory = groupBy(products, "categoryId");
// { "cat1": [...], "cat2": [...] }
```
