import { Loading } from '@/components/ui'
import { cn } from '@/utils'

/**
 * Phủ mờ một khối số liệu trong lúc nó đang được ghi lại.
 *
 * Duyệt chi gồm 2 PATCH nối tiếp rồi một lượt tải lại; giữa các bước đó các con số trên màn
 * chưa đáng tin (một phần là số server cũ, một phần là số FE tự tính lại theo dial). Phủ mờ
 * để kế toán không đọc số nửa vời — repo không có primitive overlay nào nên đây là chỗ duy
 * nhất định nghĩa, dùng lại `Loading` chứ không tự vẽ spinner.
 *
 * Bọc trong một `relative` container. `aria-busy` để trình đọc màn hình cũng biết.
 */
export const BusyOverlay = ({
  busy,
  message = 'Đang cập nhật số liệu…',
  className,
}: {
  busy: boolean
  message?: string
  className?: string
}) => {
  if (!busy) return null
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'bg-background-1/70 absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded',
        className
      )}
    >
      <Loading size="md" />
      <span className="typo-body-sm-regular text-content-dark-2">{message}</span>
    </div>
  )
}

/**
 * Nhãn "số tạm tính": dial trên màn khác số đã lưu ở server, nên các ô tiền đang là số FE
 * nhân chia lại (`effectivePositions`), chưa phải số server. Không có nhãn này thì kế toán
 * không có cách nào biết mình đang xem số nào — đúng phàn nàn "số FE tự tính, nhìn rất rối".
 */
export const ProvisionalBadge = ({
  storedLabel,
  onCommit,
  disabled,
}: {
  storedLabel: string
  onCommit?: () => void
  disabled?: boolean
}) => (
  <span className="inline-flex flex-wrap items-center gap-2">
    <span
      className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#92400E]"
      title="Dial % trên màn khác số đã lưu ở server — các ô tiền đang là số tạm tính phía giao diện. Chốt tiến độ để lưu."
    >
      ⚠ Số tạm tính — chưa chốt
    </span>
    <span className="text-[11px] whitespace-nowrap text-neutral-500">
      Đã lưu ở server: {storedLabel}
    </span>
    {onCommit && (
      <button
        type="button"
        onClick={onCommit}
        disabled={disabled}
        className="text-[11px] font-medium text-blue-600 underline disabled:cursor-not-allowed disabled:text-neutral-400"
      >
        Chốt tiến độ
      </button>
    )}
  </span>
)
