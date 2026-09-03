/**
 * Mục 6 (Hoa hồng Đầu tư, Xúc tiến & Phát triển Dự án) — gom dòng PROMO thành MỘT dòng / dự án.
 *
 * Trước đây bảng render thẳng `sources.promo.items[]` và tra cột vai trò bằng `line.pct_type`,
 * nhưng item PROMO gộp theo payee nên KHÔNG có `pct_type` ⇒ 5 cột vai trò luôn rỗng. BE
 * 2026-08-14 trả thêm `distribution.by_pct_type[]` (tách theo vai trò) +
 * `total_fee_calculation_price` (doanh thu phí dự án) để dựng lại bảng theo dự án.
 *
 * `sources` là JSON tự do (schema.ts chỉ khai object) nên shape mô tả tại chỗ dùng, không đụng
 * vào type sinh tự động.
 */
import { PROMOTION_PCT_TYPE_ORDER } from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

/** Nhãn dòng cho khoản nhập tay: không thuộc dự án nào nên không mượn tên dự án được. */
export const MANUAL_ENTRY_ROW_LABEL = 'Khoản riêng theo thỏa thuận'

export type PromoByPctType = {
  pct_type: string
  /** % vai trò theo cấu hình dự án — null khi 1 vai trò có nhiều dòng gộp lại. */
  snapshot_pct_split: string | null
  snapshot_contribution_level: string | null
  /** = snapshot_pct_split × contribution / 100, BE trả 10dp ROUND_DOWN. */
  effective_pct: string | null
  formula_amount: string
  amount: string
}

export type PromoDistributionInfo = {
  id?: number
  code?: string
  period_year?: number | null
  period_month?: number | null
  total_fee_calculation_price?: string
  /** % doanh thu phí được trích ra làm quỹ xúc tiến, đóng băng lúc tính phiếu. */
  snapshot_pct_promotion_revenue?: string
  marketing_cost?: string
  revenue_base?: string
  payout_ratio?: string
  formula_amount?: string
  by_pct_type?: PromoByPctType[]
}

export type PromoLine = {
  amount?: string | number
  source_info?: {
    project?: { id?: number; code?: string; name?: string } | null
    project_name?: string
    distribution?: PromoDistributionInfo | null
    department?: { name?: string } | null
    position?: { name?: string } | null
    /** MANUAL = khoản nhập tay theo văn bản, không gắn dự án và không gắn phiếu phân bổ. */
    entry_kind?: string | null
    reason?: string | null
    /** id của ProjectPromotionPayeeCommission — điểm sửa của dòng nhập tay. */
    payee_id?: number | null
  }
}

export type PromoRoleCell = {
  amount: number
  formulaAmount: number
  /** % của quỹ xúc tiến dự án (money-first: formula / quỹ). Null khi chưa có quỹ để chia. */
  pct: number | null
  /** Chi tiết cho tooltip; null khi vai trò gộp từ nhiều dòng. */
  pctSplit: string | null
  contributionLevel: string | null
}

export type PromoProjectRow = {
  key: string
  projectName: string
  projectCode: string
  /** Mã phiếu phân bổ + kỳ, để kế toán truy ngược. Thường 1, có thể nhiều khi truy thu kỳ cũ. */
  distributions: { id?: number; code: string; periodLabel: string }[]
  /** Doanh thu phí của các deal đủ điều kiện trong kỳ (total_fee_calculation_price). */
  projectRevenue: number
  /**
   * Quỹ xúc tiến = doanh thu phí × %XT − chi phí MKT (revenue_base) — **mẫu số của mọi cột %**.
   * Bảng không còn cột riêng cho nó (bản gọn 7 cột), nhưng vẫn phải giữ để tính % và để tooltip
   * của từng ô giải thích được con số % lấy từ đâu.
   */
  promotionPool: number
  roles: Record<string, PromoRoleCell>
  formulaTotal: number
  /** Tổng tiền thực nhận của dự án — luôn lấy từ `line.amount` (số chốt của mục 6). */
  amountTotal: number
  /** Phần chưa tách được vai trò (dữ liệu cũ / payee không gắn phiếu phân bổ). */
  unassignedAmount: number
  /** % tiền về = tổng thực nhận / tổng ghi nhận. Null khi chưa ghi nhận đồng nào. */
  payoutPct: number | null
  /** Dòng nhập tay theo văn bản (không có công thức để hiển thị). */
  isManual: boolean
  /** Lý do / số văn bản của dòng nhập tay. */
  manualReason: string
  /** id bản ghi để sửa ngay trên bảng kê; null với dòng sinh từ công thức. */
  manualEntryId: number | null
}

function toNumber(value: unknown): number {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

function periodLabel(distribution: PromoDistributionInfo): string {
  const { period_month: month, period_year: year } = distribution
  if (!month || !year) return ''
  return `${String(month).padStart(2, '0')}/${year}`
}

/**
 * Một dòng / dự án. Cột vai trò cộng dồn qua mọi phiếu phân bổ của cùng dự án trong kỳ, cột %
 * neo vào TỔNG quỹ xúc tiến của các phiếu đó nên vẫn đọc được khi có nhiều phiếu.
 */
export function buildPromoProjectRows(lines: PromoLine[]): PromoProjectRow[] {
  const rows = new Map<string, PromoProjectRow>()

  lines.forEach((line, index) => {
    const info = line.source_info || {}
    const project = info.project
    const distribution = info.distribution || null
    const isManual = info.entry_kind === 'MANUAL'
    const key = project?.id != null ? `project-${project.id}` : `line-${index}`

    let row = rows.get(key)
    if (!row) {
      row = {
        key,
        projectName: isManual ? MANUAL_ENTRY_ROW_LABEL : project?.name || info.project_name || '—',
        projectCode: project?.code || '',
        distributions: [],
        projectRevenue: 0,
        promotionPool: 0,
        roles: {},
        formulaTotal: 0,
        amountTotal: 0,
        unassignedAmount: 0,
        payoutPct: null,
        isManual,
        manualReason: isManual ? info.reason || '' : '',
        manualEntryId: isManual ? (info.payee_id ?? null) : null,
      }
      rows.set(key, row)
    }

    row.amountTotal += toNumber(line.amount)

    if (!distribution) {
      row.unassignedAmount += toNumber(line.amount)
      return
    }

    if (distribution.code) {
      row.distributions.push({
        id: distribution.id,
        code: distribution.code,
        periodLabel: periodLabel(distribution),
      })
    }
    row.projectRevenue += toNumber(distribution.total_fee_calculation_price)
    row.promotionPool += toNumber(distribution.revenue_base)

    let roleAmount = 0
    ;(distribution.by_pct_type || []).forEach((item) => {
      const cell = row.roles[item.pct_type] || {
        amount: 0,
        formulaAmount: 0,
        pct: null,
        pctSplit: item.snapshot_pct_split,
        contributionLevel: item.snapshot_contribution_level,
      }
      cell.amount += toNumber(item.amount)
      cell.formulaAmount += toNumber(item.formula_amount)
      // Gộp từ nhiều phiếu thì cặp % cấu hình không còn mô tả đúng ô nữa.
      if (row.roles[item.pct_type]) {
        cell.pctSplit = null
        cell.contributionLevel = null
      }
      row.roles[item.pct_type] = cell
      roleAmount += toNumber(item.amount)
    })
    row.formulaTotal += toNumber(distribution.formula_amount)
    row.unassignedAmount += toNumber(line.amount) - roleAmount
  })

  return Array.from(rows.values()).map((row) => {
    Object.values(row.roles).forEach((cell) => {
      cell.pct = row.promotionPool > 0 ? (cell.formulaAmount / row.promotionPool) * 100 : null
    })
    row.payoutPct = row.formulaTotal > 0 ? (row.amountTotal / row.formulaTotal) * 100 : null
    return row
  })
}

/**
 * Cột vai trò của bảng: LUÔN đủ 5 vai trò nghiệp vụ theo thứ tự cố định — bảng kê giữ nguyên
 * khung cột giữa các kỳ / các người, kế toán đọc quen chỗ nào ra chỗ đó, vai trò không được
 * hưởng thì hiện "—" chứ cột không biến mất.
 *
 * Vai trò lạ (cấu hình đổi mà FE chưa cập nhật) nối thêm vào cuối — nếu bỏ đi thì tiền của nó
 * biến mất khỏi các cột trong khi vẫn nằm trong cột Tổng tiền, dòng tự mâu thuẫn với chính nó.
 */
export function getPromoColumnPctTypes(rows: PromoProjectRow[]): string[] {
  const present = new Set(rows.flatMap((row) => Object.keys(row.roles)))
  const unknown = Array.from(present)
    .filter((pctType) => !PROMOTION_PCT_TYPE_ORDER.includes(pctType as never))
    .sort()
  return [...PROMOTION_PCT_TYPE_ORDER, ...unknown]
}

/** Dòng TỔNG của bảng — cộng theo cột để kế toán đối chiếu ngang với tổng nhóm ở header. */
export function sumPromoProjectRows(rows: PromoProjectRow[]) {
  const roles: Record<string, number> = {}
  getPromoColumnPctTypes(rows).forEach((pctType) => {
    roles[pctType] = rows.reduce((sum, row) => sum + (row.roles[pctType]?.amount || 0), 0)
  })
  return {
    projectRevenue: rows.reduce((sum, row) => sum + row.projectRevenue, 0),
    promotionPool: rows.reduce((sum, row) => sum + row.promotionPool, 0),
    roles,
    formulaTotal: rows.reduce((sum, row) => sum + row.formulaTotal, 0),
    amountTotal: rows.reduce((sum, row) => sum + row.amountTotal, 0),
  }
}
