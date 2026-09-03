import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Select, { type SelectOption } from '@/components/ui/select/Select'
import { getRealEstateService } from '@/services/realestate-service'
import { PAGE_SIZE } from '@/constants/table'
import { QUERY_KEYS } from '@/constants/query-keys'

export type AttendanceProjectOrgFilterFormValues = {
  attendanceDate: string
  project?: number
  projectName?: string
}

export type AttendanceProjectOrgFilterFormRef = {
  clearForm: (defaultAttendanceDate?: string) => void
  getValues: () => AttendanceProjectOrgFilterFormValues
}

type AttendanceProjectOrgFilterFormProps = {
  initialValues?: Partial<AttendanceProjectOrgFilterFormValues>
  onValidationChange?: (isValid: boolean) => void
}

const schema = z.object({
  attendanceDate: z.string().min(1, 'Vui lòng chọn thời gian'),
  project: z.number().optional(),
  projectName: z.string().optional(),
})

const AttendanceProjectOrgFilterForm = forwardRef<
  AttendanceProjectOrgFilterFormRef,
  AttendanceProjectOrgFilterFormProps
>(({ initialValues, onValidationChange }, ref) => {
  const queryClient = useQueryClient()
  const [formKey, setFormKey] = useState(0)
  const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)

  const {
    control,
    handleSubmit,
    register,
    reset,
    getValues,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<AttendanceProjectOrgFilterFormValues>({
    resolver: zodResolver(schema) as any,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      attendanceDate: initialValues?.attendanceDate || '',
      project: initialValues?.project,
      projectName: initialValues?.projectName,
    },
  })

  const attendanceDateValue = watch('attendanceDate')

  useEffect(() => {
    onValidationChange?.(Boolean(attendanceDateValue) && isValid)
  }, [attendanceDateValue, isValid, onValidationChange])

  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        attendanceDate: initialValues.attendanceDate || '',
        project: initialValues.project,
        projectName: initialValues.projectName,
      })
      setShouldResetToInitial(true)
    }
  }, [initialValues, reset, shouldResetToInitial])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: (defaultAttendanceDate?: string) => {
        setShouldResetToInitial(false)
        setFormKey((prev) => prev + 1)
        reset(
          {
            attendanceDate: defaultAttendanceDate ?? '',
            project: undefined,
            projectName: undefined,
          },
          {
            keepDefaultValues: false,
            keepErrors: false,
            keepDirty: false,
            keepIsSubmitted: false,
            keepTouched: false,
            keepIsValid: false,
            keepSubmitCount: false,
          }
        )
        setValue('attendanceDate', defaultAttendanceDate ?? '', {
          shouldDirty: false,
          shouldValidate: false,
        })
      },
      getValues: () => getValues(),
    }),
    [getValues, reset, setValue]
  )

  const onSubmit = (_data: AttendanceProjectOrgFilterFormValues) => {
    // Submit handled via dialog actions
  }

  const loadProjectOptions = async (params: {
    query: string
    page: number
    pageSize: number
  }): Promise<{ items: SelectOption[]; nextPage?: number | null; hasNextPage?: boolean }> => {
    const queryParams = {
      search: params.query || undefined,
      page: params.page,
      page_size: params.pageSize,
    }

    const response = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.REALESTATE.PROJECTS.LIST(queryParams),
      queryFn: () => getRealEstateService().getProjects(queryParams),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const items: SelectOption[] =
      response?.results?.map((project) => ({
        label:
          project.code && project.name ? `${project.code} - ${project.name}` : project.name || '',
        value: project.id,
      })) || []

    return {
      items,
      nextPage: response?.next ? params.page + 1 : null,
      hasNextPage: !!response?.next,
    }
  }

  const loadInitialProjectOptions = async (
    values: (string | number)[]
  ): Promise<SelectOption[]> => {
    if (!values.length) return []
    const projectId = Number(values[0])
    if (!projectId) return []

    try {
      const project = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.REALESTATE.PROJECTS.DETAIL(projectId),
        queryFn: () => getRealEstateService().getProject(projectId),
        staleTime: 1000 * 60 * 5, // 5 minutes
      })

      if (project) {
        return [
          {
            label:
              project.code && project.name
                ? `${project.code} - ${project.name}`
                : project.name || '',
            value: project.id,
          },
        ]
      }
    } catch {
      // ignore
    }
    return []
  }

  return (
    <Form
      onSubmit={onSubmit}
      handleSubmit={handleSubmit as any}
      loading={false}
      className="flex flex-col gap-5"
    >
      <FormController
        key={`attendance-date-picker-${formKey}`}
        name="attendanceDate"
        control={control}
        register={register}
        Field={DatePicker}
        fieldProps={{
          label: 'Thời gian',
          required: true,
          placeholder: 'DD/MM/YYYY',
          allowManualInput: true,
          clearable: false,
          className: 'w-full',
        }}
      />

      <FormController
        key={`project-select-${formKey}`}
        name="project"
        control={control}
        register={register}
        Field={Select}
        fieldProps={{
          label: 'Dự án',
          placeholder: 'Chọn dự án',
          loadOptions: loadProjectOptions,
          pageSize: PAGE_SIZE,
          enableSearch: true,
          searchPlaceholder: 'Tìm kiếm dự án...',
          loadInitialOptions: loadInitialProjectOptions,
          onChange: (value: string | number | (string | number)[] | null) => {
            if (value && typeof value === 'number') {
              // Load project name when selected
              loadInitialProjectOptions([value]).then((options) => {
                if (options[0]) {
                  setValue('projectName', options[0].label, {
                    shouldDirty: false,
                    shouldValidate: false,
                  })
                }
              })
            } else {
              setValue('projectName', undefined, { shouldDirty: false, shouldValidate: false })
            }
            setValue('project', value as number | undefined, {
              shouldDirty: false,
              shouldValidate: false,
            })
          },
          className: 'w-full',
        }}
      />
    </Form>
  )
})

AttendanceProjectOrgFilterForm.displayName = 'AttendanceProjectOrgFilterForm'

export default AttendanceProjectOrgFilterForm
