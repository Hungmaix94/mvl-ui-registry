import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * `Table` thật được thay bằng stub chỉ phơi ra những action THỰC SỰ hiện với dòng đầu tiên —
 * tức stub tự áp `show(record)` đúng như bảng thật làm. Các test dưới đây kiểm đúng một thứ:
 * MỖI HÀNH ĐỘNG HIỆN VỚI TRẠNG THÁI NÀO. Không kiểm cách bảng render.
 *
 * Prop là `rowActions` — KHÔNG phải `actions`. Bắt nhầm tên thì mảng luôn rỗng và mọi assert dạng
 * `not.toContain` xanh giả, đúng loại test rỗng cần tránh; các test dưới vì thế luôn kèm một
 * assert HIỆN DIỆN làm đối chứng.
 */
vi.mock('@/components/ui', () => ({
  Table: ({
    rowActions,
    data,
  }: {
    rowActions?: { label: string; show?: (record: unknown) => boolean }[]
    data?: unknown[]
  }) => (
    <ul data-testid="actions">
      {(rowActions ?? [])
        .filter((action) => !action.show || action.show((data ?? [])[0]))
        .map((action) => (
          <li key={action.label}>{action.label}</li>
        ))}
    </ul>
  ),
  Chip: () => null,
}))
vi.mock('@/components/ui/table/TableError', () => ({ default: () => <div>error</div> }))
vi.mock('@/components/commons', () => ({ ReferenceCode: () => null }))
vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map(), keysMapOptions: new Map() }),
}))
vi.mock('@/hooks/useDialog', () => ({ useDialog: () => ({ displayConfirm: vi.fn() }) }))
vi.mock('@/hooks/useApiQuery', () => ({
  useInvalidateQueries: () => ({ invalidateByPrefix: vi.fn() }),
}))
vi.mock('@/features/accounting/input-invoices/services/input-invoice-service', () => ({
  useDeleteInputInvoice: () => ({ mutateAsync: vi.fn() }),
}))
// Mock barrel `@/components/ui` cắt ngang một vòng import, làm `@/routes` chưa kịp khởi tạo
// APP_PATH khi module khác đọc tới. Test này không quan tâm đường dẫn thật.
vi.mock('@/routes', () => ({
  APP_PATH: new Proxy({}, { get: (_t, key) => `/${String(key).toLowerCase()}` }),
}))

const canMock = vi.fn<(action: string, subject: string) => boolean>(() => true)
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: canMock }) }))

import InputInvoiceTable from './InputInvoiceTable'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import { InputInvoiceStatus } from '@/constants/api-schema-aliases'

const MARK_RECEIVED = 'Nhận hóa đơn'
const VERIFY = 'Xác nhận hóa đơn'

function makeRow(overrides: Record<string, unknown> = {}): InputInvoice {
  return {
    id: 7,
    code: 'HDIN000000217',
    external_invoice_no: '',
    invoice_date: '2026-05-22',
    counterparty_type: 'EXCHANGE',
    status: InputInvoiceStatus.DRAFT,
    attachments: [],
    ...overrides,
  } as unknown as InputInvoice
}

function actionLabelsOnScreen() {
  return within(screen.getByTestId('actions'))
    .getAllByRole('listitem')
    .map((li) => li.textContent?.trim())
}

/**
 * Render một dòng rồi để test tự đọc nhãn qua `actionLabelsOnScreen()`. Cố ý KHÔNG trả về kết
 * quả của `render` — `testing-library/render-result-naming-convention` chặn việc đặt tên nghiệp
 * vụ cho giá trị đó, mà repo lint với `--max-warnings 0`.
 */
function renderRow(record: InputInvoice) {
  canMock.mockImplementation(() => true)
  render(
    <MemoryRouter>
      <InputInvoiceTable data={[record]} isLoading={false} totalRecords={1} />
    </MemoryRouter>
  )
}

describe('InputInvoiceTable — nút "Nhận hóa đơn" ở cột Thao tác (CR STT59)', () => {
  it('hiện với hoá đơn "Bản nháp" (DRAFT) — trạng thái của phần lớn hoá đơn thật', () => {
    renderRow(makeRow({ status: InputInvoiceStatus.DRAFT }))
    const actions = actionLabelsOnScreen()

    expect(actions).toContain(MARK_RECEIVED)
    // Đối chứng cho phép so ngược ở các test dưới: cùng một dòng, "Xác nhận hóa đơn" KHÔNG hiện
    // — chứng minh stub thật sự áp `show()` chứ không liệt kê tất cả.
    expect(actions).not.toContain(VERIFY)
  })

  it('vẫn hiện với trạng thái legacy PENDING chưa có số hoá đơn (không phá luồng cũ)', () => {
    renderRow(makeRow({ status: InputInvoiceStatus.PENDING, external_invoice_no: '' }))
    const actions = actionLabelsOnScreen()

    expect(actions).toContain(MARK_RECEIVED)
    expect(actions).not.toContain(VERIFY)
  })

  it('PENDING đã có số hoá đơn thì chuyển sang "Xác nhận hóa đơn", không phải "Nhận hóa đơn"', () => {
    renderRow(makeRow({ status: InputInvoiceStatus.PENDING, external_invoice_no: '00099' }))
    const actions = actionLabelsOnScreen()

    expect(actions).toContain(VERIFY)
    expect(actions).not.toContain(MARK_RECEIVED)
  })

  // Không nới rộng ngoài tập BE chấp nhận: `input_invoice_service.mark_received` chỉ nhận
  // `is_draft_like` (DRAFT hoặc PENDING) — hiện nút ở trạng thái khác là mời người dùng ăn 400.
  it.each([
    InputInvoiceStatus.RECEIVED,
    InputInvoiceStatus.VERIFIED,
    InputInvoiceStatus.PAID,
    InputInvoiceStatus.VOIDED,
  ])('KHÔNG hiện với trạng thái %s', (status) => {
    renderRow(makeRow({ status }))
    const actions = actionLabelsOnScreen()

    expect(actions).not.toContain(MARK_RECEIVED)
    // Đối chứng: dòng vẫn có action khác, nên mảng rỗng không phải là lý do assert trên đúng.
    expect(actions).toContain('Xem chi tiết')
  })

  it('thiếu quyền mark_received thì không hiện, dù trạng thái là "Bản nháp"', () => {
    canMock.mockImplementation((action: string) => action !== 'mark_received')
    render(
      <MemoryRouter>
        <InputInvoiceTable
          data={[makeRow({ status: InputInvoiceStatus.DRAFT })]}
          isLoading={false}
          totalRecords={1}
        />
      </MemoryRouter>
    )
    const actions = actionLabelsOnScreen()

    expect(actions).not.toContain(MARK_RECEIVED)
    expect(actions).toContain('Xem chi tiết')
  })
})
