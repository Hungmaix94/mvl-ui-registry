import ReportMetricCard, {
  ReportMetricCardGrid,
} from '@/features/report/accounting/_shares/ReportMetricCard'
import { formatPct } from '@/utils/common'

/**
 * Ba con số đầu báo cáo 21.10 — CỐ Ý không ngang vai nhau.
 *
 * Báo cáo tên là "theo người THỰC NHẬN", nên **Net là câu trả lời**: nó được lên một cỡ chữ và
 * là chỗ DUY NHẤT có màu bão hoà. Gross là số tham chiếu để đọc Net, còn "HH đã chi thực tế" là
 * một trục khác hẳn (tiền mặt đã giải ngân, dùng để đối soát) nên được để trầm nhất.
 *
 * Hình thẻ dùng chung với 21.13 qua `ReportMetricCard` — xem lý do ở đó.
 */

export type IncomeByRecipientSummaryCardsProps = {
  gross: number
  net: number
  commissionActualPaid: number
  isLoading?: boolean
}

export default function IncomeByRecipientSummaryCards({
  gross,
  net,
  commissionActualPaid,
  isLoading,
}: IncomeByRecipientSummaryCardsProps) {
  // Tỉ lệ chỉ suy từ đúng hai con số đang hiển thị ngay cạnh nó — không khẳng định đã trừ những
  // khoản gì (theo SRS, net còn trừ cả tạm giữ và tạm ứng, không riêng BHXH + thuế).
  const netRatio = gross > 0 ? (net / gross) * 100 : null

  return (
    <ReportMetricCardGrid>
      <ReportMetricCard
        label="Tổng thu nhập trước thuế (Gross)"
        value={gross}
        hint="Lương và hoa hồng trước thuế của kỳ"
        tone="neutral"
        isLoading={isLoading}
      />
      <ReportMetricCard
        label="Tổng thực nhận (Net)"
        value={net}
        hint={
          netRatio === null
            ? 'Sau BHXH, thuế TNCN, tạm giữ và tạm ứng'
            : `Bằng ${formatPct(netRatio, 2)} tổng thu nhập trước thuế`
        }
        tone="positive"
        isPrimary
        isLoading={isLoading}
      />
      <ReportMetricCard
        label="Hoa hồng đã chi thực tế"
        value={commissionActualPaid}
        hint="Tiền hoa hồng đã giải ngân trong kỳ"
        tone="cash"
        isLoading={isLoading}
      />
    </ReportMetricCardGrid>
  )
}
