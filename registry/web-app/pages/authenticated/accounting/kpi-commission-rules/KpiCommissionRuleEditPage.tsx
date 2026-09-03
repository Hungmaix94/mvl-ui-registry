import { useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import KpiCommissionRuleForm from '@/features/accounting/kpi-commission-rules/_shares/components/KpiCommissionRuleForm'

export default function KpiCommissionRuleEditPage() {
  const { id } = useParams<{ id: string }>()
  const ruleId = id ? Number(id) : undefined

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title="Chỉnh sửa quy tắc hoa hồng KPI" enableBackButton />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <div className="border-border-1 rounded-lg border bg-white p-6 shadow-sm">
          <KpiCommissionRuleForm ruleId={ruleId} />
        </div>
      </div>
    </div>
  )
}
