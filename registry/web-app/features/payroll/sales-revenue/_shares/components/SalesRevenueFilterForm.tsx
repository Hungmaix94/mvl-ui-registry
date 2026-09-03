import { useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import { parse, isValid } from 'date-fns'
import { MONTH_FORMAT } from '@/constants/date-format.ts'
import { RecoveryVoucherStatus } from '@/constants/api-schema-aliases'

export type SalesRevenueFilterFormRef = {
  clearForm: () => void
  getValues?: () => SalesRevenueFilterForm
  submitForm: () => void
}

type SalesRevenueFilterFormProps = {
  initialValues?: Record<string, any>
}

export type SalesRevenueFilterForm = {
  month?: Date
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  status?: RecoveryVoucherStatus
}

const Schema = z.object({
  month: z.date().nullable().optional(),
  branch_id: z.coerce.number().optional(),
  block_id: z.coerce.number().optional(),
  department_id: z.coerce.number().optional(),
  position_id: z.coerce.number().optional(),
  status: z.nativeEnum(RecoveryVoucherStatus).optional(),
})

// Helper function to normalize month value (can be Date or string)
const normalizeMonth = (month: unknown): Date | undefined => {
  if (!month) return undefined
  if (month instanceof Date) {
    return isValid(month) ? month : undefined
  }
  if (typeof month === 'string') {
    try {
      const parsed = parse(month, MONTH_FORMAT, new Date())
      return isValid(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

const SalesRevenueFilterForm = forwardRef<SalesRevenueFilterFormRef, SalesRevenueFilterFormProps>(
  ({ initialValues }, ref) => {
    const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
    const [formKey, setFormKey] = useState(0)

    const { control, handleSubmit, register, reset, getValues, setValue } =
      useForm<SalesRevenueFilterForm>({
        resolver: zodResolver(Schema) as any,
        defaultValues: {
          month: normalizeMonth(initialValues?.month),
          branch_id: initialValues?.branch_id || undefined,
          block_id: initialValues?.block_id || undefined,
          department_id: initialValues?.department_id || undefined,
          position_id: initialValues?.position_id || undefined,
          status: initialValues?.status || undefined,
        },
      })

    // Update form values when initialValues change
    useEffect(() => {
      if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
        reset({
          month: normalizeMonth(initialValues?.month),
          branch_id: initialValues?.branch_id || undefined,
          block_id: initialValues?.block_id || undefined,
          department_id: initialValues?.department_id || undefined,
          position_id: initialValues?.position_id || undefined,
          status: initialValues?.status || undefined,
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
              position_id: undefined,
              status: undefined,
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
          setValue('month', undefined, { shouldDirty: false, shouldValidate: false })
          setValue('branch_id', undefined, { shouldDirty: false, shouldValidate: false })
          setValue('block_id', undefined, { shouldDirty: false, shouldValidate: false })
          setValue('department_id', undefined, { shouldDirty: false, shouldValidate: false })
          setValue('position_id', undefined, { shouldDirty: false, shouldValidate: false })
          setValue('status', undefined, { shouldDirty: false, shouldValidate: false })
        },
        getValues: () => getValues(),
        submitForm: () => handleSubmit(onSubmit)(),
      }),
      [reset, setValue, getValues, handleSubmit]
    )

    const handleCascadeChange = (data: CascadeSelectFormData) => {
      setValue('branch_id', data.branch_id || undefined, {
        shouldDirty: false,
        shouldValidate: false,
      })
      setValue('block_id', data.block_id || undefined, {
        shouldDirty: false,
        shouldValidate: false,
      })
      setValue('department_id', data.department_id || undefined, {
        shouldDirty: false,
        shouldValidate: false,
      })
      setValue('position_id', data.position_id || undefined, {
        shouldDirty: false,
        shouldValidate: false,
      })
    }

    const onSubmit = (_data: SalesRevenueFilterForm) => {}

    const statusOptions = [
      {
        value: RecoveryVoucherStatus.CALCULATED,
        label: 'Đã tính lương',
      },
      {
        value: RecoveryVoucherStatus.NOT_CALCULATED,
        label: 'Chưa tính lương',
      },
    ]

    return (
      <>
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
                  label: 'Doanh thu tháng',
                  placeholder: 'Chọn doanh thu tháng',
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
                      position: initialValues?.position_id?.toString(),
                    }
                  : undefined
              }
              onFormChange={handleCascadeChange}
              skipValidation
              showEmployee={false}
              showPosition
              positionLabel="Chức vụ"
              className="gap-4"
            />

            <div className="flex flex-col gap-3">
              <FormController
                key={`status_${formKey}`}
                register={register}
                name="status"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Trạng thái',
                  required: false,
                  placeholder: 'Chọn trạng thái',
                  options: statusOptions,
                  enableSearch: false,
                  clearable: true,
                }}
              />
            </div>
          </Flex>
        </Form>
      </>
    )
  }
)

SalesRevenueFilterForm.displayName = 'SalesRevenueFilterForm'

export default SalesRevenueFilterForm
