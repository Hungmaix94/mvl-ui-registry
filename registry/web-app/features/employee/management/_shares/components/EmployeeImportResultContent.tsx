import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { Button, Loading, Table } from '@/components/ui'
import { IconCopy, IconWarningcircle } from '@/assets/icons'
import { cn } from '@/utils'
import AttendanceExemptionImportResultTable from './AttendanceExemptionImportResultTable'

import type {
  EmployeeImportResult,
  ImportParsedResult,
  ImportResultRecord,
  ImportColumnStructure,
} from '@/types/hrm-import.ts'

function hasAttendanceExemptionStructure(
  structure: ImportColumnStructure[] | string[] | undefined
): structure is ImportColumnStructure[] {
  return (
    Array.isArray(structure) &&
    structure.length > 0 &&
    typeof structure[0] === 'object' &&
    structure[0] !== null &&
    'type' in structure[0] &&
    structure.some((item) => (item as ImportColumnStructure).type === 'group')
  )
}

export type EmployeeImportResultContentProps = {
  result: EmployeeImportResult
  activeTab: 'success' | 'failure'
  onTabChange: (value: 'success' | 'failure') => void
  onCopyFailure: () => void
  isLoading: boolean
  errorMessage?: string | null
}

const EmployeeImportResultContent = ({
  result,
  activeTab,
  onTabChange,
  onCopyFailure,
  isLoading,
  errorMessage,
}: EmployeeImportResultContentProps) => {
  const successData: ImportParsedResult = result.success ?? { headers: [], rows: [] }
  const failureData: ImportParsedResult = result.failure ?? { headers: [], rows: [] }

  const successColumns = useMemo(
    () => buildColumnsFromStructure(successData.columnStructure ?? successData.headers, false),
    [successData.headers, successData.columnStructure]
  )
  const failureColumns = useMemo(
    () => buildColumnsFromStructure(failureData.columnStructure ?? failureData.headers, true),
    [failureData.headers, failureData.columnStructure]
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
          {tabs.map((tab) => {
            const successHasStructure = hasAttendanceExemptionStructure(successData.columnStructure)
            const failureHasStructure = hasAttendanceExemptionStructure(failureData.columnStructure)
            const useCustomTable = successHasStructure || failureHasStructure
            const columnStructure = (
              tab.value === 'success'
                ? (successData.columnStructure ?? failureData.columnStructure)
                : (failureData.columnStructure ?? successData.columnStructure)
            ) as ImportColumnStructure[] | undefined
            return (
              <TabsContent key={tab.value} value={tab.value} className="focus:outline-none">
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loading variant="spinner" size="lg" />
                  </div>
                ) : useCustomTable && columnStructure ? (
                  <div className="flex-1 px-0 pb-0">
                    <AttendanceExemptionImportResultTable
                      data={tab.data}
                      columnStructure={columnStructure}
                      highlightError={tab.value === 'failure'}
                      emptyMessage="Không có dữ liệu"
                      enablePagination={tab.data.length > 10}
                    />
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
            )
          })}
        </div>
      </Tabs>
      {errorMessage && (
        <div className="bg-data-red-light text-data-red-default mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
          <IconWarningcircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-wrap">{errorMessage}</span>
        </div>
      )}
    </>
  )
}

function buildColumnsFromStructure(
  structure: ImportColumnStructure[] | string[],
  highlightError: boolean
): ColumnDef<ImportResultRecord>[] {
  const isStructure =
    structure.length > 0 && typeof structure[0] === 'object' && 'type' in structure[0]
  const items = structure as ImportColumnStructure[] | string[]

  if (!isStructure) {
    return (items as string[]).map((header, index) =>
      buildStandaloneColumn(header.trim() || `Cột ${index + 1}`, highlightError, undefined, {
        isSubColumn: false,
        isSpanRow: false,
      })
    )
  }

  const cols: ColumnDef<ImportResultRecord>[] = []
  for (const item of items as ImportColumnStructure[]) {
    if (item.type === 'standalone') {
      const isSpanRow = item.header === 'Mã nhân viên' || item.header === 'Họ tên'
      cols.push(
        buildStandaloneColumn(item.header, highlightError, item.accessorKey, {
          isSubColumn: false,
          isSpanRow,
        })
      )
    } else if (item.type === 'group') {
      cols.push({
        id: `group-${item.parentHeader}`,
        header: item.parentHeader,
        meta: { align: 'center' as const },
        columns: item.children.map((child) =>
          buildStandaloneColumn(child.header, highlightError, child.accessorKey, {
            isSubColumn: true,
            isDateColumn: true,
          })
        ),
      })
    }
  }
  return cols
}

type BuildStandaloneOptions = {
  isSubColumn?: boolean
  isSpanRow?: boolean
  isDateColumn?: boolean
}

function buildStandaloneColumn(
  headerLabel: string,
  highlightError: boolean,
  accessorKey?: string,
  options: BuildStandaloneOptions = {}
): ColumnDef<ImportResultRecord> {
  const { isSubColumn = false, isSpanRow = false, isDateColumn = false } = options
  const key = accessorKey ?? headerLabel
  const lowerLabel = headerLabel.toLowerCase()
  const isErrorColumn =
    highlightError && (lowerLabel === 'thông tin lỗi' || lowerLabel.includes('import error'))
  const columnId = key || headerLabel
  const width = isErrorColumn
    ? 'w-[320px]'
    : isDateColumn
      ? 'w-[40px]'
      : isSubColumn
        ? 'w-[48px]'
        : 'w-[120px]'

  return {
    id: columnId,
    header: headerLabel || 'Cột',
    accessorFn: (row: ImportResultRecord) => row?.[key] ?? '',
    cell: ({ getValue }) => {
      const value = `${getValue() ?? ''}`
      return (
        <span
          className={cn(
            'text-content-dark-1 block w-full whitespace-pre-line',
            isErrorColumn && 'text-data-red-default',
            isDateColumn && 'text-center'
          )}
        >
          {value}
        </span>
      )
    },
    meta: {
      frozen: isErrorColumn,
      width,
      align: isDateColumn ? ('center' as const) : undefined,
      rowSpan: isSpanRow ? 2 : undefined,
    },
  }
}

export default EmployeeImportResultContent
