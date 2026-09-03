import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import PayrollPeriodForm from '@/features/payroll/period/view/PayrollPeriodForm'
import {
  useCreateSalaryPeriod,
  type SalaryPeriodCreateAsyncRequest,
} from '@/features/payroll/services/salary-period-service'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useQueryClient } from '@tanstack/react-query'
import { useAbility, parsePermissionCode } from '@/lib/ability'
import { Navigate } from 'react-router-dom'
import { usePayrollPeriodProgress } from '@/hooks/usePayrollPeriodProgress'
import { withRememberedSearch } from '@/utils/list-url-memory'

const PayrollPeriodCreatePage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ability = useAbility()
  const { mutateAsync: createSalaryPeriod, isPending } = useCreateSalaryPeriod()

  // Check permission
  const hasPermission = (() => {
    const parsed = parsePermissionCode('salary_period.create')
    return parsed ? ability.can(parsed.action, parsed.subject) : false
  })()

  // If no permission, redirect
  if (!hasPermission) {
    return <Navigate to={APP_PATH.UNAUTHORIZED} replace />
  }

  const { openProgressDialog, isProcessing } = usePayrollPeriodProgress({
    createFunction: createSalaryPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-periods', 'list'] })
      toastService.success('Tạo kỳ lương thành công')
      navigate(APP_PATH.PAYROLL_PERIOD)
    },
    onError: (error: unknown) => {
      toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra khi tạo kỳ lương'))
    },
  })

  const handleBack = () => {
    navigate(withRememberedSearch(APP_PATH.PAYROLL_PERIOD))
  }

  const handleSubmit = (data: SalaryPeriodCreateAsyncRequest) => {
    openProgressDialog(data)
  }

  return (
    <>
      <PageTitle title="Tạo mới kỳ lương" enableBackButton handleBackButton={handleBack} />
      <Flex className="pt-8 pb-6" flexGrow={'1'} px={'7'} direction="column" gap="4">
        <PayrollPeriodForm
          onSubmit={handleSubmit}
          isLoading={isPending || isProcessing}
          mode="create"
        />
      </Flex>
    </>
  )
}

export default PayrollPeriodCreatePage
