import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { Button, Loading, Table } from '@/components/ui'
import { IconCopy } from '@/assets/icons'
import { cn } from '@/utils'

import type {
  EmployeeImportResult,
  ImportParsedResult,
  ImportResultRecord,
} from '@/types/hrm-import.ts'

/** Empty or placeholder headers (e.g. _1, _2) show as blank in table */
function isPlaceholderOrEmptyHeader(header: string): boolean {
  const t = (header ?? '').trim()
  if (t === '') return true
  if (/^_\d+$/.test(t)) return true
  if (/^Unnamed\s*:\s*\d+$/i.test(t)) return true
  if (/^Cột\s+\d+$/i.test(t)) return true
  return false
}

function getDisplayHeader(header: string): string {
  return isPlaceholderOrEmptyHeader(header) ? '' : (header ?? '').trim()
}

export type RecruitmentRequestImportResultContentProps = {
  result: EmployeeImportResult
  activeTab: 'success' | 'failure'
  onTabChange: (value: 'success' | 'failure') => void
  onCopyFailure: () => void
  isLoading: boolean
}

function buildColumns(headers: string[], highlightError: boolean): ColumnDef<ImportResultRecord>[] {
  return headers.map((header, index) => {
    const displayLabel = getDisplayHeader(header)
    const accessorKey = header ?? `__col_${index}`
    const columnId = accessorKey || `__col_${index}`
    const lowerLabel = displayLabel.toLowerCase()
    const isErrorColumn =
      highlightError && (lowerLabel === 'thông tin lỗi' || lowerLabel.includes('import error'))
    const width = isErrorColumn ? 'w-[320px]' : 'w-[120px]'

    return {
      id: columnId,
      header: displayLabel,
      accessorFn: (row: ImportResultRecord) => row?.[accessorKey] ?? '',
      cell: ({ getValue }) => {
        const value = `${getValue() ?? ''}`
        return (
          <span
            className={cn(
              'text-content-dark-1 block w-full whitespace-pre-line',
              isErrorColumn && 'text-data-red-default'
            )}
          >
            {value}
          </span>
        )
      },
      meta: {
        frozen: isErrorColumn,
        width,
      },
    }
  })
}

const RecruitmentRequestImportResultContent = ({
  result,
  activeTab,
  onTabChange,
  onCopyFailure,
  isLoading,
}: RecruitmentRequestImportResultContentProps) => {
  const successData: ImportParsedResult = result.success ?? { headers: [], rows: [] }
  const failureData: ImportParsedResult = result.failure ?? { headers: [], rows: [] }

  const successColumns = useMemo(
    () => buildColumns(successData.headers, false),
    [successData.headers]
  )
  const failureColumns = useMemo(
    () => buildColumns(failureData.headers, true),
    [failureData.headers]
  )

  const tabs = useMemo(
    () => [
      {
        value: 'success' as const,
        label: `Danh sách thành công (${successData.rows.length})`,
        data: successData.rows,
        columns: successColumns,
      },
      {
        value: 'failure' as const,
        label: `Danh sách thất bại (${failureData.rows.length})`,
        data: failureData.rows,
        columns: failureColumns,
      },
    ],
    [failureColumns, failureData.rows, successColumns, successData.rows]
  )

  const showCopyFailure = failureData.rows.length > 0

  return (
    <>
      <Tabs value={activeTab}>
        <div className="flex items-center justify-between px-0">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} onClick={() => onTabChange(tab.value)}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {showCopyFailure && (
            <Button
              variant="text"
              className="text-action-primary-red-default hover:text-action-primary-red-hover text-nowrap"
              onClick={onCopyFailure}
              leftIcon={<IconCopy className="h-4 w-4" />}
            >
              Copy danh sách thất bại
            </Button>
          )}
        </div>
        <div className="px-0 pt-4 pb-0">
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="focus:outline-none">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loading variant="spinner" size="lg" />
                </div>
              ) : (
                <Table
                  data={tab.data}
                  columns={tab.columns}
                  enablePagination={tab.data.length > 10}
                  showSTT={false}
                  totalRecords={tab.data.length}
                  emptyMessage="Không có dữ liệu"
                  className="px-0 pb-0"
                  paginationPosition="inline"
                />
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </>
  )
}

export default RecruitmentRequestImportResultContent
