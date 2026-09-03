import { describe, it, expect, vi } from 'vitest'

// Barrel `@/components/ui` kéo theo `src/lib/firebase.ts`, module này gọi `getMessaging()`
// ngay khi eval và ném trong jsdom (lỗi có sẵn). Chặn tại đây.
vi.mock('@/lib/firebase', () => ({
  default: null,
  getFCMToken: vi.fn(),
  onMessageListener: vi.fn(),
  messaging: null,
  analytics: null,
}))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }))
vi.mock('firebase/analytics', () => ({ getAnalytics: vi.fn() }))
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
}))

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import { CommissionByRevenueTable, type CommissionByRevenueScope } from './CommissionByRevenueTable'

vi.mock('@/hooks/useColumnConfig.ts', () => ({
  useColumnConfig: (defaultConfig: any) => ({
    columns: defaultConfig,
    handleApply: vi.fn(),
    handleReset: vi.fn(),
  }),
}))

const NO_SCOPE: CommissionByRevenueScope = { branch: false, block: false, department: false }

function createRow(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    year: 2026,
    month: 7,
    department: 9,
    actual_amount: '177669182',
    target_amount: '725833339',
    completion_pct: 24.5,
    employee_count: 18,
    revenue_deals_count: 2,
    department_detail: {
      id: 9,
      name: 'Phòng Kinh Doanh 1_DN',
      branch: { id: 2, name: 'Đà Nẵng' },
      block: { id: 4, name: 'Khối Kinh doanh_Đà Nẵng' },
    },
    manager_splits: [
      { role: 'TPKD', pct: '4.000000', amount: '7106767' },
      { role: 'GDKD', pct: '1.000000', amount: '1776692' },
      { role: 'CEO', pct: '0.500000', amount: '888346' },
    ],
    ...overrides,
  } as any
}

/**
 * Khối `summary` của BE — tổng TOÀN tập, cố tình KHÁC tổng của `data`.
 *
 * Các số ở đây không cộng ra từ `createRow()`: nếu bảng lỡ quay lại cộng trang thì con số hiện
 * ra sẽ lệch hẳn, chứ không tình cờ trùng khớp rồi lọt test.
 */
function createSummary(overrides: Record<string, any> = {}) {
  return {
    department_count: 171,
    actual_amount: '900000000',
    target_amount: '4000000000',
    tpkd_amount: '36000000',
    gdkd_amount: '9000000',
    ceo_amount: '4500000',
    ...overrides,
  } as any
}

function renderTable(
  data: any[],
  scope: CommissionByRevenueScope = NO_SCOPE,
  summary: any = createSummary()
) {
  return render(
    <SidebarProvider>
      <MemoryRouter>
        <CommissionByRevenueTable
          data={data}
          summary={summary}
          isLoading={false}
          pageCount={1}
          pageSize={25}
          currentPage={1}
          totalRecords={data.length}
          scope={scope}
          onPaginationChange={vi.fn()}
          onViewDetail={vi.fn()}
        />
      </MemoryRouter>
    </SidebarProvider>
  )
}

/**
 * Cells are addressed by their `data-column-id`, never by position or by text.
 *
 * This table has two header rows — three "Tỷ lệ" / "Thành tiền" pairs repeat under the three
 * bonus groups — and the same amount shows up in a row and again in the summary row. Text and
 * index therefore both match *a* cell exactly when a column has been dropped or reordered,
 * which is the regression these tests exist to catch.
 */
function cellsOf(row: HTMLElement): HTMLElement[] {
  return within(row).queryAllByRole('cell')
}

function bodyRows(): { row: HTMLElement; cells: HTMLElement[] }[] {
  return screen
    .getAllByRole('row')
    .map((row) => ({ row, cells: cellsOf(row) }))
    .filter(({ cells }) => cells.length > 0)
}

const columnIdOf = (cell: HTMLElement) => cell.getAttribute('data-column-id')

/**
 * First real department row.
 *
 * Matched on a NUMERIC stt, not merely a non-empty one: the section header and the "Cộng nhóm"
 * subtotal both hang their merged label off the stt cell too, so "has text" would return the
 * band instead of a department.
 */
function firstDataRow(): HTMLElement[] {
  const found = bodyRows().find(({ cells }) =>
    cells.some((c) => columnIdOf(c) === 'stt' && /^\d+$/.test(c.textContent?.trim() ?? ''))
  )
  return found?.cells ?? []
}

function rowContaining(text: string | RegExp): HTMLElement[] {
  const matches = (value: string) =>
    typeof text === 'string' ? value.includes(text) : text.test(value)
  const found = bodyRows().find(({ cells }) => cells.some((c) => matches(c.textContent ?? '')))
  return found?.cells ?? []
}

function summaryRow(): HTMLElement[] {
  return rowContaining('TỔNG CỘNG')
}

function cellIn(columnId: string): HTMLElement {
  const cells = firstDataRow()
  const cell = cells.find((c) => columnIdOf(c) === columnId)
  if (!cell) {
    throw new Error(
      `No cell for column "${columnId}". Row has: ${cells.map(columnIdOf).join(' | ')}`
    )
  }
  return cell
}

function summaryCell(columnId: string): HTMLElement | undefined {
  return summaryRow().find((c) => columnIdOf(c) === columnId)
}

function columnIds(): (string | null)[] {
  return firstDataRow().map(columnIdOf)
}

describe('CommissionByRevenueTable — nhãn và định dạng (CR 86eyj2pyy)', () => {
  it('đổi tên cột "% HT" thành "Tỷ lệ hoàn thành"', () => {
    renderTable([createRow()])

    expect(screen.getByText('Tỷ lệ hoàn thành')).toBeInTheDocument()
    expect(screen.queryByText('% HT')).not.toBeInTheDocument()
  })

  it('hiện "0%" chứ không phải "0,0%" khi phòng chưa có doanh số', () => {
    renderTable([createRow({ completion_pct: 0 })])

    expect(cellIn('completion_pct')).toHaveTextContent(/^0%$/)
  })

  it('vẫn giữ phần lẻ khi tỷ lệ có phần lẻ', () => {
    renderTable([createRow({ completion_pct: 24.5 })])

    expect(cellIn('completion_pct')).toHaveTextContent('24,5%')
  })

  it('hiện một dấu gạch thay cho "---" khi phòng không khớp bậc hoa hồng nào', () => {
    renderTable([createRow({ manager_splits: [] })])

    for (const id of ['tpkd_rate', 'tpkd_amount', 'gdkd_amount', 'ceo_amount']) {
      expect(cellIn(id)).toHaveTextContent('—')
      expect(cellIn(id)).not.toHaveTextContent('---')
    }
  })

  it('không tô màu 3 cột thành tiền — cả ba dùng token chữ đen', () => {
    renderTable([createRow()])

    const amounts = [
      ['tpkd_amount', '7.106.767'],
      ['gdkd_amount', '1.776.692'],
      ['ceo_amount', '888.346'],
    ] as const

    for (const [id, formatted] of amounts) {
      const amount = within(cellIn(id)).getByText(formatted)
      expect(amount).toHaveClass('text-content-dark-1')
      expect(amount.className).not.toMatch(/text-(blue|sky|purple)-/)
    }
  })
})

describe('CommissionByRevenueTable — cột theo bộ lọc (CR 86eyj2pyy)', () => {
  it('ẩn cột Chi nhánh khi danh sách đã lọc theo chi nhánh', () => {
    renderTable([createRow()], { ...NO_SCOPE, branch: true })

    expect(columnIds()).not.toContain('branch')
    expect(columnIds()).toContain('block')
    expect(columnIds()).toContain('department')
  })

  it('ẩn cột Khối khi danh sách đã lọc theo khối', () => {
    renderTable([createRow()], { ...NO_SCOPE, block: true })

    expect(columnIds()).not.toContain('block')
    expect(columnIds()).toContain('branch')
  })

  it('đưa số lượng nhân viên và giao dịch lên hai cột đầu khi lọc theo phòng ban', () => {
    renderTable([createRow()], { branch: true, block: true, department: true })

    expect(columnIds().slice(0, 3)).toEqual(['stt', 'employee_count', 'revenue_deals_count'])
    expect(columnIds()).not.toContain('department')
    expect(cellIn('employee_count')).toHaveTextContent('18')
    expect(cellIn('revenue_deals_count')).toHaveTextContent('2')
  })

  it('giữ số lượng trong ô Phòng ban khi chưa lọc theo phòng ban', () => {
    renderTable([createRow()])

    expect(columnIds()).not.toContain('employee_count')
    expect(cellIn('department')).toHaveTextContent('18 nhân viên · 2 giao dịch')
  })
})

describe('CommissionByRevenueTable — dòng nhóm và dòng tổng (CR 86eyj2pyy)', () => {
  it('gộp ô STT vào ô nhãn của dòng tổng cộng', () => {
    renderTable([createRow()])

    const label = summaryRow()[0]
    expect(label).toHaveTextContent('TỔNG CỘNG')
    // colSpan > 1 là bằng chứng ô nhãn đã nuốt ô STT bên trái vào chính nó.
    expect(Number(label.getAttribute('colspan'))).toBeGreaterThan(1)
    expect(summaryCell('stt')).toBeUndefined()
  })

  it('lấy tổng TOÀN tập từ BE, không cộng lại các dòng của trang', () => {
    renderTable([createRow(), createRow({ id: 2, actual_amount: '22330818' })])

    // Trang này cộng ra 200.000.000 (177.669.182 + 22.330.818). Dòng tổng phải hiện số của
    // `summary`, vì endpoint phân trang server-side và trang chỉ là một lát của bộ lọc.
    expect(summaryCell('actual_amount')).toHaveTextContent('900.000.000')
    expect(summaryCell('actual_amount')).not.toHaveTextContent('200.000.000')
    expect(summaryCell('target_amount')).toHaveTextContent('4.000.000.000')
    expect(summaryCell('tpkd_amount')).toHaveTextContent('36.000.000')
    expect(summaryCell('gdkd_amount')).toHaveTextContent('9.000.000')
    expect(summaryCell('ceo_amount')).toHaveTextContent('4.500.000')
  })

  it('đếm số bản ghi của dòng tổng theo toàn tập, không theo số dòng đang xem', () => {
    renderTable([createRow(), createRow({ id: 2 })])

    // Cùng nguồn với năm cột tiền bên cạnh — "(2 bản ghi)" dưới một cột tiền phủ 171 phòng là
    // hai đại lượng khác nhau nằm chung một dòng.
    expect(summaryRow()[0]).toHaveTextContent('171 bản ghi')
  })

  it('bỏ hẳn dòng tổng khi BE chưa trả summary, không bịa số 0', () => {
    // Render thẳng, KHÔNG qua `renderTable`: truyền `undefined` vào tham số có giá trị mặc định
    // thì JS lấy lại chính giá trị mặc định, nên bài test sẽ vẫn có summary mà tưởng là không.
    render(
      <SidebarProvider>
        <MemoryRouter>
          <CommissionByRevenueTable
            data={[createRow()]}
            isLoading={false}
            pageCount={1}
            pageSize={25}
            currentPage={1}
            totalRecords={1}
            scope={NO_SCOPE}
            onPaginationChange={vi.fn()}
            onViewDetail={vi.fn()}
          />
        </MemoryRouter>
      </SidebarProvider>
    )

    // "TỔNG CỘNG — 0 ₫" dưới một trang có doanh thu đọc y hệt một kỳ chưa phát sinh gì: số 0 là
    // giá trị kế toán hợp lệ nên không có gì báo cho người dùng biết nó là số bịa.
    expect(screen.queryByText(/TỔNG CỘNG/)).not.toBeInTheDocument()
    // Dòng dữ liệu vẫn còn nguyên — chỉ dòng tổng biến mất.
    expect(cellIn('actual_amount')).toHaveTextContent('177.669.182')
  })

  it('vẫn cộng dòng "Cộng nhóm" trong phạm vi trang', () => {
    renderTable([createRow(), createRow({ id: 2, actual_amount: '22330818' })])

    // Nhóm nằm trọn trong trang nên cộng tại chỗ là đúng — `summary` KHÔNG được lấn sang đây.
    const subtotal = rowContaining('Cộng nhóm')
    expect(subtotal.find((c) => columnIdOf(c) === 'actual_amount')).toHaveTextContent('200.000.000')
  })

  it('nói rõ "phần trong trang" và giấu số phòng khi nhóm bị cắt ngang trang', () => {
    // Trang 2 / 3: nhóm duy nhất chạm cả hai mép nên có thể còn phòng ở trang trước lẫn trang sau.
    render(
      <SidebarProvider>
        <MemoryRouter>
          <CommissionByRevenueTable
            data={[createRow(), createRow({ id: 2 })]}
            summary={createSummary()}
            isLoading={false}
            pageCount={3}
            pageSize={25}
            currentPage={2}
            totalRecords={171}
            scope={NO_SCOPE}
            onPaginationChange={vi.fn()}
            onViewDetail={vi.fn()}
          />
        </MemoryRouter>
      </SidebarProvider>
    )

    expect(screen.getByText('Cộng nhóm (phần trong trang)')).toBeInTheDocument()
    // Đếm "2 phòng" ở đây là sai và còn đổi theo cỡ trang, nên thà không in gì.
    expect(rowContaining('›')[0]).not.toHaveTextContent('phòng')
  })

  it('giữ nguyên nhãn và số phòng khi nhóm nằm trọn trong trang duy nhất', () => {
    renderTable([createRow(), createRow({ id: 2 })])

    expect(screen.getByText('Cộng nhóm')).toBeInTheDocument()
    expect(rowContaining('›')[0]).toHaveTextContent('· 2 phòng')
  })

  it('chèn dòng nhóm chi nhánh › khối khi chưa lọc theo đơn vị nào', () => {
    renderTable([createRow()])

    expect(screen.getByText('Đà Nẵng › Khối Kinh doanh_Đà Nẵng')).toBeInTheDocument()
    expect(screen.getByText('Cộng nhóm')).toBeInTheDocument()
  })

  it('trải dòng tiêu đề nhóm ra hết bề ngang bảng', () => {
    renderTable([createRow()])

    const band = rowContaining('›')
    // Một ô gộp chạy từ STT tới sát cột thao tác: nhồi tên chi nhánh › khối vào một cột hẹp
    // là nó xuống ba dòng và các ô còn lại trống trơn — trông như dòng dữ liệu bị hỏng chứ
    // không phải vạch phân đoạn.
    expect(columnIdOf(band[0])).toBe('stt')
    // Cột "actions" đông cứng bên phải nên CỐ Ý không bị nuốt — một ô gộp chỉ mang được một
    // offset sticky, nuốt vào là nó mất điểm neo khi cuộn ngang.
    expect(band.slice(1).map(columnIdOf)).toEqual(['actions'])
    // Ô gộp + phần còn lại phủ kín hàng, không thừa không thiếu cột nào.
    expect(Number(band[0].getAttribute('colspan')) + band.length - 1).toBe(columnIds().length)
  })

  it('hiện số phòng của nhóm ngay trên dải tiêu đề', () => {
    renderTable([createRow(), createRow({ id: 2 })])

    expect(rowContaining('›')[0]).toHaveTextContent('· 2 phòng')
  })

  it('gộp nhãn "Cộng nhóm" hết cụm cột chữ, giữ nguyên cột số', () => {
    renderTable([createRow()])

    const subtotal = rowContaining('Cộng nhóm')
    const label = subtotal[0]
    expect(columnIdOf(label)).toBe('stt')
    // STT + Chi nhánh + Khối + Phòng ban — số cột chữ khi chưa lọc theo đơn vị nào.
    expect(Number(label.getAttribute('colspan'))).toBe(4)
    expect(subtotal.map(columnIdOf)).not.toContain('branch')

    // Cột số vẫn ở đúng chỗ của nó, thẳng hàng với dòng TỔNG CỘNG bên dưới.
    const actual = subtotal.find((c) => columnIdOf(c) === 'actual_amount')
    expect(actual).toHaveTextContent('177.669.182')
  })

  it('bỏ dòng nhóm khi danh sách đã lọc theo đơn vị', () => {
    renderTable([createRow()], { ...NO_SCOPE, branch: true })

    expect(screen.queryByText(/›/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cộng nhóm/)).not.toBeInTheDocument()
  })

  it('đánh số STT tiếp nối sang trang sau', () => {
    render(
      <SidebarProvider>
        <MemoryRouter>
          <CommissionByRevenueTable
            data={[createRow()]}
            isLoading={false}
            pageCount={3}
            pageSize={25}
            currentPage={2}
            totalRecords={60}
            scope={{ ...NO_SCOPE, branch: true }}
            onPaginationChange={vi.fn()}
            onViewDetail={vi.fn()}
          />
        </MemoryRouter>
      </SidebarProvider>
    )

    expect(cellIn('stt')).toHaveTextContent('26')
  })

  describe('vai không có người nhận', () => {
    it('đánh dấu cảnh báo số tiền của vai không resolve được', () => {
      renderTable([
        createRow({
          manager_splits: [
            { role: 'TPKD', pct: '4.000000', amount: '7106767' },
            {
              role: 'GDKD',
              pct: '1.000000',
              amount: '1776692',
              unresolved: true,
              unresolved_reason: 'missing_block_director',
            },
            { role: 'CEO', pct: '0.500000', amount: '888346' },
          ],
        }),
      ])

      // Số tiền vẫn phải hiện — nó là căn cứ để kế toán biết đang thiếu bao nhiêu — nhưng phải
      // khác hẳn các ô bình thường, vì không có phiếu chi nào đứng sau nó.
      // Chữ phải HIỆN, không nằm trong tooltip: bảng này được in ra / chụp màn hình để đối
      // chiếu, mà tooltip thì không đi theo bản in.
      expect(within(cellIn('gdkd_amount')).getByText('Chưa có người nhận')).toBeInTheDocument()
      expect(within(cellIn('gdkd_amount')).getByText('1.776.692')).toHaveClass(
        'text-text-warning-default'
      )
      expect(within(cellIn('tpkd_amount')).queryByText('Chưa có người nhận')).not.toBeInTheDocument()
      expect(within(cellIn('tpkd_amount')).getByText('7.106.767')).not.toHaveClass(
        'text-text-warning-default'
      )
    })

    it('giữ nguyên cách hiển thị khi mọi vai đều có người nhận', () => {
      renderTable([createRow()])

      expect(within(cellIn('gdkd_amount')).queryByText('Chưa có người nhận')).not.toBeInTheDocument()
      expect(within(cellIn('gdkd_amount')).getByText('1.776.692')).not.toHaveClass(
        'text-text-warning-default'
      )
    })

    it('không vỡ khi BE chưa trả hai trường mới', () => {
      // schema.ts chỉ sinh lại từ BE đã deploy, nên FE phải chạy được với payload cũ.
      renderTable([
        createRow({ manager_splits: [{ role: 'GDKD', pct: '1.000000', amount: '1776692' }] }),
      ])

      expect(within(cellIn('gdkd_amount')).queryByText('Chưa có người nhận')).not.toBeInTheDocument()
      expect(within(cellIn('gdkd_amount')).getByText('1.776.692')).not.toHaveClass(
        'text-text-warning-default'
      )
    })
  })
})
