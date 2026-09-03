import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Select, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useProjectSelect } from '@/hooks/useProjectSelect'

export type ProjectSummaryFilterFormData = {
  project?: string
  unit_code?: string
}

export type ProjectSummaryFilterRef = {
  getValues: () => ProjectSummaryFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: ProjectSummaryFilterFormData
  isOpen?: boolean
}

export const ProjectSummaryFilter = forwardRef<
  ProjectSummaryFilterRef,
  Props
>(({ initialValues, isOpen }, ref) => {
  const form = useForm<ProjectSummaryFilterFormData>({
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
        unit_code: '',
      }),
  }))

  return (
    <FormProvider {...form}>
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FormController<ProjectSummaryFilterFormData, any>
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

        <FormController<ProjectSummaryFilterFormData, any>
          register={register}
          control={control}
          name="unit_code"
          Field={TextField}
          fieldProps={{
            label: 'Mã căn',
            placeholder: 'Nhập mã căn',
          }}
        />
      </div>
    </FormProvider>
  )
})

ProjectSummaryFilter.displayName = 'ProjectSummaryFilter'

export default ProjectSummaryFilter
