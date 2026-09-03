import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, within } from '@testing-library/react'
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

vi.mock('@/features/accounting/input-invoices/services/input-invoice-service', () => ({
  useDeleteInputInvoice: () => ({ mutateAsync: vi.fn() }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import InputInvoiceTable from './InputInvoiceTable'
import type {
  InputInvoice,
  InputInvoiceSummary,
} from '@/features/accounting/input-invoices/services/input-invoice-service'
import { InputInvoiceStatus as InputInvoiceStatus } from '@/constants/api-schema-aliases'
import { saveColumnConfigByStorageKey } from '@/utils/table/columnStorage'

/** Phải khớp `storageKey` truyền cho `useColumnConfig` trong InputInvoiceTable. */
const COLUMN_STORAGE_KEY = 'accounting-input-invoices'

function makeRow(overrides: Record<string, unknown> = {}): InputInvoice {
  return {
    id: 7,
    code: 'HDIN000000217',
    external_invoice_no: '00099',
    invoice_date: '2026-05-22',
    counterparty_type: 'EXCHANGE',
    exchange: 5,
    exchange_detail: { id: 5, name: 'Sàn F2 A' },
    f2_reconciliation_sheet: 11,
    project_name: 'Vinhomes Thăng Long',
    total_amount: '100000000',
    vat_amount: '10000000',
    total_amount_with_vat: '110000000',
    paid_amount: '40000000',
    status: InputInvoiceStatus.PARTIAL,
    attachments: [],
    ...overrides,
  } as unknown as InputInvoice
}

const summary: InputInvoiceSummary = {
  row_count: 213,
  summary: {
    total_amount: '90000000000',
    vat_amount: '9000000000',
    total_amount_with_vat: '99000000000',
    paid_amount: '40000000000',
  },
} as unknown as InputInvoiceSummary

function renderTable(props: Partial<Parameters<typeof InputInvoiceTable>[0]> = {}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <InputInvoiceTable
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

function bodyCell(view: ReturnType<typeof renderTable>, header: string) {
  const row = view.getAllByRole('row')[1]
  return within(row).getAllByRole('cell')[columnIndex(view, header)]
}

/**
 * Ô của dòng "TỔNG CỘNG". KHÔNG dùng thẳng chỉ số cột: `TableFooter` gộp nhãn "TỔNG CỘNG" với
 * dải cột KHÔNG có footer liền kề bằng `colSpan`, nên số `<td>` ít hơn số header và mọi ô sau
 * chỗ gộp bị lệch. Cộng dồn `colSpan` để tìm ô thật sự phủ cột cần kiểm.
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

describe('InputInvoiceTable — cột "Dự án"', () => {
  afterEach(() => {
    // Chỉ dọn key của chính bảng này: xoá sạch localStorage sẽ kéo theo cấu hình cột mà các
    // describe khác trong repo có thể đã dựng sẵn.
    window.localStorage.removeItem(`guest-${COLUMN_STORAGE_KEY}-table-columns`)
  })

  it('hiện cột "Dự án" ngay sau "Đối chiếu" và trước "Tiền hàng"', () => {
    const view = renderTable()
    const headers = view.getAllByRole('columnheader').map((h) => h.textContent?.trim())

    const recon = headers.indexOf('Đối chiếu')
    const project = headers.indexOf('Dự án')
    const amount = headers.indexOf('Tiền hàng')

    // Guard cho bẫy indexOf: -1 sẽ khiến mọi so sánh dưới đây "đúng" một cách vô nghĩa.
    expect(recon).toBeGreaterThanOrEqual(0)
    expect(project).toBe(recon + 1)
    expect(amount).toBe(project + 1)
  })

  it('in tên dự án BE trả về, không tự suy từ phiếu đối chiếu', () => {
    const view = renderTable()
    expect(bodyCell(view, 'Dự án').textContent).toContain('Vinhomes Thăng Long')
  })

  it('hoá đơn không có dự án nào thì hiện "—", không phải ô trống', () => {
    const view = renderTable({
      data: [
        makeRow({
          id: 8,
          code: 'HDIN000000218',
          f2_reconciliation_sheet: null,
          project_name: null,
        }),
        // Dòng đối chứng: chứng minh cùng một lần render VẪN in được tên, nên "—" ở trên là
        // trạng thái rỗng thật chứ không phải cột hỏng.
        makeRow(),
      ],
    })

    const rows = view.getAllByRole('row')
    const index = columnIndex(view, 'Dự án')
    expect(within(rows[1]).getAllByRole('cell')[index].textContent?.trim()).toBe('—')
    expect(within(rows[2]).getAllByRole('cell')[index].textContent).toContain('Vinhomes Thăng Long')
  })

  it('không cho sắp xếp theo "Dự án" (BE không sort được field này)', () => {
    const view = renderTable()
    const headerFor = (label: string) =>
      view.getAllByRole('columnheader').find((h) => h.textContent?.trim() === label)!

    // `TableHeader` KHÔNG render <button> cho cột sort được — nó gắn onClick thẳng vào <th>
    // rồi thêm class `cursor-pointer` và một icon chỉ hướng. Nên `queryByRole('button')` là
    // null ở MỌI cột và không chứng minh được gì. Bám vào class: nó do đúng một điều kiện
    // `getCanSort() && meta.sortable === true` sinh ra, cùng điều kiện với icon.
    // (Không dùng `querySelector('svg')` — `testing-library/no-node-access` chặn, mà repo
    // lint với `--max-warnings 0`.)
    const sortable = headerFor('Ngày')
    // Đối chứng: nếu cơ chế render đổi, dòng này đỏ trước — thay vì test âm tính lặng lẽ
    // thành luôn đúng.
    expect(sortable.className).toContain('cursor-pointer')

    const project = headerFor('Dự án')
    expect(project.className).not.toContain('cursor-pointer')
    // Ghi chú cho người sửa sau: cột này bị chặn bởi HAI thứ độc lập — khai bằng `id` trần
    // (không accessor ⇒ `getCanSort()` false) VÀ `meta.sortable: false`. Nên mutation chỉ lật
    // `sortable` sẽ SỐNG SÓT, và đó không phải lỗi của test: hành vi vẫn đúng, cột vẫn không
    // sắp xếp được. Muốn thử răng của test thì phải lật cả hai (đổi sang `accessorKey` +
    // `sortable: true`) — làm vậy thì nó đỏ.
  })

  it('dòng TỔNG CỘNG không lệch cột sau khi chèn "Dự án" vào giữa bảng', () => {
    // Chèn một cột giữa bảng là cách kinh điển làm mọi ô tiền của dòng tổng trôi sang cột
    // bên cạnh, vì `TableFooter` gộp ô nhãn bằng `colSpan` nên số <td> ít hơn số header.
    const view = renderTable({ summary, summaryRowCount: 213 })

    expect(footerCell(view, 'Tiền hàng').textContent).toContain('90.000.000.000')
    expect(footerCell(view, 'VAT').textContent).toContain('9.000.000.000')
    expect(footerCell(view, 'Tổng cộng').textContent).toContain('99.000.000.000')
    expect(footerCell(view, 'Số tiền đã chi').textContent).toContain('40.000.000.000')
    // Cột chữ không có tổng ⇒ ô phủ nó phải TRỐNG. Ô nhãn chỉ gộp trong dải cùng kiểu ghim,
    // mà "Mã HĐ" (nơi đặt nhãn) là cột frozen, nên "Dự án" render ô riêng chứ không bị nuốt.
    expect(footerCell(view, 'Dự án').textContent?.trim()).toBe('')
    // Đối chứng: dòng cuối đúng là dòng TỔNG CỘNG, không phải một dòng dữ liệu.
    const rows = view.getAllByRole('row')
    expect(rows[rows.length - 1].textContent).toContain('TỔNG CỘNG')
  })

  it('tài khoản đã có cấu hình cột lưu sẵn vẫn thấy cột mới, và giữ nguyên cột họ đã ẩn', () => {
    // Ca dễ mất nhất và không lộ ra ở bản cài mới: ai đã từng mở màn này đều có sẵn một bản
    // cấu hình cột trong localStorage KHÔNG chứa `project_name`. Ghi bằng chính hàm lưu của
    // app để không phải đoán storage key.
    saveColumnConfigByStorageKey(undefined, COLUMN_STORAGE_KEY, {
      version: 1,
      columns: [
        'code',
        'invoice_date',
        'counterparty',
        'reconciliation',
        'amount_before_tax',
        'tax_amount',
        'total_amount_with_vat',
        'external_invoice_no',
        'paid_amount',
        'paid_pct',
        'remaining_amount',
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
    // Đối chứng: lựa chọn cũ của người dùng không bị bản gộp ghi đè. Không có nó thì phần
    // trên vẫn xanh ngay cả khi cấu hình seed bị bỏ qua hoàn toàn và mặc định thắng.
    expect(headers).not.toContain('VAT')
    expect(headers).toContain('Tổng cộng')
  })
})
