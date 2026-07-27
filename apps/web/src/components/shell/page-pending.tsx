import { Skeleton } from "../ui/skeleton";

const PENDING_SKELETON_IDS = [
  "pending-1",
  "pending-2",
  "pending-3",
  "pending-4",
  "pending-5",
  "pending-6",
  "pending-7",
  "pending-8",
  "pending-9",
  "pending-10",
] as const;

export function PagePending() {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {PENDING_SKELETON_IDS.map((id) => (
            <Skeleton key={id} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
