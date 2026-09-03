import { describe, expect, it, vi } from 'vitest'
import { render, within, type RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))

vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: () => true }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map(), keysMapOptions: new Map() }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import DepositContractTable from './DepositContractTable'
import type { DepositContract } from '@/features/sales/deposit-contracts/services/deposit-contract-service'

/** `code` và `contract_number` cố tình khác nhau, để test phân biệt được cột đang đọc field nào. */
function makeRow(overrides: Partial<DepositContract> = {}): DepositContract {
  return {
    id: 7,
    code: 'DC-2026-001894',
    contract_number: '2026-940102',
    customer_detail: { id: 3, name: 'Nguyễn Văn A' },
    listed_price: '5000000000',
    created_at: '2026-08-20T10:00:00+07:00',
    status: 'new',
    approval_status: 'draft',
    ...overrides,
  } as unknown as DepositContract
}

function renderTable(rows: DepositContract[] = [makeRow()]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SidebarProvider>
          <DepositContractTable data={rows} isLoading={false} totalRecords={rows.length} />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** Ném lỗi khi cột vắng mặt — `indexOf` trần trả `-1` và mọi phép so sánh sau đó vẫn lọt. */
function headerIndex(headers: (string | undefined)[], label: string): number {
  const i = headers.indexOf(label)
  if (i < 0) throw new Error(`không có cột "${label}" trên bảng — headers: ${headers.join(' | ')}`)
  return i
}

function cellUnder(view: RenderResult, label: string, rowIdx = 0): string {
  const headers = view.getAllByRole('columnheader').map((th) => th.textContent?.trim())
  const col = headerIndex(headers, label)
  const row = view.getAllByRole('row')[rowIdx + 1]
  if (!row) throw new Error(`không có dòng dữ liệu thứ ${rowIdx} trên bảng`)
  return (within(row).getAllByRole('cell')[col]?.textContent ?? '').trim()
}

describe('DepositContractTable (tab HĐ cọc trong Chi tiết BĐS) — cột "Mã phiếu đặt cọc" (CR 86eypf4gk)', () => {
  it('hiển thị contract_number, đặt ngay sau Mã hợp đồng', () => {
    const view = renderTable()
    const headers = view.getAllByRole('columnheader').map((th) => th.textContent?.trim())

    expect(headerIndex(headers, 'Mã phiếu đặt cọc')).toBe(headerIndex(headers, 'Mã hợp đồng') + 1)
    expect(cellUnder(view, 'Mã phiếu đặt cọc')).toBe('2026-940102')
    expect(cellUnder(view, 'Mã hợp đồng')).toBe('DC-2026-001894')
  })

  it('hiển thị "-" khi bản ghi chưa có số phiếu', () => {
    const view = renderTable([makeRow({ contract_number: '' } as Partial<DepositContract>)])

    expect(cellUnder(view, 'Mã phiếu đặt cọc')).toBe('-')
  })

  it('KHÔNG gắn affordance sắp xếp cho cột này — bảng chạy manualSorting mà không ai nhận sự kiện', () => {
    const view = renderTable()
    const th = (label: string) => {
      const found = view.getAllByRole('columnheader').find((h) => h.textContent?.trim() === label)
      if (!found) throw new Error(`không có cột "${label}"`)
      return found
    }

    // `TableHeader` không dựng <button> cho cột sortable — nó gắn onClick + class `cursor-pointer`
    // + icon mũi tên lên chính <th>. Nên phải đo đúng dấu hiệu đó, và đo KÈM một cột sortable thật
    // trong cùng bảng để tiền đề được assert luôn: nếu ai bỏ `sortable` khỏi "Mã hợp đồng" thì test
    // đỏ và nhắc người sửa xem lại, thay vì âm thầm mất hiệu lực.
    expect(th('Mã hợp đồng').className).toContain('cursor-pointer')
    expect(th('Mã phiếu đặt cọc').className).not.toContain('cursor-pointer')
  })

  it('giữ nguyên các cột cũ, đúng thứ tự', () => {
    const view = renderTable()
    const headers = view.getAllByRole('columnheader').map((th) => th.textContent?.trim())

    const previous = [
      'Mã hợp đồng',
      'Khách hàng',
      'Tổng giá trị',
      'Ngày tạo',
      'Trạng thái',
      'Trạng thái phê duyệt',
    ]
    const positions = previous.map((label) => headerIndex(headers, label))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})
