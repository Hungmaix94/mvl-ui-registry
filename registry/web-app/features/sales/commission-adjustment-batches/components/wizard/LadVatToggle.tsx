import { Flex } from '@radix-ui/themes'
import Switch from '@/components/ui/switch/Switch'

interface LadVatToggleProps {
  /** true = giá trị đã gồm VAT · false/null = chưa gồm. */
  value?: boolean | null
  onChange: (value: boolean) => void
  disabled?: boolean
  /**
   * Hiện nhãn "VAT" phía trên switch. Mặc định `true` (dùng cạnh input trong card F2 — cần nhãn).
   * Đặt `false` khi đã có tiêu đề cột "VAT" (matrix CĐT) để tránh lặp chữ + lệch canh.
   */
  showLabel?: boolean
}

/**
 * VAT gate for the config matrix / F2 cards — a Switch (style mirrors {@link ReconVatToggle}, not the
 * mockup's segmented buttons). ON = include VAT (`is_*_include_vat = true`), OFF = `false`.
 * Trong matrix CĐT đã có tiêu đề cột "VAT" nên truyền `showLabel={false}` (chỉ render switch, canh trái).
 */
export function LadVatToggle({ value, onChange, disabled, showLabel = true }: LadVatToggleProps) {
  const enabled = value === true
  const toggle = (
    <Switch
      tooltip={enabled ? 'Ấn để tắt VAT' : 'Ấn để bật VAT'}
      checked={enabled}
      disabled={disabled}
      onChange={(checked) => onChange(checked)}
    />
  )

  if (!showLabel) return toggle

  return (
    <Flex direction="column" align="center" justify="center" gap="1">
      <span className="typo-body-sm-medium text-content-dark-2">VAT</span>
      {toggle}
    </Flex>
  )
}

export default LadVatToggle
