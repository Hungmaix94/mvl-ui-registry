import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const emptyPage = { items: [], nextPage: null, hasNextPage: false }

// Giá trị thật lấy từ GET /api/constants/ → realestate.ProductInventory_STATUS_CHOICES
const STATUS_OPTIONS = [
  { value: 'available', label: 'Còn trống' },
  { value: 'reserved', label: 'Giữ chỗ' },
  { value: 'deposited', label: 'Đã cọc' },
  { value: 'sold', label: 'Đã bán' },
  { value: 'locked', label: 'Đã khóa' },
]

const mockKeysMapOptions = new Map<string, Array<{ value: string; label: string }>>()

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMapOptions: mockKeysMapOptions }),
}))

beforeEach(() => {
  mockKeysMapOptions.clear()
  mockKeysMapOptions.set('ProductInventory_STATUS_CHOICES', STATUS_OPTIONS)
})

vi.mock('@/hooks/useInvestorSelect', () => ({
  useInvestorSelect: () => ({
    loadInvestorOptions: vi.fn().mockResolvedValue(emptyPage),
    loadInitialInvestorOptions: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/hooks/useExchangeSelect', () => ({
  useExchangeSelect: () => ({
    loadExchangeOptions: vi.fn().mockResolvedValue(emptyPage),
    loadInitialExchangeOptions: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/features/project/booking-contract/services/useBookingContractLoadOptions', () => ({
  useBookingContractLoadOptions: () => ({
    loadProjectOptions: vi.fn().mockResolvedValue(emptyPage),
    loadSalesAllocationOptions: vi.fn().mockResolvedValue(emptyPage),
    loadInitialProjectOptions: vi.fn().mockResolvedValue([]),
    loadInitialSalesAllocationOptions: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({ getSalesAllocation: vi.fn().mockResolvedValue(null) }),
}))

import { ProductInventoryForm } from './ProductInventoryForm'

function mountForm(props: { isEdit?: boolean; contextSaId?: number } = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ProductInventoryForm
        initialValues={{ sales_allocation_id: 1, investor_id: 2, project_id: 3 }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  )
}

const SA_TRIGGER = { name: /Thông tin bán hàng/ }

describe('ProductInventoryForm — khoá Thông tin bán hàng khi sửa', () => {
  it('không cho đổi SA của một căn đã tạo (đổi SA làm lệch tỷ lệ hoa hồng thừa kế)', () => {
    const { getByRole } = mountForm({ isEdit: true })

    expect(getByRole('combobox', SA_TRIGGER)).toBeDisabled()
  })

  it('vẫn cho chọn SA khi tạo mới ngoài ngữ cảnh một SA cụ thể', () => {
    const { getByRole } = mountForm()

    expect(getByRole('combobox', SA_TRIGGER)).not.toBeDisabled()
  })
})

// ClickUp 86eybhjyv: BE khoá ghi status/condition qua API từ 843978ebd2, option "Đã khóa" chưa
// từng có luồng nghiệp vụ nào dùng và SRS 17.4 đã bỏ state này khỏi thiết kế mới — chọn nó rồi
// Lưu trước đây API vẫn trả 200 nhưng không đổi gì (dead control). Ẩn khỏi dropdown cho tới khi
// ticket chốt hướng (bỏ hẳn hay xây tính năng khóa thật).
describe('ProductInventoryForm — ẩn option "Đã khóa" khỏi dropdown Trạng thái', () => {
  it('không liệt kê option "locked" trong danh sách chọn', async () => {
    const user = userEvent.setup()
    const { getByRole, getByText, queryByText } = mountForm()

    await user.click(getByRole('combobox', { name: /Trạng thái/ }))

    expect(queryByText('Đã khóa')).not.toBeInTheDocument()
    expect(getByText('Đã bán')).toBeInTheDocument()
    expect(getByText('Đã cọc')).toBeInTheDocument()
  })
})
