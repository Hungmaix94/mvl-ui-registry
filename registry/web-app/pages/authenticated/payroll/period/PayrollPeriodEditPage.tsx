import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import PayrollPeriodForm from '@/features/payroll/period/view/PayrollPeriodForm'
import {
  usePartialUpdateSalaryPeriodDeadlines,
  useSalaryPeriod,
  type PatchedSalaryPeriodUpdateDeadlinesRequest,
} from '@/features/payroll/services/salary-period-service'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import toastService from '@/services/toast-service'
import { useQueryClient } from '@tanstack/react-query'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility, parsePermissionCode } from '@/lib/ability'
import { withRememberedSearch } from '@/utils/list-url-memory'

const PayrollPeriodEditPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const periodId = id ? parseInt(id) : 0
  const ability = useAbility()

  const { data: salaryPeriod, isLoading: isFetching } = useSalaryPeriod(periodId, {
    enabled: !!periodId,
  })

  const { mutateAsync: updateSalaryPeriodAsync, isPending } =
    usePartialUpdateSalaryPeriodDeadlines()

  // Check permission
  const hasPermission = (() => {
    const parsed = parsePermissionCode('salary_period.update')
    return parsed ? ability.can(parsed.action, parsed.subject) : false
  })()

  const handleBack = () => {
    navigate(withRememberedSearch(APP_PATH.PAYROLL_PERIOD))
  }

  const handleSubmit = async (data: PatchedSalaryPeriodUpdateDeadlinesRequest) => {
    if (!periodId) return

    try {
      await updateSalaryPeriodAsync({ id: periodId, data })
      queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-periods'] })
      toastService.success('Cập nhật kỳ lương thành công')
      navigate(APP_PATH.PAYROLL_PERIOD)
    } catch (error) {
      // Re-throw so PayrollPeriodForm catch can call handleApiError and set field errors
      throw error
    }
  }

  const isNotFound = !isFetching && !salaryPeriod

  return (
    <DetailPageWrapper isLoading={isFetching} isNotFound={isNotFound} hasPermission={hasPermission}>
      <PageTitle title="Chỉnh sửa kỳ lương" enableBackButton handleBackButton={handleBack} />
      <Flex className="pt-8 pb-6" flexGrow={'1'} px={'7'} direction="column" gap="4">
        {salaryPeriod && (
          <PayrollPeriodForm
            onSubmit={handleSubmit}
            isLoading={isPending}
            initialData={salaryPeriod}
            mode="edit"
          />
        )}
      </Flex>
    </DetailPageWrapper>
  )
}

export default PayrollPeriodEditPage
