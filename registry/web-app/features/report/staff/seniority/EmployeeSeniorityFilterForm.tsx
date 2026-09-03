import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'

export type EmployeeSeniorityFilterFormValues = {
  branch?: number
  block?: number
  department?: number
  branchName?: string
  blockName?: string
  departmentName?: string
  block_types?: string[]
}

export interface EmployeeSeniorityFilterFormRef {
  clearForm: () => void
  getValues: () => EmployeeSeniorityFilterFormValues
}

type EmployeeSeniorityFilterFormProps = {
  initialValues: EmployeeSeniorityFilterFormValues
  onApply: (values: EmployeeSeniorityFilterFormValues) => void
}

const EmployeeSeniorityFilterForm = forwardRef<
  EmployeeSeniorityFilterFormRef,
  EmployeeSeniorityFilterFormProps
>(({ initialValues }, ref) => {
  const form = useForm<EmployeeSeniorityFilterFormValues>({
    defaultValues: {
      ...initialValues,
      block_types: initialValues?.block_types ?? [],
    },
  })

  const { setValue, watch, reset, getValues } = form

  const buildCascadeInitialValues = useCallback(
    (values: EmployeeSeniorityFilterFormValues | undefined) => ({
      branch: values?.branch ? String(values.branch) : undefined,
      block: values?.block ? String(values.block) : undefined,
      department: values?.department ? String(values.department) : undefined,
      block_types: values?.block_types ?? [],
    }),
    []
  )

  const [cascadeInitialValues, setCascadeInitialValues] = useState(() =>
    buildCascadeInitialValues(initialValues)
  )
  const [cascadeKey, setCascadeKey] = useState(0)

  useEffect(() => {
    reset({
      ...initialValues,
      block_types: initialValues?.block_types ?? [],
    })
    setCascadeInitialValues(buildCascadeInitialValues(initialValues))
    setCascadeKey((prev) => prev + 1)
  }, [initialValues, reset, buildCascadeInitialValues])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset({
          branch: undefined,
          block: undefined,
          department: undefined,
          branchName: undefined,
          blockName: undefined,
          departmentName: undefined,
          block_types: [],
        })
        setCascadeInitialValues(
          buildCascadeInitialValues({
            block_types: [],
          })
        )
        setCascadeKey((prev) => prev + 1)
      },
      getValues: () => form.getValues(),
    }),
    [form, reset, buildCascadeInitialValues]
  )

  const handleCascadeChange = useCallback(
    (data: any) => {
      setValue('branch', data.branch_id && data.branch_id !== 0 ? data.branch_id : undefined)
      setValue('block', data.block_id && data.block_id !== 0 ? data.block_id : undefined)
      setValue(
        'department',
        data.department_id && data.department_id !== 0 ? data.department_id : undefined
      )

      setValue('branchName', data.branch_name)
      setValue('blockName', data.block_name)
      setValue('departmentName', data.department_name)
      setValue('block_types', Array.isArray(data.block_types) ? data.block_types : [])
    },
    [setValue]
  )

  // ensure block_types stays in sync with cascade component
  const watchedBlockTypes = watch('block_types')
  useEffect(() => {
    const nextBlockTypes = Array.isArray(watchedBlockTypes) ? [...watchedBlockTypes] : []
    const currentBlockTypesRaw = getValues('block_types')
    const currentBlockTypes = Array.isArray(currentBlockTypesRaw) ? [...currentBlockTypesRaw] : []

    if (
      nextBlockTypes.length === currentBlockTypes.length &&
      nextBlockTypes.every((value, index) => value === currentBlockTypes[index])
    ) {
      return
    }

    setValue('block_types', nextBlockTypes, { shouldDirty: false })
  }, [getValues, setValue, watchedBlockTypes])

  return (
    <div className="flex flex-col gap-6">
      <CascadeSelectGroupOrganization
        key={cascadeKey}
        initialValues={cascadeInitialValues}
        onFormChange={handleCascadeChange}
        showEmployee={false}
        showPosition={false}
        blockTypeVariant={'select'}
        showBlockTypeFilter
        skipValidation
        className="gap-5"
      />
    </div>
  )
})

EmployeeSeniorityFilterForm.displayName = 'EmployeeSeniorityFilterForm'

export default EmployeeSeniorityFilterForm
