import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { useCreateEmployeePayoutBatchForMonth } from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { formatDateToApi } from '@/utils/date-utils'
import type { EmployeePayoutBatchFormValues } from '@/features/accounting/employee-payout-batches/types/employee-payout-batch-types'
import EmployeePayoutBatchForm from '@/features/accounting/employee-payout-batches/_shares/components/EmployeePayoutBatchForm'
import { summarizeCreateForMonthResults } from '@/features/accounting/employee-payout-batches/utils/payout-batch-outcome'
import { withRememberedSearch } from '@/utils/list-url-memory'

const EmployeePayoutBatchCreatePage = () => {
  const navigate = useNavigate()
  const { mutateAsync: createBatch, isPending: isCreating } = useCreateEmployeePayoutBatchForMonth()

  const onSubmit = async (data: EmployeePayoutBatchFormValues) => {
    try {
      const res = await createBatch({
        year: data.period.getFullYear(),
        month: data.period.getMonth() + 1,
        batch_date: formatDateToApi(data.batch_date as Date | string) || '',
        wave: data.wave || undefined,
      })
      // `create_for_month` fans out per wave and returns one result each with an `outcome`
      // (CREATED or BLOCKED); if some waves were blocked the message surfaces that too.
      const summary = summarizeCreateForMonthResults(res)
      if (summary.tone === 'success') {
        toastService.success(summary.message)
      } else {
        toastService.info(summary.message)
      }
      if (summary.navigate) {
        navigate(APP_PATH.EMPLOYEE_PAYOUT_BATCH)
      }
    } catch (err) {
      // 409 (all waves already have an active batch) carries a friendly detail message.
      toastService.error(extractErrorMessage(err))
      throw err
    }
  }

  const handleCancel = () => {
    navigate(withRememberedSearch(APP_PATH.EMPLOYEE_PAYOUT_BATCH))
  }

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title="Tạo đợt chi" enableBackButton />

      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <div className="border-border-1 rounded-lg border bg-white p-6 shadow-sm">
          <EmployeePayoutBatchForm
            mode="create"
            onSubmit={onSubmit}
            onCancel={handleCancel}
            isSubmitting={isCreating}
          />
        </div>
      </div>
    </div>
  )
}

export default EmployeePayoutBatchCreatePage
