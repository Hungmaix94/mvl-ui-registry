import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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

vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({ displayConfirm: vi.fn() }),
}))

vi.mock('@/hooks/useApiQuery', () => ({
  useInvalidateQueries: () => ({ invalidateByPrefix: vi.fn() }),
}))

vi.mock('@/features/accounting/sales-invoices/services/sales-invoice-service', () => ({
  useDeleteSalesInvoice: () => ({ mutateAsync: vi.fn() }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import SalesInvoiceTable from './SalesInvoiceTable'
import type {
  SalesInvoice,
  SalesInvoiceSummary,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { SalesInvoiceStatus as SalesInvoiceStatus } from '@/constants/api-schema-aliases'
import { saveColumnConfigByStorageKey } from '@/utils/table/columnStorage'

/**
 * Con số cố ý cho mỗi field một giá trị KHÁC nhau: cách duy nhất để một test bắt được việc
 * cột đọc nhầm field. `remaining_amount` (RC.8 — HĐ ra trừ Σ HĐ vào đã nối) và
 * `remaining_to_collect` (còn phải THU) là cặp dễ lẫn nhất, nên chúng lệch nhau hẳn.
 */
function makeRow(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: 42,
    code: 'HDOUT-202605-0042',
    external_invoice_no: '00012345',
    invoice_date: '2026-05-22',
    investor: 3,
    customer_name: 'Chủ đầu tư A',
    investor_reconciliation_sheet: null,
    total_amount: '100000000',
    vat_amount: '10000000',
    total_amount_with_vat: '110000000',
    paid_amount: '40000000',
    remaining_to_collect: '70000000',
    remaining_amount: '110000000',
    collected_pct: '36.3636363636',
    status: SalesInvoiceStatus.PARTIAL,
    attachments: [],
    ...overrides,
  } as unknown as SalesInvoice
}

const summary: SalesInvoiceSummary = {
  row_count: 1000,
  summary: {
    total_amount: '94300000000',
    vat_amount: '7544000000',
    total_amount_with_vat: '101844000000',
    paid_amount: '60000000000',
    prepaid_advance_amount: '1200000000',
    total_allocation_amount: '101844000000',
    amount_to_collect: '100644000000',
    remaining_to_collect: '41844000000',
    remaining_amount: '88000000000',
  },
} as unknown as SalesInvoiceSummary

function renderTable(props: Partial<Parameters<typeof SalesInvoiceTable>[0]> = {}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <SalesInvoiceTable
          data={[makeRow()]}
          isLoading={false}
          totalRecords={1}
          pageSize={25}
          currentPageIndex={0}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** Chỉ số cột lấy THEO HEADER — không đoán chỉ số cứng, thêm cột khác không làm vỡ test. */
function columnIndex(view: ReturnType<typeof renderTable>, header: string) {
  const index = view.getAllByRole('columnheader').findIndex((h) => h.textContent?.trim() === header)
  expect(index).toBeGreaterThanOrEqual(0)
  return index
}

/** Ô của dòng dữ liệu đầu tiên. */
function bodyCell(view: ReturnType<typeof renderTable>, header: string) {
  const row = view.getAllByRole('row')[1]
  return within(row).getAllByRole('cell')[columnIndex(view, header)]
}

/**
 * Ô của dòng "TỔNG CỘNG"; footer là hàng cuối cùng của bảng.
 *
 * KHÔNG dùng thẳng chỉ số cột: `TableFooter` gộp nhãn "TỔNG CỘNG" với dải cột trống liền kề
 * bằng `colSpan`, nên số ô `<td>` ít hơn số header và mọi ô sau chỗ gộp bị lệch. Cộng dồn
 * `colSpan` để tìm ô thật sự phủ cột cần kiểm.
 */
function footerCell(view: ReturnType<typeof renderTable>, header: string) {
  const rows = view.getAllByRole('row')
  const footRow = rows[rows.length - 1]
  const target = columnIndex(view, header)

  let covered = 0
  for (const cell of within(footRow).getAllByRole('cell')) {
    covered += Number(cell.getAttribute('colspan')) || 1
    if (covered > target) return cell
  }
  throw new Error(`Không tìm thấy ô footer phủ cột "${header}"`)
}

describe('SalesInvoiceTable — CR STT4: 3 cột tiến độ thu tiền', () => {
  it('hiện đủ 3 cột mới, nằm giữa "Tổng cộng" và "Trạng thái"', () => {
    const view = renderTable()
    const headers = view.getAllByRole('columnheader').map((h) => h.textContent?.trim())

    const total = headers.indexOf('Tổng cộng')
    const paid = headers.indexOf('Số tiền đã thu')
    const pct = headers.indexOf('Tỷ lệ tiền về')
    const remaining = headers.indexOf('Số tiền còn lại')
    const status = headers.indexOf('Trạng thái')

    expect(paid).toBeGreaterThan(total)
    expect(pct).toBe(paid + 1)
    expect(remaining).toBe(pct + 1)
    expect(status).toBe(remaining + 1)
  })

  it('"Số tiền đã thu" đọc paid_amount (Σ phiếu thu đã ghi sổ)', () => {
    const view = renderTable()
    expect(bodyCell(view, 'Số tiền đã thu').textContent).toBe('40.000.000')
  })

  it('"Tỷ lệ tiền về" đọc collected_pct và làm tròn XUỐNG 2 chữ số', () => {
    const view = renderTable()
    // 36.3636… làm tròn xuống → 36,36 (nửa-lên sẽ ra 36,36 ở đây, nên dùng thêm ca dưới).
    expect(bodyCell(view, 'Tỷ lệ tiền về').textContent).toBe('36,36%')
  })

  it('"Tỷ lệ tiền về" không làm tròn LÊN quá số BE đã chốt', () => {
    const view = renderTable({ data: [makeRow({ collected_pct: '99.9990000000' })] })
    // Nửa-lên sẽ thành 100% — quảng cáo một tỷ lệ thu cao hơn tiền thực về.
    expect(bodyCell(view, 'Tỷ lệ tiền về').textContent).toBe('99,99%')
  })

  it('"Tỷ lệ tiền về" hiện "—" khi BE trả null (hóa đơn gross = 0)', () => {
    const view = renderTable({ data: [makeRow({ collected_pct: null } as Partial<SalesInvoice>)] })
    expect(bodyCell(view, 'Tỷ lệ tiền về').textContent).toBe('—')
  })

  /**
   * Ca quan trọng nhất của file này. `remaining_amount` cũng là một số tiền hợp lý nên dùng
   * nhầm sẽ KHÔNG lộ ra khi xem bằng mắt — chỉ test chốt được field nào mới đúng.
   */
  it('"Số tiền còn lại" đọc remaining_to_collect, KHÔNG phải remaining_amount', () => {
    const view = renderTable()
    const cell = bodyCell(view, 'Số tiền còn lại')

    expect(cell.textContent).toBe('70.000.000') // remaining_to_collect
    expect(cell.textContent).not.toBe('110.000.000') // remaining_amount (RC.8 — HĐ vào đã nối)
  })

  it('dòng TỔNG CỘNG lấy đúng key tiền, và bỏ trống ô phần trăm', () => {
    const view = renderTable({ summary, summaryRowCount: summary.row_count })

    expect(footerCell(view, 'Số tiền đã thu').textContent).toBe('60.000.000.000')
    expect(footerCell(view, 'Số tiền còn lại').textContent).toBe('41.844.000.000')
    // `/summary/` cố ý không trả collected_pct: cộng một tỷ lệ là vô nghĩa.
    expect(footerCell(view, 'Tỷ lệ tiền về').textContent).toBe('')
  })
})

/**
 * Sort của bảng này phải là sort SERVER. Nếu quên `manualSorting`, `useTable` bật
 * `getSortedRowModel()` và chỉ sắp xếp 25 dòng của trang đang xem — số liệu trông "đã sort"
 * nhưng sai với toàn bộ tập đã lọc, và `onSortingChange` không bao giờ được gọi.
 */
describe('SalesInvoiceTable — sort đi qua server, đúng field BE cho phép', () => {
  function clickHeader(view: ReturnType<typeof renderTable>, header: string) {
    fireEvent.click(view.getAllByRole('columnheader')[columnIndex(view, header)])
  }

  it('bấm "Tiền hàng" phát field `total_amount`, không phát id cột `amount_before_tax`', () => {
    const onSortingChange = vi.fn()
    const view = renderTable({ onSortingChange })

    clickHeader(view, 'Tiền hàng')

    expect(onSortingChange).toHaveBeenCalledWith('total_amount', 'asc')
  })

  it('đảo chiều dựa trên `ordering` đang có trên URL', () => {
    const onSortingChange = vi.fn()
    const view = renderTable({ onSortingChange, ordering: 'total_amount' })

    clickHeader(view, 'Tiền hàng')

    expect(onSortingChange).toHaveBeenCalledWith('total_amount', 'desc')
  })

  it('"Ngày" và "Trạng thái" sort được (BE hỗ trợ)', () => {
    const onSortingChange = vi.fn()
    const view = renderTable({ onSortingChange })

    clickHeader(view, 'Ngày')
    expect(onSortingChange).toHaveBeenLastCalledWith('invoice_date', 'asc')

    clickHeader(view, 'Trạng thái')
    expect(onSortingChange).toHaveBeenLastCalledWith('status', 'asc')
  })

  it('không dựng nút sort cho cột BE không sort được (Mã HĐ, Tổng cộng, 3 cột CR STT4)', () => {
    const onSortingChange = vi.fn()
    const view = renderTable({ onSortingChange })

    for (const header of [
      'Mã HĐ',
      'Tổng cộng',
      'Số tiền đã thu',
      'Tỷ lệ tiền về',
      'Số tiền còn lại',
      // CR STT55: BE không nhận `ordering=project_name` → cột "Dự án" cũng không được dựng nút.
      'Dự án',
    ]) {
      clickHeader(view, header)
    }

    expect(onSortingChange).not.toHaveBeenCalled()
  })
})

/** Phải khớp `storageKey` mà `SalesInvoiceTable` truyền cho `useColumnConfig`. */
const COLUMN_STORAGE_KEY = 'accounting-sales-invoices'

describe('SalesInvoiceTable — CR STT55: cột "Dự án"', () => {
  // Một test trong nhóm này gieo cấu hình cột vào localStorage. Dọn ĐÚNG key đó, không
  // `localStorage.clear()`: nhóm này đang là describe cuối file nên clear() vô hại hôm nay,
  // nhưng nó sẽ âm thầm xoá cả state của người khác nếu sau này có describe thêm phía dưới
  // hoặc `setupTests.ts` bắt đầu gieo gì đó.
  afterEach(() => {
    Object.keys(localStorage)
      .filter((k) => k.endsWith(`-${COLUMN_STORAGE_KEY}-table-columns`))
      .forEach((k) => localStorage.removeItem(k))
  })

  it('nằm ngay sau "Đối chiếu", trước "Tiền hàng"', () => {
    const view = renderTable()
    const headers = view.getAllByRole('columnheader').map((h) => h.textContent?.trim())

    const reconciliation = headers.indexOf('Đối chiếu')
    const project = headers.indexOf('Dự án')
    const amount = headers.indexOf('Tiền hàng')

    // Chốt sự CÓ MẶT trước: `indexOf` trả -1 khi vắng mặt, mà -1 < mọi chỉ số dương nên
    // hai phép so bên dưới vẫn xanh khi cột bị gỡ hẳn.
    expect(project).toBeGreaterThanOrEqual(0)
    expect(project).toBe(reconciliation + 1)
    expect(amount).toBe(project + 1)
  })

  it('đọc project_name của hoá đơn', () => {
    const view = renderTable({ data: [makeRow({ project_name: 'Vinhomes Thăng Long' })] })

    expect(bodyCell(view, 'Dự án').textContent).toBe('Vinhomes Thăng Long')
  })

  it('người dùng đã lưu cấu hình cột TỪ TRƯỚC CR vẫn thấy cột mới, đúng chỗ', () => {
    // Ca dễ mất nhất và không lộ ra ở bản cài mới: ai đã từng mở màn này đều có sẵn một bản
    // cấu hình cột trong localStorage KHÔNG chứa `project_name`. Ghi bằng chính hàm lưu của
    // app để không phải đoán storage key.
    saveColumnConfigByStorageKey(undefined, COLUMN_STORAGE_KEY, {
      version: 1,
      columns: [
        'external_invoice_no',
        'invoice_date',
        'customer_name',
        'reconciliation',
        'amount_before_tax',
        'tax_amount',
        'total_amount_with_vat',
        'paid_amount',
        'collected_pct',
        'remaining_to_collect',
        'status',
      ].map((id, order) => ({
        id,
        label: id,
        // Người dùng đã tự ẩn một cột — phải còn nguyên sau khi gộp.
        visible: id !== 'tax_amount',
        order,
      })),
    })

    const view = renderTable()
    const headers = view.getAllByRole('columnheader').map((h) => h.textContent?.trim())

    expect(headers).toContain('Dự án')
    expect(headers.indexOf('Dự án')).toBe(headers.indexOf('Đối chiếu') + 1)
    // Đối chứng: lựa chọn cũ của người dùng không bị bản gộp ghi đè.
    expect(headers).not.toContain('Thuế VAT')
    expect(headers).toContain('Tổng cộng')
  })

  it('hiện "—" khi hoá đơn không gắn phiếu đối chiếu (BE trả null)', () => {
    // Hai dòng trong CÙNG một lần render: dòng có tên là đối chứng, nếu selector sai thì nó
    // đỏ trước — chứ không phải để "—" một mình đọc như bằng chứng.
    const view = renderTable({
      data: [
        makeRow({ id: 1, project_name: null, investor_reconciliation_sheet: null }),
        makeRow({ id: 2, project_name: 'Dự án Làng Vân', investor_reconciliation_sheet: 9 }),
      ],
    })
    const rows = view.getAllByRole('row')
    const index = columnIndex(view, 'Dự án')

    expect(within(rows[1]).getAllByRole('cell')[index].textContent).toBe('—')
    expect(within(rows[2]).getAllByRole('cell')[index].textContent).toBe('Dự án Làng Vân')
  })
})
