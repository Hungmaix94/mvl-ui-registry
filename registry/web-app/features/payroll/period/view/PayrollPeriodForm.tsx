import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form } from '@/components/ui/form'
import { Flex, Grid } from '@radix-ui/themes'
import { DateTimePicker } from '@/components/ui/calendar/date-single-picker/date-time-picker'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import { Button } from '@/components/ui/button'
import {
  type SalaryPeriodCreateAsyncRequest,
  type SalaryPeriod,
  type PatchedSalaryPeriodUpdateDeadlinesRequest,
} from '@/features/payroll/services/salary-period-service'
import { SalaryPeriodStatus } from '@/api/schema'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import FormController from '@/components/ui/form/FormController'
import { TextField } from '@/components/ui'
import {
  formatDate,
  formatDateTimeToApi,
  formatDateToMonth,
  parseDateTimeFromApi,
  parseMonthFromApi,
} from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils'
import { withRememberedSearch } from '@/utils/list-url-memory'

type FormInputValues = {
  month: Date
  proposal_deadline: string
  kpi_assessment_deadline: string
  min_working_days_for_insurance?: string
}

interface PayrollPeriodFormPropsBase {
  isLoading?: boolean
  initialData?: SalaryPeriod
}

interface PayrollPeriodFormPropsCreate extends PayrollPeriodFormPropsBase {
  mode: 'create'
  onSubmit: (data: SalaryPeriodCreateAsyncRequest) => void
}

interface PayrollPeriodFormPropsEdit extends PayrollPeriodFormPropsBase {
  mode: 'edit'
  onSubmit: (data: PatchedSalaryPeriodUpdateDeadlinesRequest) => void
}

type PayrollPeriodFormProps = PayrollPeriodFormPropsCreate | PayrollPeriodFormPropsEdit

const DEFAULT_MIN_WORKING_DAYS_FOR_INSURANCE = '14.0'

const schema = z.object({
  month: z.date({ required_error: 'Vui lòng chọn kỳ lương' }),
  proposal_deadline: z
    .string({ required_error: 'Vui lòng chọn thời gian ngừng nhận đề xuất' })
    .min(1, 'Vui lòng chọn thời gian ngừng nhận đề xuất'),
  kpi_assessment_deadline: z
    .string({ required_error: 'Vui lòng chọn thời gian ngừng đánh giá KPI' })
    .min(1, 'Vui lòng chọn thời gian ngừng đánh giá KPI'),
  min_working_days_for_insurance: z
    .string()
    .refine((val) => {
      if (!val) return true // Allow empty
      // Allow dots or commas as decimal separator
      return /^\d*[.,]?\d*$/.test(val) && val !== '.' && val !== ','
    }, 'Chỉ được nhập số hợp lệ (có thể có phần thập phân)')
    .optional(),
})

const PayrollPeriodForm = ({
  onSubmit,
  isLoading,
  initialData,
  mode = 'create',
}: PayrollPeriodFormProps) => {
  const navigate = useNavigate()

  const isDeadlineDisabled = mode === 'edit' && initialData?.status === SalaryPeriodStatus.COMPLETED

  // Prepare default values based on mode
  const getDefaultValues = (): Partial<FormInputValues> => {
    if (mode === 'edit' && initialData) {
      const values: Partial<FormInputValues> = {}

      if (initialData.month) {
        const monthDate = parseMonthFromApi(initialData.month)
        if (monthDate) values.month = monthDate
      }
      if (initialData.proposal_deadline) {
        values.proposal_deadline = parseDateTimeFromApi(initialData.proposal_deadline)
      }
      if (initialData.kpi_assessment_deadline) {
        values.kpi_assessment_deadline = parseDateTimeFromApi(initialData.kpi_assessment_deadline)
      }
      values.min_working_days_for_insurance =
        (initialData as SalaryPeriod & { min_working_days_for_insurance?: string })
          .min_working_days_for_insurance ?? DEFAULT_MIN_WORKING_DAYS_FOR_INSURANCE
      return values
    } else {
      // Create mode defaults
      const now = new Date()
      const defaultDate = new Date(now.getFullYear(), now.getMonth(), 5)
      return {
        kpi_assessment_deadline: `${formatDate(defaultDate)} 23:59`,
        min_working_days_for_insurance: DEFAULT_MIN_WORKING_DAYS_FOR_INSURANCE,
      }
    }
  }

  const form = useForm<FormInputValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(),
  })

  // Watch month value to auto-fill kpi_assessment_deadline
  const monthValue = form.watch('month')

  useEffect(() => {
    if (monthValue && mode === 'create') {
      const defaultDate = new Date(monthValue.getFullYear(), monthValue.getMonth(), 5)
      form.setValue('kpi_assessment_deadline', `${formatDate(defaultDate)} 23:59`)
    }
  }, [monthValue, mode])

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const formValues: Partial<FormInputValues> = {}

      if (initialData.month) {
        const monthDate = parseMonthFromApi(initialData.month)
        if (monthDate) formValues.month = monthDate
      }
      if (initialData.proposal_deadline) {
        formValues.proposal_deadline = parseDateTimeFromApi(initialData.proposal_deadline)
      }
      if (initialData.kpi_assessment_deadline) {
        formValues.kpi_assessment_deadline = parseDateTimeFromApi(
          initialData.kpi_assessment_deadline
        )
      }
      formValues.min_working_days_for_insurance =
        (initialData as SalaryPeriod & { min_working_days_for_insurance?: string })
          .min_working_days_for_insurance ?? DEFAULT_MIN_WORKING_DAYS_FOR_INSURANCE

      // Force reset with keepDefaultValues to properly sync with MonthPicker
      form.reset(formValues, { keepDefaultValues: false })
    }
  }, [initialData?.id, mode])

  const handleSubmit = async (values: FormInputValues) => {
    try {
      const raw = values.min_working_days_for_insurance
      let minWorkingDays =
        raw !== undefined && raw !== null && String(raw).trim() !== ''
          ? String(raw).trim()
          : DEFAULT_MIN_WORKING_DAYS_FOR_INSURANCE

      // Convert comma to dot for API standardization
      if (minWorkingDays && minWorkingDays.includes(',')) {
        minWorkingDays = minWorkingDays.replace(',', '.')
      }

      const proposalDeadlineApi = formatDateTimeToApi(values.proposal_deadline)
      const kpiDeadlineApi = formatDateTimeToApi(values.kpi_assessment_deadline)

      if (mode === 'edit') {
        // For edit mode, only send deadlines and min_working_days_for_insurance
        const payload: PatchedSalaryPeriodUpdateDeadlinesRequest = {
          ...(proposalDeadlineApi && { proposal_deadline: proposalDeadlineApi }),
          ...(kpiDeadlineApi && { kpi_assessment_deadline: kpiDeadlineApi }),
          min_working_days_for_insurance: minWorkingDays,
        }
        await (onSubmit as (data: PatchedSalaryPeriodUpdateDeadlinesRequest) => void)(payload)
      } else {
        // For create mode, send all fields (min_working_days_for_insurance optional for API compatibility)
        const payload: SalaryPeriodCreateAsyncRequest & {
          min_working_days_for_insurance?: string
        } = {
          month: formatDateToMonth(values.month),
          ...(proposalDeadlineApi && { proposal_deadline: proposalDeadlineApi }),
          ...(kpiDeadlineApi && { kpi_assessment_deadline: kpiDeadlineApi }),
          min_working_days_for_insurance: minWorkingDays,
        }
        await (onSubmit as (data: SalaryPeriodCreateAsyncRequest) => void)(payload)
      }
    } catch (error) {
      handleApiError(error, form.setError)
    }
  }

  const handleCancel = () => {
    navigate(withRememberedSearch(APP_PATH.PAYROLL_PERIOD))
  }

  return (
    <Form
      handleSubmit={form.handleSubmit}
      onSubmit={handleSubmit}
      loading={isLoading || false}
      className="space-y-6"
    >
      <Grid columns="1" gap="4" width="100%">
        <FormController
          control={form.control}
          name="month"
          register={form.register}
          Field={MonthPicker}
          fieldProps={{
            label: 'Kỳ lương',
            placeholder: 'MM/YYYY',
            className: 'w-full',
            required: true,
            disabled: mode === 'edit',
          }}
        />

        <FormController
          control={form.control}
          name="proposal_deadline"
          register={form.register}
          Field={DateTimePicker}
          fieldProps={{
            label: 'Thời gian ngừng nhận đề xuất',
            placeholder: 'DD/MM/YYYY HH:mm',
            className: 'w-full',
            required: true,
            disabled: isDeadlineDisabled,
          }}
        />

        <FormController
          control={form.control}
          name="kpi_assessment_deadline"
          register={form.register}
          Field={DateTimePicker}
          fieldProps={{
            label: 'Thời gian ngừng đánh giá KPI',
            placeholder: 'DD/MM/YYYY HH:mm',
            className: 'w-full',
            required: true,
            disabled: isDeadlineDisabled,
          }}
        />

        <FormController
          control={form.control}
          name="min_working_days_for_insurance"
          register={form.register}
          Field={TextField}
          fieldProps={{
            label: 'Số ngày làm việc tối thiểu',
            caption: 'Số ngày làm việc tối thiểu để được hưởng bảo hiểm',
            placeholder: '14',
            className: 'w-full',
            required: false,
            type: 'text',
            inputMode: 'decimal',
          }}
        />
      </Grid>

      <Flex justify="end" gap="3">
        <Button type="button" variant="secondary" onClick={handleCancel} className="min-w-[150px]">
          Huỷ
        </Button>
        <Button type="submit" loading={isLoading} className="min-w-[150px]">
          {mode === 'edit' ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </Flex>
    </Form>
  )
}

export default PayrollPeriodForm
