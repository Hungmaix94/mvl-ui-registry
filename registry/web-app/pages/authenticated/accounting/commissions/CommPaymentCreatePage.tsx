import { useNavigate } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, PageTitle } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { APP_PATH } from '@/routes'
import { useCreateEmployeePayoutBatch } from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { formatDateToApi } from '@/utils/date-utils'

const createSchema = z.object({
  period: z.date({
    required_error: 'Vui lòng chọn kỳ',
    invalid_type_error: 'Kỳ không hợp lệ',
  }),
  batch_date: z.any().refine((val) => val != null && val !== '', 'Vui lòng chọn ngày tạo đợt'),
})

export type CommPaymentCreateFormData = z.infer<typeof createSchema>

const CommPaymentCreatePage = () => {
  const navigate = useNavigate()
  const { mutateAsync: createBatch, isPending: isCreating } = useCreateEmployeePayoutBatch()

  const form = useForm<CommPaymentCreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      period: new Date(),
      batch_date: new Date(),
    },
  })

  const onSubmit = async (data: CommPaymentCreateFormData) => {
    try {
      await createBatch({
        year: data.period.getFullYear(),
        month: data.period.getMonth() + 1,
        batch_date: formatDateToApi(data.batch_date as Date | string) || '',
      })
      toastService.success('Tạo đợt chi thành công')
      navigate(APP_PATH.COMM_PAYMENT_LIST)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title="Tạo đợt chi hoa hồng" enableBackButton />

      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-5">
              <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FormController<CommPaymentCreateFormData, any>
                  register={form.register}
                  control={form.control}
                  name="period"
                  Field={MonthPicker}
                  fieldProps={{ label: 'Tháng/Năm', showYear: true }}
                />

                <FormController<CommPaymentCreateFormData, any>
                  register={form.register}
                  control={form.control}
                  name="batch_date"
                  Field={DatePicker}
                  fieldProps={{ label: 'Ngày tạo đợt', placeholder: 'DD/MM/YYYY' }}
                />
              </div>
            </div>

            <div className="border-border-1 mt-4 flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(APP_PATH.COMM_PAYMENT_LIST)}
                disabled={isCreating}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isCreating}
                disabled={isCreating}
                className="w-[150px]"
              >
                Tạo đợt chi
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}

export default CommPaymentCreatePage
