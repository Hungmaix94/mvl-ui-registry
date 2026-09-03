import type { CSSProperties } from 'react'
import { cn } from '@/utils'

/**
 * `style` để nơi gọi đặt được kích thước tính từ hằng số bố cục của khối thật (vd
 * `RANKED_BAR_LAYOUT.ROW_HEIGHT`) — thứ không viết ra được bằng class Tailwind tĩnh.
 */
type SkeletonPieceProps = {
  className?: string
  style?: CSSProperties
  /** Để test bám vào — khung xương `aria-hidden` nên không có role nào query được. */
  'data-testid'?: string
}

/**
 * Thanh xám thay cho MỘT ô dữ liệu đang tải, có dải sáng quét ngang.
 *
 * Quét ngang chứ không nhấp nháy: `animate-pulse` làm mọi thanh trên màn cùng mờ đi rồi cùng
 * sáng lại, đọc ra như giao diện đang lỗi. Một dải chạy theo một hướng thì đọc ra "còn đang
 * chạy". Chi tiết hiệu ứng + nhánh `prefers-reduced-motion` nằm ở `assets/styles/index.css`.
 */
export const SkeletonBar = ({ className, style, ...rest }: SkeletonPieceProps) => (
  <span
    aria-hidden
    style={style}
    className={cn('bg-background-3 skeleton-shimmer block h-3 rounded', className)}
    {...rest}
  />
)

/** Khối chữ nhật rỗng (ô số, ô biểu tượng, thẻ…) — cùng chất liệu với `SkeletonBar`. */
export const SkeletonBox = ({ className, style, ...rest }: SkeletonPieceProps) => (
  <span
    aria-hidden
    style={style}
    className={cn('bg-background-3 skeleton-shimmer block rounded', className)}
    {...rest}
  />
)

/**
 * Các dòng giả cho `<tbody>` trong lúc bảng đang tải.
 *
 * Dùng cái này thay vì để bảng rơi vào nhánh "Chưa có dữ liệu": đang tải mà hiện empty state
 * là NÓI SAI — người dùng đọc thành "giao dịch này không có dữ liệu" rồi đi báo lỗi. Khung
 * xương còn giữ đúng chiều cao bảng nên trang không giật khi dữ liệu về.
 *
 * Đặt `aria-hidden` ở từng thanh và `aria-busy` ở hàng để trình đọc màn hình không đọc ra
 * một bảng rỗng giả.
 */
export const TableSkeletonRows = ({
  rows = 3,
  cols,
  cellClassName,
}: {
  rows?: number
  cols: number
  cellClassName?: string
}) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} aria-busy="true" className="border-border-1 border-b">
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c} className={cn('px-4 py-3', cellClassName)}>
            {/* Cột đầu thường là nhãn nên để thanh dài hơn — khung xương giống bảng thật
                thì mắt không phải "học lại" bố cục lúc dữ liệu về. */}
            <SkeletonBar className={c === 0 ? 'w-28' : 'w-16'} />
          </td>
        ))}
      </tr>
    ))}
  </>
)

/** Khối khung xương cho vùng KHÔNG phải bảng (thẻ số liệu, dải suy diễn…). */
export const SkeletonBlock = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div aria-busy="true" className={cn('flex flex-col gap-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBar key={i} className={i === lines - 1 ? 'w-1/2' : 'w-full'} />
    ))}
  </div>
)
