import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import BankAccountForm from '@/features/employee/management/view-details/tab-general/bank-account/components/BankAccountForm.tsx'
import type { Employee } from '@/services'

export function useBankAccountAdd() {
  const { displayFormContent } = useDialog()

  const openAddBankAccountDialog = useCallback(
    (employee: Employee) => {
      displayFormContent({
        size: 'lg',
        title: 'Thêm tài khoản ngân hàng',
        content: <BankAccountForm employee={employee} mode="add" />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openAddBankAccountDialog,
  }
}
