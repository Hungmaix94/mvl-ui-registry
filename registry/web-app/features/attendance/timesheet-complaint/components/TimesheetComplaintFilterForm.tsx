import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import type { DateRange } from 'react-day-picker'
import { parse } from 'date-fns'
import Form from '@/components/ui/form/Form.tsx'
import { Checkbox } from '@/components/ui/checkbox'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import useOrganization from '@/hooks/useOrganization.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { ExportDelivery, ProposalVerifierStatus } from '@/constants/api-schema-aliases'

export type TimesheetComplaintFilterFormRef = {
  clearForm: () => void
  getValues: () => Record<string, any>
  getRawValues: () => TimesheetComplaintFilterFormValues
}

type TimesheetComplaintFilterFormProps = {
  initialValues?: Record<string, any>
}

export type TimesheetComplaintFilterFormValues = {
  timesheet_entry_complaint_complaint_date__gte?: string
  timesheet_entry_complaint_complaint_date__lte?: string
  branch_id?: number
  block_id?: number
  department_id?: number
  proposal_status?: ExportDelivery[]
  verifier_status?: ProposalVerifierStatus[]
}

const Schema = z.object({
  timesheet_entry_complaint_complaint_date__gte: z.string().optional(),
  timesheet_entry_complaint_complaint_date__lte: z.string().optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  proposal_status: z.array(z.nativeEnum(ExportDelivery)).optional(),
  verifier_status: z.array(z.nativeEnum(ProposalVerifierStatus)).optional(),
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

const TimesheetComplaintFilterForm = forwardRef<
  TimesheetComplaintFilterFormRef,
  TimesheetComplaintFilterFormProps
>(({ initialValues }, ref) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS, APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS],
  })

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS) || []
      : []
  }, [keysMapOptions])

  const verifierStatusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS) || []
      : []
  }, [keysMapOptions])

  const { reset, getValues, handleSubmit, watch, setValue } =
    useForm<TimesheetComplaintFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      mode: 'onChange',
      defaultValues: {
        timesheet_entry_complaint_complaint_date__gte:
          initialValues?.timesheet_entry_complaint_complaint_date__gte ?? '',
        timesheet_entry_complaint_complaint_date__lte:
          initialValues?.timesheet_entry_complaint_complaint_date__lte ?? '',
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        proposal_status: initialValues?.proposal_status || [],
        verifier_status: initialValues?.verifier_status || [],
      },
    })

  const [formKey, setFormKey] = useState(0)

  const watchedComplaintDateGte = watch('timesheet_entry_complaint_complaint_date__gte')
  const watchedComplaintDateLte = watch('timesheet_entry_complaint_complaint_date__lte')
  const dateRangeValue = useMemo(
    () => parseDateRangeFromApi(watchedComplaintDateGte, watchedComplaintDateLte),
    [watchedComplaintDateGte, watchedComplaintDateLte]
  )
  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined | null) => {
      setValue(
        'timesheet_entry_complaint_complaint_date__gte',
        range?.from ? formatDateToApi(range.from) : '',
        { shouldDirty: false }
      )
      setValue(
        'timesheet_entry_complaint_complaint_date__lte',
        range?.to ? formatDateToApi(range.to) : '',
        { shouldDirty: false }
      )
    },
    [setValue]
  )

  const watchedBranch = watch('branch_id')
  const watchedBlock = watch('block_id')
  const watchedDepartment = watch('department_id')
  const watchedStatus = watch('proposal_status') || []
  const watchedVerifierStatus = watch('verifier_status') || []

  useOrganization({
    branch: watchedBranch,
    block: watchedBlock,
  })

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      reset({
        timesheet_entry_complaint_complaint_date__gte:
          initialValues?.timesheet_entry_complaint_complaint_date__gte ?? '',
        timesheet_entry_complaint_complaint_date__lte:
          initialValues?.timesheet_entry_complaint_complaint_date__lte ?? '',
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        proposal_status: initialValues?.proposal_status || [],
        verifier_status: initialValues?.verifier_status || [],
      })
    }
  }, [initialValues, reset])

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      reset({
        timesheet_entry_complaint_complaint_date__gte: '',
        timesheet_entry_complaint_complaint_date__lte: '',
        branch_id: undefined,
        block_id: undefined,
        department_id: undefined,
        proposal_status: [],
        verifier_status: [],
      })
      setFormKey((prev) => prev + 1)
    },
    getRawValues: () => {
      return getValues()
    },
    getValues: () => {
      const values = getValues()
      const apiParams: Record<string, any> = {}

      if (values.timesheet_entry_complaint_complaint_date__gte) {
        apiParams.timesheet_entry_complaint_complaint_date__gte =
          values.timesheet_entry_complaint_complaint_date__gte
      }
      if (values.timesheet_entry_complaint_complaint_date__lte) {
        apiParams.timesheet_entry_complaint_complaint_date__lte =
          values.timesheet_entry_complaint_complaint_date__lte
      }
      if (values.branch_id) apiParams.branch = values.branch_id
      if (values.block_id) apiParams.block = values.block_id
      if (values.department_id) apiParams.department = values.department_id

      if (values.proposal_status && values.proposal_status.length > 0) {
        apiParams.proposal_status__in = values.proposal_status
      }

      if (values.verifier_status && values.verifier_status.length > 0) {
        apiParams.verifiers__status__in = values.verifier_status
      }

      return apiParams
    },
  }))

  const handleCascadeChange = useCallback(
    (data: any) => {
      const current = getValues()

      if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
        setValue('branch_id', data.branch_id, { shouldDirty: false })
        setValue('block_id', undefined, { shouldDirty: false })
        setValue('department_id', undefined, { shouldDirty: false })
      }

      if (data.block_id !== undefined && data.block_id !== current.block_id) {
        setValue('block_id', data.block_id, { shouldDirty: false })
        setValue('department_id', undefined, { shouldDirty: false })
      }

      if (data.department_id !== undefined && data.department_id !== current.department_id) {
        setValue('department_id', data.department_id, { shouldDirty: false })
      }
    },
    [getValues, setValue]
  )

  const handleStatusChange = useCallback(
    (status: ExportDelivery, checked: boolean) => {
      const current = watchedStatus
      if (checked) {
        setValue('proposal_status', [...current, status], { shouldDirty: false })
      } else {
        setValue(
          'proposal_status',
          current.filter((s) => s !== status),
          { shouldDirty: false }
        )
      }
    },
    [watchedStatus, setValue]
  )

  const handleVerifierStatusChange = useCallback(
    (status: ProposalVerifierStatus, checked: boolean) => {
      const current = watchedVerifierStatus
      if (checked) {
        setValue('verifier_status', [...current, status], { shouldDirty: false })
      } else {
        setValue(
          'verifier_status',
          current.filter((s) => s !== status),
          { shouldDirty: false }
        )
      }
    },
    [watchedVerifierStatus, setValue]
  )

  const onSubmit = async (_data: TimesheetComplaintFilterFormValues) => {
    // Form submission is handled by parent via ref
  }

  return (
    <Form key={formKey} loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
      <Flex direction={'column'} gap={'5'}>
        {/* Organization cascade select */}
        <CascadeSelectGroupOrganization
          initialValues={{
            branch: watchedBranch ? String(watchedBranch) : undefined,
            block: watchedBlock ? String(watchedBlock) : undefined,
            department: watchedDepartment ? String(watchedDepartment) : undefined,
          }}
          onFormChange={(data) => {
            handleCascadeChange({
              branch_id: data.branch_id,
              block_id: data.block_id,
              department_id: data.department_id,
            })
          }}
          showEmployee={false}
          showPosition={false}
          skipValidation={true}
        />

        {/* Ngày xác nhận công (Từ ngày - Đến ngày) */}
        <div className="flex flex-col gap-3 space-y-2">
          <DateRangePicker
            label={'Ngày xác nhận công'}
            value={dateRangeValue ?? undefined}
            onChange={handleDateRangeChange}
            showQuickSelect={true}
          />
        </div>

        {/* Status checkboxes */}
        <div className="flex flex-col gap-3 space-y-2">
          <label className="typo-body-base-semibold text-content-dark-2 mb-0">Trạng thái</label>
          <div className="flex flex-wrap gap-6">
            {statusOptions.map((option: { value: string; label: string }) => {
              const statusValue = option.value as ExportDelivery
              return (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={watchedStatus.includes(statusValue)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(statusValue, checked as boolean)
                    }
                  />
                  <label className="typo-body-base-regular text-content-dark-1">
                    {option.label}
                  </label>
                </div>
              )
            })}
          </div>
        </div>

        {/* Verifier Status checkboxes */}
        <div className="flex flex-col gap-3 space-y-2">
          <label className="typo-body-base-semibold text-content-dark-2 mb-0">
            Trạng thái xác nhận
          </label>
          <div className="flex flex-wrap gap-6">
            {verifierStatusOptions.map((option: { value: string; label: string }) => {
              const statusValue = option.value as ProposalVerifierStatus
              return (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={watchedVerifierStatus.includes(statusValue)}
                    onCheckedChange={(checked) =>
                      handleVerifierStatusChange(statusValue, checked as boolean)
                    }
                  />
                  <label className="typo-body-base-regular text-content-dark-1">
                    {option.label}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      </Flex>
    </Form>
  )
})

TimesheetComplaintFilterForm.displayName = 'TimesheetComplaintFilterForm'

export default TimesheetComplaintFilterForm
