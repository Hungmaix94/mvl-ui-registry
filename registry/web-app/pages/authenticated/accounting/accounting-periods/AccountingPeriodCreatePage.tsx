import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import AccountingPeriodForm from '@/features/accounting/accounting-periods/_shares/components/AccountingPeriodForm.tsx'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function AccountingPeriodCreatePage() {
  const navigate = useNavigate()

  const breadcrumbs = [
    { label: 'Kế toán', href: '/accounting/dashboard' },
    { label: 'Cấu hình' },
    { label: 'Kỳ kế toán', href: APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT },
    { label: 'Tạo kỳ kế toán', isCurrentPage: true },
  ]

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Tạo kỳ kế toán"
        enableBackButton
        handleBackButton={() =>
          navigate(withRememberedSearch(APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT))
        }
        breadcrumb={breadcrumbs}
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <AccountingPeriodForm />
      </div>
    </div>
  )
}
