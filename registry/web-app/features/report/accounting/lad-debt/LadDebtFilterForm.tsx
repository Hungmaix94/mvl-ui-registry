import { forwardRef, useEffect, useMemo } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Checkbox, Select } from '@/components/ui'
import type { SelectProps } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'
import { useFilterFormHandle, type FilterFormHandle } from '@/hooks/useFilterFormHandle'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useDealSelect } from '@/hooks/useDealSelect'
import { LadDebtRateSource } from '@/constants/api-schema-aliases'
import {
  LAD_DEBT_DEFAULT_FILTER_VALUES,
  RATE_SOURCE_LABELS,
  type LadDebtFilterValues,
} from '@/features/report/accounting/lad-debt/lad-debt-filters'

export type LadDebtFilterFormRef = FilterFormHandle<LadDebtFilterValues>

type Props = {
  initialValues?: LadDebtFilterValues
}

const RATE_SOURCE_OPTIONS = [
  { label: 'Tất cả', value: '' },
  ...Object.values(LadDebtRateSource).map((value) => ({
    label: RATE_SOURCE_LABELS[value],
    value,
  })),
]

/**
 * Bộ lọc dialog cho báo cáo 21.5, dùng chung cho cả 2 tab. `deal_id`/`rate_source` chỉ có tác
 * dụng ở tab "Theo giao dịch" — BE bỏ qua khi ở tab "Tổng theo dự án" (D9), nên vẫn hiển thị
 * chung một dialog để đỡ 2 bộ lọc trùng phần lớn field.
 */
const LadDebtFilterForm = forwardRef<LadDebtFilterFormRef, Props>(({ initialValues }, ref) => {
  const form = useForm<LadDebtFilterValues>({
    defaultValues: { ...LAD_DEBT_DEFAULT_FILTER_VALUES, ...initialValues },
  })
  const { control, register, reset, getValues, watch } = form

  useFilterFormHandle(ref, {
    reset,
    getValues,
    emptyValues: LAD_DEBT_DEFAULT_FILTER_VALUES,
  })

  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect()
  const projectId = watch('projectId')
  const dealSelect = useDealSelect(
    useMemo(() => ({ projectId: projectId ?? undefined }), [projectId])
  )

  // Dự án là cha của giao dịch: đổi dự án thì bỏ giao dịch đã chọn (không còn thuộc dự án mới).
  const initialProjectId = initialValues?.projectId ?? null
  useEffect(() => {
    if (projectId !== initialProjectId) reset((prev) => ({ ...prev, dealId: null }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return (
    <FormProvider {...form}>
      <div className="grid w-full grid-cols-1 gap-4">
        <FormController<LadDebtFilterValues, React.ComponentProps<typeof Select>>
          register={register}
          control={control}
          name="projectId"
          Field={Select}
          fieldProps={{
            label: 'Dự án',
            placeholder: 'Tất cả dự án',
            loadOptions: loadProjectOptions,
            loadInitialOptions: loadInitialProjectOptions,
            enableSearch: true,
            clearable: true,
          }}
        />

        <FormController<LadDebtFilterValues, React.ComponentProps<typeof Select>>
          register={register}
          control={control}
          name="investorId"
          Field={Select}
          fieldProps={{
            label: 'Chủ đầu tư',
            placeholder: 'Tất cả chủ đầu tư',
            loadOptions: loadInvestorOptions,
            loadInitialOptions: loadInitialInvestorOptions,
            enableSearch: true,
            clearable: true,
          }}
        />

        <FormController<LadDebtFilterValues, React.ComponentProps<typeof Select>>
          key={`lad-debt-deal-${projectId ?? ''}`}
          register={register}
          control={control}
          name="dealId"
          Field={Select}
          fieldProps={{
            label: 'Giao dịch (chỉ áp dụng tab "Theo giao dịch")',
            placeholder: 'Tất cả giao dịch',
            loadOptions: dealSelect.loadDealOptions,
            loadInitialOptions: dealSelect.loadInitialDealOptions,
            enableSearch: true,
            clearable: true,
          }}
        />

        <FormController<LadDebtFilterValues, SelectProps<{ label: string; value: string }>>
          register={register}
          control={control}
          name="rateSource"
          Field={Select}
          fieldProps={{
            label: 'Nguồn mức phí (chỉ áp dụng tab "Theo giao dịch")',
            placeholder: 'Tất cả',
            options: RATE_SOURCE_OPTIONS,
          }}
        />

        <div className="flex w-full flex-col gap-2">
          <span className="typo-body-base-semibold text-neutral-90">Còn nợ</span>
          <FormController<LadDebtFilterValues, React.ComponentProps<typeof Checkbox>>
            register={register}
            control={control}
            name="hasOutstanding"
            Field={Checkbox}
            fieldProps={{ label: 'Chỉ hiện dòng còn công nợ (khác 0)' }}
          />
        </div>
      </div>
    </FormProvider>
  )
})

LadDebtFilterForm.displayName = 'LadDebtFilterForm'

export default LadDebtFilterForm
