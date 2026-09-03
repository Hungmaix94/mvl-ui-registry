import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { PageTitle } from '@/components/ui'
import AccountingPeriodForm from '@/features/accounting/accounting-periods/_shares/components/AccountingPeriodForm.tsx'
import { useAccountingPeriod } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import { isNotFoundError } from '@/utils/error-utils.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function AccountingPeriodEditPage() {
  const { id } = useParams<{ id: string }>()
  const periodId = id ? parseInt(id, 10) : 0
  const ability = useAbility()
  const navigate = useNavigate()

  const { data: period, isLoading, error } = useAccountingPeriod(periodId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !period
  }, [isLoading, error, period])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const title = period
    ? `Chỉnh sửa kỳ kế toán Tháng ${period.month}/${period.year}`
    : 'Chỉnh sửa kỳ kế toán'

  const breadcrumbs = useMemo(
    () => [
      { label: 'Kế toán', href: '/accounting/dashboard' },
      { label: 'Cấu hình' },
      { label: 'Kỳ kế toán', href: APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT },
      {
        label: period ? `Tháng ${period.month}/${period.year}` : 'Chi tiết',
        href: period
          ? APP_PATH.ACCOUNTING_PERIOD_DETAIL.replace(':id', String(period.id))
          : undefined,
      },
      { label: 'Chỉnh sửa', isCurrentPage: true },
    ],
    [period]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={title}
        enableBackButton
        handleBackButton={() =>
          navigate(withRememberedSearch(APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT))
        }
        breadcrumb={breadcrumbs}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('update', 'accountingperiod')}
      >
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
          <AccountingPeriodForm periodId={periodId} />
        </div>
      </DetailPageWrapper>
    </div>
  )
}
