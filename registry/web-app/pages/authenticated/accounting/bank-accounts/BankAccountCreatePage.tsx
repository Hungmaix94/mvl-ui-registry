import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import BankAccountForm from '@/features/accounting/bank-accounts/_shares/components/BankAccountForm.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

const BankAccountCreatePage = () => {
  const navigate = useNavigate()

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Thêm tài khoản ngân hàng"
        enableBackButton
        handleBackButton={() =>
          navigate(withRememberedSearch(APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT))
        }
        breadcrumb={[
          { label: 'Kế toán', href: '/accounting/dashboard' },
          { label: 'Cấu hình' },
          { label: 'Tài khoản ngân hàng', href: APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT },
          { label: 'Tạo mới', isCurrentPage: true },
        ]}
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <BankAccountForm />
      </div>
    </div>
  )
}

export default BankAccountCreatePage
