import {
  useCallback,
  useMemo,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from 'react'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Checkbox } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { cn } from '@/lib/utils.ts'
import { EmployeeType } from '@/constants/api-schema-aliases'
export type LeaderEmployeeFilterFormData = {
  branch_id?: number
  block_id?: number
  department_id?: number
  employee_types?: EmployeeType[]
}

export type LeaderEmployeeFilterFormRef = {
  clearForm: () => void
  getValues: () => LeaderEmployeeFilterFormData
}

type LeaderEmployeeFilterFormProps = {
  initialValues?: LeaderEmployeeFilterFormData
  /** When true, form will reset to initialValues (URL) on next effect run */
  isOpen?: boolean
}

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  employee_types: z.array(z.string()).optional(),
})

const LeaderEmployeeFilterForm = forwardRef<
  LeaderEmployeeFilterFormRef,
  LeaderEmployeeFilterFormProps
>(({ initialValues, isOpen }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const prevIsOpenRef = useRef(false)
  const [shouldClearCascade, setShouldClearCascade] = useState(false)

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES],
  })

  const employeeTypeOptions = useMemo((): Array<{
    value: EmployeeType
    label: string
  }> => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES) || []
      : []
  }, [keysMapOptions])

  const { handleSubmit, reset, getValues, watch, setValue } = useForm<LeaderEmployeeFilterFormData>(
    {
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        employee_types: initialValues?.employee_types,
      },
    }
  )

  // Sync form from URL only when dialog *just* opened (not on every initialValues ref change)
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current
    prevIsOpenRef.current = !!isOpen
    if (justOpened && initialValues) {
      reset({
        branch_id: initialValues.branch_id,
        block_id: initialValues.block_id,
        department_id: initialValues.department_id,
        employee_types: initialValues.employee_types,
      })
      setShouldClearCascade(false)
      setFormKey((prev) => prev + 1)
    }
  }, [isOpen, initialValues, reset])

  const watchedEmployeeTypes = watch('employee_types') || []

  const handleEmployeeTypeChange = useCallback(
    (typeValue: EmployeeType, checked: boolean) => {
      const current = watchedEmployeeTypes
      if (checked) {
        setValue('employee_types', [...current, typeValue])
      } else {
        setValue(
          'employee_types',
          current.filter((t) => t !== typeValue)
        )
      }
    },
    [setValue, watchedEmployeeTypes]
  )

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
    [setValue]
  )

  // Expose clearForm and getValues via ref
  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldClearCascade(true)
        setFormKey((prev) => prev + 1)
        const cleared: LeaderEmployeeFilterFormData = {
          branch_id: undefined,
          block_id: undefined,
          department_id: undefined,
          employee_types: undefined,
        }
        reset(cleared, { keepDefaultValues: false, keepValues: false })
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  // Empty submit handler - form submission is handled by parent via ref
  const onSubmit = (_data: LeaderEmployeeFilterFormData) => {}

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
          layout="grid"
          skipValidation={true}
          className="gap-5"
        />

        {/* Employee Type Checkboxes */}
        <div className="flex flex-col gap-1 space-y-2">
          <label className={cn('typo-body-base-semibold text-neutral-90')}>Loại nhân viên</label>
          <div className="flex flex-wrap gap-6">
            {employeeTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  checked={watchedEmployeeTypes.includes(option.value)}
                  onCheckedChange={(checked: boolean) =>
                    handleEmployeeTypeChange(option.value, checked)
                  }
                />
                <label className="typo-body-base-regular text-content-dark-1">{option.label}</label>
              </div>
            ))}
          </div>
        </div>
      </Flex>
    </Form>
  )
})

LeaderEmployeeFilterForm.displayName = 'LeaderEmployeeFilterForm'

export default LeaderEmployeeFilterForm
