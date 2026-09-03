import React from 'react';
import { cn } from '../lib/utils';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows = [],
  rowKey,
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Hiện chưa có bản ghi nào để hiển thị trong danh sách này.',
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-hidden rounded border border-slate-200 bg-white shadow-2xs', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-inter">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={cn('px-4 py-3.5 whitespace-nowrap', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#B32B2F] border-t-transparent" />
                    <span>Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <h4 className="font-bold text-slate-700">{emptyTitle}</h4>
                    <p className="text-[11px] text-slate-400">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="transition-colors hover:bg-slate-50/60">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={cn('px-4 py-3.5 text-slate-800', col.className)}>
                      {col.render
                        ? col.render(row)
                        : col.accessorKey
                        ? (row[col.accessorKey] as any)
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
