/**
 * Guard: mọi tỷ lệ thuộc cụm F2 phải hiển thị qua `formatRatePct`.
 *
 * BE nới cụm này lên `numeric(6,3)` (MVL-ERP/backend#3146). Hỏng ở đây là hỏng im lặng —
 * không lỗi, không cảnh báo, chỉ là con số trên màn khác con số trong CSDL:
 *
 *  - Chặn 2 chữ số  → phần chia sau khi rescale hold 33,333% hiện 33,33 và cột thôi cộng đủ 100.
 *  - Nội suy thô `${n}%` → ra `1.667%` dấu chấm thay vì `1,667%`, và `2` thay vì `2,00`.
 *
 * Cả hai đã lọt vào nhánh này một lần: PR sửa `LadImpactTable` (nội suy thô) nhưng còn sót
 * `RefundBookingForm`, `DealSalesParticipantsPanel` và `CommF2MonthlyDetail`. Vì vậy guard
 * TỰ QUÉT CÂY thay vì giữ danh sách màn — danh sách viết tay chính là thứ đã đi lạc.
 *
 * Guard này KHÔNG áp cho:
 *  - dial tiến độ tiền mặt (`fee_collected_pct`, `payout_ratio`, …) — chúng có luật làm tròn
 *    XUỐNG riêng, xem `formatPctFloor`;
 *  - tỷ lệ vai quản lý (`CommissionByRevenueTable`) — luật ở đó cố ý là "7%" chứ không "7,00%".
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Field mà BE đã nới lên 3 chữ số — nguồn của guard, không phải danh sách màn. */
const RATE_AXIS_FIELDS = [
  'participation_percentage',
  'pct_commission',
  'pct_f2_commission',
  'pct_f2_bonus',
  'pct_f2_inventory_hold',
  'pct_mv_bonus_to_f2',
  'commission_percentage',
  'pct_f2',
]

/**
 * Field mà BE nới lên 10 chữ số (numeric(14,10)) ngày 26/08/2026 — tỷ lệ doanh thu, phí trả
 * sale, phí đại lý và các cột chúng được sao chép sang. Khác cụm F2 ở trên: cụm F2 dừng ở 3,
 * cụm này cần đủ 10 vì một tỷ lệ có thể là PHÂN SỐ của tỷ lệ khác (1/3 của phí đại lý 10%).
 *
 * CỐ Ý KHÔNG có mặt ở đây: progress_from_pct / progress_to_pct / pct_period_commission /
 * extra_bonus_progress_* (mức tiến độ, không phải tỷ lệ — vẫn 4 chữ số) và participation.
 */
const CORE_RATE_FIELDS = [
  'pct_revenue',
  'pct_sale_commission',
  'pct_agency_fee',
  'snapshot_pct_revenue',
  'proposed_pct_agency_fee',
  'current_pct_sale_commission',
]

const AXIS = new RegExp(`\\b(${RATE_AXIS_FIELDS.join('|')})\\b`)
const CORE_AXIS = new RegExp(`\\b(${CORE_RATE_FIELDS.join('|')})\\b`)
/** Mọi cách chặn dưới 10 chữ số: hằng format dùng chung, tham số truyền vào, hay toFixed. */
const CAPPED_BELOW_10DP =
  /maximumFractionDigits:\s*[0-9]\b|PCT_FORMAT|toFixed\([0-9]\)|formatPct\([^)]*,\s*[0-9]\s*\)|formatPercent\([^)]*,\s*[0-9]\s*\)/
const CORE_RAW_INTERPOLATION = new RegExp(
  `\\$\\{[^{}]*\\b(${CORE_RATE_FIELDS.join('|')})\\b[^{}]*\\}%`
)
/** Chặn cận trên 2 chữ số, trực tiếp hoặc qua hằng format dùng chung. */
const CAPPED_AT_2DP = /maximumFractionDigits:\s*2|PCT_FORMAT/
/** Nội suy thẳng vào chuỗi: mất luôn dấu phẩy thập phân lẫn mức tối thiểu 2 chữ số. */
const RAW_INTERPOLATION = new RegExp(`\\$\\{[^{}]*\\b(${RATE_AXIS_FIELDS.join('|')})\\b[^{}]*\\}%`)

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out)
      continue
    }
    if (!/\.tsx?$/.test(entry)) continue
    if (entry.includes('.test.')) continue
    if (full.endsWith(join('api', 'schema.ts'))) continue // sinh tự động
    out.push(full)
  }
  return out
}

describe('hiển thị tỷ lệ cụm F2', () => {
  it('không màn nào chặn tỷ lệ F2 ở 2 chữ số hay nội suy thô', () => {
    const offenders: string[] = []

    for (const file of collectSourceFiles(SRC)) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (!AXIS.test(line)) return
        if (!CAPPED_AT_2DP.test(line) && !RAW_INTERPOLATION.test(line)) return
        offenders.push(`${file.slice(SRC.length + 1)}:${index + 1}: ${line.trim()}`)
      })
    }

    expect(
      offenders,
      'Tỷ lệ cụm F2 là numeric(6,3) — hiển thị qua formatRatePct (tối thiểu 2, tối đa 3 chữ số)'
    ).toEqual([])
  })

  it('không màn nào chặn tỷ lệ TBC lõi dưới 10 chữ số hay nội suy thô', () => {
    const offenders: string[] = []

    for (const file of collectSourceFiles(SRC)) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (!CORE_AXIS.test(line)) return
        if (!CAPPED_BELOW_10DP.test(line) && !CORE_RAW_INTERPOLATION.test(line)) return
        offenders.push(`${file.slice(SRC.length + 1)}:${index + 1}: ${line.trim()}`)
      })
    }

    expect(
      offenders,
      'Tỷ lệ TBC lõi là numeric(14,10) — hiển thị qua formatPct(giá trị, 10), tự bỏ số 0 thừa'
    ).toEqual([])
  })

  it('quét đúng cây nguồn — một glob hỏng sẽ khiến guard xanh giả', () => {
    const files = collectSourceFiles(SRC)
    expect(files.length).toBeGreaterThan(100)
    expect(files.some((f) => f.endsWith('common.ts'))).toBe(true)
  })
})
