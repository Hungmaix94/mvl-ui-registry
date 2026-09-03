import { FC } from 'react'

export interface SummaryCardProps {
  label: string
  value: string | number
  color?: string
  /** Chú thích nhỏ dưới con số — dùng khi phạm vi của thẻ khác phạm vi của bảng bên dưới. */
  note?: string
}

export const SummaryCard: FC<SummaryCardProps> = ({
  label,
  value,
  color = 'text-gray-900',
  note,
}) => (
  <div className="p-4">
    <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">{label}</div>
    <div className={`mt-1 text-lg font-bold ${color}`}>{value}</div>
    {note && <div className="mt-0.5 text-[11px] text-gray-500">{note}</div>}
  </div>
)

export default SummaryCard
