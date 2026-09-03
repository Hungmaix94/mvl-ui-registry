import { forwardRef, useCallback, useImperativeHandle, useMemo, useState, useEffect } from 'react'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { Checkbox, Text } from '@/components/ui'
import Select from '@/components/ui/select/Select.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ASSESSED_FILTER_OPTIONS } from '@/features/kpi/period-evaluation/_shares/constants/period-evaluation-constants.ts'

export type KPIPeriodEvaluationFilterFormRef = {
  clearForm: () => void
  getValues: () => KPIPeriodEvaluationFilterFormValues
  submitForm: () => void
}

type KPIPeriodEvaluationFilterFormProps = {
  initialValues?: Record<string, any>
}

export type KPIPeriodEvaluationFilterFormValues = {
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  grade_manager?: string[]
  grade_hrm?: string[]
  status?: string | null
  employee_assessed?: string | null
  manager_assessed?: string | null
  hrm_assessed?: string | null
}

const Schema = z.object({
  month: z.date().nullable().optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position_id: z.number().optional(),
  grade_manager: z.array(z.string()).optional(),
  grade_hrm: z.array(z.string()).optional(),
  status: z.string().nullable().optional(),
  employee_assessed: z.string().nullable().optional(),
  manager_assessed: z.string().nullable().optional(),
  hrm_assessed: z.string().nullable().optional(),
})

const GRADES = ['A', 'B', 'C', 'D']

const ASSESSED_FIELDS: {
  name: 'employee_assessed' | 'manager_assessed' | 'hrm_assessed'
  label: string
}[] = [
  { name: 'employee_assessed', label: 'Nhân sự tự đánh giá' },
  { name: 'manager_assessed', label: 'Trưởng phòng đánh giá' },
  { name: 'hrm_assessed', label: 'HR đánh giá' },
]

const KPIPeriodEvaluationFilterForm = forwardRef<
  KPIPeriodEvaluationFilterFormRef,
  KPIPeriodEvaluationFilterFormProps
>(({ initialValues }, ref) => {
  const { keysMapOptions } = useAppConstant({
    module: 'payroll',
    keys: [APP_CONSTANT_KEY.PAYROLL.EMPLOYEE_KPI_ASSESSMENT_STATUS_CHOICES],
  })

  const [isLoading] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [shouldResetToInitial, setShouldResetToInitial] = useState(true)
  const [shouldClearCascade, setShouldClearCascade] = useState(false)

  const statusOptions = useMemo(() => {
    const opts = keysMapOptions.get(
      APP_CONSTANT_KEY.PAYROLL.EMPLOYEE_KPI_ASSESSMENT_STATUS_CHOICES
    ) as { value: string; label: string }[] | undefined
    return opts || []
  }, [keysMapOptions])

  const { handleSubmit, reset, getValues, setValue, control } =
    useForm<KPIPeriodEvaluationFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        branch_id: initialValues?.branch_id || undefined,
        block_id: initialValues?.block_id || undefined,
        department_id: initialValues?.department_id || undefined,
        position_id: initialValues?.position_id || undefined,
        grade_manager: initialValues?.grade_manager || [],
        grade_hrm: initialValues?.grade_hrm || [],
        status: initialValues?.status || null,
        employee_assessed: initialValues?.employee_assessed || null,
        manager_assessed: initialValues?.manager_assessed || null,
        hrm_assessed: initialValues?.hrm_assessed || null,
      },
    })

  // Update form values when initialValues change (when dialog reopens)
  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        branch_id: initialValues.branch_id || undefined,
        block_id: initialValues.block_id || undefined,
        department_id: initialValues.department_id || undefined,
        position_id: initialValues.position_id || undefined,
        grade_manager: initialValues.grade_manager || [],
        grade_hrm: initialValues.grade_hrm || [],
        status: initialValues?.status || null,
        employee_assessed: initialValues?.employee_assessed || null,
        manager_assessed: initialValues?.manager_assessed || null,
        hrm_assessed: initialValues?.hrm_assessed || null,
      })
      setFormKey((prev) => prev + 1)
      setShouldClearCascade(false)
    }
  }, [initialValues, reset, shouldResetToInitial])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        setShouldClearCascade(true)
        reset(
          {
            branch_id: undefined,
            block_id: undefined,
            department_id: undefined,
            position_id: undefined,
            grade_manager: [],
            grade_hrm: [],
            status: null,
            employee_assessed: null,
            manager_assessed: null,
            hrm_assessed: null,
          },
          { keepDefaultValues: false, keepValues: false }
        )
        setFormKey((prev) => prev + 1)
      },
      getValues: () => getValues(),
      submitForm: () => handleSubmit(onSubmit)(),
    }),
    [reset, getValues, handleSubmit]
  )

  const handleCascadeFormChange = useCallback(
    (data: CascadeSelectFormData) => {
      setValue('branch_id', (data.branch_id ?? 0) > 0 ? data.branch_id : undefined, {
        shouldDirty: true,
      })
      setValue('block_id', (data.block_id ?? 0) > 0 ? data.block_id : undefined, {
        shouldDirty: true,
      })
      setValue('department_id', (data.department_id ?? 0) > 0 ? data.department_id : undefined, {
        shouldDirty: true,
      })
      setValue('position_id', (data.position_id ?? 0) > 0 ? data.position_id : undefined, {
        shouldDirty: true,
      })
    },
    [setValue]
  )

  const onSubmit = async () => {
    // Form submission is handled by parent component
  }

  const cascadeInitialValues = useMemo(() => {
    if (shouldClearCascade) {
      return undefined
    }
    return {
      branch: initialValues?.branch_id ? String(initialValues.branch_id) : undefined,
      block: initialValues?.block_id ? String(initialValues.block_id) : undefined,
      department: initialValues?.department_id ? String(initialValues.department_id) : undefined,
      position: initialValues?.position_id ? String(initialValues.position_id) : undefined,
    }
  }, [initialValues, shouldClearCascade])

  return (
    <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
      <div className="flex flex-col gap-6">
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={cascadeInitialValues}
          onFormChange={handleCascadeFormChange}
          showPosition={true}
          showEmployee={false}
          skipValidation={true}
          className="gap-5"
        />

        <div className="flex flex-col gap-4">
          <Text className="typo-body-sm-medium text-content-dark-1">
            Xếp loại KPI (Trưởng phòng)
          </Text>
          <Controller
            name="grade_manager"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap items-center gap-6">
                {GRADES.map((grade) => (
                  <div key={grade} className="flex items-center gap-2">
                    <Checkbox
                      checked={field.value?.includes(grade)}
                      onCheckedChange={(checked) => {
                        const newValue = checked
                          ? [...(field.value || []), grade]
                          : (field.value || [])?.filter((v) => v !== grade)
                        field.onChange(newValue)
                      }}
                    />
                    <Text className="text-sm">{grade}</Text>
                  </div>
                ))}
              </div>
            )}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Text className="typo-body-sm-medium text-content-dark-1">Xếp loại KPI (Nhân sự)</Text>
          <Controller
            name="grade_hrm"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap items-center gap-6">
                {GRADES.map((grade) => (
                  <div key={grade} className="flex items-center gap-2">
                    <Checkbox
                      checked={field.value?.includes(grade)}
                      onCheckedChange={(checked) => {
                        const newValue = checked
                          ? [...(field.value || []), grade]
                          : (field.value || [])?.filter((v) => v !== grade)
                        field.onChange(newValue)
                      }}
                    />
                    <Text className="text-sm">{grade}</Text>
                  </div>
                ))}
              </div>
            )}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Text className="typo-body-sm-medium text-content-dark-1">Trạng thái</Text>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                key={formKey}
                options={statusOptions}
                value={field.value ?? null}
                onChange={(val) => {
                  field.onChange(val ?? null)
                }}
                placeholder="Chọn trạng thái"
                clearable
              />
            )}
          />
        </div>

        {ASSESSED_FIELDS.map(({ name, label }) => (
          <div key={name} className="flex flex-col gap-4">
            <Text className="typo-body-sm-medium text-content-dark-1">{label}</Text>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <Select
                  key={formKey}
                  options={ASSESSED_FILTER_OPTIONS}
                  value={field.value ?? null}
                  onChange={(val) => {
                    field.onChange(val ?? null)
                  }}
                  placeholder="Chọn trạng thái đánh giá"
                  clearable
                />
              )}
            />
          </div>
        ))}
      </div>
    </Form>
  )
})

KPIPeriodEvaluationFilterForm.displayName = 'KPIPeriodEvaluationFilterForm'

export default KPIPeriodEvaluationFilterForm
