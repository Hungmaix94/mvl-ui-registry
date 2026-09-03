import { Flex } from '@radix-ui/themes'

import Switch from '@/components/ui/switch/Switch'
import { INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

import { useReconMode } from '@/features/sales/_shared/reconciliation/ReconModeContext'

export interface ReconVatToggleProps {
  /** Cờ `is_*_include_vat` của RIÊNG mục này — `true` ⇒ số nhập của mục đã gồm VAT. */
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  direction?: 'row' | 'column'
  /** `true` ⇒ hiển thị nhãn "VAT" SAU pill (mặc định: trước pill). */
  labelAfter?: boolean
}

/**
 * Công tắc VAT theo TỪNG MỤC (per-field). Mỗi mục (HH theo HĐPP / Thưởng / Phí tăng thêm / Khấu trừ)
 * có một toggle riêng gắn với cờ `is_*_include_vat` của mục đó:
 * - ON  → số nhập của mục được hiểu là ĐÃ GỒM VAT ⇒ NET = số / (1 + 10%);
 * - OFF → số nhập CHƯA gồm VAT ⇒ NET = số nhập; Phải thu (gồm VAT) = số nhập × (1 + 10%).
 * Mức VAT cố định 10% ({@link INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE}) LUÔN áp dụng cho căn —
 * cờ chỉ quyết định số nhập đã gồm VAT hay chưa, KHÔNG bật/tắt VAT của căn.
 */
function ReconVatToggle({
  checked,
  onChange,
  disabled,
  direction,
  labelAfter,
}: ReconVatToggleProps) {
  const { isReadOnly } = useReconMode()
  const isDisabled = disabled || isReadOnly

  if (isReadOnly) {
    return (
      <span className="typo-body-sm-medium text-content-dark-1">
        {checked ? `Gồm VAT (${INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE}%)` : 'Chưa gồm VAT'}
      </span>
    )
  }

  const labelNode = <span className="typo-body-sm-medium text-content-dark-2">VAT</span>
  const switchNode = (
    <Switch
      tooltip={
        checked ? 'Ấn nếu số nhập của mục CHƯA gồm VAT' : 'Ấn để tính mục này đã gồm VAT (10%)'
      }
      checked={checked}
      disabled={isDisabled}
      onChange={(next) => onChange(next)}
    />
  )

  return (
    <Flex direction={direction ?? 'row'} align="center" gap="2">
      {labelAfter ? (
        <>
          {switchNode}
          {labelNode}
        </>
      ) : (
        <>
          {labelNode}
          {switchNode}
        </>
      )}
    </Flex>
  )
}

export default ReconVatToggle
