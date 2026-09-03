import { useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Button, Form, TextField, TextArea } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'

const contactLogSchema = z.object({
  branch_id: z.number().min(1, 'Vui lòng chọn chi nhánh'),
  block_id: z.number().min(1, 'Vui lòng chọn khối'),
  department_id: z.number().min(1, 'Vui lòng chọn phòng ban'),
  employee_id: z.number().min(1, 'Vui lòng chọn người liên hệ'),
  date: z.string().min(1, 'Vui lòng chọn ngày'),
  method: z.string().min(1, 'Vui lòng nhập phương thức liên hệ').max(10),
  note: z.string().max(500).optional(),
})

type ContactLogFormData = z.infer<typeof contactLogSchema>

export type ContactLogFormFieldItem = {
  employee_id: number
  date: string
  method: string
  note?: string
}

export type ContactLogFormFieldDialogSavePayload = ContactLogFormFieldItem & {
  employee_name: string
}

type ContactLogFormFieldDialogProps = {
  initialValues?: ContactLogFormFieldItem & { employee_name?: string }
  onSave: (payload: ContactLogFormFieldDialogSavePayload) => void
  mode: 'add' | 'edit'
}

export function ContactLogFormFieldDialog({
  initialValues,
  onSave,
  mode,
}: ContactLogFormFieldDialogProps) {
  const { displayClose } = useDialog()
  const selectedEmployeeNameRef = useRef<string>(initialValues?.employee_name ?? '')

  useEffect(() => {
    if (initialValues?.employee_name) {
      selectedEmployeeNameRef.current = initialValues.employee_name
    }
  }, [initialValues?.employee_name])

  const form = useForm<ContactLogFormData>({
    resolver: zodResolver(contactLogSchema),
    mode: 'onTouched',
    defaultValues: {
      branch_id: 0,
      block_id: 0,
      department_id: 0,
      employee_id: initialValues?.employee_id ?? 0,
      date: initialValues?.date ?? format(new Date(), 'yyyy-MM-dd'),
      method: initialValues?.method ?? '',
      note: initialValues?.note ?? '',
    },
  })

  const handleCascadeFormChange = useCallback(
    async (data: {
      branch_id?: number
      block_id?: number
      department_id?: number
      employee_id?: number
    }) => {
      if (data.branch_id !== undefined)
        form.setValue('branch_id', data.branch_id, { shouldDirty: false })
      if (data.block_id !== undefined)
        form.setValue('block_id', data.block_id, { shouldDirty: false })
      if (data.department_id !== undefined)
        form.setValue('department_id', data.department_id, { shouldDirty: false })
      if (data.employee_id !== undefined)
        form.setValue('employee_id', data.employee_id, { shouldDirty: false })
    },
    [form]
  )

  const handleEmployeeSelect = useCallback(
    (employee: {
      id: number
      fullname?: string
      code?: string
      branch?: any
      block?: any
      department?: any
    }) => {
      if (employee) {
        selectedEmployeeNameRef.current = employee.fullname ?? employee.code ?? ''
        form.setValue('branch_id', employee.branch?.id ?? 0, { shouldDirty: false })
        form.setValue('block_id', employee.block?.id ?? 0, { shouldDirty: false })
        form.setValue('department_id', employee.department?.id ?? 0, { shouldDirty: false })
        form.setValue('employee_id', employee.id, { shouldDirty: false })
      }
    },
    [form]
  )

  const handleDateChange = useCallback(
    (date: string | null | undefined) => {
      if (date) form.setValue('date', format(date, 'yyyy-MM-dd'), { shouldDirty: true })
    },
    [form]
  )

  const onSubmit = useCallback(
    async (data: ContactLogFormData) => {
      const isValid = await form.trigger()
      if (!isValid || data.employee_id <= 0) return
      onSave({
        employee_id: data.employee_id,
        date: data.date,
        method: data.method,
        note: data.note,
        employee_name: selectedEmployeeNameRef.current,
      })
      displayClose()
    },
    [form, onSave, displayClose]
  )

  const handleCancel = useCallback(() => {
    displayClose()
  }, [displayClose])

  const methodValue = form.watch('method')
  const noteValue = form.watch('note')

  const getCascadeInitialValues = () => {
    if (mode === 'edit' && initialValues?.employee_id) {
      return { employee: initialValues.employee_id.toString() }
    }
    return {}
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Form<ContactLogFormData>
        handleSubmit={form.handleSubmit}
        onSubmit={onSubmit}
        loading={false}
      >
        <div className="flex flex-col gap-5 p-6 pb-4">
          <CascadeSelectGroupOrganization
            initialValues={getCascadeInitialValues()}
            onFormChange={handleCascadeFormChange}
            onEmployeeSelect={handleEmployeeSelect}
            showEmployee
            employeeLabel="Người liên hệ"
            layout="grid"
            formErrors={form.formState.errors}
            className="gap-5"
            excludePositionFromEmployeeQuery
            skipValidation={false}
          />
          <div className="gap-spect-1 flex flex-col">
            <DatePicker
              label="Chọn ngày"
              required
              value={form.watch('date') ? new Date(form.watch('date')) : null}
              onChange={handleDateChange}
              error={form.formState.errors.date?.message}
            />
          </div>
          <div className="gap-spect-1 flex flex-col">
            <TextField
              label="Phương thức liên hệ"
              placeholder="Nhập phương thức liên hệ"
              required
              maxLength={10}
              value={methodValue}
              onChange={(value) => {
                form.setValue('method', value, { shouldDirty: true, shouldValidate: true })
                if (value?.length > 0) form.clearErrors('method')
              }}
              error={form.formState.errors.method?.message}
              suffix={`${methodValue?.length || 0}/10`}
            />
          </div>
          <div className="gap-spect-1 flex flex-col">
            <TextArea
              label="Ghi chú"
              placeholder="Nhập ghi chú"
              maxCharacters={500}
              value={noteValue}
              onChange={(value) => form.setValue('note', value ?? '', { shouldDirty: true })}
              error={form.formState.errors.note?.message}
            />
          </div>
        </div>
        <div className="border-border-1 mt-6 flex justify-end gap-4 border-t px-4 pt-4 pb-4">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary">
            {mode === 'add' ? 'Thêm' : 'Cập nhật'}
          </Button>
        </div>
      </Form>
    </div>
  )
}
