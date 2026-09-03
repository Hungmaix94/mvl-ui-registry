import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import { useBankAccount } from '@/features/accounting/bank-accounts/services/bank-account-service'
import BankAccountDetail from '@/features/accounting/bank-accounts/view-details/BankAccountDetail.tsx'
import { useBankAccountSetDefault } from '@/features/accounting/bank-accounts/_shares/hooks/useBankAccountSetDefault.tsx'
import { useBankAccountToggleActive } from '@/features/accounting/bank-accounts/_shares/hooks/useBankAccountToggleActive.tsx'

const BankAccountDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const accountId = id ? parseInt(id, 10) : 0
  const ability = useAbility()

  const { data: account, isLoading, error } = useBankAccount(accountId)
  const { openSetDefaultDialog } = useBankAccountSetDefault()
  const { openToggleDialog } = useBankAccountToggleActive()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !account
  }, [isLoading, error, account])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = useCallback(() => {
    if (account) {
      navigate(APP_PATH.COMPANY_BANK_ACCOUNT_EDIT.replace(':id', String(account.id)))
    }
  }, [navigate, account])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.COMPANY_BANK_ACCOUNT_HISTORY.replace(':id', id.toString())
      navigate(path)
    }
  }, [navigate, id])

  const handleSetDefault = useCallback(() => {
    if (account) openSetDefaultDialog(account)
  }, [account, openSetDefaultDialog])

  const handleToggleActive = useCallback(() => {
    if (account) openToggleDialog(account)
  }, [account, openToggleDialog])

  const isActive = account?.is_active !== false
  const isClosingDefault = isActive && !!account?.is_default
  const canUpdate = ability.can('update', 'companybankaccount')

  const pageTitle = account
    ? `${account.account_holder}${account.code ? ` · ${account.code}` : ''}`
    : 'Tài khoản ngân hàng'

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={pageTitle}
        enableBackButton
        handleEdit={canUpdate ? handleEdit : undefined}
        handleShowHistory={
          ability.can('histories', 'companybankaccount') ? handleShowHistory : undefined
        }
        customActions={
          account &&
          canUpdate && (
            <div className="flex justify-end gap-2">
              {!account.is_default && (
                <Button type="button" variant="secondary" onClick={handleSetDefault}>
                  Đặt làm mặc định
                </Button>
              )}
              <Button
                type="button"
                variant={isActive ? 'secondary' : 'primary'}
                onClick={handleToggleActive}
                disabled={isClosingDefault}
                title={
                  isClosingDefault
                    ? 'Đặt tài khoản khác làm mặc định trước khi đóng tài khoản này'
                    : undefined
                }
              >
                {isActive ? 'Đóng tài khoản' : 'Kích hoạt'}
              </Button>
            </div>
          )
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'companybankaccount')}
      >
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
          {account && <BankAccountDetail account={account} />}
        </div>
      </DetailPageWrapper>
    </div>
  )
}

export default BankAccountDetailPage
