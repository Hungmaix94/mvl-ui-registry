import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import FormController from '@/components/ui/form/FormController'
import { TransactionSheetApprovalStatus } from '@/constants/api-schema-aliases.ts'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { TRANSACTION_SHEET_STATUS } from '@/features/sales/transaction-sheets/types/transaction-sheet'
import { type TransactionSheetFilterFormData } from '@/features/sales/transaction-sheets/utils/transaction-sheet-filter-params'

export type { TransactionSheetFilterFormData }

export type TransactionSheetFilterRef = {
  getValues: () => TransactionSheetFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: TransactionSheetFilterFormData
  isOpen?: boolean
}

const statusOptions = Object.entries(TRANSACTION_SHEET_STATUS).map(([value, label]) => ({
  value: value as TransactionSheetApprovalStatus,
  label,
}))

export const TransactionSheetFilter = forwardRef<TransactionSheetFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<TransactionSheetFilterFormData>({
      defaultValues: initialValues ?? {},
    })

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect()

    // Reset form values when dialog opens with current filters
    useEffect(() => {
      if (isOpen && initialValues) {
        form.reset(initialValues)
      }
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () => {
        form.reset({
          code: '',
          customer_name: '',
          status: null,
          project: null,
          investor: null,
          has_f2: null,
          dateRange: null,
          createdDateRange: null,
        })
      },
    }))

    return (
      <Grid columns="2" gap="4" className="w-full">
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
          name="has_f2"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Loại giao dịch',
            placeholder: 'Tất cả',
            options: [
              { value: 'true', label: 'Có F2 / Sàn ngoài' },
              { value: 'false', label: 'Nội bộ' },
            ],
          }}
        />
        <div className="col-span-2">
          <FormController
            register={form.register}
            name="dateRange"
            control={form.control}
            Field={DateRangePicker}
            fieldProps={{
              label: 'Khoảng ngày cọc',
              className: 'w-full',
              showQuickSelect: true,
            }}
          />
        </div>
        <div className="col-span-2">
          <FormController
            register={form.register}
            name="createdDateRange"
            control={form.control}
            Field={DateRangePicker}
            fieldProps={{
              label: 'Ngày tạo phiếu',
              className: 'w-full',
              showQuickSelect: true,
            }}
          />
        </div>
      </Grid>
    )
  }
)

TransactionSheetFilter.displayName = 'TransactionSheetFilter'
export default TransactionSheetFilter
