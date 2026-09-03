import { useParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import CommissionAdvanceForm from '@/features/accounting/commission-advances/components/CommissionAdvanceForm'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function CommissionAdvanceEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Cập nhật phiếu đề xuất tạm ứng hoa hồng"
        enableBackButton
        handleBackButton={() => navigate(withRememberedSearch(APP_PATH.COMMISSION_ADVANCE))}
        breadcrumb={[
          { label: 'Kế toán & Hoa hồng' },
          { label: 'Tạm ứng hoa hồng', href: APP_PATH.COMMISSION_ADVANCE },
          { label: 'Cập nhật' },
        ]}
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <CommissionAdvanceForm id={Number(id)} />
      </div>
    </div>
  )
}
