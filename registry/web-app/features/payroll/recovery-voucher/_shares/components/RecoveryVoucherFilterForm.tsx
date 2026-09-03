import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { Checkbox } from '@/components/ui'
import { parse, isValid } from 'date-fns'
import useRecoveryVoucherOptions from '../hooks/useReceveryVoucherOptions.ts'
import { RecoveryVoucherStatus, RecoveryVoucherType } from '@/constants/api-schema-aliases'

export type RecoveryVoucherFilterFormRef = {
  clearForm: () => void
  getValues?: () => RecoveryVoucherFilterForm
  submitForm: () => void
}

export type RecoveryVoucherFilterForm = {
  month?: Date
  branch_id?: number
  block_id?: number
  department_id?: number
  voucher_types?: RecoveryVoucherType[]
  statuses?: RecoveryVoucherStatus[]
}

type RecoveryVoucherFilterFormProps = {
  initialValues?: Record<string, any>
}

const Schema = z.object({
  month: z.date().nullable().optional(),
  branch_id: z.coerce.number().optional(),
  block_id: z.coerce.number().optional(),
  department_id: z.coerce.number().optional(),
  voucher_types: z.array(z.nativeEnum(RecoveryVoucherType)).optional(),
  statuses: z.array(z.nativeEnum(RecoveryVoucherStatus)).optional(),
})

const normalizeMonth = (month: unknown): Date | undefined => {
  if (!month) return undefined
  if (month instanceof Date) {
    return isValid(month) ? month : undefined
  }
  if (typeof month === 'string') {
    try {
      const parsed = parse(month, 'MM/yyyy', new Date())
      return isValid(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

const RecoveryVoucherFilterForm = forwardRef<
  RecoveryVoucherFilterFormRef,
  RecoveryVoucherFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const [shouldResetToInitial, setShouldResetToInitial] = useState(true)
  const { voucherType, statusOptions } = useRecoveryVoucherOptions()

  const { control, handleSubmit, register, reset, getValues, setValue, watch } =
    useForm<RecoveryVoucherFilterForm>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        month: normalizeMonth(initialValues?.month),
        branch_id: initialValues?.branch_id || undefined,
        block_id: initialValues?.block_id || undefined,
        department_id: initialValues?.department_id || undefined,
        voucher_types: initialValues?.voucher_types || [],
        statuses: initialValues?.statuses || [],
      },
    })

  // Sync initial values
  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        month: normalizeMonth(initialValues?.month),
        branch_id: initialValues?.branch_id || undefined,
        block_id: initialValues?.block_id || undefined,
        department_id: initialValues?.department_id || undefined,
        voucher_types: initialValues?.voucher_types || [],
        statuses: initialValues?.statuses || [],
      })
    }
  }, [initialValues, reset, shouldResetToInitial])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        setFormKey((prev) => prev + 1)
        reset(
          {
            month: undefined,
            branch_id: undefined,
            block_id: undefined,
            department_id: undefined,
            voucher_types: [],
            statuses: [],
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
      },
      getValues: () => getValues(),
      submitForm: () => handleSubmit(onSubmit)(),
    }),
    [getValues, handleSubmit, reset]
  )

  const watchedVoucherTypes = watch('voucher_types') || []
  const watchedStatuses = watch('statuses') || []

  const handleCascadeChange = (data: CascadeSelectFormData) => {
    setValue('branch_id', data.branch_id || undefined, {
      shouldDirty: false,
      shouldValidate: false,
    })
    setValue('block_id', data.block_id || undefined, { shouldDirty: false, shouldValidate: false })
    setValue('department_id', data.department_id || undefined, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }

  const toggleVoucherType = (value: RecoveryVoucherType, checked: boolean) => {
    const current = watchedVoucherTypes
    const next = checked
      ? Array.from(new Set([...(current || []), value]))
      : (current || []).filter((item) => item !== value)
    setValue('voucher_types', next, { shouldDirty: false, shouldValidate: false })
  }

  const toggleStatus = (value: RecoveryVoucherStatus, checked: boolean) => {
    const current = watchedStatuses
    const next = checked
      ? Array.from(new Set([...(current || []), value]))
      : (current || []).filter((item) => item !== value)
    setValue('statuses', next, { shouldDirty: false, shouldValidate: false })
  }

  const onSubmit = (_data: RecoveryVoucherFilterForm) => {}

  return (
    <Form key={formKey} onSubmit={onSubmit} handleSubmit={handleSubmit as any} loading={false}>
      <Flex direction={'column'} gap={'4'}>
        <div className="flex flex-col gap-2 space-y-2">
          <FormController
            key={`month_${formKey}`}
            register={register}
            name="month"
            control={control}
            Field={MonthPicker}
            fieldProps={{
              label: 'Kỳ tính lương',
              placeholder: 'Chọn kỳ tính lương',
              showYear: true,
              onChange: (date: Date | undefined) => {
                setValue('month', date, {
                  shouldDirty: false,
                  shouldValidate: false,
                })
              },
            }}
          />
        </div>

        <CascadeSelectGroupOrganization
          initialValues={
            formKey === 0 && initialValues
              ? {
                  branch: initialValues?.branch_id?.toString(),
                  block: initialValues?.block_id?.toString(),
                  department: initialValues?.department_id?.toString(),
                }
              : undefined
          }
          onFormChange={handleCascadeChange}
          skipValidation
          showPosition={false}
          showEmployee={false}
          className="gap-4"
        />

        <div className="space-y-2">
          <label className="typo-body-base-semibold text-content-dark-2">Loại phiếu</label>
          <div className="flex flex-wrap gap-5">
            {voucherType.map((option) => (
              <label key={option.value} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  checked={watchedVoucherTypes?.includes(option.value)}
                  onCheckedChange={(checked: any) =>
                    toggleVoucherType(option.value, Boolean(checked))
                  }
                />
                <span className="text-content-dark-1 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="typo-body-base-semibold text-content-dark-2">Trạng thái</label>
          <div className="flex flex-wrap gap-5">
            {statusOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  checked={watchedStatuses?.includes(option.value)}
                  onCheckedChange={(checked: any) => toggleStatus(option.value, Boolean(checked))}
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

RecoveryVoucherFilterForm.displayName = 'RecoveryVoucherFilterForm'

export default RecoveryVoucherFilterForm
