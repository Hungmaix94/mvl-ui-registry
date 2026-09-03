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
import ExchangeTable from './ExchangeTable'
import type { Exchange } from '@/services/realestate-service.ts'

function makeRow(overrides: Record<string, unknown> = {}): Exchange {
  return {
    id: 1,
    code: 'EX000001944',
    name: 'Sàn F2 A',
    contact_person: 'Nguyễn Văn A',
    phone: '0912345678',
    email: 'a@example.com',
    tax_code: '0101234567',
    // API TRẢ null cho mọi bản ghi có trước CR STT27 (đo 26/08: 0/1925 sàn liên kết và 0/16 nguồn
    // sàn có ngày), trong khi `schema.ts` khai bắt buộc. Fixture theo API, không theo type.
    established_date: null,
    address: '',
    is_active: true,
    attachments: [],
    ...overrides,
  } as unknown as Exchange
}

/**
 * `type` là prop THẬT của bảng — Nguồn sàn (`f0`) và Sàn liên kết (`f2`) dùng CHUNG component này,
 * nên mọi khẳng định về cột phải chạy cho cả hai giá trị.
 */
function renderTable(data: Exchange[], type: 'f0' | 'f2') {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <ExchangeTable
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
          type={type}
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

describe.each([
  { type: 'f2', man: 'Sàn liên kết' },
  { type: 'f0', man: 'Nguồn sàn' },
] as const)('ExchangeTable type=$type ($man) — CR56', ({ type }) => {
  it('có đủ 2 cột mới, đứng ngay trước cột "Hoạt động"', () => {
    const view = renderTable([makeRow()], type)

    const email = columnIndex(view, 'Email')
    const established = columnIndex(view, 'Ngày thành lập')
    const address = columnIndex(view, 'Địa chỉ')
    const isActive = columnIndex(view, 'Hoạt động')

    expect(established).toBe(email + 1)
    expect(address).toBe(established + 1)
    expect(isActive).toBe(address + 1)
  })

  it('in ngày thành lập theo định dạng dd/MM/yyyy, và "-" khi chưa có', () => {
    const view = renderTable(
      [makeRow({ established_date: '2026-07-09' }), makeRow({ established_date: null })],
      type
    )

    expect(bodyCellText(view, 0, 'Ngày thành lập')).toBe('09/07/2026')
    expect(bodyCellText(view, 1, 'Ngày thành lập')).toBe('-')
  })

  it('in đúng địa chỉ đã lưu, và "-" khi rỗng', () => {
    const diaChiDai =
      'Lô 25+26 A24 NV12, KĐTM, hai bên đường Lê Trọng Tấn, Xã An Khánh, Huyện Hoài Đức, Tp.Hà Nội'
    const view = renderTable([makeRow({ address: diaChiDai }), makeRow({ address: '' })], type)

    expect(bodyCellText(view, 0, 'Địa chỉ')).toBe(diaChiDai)
    expect(bodyCellText(view, 1, 'Địa chỉ')).toBe('-')
  })

  it('không đụng tới các cột sẵn có', () => {
    const view = renderTable([makeRow()], type)
    const headers = view.getAllByRole('columnheader').map((h) => h.textContent?.trim())

    expect(headers).toEqual([
      'STT',
      'Mã',
      'Tên sàn',
      'Mã số thuế',
      'Người liên hệ',
      'Số điện thoại',
      'Email',
      'Ngày thành lập',
      'Địa chỉ',
      'Hoạt động',
      '',
    ])
  })
})
