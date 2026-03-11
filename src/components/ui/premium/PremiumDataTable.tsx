import type { ReactNode } from 'react';

export type Column<T> = {
  /** Header label */
  header: string;
  /** Key on T to display, or a render function */
  accessor: keyof T | ((row: T, index: number) => ReactNode);
  /** Optional className for the cell */
  className?: string;
  /** Scope for header (defaults to 'col') */
  scope?: string;
};

type Props<T> = {
  /** Table columns */
  columns: Column<T>[];
  /** Data rows */
  data: T[];
  /** Unique key extractor */
  keyExtractor: (row: T, index: number) => string;
  /** Optional row highlight function */
  rowHighlight?: (row: T) => string | undefined;
  /** Accessible label */
  ariaLabel?: string;
  /** Optional empty-state message */
  emptyMessage?: string;
};

/**
 * Premium data table — sticky header, zebra rows, hover states,
 * glass-card styling, and responsive horizontal scroll.
 */
export default function PremiumDataTable<T>({
  columns,
  data,
  keyExtractor,
  rowHighlight,
  ariaLabel,
  emptyMessage = 'No data available.',
}: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
      <table className="min-w-full text-sm" aria-label={ariaLabel}>
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.03]">
            {columns.map((col) => (
              <th
                key={String(col.header)}
                scope={(col.scope as 'col') || 'col'}
                className={`whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-zinc-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const highlight = rowHighlight?.(row);
              return (
                <tr
                  key={keyExtractor(row, i)}
                  className={`border-b border-white/[0.04] transition-colors duration-150 ${
                    highlight ?? (i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]')
                  } hover:bg-white/[0.04]`}
                >
                  {columns.map((col) => {
                    const cell =
                      typeof col.accessor === 'function'
                        ? col.accessor(row, i)
                        : (row[col.accessor] as ReactNode);
                    return (
                      <td
                        key={String(col.header)}
                        className={`whitespace-nowrap px-3 py-2.5 text-zinc-200 ${col.className ?? ''}`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
