import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Form } from '@/components/ui'
import { usePartialUpdateRecruitmentCandidate } from '@/features/recruitment/services/recruitment-candidate-service'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { QUERY_KEYS } from '@/constants'
import type { RecruitmentCandidate } from '@/features/recruitment/services/recruitment-candidate-service'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'

const contactPersonSchema = z
  .object({
    branch_id: z.number().min(1, 'Vui lòng chọn chi nhánh'),
    block_id: z.number().min(1, 'Vui lòng chọn khối'),
    department_id: z.number().min(1, 'Vui lòng chọn phòng ban'),
    employee_id: z.number().min(1, 'Vui lòng chọn nhân viên liên hệ'),
  })
  .refine(
    (data) =>
      data.branch_id > 0 && data.block_id > 0 && data.department_id > 0 && data.employee_id > 0,
    {
      message: 'Vui lòng chọn đầy đủ Chi nhánh, Khối, Phòng ban và Nhân viên liên hệ',
      path: ['employee_id'],
    }
  )

type ContactPersonFormData = z.infer<typeof contactPersonSchema>

export type ContactPersonFormProps = {
  candidate: RecruitmentCandidate
  mode: 'add' | 'edit'
  initialValues?: {
    branch_id?: number
    block_id?: number
    department_id?: number
    employee_id?: number
  }
}

export function ContactPersonForm({ candidate, mode, initialValues }: ContactPersonFormProps) {
  const { displayClose } = useDialog()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const partialUpdateMutation = usePartialUpdateRecruitmentCandidate()
  const queryClient = useQueryClient()

  const getDefaultValues = (): ContactPersonFormData => {
    if (mode === 'edit' && initialValues) {
      return {
        branch_id: initialValues.branch_id || 0,
        block_id: initialValues.block_id || 0,
        department_id: initialValues.department_id || 0,
        employee_id: initialValues.employee_id || 0,
      }
    }
    return {
      branch_id: 0,
      block_id: 0,
      department_id: 0,
      employee_id: 0,
    }
  }

  const form = useForm<ContactPersonFormData>({
    resolver: zodResolver(contactPersonSchema),
    mode: 'onTouched',
    defaultValues: getDefaultValues(),
  })

  const getCascadeInitialValues = () => {
    if (mode === 'edit' && initialValues) {
      return {
        branch: undefined,
        block: undefined,
        department: initialValues.department_id?.toString(),
        employee: initialValues.employee_id?.toString(),
      }
    }
    return {
      branch: undefined,
      block: undefined,
      department: undefined,
      employee: undefined,
    }
  }

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
    (employee: {
      id: number
      branch?: { id: number }
      block?: { id: number }
      department?: { id: number }
    }) => {
      if (employee) {
        form.setValue('branch_id', employee.branch?.id ?? 0, { shouldDirty: false })
        form.setValue('block_id', employee.block?.id ?? 0, { shouldDirty: false })
        form.setValue('department_id', employee.department?.id ?? 0, { shouldDirty: false })
        form.setValue('employee_id', employee.id, { shouldDirty: false })
      }
    },
    [form]
  )

  const onSubmit = useCallback(
    async (data: ContactPersonFormData) => {
      try {
        const isValid = await form.trigger()
        if (
          !isValid ||
          data.branch_id <= 0 ||
          data.block_id <= 0 ||
          data.department_id <= 0 ||
          data.employee_id <= 0
        ) {
          return
        }

        await partialUpdateMutation.mutateAsync({
          id: candidate.id,
          data: { contact_person_id: data.employee_id, force_save: false },
        })

        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.DETAIL(candidate.id),
        })

        const successMessage =
          mode === 'add' ? 'Thêm người liên hệ thành công' : 'Cập nhật người liên hệ thành công'
        showSuccessToast(successMessage)
        displayClose()
      } catch {
        const errorMessage =
          mode === 'add'
            ? 'Có lỗi xảy ra khi thêm người liên hệ'
            : 'Có lỗi xảy ra khi cập nhật người liên hệ'
        showErrorToast(errorMessage)
      }
    },
    [
      form,
      candidate.id,
      partialUpdateMutation,
      queryClient,
      showSuccessToast,
      showErrorToast,
      displayClose,
      mode,
    ]
  )

  const handleCancel = useCallback(() => {
    displayClose()
  }, [displayClose])

  const getButtonText = () => (mode === 'add' ? 'Thêm' : 'Cập nhật')

  return (
    <div className="flex w-full flex-col gap-5">
      <Form<ContactPersonFormData>
        handleSubmit={form.handleSubmit}
        onSubmit={onSubmit}
        loading={partialUpdateMutation.isPending}
      >
        <div className="flex flex-col gap-5 p-6 pb-4">
          <CascadeSelectGroupOrganization
            initialValues={getCascadeInitialValues()}
            onFormChange={handleCascadeFormChange}
            onEmployeeSelect={handleEmployeeSelect}
            showEmployee={true}
            layout="grid"
            formErrors={form.formState.errors}
            className="gap-5"
            skipValidation={true}
          />
        </div>
        <div className="border-border-1 mt-6 flex justify-end gap-4 border-t px-4 pt-4 pb-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={partialUpdateMutation.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={partialUpdateMutation.isPending}
            disabled={partialUpdateMutation.isPending}
            onClick={async () => {
              const currentValues = form.getValues()
              if (currentValues.department_id === 0 || currentValues.employee_id === 0) return
              await form.trigger()
            }}
          >
            {getButtonText()}
          </Button>
        </div>
      </Form>
    </div>
  )
}
