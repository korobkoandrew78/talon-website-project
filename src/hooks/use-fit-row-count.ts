import { useLayoutEffect, useRef, useState, DependencyList } from 'react';

interface Options {
  minRows?: number;
  fallbackRows?: number;
  // Место под таблицей (пагинация, отступы до низа страницы), которое нужно вычесть из доступной высоты.
  extraBottomSpace?: number;
  // Пересчитать при изменении этих значений (например после загрузки данных).
  deps?: DependencyList;
}

// Вычисляет, сколько строк таблицы помещается по высоте от текущей позиции
// до низа окна, чтобы страница не требовала вертикальной прокрутки.
export function useFitRowCount({
  minRows = 3,
  fallbackRows = 10,
  extraBottomSpace = 0,
  deps = [],
}: Options = {}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const footRef = useRef<HTMLDivElement | null>(null);
  const [rowCount, setRowCount] = useState(fallbackRows);

  useLayoutEffect(() => {
    const calc = () => {
      const container = containerRef.current;
      if (!container) return;
      const top = container.getBoundingClientRect().top;
      const rowHeight = rowRef.current?.getBoundingClientRect().height || 36;
      const footHeight = footRef.current?.getBoundingClientRect().height || 0;
      const available = window.innerHeight - top - footHeight - extraBottomSpace;
      const count = Math.max(minRows, Math.floor(available / rowHeight));
      setRowCount((prev) => (prev === count ? prev : count));
    };

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, rowRef, footRef, rowCount };
}