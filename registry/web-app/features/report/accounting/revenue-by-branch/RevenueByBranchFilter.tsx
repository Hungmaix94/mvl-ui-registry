import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useBranchSelect } from '@/hooks/useBranchSelect'

export type RevenueByBranchFilterFormData = {
  branch?: string
}

export type RevenueByBranchFilterRef = {
  getValues: () => RevenueByBranchFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: RevenueByBranchFilterFormData
  isOpen?: boolean
}

export const RevenueByBranchFilter = forwardRef<
  RevenueByBranchFilterRef,
  Props
>((({ initialValues, isOpen }, ref) => {
  const form = useForm<RevenueByBranchFilterFormData>({
    defaultValues: initialValues ?? {},
  })
  const { control, register } = form

  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()

  useEffect(() => {
    if (isOpen && initialValues) form.reset(initialValues)
  }, [isOpen, initialValues, form])

  useImperativeHandle(ref, () => ({
    getValues: () => form.getValues(),
    clearForm: () =>
      form.reset({
        branch: '',
      }),
  }))

  return (
    <FormProvider {...form}>
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FormController<RevenueByBranchFilterFormData, any>
          register={register}
          control={control}
          name="branch"
          Field={Select}
          fieldProps={{
            label: 'Chi nhánh',
            placeholder: 'Chọn chi nhánh',
            loadOptions: loadBranchOptions,
            loadInitialOptions: loadInitialBranchOptions,
            enableSearch: true,
            clearable: true,
          }}
        />
      </div>
    </FormProvider>
  )
}))

RevenueByBranchFilter.displayName = 'RevenueByBranchFilter'

export default RevenueByBranchFilter
