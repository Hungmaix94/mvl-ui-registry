import { useCallback, useMemo } from 'react'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import type { EmployeeCertificate } from '@/features/employee/services/employee-certificate-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { useAbility } from '@/lib/ability.ts'

type EmployeeCertificateTableProps = {
  data: EmployeeCertificate[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteEmployeeCertificate?: (record: EmployeeCertificate) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const EmployeeCertificateTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  onPaginationChange,
  onSortingChange,
  onDeleteEmployeeCertificate,
  onClearFilter,
  hasFilter = false,
}: EmployeeCertificateTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Columns
  const columns: ColumnDef<EmployeeCertificate>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        id: 'code',
        header: 'Mã chứng chỉ',
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'certificate_type_display',
        id: 'certificate_type',
        header: 'Loại bằng cấp, chứng chỉ',
        cell: ({ row }) => {
          const certificateTypeDisplay = row.original.certificate_type_display
          return (
            <span className="text-content-dark-1 text-sm text-wrap" title={certificateTypeDisplay}>
              {certificateTypeDisplay}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: true },
      },
      {
        accessorKey: 'employee_name',
        id: 'employee_name',
        header: 'Tên nhân viên',
        cell: ({ row }) => {
          const employeeName = String(row.original.employee.fullname) || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={employeeName}>
              {employeeName}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
      {
        accessorKey: 'issuing_organization',
        id: 'issuing_organization',
        header: 'Tổ chức cấp',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 text-sm" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'flex-1' },
      },
      {
        accessorKey: 'expected_issue_date',
        id: 'expected_issue_date',
        header: 'Ngày chờ cấp',
        cell: ({ getValue }) => {
          const formattedDate = formatDate(getValue() as string | null | undefined)
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'effective_date',
        id: 'effective_date',
        header: 'Ngày hiệu lực',
        cell: ({ getValue }) => {
          const formattedDate = formatDate(getValue() as string | null | undefined)
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'expiry_date',
        id: 'expiry_date',
        header: 'Ngày hết hiệu lực',
        cell: ({ getValue }) => {
          const formattedDate = formatDate(getValue() as string | null | undefined)
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'colored_status',
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const colored = row.original.colored_status
          const statusDisplay = row.original.status_display

          if (!colored?.value) {
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />
          }

          return (
            <Chip
              label={statusDisplay || colored.value}
              variant={colored.variant as ColoredValueVariant}
              size="small"
            />
          )
        },
        meta: { width: 'w-[90px]', sortable: true },
      },
    ],
    []
  )

  // Navigate with state for back navigation
  const navigateToDetail = useCallback(
    (path: string) => {
      navigate(path, {
        state: { from: window.location.pathname + window.location.search },
      })
    },
    [navigate]
  )

  // Row actions
  const actions: TableAction<EmployeeCertificate>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigateToDetail(APP_PATH.EMPLOYEE_CERTIFICATE_DETAIL.replace(':id', String(record.id))),
        show: () => ability.can('retrieve', 'employee_certificate'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigateToDetail(APP_PATH.EMPLOYEE_CERTIFICATE_EDIT.replace(':id', String(record.id))),
        show: () => ability.can('update', 'employee_certificate'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteEmployeeCertificate?.(record),
        show: () => ability.can('destroy', 'employee_certificate'),
      },
    ],
    [navigateToDetail, onDeleteEmployeeCertificate, ability]
  )

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      onPaginationChange(pageIndex, newPageSize)
    },
    [onPaginationChange]
  )

  // Handle sorting change
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
      showActions
      rowActions={actions}
      enableSorting
      manualSorting
      enablePagination
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
    />
  )
}

export default EmployeeCertificateTable
