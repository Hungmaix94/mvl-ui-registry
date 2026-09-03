import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useProjectSelect } from '@/hooks/useProjectSelect'

export type AdvanceOutstandingFilterFormData = {
  project?: string
}

export type AdvanceOutstandingFilterRef = {
  getValues: () => AdvanceOutstandingFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: AdvanceOutstandingFilterFormData
  isOpen?: boolean
}

export const AdvanceOutstandingFilter = forwardRef<AdvanceOutstandingFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<AdvanceOutstandingFilterFormData>({
      defaultValues: initialValues ?? {},
    })
    const { control, register } = form

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () =>
        form.reset({
          project: '',
        }),
    }))

    return (
      <FormProvider {...form}>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <FormController<AdvanceOutstandingFilterFormData, any>
            register={register}
            control={control}
            name="project"
            Field={Select}
            fieldProps={{
              label: 'Dự án',
              placeholder: 'Chọn dự án',
              loadOptions: loadProjectOptions,
              loadInitialOptions: loadInitialProjectOptions,
              enableSearch: true,
              clearable: true,
            }}
          />
        </div>
      </FormProvider>
    )
  }
)

AdvanceOutstandingFilter.displayName = 'AdvanceOutstandingFilter'

export default AdvanceOutstandingFilter
