import { useCallback, useMemo } from 'react'
import { ColumnDef, Table, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { ColoredValueVariant } from '@/api/schema.ts'
import {
  useEmployeeBankAccounts,
  type EmployeeBankAccountList,
  type GetEmployeeBankAccountsParams,
} from '@/features/employee/services/employee-bank-account-service'

type EmployeeBankAccountTableProps = {
  apiParams?: GetEmployeeBankAccountsParams
  currentPage: number
  pageSize: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  isUrlReady?: boolean
}

const renderText = (value?: string | null, fallback = '-') => {
  const label = value && value.trim() !== '' ? value : fallback
  return (
    <span
      className="text-content-dark-1 text-sm break-words"
      title={label !== fallback ? label : undefined}
    >
      {label}
    </span>
  )
}

const EmployeeBankAccountTable = ({
  apiParams,
  currentPage,
  pageSize,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter = false,
  isUrlReady = false,
}: EmployeeBankAccountTableProps) => {
  const {
    data: response,
    isLoading,
    error,
  } = useEmployeeBankAccounts(apiParams, { enabled: isUrlReady })

  const { rows, totalRecords, pageCount } = useMemo(() => {
    const totalCount = response?.count ?? 0
    return {
      rows: response?.results || [],
      totalRecords: totalCount,
      pageCount: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
    }
  }, [response?.results, response?.count, pageSize])

  const columns: ColumnDef<EmployeeBankAccountList>[] = useMemo(
    () => [
      {
        id: 'employee__code',
        header: 'Mã nhân viên',
        cell: ({ row }) => renderText(row.original.employee?.code),
        meta: { width: 'w-[140px]', sortable: true, align: 'center' },
      },
      {
        id: 'employee__fullname',
        header: 'Tên nhân viên',
        cell: ({ row }) => renderText(row.original.employee?.fullname),
        meta: { width: 'w-[200px]', sortable: true },
      },
      {
        id: 'department',
        header: 'Phòng ban',
        cell: ({ row }) => renderText(row.original.employee?.department?.name),
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'branch',
        header: 'Chi nhánh',
        cell: ({ row }) => renderText(row.original.employee?.branch?.name),
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'status',
        header: 'Tình trạng làm việc',
        cell: ({ row }) => renderText(row.original.employee?.status_display),
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'bank__name',
        header: 'Ngân hàng',
        cell: ({ row }) => renderText(row.original.bank?.name),
        meta: { width: 'w-[170px]', sortable: true },
      },
      {
        id: 'account_name',
        header: 'Chủ tài khoản',
        cell: ({ row }) => renderText(row.original.account_name),
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'account_number',
        header: 'Số tài khoản',
        cell: ({ row }) => renderText(row.original.account_number),
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'is_primary',
        header: 'Loại tài khoản',
        cell: ({ row }) =>
          row.original.is_primary ? (
            <Chip label="Tài khoản mặc định" variant={ColoredValueVariant.GREEN} size="small" />
          ) : (
            <span />
          ),
        meta: { width: 'w-[170px]', sortable: true },
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
      columns={columns}
      data={rows}
      isLoading={isLoading}
      onSortingChange={handleSortingChange}
      emptyMessage="Không có dữ liệu tài khoản ngân hàng"
      showSTT
      sttFrozen
      enableSorting
      manualSorting
      enablePagination
      manualPagination
      disableInnerOverflow={true}
      pageCount={pageCount}
      pageSize={pageSize}
      totalRecords={totalRecords}
      currentPageIndex={currentPage - 1}
      onPaginationChange={handlePaginationChange}
      onClearFilter={onClearFilter}
      hasFilter={hasFilter}
      paginationPosition="static"
    />
  )
}

export default EmployeeBankAccountTable
