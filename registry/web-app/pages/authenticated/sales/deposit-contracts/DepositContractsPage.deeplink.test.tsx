import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const useDepositContractsMock = vi.fn((_params: Record<string, unknown>, _options?: unknown) => ({
  data: undefined,
  isLoading: false,
  error: null,
}))

vi.mock('@/features/sales/deposit-contracts/services/deposit-contract-service', () => ({
  useDepositContracts: (params: Record<string, unknown>, options?: unknown) =>
    useDepositContractsMock(params, options),
  // Luồng "Duyệt nhiều" (CR STT35) không thuộc phạm vi test này, nhưng trang gọi hook nên
  // mock phải khai — mock từng-export thiếu một cái là cả trang ném lỗi lúc render.
  useBulkApproveDepositContracts: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

// The table/filter subtree is irrelevant here — this locks the URL → API param
// mapping only.
vi.mock('./components/DepositContractListTable', () => ({ default: () => null }))
vi.mock('./components/DepositContractFilter', () => ({ default: () => null }))
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

import DepositContractsPage from './DepositContractsPage'

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/deposit-contracts${search}`]}>
      <DepositContractsPage />
    </MemoryRouter>
  )

const lastParams = () => useDepositContractsMock.mock.calls.at(-1)?.[0]

describe('DepositContractsPage deep-link params', () => {
  beforeEach(() => useDepositContractsMock.mockClear())

  it('forwards awaiting_me from the admin dashboard queue card', async () => {
    renderAt('?awaiting_me=true')
    await waitFor(() => expect(lastParams()?.awaiting_me).toBe(true))
  })

  it('omits awaiting_me when the URL does not carry it', async () => {
    renderAt('?status=pending_approval')
    await waitFor(() => expect(lastParams()?.status__in).toEqual(['pending_approval']))
    expect(lastParams()).not.toHaveProperty('awaiting_me')
  })

  // Dashboard 18.7 vẫn bắn dạng đơn trị `?approval_status=...`. Sau khi ô lọc đổi sang
  // chọn-nhiều, link đó phải được dịch sang `approval_status__in` chứ không được rơi mất.
  it('translates a legacy single approval_status deep link into the __in param', async () => {
    renderAt('?approval_status=pending_manager')
    await waitFor(() => expect(lastParams()?.approval_status__in).toEqual(['pending_manager']))
    expect(lastParams()).not.toHaveProperty('approval_status')
  })

  it('forwards several approval stages at once', async () => {
    renderAt('?approval_status__in=pending_manager,pending_accountant')
    await waitFor(() =>
      expect(lastParams()?.approval_status__in).toEqual(['pending_manager', 'pending_accountant'])
    )
  })

  it('omits approval_status when the URL does not carry it', async () => {
    renderAt('?page=1')
    await waitFor(() => expect(lastParams()).toBeDefined())
    expect(lastParams()).not.toHaveProperty('approval_status')
    expect(lastParams()).not.toHaveProperty('approval_status__in')
  })

  it('forwards branch so the list is filtered by chi nhánh', async () => {
    renderAt('?branch=3')
    await waitFor(() => expect(lastParams()?.branch).toBe(3))
  })

  // Ô lọc "Mã phiếu đặt cọc" đã bỏ 17/08/2026 — ô tìm kiếm ngoài đã phủ `contract_number`,
  // và số đó không hiện ở cột nào trong bảng nên người dùng không đối chiếu được.
  // URL cũ / bookmark còn mang param này thì phải bị bỏ qua, không gửi lên API.
  it('ignores a stale contract_number param left over in the URL', async () => {
    renderAt('?contract_number=2026-940092')
    await waitFor(() => expect(lastParams()).toBeDefined())
    expect(lastParams()).not.toHaveProperty('contract_number')
  })

  // `status` (contract state) and `approval_status` (approval stage) are distinct
  // backend filters that happen to share some value names — sending one must never
  // populate the other.
  it('keeps status and approval_status independent', async () => {
    renderAt('?status=approved&approval_status=pending_accountant')
    await waitFor(() => expect(lastParams()?.approval_status__in).toEqual(['pending_accountant']))
    expect(lastParams()?.status__in).toEqual(['approved'])
  })

  // Ô "Tên khách hàng" (text, `customer_name`) đã đổi sang Select chọn khách hàng
  // (`customer`, FK id) ngày 17/08/2026 — đo trên dev thấy `customer_name` trùng khít
  // ô Tìm kiếm ngoài, còn `customer` lọc đúng một khách hàng.
  it('forwards customer as the FK id the API filters on', async () => {
    renderAt('?customer=190')
    await waitFor(() => expect(lastParams()?.customer).toBe(190))
  })

  it('ignores a stale customer_name param left over in the URL', async () => {
    renderAt('?customer_name=Thi%C3%AAn%20Minh')
    await waitFor(() => expect(lastParams()).toBeDefined())
    expect(lastParams()).not.toHaveProperty('customer_name')
  })

  // Hai `DatePicker` rời đã gộp thành một `DateRangePicker`, nhưng cặp param gửi lên API
  // giữ nguyên tên — link/bookmark cũ phải chạy y như trước.
  it('still forwards the contract date range params unchanged', async () => {
    renderAt('?contract_date_from=2026-08-01&contract_date_to=2026-08-17')
    await waitFor(() => expect(lastParams()?.contract_date_from).toBe('2026-08-01'))
    expect(lastParams()?.contract_date_to).toBe('2026-08-17')
  })

  it('never leaks the form-only date range key to the API', async () => {
    renderAt('?contract_date_from=2026-08-01')
    await waitFor(() => expect(lastParams()?.contract_date_from).toBe('2026-08-01'))
    expect(lastParams()).not.toHaveProperty('contractDateRange')
  })
})
