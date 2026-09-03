import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import BrokerCertificateForm from '@/features/accounting/broker-certificates/_shares/components/BrokerCertificateForm.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

const BrokerCertificateCreatePage = () => {
  const navigate = useNavigate()
  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Thêm chứng chỉ môi giới (CTV)"
        enableBackButton
        handleBackButton={() =>
          navigate(withRememberedSearch(APP_PATH.BROKER_CERTIFICATE_MANAGEMENT))
        }
        breadcrumb={[
          { label: 'Kế toán', href: '/accounting/dashboard' },
          { label: 'Chứng chỉ môi giới', href: APP_PATH.BROKER_CERTIFICATE_MANAGEMENT },
          { label: 'Tạo mới', isCurrentPage: true },
        ]}
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <BrokerCertificateForm />
      </div>
    </div>
  )
}

export default BrokerCertificateCreatePage
