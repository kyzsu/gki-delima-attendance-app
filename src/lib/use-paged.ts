import * as React from "react";

/** Client-side pagination for an in-memory list. The returned `page` is always
 *  clamped to the valid range, so the list shrinking (e.g. switching months)
 *  never leaves you on an empty page. */
export function usePaged<T>(items: T[], perPage = 10) {
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, pageCount - 1);
  const start = current * perPage;
  return {
    page: current,
    setPage,
    pageCount,
    pageItems: items.slice(start, start + perPage),
    rangeStart: items.length === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + perPage, items.length),
    total: items.length,
  };
}
