import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { EmployeePayoutBatchStatus as BatchStatus } from '@/constants/api-schema-aliases'
export type CommPaymentFilterFormData = {
  status?: string
}

export type CommPaymentFilterRef = {
  getValues: () => CommPaymentFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: CommPaymentFilterFormData
  isOpen?: boolean
}

const STATUS_OPTIONS = [
  { value: BatchStatus.DRAFT, label: 'Bản nháp' },
  { value: BatchStatus.CONFIRMED, label: 'Đã xác nhận' },
  { value: BatchStatus.SENT_TO_BANK, label: 'Đã gửi ngân hàng' },
  { value: BatchStatus.PAID, label: 'Đã thanh toán' },
  { value: BatchStatus.CANCELLED, label: 'Đã hủy' },
]

export const CommPaymentFilter = forwardRef<CommPaymentFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<CommPaymentFilterFormData>({ defaultValues: initialValues ?? {} })
    const { control, register, reset, getValues } = form

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      clearForm: () => reset({ status: '' }),
    }))

    return (
      <FormProvider {...form}>
        <div className="grid w-full grid-cols-1 gap-4">
          <FormController<CommPaymentFilterFormData, any>
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Chọn trạng thái',
              options: STATUS_OPTIONS,
            }}
          />
        </div>
      </FormProvider>
    )
  }
)

CommPaymentFilter.displayName = 'CommPaymentFilter'

export default CommPaymentFilter
