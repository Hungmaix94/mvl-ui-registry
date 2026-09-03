import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Checkbox, Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'

export type ProposalsFilterFormRef = {
  clearForm: () => void
  getValues?: () => ProposalsFilterFormValues
  getRawValues?: () => ProposalsFilterFormValues
}

type ProposalsFilterFormProps = {
  initialValues?: Record<string, any>
  showProposalType?: boolean
  /** When false, hide "Trạng thái xác nhận" (verifier status) filter. Default true. */
  showVerifierStatus?: boolean
  /** Proposal type values to exclude from the "Loại đề xuất" options (e.g. ['asset_allocation']). */
  excludeProposalTypes?: string[]
  /** When true, show "Ngày làm thêm giờ (OT)" date range (overtime-work list only). Default false. */
  showOvertimeDateRange?: boolean
  /** When true, show "Trạng thái điều chuyển" single-select (bulk job-transfer list only). Default false. */
  showTransferStatus?: boolean
}

type TDateRange = {
  from?: Date
  to?: Date
}

export type ProposalsFilterFormValues = {
  date_range?: TDateRange | null
  overtime_date_range?: TDateRange | null
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  employee_id?: number
  status?: string[]
  proposal_type?: string[]
  verifier_status?: string[]
  transfer_status?: string
}

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position_id: z.number().optional(),
  employee_id: z.number().optional(),
  status: z.array(z.string()).optional(),
  proposal_type: z.array(z.string()).optional(),
  verifier_status: z.array(z.string()).optional(),
  transfer_status: z.string().optional(),
  date_range: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  overtime_date_range: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
})

const ProposalsFilterForm = forwardRef<ProposalsFilterFormRef, ProposalsFilterFormProps>(
  (
    {
      initialValues,
      showProposalType = false,
      showVerifierStatus = true,
      excludeProposalTypes,
      showOvertimeDateRange = false,
      showTransferStatus = false,
    },
    ref
  ) => {
    const { keysMapOptions } = useAppConstant({
      module: 'hrm',
      keys: [
        APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES,
        APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE,
        ...(showVerifierStatus ? [APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES] : []),
        ...(showTransferStatus
          ? [APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES]
          : []),
      ],
    })

    const statusOptions = useMemo(
      () =>
        keysMapOptions.has(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES)
          ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES) || []
          : [],
      [keysMapOptions]
    )

    const proposalTypeOptions = useMemo(() => {
      const raw = keysMapOptions.has(APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE) || []
        : []
      if (!excludeProposalTypes?.length) return raw
      const excludeSet = new Set(excludeProposalTypes)
      return raw.filter((opt: { value: string }) => !excludeSet.has(opt.value))
    }, [keysMapOptions, excludeProposalTypes])

    const verifierStatusOptions = useMemo(
      () =>
        showVerifierStatus &&
        keysMapOptions.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES)
          ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES) || []
          : [],
      [keysMapOptions, showVerifierStatus]
    )

    const transferStatusOptions = useMemo(
      () =>
        showTransferStatus &&
        keysMapOptions.has(APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES)
          ? keysMapOptions.get(
              APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES
            ) || []
          : [],
      [keysMapOptions, showTransferStatus]
    )

    const { control, reset, getValues, handleSubmit, watch, setValue, register } =
      useForm<ProposalsFilterFormValues>({
        resolver: zodResolver(Schema) as any,
        defaultValues: {
          branch_id: initialValues?.branch_id,
          block_id: initialValues?.block_id,
          department_id: initialValues?.department_id,
          position_id: initialValues?.position_id,
          employee_id: initialValues?.employee_id,
          status: initialValues?.status || [],
          proposal_type: initialValues?.proposal_type || [],
          verifier_status: initialValues?.verifier_status || [],
          transfer_status: initialValues?.transfer_status || undefined,
          date_range: initialValues?.date_range || null,
          overtime_date_range: initialValues?.overtime_date_range || null,
        },
      })

    const [formKey, setFormKey] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    // expose các hàm public ra ngoài
    useImperativeHandle(ref, () => ({
      clearForm: () => {
        reset(
          {
            branch_id: undefined,
            block_id: undefined,
            department_id: undefined,
            position_id: undefined,
            employee_id: undefined,
            status: [],
            proposal_type: [],
            verifier_status: [],
            transfer_status: undefined,
            date_range: null,
            overtime_date_range: null,
          },
          {
            keepDefaultValues: false,
          }
        )
        setFormKey((prev) => prev + 1)
      },
      getRawValues: () => {
        return getValues()
      },
      getValues: () => {
        // This method is used internally by the form, the actual API params conversion
        // is handled in useProposalFilter hook's onClickApply
        return getValues()
      },
    }))

    // Khi người dùng chọn branch/block/department/position/employee
    const handleCascadeChange = useCallback(
      (data: any) => {
        const current = getValues()

        // Handle branch_id - set value if changed, or clear if undefined/null/0
        if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
          setValue('branch_id', data.branch_id > 0 ? data.branch_id : undefined, {
            shouldDirty: false,
          })
          // If branch is cleared, clear all dependent fields
          if (!data.branch_id || data.branch_id === 0) {
            setValue('block_id', undefined, { shouldDirty: false })
            setValue('department_id', undefined, { shouldDirty: false })
            setValue('position_id', undefined, { shouldDirty: false })
            setValue('employee_id', undefined, { shouldDirty: false })
          }
        } else if (
          data.branch_id === undefined ||
          data.branch_id === null ||
          data.branch_id === 0
        ) {
          // Clear branch_id if it was cleared
          setValue('branch_id', undefined, { shouldDirty: false })
        }

        // Handle block_id - set value if changed, or clear if undefined/null/0
        if (data.block_id !== undefined && data.block_id !== current.block_id) {
          setValue('block_id', data.block_id > 0 ? data.block_id : undefined, {
            shouldDirty: false,
          })
          // If block is cleared, clear dependent fields
          if (!data.block_id || data.block_id === 0) {
            setValue('department_id', undefined, { shouldDirty: false })
            setValue('position_id', undefined, { shouldDirty: false })
            setValue('employee_id', undefined, { shouldDirty: false })
          }
        } else if (data.block_id === undefined || data.block_id === null || data.block_id === 0) {
          // Clear block_id if it was cleared
          setValue('block_id', undefined, { shouldDirty: false })
        }

        // Handle department_id - set value if changed, or clear if undefined/null/0
        if (data.department_id !== undefined && data.department_id !== current.department_id) {
          setValue('department_id', data.department_id > 0 ? data.department_id : undefined, {
            shouldDirty: false,
          })
          // If department is cleared, clear dependent fields
          if (!data.department_id || data.department_id === 0) {
            setValue('position_id', undefined, { shouldDirty: false })
            setValue('employee_id', undefined, { shouldDirty: false })
          }
        } else if (
          data.department_id === undefined ||
          data.department_id === null ||
          data.department_id === 0
        ) {
          // Clear department_id if it was cleared
          setValue('department_id', undefined, { shouldDirty: false })
        }

        // Handle position_id - set value if changed, or clear if undefined/null/0
        if (data.position_id !== undefined && data.position_id !== current.position_id) {
          setValue('position_id', data.position_id > 0 ? data.position_id : undefined, {
            shouldDirty: false,
          })
        } else if (
          data.position_id === undefined ||
          data.position_id === null ||
          data.position_id === 0
        ) {
          // Clear position_id if it was cleared
          setValue('position_id', undefined, { shouldDirty: false })
        }

        // Handle employee_id - set value if changed, or clear if undefined/null/0
        if (data.employee_id !== undefined && data.employee_id !== current.employee_id) {
          setValue('employee_id', data.employee_id > 0 ? data.employee_id : undefined, {
            shouldDirty: false,
          })
        } else if (
          data.employee_id === undefined ||
          data.employee_id === null ||
          data.employee_id === 0
        ) {
          // Clear employee_id if it was cleared
          setValue('employee_id', undefined, { shouldDirty: false })
        }
      },
      [setValue, getValues]
    )

    const selectedStatuses = watch('status')
    const selectedVerifierStatuses = watch('verifier_status')

    const handleStatusChange = (value: string, checked: boolean) => {
      const current = watch('status') || []
      if (checked) {
        setValue('status', [...current, value])
      } else {
        setValue(
          'status',
          current.filter((v) => v !== value)
        )
      }
    }

    const handleVerifierStatusChange = (value: string, checked: boolean) => {
      const current = watch('verifier_status') || []
      if (checked) {
        setValue('verifier_status', [...current, value])
      } else {
        setValue(
          'verifier_status',
          current.filter((v) => v !== value)
        )
      }
    }

    const onSubmit = async (_data: ProposalsFilterFormValues) => {
      setIsLoading(true)
      try {
        // Form submission is handled by parent component
      } finally {
        setIsLoading(false)
      }
    }

    return (
      <Form onSubmit={onSubmit} handleSubmit={handleSubmit as any} loading={isLoading}>
        <Flex direction="column" gap="5">
          {/* CascadeSelectGroupOrganization */}
          <CascadeSelectGroupOrganization
            key={formKey}
            initialValues={
              formKey === 0
                ? {
                    branch: initialValues?.branch_id?.toString(),
                    block: initialValues?.block_id?.toString(),
                    department: initialValues?.department_id?.toString(),
                    position: initialValues?.position_id?.toString(),
                    employee: initialValues?.employee_id?.toString(),
                  }
                : undefined
            }
            onFormChange={handleCascadeChange}
            skipValidation
            showEmployee
            showPosition
            positionLabel="Chức vụ"
            employeeLabel="Nhân viên"
            className="gap-5"
          />

          {/* Date range for proposal creation date */}
          <FormController
            name="date_range"
            control={control}
            register={register}
            Field={DateRangePicker}
            fieldProps={{
              label: 'Ngày tạo đề xuất',
              showQuickSelect: true,
              className: 'w-full',
            }}
          />

          {/* Date range for overtime entry date (overtime-work list only) */}
          {showOvertimeDateRange && (
            <FormController
              name="overtime_date_range"
              control={control}
              register={register}
              Field={DateRangePicker}
              fieldProps={{
                label: 'Ngày làm thêm giờ (OT)',
                showQuickSelect: true,
                className: 'w-full',
              }}
            />
          )}

          {/* Proposal Type - Only show when showProposalType is true */}
          {showProposalType && (
            <FormController
              name="proposal_type"
              control={control}
              register={register}
              Field={Select}
              fieldProps={{
                label: 'Loại đề xuất',
                placeholder: 'Chọn loại đề xuất',
                multiple: true,
                options: proposalTypeOptions,
                className: 'w-full',
                triggerVariant: 'chips',
                clearable: true,
              }}
            />
          )}

          {/* Transfer Status - single-select, bulk job-transfer list only */}
          {showTransferStatus && (
            <FormController
              name="transfer_status"
              control={control}
              register={register}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái điều chuyển',
                placeholder: 'Chọn trạng thái điều chuyển',
                options: transferStatusOptions,
                className: 'w-full',
                clearable: true,
              }}
            />
          )}

          {/* Verifier Status - only when showVerifierStatus is true */}
          {showVerifierStatus && (
            <div className="flex flex-col gap-3">
              <label className="typo-body-base-semibold text-content-dark-2">
                Trạng thái xác nhận
              </label>
              <div className="flex flex-wrap gap-[26px]">
                {verifierStatusOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 py-1.5">
                    <Checkbox
                      checked={selectedVerifierStatuses?.includes(option.value)}
                      onCheckedChange={(checked: any) =>
                        handleVerifierStatusChange(option.value, Boolean(checked))
                      }
                    />
                    <span className="text-content-dark-1 text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex flex-col gap-3">
            <label className="typo-body-base-semibold text-content-dark-2">Trạng thái duyệt</label>
            <div className="flex flex-wrap gap-[26px]">
              {statusOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 py-1.5">
                  <Checkbox
                    checked={selectedStatuses?.includes(option.value)}
                    onCheckedChange={(checked: any) =>
                      handleStatusChange(option.value, Boolean(checked))
                    }
                  />
                  <span className="text-content-dark-1 text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Flex>
      </Form>
    )
  }
)

ProposalsFilterForm.displayName = 'ProposalsFilterForm'
export default ProposalsFilterForm
