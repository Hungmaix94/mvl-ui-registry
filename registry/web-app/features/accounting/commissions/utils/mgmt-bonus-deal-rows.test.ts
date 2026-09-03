import { describe, expect, it } from 'vitest'

import { formatPctFloor } from '@/utils/common'

import { buildMgmtBonusDealRows, getMgmtBonusCategory } from './summary-breakdown'

/**
 * Số thật lấy từ dev 08/2026, deal HD06-2026-001788 (bảng kê TCK000000179):
 * cấu hình 50.000 / 1.000.000 / 1.000.000, dial phí 24,2424242424%, tiền về 30,80%.
 * Bảng cũ chia ngược `amount x 100 / 30,80` nên hiện 39.354 / 787.091 / 787.091.
 */
const DEAL_INFO = {
  deal_id: 2905,
  deal_code: 'HD06-2026-001788',
  project: { name: 'Dự án A' },
  customer: { name: 'Khách B' },
  dial_fee_progress_pct: '24.2424242424',
  payment_progress_pct: '30.80',
}

const line = (pctType: string, amount: string, configured: string | null) => ({
  pct_type: pctType,
  amount,
  share_full_amount: configured,
  source_info: DEAL_INFO,
})

describe('getMgmtBonusCategory', () => {
  it('maps a pct_type to its category by suffix', () => {
    expect(getMgmtBonusCategory('mgmt_project_secretary_agency_fee')).toBe('agency_fee')
    expect(getMgmtBonusCategory('mgmt_sale_director_investor_bonus')).toBe('investor_bonus')
    expect(getMgmtBonusCategory('mgmt_project_secretary_mv_bonus')).toBe('mv_bonus')
    expect(getMgmtBonusCategory('mgmt_project_secretary_project_bonus')).toBe('project_bonus')
  })

  it('returns null for anything outside the 4 categories', () => {
    expect(getMgmtBonusCategory('pct_sale_commission')).toBeNull()
    expect(getMgmtBonusCategory(undefined)).toBeNull()
  })
})

describe('buildMgmtBonusDealRows', () => {
  it('shows the amount BE served, never a back-computed gross', () => {
    const [row] = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', '12121', '50000'),
      line('mgmt_project_secretary_investor_bonus', '242424', '1000000'),
      line('mgmt_project_secretary_mv_bonus', '242424', '1000000'),
    ])

    expect(row.cells.agency_fee.amount).toBe(12121)
    expect(row.cells.investor_bonus.amount).toBe(242424)
    expect(row.cells.mv_bonus.amount).toBe(242424)
    // Con số của bug cũ — không được xuất hiện ở bất kỳ ô nào nữa.
    expect(row.cells.agency_fee.amount).not.toBe(39354)
    expect(row.cells.investor_bonus.amount).not.toBe(787091)
  })

  it('serves the configured base so the cell can print "cấu hình × %"', () => {
    const [row] = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', '12121', '50000'),
      line('mgmt_project_secretary_investor_bonus', '242424', '1000000'),
      line('mgmt_project_secretary_mv_bonus', '242424', '1000000'),
    ])

    expect(row.cells.agency_fee.configured).toBe(50000)
    expect(row.cells.investor_bonus.configured).toBe(1000000)
    expect(row.configuredTotal).toBe(2050000)
    expect(row.dialPct).toBe('24.2424242424')
  })

  it('reconciles từng ô: cấu hình × dial ra đúng số tiền của ô đó', () => {
    const [row] = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', '12121', '50000'),
      line('mgmt_project_secretary_investor_bonus', '242424', '1000000'),
      line('mgmt_project_secretary_mv_bonus', '242424', '1000000'),
    ])

    const dial = Number(row.dialPct)
    Object.values(row.cells).forEach((cell) => {
      if (cell.configured === null) return
      expect(Math.round((cell.configured * dial) / 100)).toBe(cell.amount)
    })
  })

  it('cộng tiền theo dòng, KHÔNG tính lại từ tổng cấu hình', () => {
    const [row] = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', '12121', '50000'),
      line('mgmt_project_secretary_investor_bonus', '242424', '1000000'),
      line('mgmt_project_secretary_mv_bonus', '242424', '1000000'),
    ])

    // BE làm tròn TỪNG share rồi mới cộng: 12.121 + 242.424 + 242.424 = 496.969.
    // Nhân thẳng tổng cấu hình ra 496.969,69 -> làm tròn thành 496.970, lệch 1đ so với
    // tiền thật sẽ chi. "HH thực tế" phải là tổng của các dòng, không phải phép nhân lại.
    expect(row.actualAmount).toBe(496969)
    expect(Math.round((row.configuredTotal! * Number(row.dialPct)) / 100)).toBe(496970)
  })

  it('keeps the dial and the collection ratio as two separate numbers', () => {
    const [row] = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', '12121', '50000'),
    ])

    expect(row.dialPct).toBe('24.2424242424')
    expect(row.paymentProgressPct).toBe(30.8)
  })

  it('hai cột % cùng cắt 2dp — không cột nào được half-up', () => {
    const [row] = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', '12121', '50000'),
    ])

    // `% tiền về` từng render bằng Math.round nên 30,80 đọc thành "31%" — một con số
    // không khớp gì với phần còn lại của hàng. Hai cột nay cùng một quy tắc.
    // Số 0 thừa bị cắt là quy ước sẵn của `formatPctFloor` (100% chứ không 100,00%).
    expect(formatPctFloor(row.paymentProgressPct)).toBe('30,8%')
    expect(formatPctFloor(row.dialPct)).toBe('24,24%')
  })

  it('leaves an untouched category empty instead of zero-filling it', () => {
    const [row] = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', '12121', '50000'),
    ])

    expect(row.cells.project_bonus).toEqual({ amount: 0, configured: null })
  })

  it('groups by deal and sums per category across lines of the same deal', () => {
    const rows = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', '12121', '50000'),
      line('mgmt_sale_director_agency_fee', '24242', '100000'),
      {
        pct_type: 'mgmt_project_secretary_agency_fee',
        amount: '9900',
        share_full_amount: '99000',
        source_info: {
          deal_id: 2894,
          deal_code: 'HD06-2026-001777',
          dial_fee_progress_pct: '10.0000000000',
          payment_progress_pct: '26.15',
        },
      },
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0].cells.agency_fee).toEqual({ amount: 36363, configured: 150000 })
    expect(rows[1].cells.agency_fee).toEqual({ amount: 9900, configured: 99000 })
    expect(rows[1].dialPct).toBe('10.0000000000')
  })

  it('degrades to amount-only when BE has not shipped the two fields yet', () => {
    const [row] = buildMgmtBonusDealRows([
      {
        pct_type: 'mgmt_project_secretary_agency_fee',
        amount: '12121',
        source_info: { deal_id: 2905, deal_code: 'HD06-2026-001788' },
      },
    ])

    expect(row.cells.agency_fee.amount).toBe(12121)
    expect(row.cells.agency_fee.configured).toBeNull()
    expect(row.configuredTotal).toBeNull()
    expect(row.dialPct).toBeNull()
    expect(row.paymentProgressPct).toBe(0)
  })

  it('ignores a non-numeric amount instead of poisoning the row with NaN', () => {
    const [row] = buildMgmtBonusDealRows([
      line('mgmt_project_secretary_agency_fee', 'n/a', 'n/a'),
      line('mgmt_project_secretary_investor_bonus', '242424', '1000000'),
    ])

    expect(row.actualAmount).toBe(242424)
    expect(row.configuredTotal).toBe(1000000)
    expect(row.cells.agency_fee).toEqual({ amount: 0, configured: null })
  })

  it('keeps a line with no deal on its own row rather than merging them', () => {
    const rows = buildMgmtBonusDealRows([
      { pct_type: 'mgmt_project_secretary_agency_fee', amount: '1000', source_info: {} },
      { pct_type: 'mgmt_project_secretary_mv_bonus', amount: '2000', source_info: {} },
    ])

    expect(rows).toHaveLength(2)
  })
})

/**
 * Mã căn của bảng ② (ClickUp 86eynmfj7).
 *
 * BE đã phục vụ sẵn `unit_number` + `unit_code` trong `sources.mgmt.tbc_by_deal[]` từ 86eyd8qvq,
 * nhưng bảng ② chưa bao giờ đọc tới — mục ① và các màn Sale/CTV/F2 đọc, còn đây thì không, nên
 * kế toán không biết dòng thưởng thuộc căn nào khi một deal có nhiều căn cùng dự án.
 *
 * Số thật lấy từ dev 08/2026, deal HD06-2026-001801: `unit_number` = "VNC100002",
 * `unit_code` = "BH000002417" — chính cặp giá trị cho thấy vì sao KHÔNG được fallback.
 */
describe('buildMgmtBonusDealRows — mã căn', () => {
  const withUnit = (unit: Record<string, unknown>) => [
    {
      pct_type: 'mgmt_project_secretary_agency_fee',
      amount: '13300',
      share_full_amount: '33250',
      source_info: { deal_id: 2919, deal_code: 'HD06-2026-001801', ...unit },
    },
  ]

  it('lấy mã căn từ unit_number', () => {
    const [row] = buildMgmtBonusDealRows(
      withUnit({ unit_number: 'VNC100002', unit_code: 'BH000002417' })
    )

    expect(row.unitLabel).toBe('VNC100002')
  })

  it('KHÔNG fallback về unit_code khi thiếu unit_number', () => {
    const [row] = buildMgmtBonusDealRows(withUnit({ unit_code: 'BH000002417' }))

    // `unit_code` là `ProductInventory.code` — mã bản ghi nội bộ, không phải mã căn nghiệp vụ.
    // Hiện nó ra chính là bug 86eyd8qvq; thà để trống.
    expect(row.unitLabel).toBeNull()
  })

  it('để trống khi deal không có căn nào', () => {
    const [row] = buildMgmtBonusDealRows(withUnit({}))

    expect(row.unitLabel).toBeNull()
  })

  it('giữ mã căn riêng cho từng deal khi gom nhiều deal', () => {
    const rows = buildMgmtBonusDealRows([
      ...withUnit({ unit_number: 'VNC100002' }),
      {
        pct_type: 'mgmt_project_secretary_agency_fee',
        amount: '9900',
        share_full_amount: '99000',
        source_info: { deal_id: 2894, deal_code: 'HD06-2026-001777', unit_number: 'VH100008' },
      },
    ])

    expect(rows.map((r) => r.unitLabel)).toEqual(['VNC100002', 'VH100008'])
  })
})
