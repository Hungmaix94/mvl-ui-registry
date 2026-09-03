import { useNavigate } from 'react-router-dom'
import { Button, PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import ManagerKpiRuleBulkForm from '@/features/accounting/kpi-commission-rules/_shares/components/ManagerKpiRuleBulkForm'

export default function KpiCommissionRuleCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Quy định hoa hồng theo KPI"
        enableBackButton
        breadcrumb={[
          { label: 'Kế toán', href: '/accounting/dashboard' },
          { label: 'Cấu hình' },
          { label: 'Quy định HH theo KPI', href: APP_PATH.KPI_COMMISSION_RULE },
          { label: 'Cập nhật quy định' },
        ]}
        customActions={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(APP_PATH.KPI_COMMISSION_RULE)}
            >
              Hủy
            </Button>
            <Button type="submit" form="manager-kpi-bulk-form" variant="primary">
              Lưu quy định
            </Button>
          </div>
        }
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <ManagerKpiRuleBulkForm />
        </div>
      </div>
    </div>
  )
}
