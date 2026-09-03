import { useCallback, useMemo } from 'react'
import { Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui'
import { Eye } from 'lucide-react'
import { cn, formatNumber } from '@/utils'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_PATH } from '@/routes'

const formatGradeDistribution = (count: number, total: number): string => {
  const percentage = total > 0
    ? formatNumber((count / total) * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : '0,0'
  return `${count} / ${percentage}%`
}

export interface DepartmentKPIData {
  readonly id: number
  readonly department_id: number
  readonly branch_name: string
  readonly block_name: string
  readonly department_name: string
  readonly grade: string
  readonly employee_count: number
  readonly is_valid_unit_control: boolean
  readonly manager_grade_distribution: {
    A: number
    B: number
    C: number
    D: number
  }
}

type KPIPeriodSummaryDetailWrapperProps = {
  data: DepartmentKPIData[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  totalRecords: number
  currentPage: number
  pageSize: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

export const KPIPeriodSummaryDetailWrapper = ({
  data,
  isLoading,
  error,
  pageCount,
  totalRecords,
  currentPage,
  pageSize,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter = false,
}: KPIPeriodSummaryDetailWrapperProps) => {
  const navigate = useNavigate()
  const { id: periodId } = useParams<{ id: string }>()

  const columns = useMemo<ColumnDef<DepartmentKPIData>[]>(
    () => [
      {
        accessorKey: 'branch_name',
        header: 'Chi nhánh',
        cell: ({ row }) => {
          return <span>{row.original.branch_name}</span>
        },
        meta: {
          width: 'w-48',
        },
      },
      {
        accessorKey: 'block_name',
        header: 'Khối',
        cell: ({ row }) => {
          return <span>{row.original.block_name}</span>
        },
        meta: {
          width: 'w-32',
        },
      },
      {
        accessorKey: 'department_name',
        header: 'Phòng ban',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.department_name}</span>
        },
        meta: {
          width: 'w-64',
        },
      },
      {
        accessorKey: 'grade',
        header: 'KPI đơn vị',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.grade}</span>
        },
        meta: {
          width: 'w-24',
        },
      },
      {
        id: 'employee_count',
        header: 'Tổng số lượng nhân viên',
        cell: ({ row }) => {
          return <span>{row.original.employee_count}</span>
        },
        meta: {
          width: 'w-32',
        },
      },
      {
        id: 'employee_a',
        header: 'Số lượng nhân viên được A',
        cell: ({ row }) => {
          return (
            <span>
              {formatGradeDistribution(
                row.original.manager_grade_distribution.A,
                row.original.employee_count
              )}
            </span>
          )
        },
        meta: {
          width: 'w-32',
        },
      },
      {
        id: 'employee_b',
        header: 'Số lượng nhân viên được B',
        cell: ({ row }) => {
          return (
            <span>
              {formatGradeDistribution(
                row.original.manager_grade_distribution.B,
                row.original.employee_count
              )}
            </span>
          )
        },
        meta: {
          width: 'w-32',
        },
      },
      {
        id: 'employee_c',
        header: 'Số lượng nhân viên được C',
        cell: ({ row }) => {
          return (
            <span>
              {formatGradeDistribution(
                row.original.manager_grade_distribution.C,
                row.original.employee_count
              )}
            </span>
          )
        },
        meta: {
          width: 'w-32',
        },
      },
      {
        id: 'employee_d',
        header: 'Số lượng nhân viên được D',
        cell: ({ row }) => {
          return (
            <span>
              {formatGradeDistribution(
                row.original.manager_grade_distribution.D,
                row.original.employee_count
              )}
            </span>
          )
        },
        meta: {
          width: 'w-32',
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            iconOnly
            leftIcon={<Eye className="h-4 w-4" />}
            className={cn(
              'text-content-dark-1 bg-transparent',
              'hover:text-action-primary-red-default hover:bg-transparent',
              'flex h-8 w-8 items-center justify-center',
              'border-none'
            )}
            onClick={() => {
              navigate(
                APP_PATH.KPI_PERIOD_SUMMARY_EMPLOYEE_DETAIL.replace(
                  ':id',
                  String(periodId)
                ).replace(':departmentId', String(row.original.department_id)),
                {
                  state: {
                    branch_name: row.original.branch_name,
                    block_name: row.original.block_name,
                    department_name: row.original.department_name,
                  },
                }
              )
            }}
          ></Button>
        ),
        meta: {
          width: 'w-8',
        },
      },
    ],
    [navigate, periodId]
  )

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      onPaginationChange(pageIndex, newPageSize)
    },
    [onPaginationChange]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      onSortingChange(field, direction)
    },
    [onSortingChange]
  )

  const getRowClassName = useCallback((row: DepartmentKPIData) => {
    return row.is_valid_unit_control === false ? 'bg-background-6' : ''
  }, [])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      enableSorting={true}
      enablePagination={true}
      manualPagination={true}
      manualSorting={true}
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      onClearFilter={onClearFilter}
      hasFilter={hasFilter}
      getRowClassName={getRowClassName}
    />
  )
}
