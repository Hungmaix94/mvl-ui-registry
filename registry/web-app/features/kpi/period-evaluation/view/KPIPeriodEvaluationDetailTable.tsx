import { useMemo, startTransition } from 'react'
import { Table, Chip, TableActionMenu, TableAction } from '@/components/ui'
import { IconEye, IconPencilsimple } from '@/assets/icons'
import { formatNumber } from '@/utils/common'
import { useNavigate, useLocation } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { ColumnDef } from '@tanstack/react-table'
import { ColoredValueVariant } from '@/api/schema'
import { useAuth } from '@/store'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export type KPIPeriodEvaluationDetailTableProps = {
  data: any[]
  isLoading: boolean
  refetch: () => void
  totalRecords: number
  currentPage: number
  pageSize: number
  pageCount: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSearch: (value: string) => void
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
}

const getGradeVariant = (grade: string | undefined): ColoredValueVariant => {
  if (!grade) return ColoredValueVariant.GREY
  switch (grade.toUpperCase()) {
    case 'A':
      return ColoredValueVariant.GREEN
    case 'B':
      return ColoredValueVariant.BLUE
    case 'C':
      return ColoredValueVariant.YELLOW
    case 'D':
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}

export const KPIPeriodEvaluationDetailTable = ({
  data,
  isLoading,
  totalRecords,
  currentPage,
  pageSize,
  pageCount,
  onPaginationChange,
  onSortingChange,
}: KPIPeriodEvaluationDetailTableProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const isManagerMode = location.pathname.startsWith('/kpi/manager')
  const { keysMapOptions } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.EMPLOYEE_KPI_ASSESSMENT_STATUS_CHOICES],
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const statusOptions =
    (keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.EMPLOYEE_KPI_ASSESSMENT_STATUS_CHOICES) as {
      value: string
      label: string
      color: string
    }[]) || []

  const actions = useMemo<TableAction<any>[]>(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (row) =>
          startTransition(() => {
            navigate(
              (isManagerMode
                ? APP_PATH.KPI_MANAGER_ASSESSMENT_DETAIL
                : APP_PATH.KPI_ASSESSMENT_DETAIL
              ).replace(':id', String(row.id))
            )
          }),
      },
      {
        label: 'Đánh giá',
        icon: <IconPencilsimple size={16} />,
        onClick: (row) =>
          startTransition(() => {
            navigate(
              (isManagerMode
                ? APP_PATH.KPI_MANAGER_ASSESSMENT_ASSESS
                : APP_PATH.KPI_ASSESSMENT_ASSESS
              ).replace(':id', String(row.id))
            )
          }),
        show: (row: { employee: { id: number } }) => {
          if (isManagerMode && user?.employee?.id && user.employee.id === row.employee?.id) {
            return false
          }
          return true
        },
      },
    ],
    [navigate, isManagerMode, user?.employee?.id]
  )

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'employee.code',
        header: 'Mã nhân viên',
        size: 120,
      },
      {
        accessorKey: 'employee.fullname',
        header: 'Họ tên',
        size: 200,
      },
      {
        accessorKey: 'employee.branch.name',
        header: 'Chi nhánh',
        size: 150,
      },
      {
        accessorKey: 'employee.block.name',
        header: 'Khối',
        size: 150,
      },
      {
        accessorKey: 'employee.department.name',
        header: 'Phòng ban',
        size: 180,
      },
      {
        accessorKey: 'employee.position.name',
        header: 'Chức vụ',
        size: 150,
      },
      {
        accessorKey: 'total_employee_score',
        header: 'Tự đánh giá',
        cell: ({ getValue }) => {
          const val = getValue()
          return val ? formatNumber(val as string, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
        },
        size: 100,
      },
      {
        accessorKey: 'total_manager_score',
        header: 'Tổng điểm cấp trên đánh giá',
        cell: ({ getValue }) => {
          const val = getValue()
          return val ? formatNumber(val as string, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
        },
        size: 200,
      },
      {
        accessorKey: 'grade_manager',
        header: 'Xếp loại KPI (Trưởng phòng)',
        cell: ({ getValue }) => {
          const val = getValue() as string
          return val ? <Chip label={val} variant={getGradeVariant(val)} size="small" /> : '-'
        },
        size: 200,
      },
      {
        accessorKey: 'grade_hrm',
        header: 'Xếp loại KPI (Nhân sự)',
        cell: ({ getValue }) => {
          const val = getValue() as string
          return val ? <Chip label={val} variant={getGradeVariant(val)} size="small" /> : '-'
        },
        size: 180,
      },
      {
        id: 'colored_status',
        accessorKey: 'colored_status',
        header: 'Trạng thái',

        cell: ({ getValue }) => {
          const coloredStatus = getValue() as any
          const currentStatus = statusOptions?.find(
            (option) => option.value === coloredStatus.value
          )
          if (!currentStatus) return '-'
          return (
            <Chip
              label={currentStatus.label}
              variant={coloredStatus.variant as ColoredValueVariant}
              size="small"
            />
          )
        },
        size: 150,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end pr-4">
            <TableActionMenu row={row.original} actions={actions} />
          </div>
        ),
        size: 60,
        meta: {
          frozen: true,
          align: 'right',
        },
      },
    ],
    [actions, statusOptions]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Table
        data={data}
        columns={columns}
        isLoading={isLoading}
        totalRecords={totalRecords}
        pageCount={pageCount}
        pageSize={pageSize}
        currentPageIndex={currentPage}
        onPaginationChange={onPaginationChange}
        showSTT={true}
        sttFrozen={true}
        manualPagination={true}
        enableSorting={true}
        manualSorting={true}
        onSortingChange={onSortingChange}
      />
    </div>
  )
}
