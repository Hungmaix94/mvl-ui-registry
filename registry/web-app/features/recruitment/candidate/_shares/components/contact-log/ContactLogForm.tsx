import { useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Button, Form, TextField, TextArea } from '@/components/ui'
import {
  useCreateRecruitmentCandidateContactLog,
  useUpdateRecruitmentCandidateContactLog,
} from '@/services'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import type { RecruitmentCandidate } from '@/services'
import { CascadeSelectGroupOrganization } from '../../../../../../components/commons/filters/CascadeSelectGroupOrganization.tsx'
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

interface ContactLogFormProps {
  candidate: RecruitmentCandidate
  mode?: 'add' | 'edit'
  initialValues?: {
    id?: number
    employee_id?: number
    date?: string
    method?: string
    note?: string
  }
}

export function ContactLogForm({ candidate, mode = 'add', initialValues }: ContactLogFormProps) {
  const { displayClose } = useDialog()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const createContactLogMutation = useCreateRecruitmentCandidateContactLog()
  const updateContactLogMutation = useUpdateRecruitmentCandidateContactLog()
  const queryClient = useQueryClient()

  // Track if form has been submitted at least once - only show errors after first submit attempt
  const hasSubmittedRef = useRef(false)

  const form = useForm<ContactLogFormData>({
    resolver: zodResolver(contactLogSchema),
    mode: 'onTouched',
    defaultValues: {
      branch_id: 0,
      block_id: 0,
      department_id: 0,
      employee_id: initialValues?.employee_id || 0,
      date: initialValues?.date || format(new Date(), 'yyyy-MM-dd'),
      method: initialValues?.method || '',
      note: initialValues?.note || '',
    },
  })

  const handleCascadeFormChange = useCallback(
    async (data: any) => {
      // Update form values when cascade select changes
      const fieldsToValidate: (keyof ContactLogFormData)[] = []

      if (data.branch_id > 0) {
        form.clearErrors('branch_id')
        form.setValue('branch_id', data.branch_id, {
          shouldDirty: false,
          shouldValidate: true,
          shouldTouch: true,
        })
        fieldsToValidate.push('branch_id')
      }
      if (data.block_id > 0) {
        form.clearErrors('block_id')
        form.setValue('block_id', data.block_id, {
          shouldDirty: false,
          shouldValidate: true,
          shouldTouch: true,
        })
        fieldsToValidate.push('block_id')
      }
      if (data.department_id > 0) {
        form.clearErrors('department_id')
        form.setValue('department_id', data.department_id, {
          shouldDirty: false,
          shouldValidate: true,
          shouldTouch: true,
        })
        fieldsToValidate.push('department_id')
      }
      if (data.employee_id > 0) {
        form.clearErrors('employee_id')
        form.setValue('employee_id', data.employee_id, {
          shouldDirty: false,
          shouldValidate: true,
          shouldTouch: true,
        })
        fieldsToValidate.push('employee_id')
      }

      // Trigger validation for updated fields to ensure errors are cleared
      if (fieldsToValidate.length > 0) {
        await form.trigger(fieldsToValidate)
      }

      // Also handle clearing values (when values are 0)
      // Only touch fields if form has been submitted at least once (to avoid showing errors on initial mount)
      const shouldTouch = hasSubmittedRef.current
      if (data.branch_id === 0) {
        form.setValue('branch_id', 0, {
          shouldDirty: false,
          shouldValidate: shouldTouch,
          shouldTouch: shouldTouch,
        })
      }
      if (data.block_id === 0) {
        form.setValue('block_id', 0, {
          shouldDirty: false,
          shouldValidate: shouldTouch,
          shouldTouch: shouldTouch,
        })
      }
      if (data.department_id === 0) {
        form.setValue('department_id', 0, {
          shouldDirty: false,
          shouldValidate: shouldTouch,
          shouldTouch: shouldTouch,
        })
      }
      if (data.employee_id === 0) {
        form.setValue('employee_id', 0, {
          shouldDirty: false,
          shouldValidate: shouldTouch,
          shouldTouch: shouldTouch,
        })
      }
    },
    [form]
  )

  const handleEmployeeSelect = useCallback(
    async (employee: any) => {
      // When employee is selected, auto-fill branch/block/department in the form
      if (employee) {
        // Clear errors first before setting values
        form.clearErrors(['branch_id', 'block_id', 'department_id', 'employee_id'])
        form.setValue('branch_id', employee.branch.id, {
          shouldDirty: false,
          shouldValidate: true,
          shouldTouch: true,
        })
        form.setValue('block_id', employee.block.id, {
          shouldDirty: false,
          shouldValidate: true,
          shouldTouch: true,
        })
        form.setValue('department_id', employee.department.id, {
          shouldDirty: false,
          shouldValidate: true,
          shouldTouch: true,
        })
        form.setValue('employee_id', employee.id, {
          shouldDirty: false,
          shouldValidate: true,
          shouldTouch: true,
        })
        // Trigger validation for all cascade fields to ensure errors are cleared
        await form.trigger(['branch_id', 'block_id', 'department_id', 'employee_id'])
      }
    },
    [form]
  )

  // Set initial values for cascade select
  const getCascadeInitialValues = () => {
    if (mode === 'edit' && initialValues?.employee_id) {
      return {
        branch: undefined, // Will be loaded from employee data
        block: undefined, // Will be loaded from employee data
        department: undefined, // Will be loaded from employee data
        employee: initialValues.employee_id?.toString(),
      }
    }

    // For add mode
    return {
      branch: undefined,
      block: undefined,
      department: undefined,
      employee: undefined,
    }
  }

  const onSubmit = useCallback(
    async (data: ContactLogFormData) => {
      // Mark that form has been submitted at least once - from now on, errors should be shown
      hasSubmittedRef.current = true

      try {
        // Additional validation: Ensure all cascade fields have values
        if (
          data.branch_id <= 0 ||
          data.block_id <= 0 ||
          data.department_id <= 0 ||
          data.employee_id <= 0
        ) {
          showErrorToast(
            'Vui lòng chọn đầy đủ thông tin chi nhánh, khối, phòng ban và người liên hệ'
          )
          return
        }

        const payload = {
          employee_id: data.employee_id,
          date: data.date,
          method: data.method,
          note: data.note || undefined,
          recruitment_candidate_id: candidate.id,
        }

        if (mode === 'edit' && initialValues?.id) {
          // Update existing contact log
          await updateContactLogMutation.mutateAsync({
            id: initialValues.id,
            data: payload,
          })
        } else {
          // Create new contact log
          await createContactLogMutation.mutateAsync(payload)
        }

        // Invalidate contact logs query to refetch updated data
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.RECRUITMENT_CANDIDATE_CONTACT_LOGS.LIST({
            recruitment_candidate: candidate.id,
          }),
        })

        // Show success message based on mode
        const successMessage =
          mode === 'add' ? 'Thêm lần liên hệ thành công' : 'Cập nhật lần liên hệ thành công'
        showSuccessToast(successMessage)
        displayClose()
      } catch (error) {
        // Show error message based on mode
        const errorMessage =
          mode === 'add'
            ? 'Có lỗi xảy ra khi thêm lần liên hệ'
            : 'Có lỗi xảy ra khi cập nhật lần liên hệ'
        showErrorToast(errorMessage)
      }
    },
    [
      candidate.id,
      createContactLogMutation,
      updateContactLogMutation,
      queryClient,
      showSuccessToast,
      showErrorToast,
      displayClose,
      mode,
      initialValues?.id,
    ]
  )

  const handleCancel = useCallback(() => {
    displayClose()
  }, [displayClose])

  const handleDateChange = useCallback(
    (date: string | null | undefined) => {
      if (date) {
        form.setValue('date', format(date, 'yyyy-MM-dd'), { shouldDirty: true })
      }
    },
    [form]
  )

  const methodValue = form.watch('method')
  const noteValue = form.watch('note')

  const isLoading =
    mode === 'add' ? createContactLogMutation.isPending : updateContactLogMutation.isPending

  return (
    <div className="flex w-full flex-col gap-5">
      <Form<ContactLogFormData>
        handleSubmit={form.handleSubmit}
        onSubmit={onSubmit}
        loading={isLoading}
      >
        <div className="flex flex-col gap-5 p-6 pb-4">
          {/* Cascade Select Group for Organization Selection */}
          <CascadeSelectGroupOrganization
            initialValues={getCascadeInitialValues()}
            onFormChange={handleCascadeFormChange}
            onEmployeeSelect={handleEmployeeSelect}
            showEmployee={true}
            employeeLabel="Người liên hệ"
            layout="grid"
            formErrors={form.formState.errors}
            className="gap-5"
            excludePositionFromEmployeeQuery={true}
            skipValidation={false}
          />

          {/* Contact Date */}
          <div className="gap-spect-1 flex flex-col">
            <DatePicker
              label="Chọn ngày"
              required
              value={form.watch('date') ? new Date(form.watch('date')) : null}
              onChange={handleDateChange}
              error={form.formState.errors.date?.message}
            />
          </div>

          {/* Contact Method */}
          <div className="gap-spect-1 flex flex-col">
            <TextField
              label="Phương thức liên hệ"
              placeholder="Nhập phương thức liên hệ"
              required
              maxLength={10}
              value={methodValue}
              onChange={(value) => {
                form.setValue('method', value, { shouldDirty: true, shouldValidate: true })
                if (value && value.length > 0) {
                  form.clearErrors('method')
                }
              }}
              error={form.formState.errors.method?.message}
              suffix={`${methodValue?.length || 0}/10`}
            />
          </div>

          {/* Notes */}
          <div className="gap-spect-1 flex flex-col">
            <TextArea
              label="Ghi chú"
              placeholder="Nhập ghi chú"
              maxCharacters={500}
              value={noteValue}
              onChange={(value) => form.setValue('note', value, { shouldDirty: true })}
              error={form.formState.errors.note?.message}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-border-1 mt-6 flex justify-end gap-4 border-t px-4 pt-4 pb-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={
              mode === 'add'
                ? createContactLogMutation.isPending
                : updateContactLogMutation.isPending
            }
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={
              mode === 'add'
                ? createContactLogMutation.isPending
                : updateContactLogMutation.isPending
            }
            disabled={
              mode === 'add'
                ? createContactLogMutation.isPending
                : updateContactLogMutation.isPending
            }
          >
            {mode === 'add' ? 'Thêm' : 'Cập nhật'}
          </Button>
        </div>
      </Form>
    </div>
  )
}
