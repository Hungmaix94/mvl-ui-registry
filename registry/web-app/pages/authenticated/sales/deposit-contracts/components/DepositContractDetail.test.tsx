import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// CR 86eygvtba: người dùng tra cứu sản phẩm trước tiên, nên "Thông tin BĐS" phải nằm
// ĐẦU trang chi tiết hợp đồng cọc — trước "Thông tin Hợp đồng", không còn nằm lọt giữa
// "Đầu mối dự án" và "Nhân sự phụ trách bán" như trước.

// `keysMap` phải đổi được giữa các test: nhóm test nhãn phê duyệt cần bộ choice thật,
// nhóm test thứ tự section thì không quan tâm. `vi.hoisted` để biến sống trước khi `vi.mock` chạy.
const constantState = vi.hoisted(() => ({ keysMap: new Map<string, unknown>() }))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: constantState.keysMap, keysMapOptions: new Map() }),
}))

vi.mock('@/hooks/useApiQuery', () => ({
  useApiQuery: () => ({
    data: {
      id: 99,
      unit_number: 'TT-03.10',
      area: '120',
      project: { id: 7, name: 'Central Lakeside' },
    },
  }),
}))

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({ getProductInventory: vi.fn() }),
  useProjectStaffs: () => ({ data: { results: [] } }),
}))

vi.mock('@/features/sales/components/CustomerDetailCard', () => ({
  CustomerDetailCard: () => <div>MOCK_CUSTOMER_CARD</div>,
}))
vi.mock('@/features/sales/components/ProjectPreviewBox', () => ({
  ProjectPreviewBox: () => <div>MOCK_PROJECT_BOX</div>,
}))
vi.mock('@/features/sales/components/EmployeePreviewBox', () => ({
  EmployeePreviewBox: () => <div>MOCK_EMPLOYEE_BOX</div>,
}))
vi.mock('@/features/sales/components/ConfirmationLogsTable', () => ({
  ConfirmationLogsTable: () => <div>MOCK_CONFIRMATION_LOGS</div>,
}))
vi.mock('@/features/sales/components/SalesStaffDetailTable', () => ({
  SalesStaffDetailTable: () => <div>MOCK_SALES_STAFF_TABLE</div>,
}))
vi.mock('@/features/sales/utils/customer-mapper', () => ({
  mapContractCustomerData: () => ({}),
}))

import { DepositContractDetail } from './DepositContractDetail'
import type { DepositContractDetail as DepositContractDetailType } from '@/features/sales/deposit-contracts/services/deposit-contract-service'

const contract = {
  id: 1,
  contract_number: 'HDC-001',
  contract_date: '2026-01-15',
  listed_price: '35558129000',
  fee_calculation_price: '32325571818',
  project_detail: { id: 7, name: 'Central Lakeside' },
  product_inventory_detail: { id: 99 },
  booking_details: [],
  sales_staff: [],
  attachments: [],
  fee_support_requests: [],
} as unknown as DepositContractDetailType

const renderDetail = (overrides: Partial<DepositContractDetailType> = {}) =>
  render(
    <MemoryRouter>
      <DepositContractDetail contract={{ ...contract, ...overrides }} />
    </MemoryRouter>
  )

/** Vị trí xuất hiện của một tiêu đề section trong thứ tự DOM. */
const headingIndex = (label: string) => {
  const headings = screen.getAllByText(
    /^(Thông tin BĐS|Thông tin Hợp đồng|Thông tin thanh toán|Thông tin khách hàng|Thông tin dự án|Đầu mối dự án|Nhân sự phụ trách bán|Tài liệu đính kèm)$/
  )
  return headings.findIndex((node) => node.textContent === label)
}

describe('DepositContractDetail — thứ tự section', () => {
  it('hiển thị "Thông tin BĐS" ở đầu trang, trước "Thông tin Hợp đồng"', () => {
    renderDetail()

    const bdsIndex = headingIndex('Thông tin BĐS')
    expect(bdsIndex).toBe(0)
    expect(bdsIndex).toBeLessThan(headingIndex('Thông tin Hợp đồng'))
  })

  it('giữ nguyên thứ tự các section còn lại sau "Thông tin BĐS"', () => {
    renderDetail()

    const order = [
      'Thông tin BĐS',
      'Thông tin Hợp đồng',
      'Thông tin thanh toán',
      'Thông tin khách hàng',
      'Thông tin dự án',
      'Đầu mối dự án',
      'Nhân sự phụ trách bán',
      'Tài liệu đính kèm',
    ].map(headingIndex)

    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(order.every((index) => index >= 0)).toBe(true)
  })

  it('vẫn render nội dung BĐS (tên sản phẩm + các trường) sau khi đổi vị trí', () => {
    renderDetail()

    expect(screen.getByText('Central Lakeside - TT-03.10')).toBeInTheDocument()
    expect(screen.getByText('Diện tích (m²)')).toBeInTheDocument()
    expect(screen.getByText('Tên sản phẩm')).toBeInTheDocument()
  })
})

// 86eymkje9 — ảnh BA đính kèm (HĐ 3032) cho thấy chip "Trạng thái phê duyệt" hiện enum thô
// `pending_accountant`, trong khi chip "Trạng thái" ngay bên cạnh dịch đúng ("Chờ duyệt").
// Nguyên nhân: cả hai chip cùng lấy nhãn từ `DepositContract_STATUS_CHOICES`, mà bộ này KHÔNG
// chứa 5 bàn duyệt `pending_*`. Hai hằng dưới đây chép đúng dữ liệu API thật trả về, nên test
// sẽ đỏ ngay nếu ai đó gộp lại một nguồn nhãn.
const STATUS_CHOICES_LIVE = {
  new: 'Mới',
  pending_approval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  abandoned: 'Đã bỏ',
  refunded: 'Đã hoàn tiền',
  rejected: 'Đã từ chối',
}

const APPROVAL_STATUS_CHOICES_LIVE = {
  pending_confirm: 'Chờ người bán cùng xác nhận',
  pending_manager: 'Chờ trưởng phòng duyệt',
  pending_admin: 'Chờ TKKD duyệt',
  pending_admin_lead: 'Chờ Trưởng phòng TKKD duyệt',
  pending_accountant: 'Chờ kế toán duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
}

describe('DepositContractDetail — nhãn trạng thái phê duyệt', () => {
  beforeEach(() => {
    constantState.keysMap = new Map<string, unknown>([
      ['DepositContract_STATUS_CHOICES', STATUS_CHOICES_LIVE],
      ['DepositContract_APPROVAL_STATUS_CHOICES', APPROVAL_STATUS_CHOICES_LIVE],
    ])
  })

  afterEach(() => {
    constantState.keysMap = new Map<string, unknown>()
  })

  it.each(Object.entries(APPROVAL_STATUS_CHOICES_LIVE))(
    'dịch "%s" thành nhãn tiếng Việt, không để lọt enum thô',
    (value, label) => {
      renderDetail({ approval_status: value } as Partial<DepositContractDetailType>)

      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.queryByText(value)).not.toBeInTheDocument()
    }
  )

  it('dựng đúng cảnh trong ảnh của BA: "Chờ duyệt" ở vòng đời, "Chờ kế toán duyệt" ở phê duyệt', () => {
    renderDetail({
      status: 'pending_approval',
      approval_status: 'pending_accountant',
    } as Partial<DepositContractDetailType>)

    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument()
    expect(screen.getByText('Chờ kế toán duyệt')).toBeInTheDocument()
    expect(screen.queryByText('pending_accountant')).not.toBeInTheDocument()
  })
})
