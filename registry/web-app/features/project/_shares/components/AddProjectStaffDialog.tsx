import { useCallback } from 'react'
import { Button, Select, FileUpload } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import { z } from 'zod'
import { useForm, FormProvider, Controller, SubmitHandler, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController'
import { PROJECT_ROLE_OPTIONS } from '../../sale-allocations/constants/sale-allocation-constants'
import { parse, isValid } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format'

export type AddProjectStaffDialogResult = {
  employee_id: number
  role: string
  effective_from: Date
  effective_to: Date | null
  employee_detail?: any
  attachment_tokens?: string[]
  attachment_keep_ids?: number[]
  attachments?: any[]
}

export type AddProjectStaffDialogProps = {
  onConfirm: (data: AddProjectStaffDialogResult) => void
  onCancel?: () => void
  initialData?: Partial<AddProjectStaffDialogResult>
  roleOptions?: { value: string; label: string }[]
  existingAssignments?: any[]
  editIndex?: number
}

const addStaffSchema = z.object({
  role: z.string().min(1, 'Vui lòng chọn vai trò'),
  employee_id: z.number({
    required_error: 'Vui lòng chọn nhân sự',
    invalid_type_error: 'Vui lòng chọn nhân sự',
  }),
  effective_from: z.date({ required_error: 'Vui lòng chọn ngày áp dụng' }),
  effective_to: z.date().nullable().optional(),
  employee_detail: z.any().optional(),
  attachment_tokens: z.array(z.string()).optional(),
  attachment_keep_ids: z.array(z.number()).optional(),
  attachments: z.array(z.any()).optional(),
})

type AddStaffFormValues = z.infer<typeof addStaffSchema>

const AddProjectStaffDialog = ({
  onConfirm,
  onCancel,
  initialData,
  roleOptions,
  existingAssignments,
  editIndex,
}: AddProjectStaffDialogProps) => {
  const { displayClose } = useDialog()

  const form = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      role: initialData?.role || '',
      employee_id: initialData?.employee_id || undefined,
      effective_from: initialData?.effective_from
        ? new Date(initialData.effective_from)
        : new Date(),
      effective_to: initialData?.effective_to ? new Date(initialData.effective_to) : null,
      employee_detail: initialData?.employee_detail || undefined,
      attachment_tokens: initialData?.attachment_tokens || [],
      attachment_keep_ids: initialData?.attachment_keep_ids || [],
      attachments: initialData?.attachments || [],
    },
  })

  const {
    handleSubmit,
    control,
    setValue,
    register,
    formState: { isSubmitting },
  } = form
  const effectiveFromDate = useWatch({ control, name: 'effective_from' })

  const onSubmit: SubmitHandler<AddStaffFormValues> = (data) => {
    if (existingAssignments) {
      const fromDateStr = data.effective_from.toISOString().split('T')[0]
      const isDuplicate = existingAssignments.some((item, idx) => {
        if (editIndex !== undefined && idx === editIndex) return false
        const itemDateStr = item.effective_from
          ? new Date(item.effective_from).toISOString().split('T')[0]
          : null
        return item.role === data.role && itemDateStr === fromDateStr
      })

      if (isDuplicate) {
        form.setError('effective_from', {
          type: 'manual',
          message: 'Vai trò này đã có cấu hình trong ngày hiệu lực này. Vui lòng chọn ngày khác.',
        })
        return
      }

      // Check date interval overlap for project_director and project_secretary roles
      if (data.role === 'project_director' || data.role === 'project_secretary') {
        const getLocalDateStr = (val: Date | string | null | undefined): string | null => {
          if (!val) return null
          if (val instanceof Date) {
            const y = val.getFullYear()
            const m = String(val.getMonth() + 1).padStart(2, '0')
            const d = String(val.getDate()).padStart(2, '0')
            return `${y}-${m}-${d}`
          }
          if (typeof val === 'string') {
            return val.substring(0, 10)
          }
          return null
        }

        const startAStr = getLocalDateStr(data.effective_from)
        const endAStr = getLocalDateStr(data.effective_to) || '9999-12-31'

        const isOverlap = existingAssignments.some((item, idx) => {
          if (editIndex !== undefined && idx === editIndex) return false
          if (item.role !== data.role) return false

          const startBStr = getLocalDateStr(item.effective_from)
          const endBStr = getLocalDateStr(item.effective_to) || '9999-12-31'

          return startAStr && startBStr && startAStr <= endBStr && startBStr <= endAStr
        })

        if (isOverlap) {
          form.setError('effective_from', {
            type: 'manual',
            message: `Thời gian hiệu lực của vai trò ${data.role === 'project_director' ? 'Giám đốc dự án' : 'Thư ký dự án'} bị trùng lặp với cấu hình khác.`,
          })
          return
        }
      }
    }

    onConfirm({
      role: data.role,
      employee_id: data.employee_id,
      effective_from: data.effective_from,
      effective_to: data.effective_to || null,
      employee_detail: data.employee_detail,
      attachments: data.attachments,
      attachment_tokens: data.attachment_tokens,
      attachment_keep_ids: data.attachment_keep_ids,
    })
    displayClose()
  }

  const handleCancel = useCallback(() => {
    onCancel?.()
    displayClose()
  }, [onCancel, displayClose])

  return (
    <div className="flex flex-col gap-4 p-4">
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormController<AddStaffFormValues, any>
            register={register}
            control={control}
            name="role"
            Field={Select}
            fieldProps={{
              label: 'Vai trò',
              placeholder: 'Chọn vai trò',
              options: roleOptions || PROJECT_ROLE_OPTIONS,
              required: true,
            }}
          />

          <div className="flex flex-col gap-2">
            <Controller
              control={control}
              name="employee_id"
              render={({ field, fieldState }) => (
                <EmployeeSelectWithDialog
                  label="Nhân sự"
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  onEntityChange={(entity) => {
                    setValue('employee_detail', entity)
                  }}
                  error={fieldState.error?.message}
                  required
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="effective_from"
            render={({ field, fieldState }) => (
              <DatePicker
                label="Ngày áp dụng"
                value={field.value}
                onChange={(val) => {
                  if (!val) {
                    field.onChange(new Date())
                    return
                  }
                  const parsed = parse(val, DATE_FORMAT, new Date())
                  field.onChange(isValid(parsed) ? parsed : new Date())
                }}
                error={fieldState.error?.message}
                required
              />
            )}
          />

          <Controller
            control={control}
            name="effective_to"
            render={({ field, fieldState }) => (
              <DatePicker
                label="Ngày kết thúc"
                value={field.value || undefined}
                onChange={(val) => {
                  if (!val) {
                    field.onChange(null)
                    return
                  }
                  const parsed = parse(val, DATE_FORMAT, new Date())
                  field.onChange(isValid(parsed) ? parsed : null)
                }}
                error={fieldState.error?.message}
                disabledDays={{ before: effectiveFromDate || new Date() }}
                clearable
              />
            )}
          />

          <div
            className="border-border-1 col-span-2 mt-4 border-t pt-4"
            data-field-name="attachment_tokens"
          >
            <Controller
              name="attachment_tokens"
              control={control as any}
              render={({ field, fieldState: { error } }) => (
                <FileUpload
                  value={field.value}
                  onChange={(v: string | string[]) =>
                    field.onChange(Array.isArray(v) ? v : v ? [v] : [])
                  }
                  label="Tài liệu đính kèm"
                  purpose="sales_allocation"
                  existingFiles={initialData?.attachments || []}
                  onKeptExistingIdsChange={(ids) => setValue('attachment_keep_ids', ids)}
                  disabled={isSubmitting}
                  required={false}
                  multiple
                  error={error?.message}
                />
              )}
            />
          </div>

          <div className="border-border-1 mt-6 flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary-border" onClick={handleCancel}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting || undefined}>
              Xác nhận
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

export default AddProjectStaffDialog
