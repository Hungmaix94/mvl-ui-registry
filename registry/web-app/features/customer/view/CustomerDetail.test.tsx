// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useAppConstant.ts', () => ({
  default: () => ({ keysMap: new Map(), keysMapOptions: new Map() }),
}))

import { CustomerDetail } from './CustomerDetail'
import { CustomerType as CustomerType } from '@/constants/api-schema-aliases'
type CustomerProp = Parameters<typeof CustomerDetail>[0]['customer']

function makeBusinessCustomer(overrides: Record<string, unknown> = {}): CustomerProp {
  return {
    id: 1,
    code: 'KH000000068',
    customer_type: CustomerType.business,
    phone: '0901234567',
    email: 'ketoan@abc.vn',
    business_name: 'Công ty TNHH ABC',
    business_tax_code: '0123456789',
    business_representative: 'Trần Văn B',
    business_representative_title: 'Giám đốc',
    business_address: '456 Lê Lợi',
    business_province_detail: { id: 1, name: 'TP. Hồ Chí Minh' },
    business_ward_detail: { id: 2, name: 'Phường Bến Thành' },
    note: 'Khách hàng VIP',
    ...overrides,
  } as unknown as CustomerProp
}

function renderDetail(customer: CustomerProp) {
  return render(
    <MemoryRouter>
      <CustomerDetail customer={customer} />
    </MemoryRouter>
  )
}

const squash = (text: string) => text.replace(/\s+/g, '')

/**
 * Assert that `label` and `value` sit in the SAME `DetailRow`, not merely that both
 * strings appear somewhere on the page — otherwise a row rendering the right value
 * against the wrong label still passes.
 *
 * `DetailRow` splits the pair across two sibling `<Text>` nodes, so match on the row's
 * combined text rather than on either node alone.
 */
function expectDetailRow(label: string, value: string) {
  const rows = screen.getAllByText(
    (_content, element) => squash(element?.textContent ?? '') === squash(label + value)
  )
  expect(rows.length).toBeGreaterThan(0)
}

/**
 * Số điện thoại và Email là trường BẮT BUỘC khi thêm mới/chỉnh sửa khách hàng doanh
 * nghiệp (`commonSchema` áp cho cả hai loại), nhưng màn chi tiết trước đây chỉ render
 * chúng ở nhánh cá nhân — nhập xong không bao giờ xem lại được.
 */
describe('CustomerDetail — khách hàng doanh nghiệp', () => {
  it('hiển thị số điện thoại và email đã nhập ở form', () => {
    renderDetail(makeBusinessCustomer())

    expectDetailRow('Số điện thoại', '0901234567')
    expectDetailRow('Email', 'ketoan@abc.vn')
  })

  it('hiển thị đủ các trường doanh nghiệp còn lại', () => {
    renderDetail(makeBusinessCustomer())

    expectDetailRow('Mã khách hàng', 'KH000000068')
    expectDetailRow('Tên doanh nghiệp', 'Công ty TNHH ABC')
    expectDetailRow('Mã số thuế', '0123456789')
    expectDetailRow('Người đại diện doanh nghiệp (theo PL/UQ)', 'Trần Văn B')
    expectDetailRow('Chức vụ người đại diện', 'Giám đốc')
    expectDetailRow('Địa chỉ (theo ĐKKD)', '456 Lê Lợi')
    expectDetailRow('Ghi chú', 'Khách hàng VIP')
  })

  it('dùng cùng nhãn địa giới hành chính với khách hàng cá nhân', () => {
    renderDetail(makeBusinessCustomer())

    expectDetailRow('Tỉnh/Thành phố', 'TP. Hồ Chí Minh')
    expectDetailRow('Phường/Xã', 'Phường Bến Thành')
    expect(screen.queryByText('Tỉnh')).not.toBeInTheDocument()
  })

  it('hiển thị "-" cho trường trống thay vì bỏ hẳn dòng', () => {
    renderDetail(makeBusinessCustomer({ email: '' }))

    expectDetailRow('Email', '-')
  })
})

describe('CustomerDetail — khách hàng cá nhân', () => {
  it('gọi đơn vị hành chính là Phường/Xã, khớp nhánh doanh nghiệp', () => {
    renderDetail({
      id: 2,
      code: 'KH000000188',
      customer_type: CustomerType.individual,
      full_name: 'Quỳnh Mai',
      phone: '0907654321',
      email: 'a@example.com',
      province_detail: { id: 1, name: 'TP. Hồ Chí Minh' },
      ward_detail: { id: 1, name: 'Phường Ngọc Hà' },
    } as unknown as CustomerProp)

    expectDetailRow('Phường/Xã', 'Phường Ngọc Hà')
    expect(screen.queryByText('Quận/Huyện')).not.toBeInTheDocument()
  })
})
