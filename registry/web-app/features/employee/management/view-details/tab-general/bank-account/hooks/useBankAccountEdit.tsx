import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useBankAccount } from '@/services/common-service'
import BankAccountForm from '@/features/employee/management/view-details/tab-general/bank-account/components/BankAccountForm.tsx'
import type { Employee } from '@/services'
import { FullScreenLoading } from '@/components/ui'

export function useBankAccountEdit() {
  const { displayFormContent } = useDialog()

  const openEditBankAccountDialog = useCallback(
    (employee: Employee, bankAccountId: number) => {
      // Component to handle loading state and render form
      const EditBankAccountDialogContent = () => {
        const { data: bankAccountData, isLoading } = useBankAccount(bankAccountId)

        if (isLoading) {
          return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
        }

        // The data might be wrapped in ApiResponse or directly be the BankAccount
        const bankAccount = (bankAccountData as any)?.data || bankAccountData

        if (!bankAccount) {
          return <div className="p-6 text-red-500">Không thể tải thông tin tài khoản ngân hàng</div>
        }

        return <BankAccountForm employee={employee} mode="edit" initialValues={bankAccount} />
      }

      displayFormContent({
        size: 'lg',
        title: 'Chỉnh sửa tài khoản ngân hàng',
        content: <EditBankAccountDialogContent />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openEditBankAccountDialog,
  }
}
