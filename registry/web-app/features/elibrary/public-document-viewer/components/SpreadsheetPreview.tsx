import { useMemo, useState } from 'react'

import * as XLSX from 'xlsx'

import { cn } from '@/utils'

import type { PublicLibraryFile } from '../types'
import { useRemoteFileData } from '../hooks/useRemoteFileData'
import { DownloadOnlyCard } from './DownloadOnlyCard'
import { ViewerLoading } from './ViewerLoading'

const MAX_ROWS = 1000

type SheetRow = (string | number | boolean)[]

/** Xem trước bảng tính (.xls/.xlsx/.csv) bằng SheetJS → bảng Tailwind. */
export default function SpreadsheetPreview({ file }: { file: PublicLibraryFile }) {
  const { data: buffer, isLoading, error } = useRemoteFileData(file.download_url, 'arrayBuffer')
  const [activeSheet, setActiveSheet] = useState(0)

  const workbook = useMemo(() => {
    if (!buffer) return null
    try {
      return XLSX.read(new Uint8Array(buffer), { type: 'array' })
    } catch {
      return null
    }
  }, [buffer])

  const rows = useMemo<SheetRow[]>(() => {
    if (!workbook) return []
    const name = workbook.SheetNames[activeSheet]
    const sheet = name ? workbook.Sheets[name] : undefined
    if (!sheet) return []
    return XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, defval: '', blankrows: false })
  }, [workbook, activeSheet])

  if (isLoading) return <ViewerLoading message="Đang tải bảng tính..." />
  if (error || !workbook) {
    return (
      <DownloadOnlyCard
        file={file}
        message="Không thể hiển thị bảng tính. Bạn có thể tải về để xem."
      />
    )
  }

  const visibleRows = rows.slice(0, MAX_ROWS)
  const colCount = visibleRows.reduce((max, row) => Math.max(max, row.length), 0)

  return (
    <div className="flex w-full flex-col gap-2">
      {workbook.SheetNames.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {workbook.SheetNames.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(index)}
              className={cn(
                'rounded-t-md border-b-2 px-3 py-1.5 text-sm transition-colors',
                index === activeSheet
                  ? 'border-action-primary-red-default text-content-dark-1 font-semibold'
                  : 'text-content-dark-3 hover:text-content-dark-2 border-transparent'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="border-border-1 bg-background-1 overflow-auto rounded-md border shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  rowIndex === 0
                    ? 'bg-background-3 font-semibold'
                    : 'odd:bg-background-1 even:bg-background-2'
                }
              >
                <td className="border-border-1 text-content-dark-3 border px-2 py-1 text-center text-xs">
                  {rowIndex + 1}
                </td>
                {Array.from({ length: colCount }, (_col, colIndex) => (
                  <td
                    key={colIndex}
                    className="border-border-1 text-content-dark-2 border px-3 py-1 whitespace-nowrap"
                  >
                    {String(row[colIndex] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > MAX_ROWS && (
        <p className="text-content-dark-3 text-xs">
          Chỉ hiển thị {MAX_ROWS} dòng đầu trên tổng {rows.length} dòng. Tải về để xem đầy đủ.
        </p>
      )}
    </div>
  )
}
