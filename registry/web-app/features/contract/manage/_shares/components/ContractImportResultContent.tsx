import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { Button, Loading, Table } from '@/components/ui'
import { IconCopy } from '@/assets/icons'
import { cn } from '@/utils'

import type {
  ContractImportResult,
  ImportParsedResult,
  ImportResultRecord,
} from '@/types/contract-import.ts'
import { Flex } from '@radix-ui/themes'

export type ContractImportResultContentProps = {
  result: ContractImportResult
  activeTab: 'success' | 'failure'
  onTabChange: (value: 'success' | 'failure') => void
  onCopyFailure: () => void
  isLoading: boolean
}

const ContractImportResultContent = ({
  result,
  activeTab,
  onTabChange,
  onCopyFailure,
  isLoading,
}: ContractImportResultContentProps) => {
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
    [failureColumns, failureData.rows.length, successColumns, successData.rows.length]
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading variant="spinner" size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as 'success' | 'failure')}
      >
        <TabsList className="w-full">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {tab.data.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center py-10">
                <p className="typo-body-base-regular text-content-dark-3">
                  {tab.value === 'success'
                    ? 'Không có dữ liệu thành công'
                    : 'Không có dữ liệu thất bại'}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {failureData.rows.length > 0 && (
        <Flex justify="end" className="border-border-1 border-t-[1px] pt-4">
          <Button
            variant="secondary"
            onClick={onCopyFailure}
            className={cn('flex items-center gap-2')}
            leftIcon={<IconCopy className="h-4 w-4" />}
          >
            Sao chép danh sách thất bại
          </Button>
        </Flex>
      )}
    </div>
  )
}

function buildColumns(headers: string[], isFailure: boolean): ColumnDef<ImportResultRecord>[] {
  return headers.map((header, index) => ({
    accessorKey: header,
    header: () => <div className="typo-body-sm-semibold text-content-dark-1">{header}</div>,
    cell: ({ getValue }) => {
      const value = getValue() as string
      return (
        <div
          className={cn(
            'typo-body-sm-regular',
            isFailure && index === headers.length - 1
              ? 'text-action-primary-red-default'
              : 'text-content-dark-2'
          )}
        >
          {value || '-'}
        </div>
      )
    },
  }))
}

export default ContractImportResultContent
