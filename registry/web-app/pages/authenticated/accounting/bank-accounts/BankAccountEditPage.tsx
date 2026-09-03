import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils.ts'
import { useBankAccount } from '@/features/accounting/bank-accounts/services/bank-account-service'
import BankAccountForm from '@/features/accounting/bank-accounts/_shares/components/BankAccountForm.tsx'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

const BankAccountEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const accountId = id ? parseInt(id, 10) : 0
  const ability = useAbility()
  const navigate = useNavigate()

  const { data: account, isLoading, error } = useBankAccount(accountId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !account
  }, [isLoading, error, account])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const title = account
    ? `Chỉnh sửa TK — ${account.code || account.account_holder}`
    : 'Chỉnh sửa tài khoản ngân hàng'

  const breadcrumbs = useMemo(
    () => [
      { label: 'Kế toán', href: '/accounting/dashboard' },
      { label: 'Cấu hình' },
      { label: 'Tài khoản ngân hàng', href: APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT },
      {
        label: account ? account.code || account.account_holder : 'Chi tiết',
        href: account
          ? APP_PATH.COMPANY_BANK_ACCOUNT_DETAIL.replace(':id', String(account.id))
          : undefined,
      },
      { label: 'Chỉnh sửa', isCurrentPage: true },
    ],
    [account]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={title}
        enableBackButton
        handleBackButton={() =>
          navigate(withRememberedSearch(APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT))
        }
        breadcrumb={breadcrumbs}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('update', 'companybankaccount')}
      >
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
          <BankAccountForm accountId={accountId} />
        </div>
      </DetailPageWrapper>
    </div>
  )
}

export default BankAccountEditPage
