import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import { Select, Switch } from '@/components/ui'
import type { SelectProps } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'

export type F2PaymentFilterFormData = {
  status?: string
  recipient_type?: string
  is_overdue?: boolean
  include_voided?: boolean
}

export type F2PaymentFilterRef = {
  getValues: () => F2PaymentFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: F2PaymentFilterFormData
  isOpen: boolean
}

export const F2PaymentListFilter = forwardRef<F2PaymentFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<F2PaymentFilterFormData>({
      defaultValues: initialValues ?? {},
    })
    const { control, register, reset, getValues } = form

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      clearForm: () =>
        reset({
          status: undefined,
          recipient_type: undefined,
          is_overdue: false,
          include_voided: false,
        }),
    }))

    return (
      <FormProvider {...form}>
        <Grid columns="3" gap="4" className="w-full">
          <FormController<F2PaymentFilterFormData, SelectProps<{ label: string; value: string }>>
            register={register}
            control={control}
            name="recipient_type"
            Field={Select}
            fieldProps={{
              label: 'Loại người nhận',
              placeholder: 'Tất cả',
              options: [
                { label: 'Tất cả', value: '' },
                { label: 'Sàn F2', value: 'EXCHANGE' },
                { label: 'Cộng tác viên', value: 'COLLABORATOR' },
              ],
            }}
          />
          <FormController<F2PaymentFilterFormData, SelectProps<{ label: string; value: string }>>
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Tất cả trạng thái',
              options: [
                { label: 'Tất cả', value: '' },
                { label: 'Chưa thanh toán', value: 'UNPAID' },
                { label: 'Thanh toán một phần', value: 'PARTIAL' },
                { label: 'Đã thanh toán', value: 'PAID' },
                { label: 'Đã hủy', value: 'CANCELLED' },
              ],
            }}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Lọc thêm</span>
            <div className="flex h-9 items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <FormController<F2PaymentFilterFormData, any>
                  register={register}
                  control={control}
                  name="is_overdue"
                  Field={Switch}
                />
                <span className="text-sm">Quá hạn</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <FormController<F2PaymentFilterFormData, any>
                  register={register}
                  control={control}
                  name="include_voided"
                  Field={Switch}
                />
                <span className="text-sm">Bao gồm phiếu hủy</span>
              </label>
            </div>
          </div>
        </Grid>
      </FormProvider>
    )
  }
)

F2PaymentListFilter.displayName = 'F2PaymentListFilter'

export default F2PaymentListFilter
