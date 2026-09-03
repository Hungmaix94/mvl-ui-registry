import { forwardRef, useImperativeHandle } from 'react'
import { Grid } from '@radix-ui/themes'
import { useForm, useWatch } from 'react-hook-form'
import { type DateRange } from 'react-day-picker'

import { Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import FormController from '@/components/ui/form/FormController'

import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useSourceExchangeSelect } from '@/hooks/useSourceExchangeSelect'

export type InvestorReconciliationFilterFormData = {
  status?: string | null
  source_type?: string | null
  investor?: number | null
  source_exchange?: number | null
  project?: number | null
  reconciliationDateRange?: DateRange | null
}

export type InvestorReconciliationFilterRef = {
  getValues: () => InvestorReconciliationFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: InvestorReconciliationFilterFormData
}

const InvestorReconciliationFilter = forwardRef<InvestorReconciliationFilterRef, Props>(
  ({ initialValues }, ref) => {
    const form = useForm<InvestorReconciliationFilterFormData>({
      defaultValues: initialValues ?? {},
    })

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [
        APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.STATUS_CHOICES,
        APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES,
      ],
    })

    const statusOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.STATUS_CHOICES) ?? []
    const sourceTypeOptions =
      keysMapOptions.get(
        APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES
      ) ?? []

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect()

    const watchedProject = useWatch({ control: form.control, name: 'project' })
    const projectId =
      typeof watchedProject === 'number' ? watchedProject : Number(watchedProject) || undefined

    const { loadSourceExchangeOptions, loadInitialSourceExchangeOptions } = useSourceExchangeSelect(
      {
        project: projectId && projectId > 0 ? projectId : undefined,
      }
    )

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () => {
        form.reset({
          status: null,
          source_type: null,
          investor: null,
          source_exchange: null,
          project: null,
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
        <FormController
          register={form.register}
          name="source_type"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Loại nguồn',
            options: sourceTypeOptions,
            placeholder: 'Chọn loại nguồn',
          }}
        />
        <FormController
          register={form.register}
          name="investor"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Chủ đầu tư',
            placeholder: 'Chọn chủ đầu tư',
            loadOptions: loadInvestorOptions,
            loadInitialOptions: loadInitialInvestorOptions,
            enableSearch: true,
          }}
        />
        <FormController
          register={form.register}
          name="project"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Dự án',
            placeholder: 'Chọn dự án',
            loadOptions: loadProjectOptions,
            loadInitialOptions: loadInitialProjectOptions,
            enableSearch: true,
          }}
        />
        <FormController
          register={form.register}
          name="source_exchange"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Sàn giao dịch',
            placeholder: 'Chọn sàn giao dịch',
            loadOptions: loadSourceExchangeOptions,
            loadInitialOptions: loadInitialSourceExchangeOptions,
            enableSearch: true,
          }}
        />
      </Grid>
    )
  }
)

InvestorReconciliationFilter.displayName = 'InvestorReconciliationFilter'

export default InvestorReconciliationFilter
