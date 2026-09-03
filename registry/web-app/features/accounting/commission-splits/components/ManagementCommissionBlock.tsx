import { ColoredValueVariant } from '@/api/schema'
import { EmployeeProfileLink } from '@/components/commons'
import Chip from '@/components/ui/chip/Chip'
import { parseNumberSafe } from '@/features/accounting/_shares/utils/recipient-utils'
import { formatCurrencyVND, formatPctFloor } from '@/utils/common'

import type { WorksheetKpiCommissionRow } from '../services/commission-splits-service'

import type { PayoutPositionData } from './RecipientPayoutTable'
import { SubHead } from '@/components/commons/SubHead'
import { netAfterHold } from '../utils/payout-math'

/** Một position thưởng quản lý trong nhóm của một cấp quản lý. */
export type MgmtPosition = { posIdx: number; posData: PayoutPositionData }

/** Hai helper dưới chỉ đọc `posData` — nhận đúng bấy nhiêu, khỏi bắt caller có `posIdx`. */
type MgmtPositionAmountInput = { posData?: PayoutPositionData }

export function getPositionAmount(p: MgmtPositionAmountInput): number {
  const recipsSum = p.posData?.recipients?.reduce((a, r) => a + parseNumberSafe(r.amount), 0) || 0
  return recipsSum > 0 ? recipsSum : Number(p.posData?.actual_amount || 0)
}

/**
 * Số tiền CẤU HÌNH cả căn của một position (`CommissionShare.calculated_amount`).
 *
 * Đây là nguồn của con số hiển thị: thưởng HH quản lý là một khoản cấu hình cố định, tiền
 * của kỳ = cấu hình × `% TT phí` của kỳ. Trả null khi BE không có số để khỏi bịa ra base.
 */
export function getPositionConfigured(p: MgmtPositionAmountInput): number | null {
  const raw = p.posData?.share_full_amount
  if (raw === null || raw === undefined || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** Σ cấu hình của một nhóm position; null khi không position nào có số. */
export function sumPositionConfigured(positions: MgmtPositionAmountInput[]): number | null {
  return positions.reduce<number | null>((acc, p) => {
    const value = getPositionConfigured(p)
    if (value === null) return acc
    return (acc ?? 0) + value
  }, null)
}

export function getPositionHold(p: MgmtPositionAmountInput): number {
  const recHold =
    p.posData?.recipients?.reduce(
      (sumR, r) => sumR + parseNumberSafe(r.account_hold_amount || r.hold_amount),
      0
    ) || 0
  return recHold > 0 ? recHold : Number(p.posData?.admin_hold || 0)
}

// One row of the compact KPI pivot: a single payee (manager) with their KPI payables
// folded together. Built by the parent (kpiGroupedByManager) and consumed here — exported
// so producer and consumer share one shape and cannot drift.
export interface KpiManagerGroup {
  code: string
  name: string
  role: string
  employeeId?: number
  deptName: string
  rows: WorksheetKpiCommissionRow[]
}

/**
 * Một cấp quản lý và các position thưởng của họ trong kỳ.
 *
 * Trước đây prop này khai `any[]`, nên mọi nơi DỰNG nó (nay là `ManagementCommissionSection`)
 * mất sạch kiểm tra kiểu — gõ sai `owner_code` thành `ownerCode` vẫn biên dịch, chỉ ra bảng
 * rỗng lúc chạy. `posData` dùng chung kiểu với bảng chia thực nhận để hai bên không trôi.
 */
export interface MgmtManagerGroup {
  code: string
  name: string
  /** Chức danh hiển thị, suy từ `pct_type` qua `MGMT_ROLE_LABELS`. */
  role: string
  recipient_id: number
  positions: MgmtPosition[]
}

interface ManagementCommissionBlockProps {
  showMgmtBlock: boolean
  activeLabel: string
  mgmtGroupedByManager: MgmtManagerGroup[]
  /** `% TT phí` đang áp — mẫu số của chú thích `cấu hình × %` dưới mỗi ô hạng mục. */
  appliedFeePct: number
  categories: { key: string; label: string }[]
  isKT: boolean
  kpiPositions: WorksheetKpiCommissionRow[]
  kpiGroupedByManager: KpiManagerGroup[]
  showKpiBlock: boolean
}

export function ManagementCommissionBlock({
  showMgmtBlock,
  activeLabel,
  mgmtGroupedByManager,
  appliedFeePct,
  categories,
  isKT,
  kpiPositions,
  kpiGroupedByManager,
  showKpiBlock,
}: ManagementCommissionBlockProps) {
  return (
    <>
      {/* BLOCK 5: THƯỞNG HH QUẢN LÝ */}
      {showMgmtBlock && (
        <div className="border-border-1 flex flex-col overflow-hidden rounded-md border bg-white">
          <SubHead
            n="5"
            title="Thưởng HH quản lý"
            subtitle={`Các khoản thưởng doanh thu/giao dịch dành cho các cấp Quản lý (TP, GĐ, TGĐ) tính theo ${activeLabel}. Mỗi ô: số tiền cấu hình cả căn × % TT phí của đợt.`}
            right={
              <div className="flex items-center gap-2">
                <Chip
                  label={`${mgmtGroupedByManager.length} quản lý`}
                  variant={ColoredValueVariant.GREY}
                />
              </div>
            }
          />

          <div className="flex flex-col">
            {mgmtGroupedByManager.length === 0 ? (
              <div className="border-border-1 rounded border bg-white py-6 text-center text-[13px] text-neutral-400">
                Không có thưởng quản lý cho giao dịch này
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-right [&_td]:align-middle [&_th]:align-middle">
                    <thead className="bg-background-2 [&_th]:font-medium">
                      <tr className="border-border-1 border-b text-[11px] font-medium whitespace-nowrap text-neutral-500">
                        <th className="px-3 py-2.5 text-left">Chức vụ</th>
                        {categories.map((c) => (
                          <th key={c.key} className="px-3 py-2.5">
                            {c.label}
                          </th>
                        ))}
                        <th className="px-3 py-2.5">Giữ lại HH</th>
                        <th className="px-3 py-2.5">Thực nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mgmtGroupedByManager.map((mgr) => {
                        const catPositions = (key: string) =>
                          mgr.positions.filter((p) =>
                            (p.posData.pct_type || '').endsWith(`_${key}`)
                          )
                        const catAmount = (key: string) =>
                          catPositions(key).reduce((s, p) => s + getPositionAmount(p), 0)
                        const totalThis = mgr.positions.reduce(
                          (s, p) => s + getPositionAmount(p),
                          0
                        )
                        const totalHold = mgr.positions.reduce((s, p) => s + getPositionHold(p), 0)
                        const net = netAfterHold(totalThis, totalHold)
                        const money = (v: number) => (v > 0 ? `${formatCurrencyVND(v)} ₫` : '—')
                        return (
                          <tr
                            key={mgr.code}
                            className="border-border-1 border-b hover:bg-neutral-50/50"
                          >
                            <td className="px-3 py-3 text-left">
                              <div className="text-[13px] font-semibold text-neutral-900">
                                {mgr.name}
                              </div>
                              <div className="text-[11px] text-neutral-500">
                                {mgr.role || 'Quản lý'}
                                <span className="ml-1 font-mono text-neutral-400">{mgr.code}</span>
                              </div>
                            </td>
                            {categories.map((c) => {
                              const configured = sumPositionConfigured(catPositions(c.key))
                              return (
                                <td key={c.key} className="px-3 py-3 text-[13px] text-neutral-700">
                                  {money(catAmount(c.key))}
                                  {configured !== null && (
                                    <div className="mt-0.5 text-[11px] whitespace-nowrap text-neutral-500">
                                      {formatCurrencyVND(configured)} ×{' '}
                                      {formatPctFloor(appliedFeePct)}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                            {/* Cột chỉ ĐỌC: mục ⑤ không còn đường giữ/bỏ giữ (xem docstring của
                                section). Số ở đây đến từ nơi khác — hold cấp bảng kê tháng ở
                                20.14 — nên vẫn phải hiện, vì nó là chênh lệch giữa tổng thưởng
                                và "Thực nhận". Chưa giữ gì thì `—`, đừng hiện `0 ₫`: ô số 0 đọc
                                như một thao tác vừa xảy ra ở màn này. */}
                            <td className="px-3 py-3 text-[13px] font-semibold text-red-600">
                              {totalHold > 0 ? `-${formatCurrencyVND(totalHold)} ₫` : '—'}
                            </td>
                            <td className="px-3 py-3 text-[13px] font-semibold text-neutral-900">
                              {formatCurrencyVND(net)} ₫
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOCK 6: MANAGEMENT KPI COMMISSIONS — compact pivot (one row per payee) */}
      {(() => {
        const kpiTotalExpected = kpiPositions.reduce(
          (sum, p) => sum + Number(p.expected_amount || 0),
          0
        )

        if (!showKpiBlock) return null

        return (
          <div className="border-border-1 flex flex-col overflow-hidden rounded-md border bg-white">
            <SubHead
              n="6"
              title="HH quản lý (KPI)"
              subtitle={`Hoa hồng quản lý theo chỉ tiêu KPI dành cho các cấp Quản lý (TP, GĐ, TGĐ, TKKD) — chia theo ${activeLabel}.`}
              right={
                <div className="flex items-center gap-2">
                  <Chip
                    label={`${kpiGroupedByManager.length} quản lý`}
                    variant={ColoredValueVariant.GREY}
                  />
                </div>
              }
            />

            <div className="flex flex-col">
              {kpiGroupedByManager.length === 0 ? (
                <div className="border-border-1 rounded border bg-white py-6 text-center text-[13px] text-neutral-400">
                  Không có hoa hồng quản lý KPI cho giao dịch này
                </div>
              ) : (
                <>
                  <div className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] border-collapse text-right [&_td]:align-middle [&_th]:align-middle">
                        <thead className="bg-background-2 [&_th]:font-medium">
                          <tr className="border-border-1 border-b text-[11px] font-medium whitespace-nowrap text-neutral-500">
                            <th className="px-3 py-2.5 text-left">Chức vụ</th>
                            <th className="px-3 py-2.5 text-left">Thành phần</th>
                            <th className="px-3 py-2.5">Hoa hồng quản lý</th>
                            {isKT && <th className="px-3 py-2.5 text-center">Trạng thái</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {kpiGroupedByManager.map((mgr) => {
                            const totalExpected = mgr.rows.reduce(
                              (s, r) => s + Number(r.expected_amount || 0),
                              0
                            )
                            const components = Array.from(
                              new Set(mgr.rows.map((r) => r.pct_type_display || r.pct_type || ''))
                            )
                              .filter(Boolean)
                              .join(', ')
                            // Aggregate status across a payee's folded rows: "Đã duyệt" only when
                            // every row is APPROVED/PAID, "Đã hủy" only when every row is
                            // VOIDED/CANCELLED; any other mix (incl. approved + voided) falls back
                            // to "Chờ duyệt".
                            const statuses = mgr.rows.map((r) => r.status)
                            let statusText = 'Chờ duyệt'
                            let statusVariant = ColoredValueVariant.GREY
                            if (statuses.every((s) => s === 'APPROVED' || s === 'PAID')) {
                              statusText = 'Đã duyệt'
                              statusVariant = ColoredValueVariant.GREEN
                            } else if (statuses.every((s) => s === 'VOIDED' || s === 'CANCELLED')) {
                              statusText = 'Đã hủy'
                              statusVariant = ColoredValueVariant.RED
                            }
                            return (
                              <tr
                                key={mgr.code}
                                className="border-border-1 border-b hover:bg-neutral-50/50"
                              >
                                <td className="px-3 py-3 text-left">
                                  <div className="text-[13px] font-semibold text-neutral-900">
                                    <EmployeeProfileLink employeeId={mgr.employeeId}>
                                      {mgr.name}
                                    </EmployeeProfileLink>
                                  </div>
                                  <div className="text-[11px] text-neutral-500">
                                    {mgr.role || 'Quản lý'}
                                    {mgr.deptName ? ` · ${mgr.deptName}` : ''}
                                    {mgr.code && !mgr.code.startsWith('payable-') && (
                                      <span className="ml-1 font-mono text-neutral-400">
                                        {mgr.code}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-left text-[12px] text-neutral-700">
                                  {components || '—'}
                                </td>
                                <td className="px-3 py-3 text-[13px] font-semibold text-neutral-900">
                                  {formatCurrencyVND(totalExpected)} ₫
                                </td>
                                {isKT && (
                                  <td className="px-3 py-3 text-center">
                                    <Chip label={statusText} variant={statusVariant} size="small" />
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section Summary Row */}
                  <div className="border-border-1 mt-4 rounded-lg border bg-neutral-50 p-4">
                    <div>
                      <span className="block text-[11px] font-medium text-neutral-500 uppercase">
                        Tổng HH KPI toàn căn
                      </span>
                      <span className="text-data-green-default mt-1 block text-[16px] font-bold">
                        {formatCurrencyVND(kpiTotalExpected)} đ
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </>
  )
}
