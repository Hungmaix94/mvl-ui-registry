import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import type { SelectProps } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'

export type CommissionSplitFilterFormData = {
  status?: string
}

export type CommissionSplitFilterRef = {
  getValues: () => CommissionSplitFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: CommissionSplitFilterFormData
  isOpen: boolean
}

export const CommissionSplitFilter = forwardRef<CommissionSplitFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<CommissionSplitFilterFormData>({
      defaultValues: initialValues ?? {},
    })
    const { control, register, reset, getValues } = form

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      clearForm: () => reset({ status: undefined }),
    }))

    return (
      <FormProvider {...form}>
        <Grid columns="1" gap="4" className="w-full">
          <FormController<
            CommissionSplitFilterFormData,
            SelectProps<{ label: string; value: string | number }>
          >
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái CĐT thanh toán',
              placeholder: 'Tất cả trạng thái',
              options: [
                { label: 'Tất cả', value: '' },
                { label: 'Chưa nhận', value: 'CHƯA NHẬN' },
                { label: 'Nhận 1 phần', value: 'NHẬN 1 PHẦN' },
                { label: 'Đã nhận đủ', value: 'ĐÃ NHẬN ĐỦ' },
              ],
            }}
          />
        </Grid>
      </FormProvider>
    )
  }
)

CommissionSplitFilter.displayName = 'CommissionSplitFilter'

export default CommissionSplitFilter
