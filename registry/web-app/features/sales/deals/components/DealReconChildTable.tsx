import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { DATE_FORMAT } from '@/constants/date-format'

import {
  buildParentReconIndex,
  findParentInvestorRecon,
  isVoidedRecon,
  parentInvestorReconCode,
  parentInvestorSheetId,
  resolveProgressPct,
  type ChildReconLike,
  type ParentReconLike,
} from '../utils/deal-recon-parent'

/** Dòng đối chiếu con (F2 hoặc CTV) mà bảng này render. */
export type DealReconChildRow = ChildReconLike & {
  id: number
  code: string
  status?: string
  /**
   * Dấu HUỶ thật sự của phiếu đối chiếu. Theo SRS 18.5 (`test-spec.md` §16):
   * *"Void = set voided_at (status giữ nguyên)"* — void KHÔNG đổi `status`, nên lọc bằng
   * `status !== 'voided'` là no-op và phiếu đã huỷ vẫn bị cộng vào TỔNG tiền.
   * CTV chưa có field này trên serializer list (đã yêu cầu BE bổ sung).
   */
  voided_at?: string | null
  created_at?: string
  period_pct?: string | null
  pct_commission?: string
  progress_from_pct?: string | null
  progress_to_pct?: string | null
}

export interface DealReconChildTableProps<TRow extends DealReconChildRow> {
  /** Chữ trong ô số thứ tự của card ("B" cho F2, "C" cho CTV). */
  sectionTag: string
  title: string
  subtitle: string
  /** Nhãn cột đối tác + nhãn tổng ở chân bảng ("Sàn F2" / "Cộng tác viên"). */
  counterpartLabel: string
  rows: readonly TRow[]
  /** Danh sách đối chiếu CĐT của deal — nguồn tra ngược cột "Sinh từ". */
  parentReconciliations: readonly ParentReconLike[]
  /** Quyền xem đối chiếu CĐT — thiếu quyền thì mã gốc hiển thị dạng text. */
  canLinkParent: boolean
  /** Đường dẫn chi tiết bảng đối chiếu CĐT gốc (nhận id BẢNG). */
  parentDetailPath: (investorSheetId: number) => string
  getCounterpartName: (row: TRow) => string | undefined
  getFeeAmount: (row: TRow) => string | number | null | undefined
  getDetailPath: (row: TRow) => string
  detailLabel: string
  renderStatus: (row: TRow) => ReactNode
}

const PCT_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
const LINK_CLASS = 'text-action-primary-default cursor-pointer font-medium hover:underline'

function formatMoney(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') return '-'
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return '-'
  return formatCurrencyVND(parsed)
}

/**
 * Cột "% đối chiếu" đọc `pct_commission` — BE đã nới cột này lên numeric(14,10), nên trần 2 chữ
 * số thập phân của {@link PCT_FORMAT} sẽ làm mất phần thập phân thật. Giữ tối thiểu 2 chữ số để
 * cách đọc không đổi. Cột "% TT" và các dòng tổng vẫn là núm tiến độ ⇒ vẫn dùng `formatPct`.
 */
const RATE_PCT_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 10 }

function formatPct(value: number) {
  return `${formatNumber(value, PCT_FORMAT)}%`
}

function formatRatePct(value: number) {
  return `${formatNumber(value, RATE_PCT_FORMAT)}%`
}

/**
 * Bảng đối chiếu con của một deal (F2 hoặc CTV) — cùng cấu trúc cột, chỉ khác nhãn,
 * nguồn số tiền, badge trạng thái và route chi tiết. Cột "Sinh từ" link về BẢNG đối chiếu
 * CĐT gốc (ClickUp 86eyb9a4z) qua `investor_sheet` của dòng CĐT tra được.
 */
function DealReconChildTable<TRow extends DealReconChildRow>({
  sectionTag,
  title,
  subtitle,
  counterpartLabel,
  rows,
  parentReconciliations,
  canLinkParent,
  parentDetailPath,
  getCounterpartName,
  getFeeAmount,
  getDetailPath,
  detailLabel,
  renderStatus,
}: DealReconChildTableProps<TRow>) {
  // Chỉ mục dựng một lần cho cả bảng — tra parent O(1) thay vì quét lại theo từng dòng.
  const parentIndex = useMemo(
    () => buildParentReconIndex(parentReconciliations),
    [parentReconciliations]
  )

  const totals = useMemo(() => {
    const active = rows.filter((row) => !isVoidedRecon(row))
    return active.reduce(
      (acc, row) => {
        const parent = findParentInvestorRecon(row, parentIndex)
        const to = resolveProgressPct(row.progress_to_pct, parent?.progress_to_pct)
        const from = resolveProgressPct(row.progress_from_pct, parent?.progress_from_pct)
        return {
          progress: acc.progress + (to - from),
          maxPay: Math.max(acc.maxPay, to),
          fee: acc.fee + (parseFloat(String(getFeeAmount(row) ?? '0')) || 0),
        }
      },
      { progress: 0, maxPay: 0, fee: 0 }
    )
  }, [rows, parentIndex, getFeeAmount])

  return (
    <section className="m4-art" style={{ marginBottom: 16 }}>
      <div className="m4-card-head">
        <span className="num-tag">{sectionTag}</span>
        <div>
          <h4>{title}</h4>
          <div className="sub">{subtitle}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="m4-tbl">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Sinh từ</th>
              <th>{counterpartLabel}</th>
              <th>Ngày đối chiếu</th>
              <th className="r">% đối chiếu</th>
              <th className="r">% TT</th>
              <th className="r">HH kỳ này</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-content-dark-3 py-8 text-center">
                  Không có dữ liệu đối chiếu
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const createdDate = row.created_at
                  ? formatDate(row.created_at, DATE_FORMAT)
                  : 'chưa'
                const parentCode = parentInvestorReconCode(row, parentIndex)
                const parent = findParentInvestorRecon(row, parentIndex)
                // % đối chiếu: period_pct nếu có, không thì pct_commission.
                const pctRecon =
                  row.period_pct != null
                    ? parseFloat(row.period_pct)
                    : parseFloat(row.pct_commission || '0')
                const pctPay = resolveProgressPct(row.progress_to_pct, parent?.progress_to_pct)
                // Link "Sinh từ" cần id BẢNG đối chiếu CĐT, không phải id dòng.
                const parentSheetId = parentInvestorSheetId(row, parentIndex)

                return (
                  <tr key={row.id}>
                    <td>
                      <code className="m4-code">{row.code}</code>
                    </td>
                    <td>
                      {!parentCode ? (
                        // BE chưa trả quan hệ cha → hiện thiếu, KHÔNG bịa mã từ mã dòng con.
                        <span className="text-content-dark-3">-</span>
                      ) : canLinkParent && parentSheetId ? (
                        <Link to={parentDetailPath(parentSheetId)} className={LINK_CLASS}>
                          <code className="m4-code">{parentCode}</code>
                        </Link>
                      ) : (
                        <code className="m4-code">{parentCode}</code>
                      )}
                    </td>
                    <td>{getCounterpartName(row)}</td>
                    <td className={createdDate === 'chưa' ? 'text-content-dark-3' : ''}>
                      {createdDate}
                    </td>
                    <td className="r">{formatRatePct(pctRecon)}</td>
                    <td className="r">{formatPct(pctPay)}</td>
                    <td className="r">{formatMoney(getFeeAmount(row))}</td>
                    <td>{renderStatus(row)}</td>
                    <td>
                      <Link to={getDetailPath(row)} className={LINK_CLASS}>
                        {detailLabel}
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
            {rows.length > 0 && (
              <tr className="total-row">
                <td colSpan={4}>TỔNG</td>
                <td className="r" style={{ fontWeight: 700 }}>
                  {formatPct(totals.progress)}
                </td>
                <td className="r" style={{ fontWeight: 700 }}>
                  {formatPct(totals.maxPay)}
                </td>
                <td className="r" style={{ fontSize: 14 }}>
                  {formatMoney(totals.fee)}
                </td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="tbl-foot">
        <span>
          <span className="k">Tổng dự kiến chi {counterpartLabel}</span>
          <span className="v lg num" style={{ marginLeft: 8, fontWeight: 700 }}>
            {formatMoney(totals.fee)}
          </span>
        </span>
        <span className="spacer" style={{ flex: 1 }} />
        <span>
          <span className="k">Tiến độ đối chiếu</span>
          <span
            className="v lg"
            style={{ marginLeft: 8, color: 'var(--color-data-green-default)', fontWeight: 700 }}
          >
            {formatPct(totals.progress)} / 100%
          </span>
        </span>
      </div>
    </section>
  )
}

export default DealReconChildTable
