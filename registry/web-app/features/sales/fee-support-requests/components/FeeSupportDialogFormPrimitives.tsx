import { type ReactNode } from 'react'

/** Nhãn + phụ đề cho một hàng nhập kênh hỗ trợ — dùng chung dialog tạo/sửa phiếu. */
export function ChannelRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="border-border-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b py-4">
      <div className="min-w-[220px] flex-1">
        <div className="typo-body-base-semibold text-content-dark-1">{label}</div>
        {hint && <div className="typo-body-sm-regular text-content-dark-3 mt-0.5">{hint}</div>}
      </div>
      <div className="w-full max-w-[280px]">{children}</div>
    </div>
  )
}

/** Ô thông tin chỉ-xem trên header dialog — dùng chung dialog tạo/sửa phiếu. */
export function ReadonlyInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="typo-body-sm-regular text-content-dark-3">{label}</div>
      <div className="typo-body-base-semibold text-content-dark-1 mt-0.5">{value || '—'}</div>
    </div>
  )
}
