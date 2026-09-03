import { forwardRef, useImperativeHandle, useCallback, useMemo, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormController } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { Chip, TextArea, Select } from '@/components/ui'
import type { Employee } from '@/features/employee/services/employee-service'
import type { EmployeeWorkHistory } from '@/features/employee/services/employee-work-history-service'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH } from '@/features/employee/management/_shares/constants/employee-actions.ts'
import { useRecruitmentCandidatePolicyProposal } from '@/features/recruitment/services/recruitment-candidate-service'
import { formatDate } from '@/utils/date-utils'
import { ColoredValueVariant, ContractNet_percentage } from '@/api/schema.ts'
import PolicyProposalCard from './PolicyProposalCard'

function parseContractNetPercentage(
  value: string | number | null | undefined
): ContractNet_percentage | undefined {
  if (value == null) return undefined
  const raw = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(raw)) return undefined

  // BE có thể trả decimal string; normalize về enum 85/100
  if (Math.abs(raw - 85) < 0.001) return ContractNet_percentage.Value85
  if (Math.abs(raw - 100) < 0.001) return ContractNet_percentage.Value100
  return undefined
}

type StartWorkingSubmitContext = {
  base_salary?: string | null
  effective_date?: string
  expiration_date?: string | null
  net_percentage?: ContractNet_percentage
}

type StartWorkingDialogProps = {
  employee: Employee
  initialData?: EmployeeWorkHistory
  onSubmit?: (
    data: StartWorkingFormData,
    setError: any,
    context: StartWorkingSubmitContext
  ) => Promise<void>
}

const startWorkingSchema = z.object({
  start_date: z.string().min(1, 'Ngày bắt đầu làm việc là bắt buộc'),
  description: z
    .string()
    .max(
      EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH,
      `Mô tả không được quá ${EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH} ký tự`
    )
    .optional(),
  branch_id: z.number({ required_error: 'Chọn chi nhánh' }).min(1, 'Chọn chi nhánh'),
  block_id: z.number({ required_error: 'Chọn khối' }).min(1, 'Chọn khối'),
  department_id: z.number({ required_error: 'Chọn phòng ban' }).min(1, 'Chọn phòng ban'),
  position_id: z.number({ required_error: 'Chọn chức vụ' }).min(1, 'Chọn chức vụ'),
  employee_type: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') {
        return ''
      }
      return String(val)
    },
    z
      .string({ required_error: 'Vui lòng chọn loại nhân viên' })
      .min(1, 'Vui lòng chọn loại nhân viên')
  ) as z.ZodType<string>,
})

export type StartWorkingFormData = z.infer<typeof startWorkingSchema>

export type StartWorkingDialogRef = {
  submit: () => Promise<void>
}

const StartWorkingDialog = forwardRef<StartWorkingDialogRef, StartWorkingDialogProps>(
  function StartWorkingDialog({ employee, initialData, onSubmit }, ref) {
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

    const recruitmentCandidateId = useMemo(() => {
      const candidateId = employee?.recruitment_candidate?.id ?? null
      return typeof candidateId === 'number' && Number.isFinite(candidateId) ? candidateId : null
    }, [employee])

    const { keysMapOptions } = useAppConstant({
      module: 'hrm',
      keys: [APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES],
    })

    const employeeTypeOptions = useMemo(() => {
      return keysMapOptions.has(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES) || []
        : []
    }, [keysMapOptions])

    const { data: policyProposal, isLoading: isLoadingPolicyProposal } =
      useRecruitmentCandidatePolicyProposal(recruitmentCandidateId ?? 0, {
        enabled: !!recruitmentCandidateId,
      })

    const proposalEmployeeTypeLabel = useMemo(() => {
      const v = policyProposal?.employee_type
      if (!v) return '-'
      const found = employeeTypeOptions.find((o) => String(o.value) === String(v))
      return found?.label ?? String(v)
    }, [employeeTypeOptions, policyProposal?.employee_type])

    const {
      control,
      register,
      handleSubmit,
      trigger,
      setValue,
      setError,
      setFocus,
      formState: { errors },
    } = useForm<StartWorkingFormData>({
      resolver: zodResolver(startWorkingSchema),
      defaultValues: {
        start_date: employee?.start_date ? formatDate(employee?.start_date) : '',
        description: initialData?.detail || '',
        branch_id: (initialData?.branch?.id || employee?.branch?.id) ?? 0,
        block_id: (initialData?.block?.id || employee?.block?.id) ?? 0,
        department_id: (initialData?.department?.id || employee?.department?.id) ?? 0,
        position_id: (initialData?.position?.id || employee?.position?.id) ?? 0,
        employee_type: undefined,
      },
      mode: 'onSubmit', // Only validate on submit, not on change or touch
    })

    // Handle cascade select changes and sync to form state
    const handleCascadeChange = useCallback(
      (data: CascadeSelectFormData) => {
        // Only validate if user has already attempted to submit
        setValue('branch_id', data.branch_id || 0, { shouldValidate: hasAttemptedSubmit })
        setValue('block_id', data.block_id || 0, { shouldValidate: hasAttemptedSubmit })
        setValue('department_id', data.department_id || 0, { shouldValidate: hasAttemptedSubmit })
        setValue('position_id', data.position_id || 0, { shouldValidate: hasAttemptedSubmit })
      },
      [setValue, hasAttemptedSubmit]
    )

    const cascadeInitialValues = useMemo(() => {
      if (recruitmentCandidateId && isLoadingPolicyProposal) {
        return
      }

      const branchId = policyProposal?.branch?.id ?? initialData?.branch?.id ?? employee?.branch?.id
      const blockId = policyProposal?.block?.id ?? initialData?.block?.id ?? employee?.block?.id
      const departmentId =
        policyProposal?.department?.id ?? initialData?.department?.id ?? employee?.department?.id
      const positionId = initialData?.position?.id ?? employee?.position?.id

      const hasAnyValue = branchId || blockId || departmentId || positionId

      if (hasAnyValue) {
        return {
          ...(branchId && { branch: branchId.toString() }),
          ...(blockId && { block: blockId.toString() }),
          ...(departmentId && { department: departmentId.toString() }),
          ...(positionId && { position: positionId.toString() }),
        }
      }
      return undefined
    }, [
      recruitmentCandidateId,
      isLoadingPolicyProposal,
      policyProposal?.branch?.id,
      policyProposal?.block?.id,
      policyProposal?.department?.id,
      initialData,
      employee,
    ])

    const handleFormSubmit = async (data: StartWorkingFormData) => {
      const netPercentage = parseContractNetPercentage(policyProposal?.base_salary_percentage)

      if (onSubmit) {
        await onSubmit(data, setError, {
          base_salary: policyProposal?.base_salary,
          effective_date: policyProposal?.policy_start_date
            ? formatDate(policyProposal.policy_start_date)
            : data.start_date,
          expiration_date: policyProposal?.policy_end_date
            ? formatDate(policyProposal.policy_end_date)
            : null,
          net_percentage: netPercentage,
        })
      }
    }

    useImperativeHandle(ref, () => ({
      submit: async () => {
        // Mark that user has attempted to submit - this will enable error display
        setHasAttemptedSubmit(true)

        // Trigger validation for all required fields
        // This will validate and show errors if validation fails
        const isValid = await trigger([
          'branch_id',
          'block_id',
          'department_id',
          'position_id',
          'start_date',
          'employee_type',
        ])

        if (!isValid) {
          // Validation failed, throw silent error to prevent dialog from closing
          // This error will be caught by GlobalDialog's handleConfirm to prevent closing
          // Errors will be displayed via formErrors prop passed to CascadeSelectGroupOrganization
          // The trigger() call above will populate errors.branch_id, errors.block_id, errors.department_id
          const validationError = new Error('Validation failed')
          ;(validationError as any).isValidationError = true
          throw validationError
        }

        // If validation passes, submit the form
        await handleSubmit(handleFormSubmit)()
      },
    }))

    useEffect(() => {
      setFocus('description')
    }, [setFocus])

    useEffect(() => {
      if (isLoadingPolicyProposal) {
        return
      }

      if (!employee?.start_date) {
        const startDate = policyProposal?.policy_start_date || employee?.start_date || ''
        setValue('start_date', startDate ? formatDate(startDate) : '')
      }

      const employeeType = policyProposal?.employee_type
      if (employeeType) {
        setValue('employee_type', employeeType)
      }
    }, [isLoadingPolicyProposal, policyProposal?.policy_start_date])

    useEffect(() => {
      if (isLoadingPolicyProposal || !policyProposal) {
        return
      }

      if (policyProposal.branch?.id) {
        setValue('branch_id', policyProposal.branch.id)
      }
      if (policyProposal.block?.id) {
        setValue('block_id', policyProposal.block.id)
      }
      if (policyProposal.department?.id) {
        setValue('department_id', policyProposal.department.id)
      }
    }, [
      isLoadingPolicyProposal,
      policyProposal?.branch?.id,
      policyProposal?.block?.id,
      policyProposal?.department?.id,
      setValue,
    ])

    const isReturnCandidate = employee?.recruitment_candidate?.is_return_candidate === true

    return (
      <div className="flex flex-col gap-4 p-6">
        {/* Returning-employee banner — phân biệt với TH tuyển mới */}
        {isReturnCandidate && (
          <div className="border-border-1 bg-background-2 flex items-center gap-3 rounded-md border p-3">
            <Chip label="Nhân viên quay lại" variant={ColoredValueVariant.BLUE} size="small" />
            <span className="text-content-dark-2 text-sm">
              Hồ sơ này được khôi phục từ ứng viên cũ — kiểm tra kỹ thông tin trước khi xác nhận.
            </span>
          </div>
        )}

        {/* Policy Proposal (Recruitment Candidate) */}
        <div className="flex flex-col gap-2">
          <p className="typo-body-base-semibold text-content-dark-2 mb-0">Đề xuất</p>
          <PolicyProposalCard
            recruitmentCandidateId={recruitmentCandidateId}
            isLoading={isLoadingPolicyProposal}
            policyProposal={policyProposal}
            employeeTypeLabel={proposalEmployeeTypeLabel}
          />
        </div>

        {/* Start Date */}
        <FormController
          register={register}
          name="start_date"
          control={control}
          Field={DatePicker}
          fieldProps={{
            label: 'Ngày bắt đầu làm việc',
            required: true,
            placeholder: 'DD/MM/YYYY',
            allowManualInput: true,
          }}
        />

        {/* Organization Selection */}
        <CascadeSelectGroupOrganization
          initialValues={cascadeInitialValues}
          onFormChange={handleCascadeChange}
          showEmployee={false}
          showPosition={true}
          showDepartment={true}
          layout="grid"
          skipValidation={!hasAttemptedSubmit}
          branchRequired={true}
          blockRequired={true}
          departmentRequired={true}
          positionRequired={true}
          className={'gap-4'}
          formErrors={{
            branch_id: { message: errors?.branch_id?.message },
            block_id: { message: errors?.block_id?.message },
            department_id: { message: errors?.department_id?.message },
            position_id: { message: errors?.position_id?.message },
          }}
        />

        {/* Employee Type */}
        <FormController
          register={register}
          name="employee_type"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Loại nhân viên',
            required: true,
            placeholder: 'Chọn loại nhân viên',
            options: employeeTypeOptions,
            onChange: async (value: string | number | null) => {
              setValue('employee_type', value as string, {
                shouldValidate: hasAttemptedSubmit,
              })
              if (hasAttemptedSubmit) {
                await trigger('employee_type')
              }
            },
          }}
        />

        {/* Description */}
        <FormController
          register={register}
          name="description"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Mô tả',
            placeholder: 'Nhập mô tả',
            maxCharacters: EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH,
            showCharacterCount: true,
            rows: 4,
          }}
        />
      </div>
    )
  }
)

export default StartWorkingDialog
