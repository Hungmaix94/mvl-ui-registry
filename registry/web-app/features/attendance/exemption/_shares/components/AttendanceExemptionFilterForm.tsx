import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'

export type AttendanceExemptionFilterFormRef = {
  clearForm: () => void
  getValues?: () => AttendanceExemptionFilterForm
  submitForm: () => void
}

type AttendanceExemptionFilterFormProps = {
  initialValues?: Record<string, any>
}

export type AttendanceExemptionFilterForm = {
  effective_date?: Date | null
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
}

const Schema = z.object({
  effective_date: z.date().nullable().optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position_id: z.number().optional(),
})

const AttendanceExemptionFilterForm = forwardRef<
  AttendanceExemptionFilterFormRef,
  AttendanceExemptionFilterFormProps
>(({ initialValues }, ref) => {
  const [isLoading, setIsLoading] = useState(false)
  const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
  const [cascadeFormData, setCascadeFormData] = useState<Partial<CascadeSelectFormData>>({
    branch_id: 0,
    block_id: 0,
    department_id: 0,
    position_id: 0,
  })

  const { handleSubmit, reset, getValues, setValue } = useForm<AttendanceExemptionFilterForm>({
    resolver: zodResolver(Schema) as any,
    defaultValues: {
      position_id: initialValues?.position_id || undefined,
      effective_date: initialValues?.effective_date ? new Date(initialValues.effective_date) : null,
      branch_id: initialValues?.branch_id || undefined,
      block_id: initialValues?.block_id || undefined,
      department_id: initialValues?.department_id || undefined,
    },
  })
  const [formKey, setFormKey] = useState(0)

  // Update form values when initialValues change
  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        position_id: initialValues?.position_id || undefined,
        effective_date: initialValues?.effective_date
          ? new Date(initialValues.effective_date)
          : null,
        branch_id: initialValues?.branch_id || undefined,
        block_id: initialValues?.block_id || undefined,
        department_id: initialValues?.department_id || undefined,
      })
      setCascadeFormData({
        branch_id: initialValues?.branch_id ?? 0,
        block_id: initialValues?.block_id ?? 0,
        department_id: initialValues?.department_id ?? 0,
        position_id: initialValues?.position_id ?? 0,
      })
      setShouldResetToInitial(true)
      setFormKey((prev) => prev + 1)
    }
  }, [initialValues, reset, shouldResetToInitial])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        reset(
          {
            position_id: undefined,
            effective_date: null,
            branch_id: undefined,
            block_id: undefined,
            department_id: undefined,
          },
          {
            keepDefaultValues: false,
          }
        )
        setCascadeFormData({
          branch_id: 0,
          block_id: 0,
          department_id: 0,
          position_id: 0,
        })
        setFormKey((prev) => prev + 1)
      },
      getValues: () => getValues(),
      submitForm: () => handleSubmit(onSubmit)(),
    }),
    [reset, getValues, handleSubmit]
  )

  const handleCascadeFormChange = useCallback(
    (data: CascadeSelectFormData) => {
      setCascadeFormData(data)
      setValue('branch_id', (data.branch_id ?? 0) > 0 ? data.branch_id : undefined, {
        shouldDirty: false,
      })
      setValue('block_id', (data.block_id ?? 0) > 0 ? data.block_id : undefined, {
        shouldDirty: false,
      })
      setValue('department_id', (data.department_id ?? 0) > 0 ? data.department_id : undefined, {
        shouldDirty: false,
      })
      setValue('position_id', (data.position_id ?? 0) > 0 ? data.position_id : undefined, {
        shouldDirty: false,
      })
    },
    [setValue]
  )

  const onSubmit = async () => {
    setIsLoading(true)
    try {
      // Form submission is handled by parent component
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }

  const getCascadeInitialValues = useMemo(() => {
    return {
      branch:
        cascadeFormData.branch_id && cascadeFormData.branch_id > 0
          ? String(cascadeFormData.branch_id)
          : undefined,
      block:
        cascadeFormData.block_id && cascadeFormData.block_id > 0
          ? String(cascadeFormData.block_id)
          : undefined,
      department:
        cascadeFormData.department_id && cascadeFormData.department_id > 0
          ? String(cascadeFormData.department_id)
          : undefined,
      position:
        cascadeFormData.position_id && cascadeFormData.position_id > 0
          ? String(cascadeFormData.position_id)
          : undefined,
    }
  }, [cascadeFormData])

  return (
    <>
      <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={getCascadeInitialValues}
          onFormChange={handleCascadeFormChange}
          showPosition={true}
          showEmployee={false}
          skipValidation={true}
          className="gap-5"
        />
      </Form>
    </>
  )
})

AttendanceExemptionFilterForm.displayName = 'AttendanceExemptionFilterForm'

export default AttendanceExemptionFilterForm
