import { Table, ColumnDef, Button } from '@/components/ui'
import { useMemo } from 'react'
import { IconEye } from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { cn } from '@/utils'

export interface KPIUnitEvaluationData {
  readonly id: number
  readonly month: string
  finalized?: boolean
  readonly employee_count: string
  readonly department_count: string
  note?: string
  readonly created_at: string
  readonly updated_at: string
}

type KPIUnitEvaluationTableProps = {
  data: KPIUnitEvaluationData[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  hasFilter?: boolean
}

const KPIUnitEvaluationTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  hasFilter = false,
}: KPIUnitEvaluationTableProps) => {
  const navigate = useNavigate()

  const columns = useMemo<ColumnDef<KPIUnitEvaluationData>[]>(
    () => [
      {
        accessorKey: 'month',
        header: 'Kỳ đánh giá',
        cell: ({ row }) => {
          return <span className="font-medium">Tháng {row.original.month}</span>
        },
        meta: {
          width: 'w-72',
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            iconOnly
            leftIcon={<IconEye className="h-4 w-4" />}
            className={cn(
              'text-content-dark-1 bg-transparent',
              'hover:text-action-primary-red-default hover:bg-transparent',
              'flex h-8 w-8 items-center justify-center',
              'border-none'
            )}
            onClick={() =>
              navigate(
                {
                  pathname: APP_PATH.KPI_UNIT_EVALUATION_DETAIL.replace(
                    ':id',
                    String(row.original.id)
                  ),
                  search: `?period=${row.original.id}`,
                },
                {
                  state: { month: row.original.month, period: row.original.id },
                }
              )
            }
          ></Button>
        ),
        meta: {
          width: 'w-8',
        },
      },
    ],
    [navigate]
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      enableSorting
      manualSorting
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
    />
  )
}

export default KPIUnitEvaluationTable
