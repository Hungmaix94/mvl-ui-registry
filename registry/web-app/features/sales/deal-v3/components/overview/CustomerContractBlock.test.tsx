import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/lib/firebase', () => ({
  default: {},
  app: {},
  analytics: {},
  messaging: {},
  getFCMToken: vi.fn(),
  onMessageListener: vi.fn(),
}))

vi.mock('@/services/base-api-service', () => ({
  BaseApiService: class {},
}))

vi.mock('@/api/client', () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
  default: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map() }),
}))

import { CustomerContractBlock } from './CustomerContractBlock'

/**
 * Khối "Khách hàng & Hợp đồng cọc" của màn chi tiết giao dịch từng hiện `-` ở cả ô tên lẫn
 * ô định danh với MỌI khách doanh nghiệp (86eyphhtb), vì nó đọc thẳng `full_name` /
 * `id_number` — hai cột chỉ khách cá nhân mới có.
 *
 * Các test dưới bám vào chữ người dùng thật sự đọc trên màn, không bám tên biến, nên chúng
 * vẫn còn giá trị nếu sau này khối được viết lại bằng component khác.
 */
function renderBlock(customer: Record<string, unknown> | null) {
  return render(
    <MemoryRouter>
      <CustomerContractBlock
        workspace={{
          overview: {
            customer,
            deposit_contract: {
              id: 1,
              code: 'DC-2026-001890',
              contract_date: '2026-08-19',
              registration_amount: '150000000',
              approval_status: null,
              status: null,
            },
          },
        }}
      />
    </MemoryRouter>
  )
}

// Đúng shape backend trả cho khách doanh nghiệp: cặp cột cá nhân RỖNG, danh tính nằm ở
// cặp đã chuẩn hoá. Đây là bản ghi thật trong ticket (deal 2926 / khách 67).
const BUSINESS_CUSTOMER = {
  id: 67,
  customer_type: 'business',
  name: 'Tập đoàn Sơn Á',
  identify_number: '89389638',
  full_name: '',
  id_number: '',
  phone: '0974125125',
  email: 'hoaan8676373785@gmail.com',
}

const INDIVIDUAL_CUSTOMER = {
  id: 12,
  customer_type: 'individual',
  name: 'Nguyễn Văn A',
  identify_number: '001099012345',
  full_name: 'Nguyễn Văn A',
  id_number: '001099012345',
  phone: '0912345678',
  email: 'a.nguyen@example.com',
}

describe('CustomerContractBlock — khách hàng doanh nghiệp', () => {
  it('hiện tên công ty thay vì dấu gạch ngang', () => {
    renderBlock(BUSINESS_CUSTOMER)

    expect(screen.getByText('Tập đoàn Sơn Á')).toBeInTheDocument()
  })

  it('hiện mã số thuế thay vì dấu gạch ngang', () => {
    renderBlock(BUSINESS_CUSTOMER)

    expect(screen.getByText('89389638')).toBeInTheDocument()
  })

  it('đổi nhãn hai ô sang từ ngữ của doanh nghiệp', () => {
    renderBlock(BUSINESS_CUSTOMER)

    expect(screen.getByText('Tên doanh nghiệp')).toBeInTheDocument()
    expect(screen.getByText('Mã số thuế')).toBeInTheDocument()
    // Doanh nghiệp không có CMND/CCCD — để nguyên nhãn cũ là nói sai với người dùng.
    expect(screen.queryByText('CMND / CCCD')).not.toBeInTheDocument()
    expect(screen.queryByText('Tên khách hàng')).not.toBeInTheDocument()
  })
})

describe('CustomerContractBlock — khách hàng cá nhân không được hồi quy', () => {
  it('vẫn hiện họ tên và CCCD', () => {
    renderBlock(INDIVIDUAL_CUSTOMER)

    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('001099012345')).toBeInTheDocument()
  })

  it('giữ nguyên nhãn cũ', () => {
    renderBlock(INDIVIDUAL_CUSTOMER)

    expect(screen.getByText('Tên khách hàng')).toBeInTheDocument()
    expect(screen.getByText('CMND / CCCD')).toBeInTheDocument()
    expect(screen.queryByText('Mã số thuế')).not.toBeInTheDocument()
  })
})

describe('CustomerContractBlock — giao dịch chưa gắn khách', () => {
  it('giữ nhãn mặc định của khách cá nhân và không vỡ', () => {
    renderBlock(null)

    expect(screen.getByText('Tên khách hàng')).toBeInTheDocument()
    expect(screen.getByText('CMND / CCCD')).toBeInTheDocument()
    // Việc ô rỗng phải in ra `-` đã được `resolveCustomerDisplay(null) → name: ''` cộng
    // `|| '-'` ở component lo; kiểm lại ở đây phải lần theo DOM thủ công, mà quy tắc
    // `testing-library/no-node-access` của repo cấm — và đó là quy tắc đúng.
  })
})
