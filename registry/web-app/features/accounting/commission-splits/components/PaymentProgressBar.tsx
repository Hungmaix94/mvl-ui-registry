import { cn } from '@/utils'
import { formatPctFloor } from '@/utils/common'

/**
 * Thanh tiến độ thanh toán luỹ kế của căn (Mục ③ màn Chia HH sale).
 *
 * Theo đúng pattern thanh tiến độ của màn Đối chiếu CĐT v2.0
 * (`features/sales/_shared/reconciliation/ReconDualProgress.tsx` và
 * `investor-reconciliations-v2/.../InvestorReconciliationUnitLedger.tsx`):
 *
 *   - ĐÃ ĐẠT ĐƯỢC (các kỳ đã duyệt chi) = màu ĐẬM.
 *   - TĂNG THÊM KỲ NÀY (đang chỉnh dial, chưa chốt) = màu NHẠT cùng tông.
 *   - clampPct mọi giá trị: % ngoài [0,100] không được phép bẻ layout.
 *   - Track dùng token `bg-background-3`, không hardcode hex.
 *   - role="img" + aria-label: thanh màu là dữ liệu, screen reader phải đọc được.
 *
 * Bản cũ làm NGƯỢC: phần đã thu bị `opacity: .55` nên chìm vào nền, còn kỳ đang xem
 * lại tô đậm nhất. Thanh đọc thành "một dải trôi nổi giữa chừng" thay vì "luỹ kế đã
 * đi được bao nhiêu" — phản ánh sai tiến độ. Bản cũ cũng dùng flex + `width: %`, nên
 * khi tổng vượt 100% các đoạn bị flex-shrink bóp lại im lặng: thanh nói dối.
 */
/**
 * Chỉ HAI sắc độ, đúng như ReconDualProgress của Đối chiếu CĐT v2.0.
 *
 * Bản cũ có sắc thứ ba tô theo `alloc.status` (vòng đời DUYỆT CHI cho nhân sự) trong khi
 * thanh này đo TIẾN ĐỘ THU TIỀN TỪ CĐT — hai khái niệm khác nhau. Hậu quả: kỳ đã thu
 * 29,29% nhưng bảng kê chưa duyệt chi bị tô xám nhạt, đọc thành "chưa thu đồng nào".
 * Tiền CĐT đã về rồi thì đã về, không phụ thuộc việc kế toán đã duyệt chi cho ai hay chưa.
 */
export type PaymentProgressSegmentKind =
  /** Kỳ khác kỳ đang xem — % đã lưu trên server, không đổi khi kéo dial. */
  | 'settled'
  /** Kỳ đang xem — % bám dial trên màn, chưa chốt. */
  | 'current'

export interface PaymentProgressSegment {
  key: string
  /** Nhãn tooltip, ví dụ "Kỳ 07/2026". */
  label: string
  /** % tiền về của căn thuộc kỳ này. */
  pct: number
  kind: PaymentProgressSegmentKind
}

export interface PaymentProgressBarProps {
  segments: PaymentProgressSegment[]
  /** Luỹ kế hết kỳ đang xem (%) — nhãn bên phải, do caller tính. */
  cumulativePct: number
}

/** % ngoài [0,100] hoặc không phải số hữu hạn → 0. Giống clampPct của Đối chiếu CĐT v2.0. */
export function clampPct(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export interface PlacedSegment extends PaymentProgressSegment {
  /** Mốc bắt đầu trên thanh (%). */
  left: number
  /** Bề rộng thực vẽ (%), đã cắt để left + width không vượt 100. */
  width: number
  /** % thật của kỳ sau clamp, TRƯỚC khi cắt ở mốc 100 — dùng cho tooltip. */
  actualPct: number
}

/**
 * Xếp các kỳ nối tiếp nhau từ mốc 0. Cắt cứng ở 100% thay vì để flex bóp đều mọi đoạn:
 * tổng vượt trần là dữ liệu sai, phải thấy nó chạm mép chứ không phải thấy mọi kỳ cùng
 * teo lại một cách hợp lý giả tạo.
 */
export function layoutSegments(segments: PaymentProgressSegment[]): PlacedSegment[] {
  let offset = 0
  const placed: PlacedSegment[] = []

  for (const segment of segments) {
    const pct = clampPct(segment.pct)
    const left = offset
    const width = Math.max(0, Math.min(pct, 100 - left))
    if (width > 0) placed.push({ ...segment, left, width, actualPct: pct })
    offset = Math.min(100, left + pct)
  }

  return placed
}

/**
 * Hai sắc cùng thang ĐỎ — màu primary của màn — thay cho cặp xanh info cũ:
 * đỏ đậm cho phần đã chốt, đỏ nhạt cho kỳ đang xem. Cùng thang nên vẫn đọc được là
 * "một đại lượng, hai giai đoạn", khác thang thì thành hai đại lượng khác nhau.
 */
const FILL_CLASS: Record<PaymentProgressSegmentKind, string> = {
  settled: 'bg-action-primary-red-default',
  current: 'bg-red-30',
}

/** Gạch chéo mờ: đánh dấu "số tạm tính theo dial, chưa chốt". */
const PROVISIONAL_HATCH =
  'repeating-linear-gradient(45deg, rgba(255,255,255,.45) 0 6px, transparent 6px 12px)'

function LegendItem({
  swatchClass,
  label,
  value,
  emphasis,
}: {
  swatchClass: string
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-2 shrink-0 rounded-[3px]', swatchClass)} />
      <span className="text-[11px] text-neutral-500">{label}</span>
      <span
        className={cn(
          'text-[11px] font-semibold',
          emphasis ? 'text-neutral-900' : 'text-neutral-600'
        )}
      >
        {value}
      </span>
    </span>
  )
}

export function PaymentProgressBar({ segments, cumulativePct }: PaymentProgressBarProps) {
  const placed = layoutSegments(segments)

  const sumOf = (kind: PaymentProgressSegmentKind) =>
    placed.filter((s) => s.kind === kind).reduce((total, s) => total + s.width, 0)

  const settled = sumOf('settled')
  const current = sumOf('current')
  const remaining = Math.max(0, 100 - (settled + current))

  return (
    <div className="px-5 py-2">
      <div
        role="img"
        aria-label={`Lũy kế trước kỳ ${formatPctFloor(settled, 2)}, kỳ này ${formatPctFloor(
          current,
          2
        )}, còn lại ${formatPctFloor(remaining, 2)}`}
        className="bg-background-3 border-border-1 relative h-2.5 w-full overflow-hidden rounded-full border"
      >
        {placed.map((segment) => (
          <div
            key={segment.key}
            // Các đoạn màu là div trang trí, không có role truy vấn được. Gắn testid để test
            // đọc chúng qua Testing Library thay vì lần theo `.children` của thanh (rule
            // testing-library/no-node-access) — thứ sẽ vỡ ngay khi thêm một lớp bọc.
            data-testid="payment-progress-segment"
            style={{
              left: `${segment.left}%`,
              width: `${segment.width}%`,
              backgroundImage: segment.kind === 'current' ? PROVISIONAL_HATCH : undefined,
            }}
            className={cn(
              'absolute top-0 h-full',
              FILL_CLASS[segment.kind],
              // Vạch trắng lót vào trong: tách đoạn khỏi đoạn trước mà KHÔNG ăn bề rộng.
              // Bản cũ dùng border-r-2 nên mỗi kỳ bị hụt 2px so với % thật.
              segment.left > 0 && 'shadow-[inset_2px_0_0_var(--color-content-light-1)]'
            )}
            // Tooltip nói % THẬT của kỳ, không phải bề rộng đã cắt: đoạn bị cắt ở mốc
            // 100 là dấu hiệu dữ liệu tràn, hover phải đọc ra con số gây tràn.
            title={`${segment.label}: ${formatPctFloor(segment.actualPct, 2)}`}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <LegendItem
            swatchClass={FILL_CLASS.settled}
            label="Lũy kế trước kỳ"
            value={formatPctFloor(settled, 2)}
          />
          <LegendItem
            swatchClass={FILL_CLASS.current}
            label="Kỳ này (tạm tính)"
            value={formatPctFloor(current, 2)}
            emphasis={current > 0}
          />
          <LegendItem
            swatchClass="bg-background-3 border-border-1 border"
            label="Còn lại"
            value={formatPctFloor(remaining, 2)}
          />
        </div>

        <span className="text-[11px] font-medium text-neutral-400">
          Lũy kế hết kỳ hiện tại:{' '}
          <span className="text-data-green-default font-semibold">
            {formatPctFloor(cumulativePct, 2)}
          </span>
        </span>
      </div>
    </div>
  )
}
