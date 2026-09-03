import { useCallback, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'

export interface EmployeeKPIData {
  readonly id: number
  readonly employee_id: string
  readonly employee_name: string
  readonly position_name: string
  readonly total_employee_score: string
  readonly total_manager_score: number
  readonly grade_manager: string
  readonly grade_hrm: string
}

type KPIPeriodSummaryEmployeeListDetailWrapperProps = {
  data: EmployeeKPIData[]
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

const KPIPeriodSummaryEmployeeListDetailWrapper = ({
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
}: KPIPeriodSummaryEmployeeListDetailWrapperProps) => {
  const columns = useMemo<ColumnDef<EmployeeKPIData>[]>(
    () => [
      {
        accessorKey: 'employee_id',
        header: 'Mã nhân viên',
        cell: ({ row }) => <span>{row.original.employee_id}</span>,
        meta: { width: 'w-32' },
      },
      {
        accessorKey: 'employee_name',
        header: 'Họ tên',
        cell: ({ row }) => <span className="font-medium">{row.original.employee_name}</span>,
        meta: { width: 'w-48' },
      },
      {
        accessorKey: 'position_name',
        header: 'Chức vụ',
        cell: ({ row }) => <span>{row.original.position_name}</span>,
        meta: { width: 'w-48' },
      },
      {
        accessorKey: 'total_employee_score',
        header: 'Tự đánh giá',
        cell: ({ row }) => <span className="font-medium">{row.original.total_employee_score}</span>,
        meta: { width: 'w-24' },
      },
      {
        accessorKey: 'total_manager_score',
        header: 'Tổng điểm cấp trên đánh giá',
        cell: ({ row }) => <span>{row.original.total_manager_score}</span>,
        meta: { width: 'w-32' },
      },
      {
        accessorKey: 'grade_manager',
        header: 'Xếp loại KPI (Trưởng phòng)',
        cell: ({ row }) => <span>{row.original.grade_manager}</span>,
        meta: { width: 'w-32' },
      },
      {
        accessorKey: 'grade_hrm',
        header: 'Xếp loại KPI (Nhân sự)',
        cell: ({ row }) => <span>{row.original.grade_hrm}</span>,
        meta: { width: 'w-32' },
      },
    ],
    []
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
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      onClearFilter={onClearFilter}
      hasFilter={hasFilter}
    />
  )
}

export default KPIPeriodSummaryEmployeeListDetailWrapper
