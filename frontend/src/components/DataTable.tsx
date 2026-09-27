import React, { useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Column<T> {
  name: string;
  key: keyof T;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (ids: Set<string | number>) => void;
  /** When supplied the table pages on the server instead of slicing locally. */
  pagination?: TablePagination;
  emptyMessage?: string;
  rowKey?: (row: T) => string | number;
  /** Row id used for the selected-state styling. */
  activeId?: string | number | null;
}

export function DataTable<T extends { id?: string | number }>(props: DataTableProps<T>) {
  const {
    columns,
    data,
    pageSize = 20,
    onRowClick,
    selectable,
    selectedIds,
    onSelectionChange,
    pagination,
    emptyMessage = 'No records found for the current filters',
    rowKey,
    activeId = null,
  } = props;

  const [internalPage, setInternalPage] = useState(1);
  const [internalSelection, setInternalSelection] = useState<Set<string | number>>(new Set());
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const selection = selectedIds ?? internalSelection;
  const setSelection = onSelectionChange ?? setInternalSelection;

  const page = pagination?.page ?? internalPage;
  const pageSizeResolved = pagination?.pageSize ?? pageSize;
  const total = pagination?.total ?? data.length;

  useEffect(() => {
    if (pagination) return;
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    if (internalPage > totalPages) setInternalPage(1);
  }, [data.length, pageSize, internalPage, pagination]);

  const sortedData = useMemo(() => {
    if (!sortKey || pagination) return data;
    return [...data].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === vb) return 0;
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      const cmp = va < vb ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, pagination]);

  const viewData = pagination
    ? sortedData
    : sortedData.slice((page - 1) * pageSizeResolved, page * pageSizeResolved);

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : Math.max(1, Math.ceil(data.length / pageSizeResolved));

  const startIdx = pagination ? (pagination.page - 1) * pagination.pageSize : (page - 1) * pageSizeResolved;

  const handleSort = (key: keyof T) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const idOf = (row: T, offset = 0): string | number => {
    const custom = rowKey?.(row);
    if (custom !== undefined) return custom;
    const raw = row.id;
    if (raw !== undefined) return raw;
    return `row-${startIdx + offset}`;
  };

  const allOnPageSelected = viewData.length > 0 && viewData.every((r, i) => selection.has(idOf(r, i)));

  const toggleSelectAll = () => {
    const next = new Set(selection);
    if (allOnPageSelected) viewData.forEach((r, i) => next.delete(idOf(r, i)));
    else viewData.forEach((r, i) => next.add(idOf(r, i)));
    setSelection(next);
  };

  const toggleRow = (id: string | number) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(next);
  };

  const goTo = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    if (pagination) pagination.onPageChange(clamped);
    else setInternalPage(clamped);
  };

  const from = total === 0 ? 0 : startIdx + 1;
  const to = Math.min(startIdx + viewData.length, total);

  return (
    <div className="w-full flex flex-col bg-white border border-hairline-strong rounded-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="m-table">
          <thead>
            <tr>
              {selectable && (
                <th scope="col" style={{ width: 30 }}>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all rows on this page"
                    className="align-middle"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 uppercase tracking-[0.06em] font-bold text-ink-muted hover:text-ink"
                      aria-label={`Sort by ${col.name}`}
                    >
                      {col.name}
                      {sortKey === col.key &&
                        (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </button>
                  ) : (
                    col.name
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viewData.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={columns.length + (selectable ? 1 : 0)}>{emptyMessage}</td>
              </tr>
            ) : (
              viewData.map((row, i) => {
                const id = idOf(row, i);
                const isSelected = selection.has(id);
                const isActive = activeId != null && String(activeId) === String(id);
                return (
                  <tr
                    key={id}
                    className={cn(
                      onRowClick && 'is-clickable',
                      (isSelected || isActive) && 'is-selected',
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                  >
                    {selectable && (
                      <td onClick={(e) => e.stopPropagation()} className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={cn(
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                        )}
                      >
                        {col.render ? col.render(row) : String((row[col.key] as React.ReactNode) ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-tints-500 border-t border-hairline-strong text-[10px] text-ink-muted">
        <span className="mono">
          Showing {from}–{to} of {total} records
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="m-btn sm"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            Prev
          </button>
          <span className="mono px-1">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className="m-btn sm"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
        {selectable && (
          <span className="mono">{selection.size} selected</span>
        )}
      </div>
    </div>
  );
}
