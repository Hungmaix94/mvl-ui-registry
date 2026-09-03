import { useCallback, useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'

export type KPIUnitEvaluationFilterFormData = {
  branch_id?: number
  block_id?: number
  department_id?: number
}

export type KPIUnitEvaluationFilterFormRef = {
  clearForm: () => void
  getValues: () => KPIUnitEvaluationFilterFormData
}

type KPIUnitEvaluationFilterFormProps = {
  initialValues?: KPIUnitEvaluationFilterFormData
}

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
})

const KPIUnitEvaluationFilterForm = forwardRef<
  KPIUnitEvaluationFilterFormRef,
  KPIUnitEvaluationFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const [shouldResetToInitial, setShouldResetToInitial] = useState(true)
  const [shouldClearCascade, setShouldClearCascade] = useState(false)

  const { handleSubmit, reset, getValues, setValue } = useForm<KPIUnitEvaluationFilterFormData>({
    resolver: zodResolver(Schema) as any,
    defaultValues: {
      branch_id: initialValues?.branch_id,
      block_id: initialValues?.block_id,
      department_id: initialValues?.department_id,
    },
  })

  // Update form values when initialValues change (e.g., dialog reopen)
  useEffect(() => {
    if (shouldResetToInitial && initialValues) {
      reset({
        branch_id: initialValues.branch_id,
        block_id: initialValues.block_id,
        department_id: initialValues.department_id,
      })
      // Reset formKey to trigger CascadeSelectGroupOrganization re-render with new values
      setFormKey((prev) => prev + 1)
      // Reset clear flag when initialValues change (dialog reopened with new values)
      setShouldClearCascade(false)
    }
  }, [initialValues, reset, shouldResetToInitial])

  const handleCascadeChange = useCallback(
    (data: any) => {
      setValue('branch_id', data.branch_id && data.branch_id !== 0 ? data.branch_id : undefined, {
        shouldDirty: true,
      })
      setValue('block_id', data.block_id && data.block_id !== 0 ? data.block_id : undefined, {
        shouldDirty: true,
      })
      setValue(
        'department_id',
        data.department_id && data.department_id !== 0 ? data.department_id : undefined,
        { shouldDirty: true }
      )
    },
    [setValue, getValues]
  )

  // Expose clearForm and getValues via ref
  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        setShouldClearCascade(true)
        setFormKey((prev) => prev + 1)
        const clearedValues = {
          branch_id: undefined,
          block_id: undefined,
          department_id: undefined,
        }
        reset(clearedValues as any, { keepDefaultValues: false, keepValues: false })
      },
      getValues: () => getValues(),
    }),
    [reset, getValues, formKey, initialValues, shouldClearCascade]
  )

  // Empty submit handler - form submission is handled by parent via ref
  const onSubmit = (_data: KPIUnitEvaluationFilterFormData) => {}

  return (
    <Form loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
      <Flex direction={'column'} gap={'5'}>
        {/* Cascade Select: Branch, Block, Department */}
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            shouldClearCascade
              ? undefined
              : {
                  branch: initialValues?.branch_id?.toString(),
                  block: initialValues?.block_id?.toString(),
                  department: initialValues?.department_id?.toString(),
                }
          }
          onFormChange={handleCascadeChange}
          showEmployee={false}
          showPosition={false}
          layout="grid"
          skipValidation={true}
          className="gap-5"
        />
      </Flex>
    </Form>
  )
})

KPIUnitEvaluationFilterForm.displayName = 'KPIUnitEvaluationFilterForm'

export default KPIUnitEvaluationFilterForm
