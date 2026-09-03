import { render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }))
vi.mock('firebase/analytics', () => ({ getAnalytics: vi.fn() }))
vi.mock('firebase/messaging', () => ({ getMessaging: vi.fn(), getToken: vi.fn() }))

const workspace = {
  periods: [
    {
      record: {
        id: 1,
        effective_from: '2026-07-01',
        effective_to: '2026-07-31',
        pct_agency_fee: '5',
        is_agency_fee_include_vat: false,
        amt_shared_bonus: '20000000',
        pct_sale_commission: '2',
        amt_staff_incentive: '5000000',
        note: 'Ghi chú',
        approval_status: 'active',
      },
      period_status: 'active',
      is_current: true,
      can_edit: true,
      can_delete: true,
    },
  ],
}

// Factory nội tuyến, không tham chiếu biến ngoài: `vi.mock` được hoist lên đầu file
// nên một `const` khai ở trên vẫn nằm trong vùng chết và ném ReferenceError.
vi.mock('@/services/realestate-service', () => ({
  useCommissionWorkspaceSACore: () => ({ data: workspace, isLoading: false }),
  useExchanges: () => ({ data: { results: [] } }),
  useSubmitTbcCommission: () => ({ mutateAsync: vi.fn() }),
  useApproveTbcCommission: () => ({ mutateAsync: vi.fn() }),
  useRejectTbcCommission: () => ({ mutateAsync: vi.fn() }),
  useRevertTbcCommissionToDraft: () => ({ mutateAsync: vi.fn() }),
  useReopenTbcCommission: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

// Nhãn trạng thái do backend cấp (`TimeBoundCommission_ApprovalStatus`). Mock đúng
// shape mà `useAppConstant` trả ra sau khi chuẩn hoá: Record<value, label>.
const APPROVAL_LABELS: Record<string, string> = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt · chờ hiệu lực',
  active: 'Đang áp dụng',
  expired: 'Đã hết hiệu lực',
  rejected: 'Từ chối',
}

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMap: new Map([['TimeBoundCommission_ApprovalStatus', APPROVAL_LABELS]]),
    keysMapOptions: new Map(),
  }),
}))

import SaleAllocationTbcCommissionTable from '../SaleAllocationTbcCommissionTable'

/**
 * ClickUp 86eyhybt4 — "Thưởng MV" (`amt_staff_incentive`) có ở form nhập nhưng
 * thiếu ở mọi bảng đọc. Hai bảo chứng ở đây:
 *
 *  1. Cột "Thưởng MV" thực sự hiện, và hiện đúng số đã cấu hình.
 *  2. Số cột lá của header (đã tính colSpan) KHỚP số ô của một dòng dữ liệu.
 *     Header dùng 2 tầng với `colSpan`/`rowSpan`, nên thêm một cột dữ liệu mà
 *     quên nâng `colSpan` của nhóm "Chia cho Sale" sẽ làm toàn bộ bảng lệch một
 *     cột — hỏng âm thầm, mắt thường rất khó bắt.
 */
// `hideCurrentConfig` để chỉ còn MỘT bảng trong DOM — card "Cấu hình đang áp
// dụng" cũng là một <table> và được kiểm riêng ở CurrentTbcConfigCard.test.tsx.
function renderTable() {
  return render(
    <MemoryRouter>
      <SaleAllocationTbcCommissionTable saleAllocationId={1} hideCurrentConfig />
    </MemoryRouter>
  )
}

describe('SaleAllocationTbcCommissionTable — cột Thưởng MV', () => {
  it('hiện cột "Thưởng MV" ở bảng lịch sử cấu hình', () => {
    const { getAllByRole } = renderTable()

    const headerTexts = getAllByRole('columnheader').map((th) => th.textContent?.trim())
    expect(headerTexts).toContain('Thưởng MV')
  })

  it('hiện đúng số tiền Thưởng MV đã cấu hình', () => {
    const { getByText } = renderTable()

    expect(getByText(/5\.000\.000/)).toBeTruthy()
  })

  it('số cột lá của header khớp số ô dữ liệu của một dòng', () => {
    const { getAllByRole } = renderTable()

    // rows[0] = tầng nhóm, rows[1] = tầng nhãn lá, rows[2] = dòng dữ liệu đầu tiên.
    const [outerRow, innerRow, firstBodyRow] = getAllByRole('row')
    // Ô có `rowspan=2` tự nó là cột lá; ô không có `rowspan` chỉ là tiêu đề nhóm,
    // cột lá của nó nằm ở tầng dưới nên đếm theo tầng dưới để khỏi đếm trùng.
    const spannedDownCells = within(outerRow)
      .getAllByRole('columnheader')
      .filter((th) => Number(th.getAttribute('rowspan') ?? 1) >= 2).length
    const leafColumns = spannedDownCells + within(innerRow).getAllByRole('columnheader').length

    expect(leafColumns).toBe(within(firstBodyRow).getAllByRole('cell').length)
  })
})

/**
 * ClickUp 86exm4ud9 — cột "Trạng thái" phải đọc `approval_status`, KHÔNG đọc
 * `period_status`.
 *
 * Hai trục này khác nhau và sẽ mâu thuẫn: một kỳ đã tới ngày hiệu lực nhưng chưa ai
 * duyệt thì `period_status = 'active'` (đúng theo ngày) trong khi commission engine
 * hoàn toàn không thấy nó. Hiện "Đang áp dụng" cho một cấu hình như vậy là nói dối
 * người đọc trên đúng màn quyết định hoa hồng.
 *
 * Fixture dưới đây cố tình dựng đúng cặp mâu thuẫn đó, nên nếu ai đổi ngược về
 * `period_status` thì test đỏ ngay — chứ không phải chỉ khi số liệu lệch.
 */
describe('SaleAllocationTbcCommissionTable — cột Trạng thái đọc approval_status', () => {
  function renderWithPeriods(periods: unknown[]) {
    workspace.periods = periods as typeof workspace.periods
    return render(
      <MemoryRouter>
        <SaleAllocationTbcCommissionTable saleAllocationId={1} hideCurrentConfig />
      </MemoryRouter>
    )
  }

  const basePeriod = (approval_status: string, period_status: string, id = 1) => ({
    record: { id, effective_from: '2026-07-01', effective_to: '2026-07-31', approval_status },
    period_status,
    is_current: period_status === 'active',
    can_edit: true,
    can_delete: true,
  })

  it('kỳ chưa duyệt nhưng đã tới ngày hiệu lực vẫn hiện "Chờ duyệt", không hiện "Đang áp dụng"', () => {
    const { getByText, queryByText } = renderWithPeriods([basePeriod('pending', 'active')])

    expect(getByText('Chờ duyệt')).toBeTruthy()
    expect(queryByText('Đang áp dụng')).toBeNull()
  })

  it('kỳ đã duyệt và đang trong khoảng ngày thì hiện "Đang áp dụng"', () => {
    const { getByText } = renderWithPeriods([basePeriod('active', 'active')])

    expect(getByText('Đang áp dụng')).toBeTruthy()
  })

  it('kỳ đã duyệt nhưng chưa tới ngày hiện trạng thái trung gian', () => {
    const { getByText } = renderWithPeriods([basePeriod('approved', 'scheduled')])

    expect(getByText('Đã duyệt · chờ hiệu lực')).toBeTruthy()
  })

  it('badge đếm đúng số cấu hình đang chờ duyệt', () => {
    // Trước 86exm4ud9 badge đếm `period_status === 'upcoming'` — một giá trị BE chưa
    // bao giờ phát ra, nên nó là code chết và không lần nào hiện.
    const { getByText } = renderWithPeriods([
      basePeriod('pending', 'scheduled', 1),
      basePeriod('pending', 'scheduled', 2),
      basePeriod('active', 'active', 3),
    ])

    expect(getByText('2 chờ duyệt')).toBeTruthy()
  })
})
