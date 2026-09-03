import { useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Form } from '@/components/ui'
import { useDialog } from '@/hooks/useDialog.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'

const referrerSchema = z
  .object({
    branch_id: z.number().min(1, 'Vui lòng chọn chi nhánh'),
    block_id: z.number().min(1, 'Vui lòng chọn khối'),
    department_id: z.number().min(1, 'Vui lòng chọn phòng ban'),
    employee_id: z.number().min(1, 'Vui lòng chọn nhân viên giới thiệu'),
  })
  .refine(
    (data) =>
      data.branch_id > 0 && data.block_id > 0 && data.department_id > 0 && data.employee_id > 0,
    {
      message: 'Vui lòng chọn đầy đủ Chi nhánh, Khối, Phòng ban và Nhân viên giới thiệu',
      path: ['employee_id'],
    }
  )

type ReferrerFormData = z.infer<typeof referrerSchema>

export type ReferrerFormFieldDialogSavePayload = {
  employee_id: number
  code: string
  fullname: string
  department_name: string
}

export type ReferrerFormFieldDialogInitialValues = {
  employee_id: number
  code?: string
  fullname?: string
  department_name?: string
}

type ReferrerFormFieldDialogProps = {
  mode?: 'add' | 'edit'
  initialValues?: ReferrerFormFieldDialogInitialValues
  onSave: (payload: ReferrerFormFieldDialogSavePayload) => void
}

type EmployeeForDisplay = {
  id: number
  code?: string
  fullname?: string
  department?: { name?: string }
}

export function ReferrerFormFieldDialog({
  mode = 'add',
  initialValues,
  onSave,
}: ReferrerFormFieldDialogProps) {
  const { displayClose } = useDialog()
  const selectedEmployeeRef = useRef<EmployeeForDisplay | null>(null)

  const form = useForm<ReferrerFormData>({
    resolver: zodResolver(referrerSchema),
    mode: 'onTouched',
    defaultValues: {
      branch_id: 0,
      block_id: 0,
      department_id: 0,
      employee_id: initialValues?.employee_id ?? 0,
    },
  })

  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      form.reset({
        branch_id: 0,
        block_id: 0,
        department_id: 0,
        employee_id: initialValues.employee_id,
      })
      selectedEmployeeRef.current = {
        id: initialValues.employee_id,
        code: initialValues.code,
        fullname: initialValues.fullname,
        department: { name: initialValues.department_name },
      }
    }
  }, [mode, initialValues, form])

  const handleCascadeFormChange = useCallback(
    (data: {
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
    (employee: EmployeeForDisplay & { branch?: any; block?: any; department?: any }) => {
      if (employee) {
        selectedEmployeeRef.current = employee
        form.setValue('branch_id', employee.branch?.id ?? 0, { shouldDirty: false })
        form.setValue('block_id', employee.block?.id ?? 0, { shouldDirty: false })
        form.setValue('department_id', employee.department?.id ?? 0, { shouldDirty: false })
        form.setValue('employee_id', employee.id, { shouldDirty: false })
      }
    },
    [form]
  )

  const onSubmit = useCallback(
    async (data: ReferrerFormData) => {
      const isValid = await form.trigger()
      if (!isValid || data.employee_id <= 0) return
      const emp = selectedEmployeeRef.current
      onSave({
        employee_id: data.employee_id,
        code: emp?.code ?? '',
        fullname: emp?.fullname ?? '',
        department_name: emp?.department?.name ?? '',
      })
      displayClose()
    },
    [form, onSave, displayClose]
  )

  const handleCancel = useCallback(() => {
    displayClose()
  }, [displayClose])

  return (
    <div className="flex w-full flex-col gap-5">
      <Form<ReferrerFormData> handleSubmit={form.handleSubmit} onSubmit={onSubmit} loading={false}>
        <div className="flex flex-col gap-5 p-6 pb-4">
          <CascadeSelectGroupOrganization
            initialValues={
              mode === 'edit' && initialValues?.employee_id
                ? { employee: initialValues.employee_id.toString() }
                : {}
            }
            onFormChange={handleCascadeFormChange}
            onEmployeeSelect={handleEmployeeSelect}
            showEmployee
            layout="grid"
            formErrors={form.formState.errors}
            className="gap-5"
            skipValidation
          />
        </div>
        <div className="border-border-1 mt-6 flex justify-end gap-4 border-t px-4 pt-4 pb-4">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary">
            {mode === 'edit' ? 'Cập nhật' : 'Thêm'}
          </Button>
        </div>
      </Form>
    </div>
  )
}
