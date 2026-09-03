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

export type DepositCumulativeFilterFormValues = OrgCascadeValues & {
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP, cộng thêm (AND). */
  transactionSheetDateRange?: DateRange | null
}

export type DepositCumulativeFilterFormRef = FilterFormHandle<DepositCumulativeFilterFormValues>

const EMPTY_VALUES: DepositCumulativeFilterFormValues = {
  branch: undefined,
  block: undefined,
  department: undefined,
  transactionSheetDateRange: null,
}

type Props = {
  initialValues?: DepositCumulativeFilterFormValues
}

/**
 * Optional filters of the deposit-cumulative reports: org chart only — the accounting
 * period is required (it defines the week columns) so it stays in the page toolbar.
 */
const DepositCumulativeFilterForm = forwardRef<DepositCumulativeFilterFormRef, Props>(
  ({ initialValues }, ref) => {
    const { handleSubmit, register, control, reset, getValues, setValue } =
      useForm<DepositCumulativeFilterFormValues>({
        defaultValues: { ...EMPTY_VALUES, ...initialValues },
      })

    const { formKey, hasCleared } = useFilterFormHandle(ref, {
      reset,
      getValues,
      emptyValues: EMPTY_VALUES,
    })

    const handleOrgChange = useOrgCascadeSync(getValues, setValue)

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
          register={register}
          name="transactionSheetDateRange"
          control={control}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Ngày làm phiếu TTGD',
            className: 'w-full',
            showQuickSelect: true,
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

DepositCumulativeFilterForm.displayName = 'DepositCumulativeFilterForm'

export default DepositCumulativeFilterForm
