import { formatCurrencyVND, formatNumber } from '@/utils/common'

/**
 * CR STT39 — dải suy diễn của Mục ④ "Căn hộ & Chia thực nhận".
 *
 * Một dòng, đọc trái→phải là chuỗi suy diễn của bảng kê:
 *
 *   CƠ SỞ TÍNH  →  KỲ NÀY
 *   (tính trên cái gì)  (ra bao nhiêu)
 *
 * Ba ô bên trái vốn là nửa dưới của Mục ① "Căn hộ & Hóa đơn" — thẻ riêng ở đầu trang
 * đã bỏ, nội dung gộp hẳn vào Mục ④. Ba ô bên phải là KPI kỳ này vốn có của Mục ④.
 *
 * "Giá trị căn hộ tạm tính" bị bỏ hẳn theo yêu cầu: nó không tham gia phép tính nào ở
 * màn này, đứng cạnh "Giá trị tính phí (chưa VAT)" chỉ làm kế toán đọc nhầm cơ sở tính.
 */
export interface WorksheetPeriodKpi {
  /** Cần chi kỳ này (VND) */
  canChi: number
  /** Đã chi lũy kế (VND) */
  daChi: number
  /** Đang giữ lại (VND) */
  giuLai: number
}

export interface WorksheetDerivationStripProps {
  /** Giá trị tính phí chưa VAT. BE trả decimal dạng chuỗi. */
  basis?: string | number | null
  /** Phí trả sale (%) — decimal dạng chuỗi từ cấu hình hoa hồng của deal. */
  saleFeePct?: string | number | null
  /** % tính doanh thu — decimal dạng chuỗi từ pricing của deal. */
  pctRevenue?: string | number | null
  /** Bỏ trống để ẩn hẳn nhóm "Kỳ này" (bảng kê chưa có dòng chia nào). */
  kpi?: WorksheetPeriodKpi | null
}

const EM_DASH = '—'

/**
 * Decimal-as-string của BE → chuỗi phần trăm, rỗng/không parse được thì em dash.
 *
 * Hai ô dùng hàm này là `pct_sale_commission` và `pct_revenue` — BE đã nới hai cột lên
 * numeric(14,10), nên trần phải là 10 chữ số thập phân chứ không phải 2. Giữ tối thiểu 2 chữ số
 * để cách đọc không đổi, và đi qua `formatNumber` để có dấu phẩy thập phân theo locale vi-VN
 * (`toFixed` in ra dấu chấm).
 */
function formatRatePct(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return EM_DASH
  const parsed = parseFloat(String(raw))
  if (!Number.isFinite(parsed)) return EM_DASH
  return `${formatNumber(parsed, { minimumFractionDigits: 2, maximumFractionDigits: 10 })}%`
}

/** Decimal-as-string của BE → chuỗi tiền VND, rỗng/không parse được thì em dash. */
function formatMoney(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return EM_DASH
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return EM_DASH
  return `${formatCurrencyVND(parsed)} đ`
}

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="mb-1.5 text-[10px] font-bold tracking-[0.08em] text-neutral-400 uppercase">
      {children}
    </div>
  )
}

function Cell({ label, value, valueCls }: { label: string; value: string; valueCls: string }) {
  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-medium text-neutral-500">{label}</div>
      <div className={`mt-1 font-bold ${valueCls}`}>{value}</div>
    </div>
  )
}

export function WorksheetDerivationStrip({
  basis,
  saleFeePct,
  pctRevenue,
  kpi,
}: WorksheetDerivationStripProps) {
  // Không tự chừa `mb-4` nữa: khoảng cách do bệ xám bọc ngoài (WorksheetPayoutSection)
  // quyết định; để dải tự chừa thêm thì cộng dồn thành hai lớp lề.
  return (
    <div
      data-testid="worksheet-derivation-strip"
      className="flex flex-col gap-3 xl:flex-row xl:items-stretch xl:gap-4"
    >
      <div className="min-w-0 flex-1">
        <GroupLabel>Cơ sở tính</GroupLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Cell
            label="Giá trị tính phí (chưa VAT)"
            value={formatMoney(basis)}
            valueCls="text-[16px] text-neutral-700"
          />
          <Cell
            label="Phí trả sale"
            value={formatRatePct(saleFeePct)}
            valueCls="text-[16px] text-neutral-700"
          />
          <Cell
            label="% tính doanh thu"
            value={formatRatePct(pctRevenue)}
            valueCls="text-[16px] text-neutral-700"
          />
        </div>
      </div>

      {kpi && (
        <>
          <div className="border-border-1 hidden self-stretch border-l xl:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <GroupLabel>Kỳ này</GroupLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Cell
                label="Cần chi kỳ này"
                value={`${formatCurrencyVND(kpi.canChi)} đ`}
                valueCls="text-[18px] text-neutral-900"
              />
              <Cell
                label="Đã chi lũy kế"
                value={`${formatCurrencyVND(kpi.daChi)} đ`}
                valueCls="text-data-green-default text-[18px]"
              />
              <Cell
                label="Đang giữ lại"
                value={`${formatCurrencyVND(kpi.giuLai)} đ`}
                valueCls="text-data-orange-default text-[18px]"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
