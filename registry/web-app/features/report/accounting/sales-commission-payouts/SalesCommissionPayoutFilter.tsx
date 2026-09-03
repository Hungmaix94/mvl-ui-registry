import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'

const TYPE_OPTIONS = [
  { label: 'Tất cả đối tượng', value: '' },
  { label: 'Nhân viên', value: 'EMPLOYEE' },
  { label: 'Cộng tác viên', value: 'COLLABORATOR' },
  { label: 'Sàn liên kết / F2', value: 'EXCHANGE' },
]

export type SalesCommissionPayoutFilterFormData = {
  type?: string
}

export type SalesCommissionPayoutFilterRef = {
  getValues: () => SalesCommissionPayoutFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: SalesCommissionPayoutFilterFormData
  isOpen?: boolean
}

export const SalesCommissionPayoutFilter = forwardRef<
  SalesCommissionPayoutFilterRef,
  Props
>(({ initialValues, isOpen }, ref) => {
  const form = useForm<SalesCommissionPayoutFilterFormData>({
    defaultValues: initialValues ?? {},
  })
  const { control, register } = form

  useEffect(() => {
    if (isOpen && initialValues) form.reset(initialValues)
  }, [isOpen, initialValues, form])

  useImperativeHandle(ref, () => ({
    getValues: () => form.getValues(),
    clearForm: () =>
      form.reset({
        type: '',
      }),
  }))

  return (
    <FormProvider {...form}>
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FormController<SalesCommissionPayoutFilterFormData, any>
          register={register}
          control={control}
          name="type"
          Field={Select}
          fieldProps={{
            label: 'Loại đối tượng',
            placeholder: 'Chọn loại đối tượng',
            options: TYPE_OPTIONS,
            clearable: true,
          }}
        />
      </div>
    </FormProvider>
  )
})

SalesCommissionPayoutFilter.displayName = 'SalesCommissionPayoutFilter'

export default SalesCommissionPayoutFilter
