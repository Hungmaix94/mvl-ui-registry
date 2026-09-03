import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }))
vi.mock('firebase/analytics', () => ({ getAnalytics: vi.fn() }))
vi.mock('firebase/messaging', () => ({ getMessaging: vi.fn(), getToken: vi.fn() }))

const record = {
  id: 1,
  effective_from: '2026-07-01',
  effective_to: '2026-07-31',
  pct_agency_fee: '5',
  is_agency_fee_include_vat: false,
  amt_staff_incentive: '5000000',
  tbc_source: 'sa',
  approval_status: 'active',
} as Record<string, unknown>

// Metadata cua dong ky — moi describe ghi de trong `beforeEach` cua no.
const periodMeta = {
  period_status: 'active',
  is_current: true,
  can_edit: true,
  can_delete: true,
  can_reopen: false,
  recommended_action: 'edit',
  lock_reason: undefined as string | undefined,
  edit_scope: 'product_inventory',
}

// Quyen bi tu choi duoc khai o day; mac dinh moi quyen deu co.
const deniedAbilities = new Set<string>()

vi.mock('@/services/realestate-service', () => ({
  useCommissionWorkspacePICore: () => ({
    data: {
      periods: [{ record, ...periodMeta }],
      current: { entry: { record } },
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
  parseCommissionLockError: () => ({}),
  // Factory noi tuyen: vi.mock duoc hoist len dau file nen khong tham chieu bien ngoai.
  useSubmitPiTbcCommission: () => ({ mutateAsync: vi.fn() }),
  useApprovePiTbcCommission: () => ({ mutateAsync: vi.fn() }),
  useRejectPiTbcCommission: () => ({ mutateAsync: vi.fn() }),
  useReopenPiTbcCommission: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: (action: string) => !deniedAbilities.has(action) }),
}))

// Nhan trang thai duyet do backend cap (TimeBoundCommission_ApprovalStatus).
vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMap: new Map([
      [
        'TimeBoundCommission_ApprovalStatus',
        {
          draft: 'Nháp',
          pending: 'Chờ duyệt',
          approved: 'Đã duyệt · chờ hiệu lực',
          active: 'Đang áp dụng',
          expired: 'Đã hết hiệu lực',
          rejected: 'Từ chối',
        },
      ],
    ]),
    keysMapOptions: new Map(),
  }),
}))

vi.mock('@/features/project/product-inventories/services/product-inventory-tbc-service', () => ({
  useDeleteProductInventoryTbc: () => ({ mutateAsync: vi.fn() }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => mockNavigate,
}))

const mockDisplayConfirm = vi.fn()
const mockDisplayClose = vi.fn()
vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({
    displayConfirm: mockDisplayConfirm,
    displayClose: mockDisplayClose,
    displayFormContent: vi.fn(),
    setLoading: vi.fn(),
  }),
}))

import ProjectProductInventoryTbcCommissionTable from './ProjectProductInventoryTbcCommissionTable'

/**
 * ClickUp 86eyhybt4 — bên PI, tab "Phí và Thưởng" dựng cột từ mảng `categories`
 * và mảng đó thiếu `staff_incentive`.
 *
 * Bẫy đi kèm: nhãn VAT ở đây render theo `is_<key>_include_vat`, mà schema KHÔNG
 * có cờ đó cho `staff_incentive`. Trước khi chặn, mọi khoản thiếu cờ đều đọc ra
 * `undefined` và bị gắn nhãn "Không VAT" — một khẳng định nghiệp vụ bịa ra từ dữ
 * liệu không tồn tại.
 */
function renderTable() {
  return render(
    <MemoryRouter>
      <ProjectProductInventoryTbcCommissionTable productInventoryId={1} salesAllocationId={9} />
    </MemoryRouter>
  )
}

describe('ProjectProductInventoryTbcCommissionTable — cột Thưởng MV', () => {
  it('hiện "Thưởng MV" ở cả bảng lịch sử và khối cấu hình đang áp dụng', () => {
    const { getAllByRole, getAllByText } = renderTable()

    const headerTexts = getAllByRole('columnheader').map((th) => th.textContent?.trim())
    expect(headerTexts).toContain('Thưởng MV')
    // Khối "Cấu hình hoa hồng đang được áp dụng" nằm ngoài <table> → 2 chỗ hiện nhãn.
    expect(getAllByText('Thưởng MV').length).toBeGreaterThanOrEqual(2)
    expect(getAllByText(/5\.000\.000/).length).toBeGreaterThanOrEqual(1)
  })

  it('ô Thưởng MV KHÔNG gắn nhãn VAT vì schema không có cờ tương ứng', () => {
    const { getAllByRole } = renderTable()

    const headerTexts = getAllByRole('columnheader').map((th) => th.textContent?.trim())
    const columnIndex = headerTexts.indexOf('Thưởng MV')
    const [, bodyRow] = getAllByRole('row')
    const cell = within(bodyRow).getAllByRole('cell')[columnIndex]

    expect(cell.textContent).toContain('5.000.000')
    expect(cell.textContent).not.toContain('VAT')
  })
})

/**
 * ClickUp 86exm4ud9 — màn Căn hộ và màn Bảng hàng liệt kê CÙNG những bản ghi
 * `TimeBoundCommission`. Để mỗi màn đọc một trục trạng thái là cùng một cấu hình
 * hiện hai thứ trái ngược, và bản đọc `period_status` là bản nói dối: nó báo
 * "Đang áp dụng" cho cấu hình mà commission engine không hề nhìn thấy.
 *
 * Fixture dựng đúng cặp mâu thuẫn đó (`period_status: 'active'` +
 * `approval_status: 'pending'`), nên đổi ngược về `period_status` là test đỏ.
 */
describe('ProjectProductInventoryTbcCommissionTable — cột Trạng thái đọc approval_status', () => {
  it('kỳ chưa duyệt nhưng đã tới ngày hiệu lực hiện "Chờ duyệt", không hiện "Đang áp dụng"', () => {
    record.approval_status = 'pending'
    const { getByText, queryByText } = renderTable()

    expect(getByText('Chờ duyệt')).toBeTruthy()
    expect(queryByText('Đang áp dụng')).toBeNull()
  })

  it('kỳ đã duyệt và trong khoảng ngày hiện "Đang áp dụng"', () => {
    record.approval_status = 'active'
    const { getAllByText } = renderTable()

    expect(getAllByText('Đang áp dụng').length).toBeGreaterThan(0)
  })
})

/**
 * ClickUp 86exzg7u1 — "Hoa hồng sale"/"Thưởng cho sale" luôn không VAT theo quy
 * tắc nghiệp vụ (HDSD 1.3, FR-M3) và bị BE ép cứng False khi tính hoa hồng thật
 * (deal_commission_config_service._apply_vat_rules). Màn "Bảng hàng" từng gắn
 * chip VAT cho 2 khoản này dù cờ is_*_include_vat trong data là true — bịa ra
 * một cấu hình mà tầng tính tiền không hề tôn trọng. Màn "Bảng chia hoa hồng"
 * (SaleAllocationTbcCommissionTable) đã đúng từ trước; test này khoá màn
 * "Bảng hàng" theo cùng hành vi.
 */
describe('ProjectProductInventoryTbcCommissionTable — nhóm "Chia cho Sale" luôn không VAT', () => {
  it('không gắn chip VAT cho "HH nhân viên bán hàng" / "Thưởng cho sale" dù cờ include_vat = true', () => {
    record.approval_status = 'active'
    record.pct_sale_commission = '2,1'
    record.is_sale_commission_include_vat = true
    record.pct_investor_bonus_to_sale = '3.000.000'
    record.amt_investor_bonus_to_sale = '3000000'
    record.is_investor_bonus_to_sale_include_vat = true

    const { getAllByRole } = renderTable()

    const headerTexts = getAllByRole('columnheader').map((th) => th.textContent?.trim())
    const [, bodyRow] = getAllByRole('row')
    const bodyCells = within(bodyRow).getAllByRole('cell')

    for (const label of ['HH nhân viên bán hàng', 'Thưởng cho sale']) {
      const columnIndex = headerTexts.indexOf(label)
      expect(bodyCells[columnIndex].textContent).not.toContain('VAT')
    }
  })
})

/**
 * Mở lại cấu hình đã duyệt (2026-08-25).
 *
 * Trước đó, sửa một cấu hình `active` chưa phát sinh giao dịch vẫn đi lọt: BE nhận
 * PATCH rồi âm thầm hạ nó về `pending`. Cấu hình rời khỏi engine hoa hồng giữa
 * request mà không ai quyết định. Nay BE chặn hẳn và trả `recommended_action:
 * "reopen"`; việc gỡ chữ ký trở thành một hành động riêng, và là quyền của NGƯỜI
 * DUYỆT — thư ký lập chỉ được nhắc đi xin.
 */
describe('ProjectProductInventoryTbcCommissionTable — mở lại cấu hình đã duyệt', () => {
  beforeEach(() => {
    deniedAbilities.clear()
    record.approval_status = 'active'
    record.tbc_source = 'pi'
    Object.assign(periodMeta, {
      can_edit: false,
      can_delete: false,
      can_reopen: true,
      recommended_action: 'reopen',
      lock_reason: 'Cấu hình đã được duyệt. Hãy mở lại trước khi chỉnh sửa.',
      edit_scope: 'product_inventory',
    })
  })

  function openRowMenu() {
    const [, bodyRow] = screen.getAllByRole('row')
    const menuTrigger = within(bodyRow)
      .getAllByRole('button')
      .at(-1) as HTMLElement
    fireEvent.click(menuTrigger)
  }

  it('hiện nút "Mở lại" khi BE cho phép và người dùng có quyền', () => {
    renderTable()
    openRowMenu()

    expect(screen.getByText('Mở lại')).toBeTruthy()
  })

  it('ẩn nút "Mở lại" với người KHÔNG có quyền duyệt', () => {
    deniedAbilities.add('reopen')
    renderTable()
    openRowMenu()

    expect(screen.queryByText('Mở lại')).toBeNull()
  })

  it('ẩn nút "Mở lại" trên dòng kế thừa từ Bảng hàng', () => {
    // Dòng của Bảng hàng được mở lại ở màn Bảng hàng — cùng ranh giới mà nút
    // Sửa/Xoá đã đặt sẵn. BE cũng trả can_reopen=false cho dòng này.
    Object.assign(periodMeta, {
      can_reopen: false,
      edit_scope: 'sales_allocation',
      recommended_action: 'manage_at_sales_allocation',
    })
    renderTable()
    openRowMenu()

    expect(screen.queryByText('Mở lại')).toBeNull()
  })

  it('bấm "Chỉnh sửa" trên cấu hình đã duyệt mở hộp xác nhận thay vì điều hướng', () => {
    renderTable()
    openRowMenu()
    fireEvent.click(screen.getByText('Chỉnh sửa'))

    // Không điều hướng sang màn sửa; người dùng phải quyết định mở lại trước.
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockDisplayConfirm).toHaveBeenCalled()
    expect(mockDisplayConfirm.mock.calls[0][0].title).toBe('Cấu hình đã duyệt')
  })
})
