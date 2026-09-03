import { useCallback, useImperativeHandle, forwardRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormController, TextArea, Form } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import type { EmployeeWorkHistory } from '@/features/employee/services/employee-work-history-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

// Hook to get date label based on event type using constants
function useWorkHistoryDateLabel(eventName: string | undefined): {
  dateLabel: string
  validationMessage: string
} {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.EMPLOYEE_WORK_HISTORY_EVENT_TYPE],
  })

  const eventTypeMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.EMPLOYEE_WORK_HISTORY_EVENT_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_WORK_HISTORY_EVENT_TYPE) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  const eventLabel = useMemo(() => {
    if (!eventName) return null
    return eventTypeMapping[eventName] || null
  }, [eventName, eventTypeMapping])

  const dateLabel = useMemo(() => {
    if (!eventLabel) return 'Ngày'
    return `Ngày ${eventLabel.toLowerCase()}`
  }, [eventLabel])

  const validationMessage = useMemo(() => {
    if (!eventLabel) return 'Vui lòng chọn ngày'
    return `Vui lòng chọn ngày ${eventLabel.toLowerCase()}`
  }, [eventLabel])

  return { dateLabel, validationMessage }
}

// Base schema type - will be customized per event type
type WorkHistoryEditFormData = {
  date: string
  branch_id: number
  block_id: number
  department_id: number
  position_id: number
  description?: string
}

type WorkHistoryEditFormProps = {
  initialData: EmployeeWorkHistory
  onSubmit: (data: WorkHistoryEditFormData) => Promise<void>
  onCancel: () => void
}

export type WorkHistoryEditFormRef = {
  submit: () => Promise<void>
}

const WorkHistoryEditForm = forwardRef<WorkHistoryEditFormRef, WorkHistoryEditFormProps>(
  ({ initialData, onSubmit }, ref) => {
    // Get date label and validation message from constants
    const { dateLabel, validationMessage } = useWorkHistoryDateLabel(initialData.name)

    // Create dynamic schema based on event type
    const workHistoryEditSchema = useMemo(
      () =>
        z.object({
          date: z.string().min(1, validationMessage),
          branch_id: z.number().min(1, 'Vui lòng chọn chi nhánh'),
          block_id: z.number().min(1, 'Vui lòng chọn khối'),
          department_id: z.number().min(1, 'Vui lòng chọn phòng ban'),
          position_id: z.number().min(1, 'Vui lòng chọn chức vụ'),
          description: z.string().max(100, 'Mô tả không được vượt quá 100 ký tự').optional(),
        }),
      [validationMessage]
    )

    const { register, control, handleSubmit, setValue } = useForm<WorkHistoryEditFormData>({
      resolver: zodResolver(workHistoryEditSchema),
      mode: 'onChange',
      defaultValues: {
        date: initialData.date ? format(new Date(initialData.date), DATE_FORMAT) : '',
        branch_id: initialData.branch?.id || 0,
        block_id: initialData.block?.id || 0,
        department_id: initialData.department?.id || 0,
        position_id: initialData.position?.id || 0,
        description: initialData.detail || '',
      },
    })

    // Handle cascade select change
    const handleCascadeChange = useCallback(
      (data: CascadeSelectFormData) => {
        if (data.branch_id > 0) {
          setValue('branch_id', data.branch_id, { shouldValidate: true })
        }
        if (data.block_id > 0) {
          setValue('block_id', data.block_id, { shouldValidate: true })
        }
        if (data.department_id && data.department_id > 0) {
          setValue('department_id', data.department_id, { shouldValidate: true })
        }
        if (data.position_id && data.position_id > 0) {
          setValue('position_id', data.position_id, { shouldValidate: true })
        }
      },
      [setValue]
    )

    const onFormSubmit = useCallback(
      async (data: WorkHistoryEditFormData) => {
        // TODO: Call API to update work history
        // await updateWorkHistory(initialData.id, {
        //   date: formatDateToApi(data.date),
        //   branch: data.branch_id,
        //   block: data.block_id,
        //   department: data.department_id,
        //   position: data.position_id,
        //   detail: data.description || '',
        // })
        await onSubmit(data)
      },
      [initialData.id, onSubmit]
    )

    // Expose submit method via ref
    useImperativeHandle(ref, () => ({
      submit: async () => {
        const isValid = await handleSubmit(onFormSubmit)()
        return isValid
      },
    }))

    return (
      <Form handleSubmit={handleSubmit} onSubmit={onFormSubmit} loading={false}>
        <div className="flex w-full flex-col gap-3">
          {/* Date field with dynamic label based on event type */}
          <FormController
            register={register}
            name="date"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: dateLabel,
              required: true,
              placeholder: DATE_FORMAT,
              allowManualInput: true,
            }}
          />

          {/* Cascade Select: Branch, Block, Department, Position */}
          <CascadeSelectGroupOrganization
            initialValues={{
              branch: initialData.branch?.id ? String(initialData.branch.id) : undefined,
              block: initialData.block?.id ? String(initialData.block.id) : undefined,
              department: initialData.department?.id
                ? String(initialData.department.id)
                : undefined,
              position: initialData.position?.id ? String(initialData.position.id) : undefined,
            }}
            onFormChange={handleCascadeChange}
            layout="grid"
            showEmployee={false}
            showPosition={true}
            positionLabel="Chức vụ"
            positionRequired={true}
            branchRequired
            blockRequired
            departmentRequired
            className="gap-3"
          />

          {/* Mô tả */}
          <FormController
            register={register}
            name="description"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Mô tả',
              placeholder: 'Nhập mô tả',
              maxCharacters: 100,
            }}
          />
        </div>
      </Form>
    )
  }
)

WorkHistoryEditForm.displayName = 'WorkHistoryEditForm'

export default WorkHistoryEditForm
