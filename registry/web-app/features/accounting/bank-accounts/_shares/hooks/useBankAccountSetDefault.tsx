import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import {
  type CompanyBankAccount,
  type PatchedCompanyBankAccountRequest,
  usePartialUpdateBankAccount,
} from '@/features/accounting/bank-accounts/services/bank-account-service'

export const useBankAccountSetDefault = (onSuccess?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const patchMutation = usePartialUpdateBankAccount()
  const invalidateQueries = useInvalidateQueries()

  const openSetDefaultDialog = useCallback(
    (account: CompanyBankAccount) => {
      if (account.is_default) {
        toastService.info('Tài khoản này đã là mặc định')
        return
      }

      displayConfirm({
        title: 'Đặt tài khoản mặc định',
        content: (
          <div className="text-content-dark-2">
            Đặt <b className="typo-body-lg-regular text-content-dark-2">{account.code}</b> —{' '}
            {account.account_holder} ({account.bank_name}) làm tài khoản mặc định?
            <br />
            Tài khoản mặc định hiện tại sẽ bị bỏ chọn.
          </div>
        ),
        confirmText: 'Đặt làm mặc định',
        cancelText: 'Huỷ',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            // PatchedCompanyBankAccountRequest schema marks currency + is_default
            // as required even on PATCH — send currency alongside the toggle.
            const payload: PatchedCompanyBankAccountRequest = {
              currency: account.currency,
              is_default: true,
            }
            await patchMutation.mutateAsync({ id: account.id, data: payload })
            await invalidateQueries.invalidateByPrefix('accounting/bank-accounts')
            toastService.success('Đã đặt tài khoản mặc định')
            onSuccess?.()
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, setLoading, patchMutation, invalidateQueries, onSuccess]
  )

  return { openSetDefaultDialog, isPending: patchMutation.isPending }
}
