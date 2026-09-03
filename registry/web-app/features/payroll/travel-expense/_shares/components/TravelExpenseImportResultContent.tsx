import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { Button, Loading, Table } from '@/components/ui'
import { IconCopy } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common.ts'

import type {
  TravelExpenseImportResult,
  ImportParsedResult,
  ImportResultRecord,
} from '@/types/travel-expense-import.ts'

export type TravelExpenseImportResultContentProps = {
  result: TravelExpenseImportResult
  activeTab: 'success' | 'failure'
  onTabChange: (value: 'success' | 'failure') => void
  onCopyFailure: () => void
  isLoading: boolean
}

const buildColumns = (headers: string[], showError: boolean): ColumnDef<ImportResultRecord>[] => {
  const columns: ColumnDef<ImportResultRecord>[] = []

  columns.push({
    accessorKey: '__stt__',
    header: 'STT',
    meta: {
      width: 'w-[60px]',
    },
    cell: ({ row }) => {
      return <span className="text-content-dark-2">{row.index + 1}</span>
    },
  })

  headers.forEach((header) => {
    columns.push({
      accessorKey: header,
      header: header,
      meta: {
        width: header === 'Mã nhân viên' ? 'w-[150px]' : undefined,
      },
      cell: ({ getValue }) => {
        const value = getValue() as string
        const headerLower = header.toLowerCase()

        if (
          headerLower.includes('theo ngày công') ||
          headerLower.includes('chịu thuế') ||
          headerLower.includes('không chịu thuế') ||
          headerLower.includes('công tác phí')
        ) {
          const numValue = parseFloat(value?.replace(/[^\d.-]/g, '') || '0')
          return <div className="text-left">{formatCurrencyVND(numValue)}</div>
        }

        if ((showError && headerLower.includes('lỗi')) || headerLower.includes('thông tin')) {
          return (
            <div className="text-action-primary-red-hover text-sm break-words">{value || '-'}</div>
          )
        }

        return <div className="text-content-dark-1">{value || '-'}</div>
      },
    })
  })

  return columns
}

const TravelExpenseImportResultContent = ({
  result,
  activeTab,
  onTabChange,
  onCopyFailure,
  isLoading,
}: TravelExpenseImportResultContentProps) => {
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
                <>
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
                </>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </>
  )
}

export default TravelExpenseImportResultContent
