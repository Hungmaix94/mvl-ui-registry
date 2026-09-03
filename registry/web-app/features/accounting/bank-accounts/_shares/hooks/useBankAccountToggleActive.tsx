import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import {
  type CompanyBankAccount,
  type PatchedCompanyBankAccountRequest,
  useDeactivateBankAccount,
  usePartialUpdateBankAccount,
} from '@/features/accounting/bank-accounts/services/bank-account-service'

export const useBankAccountToggleActive = (onSuccess?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deactivateMutation = useDeactivateBankAccount()
  const patchMutation = usePartialUpdateBankAccount()
  const invalidateQueries = useInvalidateQueries()

  const openToggleDialog = useCallback(
    (account: CompanyBankAccount) => {
      const willActivate = account.is_active === false
      const isClosingDefault = !willActivate && account.is_default

      displayConfirm({
        title: willActivate ? 'Kích hoạt tài khoản' : 'Đóng tài khoản',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn {willActivate ? 'kích hoạt' : 'đóng'} tài khoản{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{account.code}</b> —{' '}
            {account.account_holder} ({account.bank_name} - {account.account_number})?
            {isClosingDefault && (
              <p className="text-action-primary-red-default mt-2">
                Đây là tài khoản mặc định. Vui lòng đặt tài khoản khác làm mặc định trước khi đóng.
              </p>
            )}
          </div>
        ),
        confirmText: willActivate ? 'Kích hoạt' : 'Đóng tài khoản',
        cancelText: 'Huỷ',
        confirmButtonClassName: !willActivate
          ? 'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white'
          : undefined,
        disableConfirm: isClosingDefault,
        size: 'xl',
        onConfirm: async () => {
          if (isClosingDefault) return
          try {
            setLoading(true)

            if (willActivate) {
              // Re-activation goes through partial update. PatchedCompanyBankAccountRequest
              // marks currency + is_default as required even on PATCH, so we echo them back
              // alongside the is_active flip.
              const payload: PatchedCompanyBankAccountRequest = {
                currency: account.currency,
                is_default: account.is_default,
                is_active: true,
              }
              await patchMutation.mutateAsync({ id: account.id, data: payload })
            } else {
              // Closing uses the dedicated `deactivate` action — backend flips
              // is_active server-side and does not require us to echo currency/is_default.
              await deactivateMutation.mutateAsync(account.id)
            }

            await invalidateQueries.invalidateByPrefix('accounting/bank-accounts')
            toastService.success(willActivate ? 'Đã kích hoạt tài khoản' : 'Đã đóng tài khoản')
            onSuccess?.()
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, setLoading, deactivateMutation, patchMutation, invalidateQueries, onSuccess]
  )

  return {
    openToggleDialog,
    isPending: deactivateMutation.isPending || patchMutation.isPending,
  }
}
