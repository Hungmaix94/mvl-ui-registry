import type { ReactNode } from 'react'

export interface KVProps {
  k: string
  v: ReactNode
  /** Bỏ viền phải — dùng cho ô cuối mỗi hàng của lưới. */
  noBorderR?: boolean
  /** Bỏ viền dưới — dùng cho hàng cuối của lưới. */
  noBorderB?: boolean
}

/**
 * Một ô Key–Value trong lưới thông tin của bảng kê chia hoa hồng.
 *
 * Viền được điều khiển bằng prop thay vì `:last-child` vì lưới đổi số cột theo
 * breakpoint (`grid-cols-1 md:grid-cols-4`) — ô cuối hàng ở desktop lại nằm giữa
 * hàng ở mobile, nên CSS thuần không xác định đúng vị trí mép.
 */
export function KV({ k, v, noBorderR, noBorderB }: KVProps) {
  return (
    <div
      className={`p-3 ${noBorderR ? '' : 'border-r'} ${
        noBorderB ? '' : 'border-b'
      } border-border-1`}
    >
      <div className="text-[11px] font-semibold text-neutral-500">{k}</div>
      <div className="mt-1 text-[14px] font-medium text-neutral-700">{v}</div>
    </div>
  )
}
