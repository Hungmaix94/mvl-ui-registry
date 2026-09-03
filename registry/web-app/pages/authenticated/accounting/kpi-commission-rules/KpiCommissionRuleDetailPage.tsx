import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils.ts'
import {
  useKpiCommissionRule,
  useActivateKpiCommissionRule,
} from '@/features/accounting/kpi-commission-rules/services/kpi-commission-rule-service'
import KpiCommissionRuleDetail from '@/features/accounting/kpi-commission-rules/view-details/KpiCommissionRuleDetail.tsx'
import toastService from '@/services/toast-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'

const KpiCommissionRuleDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ruleId = id ? parseInt(id, 10) : 0
  const ability = useAbility()
  const invalidateQueries = useInvalidateQueries()

  const { data: rule, isLoading, error } = useKpiCommissionRule(ruleId)
  const activateMutation = useActivateKpiCommissionRule()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !rule
  }, [isLoading, error, rule])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = useCallback(() => {
    if (rule) {
      navigate(`/accounting/kpi-commission-rules/${rule.id}/edit`)
    }
  }, [navigate, rule])

  const handleActivate = useCallback(async () => {
    if (!ruleId) return
    try {
      await activateMutation.mutateAsync(ruleId)
      toastService.success('Kích hoạt quy tắc hoa hồng thành công')
      invalidateQueries.invalidateByPrefix('accounting/kpi-commission-structures')
    } catch (err: unknown) {
      toastService.error('Kích hoạt quy tắc hoa hồng thất bại')
    }
  }, [ruleId, activateMutation, invalidateQueries])

  const canUpdate = ability.can('update', 'kpicommissionstructure')

  const pageTitle = rule
    ? `${rule.name}${rule.code ? ` · ${rule.code}` : ''}`
    : 'Quy tắc hoa hồng KPI'

  return (
    <>
      <PageTitle
        title={pageTitle}
        enableBackButton
        handleEdit={canUpdate && rule?.status === 'DRAFT' ? handleEdit : undefined}
        customActions={
          rule &&
          rule.status === 'DRAFT' &&
          canUpdate && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleActivate}
                loading={activateMutation.isPending}
              >
                Kích hoạt
              </Button>
            </div>
          )
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'kpicommissionstructure')}
      >
        <div className="flex flex-grow gap-4 overflow-y-auto">
          {rule && <KpiCommissionRuleDetail rule={rule} />}
        </div>
      </DetailPageWrapper>
    </>
  )
}

export default KpiCommissionRuleDetailPage
