/**
 * Phiếu đối chiếu nào thật sự được GỬI LÊN, đo trên payload chứ không đọc source.
 *
 * Bug 86eyr4wt3: form dùng chung một ô "Phiếu đối chiếu" cho ba loại đối tượng và nạp lựa chọn
 * từ ba endpoint khác nhau, nhưng hóa đơn đầu vào chỉ có một khóa ngoại `f2_reconciliation_sheet`
 * trỏ sang bảng phiếu F2. Chọn "Phiếu đối chiếu Chủ đầu tư" nên hoặc ăn 400
 * (`Invalid pk "1545" - object does not exist.`), hoặc — khi id tình cờ trùng — gắn im lặng vào
 * một phiếu F2 không liên quan.
 *
 * Test kiểm cả hai chiều dữ liệu, vì mỗi chiều hỏng một kiểu: payload lúc GỬI, và giá trị form
 * nạp lại lúc SỬA. Không kiểm bằng cách so chuỗi trong source — ở đây payload thật quan sát được.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import InputInvoiceForm from './InputInvoiceForm'

// jsdom không có ResizeObserver; `Select` dùng nó qua `useMatchTriggerWidth`.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

/** Id phiếu CĐT có thật trong ticket — không tồn tại bên bảng phiếu F2. */
const INVESTOR_SHEET_ID = 1545
/** Id phiếu F2 có thật, dùng cho nhánh đối chứng. */
const F2_SHEET_ID = 210

/** Hóa đơn của Chủ đầu tư đã lỡ mang một id phiếu sai — nhánh "liên kết nhầm im lặng". */
const MISLINKED_SUPPLIER_INVOICE = {
  id: 9,
  code: 'HDIN000000009',
  invoice_date: '2026-08-27',
  counterparty_type: 'SUPPLIER',
  exchange: null,
  collaborator: null,
  supplier_name: 'Vinaconex8',
  f2_reconciliation_sheet: INVESTOR_SHEET_ID,
  total_amount: 1_000_000,
  vat_rates: '10',
  notes: '',
  accounting_period: 11,
  status: 'DRAFT',
  lines: [],
}

const EXCHANGE_INVOICE = {
  ...MISLINKED_SUPPLIER_INVOICE,
  id: 10,
  counterparty_type: 'EXCHANGE',
  exchange: 4,
  supplier_name: '',
  f2_reconciliation_sheet: F2_SHEET_ID,
}

const { createMock, updateMock, invalidateByPrefixMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  invalidateByPrefixMock: vi.fn(),
}))

let invoiceForEditMode: Record<string, unknown> | undefined

vi.mock('@/features/accounting/input-invoices/services/input-invoice-service', () => ({
  useInputInvoice: (id?: number) => ({
    data: id ? invoiceForEditMode : undefined,
    isLoading: false,
  }),
  useCreateInputInvoice: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateInputInvoice: () => ({ mutateAsync: updateMock, isPending: false }),
}))

vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useAccountingPeriods: () => ({ data: { results: [{ id: 11, year: 2026, month: 8 }] } }),
  useCurrentAccountingPeriod: () => ({ data: { id: 11, year: 2026, month: 8 } }),
}))

vi.mock('@/features/sales/f2-reconciliations/services/f2-reconciliation-service', () => ({
  useF2ReconciliationSheets: () => ({
    data: { results: [{ id: F2_SHEET_ID, code: 'DCF2-210' }] },
    isLoading: false,
  }),
  useF2ReconciliationSheet: () => ({ data: undefined }),
}))

vi.mock(
  '@/features/sales/investor-reconciliations/services/investor-reconciliation-service',
  () => ({
    useInvestorReconciliationSheets: () => ({
      data: { results: [{ id: INVESTOR_SHEET_ID, code: 'DAVTT-IRS1545' }] },
      isLoading: false,
    }),
    useInvestorReconciliationSheet: () => ({ data: undefined }),
  })
)

vi.mock('@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service', () => ({
  useCTVReconciliationSheets: () => ({ data: { results: [] }, isLoading: false }),
  useCTVReconciliationSheet: () => ({ data: undefined }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMapOptions: new Map([
      [
        'InputInvoice_COUNTERPARTY_TYPE_CHOICES',
        [
          { value: 'SUPPLIER', label: 'Nhà cung cấp' },
          { value: 'EXCHANGE', label: 'Sàn giao dịch' },
          { value: 'COLLABORATOR', label: 'Cộng tác viên' },
        ],
      ],
    ]),
    constants: { accounting: { INPUT_INVOICE_MANUAL_COUNTERPARTY_TYPES: ['SUPPLIER'] } },
  }),
}))

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({ getInvestors: vi.fn().mockResolvedValue({ results: [] }) }),
}))

vi.mock('@/hooks/useApiQuery', () => ({
  useInvalidateQueries: () => ({ invalidateByPrefix: invalidateByPrefixMock }),
}))

const emptySelect = {
  loadOptions: vi.fn().mockResolvedValue([]),
  loadInitialOptions: vi.fn().mockResolvedValue([]),
}
vi.mock('@/hooks/useExchangeSelect', () => ({
  useExchangeSelect: () => ({
    loadExchangeOptions: emptySelect.loadOptions,
    loadInitialExchangeOptions: emptySelect.loadInitialOptions,
  }),
}))
vi.mock('@/hooks/useDealSelect', () => ({
  useDealSelect: () => ({
    loadDealOptions: emptySelect.loadOptions,
    loadInitialDealOptions: emptySelect.loadInitialOptions,
  }),
}))
vi.mock('@/hooks/useCollaboratorSelect', () => ({
  useCollaboratorSelect: () => ({
    loadCollaboratorOptions: emptySelect.loadOptions,
    loadInitialCollaboratorOptions: emptySelect.loadInitialOptions,
  }),
}))
vi.mock('@/hooks/useInvestorSelect', () => ({
  useInvestorSelect: () => ({
    loadInvestorOptions: emptySelect.loadOptions,
    loadInitialInvestorOptions: emptySelect.loadInitialOptions,
  }),
}))

vi.mock('@/services/toast-service.tsx', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const renderForm = (invoiceId?: number) =>
  render(
    <MemoryRouter>
      <InputInvoiceForm invoiceId={invoiceId} />
    </MemoryRouter>
  )

describe('InputInvoiceForm — phiếu đối chiếu nào được gửi lên', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: 1 })
    updateMock.mockReset().mockResolvedValue({ id: 9 })
    invalidateByPrefixMock.mockReset()
    invoiceForEditMode = undefined
  })

  it('màn Sửa hóa đơn Chủ đầu tư: KHÔNG gửi id phiếu CĐT lên khóa ngoại phiếu F2', async () => {
    // Đây là ca đã báo lỗi. Bản ghi vào đang mang sẵn id sai; bấm Lưu mà vẫn gửi lại nó là
    // tái hiện đúng lỗi 400 (hoặc giữ nguyên liên kết nhầm nếu id tình cờ tồn tại).
    invoiceForEditMode = MISLINKED_SUPPLIER_INVOICE
    const user = userEvent.setup()
    renderForm(9)

    await user.click(await screen.findByRole('button', { name: 'Cập nhật' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 9,
        data: expect.objectContaining({
          counterparty_type: 'SUPPLIER',
          f2_reconciliation_sheet: null,
        }),
      })
    )
  })

  it('người dùng CHỌN phiếu đối chiếu Chủ đầu tư rồi Lưu: payload vẫn không mang id đó', async () => {
    // Đúng thao tác QA đã làm, và là ca DUY NHẤT bắt được lỗi ở khâu dựng payload: hai ca "Sửa"
    // bên dưới không bắt, vì giá trị của chúng đã bị lọc từ lúc nạp form nên payload rỗng sẵn.
    // Ở đây người dùng chủ động đặt id vào ô, nên chỉ khâu dựng payload mới chặn được nó.
    invoiceForEditMode = MISLINKED_SUPPLIER_INVOICE
    // `pointerEventsCheck: 0`: lớp phủ của Radix mang `pointer-events: none` trong jsdom, nên
    // phép kiểm con trỏ của user-event chặn cú bấm vào option. Cùng cách xử đã dùng ở
    // `DepositContractActionForm.test.tsx` và `CommSlkMonthlyPage.test.tsx`.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    renderForm(9)

    await user.click(await screen.findByText('Chọn phiếu đối chiếu Chủ đầu tư'))
    await user.click(await screen.findByText('DAVTT-IRS1545'))
    // Tiền đề: ô đã thật sự nhận giá trị. Thiếu khẳng định này thì một lượt bấm trượt cũng cho
    // payload null và test xanh mà chẳng chứng minh gì.
    expect(await screen.findByText('DAVTT-IRS1545')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cập nhật' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          counterparty_type: 'SUPPLIER',
          f2_reconciliation_sheet: null,
        }),
      })
    )
  })

  it('màn Sửa hóa đơn của Sàn: VẪN gửi phiếu F2 như cũ', async () => {
    // Đối chứng của ca trên. Thiếu nó thì một bản sửa "luôn gửi null" cũng xanh, mà như vậy là
    // đánh rơi liên kết của toàn bộ hóa đơn sàn.
    invoiceForEditMode = EXCHANGE_INVOICE
    const user = userEvent.setup()
    renderForm(10)

    await user.click(await screen.findByRole('button', { name: 'Cập nhật' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          counterparty_type: 'EXCHANGE',
          f2_reconciliation_sheet: F2_SHEET_ID,
        }),
      })
    )
  })

  it('màn Sửa hóa đơn Chủ đầu tư: ô "Phiếu đối chiếu Chủ đầu tư" KHÔNG hiện id sai đã lưu', async () => {
    // Chiều còn lại: nạp thẳng giá trị đã lưu lên form là bày một phiếu F2 vô can ra như thể nó
    // là phiếu Chủ đầu tư của hóa đơn này.
    invoiceForEditMode = MISLINKED_SUPPLIER_INVOICE
    renderForm(9)

    const trigger = await screen.findByText('Chọn phiếu đối chiếu Chủ đầu tư')
    expect(trigger).toBeInTheDocument()
    expect(screen.queryByText('DAVTT-IRS1545')).not.toBeInTheDocument()
  })

  it('màn Sửa hóa đơn của Sàn: ô "Phiếu đối chiếu F2" VẪN hiện phiếu đang gắn', async () => {
    // Đối chứng cho ca trên — nếu không, một bản sửa xoá sạch hydrate cũng xanh.
    invoiceForEditMode = EXCHANGE_INVOICE
    renderForm(10)

    expect(await screen.findByText('DCF2-210')).toBeInTheDocument()
    // Và ô không rơi về trạng thái chưa chọn — phân biệt "hiện đúng phiếu" với "hiện cả hai".
    expect(screen.queryByText('Chọn phiếu đối chiếu F2')).not.toBeInTheDocument()
  })
})
