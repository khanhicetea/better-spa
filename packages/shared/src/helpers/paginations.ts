type PaginationItem = {
  type: "page" | "ellipsis";
  value: number | string;
  key: string;
};

export function getPaginationRange(
  currentPage: number,
  pageCount: number,
  maxVisible: number = 7,
): PaginationItem[] {
  const pages: PaginationItem[] = [];

  if (pageCount <= maxVisible) {
    for (let i = 1; i <= pageCount; i++) {
      pages.push({ type: "page", value: i, key: `page-${i}` });
    }
  } else {
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push({ type: "page", value: i, key: `page-${i}` });
      }
      pages.push({ type: "ellipsis", value: "...", key: "ellipsis-end" });
      pages.push({ type: "page", value: pageCount, key: `page-${pageCount}` });
    } else if (currentPage >= pageCount - 3) {
      pages.push({ type: "page", value: 1, key: "page-1" });
      pages.push({ type: "ellipsis", value: "...", key: "ellipsis-start" });
      for (let i = pageCount - 4; i <= pageCount; i++) {
        pages.push({ type: "page", value: i, key: `page-${i}` });
      }
    } else {
      pages.push({ type: "page", value: 1, key: "page-1" });
      pages.push({ type: "ellipsis", value: "...", key: "ellipsis-start" });
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push({ type: "page", value: i, key: `page-${i}` });
      }
      pages.push({ type: "ellipsis", value: "...", key: "ellipsis-end" });
      pages.push({ type: "page", value: pageCount, key: `page-${pageCount}` });
    }
  }

  return pages;
}
