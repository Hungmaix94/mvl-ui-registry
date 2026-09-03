import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import BrokerCertificateForm from '@/features/accounting/broker-certificates/_shares/components/BrokerCertificateForm.tsx'

const BrokerCertificateEditPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const certificateId = id ? parseInt(id, 10) : 0
  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Chỉnh sửa chứng chỉ môi giới"
        enableBackButton
        handleBackButton={() =>
          navigate(APP_PATH.BROKER_CERTIFICATE_DETAIL.replace(':id', String(certificateId)))
        }
        breadcrumb={[
          { label: 'Kế toán', href: '/accounting/dashboard' },
          { label: 'Chứng chỉ môi giới', href: APP_PATH.BROKER_CERTIFICATE_MANAGEMENT },
          { label: 'Chỉnh sửa', isCurrentPage: true },
        ]}
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <BrokerCertificateForm certificateId={certificateId} />
      </div>
    </div>
  )
}

export default BrokerCertificateEditPage
