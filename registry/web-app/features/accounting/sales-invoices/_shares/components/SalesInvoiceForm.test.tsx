import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SalesInvoiceForm from './SalesInvoiceForm'
import {
  DEFAULT_SALES_INVOICE_FORM_VALUES,
  salesInvoiceFormSchema,
} from '@/features/accounting/sales-invoices/types/sales-invoice-types'

// jsdom không có ResizeObserver; `Select` dùng nó qua `useMatchTriggerWidth`.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const DRAFT_INVOICE = {
  id: 7,
  code: 'HDBR-000007',
  invoice_date: '2026-05-22',
  investor: 3,
  source_type: 'direct',
  source_exchange: null,
  investor_reconciliation_sheet: 11,
  external_invoice_no: '',
  replaces_invoice: null,
  customer_name: 'Công ty CP Đại Phát',
  customer_tax_code: '0101234567',
  customer_address: 'Hà Nội',
  commission_period_year: 2026,
  commission_period_month: 5,
  total_amount: 1_000_000,
  notes: '',
  attachments: [],
  accounting_period: 21,
  status: 'DRAFT',
}

const { createMock, updateMock, invalidateByPrefixMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  invalidateByPrefixMock: vi.fn(),
}))

vi.mock('@/features/accounting/sales-invoices/services/sales-invoice-service', () => ({
  useSalesInvoice: (id: number) => ({
    data: id ? DRAFT_INVOICE : undefined,
    isLoading: false,
  }),
  useCreateSalesInvoice: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateSalesInvoice: () => ({ mutateAsync: updateMock, isPending: false }),
}))

vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useAccountingPeriods: () => ({
    data: { results: [{ id: 21, year: 2026, month: 5 }] },
  }),
}))

vi.mock(
  '@/features/sales/investor-reconciliations/services/investor-reconciliation-service',
  () => ({
    useInvestorReconciliationSheets: () => ({
      data: { results: [{ id: 11, code: 'PDC-011' }] },
      isLoading: false,
    }),
    useInvestorReconciliationSheet: () => ({ data: undefined }),
  })
)

vi.mock('@/services/realestate-service', () => ({
  useInvestor: () => ({ data: { id: 3, code: 'CDT-003', name: 'Chủ đầu tư A' } }),
  useExchange: () => ({ data: undefined }),
}))

vi.mock('@/hooks/useApiQuery', () => ({
  useInvalidateQueries: () => ({ invalidateByPrefix: invalidateByPrefixMock }),
}))

vi.mock('@/hooks/useInvestorSelect', () => ({
  useInvestorSelect: () => ({
    loadInvestorOptions: vi.fn().mockResolvedValue([]),
    loadInitialInvestorOptions: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/hooks/useExchangeSelect', () => ({
  useExchangeSelect: () => ({
    loadExchangeOptions: vi.fn().mockResolvedValue([]),
    loadInitialExchangeOptions: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/hooks/useScrollToError.ts', () => ({ useScrollToError: () => {} }))

vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

vi.mock('@/services/toast-service.tsx', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const renderForm = (invoiceId?: number) =>
  render(
    <MemoryRouter>
      <SalesInvoiceForm invoiceId={invoiceId} />
    </MemoryRouter>
  )

/** Ô "Ngày hóa đơn" là DatePicker duy nhất của form, nhận diện qua placeholder DD/MM/YYYY. */
const invoiceDateInput = () => screen.queryByPlaceholderText('DD/MM/YYYY')

describe('SalesInvoiceForm — ngày hóa đơn (CR 86eymkrqu)', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: 1 })
    updateMock.mockReset().mockResolvedValue({ id: 7 })
    invalidateByPrefixMock.mockReset()
  })

  // Đây là chính nội dung CR: trước đây màn Sửa render `ReadOnlyField` (text tĩnh, không có
  // input nào), nên phép kiểm "có input không" là thứ đỏ lại được nếu ai đó khoá field lần nữa.
  it('màn Sửa: "Ngày hóa đơn" là ô nhập được, không còn là text tĩnh', () => {
    renderForm(7)

    const input = invoiceDateInput()
    expect(input).toBeInTheDocument()
    expect(input).not.toBeDisabled()
  })

  it('màn Sửa: ô ngày hydrate đúng ngày đang lưu (yyyy-MM-dd → dd/MM/yyyy)', () => {
    renderForm(7)

    expect(invoiceDateInput()).toHaveValue('22/05/2026')
  })

  it('màn Tạo: ô ngày vẫn nhập được (không hồi quy)', () => {
    renderForm()

    expect(invoiceDateInput()).toBeInTheDocument()
  })

  it('màn Sửa: đổi ngày rồi Cập nhật thì gửi ngày mới lên API', async () => {
    const user = userEvent.setup()
    renderForm(7)

    const input = invoiceDateInput()!
    await user.clear(input)
    await user.type(input, '30/06/2026')
    await user.tab() // commit giá trị gõ tay qua onBlur

    await user.click(screen.getByRole('button', { name: 'Cập nhật' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1))
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        data: expect.objectContaining({ invoice_date: '2026-06-30' }),
      })
    )
  })

  // Ngày hóa đơn giờ sửa được ⇒ cũng xoá trống được, nên tính bắt buộc phải còn nguyên.
  // Kiểm ở tầng schema thay vì bấm trên form: DatePicker commit giá trị gõ tay qua onBlur mà
  // nhánh blur này phụ thuộc trạng thái popover — jsdom mô phỏng focus/popover không trung thực,
  // test dựng trên đó sẽ đỏ/xanh theo tiểu tiết của Radix chứ không theo luật nghiệp vụ.
  it('schema vẫn bắt buộc có ngày hóa đơn (rỗng → báo lỗi)', () => {
    const base = {
      ...DEFAULT_SALES_INVOICE_FORM_VALUES,
      investor: 3,
      accounting_period: 21,
    }

    const emptyResult = salesInvoiceFormSchema.safeParse({ ...base, invoice_date: '' })
    expect(emptyResult.success).toBe(false)
    expect(
      emptyResult.success === false &&
        emptyResult.error.issues.some((i) => i.message === 'Vui lòng chọn ngày hóa đơn')
    ).toBe(true)

    expect(salesInvoiceFormSchema.safeParse({ ...base, invoice_date: '2026-06-30' }).success).toBe(
      true
    )
  })
})
