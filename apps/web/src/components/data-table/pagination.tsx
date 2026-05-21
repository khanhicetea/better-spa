import { Button } from "@/components/ui/button";
import { getPaginationRange } from "@better-spa/shared/helpers/paginations";

interface DataTablePaginationProps {
  currentPage: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  itemsCount: number;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  currentPage,
  pageCount,
  totalCount,
  pageSize,
  itemsCount,
  onPageChange,
}: DataTablePaginationProps) {
  const pageNumbers = getPaginationRange(currentPage, pageCount);

  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground text-sm">
        Showing {itemsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
        {Math.min(currentPage * pageSize, totalCount)} ({totalCount} rows)
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((item) => {
            if (item.type === "ellipsis") {
              return (
                <span key={item.key} className="px-2">
                  {item.value}
                </span>
              );
            }

            return (
              <Button
                key={item.key}
                variant={currentPage === item.value ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(item.value as number)}
              >
                {item.value}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === pageCount}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
