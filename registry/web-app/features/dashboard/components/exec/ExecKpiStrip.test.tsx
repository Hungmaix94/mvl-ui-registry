import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import ExecKpiStrip from './ExecKpiStrip'

/**
 * Ca gốc: vai trò TGD trên staging bị 403 ở một endpoint, dải KPI hiện "0". Con số đó đọc y hệt
 * "không còn khoản nào" — sai, và sai theo hướng trấn an. Dải này gọi 3 endpoint với 3 quyền khác
 * nhau nên thiếu một quyền là chuyện thường; hỏng thì phải hiện "—".
 */

const acc = vi.fn()
const sales = vi.fn()
const trend = vi.fn()

vi.mock('@/features/accounting/accountant-dashboard/services/accountant-dashboard-service', () => ({
  useAccountantDashboardSummary: () => acc(),
}))
vi.mock('@/features/sales/admin-dashboard/services/admin-dashboard-service', () => ({
  useAdminDashboardSummary: () => sales(),
  useAdminDashboardRevenueTrend: () => trend(),
}))

const ok = (data: unknown) => ({ data, isLoading: false, isError: false })
const failed = { data: undefined, isLoading: false, isError: true }

describe('ExecKpiStrip — endpoint hỏng thì hiện "—", KHÔNG hiện 0', () => {
  beforeEach(() => {
    acc.mockReturnValue(
      ok({
        total_collected: '2260000000',
        investor_receivable: '314100000',
        f2_payable: '171700000',
      })
    )
    sales.mockReturnValue(
      ok({
        active_projects: 214,
        sold_this_month: 19,
        confirmed_reconciliation_amount: '3160000000',
      })
    )
    trend.mockReturnValue(ok({ points: [{ revenue_amount: '6640000000' }] }))
  })

  it('đủ quyền: hiện đúng số của cả bốn thẻ', () => {
    render(<ExecKpiStrip />)

    expect(screen.getByText('6,64')).toBeInTheDocument() // doanh thu kỳ này
    expect(screen.getByText('2,26')).toBeInTheDocument() // đã thu trong tháng
    expect(screen.getByText('314,1')).toBeInTheDocument() // phải thu CĐT
    expect(screen.getByText('19')).toBeInTheDocument() // đã bán trong tháng
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('hỏng endpoint kế toán: 2 ô tiền thành "—", ô lấy nguồn khác KHÔNG bị ảnh hưởng', () => {
    acc.mockReturnValue(failed)
    render(<ExecKpiStrip />)

    // "Đã thu trong tháng" + "Phải thu (CĐT)" cùng lấy từ endpoint kế toán.
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.getByText('6,64')).toBeInTheDocument()
    expect(screen.getByText('19')).toBeInTheDocument()
  })

  it('hỏng endpoint sales: ô "Đã bán" thành "—", các ô tiền vẫn còn số', () => {
    sales.mockReturnValue(failed)
    render(<ExecKpiStrip />)

    expect(screen.getAllByText('—')).toHaveLength(1)
    expect(screen.getByText('2,26')).toBeInTheDocument()
  })

  // Số 0 THẬT phải hiện là 0 — nếu không, ta lại đổi sai lầm này lấy sai lầm ngược lại.
  it('0 thật vẫn hiện 0, không nhầm sang "—"', () => {
    sales.mockReturnValue(ok({ sold_this_month: 0 }))
    render(<ExecKpiStrip />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })
})

/**
 * Canh số lượng thẻ. Dải này đã một lần phình lên 12 chỉ số rồi trở thành bảng liệt kê, không còn
 * là dải chỉ số — test này để lần phình tiếp theo phải là một quyết định có ý thức, kèm sửa test,
 * chứ không trôi vào lúc nào không hay.
 *
 * Bám vào NHÃN thẻ chứ không đếm div: đếm div thì đổi một lớp bọc là đỏ oan.
 */
describe('ExecKpiStrip — đúng bốn thẻ, không hơn', () => {
  beforeEach(() => {
    acc.mockReturnValue(ok({ total_collected: '1', investor_receivable: '2' }))
    sales.mockReturnValue(ok({ sold_this_month: 3 }))
    trend.mockReturnValue(ok({ points: [{ revenue_amount: '4' }] }))
  })

  it('hiện đúng 4 nhãn đã chốt', () => {
    render(<ExecKpiStrip />)

    for (const label of [
      'Doanh thu kỳ này',
      'Đã thu trong tháng',
      'Phải thu (CĐT)',
      'Đã bán trong tháng',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  // Những chỉ số đã cắt: nhân sự/tuyển dụng có biểu đồ riêng ngay dưới, F2 và đối soát nằm ở bảng
  // kế toán. Chúng quay lại đây là dải lại phình.
  it.each([
    'Phải trả (F2)',
    'Dự án đang mở bán',
    'Đối soát đã xác nhận',
    'Nhân sự đang làm việc',
    'HĐ sắp hết hạn',
    'Vị trí đang tuyển',
  ])('KHÔNG còn chỉ số "%s"', (label) => {
    render(<ExecKpiStrip />)

    expect(screen.queryByText(label)).not.toBeInTheDocument()
  })
})
