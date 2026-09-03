import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { type CompanyBankAccount } from '@/features/accounting/bank-accounts/services/bank-account-service'
import { useColumnConfig } from '@/hooks/useColumnConfig'
import type { ColumnConfig } from '@/types/table'

type BankAccountTableProps = {
  data: CompanyBankAccount[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSetDefault?: (record: CompanyBankAccount) => void
  onToggleActive?: (record: CompanyBankAccount) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  isShowTableColumnConfig?: boolean
}

const BankAccountTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSetDefault,
  onToggleActive,
  onClearFilter,
  hasFilter,
  isShowTableColumnConfig,
}: BankAccountTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const allColumns: ColumnDef<CompanyBankAccount>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã TK',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return value ? <code>{value}</code> : '-'
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'account_holder',
        header: 'Chủ tài khoản',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return <span className="typo-body-base-semibold">{value || '-'}</span>
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        accessorKey: 'bank_name',
        header: 'Tên ngân hàng',
        cell: ({ getValue }) => (getValue() as string) || '-',
        meta: { width: 'w-[180px]', sortable: true },
      },
      {
        accessorKey: 'account_number',
        header: 'Số TK',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return value ? <code>{value}</code> : '-'
        },
        meta: { width: 'w-[160px]', sortable: true },
      },
      {
        accessorKey: 'bank_branch_name',
        header: 'Chi nhánh NH',
        cell: ({ getValue }) => (getValue() as string) || '-',
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        accessorKey: 'currency',
        header: 'Tiền tệ',
        cell: ({ getValue }) => (getValue() as string) || '-',
        meta: { width: 'w-[80px]', sortable: false },
      },
      {
        accessorKey: 'is_active',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const isActive = row.original.is_active !== false
          return (
            <Chip
              variant={isActive ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY}
              label={isActive ? 'Đang hoạt động' : 'Đã đóng'}
              size="small"
            />
          )
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
    ],
    []
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã TK', visible: true, order: 0 },
      { id: 'account_holder', label: 'Chủ tài khoản', visible: true, order: 1 },
      { id: 'bank_name', label: 'Tên ngân hàng', visible: true, order: 2 },
      { id: 'account_number', label: 'Số TK', visible: true, order: 3 },
      { id: 'bank_branch_name', label: 'Chi nhánh NH', visible: true, order: 4 },
      { id: 'currency', label: 'Tiền tệ', visible: true, order: 5 },
      { id: 'is_active', label: 'Trạng thái', visible: true, order: 6 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-bank-accounts',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<CompanyBankAccount>[]
  }, [columnConfig, allColumns])

  const rowActions: TableAction<CompanyBankAccount>[] = useMemo(() => {
    const actions: TableAction<CompanyBankAccount>[] = []

    if (ability.can('retrieve', 'companybankaccount')) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.COMPANY_BANK_ACCOUNT_DETAIL.replace(':id', String(record.id))),
      })
    }

    if (ability.can('update', 'companybankaccount')) {
      actions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.COMPANY_BANK_ACCOUNT_EDIT.replace(':id', String(record.id))),
      })

      // "Đặt làm mặc định" only for non-default accounts
      if (onSetDefault) {
        actions.push({
          label: 'Đặt làm mặc định',
          onClick: (record) => onSetDefault(record),
          show: (record) => !record.is_default,
        })
      }

      if (onToggleActive) {
        actions.push({
          label: 'Đóng tài khoản',
          variant: 'danger',
          onClick: (record) => onToggleActive(record),
          show: (record) => record.is_active !== false,
        })

        actions.push({
          label: 'Kích hoạt',
          onClick: (record) => onToggleActive(record),
          show: (record) => record.is_active === false,
        })
      }
    }

    return actions
  }, [ability, navigate, onSetDefault, onToggleActive])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      columns={visibleColumns}
      data={data}
      isLoading={isLoading}
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      showSTT
      showActions
      rowActions={rowActions}
      manualPagination
      manualSorting
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
      isShowTableColumnConfig={isShowTableColumnConfig}
      columnConfig={columnConfig}
      onColumnConfigApply={handleApply}
      onColumnConfigReset={handleReset}
      stickyHeader
    />
  )
}

export default BankAccountTable
