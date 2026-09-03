import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex, Grid } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { Checkbox } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export type ContractEvaluationFilterFormRef = {
  clearForm: () => void
  getRawValues: () => ContractEvaluationFilterFormValues
  getValues: () => ContractEvaluationFilterFormValues
}

type ContractEvaluationFilterFormProps = {
  initialValues?: Partial<ContractEvaluationFilterFormValues>
}

const Schema = z.object({
  deadline_range: z
    .object({ from: z.date().optional(), to: z.date().optional() })
    .nullable()
    .optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  employee_id: z.number().optional(),
  form_type: z.array(z.string()).optional(),
  display_status: z.array(z.string()).optional(),
})

export type ContractEvaluationFilterFormValues = z.infer<typeof Schema>

const ContractEvaluationFilterForm = forwardRef<
  ContractEvaluationFilterFormRef,
  ContractEvaluationFilterFormProps
>(({ initialValues }, ref) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_FORM_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_DISPLAY_STATUS,
    ],
  })

  const formTypeOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_FORM_TYPE) ?? [],
    [keysMapOptions]
  )
  const displayStatusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_DISPLAY_STATUS) ?? [],
    [keysMapOptions]
  )

  const { control, reset, getValues, handleSubmit, watch, setValue, register } =
    useForm<ContractEvaluationFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        deadline_range: initialValues?.deadline_range ?? null,
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        employee_id: initialValues?.employee_id,
        form_type: initialValues?.form_type ?? [],
        display_status: initialValues?.display_status ?? [],
      },
    })

  const [formKey, setFormKey] = useState(0)
  const [shouldResetToInitial, setShouldResetToInitial] = useState(true)

  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        deadline_range: initialValues?.deadline_range ?? null,
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        employee_id: initialValues?.employee_id,
        form_type: initialValues?.form_type ?? [],
        display_status: initialValues?.display_status ?? [],
      })
      setShouldResetToInitial(true)
      setFormKey(0)
    } else if (!initialValues || Object.keys(initialValues).length === 0) {
      setFormKey(0)
    }
  }, [initialValues, reset, shouldResetToInitial])

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      setShouldResetToInitial(false)
      reset(
        {
          deadline_range: null,
          branch_id: undefined,
          block_id: undefined,
          department_id: undefined,
          employee_id: undefined,
          form_type: [],
          display_status: [],
        },
        { keepDefaultValues: false }
      )
      setFormKey((prev) => prev + 1)
    },
    getRawValues: () => getValues(),
    getValues: () => getValues(),
  }))

  const handleCascadeChange = useCallback(
    (data: CascadeSelectFormData) => {
      const current = getValues()
      if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
        setValue('branch_id', data.branch_id > 0 ? data.branch_id : undefined, {
          shouldDirty: false,
        })
      } else if (data.branch_id === undefined || data.branch_id === null || data.branch_id === 0) {
        setValue('branch_id', undefined, { shouldDirty: false })
      }
      if (data.block_id !== undefined && data.block_id !== current.block_id) {
        setValue('block_id', data.block_id > 0 ? data.block_id : undefined, {
          shouldDirty: false,
        })
      } else if (data.block_id === undefined || data.block_id === null || data.block_id === 0) {
        setValue('block_id', undefined, { shouldDirty: false })
      }
      if (data.department_id !== undefined && data.department_id !== current.department_id) {
        setValue('department_id', data.department_id > 0 ? data.department_id : undefined, {
          shouldDirty: false,
        })
      } else if (
        data.department_id === undefined ||
        data.department_id === null ||
        data.department_id === 0
      ) {
        setValue('department_id', undefined, { shouldDirty: false })
      }
      if (data.employee_id !== undefined && data.employee_id !== current.employee_id) {
        setValue('employee_id', data.employee_id > 0 ? data.employee_id : undefined, {
          shouldDirty: false,
        })
      } else if (
        data.employee_id === undefined ||
        data.employee_id === null ||
        data.employee_id === 0
      ) {
        setValue('employee_id', undefined, { shouldDirty: false })
      }
    },
    [setValue, getValues]
  )

  const selectedFormTypes = watch('form_type')
  const selectedDisplayStatuses = watch('display_status')

  const toggleArrayValue = (
    field: 'form_type' | 'display_status',
    value: string,
    checked: boolean
  ) => {
    const current = watch(field) || []
    if (checked) {
      setValue(field, [...current, value])
    } else {
      setValue(
        field,
        current.filter((v) => v !== value)
      )
    }
  }

  const onSubmit = async () => {
    // Submission orchestration owned by parent (useContractEvaluationFilter hook).
  }

  return (
    <Form onSubmit={onSubmit} handleSubmit={handleSubmit as any} loading={false}>
      <Flex direction="column" gap="5">
        <Grid columns={'1'} gap={'5'}>
          <FormController
            name="deadline_range"
            control={control}
            register={register}
            Field={DateRangePicker}
            fieldProps={{
              label: 'Hạn đề xuất',
              className: 'w-full',
              showQuickSelect: true,
            }}
          />
        </Grid>

        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            formKey === 0
              ? {
                  branch: initialValues?.branch_id?.toString(),
                  block: initialValues?.block_id?.toString(),
                  department: initialValues?.department_id?.toString(),
                  employee: initialValues?.employee_id?.toString(),
                }
              : undefined
          }
          onFormChange={handleCascadeChange}
          skipValidation
          showEmployee
          employeeLabel="Nhân viên"
          className={'gap-5'}
        />

        {formTypeOptions.length > 0 && (
          <div className="flex flex-col gap-3">
            <label className="typo-body-base-semibold text-content-dark-2">Loại phiếu</label>
            <div className="flex flex-wrap gap-2">
              {formTypeOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 py-1.5">
                  <Checkbox
                    className={'mr-0'}
                    checked={selectedFormTypes?.includes(option.value)}
                    onCheckedChange={(checked) =>
                      toggleArrayValue('form_type', option.value, Boolean(checked))
                    }
                  />
                  <span className="text-content-dark-1 text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2">Trạng thái</label>
          <div className="flex flex-wrap gap-2">
            {displayStatusOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-1 py-1.5">
                <Checkbox
                  className={'mr-0'}
                  checked={selectedDisplayStatuses?.includes(option.value)}
                  onCheckedChange={(checked) =>
                    toggleArrayValue('display_status', option.value, Boolean(checked))
                  }
                />
                <span className="text-content-dark-1 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Flex>
    </Form>
  )
})

ContractEvaluationFilterForm.displayName = 'ContractEvaluationFilterForm'

export default ContractEvaluationFilterForm
