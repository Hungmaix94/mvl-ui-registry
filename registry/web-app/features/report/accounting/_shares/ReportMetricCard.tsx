import { cn, formatCurrencyVND } from '@/utils'

/**
 * Một thẻ chỉ số tiền cho cụm số đầu màn báo cáo kế toán.
 *
 * Dựng cho 21.10 (thu nhập theo người thực nhận) rồi 21.13 (HHQL theo dự án) chép lại nguyên
 * xi — nên gom về một chỗ trước khi nó kịp trôi khỏi nhau. Hai màn báo cáo cạnh nhau phải đọc
 * như một hệ, mà cách chắc nhất để chúng đọc như một hệ là chúng CÙNG một component.
 *
 * Ngôn ngữ hình: màu rút về một vạch mảnh bên trái, không tô nền cả thẻ. Bản đầu là những hộp
 * pastel xanh/lục/hổ phách bằng nhau — ba màu bão hoà cạnh một bảng dữ liệu dày thì vừa ồn vừa
 * không nói được cái gì quan trọng hơn cái gì, lại còn hardcode bảng màu Tailwind thô (xem
 * [AGENTS.md](../../../../../AGENTS.md) § Styling). Ở đây màu lấy từ design token.
 *
 * Thứ bậc do `isPrimary` quyết định, không do màu: đúng MỘT thẻ trong cụm được lên cỡ chữ, và
 * đó phải là thẻ trả lời câu hỏi của báo cáo.
 */

export type ReportMetricTone = 'neutral' | 'positive' | 'cash'

/** Vạch màu bên trái: dấu hiệu nhận dạng chỉ số, không phải trang trí nền. */
const RAIL_BY_TONE: Record<ReportMetricTone, string> = {
  neutral: 'bg-border-2',
  positive: 'bg-data-green-default',
  cash: 'bg-data-orange-default',
}

/** Chỉ số chủ đạo được tô màu; số còn lại đi thang xám để thứ bậc đọc được ngay từ xa. */
const VALUE_BY_TONE: Record<ReportMetricTone, string> = {
  neutral: 'text-content-dark-1',
  positive: 'text-data-green-default',
  cash: 'text-content-dark-2',
}

export type ReportMetricCardProps = {
  label: string
  value: number
  hint: string
  tone: ReportMetricTone
  /** Số chủ đạo của cụm — lên một cỡ chữ. Chỉ nên có đúng một thẻ bật cờ này. */
  isPrimary?: boolean
  isLoading?: boolean
}

export default function ReportMetricCard({
  label,
  value,
  hint,
  tone,
  isPrimary,
  isLoading,
}: ReportMetricCardProps) {
  return (
    <div className="border-border-1 bg-background-1 relative overflow-hidden rounded-lg border py-3.5 pr-4 pl-5 shadow-sm">
      <span className={cn('absolute inset-y-0 left-0 w-1', RAIL_BY_TONE[tone])} aria-hidden />

      <dt className="typo-body-xs-medium text-content-dark-3 tracking-wide uppercase">{label}</dt>

      {isLoading ? (
        // Khối giữ chỗ đúng chiều cao dòng số: nhảy layout khi số về là thứ người dùng thấy
        // trước cả con số.
        <div
          className={cn(
            'bg-background-3 mt-1.5 animate-pulse rounded',
            isPrimary ? 'h-7 w-40' : 'h-6 w-32'
          )}
        />
      ) : (
        <dd
          className={cn(
            // KHÔNG `truncate`: một con số tiền bị cắt thành "316.225...." là thông tin sai, tệ
            // hơn hẳn việc thẻ cao thêm một dòng. Bề rộng tối thiểu của cột lưới đủ chỗ một dòng
            // cho số tới hàng trăm tỉ — quá tầm đó thì thà tràn còn hơn nói dối.
            'mt-1 whitespace-nowrap tabular-nums',
            isPrimary ? 'typo-h5' : 'typo-body-xl-semibold',
            VALUE_BY_TONE[tone]
          )}
        >
          {formatCurrencyVND(value)}
        </dd>
      )}

      <dd className="typo-body-xs-regular text-content-dark-3 mt-1">{hint}</dd>
    </div>
  )
}

/**
 * Lưới cho cụm thẻ chỉ số.
 *
 * `dl`: đây là danh sách nhãn → giá trị, trình đọc màn hình cần biết ô nào thuộc nhãn nào.
 *
 * Cột co giãn theo bề rộng THẬT của container, không theo breakpoint viewport: sidebar ăn
 * ~230px nên `md:grid-cols-3` từng cho ra ba cột 167px ở màn 844px — hẹp hơn cả con số bên
 * trong, và số bị cắt cụt. `auto-fit` tự bớt cột khi chỗ không đủ, kể cả lúc mở/thu sidebar.
 */
export function ReportMetricCardGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-3">{children}</dl>
}
