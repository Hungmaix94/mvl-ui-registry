import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const bookingResult: { data: unknown } = { data: undefined }

vi.mock('@/services/sales-service', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useBooking: () => bookingResult,
  useCustomer: () => ({ data: undefined }),
}))

vi.mock('@/services', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useEmployee: () => ({ data: undefined }),
}))

vi.mock('@/hooks/useBankOptions', () => ({
  default: () => ({ bankOptions: [] }),
}))

const emptyPage = { items: [], nextPage: null, hasNextPage: false }
vi.mock('../../booking-contract/services/useBookingContractLoadOptions', () => ({
  useBookingContractLoadOptions: () => ({
    loadProjectOptions: vi.fn().mockResolvedValue(emptyPage),
    loadProductInventoryOptions: vi.fn().mockResolvedValue(emptyPage),
    loadBookingOptions: vi.fn().mockResolvedValue(emptyPage),
    loadInitialBookingOptions: vi.fn().mockResolvedValue([]),
    loadInitialProjectOptions: vi.fn().mockResolvedValue([]),
    loadInitialProductInventoryOptions: vi.fn().mockResolvedValue([]),
  }),
}))

import RefundBookingForm from './RefundBookingForm'
import {
  refundBookingFormSchema,
  type RefundBookingFormValues,
} from '../types/refund-booking-form-types'

function mountForm(initialValues?: Partial<RefundBookingFormValues>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RefundBookingForm initialValues={initialValues} onSubmit={vi.fn()} />
    </QueryClientProvider>
  )
}

describe('RefundBookingForm — CR STT11: khách hàng & nhân sự bán nằm sau hợp đồng đặt chỗ', () => {
  it('chưa chọn hợp đồng đặt chỗ thì ẩn khối khách hàng và nhân sự bán', () => {
    const { queryByTestId, getByText } = mountForm()

    expect(getByText('Thông tin hợp đồng')).toBeTruthy()
    expect(queryByTestId('refund-customer-section')).toBeNull()
    expect(queryByTestId('refund-sales-staff-section')).toBeNull()
  })

  it('chọn xong hợp đồng đặt chỗ thì hai khối hiện ra', () => {
    const { getByTestId } = mountForm({ booking_id: 42 })

    expect(getByTestId('refund-customer-section')).toBeTruthy()
    expect(getByTestId('refund-sales-staff-section')).toBeTruthy()
  })

  it('khối hợp đồng đứng trước, rồi tới khách hàng, rồi tới nhân sự bán, cuối cùng là hoàn tiền', () => {
    const { container } = mountForm({ booking_id: 42 })

    const text = container.textContent ?? ''
    const contractAt = text.indexOf('Thông tin hợp đồng')
    const customerAt = text.indexOf('Thông tin Khách Hàng')
    const staffAt = text.indexOf('Nhân sự phụ trách bán')
    const refundAt = text.indexOf('Thông tin hoàn tiền')

    expect(contractAt).toBeGreaterThanOrEqual(0)
    expect(contractAt).toBeLessThan(customerAt)
    expect(customerAt).toBeLessThan(staffAt)
    expect(staffAt).toBeLessThan(refundAt)
  })
})

const validValues = {
  booking_id: 42,
  customer_name: 'Nguyễn Văn A',
  customer_cccd: '001199012345',
  customer_phone: '0912345678',
  customer_address: 'Hà Nội',
  project_id: 7,
  booking_amount: 100_000_000,
  booking_date: new Date('2026-01-01'),
  sender_account_number: '0011223344',
  sender_account_name: 'NGUYEN VAN A',
  refund_amount: 50_000_000,
  refund_account_name: 'NGUYEN VAN A',
  refund_account_number: '0011223344',
  refund_bank_branch: 'Chi nhánh Hà Nội',
  refund_bank_name: 'Vietcombank',
  attachments: ['file-1'],
}

describe('refundBookingFormSchema — booking_id bắt buộc', () => {
  // Khối khách hàng bị ẩn khi chưa chọn booking, nên lỗi thiếu booking PHẢI rơi vào
  // chính ô Select đang hiển thị — nếu không, người dùng bấm submit mà không thấy gì.
  it('báo lỗi trên chính field booking_id khi chưa chọn hợp đồng đặt chỗ', () => {
    const result = refundBookingFormSchema.safeParse({ ...validValues, booking_id: undefined })

    expect(result.success).toBe(false)
    const bookingIssue = result.success
      ? undefined
      : result.error.issues.find((issue) => issue.path[0] === 'booking_id')
    expect(bookingIssue?.message).toBe('Vui lòng chọn giao dịch đặt chỗ')
  })

  it('coi chuỗi rỗng từ Select là chưa chọn', () => {
    const result = refundBookingFormSchema.safeParse({ ...validValues, booking_id: '' })

    expect(result.success).toBe(false)
  })

  it('ép booking_id dạng chuỗi về number khi hợp lệ', () => {
    const result = refundBookingFormSchema.safeParse({ ...validValues, booking_id: '42' })

    expect(result.success).toBe(true)
    expect(result.success && result.data.booking_id).toBe(42)
  })
})

describe('refundBookingFormSchema — thông báo lỗi phải bằng tiếng Việt', () => {
  // Zod trả message mặc định TIẾNG ANH khi field rơi vào nhánh `invalid_type`
  // ("Required", "Expected number, received nan", "String must contain at most N character(s)").
  // `z.coerce.number()` luôn rơi vào nhánh đó với ô trống, nên mọi field bắt buộc phải khai
  // `required_error` + `invalid_type_error`, hoặc preprocess giá trị rỗng về `undefined`.
  const ENGLISH_DEFAULTS = /^(Required|Expected|Invalid|String must|Array must|Number must)/

  it('không còn message mặc định tiếng Anh nào khi submit form trống', () => {
    const result = refundBookingFormSchema.safeParse({})

    expect(result.success).toBe(false)
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message)
    expect(messages.length).toBeGreaterThan(0)
    expect(messages.filter((msg) => ENGLISH_DEFAULTS.test(msg))).toEqual([])
  })

  it('ô số để trống báo "vui lòng nhập" chứ không phải NaN', () => {
    const result = refundBookingFormSchema.safeParse({})

    const messageOf = (field: string) =>
      result.success ? undefined : result.error.issues.find((i) => i.path[0] === field)?.message

    expect(messageOf('booking_amount')).toBe('Vui lòng nhập số tiền đặt chỗ')
    expect(messageOf('refund_amount')).toBe('Vui lòng nhập số tiền hoàn')
    expect(messageOf('project_id')).toBe('Vui lòng chọn dự án')
    expect(messageOf('booking_date')).toBe('Vui lòng chọn ngày đặt chỗ')
    expect(messageOf('attachments')).toBe('Vui lòng đính kèm tài liệu')
  })

  it('đọc được ngày dd/MM/yyyy do DatePicker phát ra, không rơi vào "Invalid date"', () => {
    const result = refundBookingFormSchema.safeParse({ ...validValues, booking_date: '29/06/2026' })

    expect(result.success).toBe(true)
    expect(result.success && result.data.booking_date.getMonth()).toBe(5) // tháng 6
    expect(result.success && result.data.booking_date.getDate()).toBe(29)
  })

  it('vượt quá độ dài cho phép báo bằng tiếng Việt', () => {
    const result = refundBookingFormSchema.safeParse({
      ...validValues,
      customer_cccd: '1'.repeat(21),
    })

    expect(result.success).toBe(false)
    const message = result.success
      ? undefined
      : result.error.issues.find((issue) => issue.path[0] === 'customer_cccd')?.message
    expect(message).toBe('Số CCCD/CMND không được vượt quá 20 ký tự')
  })
})
