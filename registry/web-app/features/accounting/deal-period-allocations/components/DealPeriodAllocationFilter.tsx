import { forwardRef, useImperativeHandle } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Select } from '@/components/ui'
import { useDealSelect } from '@/hooks/useDealSelect'
import { useReceiptVoucherLineSelect } from '@/hooks/useReceiptVoucherLineSelect'
import { useReceiptVoucherSelect } from '@/hooks/useReceiptVoucherSelect'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useProductInventorySelect } from '@/hooks/useProductInventorySelect'
import { useWorksheetStatusOptions } from '@/features/accounting/commission-splits/components/WorksheetStatusChip'
import { DIAL_DEVIATES_OPTIONS } from '@/features/accounting/deal-period-allocations/constants/approval-filters'

export type DealPeriodAllocationFilterFormData = {
  // Trạng thái duyệt của Thư ký — vòng đời bảng kê. Gửi lên API là `worksheet_status`,
  // KHÔNG phải `status` (bug 86ey45799: `status` lọc trạng thái từng dòng phân bổ).
  worksheet_status?: string | null
  deal?: string | null
  receipt_voucher_line?: string | null
  receipt_voucher?: string | null
  has_commission_payable?: string | null
  project?: string | null
  product_inventory?: string | null
  // Duyệt lệch tiền về của Kế toán — điều kiện lọc RỜI, độc lập với `worksheet_status`
  // (CR STT20 86eydc3ec). true = dial % chi trả kế toán chốt khác (2dp) với auto-default
  // theo tiền thu; false gộp cả "chưa ghim"/legacy nên muốn đúng nghĩa "KT duyệt luôn theo
  // Thư ký" thì phải chọn kèm trạng thái "KT đã duyệt thực nhận" — đừng tự suy ở FE.
  dial_deviates?: string | null
}

export type DealPeriodAllocationFilterRef = {
  getValues: () => DealPeriodAllocationFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: DealPeriodAllocationFilterFormData
  hidePayableFilter?: boolean
}

const PAYABLE_OPTIONS = [
  { value: 'true', label: 'Đã chia' },
  { value: 'false', label: 'Chưa chia' },
]

const DealPeriodAllocationFilter = forwardRef<DealPeriodAllocationFilterRef, Props>(
  ({ initialValues, hidePayableFilter = false }, ref) => {
    const { control, getValues, reset } = useForm<DealPeriodAllocationFilterFormData>({
      defaultValues: initialValues ?? {},
    })

    // Nhãn 4 trạng thái vòng đời lấy lại từ WorksheetStatusChip (nay đọc thẳng
    // app-constant của BE) để dropdown và cột "Trạng thái duyệt" không bao giờ lệch
    // chữ nhau (bug 86ey45799).
    const STATUS_OPTIONS = useWorksheetStatusOptions()

    const { loadDealOptions, loadInitialDealOptions } = useDealSelect()
    const { loadReceiptVoucherLineOptions, loadInitialReceiptVoucherLineOptions } =
      useReceiptVoucherLineSelect()
    const { loadReceiptVoucherOptions, loadInitialReceiptVoucherOptions } =
      useReceiptVoucherSelect()
    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
    const { loadProductInventoryOptions, loadInitialProductInventoryOptions } =
      useProductInventorySelect()

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      clearForm: () =>
        reset({
          worksheet_status: null,
          deal: null,
          receipt_voucher_line: null,
          receipt_voucher: null,
          has_commission_payable: null,
          project: null,
          product_inventory: null,
          dial_deviates: null,
        }),
    }))

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          name="project"
          control={control}
          render={({ field }) => (
            <Select
              label="Dự án"
              value={field.value ?? undefined}
              onChange={(val) => field.onChange(val ?? null)}
              placeholder="Chọn dự án"
              loadOptions={loadProjectOptions}
              loadInitialOptions={loadInitialProjectOptions}
              enableSearch
              clearable
            />
          )}
        />
        <Controller
          name="product_inventory"
          control={control}
          render={({ field }) => (
            <Select
              label="Mã căn"
              value={field.value ?? undefined}
              onChange={(val) => field.onChange(val ?? null)}
              placeholder="Chọn mã căn"
              loadOptions={loadProductInventoryOptions}
              loadInitialOptions={loadInitialProductInventoryOptions}
              enableSearch
              clearable
            />
          )}
        />
        <Controller
          name="deal"
          control={control}
          render={({ field }) => (
            <Select
              label="Giao dịch"
              value={field.value ?? undefined}
              onChange={(val) => field.onChange(val ?? null)}
              placeholder="Chọn giao dịch"
              loadOptions={loadDealOptions}
              loadInitialOptions={loadInitialDealOptions}
              enableSearch
              clearable
            />
          )}
        />
        <Controller
          name="receipt_voucher"
          control={control}
          render={({ field }) => (
            <Select
              label="Phiếu Thu"
              value={field.value ?? undefined}
              onChange={(val) => field.onChange(val ?? null)}
              placeholder="Chọn phiếu thu"
              loadOptions={loadReceiptVoucherOptions}
              loadInitialOptions={loadInitialReceiptVoucherOptions}
              enableSearch
              clearable
            />
          )}
        />
        <Controller
          name="receipt_voucher_line"
          control={control}
          render={({ field }) => (
            <Select
              label="Dòng Phiếu Thu"
              value={field.value ?? undefined}
              onChange={(val) => field.onChange(val ?? null)}
              placeholder="Chọn dòng phiếu thu"
              loadOptions={loadReceiptVoucherLineOptions}
              loadInitialOptions={loadInitialReceiptVoucherLineOptions}
              enableSearch
              clearable
            />
          )}
        />
        <Controller
          name="worksheet_status"
          control={control}
          render={({ field }) => (
            <Select
              label="Trạng thái duyệt"
              value={field.value ?? undefined}
              onChange={(val) => field.onChange(val ?? null)}
              options={STATUS_OPTIONS}
              placeholder="Tất cả trạng thái"
              clearable
            />
          )}
        />
        <Controller
          name="dial_deviates"
          control={control}
          render={({ field }) => (
            <Select
              label="Duyệt lệch tiền về"
              value={field.value ?? undefined}
              onChange={(val) => field.onChange(val ?? null)}
              options={DIAL_DEVIATES_OPTIONS}
              placeholder="Tất cả"
              clearable
            />
          )}
        />
        {!hidePayableFilter && (
          <Controller
            name="has_commission_payable"
            control={control}
            render={({ field }) => (
              <Select
                label="Chia thực nhận"
                value={field.value ?? undefined}
                onChange={(val) => field.onChange(val ?? null)}
                options={PAYABLE_OPTIONS}
                placeholder="Tất cả"
                clearable
              />
            )}
          />
        )}
      </div>
    )
  }
)

DealPeriodAllocationFilter.displayName = 'DealPeriodAllocationFilter'

export default DealPeriodAllocationFilter
