import { forwardRef, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormController } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { Select, TextArea } from '@/components/ui'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { usePositionSelect } from '@/hooks/usePositionSelect.ts'
import type { Employee } from '@/features/employee/services/employee-service'
import { EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH } from '@/features/employee/management/_shares/constants/employee-actions.ts'

const transferSchema = z.object({
  date: z.string().min(1, 'Ngày hiệu lực là bắt buộc'),
  department_id: z.number().positive('Vui lòng chọn phòng ban đích'),
  position_id: z.number().positive('Vui lòng chọn chức vụ đích'),
  note: z
    .string()
    .max(
      EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH,
      `Ghi chú không được quá ${EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH} ký tự`
    )
    .optional(),
})

export type TransferEmployeeFormData = z.infer<typeof transferSchema>

export type TransferEmployeeActionDialogRef = {
  submit: () => Promise<void>
}

type TransferEmployeeActionDialogProps = {
  employee: Employee
  onSubmit: (data: TransferEmployeeFormData) => Promise<void>
}

const TransferEmployeeActionDialog = forwardRef<
  TransferEmployeeActionDialogRef,
  TransferEmployeeActionDialogProps
>(function TransferEmployeeActionDialog({ employee, onSubmit }, ref) {
  const { loadPositionOptions, loadInitialPositionOptions } = usePositionSelect()
  const [, setDepartmentId] = useState<number | undefined>(undefined)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<TransferEmployeeFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: '',
      department_id: undefined,
      position_id: employee.position.id,
      note: '',
    },
    mode: 'onTouched',
  })

  const handleFormSubmit = async (data: TransferEmployeeFormData) => {
    await onSubmit(data)
  }

  useImperativeHandle(ref, () => ({
    submit: async () => {
      const isValid = await trigger()
      if (!isValid) {
        const validationError = new Error('Validation failed')
        ;(validationError as any).isValidationError = true
        throw validationError
      }
      await handleSubmit(handleFormSubmit)()
    },
  }))

  return (
    <div className="flex flex-col gap-5 p-6">
      <FormController
        register={register}
        name="date"
        control={control}
        Field={DatePicker}
        fieldProps={{ label: 'Ngày hiệu lực', required: true, placeholder: 'DD/MM/YYYY' }}
      />

      <CascadeSelectGroupOrganization
        showEmployee={false}
        showPosition={false}
        showBlock
        showDepartment
        branchRequired
        blockRequired
        departmentRequired
        departmentLabel="Phòng ban đích"
        skipValidation
        formErrors={{ department_id: errors.department_id }}
        onFormChange={(data) => {
          const departmentId =
            data.department_id && data.department_id > 0 ? data.department_id : undefined
          setDepartmentId(departmentId)
          setValue('department_id', departmentId as unknown as number, { shouldValidate: true })
        }}
      />

      <FormController
        register={register}
        name="position_id"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Chức vụ đích',
          required: true,
          placeholder: 'Nhập/chọn chức vụ',
          loadOptions: loadPositionOptions,
          loadInitialOptions: loadInitialPositionOptions,
          enableSearch: true,
          searchPlaceholder: 'Tìm kiếm chức vụ...',
        }}
      />

      <FormController
        register={register}
        name="note"
        control={control}
        Field={TextArea}
        fieldProps={{
          label: 'Ghi chú',
          placeholder: 'Nhập ghi chú',
          maxCharacters: EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH,
          showCharacterCount: true,
          rows: 4,
        }}
      />
    </div>
  )
})

export default TransferEmployeeActionDialog
