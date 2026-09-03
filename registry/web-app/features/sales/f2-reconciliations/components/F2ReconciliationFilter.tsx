import { forwardRef, useImperativeHandle } from 'react'
import { Grid } from '@radix-ui/themes'
import { useForm, useWatch } from 'react-hook-form'
import { type DateRange } from 'react-day-picker'

import { Select, TextField } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import FormController from '@/components/ui/form/FormController'
import CascadeSelectGroupSalesScope from '@/components/commons/filters/CascadeSelectGroupSalesScope'

import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { type ReconciliationStatus } from '@/constants/api-schema-aliases'

export type F2ReconciliationFilterFormData = {
  status?: ReconciliationStatus | null
  project?: number | null
  exchange?: number | null
  tax_code?: string | null
  sales_allocation?: number | null
  reconciliationDateRange?: DateRange | null
}

export type F2ReconciliationFilterRef = {
  getValues: () => F2ReconciliationFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: F2ReconciliationFilterFormData
}

const F2ReconciliationFilter = forwardRef<F2ReconciliationFilterRef, Props>(
  ({ initialValues }, ref) => {
    const form = useForm<F2ReconciliationFilterFormData>({
      defaultValues: initialValues ?? {},
    })

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [APP_CONSTANT_KEY.SALES.F2_RECONCILIATION_SHEET.STATUS_CHOICES],
    })

    const statusOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.SALES.F2_RECONCILIATION_SHEET.STATUS_CHOICES) ?? []

    // Dependent scope chain (Dự án → Nguồn hàng → Phân lô) is delegated to
    // CascadeSelectGroupSalesScope; this form stays the source of truth for its values.
    const watchedProject = useWatch({ control: form.control, name: 'project' })
    const watchedExchange = useWatch({ control: form.control, name: 'exchange' })
    const watchedSalesAllocation = useWatch({ control: form.control, name: 'sales_allocation' })

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () => {
        form.reset({
          status: null,
          project: null,
          exchange: null,
          tax_code: null,
          sales_allocation: null,
          reconciliationDateRange: null,
        })
      },
    }))

    return (
      <Grid columns="2" gap="4" className="w-full">
        <div className="col-span-2">
          <FormController
            register={form.register}
            name="reconciliationDateRange"
            control={form.control}
            Field={DateRangePicker}
            fieldProps={{
              label: 'Khoảng ngày đối chiếu',
              className: 'w-full',
              showQuickSelect: true,
            }}
          />
        </div>
        <div className="col-span-2">
          <FormController
            register={form.register}
            name="status"
            control={form.control}
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              options: statusOptions,
              placeholder: 'Chọn trạng thái',
            }}
          />
        </div>
        <div className="col-span-2">
          <FormController
            register={form.register}
            name="tax_code"
            control={form.control}
            Field={TextField}
            fieldProps={{
              label: 'Mã số thuế',
              placeholder: 'Nhập mã số thuế',
            }}
          />
        </div>

        <div className="border-border-1 col-span-2 flex items-baseline gap-2 border-t pt-4">
          <span className="typo-body-base-semibold text-content-dark-2">Phạm vi</span>
          <span className="typo-body-sm-regular text-content-dark-3">
            Dự án và Nguồn hàng độc lập — chọn ít nhất một để lọc Thông tin bán hàng
          </span>
        </div>

        <div className="col-span-2">
          <CascadeSelectGroupSalesScope
            value={{
              project: watchedProject ?? null,
              exchange: watchedExchange ?? null,
              sales_allocation: watchedSalesAllocation ?? null,
            }}
            onChange={(next) => {
              form.setValue('project', next.project ?? null)
              form.setValue('exchange', next.exchange ?? null)
              form.setValue('sales_allocation', next.sales_allocation ?? null)
            }}
          />
        </div>
      </Grid>
    )
  }
)

F2ReconciliationFilter.displayName = 'F2ReconciliationFilter'

export default F2ReconciliationFilter
