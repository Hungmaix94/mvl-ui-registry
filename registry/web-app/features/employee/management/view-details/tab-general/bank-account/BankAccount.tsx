import { useMemo } from 'react'
import { Button, Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import { IconPencil, IconPlus, IconTrash } from '@/assets/icons'
import { type BankAccount, useBankAccounts } from '@/services/common-service'
import { Employee } from '@/services'
import { useBankAccountAdd } from '@/features/employee/management/view-details/tab-general/bank-account/hooks/useBankAccountAdd.tsx'
import { useBankAccountEdit } from '@/features/employee/management/view-details/tab-general/bank-account/hooks/useBankAccountEdit.tsx'
import { useBankAccountDelete } from '@/features/employee/management/view-details/tab-general/bank-account/hooks/useBankAccountDelete.tsx'
import { ColoredValueVariant } from '@/api/schema.ts'

type BankAccountProps = {
  employee: Employee
}

const BankAccount = ({ employee }: BankAccountProps) => {
  const { openAddBankAccountDialog } = useBankAccountAdd()
  const { openEditBankAccountDialog } = useBankAccountEdit()
  const { openDeleteBankAccountDialog } = useBankAccountDelete()

  // Fetch bank accounts for the specific employee
  const { data: bankAccountsData, isLoading } = useBankAccounts({
    employee: employee?.id,
  })

  const bankAccounts = useMemo(() => bankAccountsData?.results || [], [bankAccountsData?.results])

  // Define table columns matching Figma design
  const columns: ColumnDef<BankAccount>[] = useMemo(
    () => [
      {
        accessorKey: 'bank',
        id: 'bank_name',
        header: 'Ngân hàng',
        cell: ({ row }) => {
          const bankName = row.original.bank?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm text-wrap" title={bankName}>
              {bankName}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
      {
        accessorKey: 'account_number',
        id: 'account_number',
        header: 'Số tài khoản',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 truncate text-sm" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'w-[250px]', sortable: false },
      },
      {
        accessorKey: 'account_name',
        id: 'account_name',
        header: 'Chủ tài khoản',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 truncate text-sm" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'w-[300px]', sortable: false },
      },
      {
        accessorKey: 'is_primary',
        id: 'account_type',
        header: 'Loại tài khoản',
        cell: ({ row }) => {
          const isPrimary = row.original.is_primary
          return (
            isPrimary && <Chip label={'Tài khoản mặc định'} variant={ColoredValueVariant.PURPLE} />
          )
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
    ],
    []
  )

  // Define row actions
  const actions: TableAction<BankAccount>[] = useMemo(
    () => [
      {
        label: 'Chỉnh sửa',
        icon: <IconPencil size={16} />,
        onClick: (record) => {
          openEditBankAccountDialog(employee, record.id)
        },
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} />,
        variant: 'danger',
        onClick: (record) => {
          openDeleteBankAccountDialog(record.id)
        },
      },
    ],
    [employee, openEditBankAccountDialog, openDeleteBankAccountDialog]
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <h2 className="text-content-dark-primary text-lg font-semibold">Tài khoản ngân hàng</h2>
        <Button
          variant="secondary"
          className="bg-neutral-30 h-9 w-9 p-2.5"
          onClick={() => openAddBankAccountDialog(employee)}
        >
          <IconPlus className="h-4 w-4" />
        </Button>
      </div>

      {bankAccounts.length > 0 && (
        <Table
          data={bankAccounts}
          columns={columns}
          showSTT={false}
          showActions
          rowActions={actions}
          enablePagination={false}
          enableSorting={false}
          isLoading={isLoading}
          className="flex-1 px-0 pb-0"
        />
      )}
    </div>
  )
}

export default BankAccount
