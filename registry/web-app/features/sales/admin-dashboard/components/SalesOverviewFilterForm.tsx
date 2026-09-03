import { forwardRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type { DateRange } from 'react-day-picker'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import Checkbox from '@/components/ui/checkbox/Checkbox'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useFilterFormHandle, type FilterFormHandle } from '@/hooks/useFilterFormHandle'

export type SalesOverviewFilterFormValues = {
  dateFrom?: Date
  dateTo?: Date
  dealStatus?: string[]
  /** Ngày làm phiếu TTGD — độc lập, cộng thêm (AND) với khoảng ngày cọc ở trên. */
  transactionSheetDateFrom?: Date
  transactionSheetDateTo?: Date
}

export type SalesOverviewFilterFormRef = FilterFormHandle<SalesOverviewFilterFormValues>

const EMPTY_VALUES: SalesOverviewFilterFormValues = {
  dateFrom: undefined,
  dateTo: undefined,
  dealStatus: [],
  transactionSheetDateFrom: undefined,
  transactionSheetDateTo: undefined,
}

type Props = {
  initialValues?: SalesOverviewFilterFormValues
}

/**
 * Optional filters of the sales-overview report: the deposit-date range and the unit's
 * status. The grouping axis (week/month/year) stays in the page toolbar because it is
 * required, never empty. The date label spells out the calculation basis — the report
 * filters deals by "Ngày cọc".
 *
 * Leaving the status field empty is not "no units": the report has always been scoped to
 * sold deals (active + completed), so an empty selection keeps exactly that and the
 * headline totals do not move for anyone who never opens this dialog. Picking statuses
 * replaces that default outright rather than adding to it — see `_parse_deal_statuses`
 * on the backend.
 */
const SalesOverviewFilterForm = forwardRef<SalesOverviewFilterFormRef, Props>(
  ({ initialValues }, ref) => {
    const { handleSubmit, register, reset, getValues, setValue, control, watch } =
      useForm<SalesOverviewFilterFormValues>({
        defaultValues: { ...EMPTY_VALUES, ...initialValues },
      })

    const { formKey } = useFilterFormHandle(ref, {
      reset,
      getValues,
      emptyValues: EMPTY_VALUES,
    })

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [APP_CONSTANT_KEY.SALES.DEAL_STATUS],
    })

    // Labels come from the backend constants so the wording can never drift from the enum
    // the same request filters by.
    const dealStatusOptions = useMemo(
      () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEAL_STATUS) || [],
      [keysMapOptions]
    )

    const dateFrom = watch('dateFrom')
    const dateTo = watch('dateTo')
    const dealStatus = watch('dealStatus') ?? []
    const transactionSheetDateFrom = watch('transactionSheetDateFrom')
    const transactionSheetDateTo = watch('transactionSheetDateTo')

    const toggleDealStatus = (value: string, checked: boolean) => {
      // Rebuilt, never spliced in place: RHF only re-renders when the array identity
      // changes, so mutating it would leave the boxes showing stale state.
      const next = checked ? [...dealStatus, value] : dealStatus.filter((v) => v !== value)
      setValue('dealStatus', next, { shouldDirty: true })
    }

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
          key={`sales-overview-date-range-${formKey}`}
          name="dateFrom"
          control={control}
          register={register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Thời gian (tính theo ngày cọc)',
            showQuickSelect: true,
            className: 'w-full',
            value: { from: dateFrom, to: dateTo } as DateRange,
            onChange: (range: DateRange | undefined) => {
              setValue('dateFrom', range?.from, { shouldDirty: true })
              setValue('dateTo', range?.to, { shouldDirty: true })
              return range?.from
            },
          }}
        />

        <FormController
          key={`sales-overview-transaction-sheet-date-range-${formKey}`}
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

        {/* Checkbox group, not a Select: six fixed options that the user compares against
            each other read better laid out than hidden behind a trigger. `Checkbox` renders
            no heading of its own, so the section title is spelled out here — filter dialogs
            in this repo always name their field (see conventions.md). */}
        <div className="flex flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2">Tình trạng căn</label>
          <p className="text-content-dark-3 text-sm">
            Không chọn ô nào = đang hoạt động + đã hoàn thành (phạm vi mặc định của báo cáo).
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {dealStatusOptions.map((option: { value: string | number; label: string }) => (
              <Checkbox
                key={String(option.value)}
                label={option.label}
                checked={dealStatus.includes(String(option.value))}
                onCheckedChange={(checked) =>
                  toggleDealStatus(String(option.value), Boolean(checked))
                }
              />
            ))}
          </div>
        </div>
      </Form>
    )
  }
)

SalesOverviewFilterForm.displayName = 'SalesOverviewFilterForm'

export default SalesOverviewFilterForm
