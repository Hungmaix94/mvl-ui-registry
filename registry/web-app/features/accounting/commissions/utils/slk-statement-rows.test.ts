import { describe, it, expect } from 'vitest'
import type { components } from '@/api/schema'
import {
  buildSlkStatementRows,
  sumSlkStatementRows,
  type SlkStatementLine,
} from './slk-statement-rows'

type SlkCeoSource = components['schemas']['_SlkCeoSource']

/**
 * CR 86eykqk16 — mục ④ "Hoa hồng Sàn liên kết" trên bảng kê HH tháng của quản lý từng hiện
 * `Doanh thu nguồn = 0` và `% nhận từ pool = —` cho mọi kỳ mà tiền đến từ pool giám đốc.
 *
 * Số trong file này lấy từ dữ liệu thật kỳ 07/2026 trên dev (summary 227 và 195), đối chiếu
 * với màn pool SLK `slk-monthly/33`.
 */

const DIRECTOR_NHAT = {
  id: 13762,
  code: 'MV000013762',
  full_name: 'Nguyễn Quang Nhất',
  department: 'Phòng Kinh Doanh 10',
  position: 'Chuyên viên biên kịch',
}
const DIRECTOR_HUNG = {
  id: 13,
  code: 'MV000000013',
  full_name: 'Nguyễn Việt Hùng',
  department: 'Phòng Kinh Doanh 24_GL',
  position: 'Giám đốc Kinh doanh',
}

/** Kiểu thật (`SlkStatementLine`) chứ không cast bừa: schema đổi thì test phải gãy lúc
 *  biên dịch, chứ không âm thầm chạy tiếp với fixture đã lỗi thời. */
function poolLine(
  over: { amount?: string; source_info?: Partial<SlkCeoSource> } = {}
): SlkStatementLine {
  return {
    amount: over.amount ?? '1512864',
    source_info: {
      line_id: 108609,
      monthly_id: 33,
      year: 2026,
      month: 7,
      f2_source: 'director',
      director: DIRECTOR_NHAT,
      pool_revenue: '74160000',
      pct_of_pool: '34.00',
      amount: over.amount ?? '1512864',
      department: { id: 24, code: 'PB000000024', name: 'Ban Giám đốc' },
      position: { id: 21, name: 'Tổng Giám Đốc' },
      ...over.source_info,
    },
  }
}

describe('buildSlkStatementRows', () => {
  it('đọc doanh thu + tỷ lệ của ĐÚNG pool, không phải doanh thu cả kỳ', () => {
    const [row] = buildSlkStatementRows([poolLine()])

    expect(row.sourceKey).toBe('director')
    expect(row.revenue).toBe('74160000')
    expect(row.pctOfPool).toBe('34.00')
    expect(row.amount).toBe(1512864)
    expect(row.director?.full_name).toBe('Nguyễn Quang Nhất')
  })

  it('một người nhận từ nhiều pool thì ra nhiều dòng, mỗi dòng một doanh thu và một tỷ lệ', () => {
    // Mai Admin Super kỳ 07/2026: Tổng Giám đốc nên được chia từ mọi pool giám đốc.
    const rows = buildSlkStatementRows([
      poolLine({
        amount: '4715414',
        source_info: { director: DIRECTOR_HUNG, pool_revenue: '98237804', pct_of_pool: '80.00' },
      }),
      poolLine({
        amount: '1824336',
        source_info: { director: DIRECTOR_NHAT, pool_revenue: '74160000', pct_of_pool: '41.00' },
      }),
    ])

    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.revenue)).toEqual(['98237804', '74160000'])
    expect(rows.map((r) => r.pctOfPool)).toEqual(['80.00', '41.00'])
    expect(rows.map((r) => r.director?.full_name)).toEqual([
      'Nguyễn Việt Hùng',
      'Nguyễn Quang Nhất',
    ])
  })

  it('TỔNG NHÓM bằng đúng tổng các dòng — con số này phải khớp thẻ slk_total bên trên', () => {
    const rows = buildSlkStatementRows([
      poolLine({ amount: '4715414' }),
      poolLine({ amount: '787394' }),
      poolLine({ amount: '1824336' }),
    ])

    expect(sumSlkStatementRows(rows)).toBe(7327144)
  })

  it('dòng chia từ pool phòng ban (không có f2_source) giữ tỷ lệ, để trống nguồn và doanh thu', () => {
    const splitLine: SlkStatementLine = {
      amount: '500000',
      source_info: {
        line_id: 1,
        pool_line_id: 9,
        pool_id: 3,
        employee_id: 42,
        amount: '500000',
        pct_of_pool: '25.00',
        status: 'CONFIRMED',
        department: null,
        position: null,
      },
    }
    const rows = buildSlkStatementRows([splitLine])

    expect(rows[0].sourceKey).toBeNull()
    expect(rows[0].revenue).toBeNull()
    expect(rows[0].director).toBeNull()
    expect(rows[0].pctOfPool).toBe('25.00')
    expect(rows[0].amount).toBe(500000)
  })

  it('nguồn thiếu doanh thu/tỷ lệ thì trả null để bảng in "—", KHÔNG hạ thành 0', () => {
    const rows = buildSlkStatementRows([
      poolLine({
        amount: '1512864',
        source_info: { f2_source: null, director: null, pool_revenue: null, pct_of_pool: null },
      }),
    ])

    expect(rows[0].revenue).toBeNull()
    expect(rows[0].pctOfPool).toBeNull()
    // Tiền đã ghi nhận vẫn phải còn trên bảng.
    expect(rows[0].amount).toBe(1512864)
  })
})
