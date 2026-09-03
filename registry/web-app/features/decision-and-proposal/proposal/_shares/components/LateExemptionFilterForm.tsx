import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import type { DateRange } from 'react-day-picker'
import { parse } from 'date-fns'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Checkbox, Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'

export type LateExemptionFilterFormRef = {
  clearForm: () => void
  getRawValues: () => LateExemptionFilterFormValues
}

type LateExemptionFilterFormProps = {
  initialValues?: Partial<LateExemptionFilterFormValues>
}

/**
 * Form values use API schema field names where applicable.
 * proposal_date__gte / proposal_date__lte = date range (API format yyyy-MM-dd).
 */
export type LateExemptionFilterFormValues = {
  proposal_date__gte?: string
  proposal_date__lte?: string
  late_exemption_duration_type?: string | null
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  employee_id?: number
  status?: string[]
  verifier_status?: string[]
}

const Schema = z.object({
  proposal_date__gte: z.string().optional(),
  proposal_date__lte: z.string().optional(),
  late_exemption_duration_type: z.string().nullable().optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position_id: z.number().optional(),
  employee_id: z.number().optional(),
  status: z.array(z.string()).optional(),
  verifier_status: z.array(z.string()).optional(),
})

function parseDateRangeFromApi(gte?: string, lte?: string): DateRange | undefined | null {
  if (!gte && !lte) return null
  try {
    const from = gte ? parse(gte, DATE_SERVER_FORMAT, new Date()) : undefined
    const to = lte ? parse(lte, DATE_SERVER_FORMAT, new Date()) : undefined
    if (!from && !to) return null
    return { from, to }
  } catch {
    return null
  }
}

const LateExemptionFilterForm = forwardRef<
  LateExemptionFilterFormRef,
  LateExemptionFilterFormProps
>(({ initialValues }, ref) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES,
      APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES,
      APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE,
    ],
  })

  const statusOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES) || []
        : [],
    [keysMapOptions]
  )

  const verifierStatusOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES) || []
        : [],
    [keysMapOptions]
  )

  const lateExemptionDurationTypeOptions = useMemo(
    () =>
      keysMapOptions.has(APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE) || []
        : [],
    [keysMapOptions]
  )

  const { control, reset, getValues, handleSubmit, watch, setValue, register } =
    useForm<LateExemptionFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        proposal_date__gte: initialValues?.proposal_date__gte ?? '',
        proposal_date__lte: initialValues?.proposal_date__lte ?? '',
        late_exemption_duration_type: initialValues?.late_exemption_duration_type ?? null,
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        position_id: initialValues?.position_id,
        employee_id: initialValues?.employee_id,
        status: initialValues?.status ?? [],
        verifier_status: initialValues?.verifier_status ?? [],
      },
    })

  const [formKey, setFormKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset(
        {
          proposal_date__gte: '',
          proposal_date__lte: '',
          late_exemption_duration_type: null,
          branch_id: undefined,
          block_id: undefined,
          department_id: undefined,
          position_id: undefined,
          employee_id: undefined,
          status: [],
          verifier_status: [],
        },
        { keepDefaultValues: false }
      )
      setFormKey((prev) => prev + 1)
    },
    getRawValues: () => getValues(),
  }))

  const handleCascadeChange = useCallback(
    (data: {
      branch_id?: number
      block_id?: number
      department_id?: number
      position_id?: number
      employee_id?: number
    }) => {
      const current = getValues()
      if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
        setValue('branch_id', data.branch_id > 0 ? data.branch_id : undefined, {
          shouldDirty: false,
        })
        if (!data.branch_id || data.branch_id === 0) {
          setValue('block_id', undefined, { shouldDirty: false })
          setValue('department_id', undefined, { shouldDirty: false })
          setValue('position_id', undefined, { shouldDirty: false })
          setValue('employee_id', undefined, { shouldDirty: false })
        }
      } else if (data.branch_id === undefined || data.branch_id === null || data.branch_id === 0) {
        setValue('branch_id', undefined, { shouldDirty: false })
      }

      if (data.block_id !== undefined && data.block_id !== current.block_id) {
        setValue('block_id', data.block_id > 0 ? data.block_id : undefined, {
          shouldDirty: false,
        })
        if (!data.block_id || data.block_id === 0) {
          setValue('department_id', undefined, { shouldDirty: false })
          setValue('position_id', undefined, { shouldDirty: false })
          setValue('employee_id', undefined, { shouldDirty: false })
        }
      } else if (data.block_id === undefined || data.block_id === null || data.block_id === 0) {
        setValue('block_id', undefined, { shouldDirty: false })
      }

      if (data.department_id !== undefined && data.department_id !== current.department_id) {
        setValue('department_id', data.department_id > 0 ? data.department_id : undefined, {
          shouldDirty: false,
        })
        if (!data.department_id || data.department_id === 0) {
          setValue('position_id', undefined, { shouldDirty: false })
          setValue('employee_id', undefined, { shouldDirty: false })
        }
      } else if (
        data.department_id === undefined ||
        data.department_id === null ||
        data.department_id === 0
      ) {
        setValue('department_id', undefined, { shouldDirty: false })
      }

      if (data.position_id !== undefined && data.position_id !== current.position_id) {
        setValue('position_id', data.position_id > 0 ? data.position_id : undefined, {
          shouldDirty: false,
        })
      } else if (
        data.position_id === undefined ||
        data.position_id === null ||
        data.position_id === 0
      ) {
        setValue('position_id', undefined, { shouldDirty: false })
      }

      if (data.employee_id !== undefined && data.employee_id !== current.employee_id) {
        setValue('employee_id', data.employee_id > 0 ? data.employee_id : undefined, {
          shouldDirty: false,
        })
      } else if (
        data.employee_id === undefined ||
        data.employee_id === null ||
        data.employee_id === 0
      ) {
        setValue('employee_id', undefined, { shouldDirty: false })
      }
    },
    [setValue, getValues]
  )

  const proposalDateGte = watch('proposal_date__gte')
  const proposalDateLte = watch('proposal_date__lte')
  const dateRangeValue = useMemo(
    () => parseDateRangeFromApi(proposalDateGte, proposalDateLte),
    [proposalDateGte, proposalDateLte]
  )

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined | null) => {
      setValue('proposal_date__gte', range?.from ? formatDateToApi(range.from) : '', {
        shouldDirty: true,
      })
      setValue('proposal_date__lte', range?.to ? formatDateToApi(range.to) : '', {
        shouldDirty: true,
      })
    },
    [setValue]
  )

  const selectedStatuses = watch('status')
  const selectedVerifierStatuses = watch('verifier_status')

  const handleStatusChange = useCallback(
    (value: string, checked: boolean) => {
      const current = watch('status') || []
      if (checked) {
        setValue('status', [...current, value])
      } else {
        setValue(
          'status',
          current.filter((v) => v !== value)
        )
      }
    },
    [watch, setValue]
  )

  const handleVerifierStatusChange = useCallback(
    (value: string, checked: boolean) => {
      const current = watch('verifier_status') || []
      if (checked) {
        setValue('verifier_status', [...current, value])
      } else {
        setValue(
          'verifier_status',
          current.filter((v) => v !== value)
        )
      }
    },
    [watch, setValue]
  )

  const onSubmit = async () => {
    setIsLoading(true)
    try {
      // Form submission is handled by parent
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form onSubmit={onSubmit} handleSubmit={handleSubmit as any} loading={isLoading}>
      <Flex direction="column" gap="5">
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

        <Controller
          name="proposal_date__gte"
          control={control}
          render={() => (
            <DateRangePicker
              label="Khung thời gian"
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              showQuickSelect
              className="w-full"
            />
          )}
        />

        <FormController
          name="late_exemption_duration_type"
          control={control}
          register={register}
          Field={Select}
          fieldProps={{
            label: 'Loại miễn trừ trễ',
            placeholder: 'Chọn loại',
            options: lateExemptionDurationTypeOptions,
            className: 'w-full',
            clearable: true,
          }}
        />

        <div className="flex flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2">Trạng thái xác nhận</label>
          <div className="flex flex-wrap gap-[26px]">
            {verifierStatusOptions.map((option: { value: string; label: string }) => (
              <label key={option.value} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  checked={selectedVerifierStatuses?.includes(option.value)}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    handleVerifierStatusChange(option.value, Boolean(checked))
                  }
                />
                <span className="text-content-dark-1 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2">Trạng thái duyệt</label>
          <div className="flex flex-wrap gap-[26px]">
            {statusOptions.map((option: { value: string; label: string }) => (
              <label key={option.value} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  checked={selectedStatuses?.includes(option.value)}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
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
})

LateExemptionFilterForm.displayName = 'LateExemptionFilterForm'
export default LateExemptionFilterForm
