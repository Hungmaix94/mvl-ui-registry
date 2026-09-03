import { describe, expect, test } from 'vitest'
import type { components } from '@/api/schema'
import { PayoutSplitLineStatus } from '@/constants/api-schema-aliases'
import { buildSkippedRows, selectDraftLines } from './confirm-lines-outcome'

type PoolLine = components['schemas']['DepartmentCommissionPoolLine']
type ConfirmLinesResult = components['schemas']['DeptPoolConfirmLinesResult']

// Fixture khai kiểu là CHÍNH schema và dựng bằng object literal: tsc khi đó bắt cả field
// thiếu lẫn field thừa, nên fixture không thể trôi khỏi hình dạng BE thật trả về.
function line(over: Partial<PoolLine> & Pick<PoolLine, 'id'>): PoolLine {
  // `base` khai kiểu tường minh và KHÔNG ép kiểu: thiếu field hay thừa field đều đỏ ngay ở
  // tsc. Gộp bằng hai bước thay vì rải `...over` sau `id` — rải chồng lên field đã khai là
  // TS2783 ('id' is specified more than once).
  const base: PoolLine = {
    id: over.id,
    employee: 100 + over.id,
    employee_code: `MV0000024${over.id}`,
    employee_name: `Nhân sự ${over.id}`,
    amount: '250000',
    pct_of_pool: '50.0000',
    status: PayoutSplitLineStatus.DRAFT,
    confirmed_at: null,
    paid_at: null,
  }
  return { ...base, ...over }
}

describe('selectDraftLines', () => {
  test('chỉ lấy dòng Bản nháp — đúng phạm vi BE nhận', () => {
    const lines = [
      line({ id: 1 }),
      line({ id: 2, status: PayoutSplitLineStatus.CONFIRMED }),
      line({ id: 3 }),
      line({ id: 4, status: PayoutSplitLineStatus.PAID }),
    ]

    expect(selectDraftLines(lines).map((l) => l.id)).toEqual([1, 3])
  })

  test('mọi dòng đã xác nhận ⇒ rỗng, nên nút không hiện', () => {
    const lines = [
      line({ id: 1, status: PayoutSplitLineStatus.CONFIRMED }),
      line({ id: 2, status: PayoutSplitLineStatus.CONFIRMED }),
    ]

    expect(selectDraftLines(lines)).toEqual([])
  })

  test('pool chưa nhập chia ⇒ rỗng', () => {
    expect(selectDraftLines([])).toEqual([])
  })
})

describe('buildSkippedRows', () => {
  const result = (skipped: ConfirmLinesResult['skipped']): ConfirmLinesResult => ({
    confirmed: [1],
    skipped,
  })

  test('ghép được mã + tên nhân sự từ bảng đang hiển thị', () => {
    const rows = buildSkippedRows(result([{ line_id: 3, reason: 'Summary is not DRAFT.' }]), [
      line({ id: 1 }),
      line({ id: 3, employee_code: 'MV000013309', employee_name: 'Nguyễn Thu Hiền' }),
    ])

    expect(rows).toEqual([
      {
        lineId: 3,
        employeeCode: 'MV000013309',
        employeeName: 'Nguyễn Thu Hiền',
        reason: 'Summary is not DRAFT.',
      },
    ])
  })

  test('dòng không tra được vẫn hiện ra, không bị nuốt', () => {
    // Bảng đã refetch và dòng biến mất. Bỏ qua nó là báo cáo thiếu một dòng chưa duyệt —
    // kế toán sẽ tưởng đã duyệt hết.
    const rows = buildSkippedRows(result([{ line_id: 99, reason: 'Kỳ đã khoá' }]), [
      line({ id: 1 }),
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ lineId: 99, employeeName: 'Dòng #99', employeeCode: '' })
  })

  test('không có dòng nào bị bỏ qua ⇒ rỗng, để trang biết là chỉ cần toast', () => {
    expect(buildSkippedRows(result([]), [line({ id: 1 })])).toEqual([])
  })

  test('giữ nguyên thứ tự và không gộp nhiều dòng bị bỏ qua', () => {
    const rows = buildSkippedRows(
      result([
        { line_id: 2, reason: 'ly do A' },
        { line_id: 1, reason: 'ly do B' },
      ]),
      [line({ id: 1 }), line({ id: 2 })]
    )

    expect(rows.map((r) => r.lineId)).toEqual([2, 1])
    expect(rows.map((r) => r.reason)).toEqual(['ly do A', 'ly do B'])
  })
})
