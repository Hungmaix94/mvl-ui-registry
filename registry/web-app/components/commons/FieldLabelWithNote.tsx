import type { ReactNode } from 'react'

export interface FieldLabelWithNoteProps {
  /** Phần nhãn chính — giữ nguyên cỡ chữ của field label. */
  label: ReactNode
  /** Ghi chú làm rõ — hiển thị cỡ chữ nhỏ + màu nhạt dưới nhãn. Truyền spacer ẩn để căn cao với field kế bên. */
  note: ReactNode
}

/**
 * Nhãn field 2 tầng: phần chính giữ cỡ chữ gốc; phần ghi chú trong ngoặc nhỏ
 * và nhạt hơn để không lấn át nhãn chính. Truyền vào prop `label` của
 * TextField / FormCombinedRateField / FormMoneyPercentField (đều nhận ReactNode).
 */
export function FieldLabelWithNote({ label, note }: FieldLabelWithNoteProps) {
  return (
    <span className="flex flex-col gap-0.5">
      <span>{label}</span>
      <span className="typo-body-sm-regular text-content-dark-3 font-normal">{note}</span>
    </span>
  )
}

export default FieldLabelWithNote
