import { useMemo, useState, useEffect } from 'react';

export function usePagination<T>(items: T[], pageSize = 6) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // Не оставляем пользователя на несуществующей странице после фильтра/удаления.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, pageCount, pageItems };
}
