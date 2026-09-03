import { describe, expect, it, vi } from 'vitest'
import { render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/lib/ability.ts', () => ({
  useAbility: () => ({ can: () => true }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import InvestorTable from './InvestorTable'
import type { Investor } from '@/services/realestate-service.ts'

function makeRow(overrides: Record<string, unknown> = {}): Investor {
  return {
    id: 1,
    code: 'CDT000000085',
    name: 'Chủ đầu tư A',
    contact_person: 'Nguyễn Văn A',
    phone: '0912345678',
    email: 'a@example.com',
    tax_code: '0101234567',
    // API TRẢ null cho mọi bản ghi có trước CR STT27 (đo 26/08: 0/80 bản ghi có ngày), trong khi
    // `schema.ts` khai `established_date: string` bắt buộc. Fixture phải theo API, không theo type.
    established_date: null,
    address: '',
    is_active: true,
    attachments: [],
    ...overrides,
  } as unknown as Investor
}

function renderTable(data: Investor[]) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <InvestorTable
          data={data}
          isLoading={false}
          error={null}
          pageCount={1}
          pageSize={25}
          currentPage={1}
          totalRecords={data.length}
          onPaginationChange={vi.fn()}
          onSortingChange={vi.fn()}
          hasFilter={false}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/**
 * Chỉ số cột lấy THEO HEADER. `expect(...).toBeGreaterThanOrEqual(0)` là bắt buộc: `indexOf` trần
 * trả `-1` khi cột vắng mặt, mà `-1 < <chỉ số dương>` là `true` ⇒ gỡ cột đi test vẫn XANH.
 */
function columnIndex(view: ReturnType<typeof renderTable>, header: string) {
  const index = view.getAllByRole('columnheader').findIndex((h) => h.textContent?.trim() === header)
  expect(index, `không có cột "${header}" trên bảng`).toBeGreaterThanOrEqual(0)
  return index
}

function bodyCellText(view: ReturnType<typeof renderTable>, rowIndex: number, header: string) {
  const row = view.getAllByRole('row')[rowIndex + 1]
  return within(row).getAllByRole('cell')[columnIndex(view, header)]?.textContent?.trim()
}

// Cột dữ liệu vẫn là `established_date`, nhưng NHÃN ở màn CĐT đổi thành "Ngày sinh nhật"
// (26/08/2026, quyết định nghiệp vụ của user). Hai màn sàn giữ "Ngày thành lập" — xem
// `ExchangeTable.test.tsx`. Test này ghim nhãn để một lần "thống nhất lại cho gọn" phải nổ.
describe('InvestorTable — CR56: cột Ngày sinh nhật và Địa chỉ', () => {
  it('có đủ 2 cột mới, đứng ngay trước cột "Hoạt động"', () => {
    const view = renderTable([makeRow()])

    const email = columnIndex(view, 'Email')
    const established = columnIndex(view, 'Ngày sinh nhật')
    const address = columnIndex(view, 'Địa chỉ')
    const isActive = columnIndex(view, 'Hoạt động')

    expect(established).toBe(email + 1)
    expect(address).toBe(established + 1)
    expect(isActive).toBe(address + 1)
  })

  it('in ngày sinh nhật theo định dạng dd/MM/yyyy', () => {
    const view = renderTable([makeRow({ established_date: '2026-07-09' })])

    expect(bodyCellText(view, 0, 'Ngày sinh nhật')).toBe('09/07/2026')
  })

  it('in "-" khi chưa có ngày — bản ghi trước CR STT27 đều rơi vào ca này', () => {
    const view = renderTable([makeRow({ established_date: null })])

    expect(bodyCellText(view, 0, 'Ngày sinh nhật')).toBe('-')
  })

  it('in đúng địa chỉ đã lưu, kể cả địa chỉ dài', () => {
    const diaChiDai =
      'Lô 25+26 A24 NV12, KĐTM, hai bên đường Lê Trọng Tấn, Xã An Khánh, Huyện Hoài Đức, Tp.Hà Nội'
    const view = renderTable([makeRow({ address: '123 Main St' }), makeRow({ address: diaChiDai })])

    expect(bodyCellText(view, 0, 'Địa chỉ')).toBe('123 Main St')
    expect(bodyCellText(view, 1, 'Địa chỉ')).toBe(diaChiDai)
  })

  it('in "-" khi địa chỉ rỗng', () => {
    const view = renderTable([makeRow({ address: '' })])

    expect(bodyCellText(view, 0, 'Địa chỉ')).toBe('-')
  })

  it('không đụng tới các cột sẵn có', () => {
    const view = renderTable([makeRow()])
    const headers = view.getAllByRole('columnheader').map((h) => h.textContent?.trim())

    expect(headers).toEqual([
      'STT',
      'Mã',
      'Tên chủ đầu tư',
      'Người liên hệ',
      'Số điện thoại',
      'Email',
      'Ngày sinh nhật',
      'Địa chỉ',
      'Hoạt động',
      '',
    ])
  })
})
