import { forwardRef } from 'react'
import { useForm } from 'react-hook-form'
import type { DateRange } from 'react-day-picker'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import OrgCascadeField, {
  useOrgCascadeSync,
  type OrgCascadeValues,
} from '@/components/commons/filters/OrgCascadeField'
import { useFilterFormHandle, type FilterFormHandle } from '@/hooks/useFilterFormHandle'

export type TkkdReportFilterFormValues = OrgCascadeValues & {
  contractDateFrom?: Date
  contractDateTo?: Date
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP với contractDateFrom/To, cộng thêm (AND). */
  transactionSheetDateFrom?: Date
  transactionSheetDateTo?: Date
}

export type TkkdReportFilterFormRef = FilterFormHandle<TkkdReportFilterFormValues>

const EMPTY_VALUES: TkkdReportFilterFormValues = {
  contractDateFrom: undefined,
  contractDateTo: undefined,
  transactionSheetDateFrom: undefined,
  transactionSheetDateTo: undefined,
  branch: undefined,
  block: undefined,
  department: undefined,
}

type Props = {
  initialValues?: TkkdReportFilterFormValues
}

/**
 * Optional filters of the TKKD reports: deposit-contract sign-date range + org chart.
 * Opened from `PageTitle.handleFilter` inside `<AppDialog variant="filter">` and applied
 * on confirm — the required period axis stays in the toolbar ([TkkdReportPeriodSelector]).
 */
const TkkdReportFilterForm = forwardRef<TkkdReportFilterFormRef, Props>(
  ({ initialValues }, ref) => {
    const { handleSubmit, register, reset, getValues, setValue, control, watch } =
      useForm<TkkdReportFilterFormValues>({ defaultValues: { ...EMPTY_VALUES, ...initialValues } })

    const { formKey, hasCleared } = useFilterFormHandle(ref, {
      reset,
      getValues,
      emptyValues: EMPTY_VALUES,
    })

    const handleOrgChange = useOrgCascadeSync(getValues, setValue)

    const contractDateFrom = watch('contractDateFrom')
    const contractDateTo = watch('contractDateTo')
    const transactionSheetDateFrom = watch('transactionSheetDateFrom')
    const transactionSheetDateTo = watch('transactionSheetDateTo')

    const onSubmit = () => {
      // Submit is driven by the dialog's confirm action.
    }

    return (
      <Form
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
        loading={false}
        className="flex flex-col gap-5"
      >
        <FormController
          key={`tkkd-contract-date-range-${formKey}`}
          name="contractDateFrom"
          control={control}
          register={register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Ngày ký HĐ cọc',
            showQuickSelect: true,
            className: 'w-full',
            value: { from: contractDateFrom, to: contractDateTo } as DateRange,
            onChange: (range: DateRange | undefined) => {
              setValue('contractDateFrom', range?.from, { shouldDirty: true })
              setValue('contractDateTo', range?.to, { shouldDirty: true })
              return range?.from
            },
          }}
        />

        <FormController
          key={`tkkd-transaction-sheet-date-range-${formKey}`}
          name="transactionSheetDateFrom"
          control={control}
          register={register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Ngày làm phiếu TTGD',
            showQuickSelect: true,
            className: 'w-full',
            value: { from: transactionSheetDateFrom, to: transactionSheetDateTo } as DateRange,
            onChange: (range: DateRange | undefined) => {
              setValue('transactionSheetDateFrom', range?.from, { shouldDirty: true })
              setValue('transactionSheetDateTo', range?.to, { shouldDirty: true })
              return range?.from
            },
          }}
        />

        <OrgCascadeField
          formKey={formKey}
          initialValues={hasCleared ? undefined : initialValues}
          onChange={handleOrgChange}
        />
      </Form>
    )
  }
)

TkkdReportFilterForm.displayName = 'TkkdReportFilterForm'

export default TkkdReportFilterForm
