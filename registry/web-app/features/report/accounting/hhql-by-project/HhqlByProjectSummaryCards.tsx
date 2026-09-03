import ReportMetricCard, {
  ReportMetricCardGrid,
} from '@/features/report/accounting/_shares/ReportMetricCard'
import { formatPct } from '@/utils/common'

/**
 * Ba con số đầu báo cáo 21.13 — CỐ Ý không ngang vai nhau.
 *
 * Báo cáo trả lời câu "mỗi dự án gánh bao nhiêu hoa hồng quản lý", nên **Tổng cộng là câu trả
 * lời**: nó lên một cỡ chữ, là chỗ DUY NHẤT có màu bão hoà, và khớp đúng dòng TỔNG CỘNG cuối
 * bảng. "Tổng HH quản lý" là phần tính thẳng theo dự án — số tham chiếu để đọc Tổng cộng. "Khối
 * Back-Office" là trục khác hẳn: pool công ty chia pro-rata, nên nó trầm nhất và luôn kèm tỉ
 * trọng để người đọc biết phần ước lượng chiếm bao nhiêu.
 *
 * Hình thẻ dùng chung với 21.10 qua `ReportMetricCard` — xem lý do ở đó.
 */

export type HhqlByProjectSummaryCardsProps = {
  /** Σ `total_mgmt` — hoa hồng quản lý + KPI tính thẳng theo dự án. */
  totalMgmt: number
  /** Σ `grand_total` — khớp dòng TỔNG CỘNG cuối bảng. */
  grandTotal: number
  /** Σ `back_office` — pool công ty chia pro-rata theo doanh thu ghi nhận. */
  backOffice: number
  /** Số dự án đang hiển thị (sau bộ lọc), để phụ đề nói đúng phạm vi của con số. */
  projectCount: number
  isLoading?: boolean
}

export default function HhqlByProjectSummaryCards({
  totalMgmt,
  grandTotal,
  backOffice,
  projectCount,
  isLoading,
}: HhqlByProjectSummaryCardsProps) {
  // Tỉ trọng chỉ suy từ đúng hai con số đang hiển thị ngay cạnh nhau. `grandTotal` = 0 (kỳ chưa
  // có số) mà vẫn chia thì ra "∞%" trên một báo cáo kế toán — mất uy tín ngay.
  const backOfficeRatio = grandTotal > 0 ? (backOffice / grandTotal) * 100 : null

  return (
    <ReportMetricCardGrid>
      <ReportMetricCard
        label="Tổng HH quản lý (Payable)"
        value={totalMgmt}
        hint="Hoa hồng quản lý + KPI tính thẳng theo dự án"
        tone="neutral"
        isLoading={isLoading}
      />
      <ReportMetricCard
        label="Tổng cộng HHQL & Back-Office"
        value={grandTotal}
        hint={
          projectCount === 0
            ? 'Khớp dòng TỔNG CỘNG cuối bảng'
            : `Khớp dòng TỔNG CỘNG cuối bảng · ${projectCount} dự án`
        }
        tone="positive"
        isPrimary
        isLoading={isLoading}
      />
      <ReportMetricCard
        label="Khối Back-Office chia về dự án"
        value={backOffice}
        hint={
          backOfficeRatio === null
            ? 'Pool công ty chia pro-rata theo doanh thu ghi nhận'
            : `Chiếm ${formatPct(backOfficeRatio, 2)} tổng cộng, chia pro-rata theo doanh thu`
        }
        tone="cash"
        isLoading={isLoading}
      />
    </ReportMetricCardGrid>
  )
}
