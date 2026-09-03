import { describe, expect, it } from 'vitest'
import type {
  UnitsNotFullyPaidRelease,
  UnitsNotFullyPaidSale,
} from '@/features/accounting/reports/services/report-service'
import { formatMonthPaidCell, formatParticipationPct, formatReleaseLabel } from './cell-formatters'

const sale = (patch: Partial<UnitsNotFullyPaidSale> = {}): UnitsNotFullyPaidSale => ({
  name: 'Nguyễn Văn An',
  department: 'Kinh doanh 1',
  participation_pct: '60.00',
  employee_id: 1,
  collaborator_id: null,
  exchange_id: null,
  ...patch,
})

const release = (patch: Partial<UnitsNotFullyPaidRelease> = {}): UnitsNotFullyPaidRelease => ({
  period: '2026-02',
  amount: '10000000',
  pct: '10.00',
  ...patch,
})

describe('formatParticipationPct', () => {
  it('trả tỷ lệ tham gia dạng hiển thị', () => {
    expect(formatParticipationPct(sale())).toBe('60%')
  })

  it('trả null khi HĐ cọc không ghi tỷ lệ, để ô Sale bỏ hẳn badge', () => {
    expect(formatParticipationPct(sale({ participation_pct: null }))).toBeNull()
  })

  it('giữ nguyên tỷ lệ 0% thay vì coi như thiếu dữ liệu', () => {
    expect(formatParticipationPct(sale({ participation_pct: '0.00' }))).toBe('0%')
  })

  it('giữ phần thập phân khi tỷ lệ lẻ', () => {
    expect(formatParticipationPct(sale({ participation_pct: '33.33' }))).toBe('33,33%')
  })
})

describe('formatReleaseLabel', () => {
  it('đổi kỳ yyyy-MM của BE sang MM/yyyy kèm tiền tố HH', () => {
    expect(formatReleaseLabel(release())).toBe('HH 02/2026 - 10%')
  })

  it('bỏ phần tỷ lệ khi không tính được (tổng phải trả bằng 0)', () => {
    expect(formatReleaseLabel(release({ pct: null }))).toBe('HH 02/2026')
  })
})

describe('formatMonthPaidCell', () => {
  it('liệt kê mọi lần chi trả của căn, ngăn bằng dấu phẩy', () => {
    expect(formatMonthPaidCell([release(), release({ period: '2026-03', pct: '20.00' })])).toBe(
      'HH 02/2026 - 10%, HH 03/2026 - 20%'
    )
  })

  it('trả chuỗi rỗng khi căn chưa được chi trả lần nào', () => {
    expect(formatMonthPaidCell([])).toBe('')
  })
})
