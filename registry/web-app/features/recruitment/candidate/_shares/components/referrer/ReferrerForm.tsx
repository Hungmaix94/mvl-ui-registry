import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Form } from '@/components/ui'
import { useUpdateRecruitmentCandidateReferrer } from '@/services'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { QUERY_KEYS } from '@/constants'
import type { RecruitmentCandidate } from '@/services'
import { CascadeSelectGroupOrganization } from '../../../../../../components/commons/filters/CascadeSelectGroupOrganization.tsx'

const referrerSchema = z
  .object({
    branch_id: z.number().min(1, 'Vui lòng chọn chi nhánh'),
    block_id: z.number().min(1, 'Vui lòng chọn khối'),
    department_id: z.number().min(1, 'Vui lòng chọn phòng ban'),
    employee_id: z.number().min(1, 'Vui lòng chọn nhân viên giới thiệu'),
  })
  .refine(
    (data) => {
      return (
        data.branch_id > 0 && data.block_id > 0 && data.department_id > 0 && data.employee_id > 0
      )
    },
    {
      message: 'Vui lòng chọn đầy đủ Chi nhánh, Khối, Phòng ban và Nhân viên giới thiệu',
      path: ['employee_id'], // Show error on employee_id field
    }
  )

type ReferrerFormData = z.infer<typeof referrerSchema>

export interface ReferrerFormProps {
  candidate: RecruitmentCandidate
  mode: 'add' | 'edit'
  initialValues?: {
    branch_id?: number
    block_id?: number
    department_id?: number
    employee_id?: number
  }
}

export function ReferrerForm({ candidate, mode, initialValues }: ReferrerFormProps) {
  const { displayClose } = useDialog()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const updateReferrerMutation = useUpdateRecruitmentCandidateReferrer()
  const queryClient = useQueryClient()

  // Determine default values based on mode
  const getDefaultValues = () => {
    if (mode === 'edit' && initialValues) {
      return {
        branch_id: initialValues.branch_id || 0,
        block_id: initialValues.block_id || 0,
        department_id: initialValues.department_id || 0,
        employee_id: initialValues.employee_id || 0,
      }
    }

    // For add mode or when no initial values
    return {
      branch_id: 0,
      block_id: 0,
      department_id: 0,
      employee_id: 0,
    }
  }

  const form = useForm<ReferrerFormData>({
    resolver: zodResolver(referrerSchema),
    mode: 'onTouched',
    defaultValues: getDefaultValues(),
  })

  // Set initial values for cascade select
  const getCascadeInitialValues = () => {
    if (mode === 'edit' && initialValues) {
      return {
        branch: undefined, // Will be loaded from employee data
        block: undefined, // Will be loaded from employee data
        department: initialValues.department_id?.toString(),
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

  const handleCascadeFormChange = useCallback(
    (data: any) => {
      // Update form values when cascade select changes
      if (data.branch_id > 0) {
        form.setValue('branch_id', data.branch_id, { shouldDirty: false })
      }
      if (data.block_id > 0) {
        form.setValue('block_id', data.block_id, { shouldDirty: false })
      }
      if (data.department_id > 0) {
        form.setValue('department_id', data.department_id, { shouldDirty: false })
      }
      if (data.employee_id > 0) {
        form.setValue('employee_id', data.employee_id, { shouldDirty: false })
      }

      // Also handle clearing values (when values are 0)
      if (data.branch_id === 0) {
        form.setValue('branch_id', 0, { shouldDirty: false })
      }
      if (data.block_id === 0) {
        form.setValue('block_id', 0, { shouldDirty: false })
      }
      if (data.department_id === 0) {
        form.setValue('department_id', 0, { shouldDirty: false })
      }
      if (data.employee_id === 0) {
        form.setValue('employee_id', 0, { shouldDirty: false })
      }
    },
    [form]
  )

  const handleEmployeeSelect = useCallback(
    (employee: any) => {
      // When employee is selected, auto-fill branch/block/department in the form
      if (employee) {
        form.setValue('branch_id', employee.branch.id, { shouldDirty: false })
        form.setValue('block_id', employee.block.id, { shouldDirty: false })
        form.setValue('department_id', employee.department.id, { shouldDirty: false })
        form.setValue('employee_id', employee.id, { shouldDirty: false })
      }
    },
    [form]
  )

  const onSubmit = useCallback(
    async (data: ReferrerFormData) => {
      try {
        // Trigger validation for all fields
        const isValid = await form.trigger()

        if (!isValid) {
          return
        }

        // Additional validation: Ensure all fields have values
        if (
          data.branch_id <= 0 ||
          data.block_id <= 0 ||
          data.department_id <= 0 ||
          data.employee_id <= 0
        ) {
          return
        }

        await updateReferrerMutation.mutateAsync({
          id: candidate.id,
          data: { referrer_id: data.employee_id },
        })

        // Invalidate candidate detail query to refetch updated data
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.DETAIL(candidate.id),
        })

        // Show success message based on mode
        const successMessage =
          mode === 'add'
            ? 'Thêm người giới thiệu thành công'
            : 'Cập nhật người giới thiệu thành công'

        showSuccessToast(successMessage)
        displayClose()
      } catch (error) {
        // Show error message based on mode
        const errorMessage =
          mode === 'add'
            ? 'Có lỗi xảy ra khi thêm người giới thiệu'
            : 'Có lỗi xảy ra khi cập nhật người giới thiệu'

        showErrorToast(errorMessage)
      }
    },
    [
      form,
      candidate.id,
      updateReferrerMutation,
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

  // Get button text based on mode
  const getButtonText = () => {
    return mode === 'add' ? 'Thêm' : 'Cập nhật'
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Form<ReferrerFormData>
        handleSubmit={form.handleSubmit}
        onSubmit={onSubmit}
        loading={updateReferrerMutation.isPending}
      >
        <div className="flex flex-col gap-5 p-6 pb-4">
          {/* Cascade Select Group */}
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

        {/* Footer Actions */}
        <div className="border-border-1 mt-6 flex justify-end gap-4 border-t px-4 pt-4 pb-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={updateReferrerMutation.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={updateReferrerMutation.isPending}
            disabled={updateReferrerMutation.isPending}
            onClick={async () => {
              // Check if form has invalid values (should not submit if cascade fields are cleared)
              const currentValues = form.getValues()
              if (currentValues.department_id === 0 || currentValues.employee_id === 0) {
                return
              }

              // Force trigger validation to show errors on fields
              const isValid = await form.trigger()

              // Don't show toast - let errors display on fields
              if (!isValid) {
                // Errors will display on fields automatically
              }
            }}
          >
            {getButtonText()}
          </Button>
        </div>
      </Form>
    </div>
  )
}
