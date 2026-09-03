import { describe, expect, it, vi } from 'vitest'
import { render, within, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Hộp thoại thật do dialog store dựng nên nó không nằm trong cây render của bảng. Giữ lại
// `content` mà bảng truyền vào để đọc thẳng props của `DepositContractActionForm` — đó là chỗ
// duy nhất nhìn được bảng nối dây gì cho hộp thoại Hoàn tiền.
const dialogSpy = vi.hoisted(() => ({
  content: null as unknown,
  displayFormContent: vi.fn(),
}))

const refundSpy = vi.hoisted(() => ({ mutateAsync: vi.fn() }))

vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({
    displayFormContent: (opts: { content: unknown }) => {
      dialogSpy.content = opts.content
      dialogSpy.displayFormContent(opts)
    },
    displayClose: vi.fn(),
    setLoading: vi.fn(),
    displayConfirm: vi.fn(),
  }),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/features/sales/deposit-contracts/services/deposit-contract-service', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/sales/deposit-contracts/services/deposit-contract-service')
  >('@/features/sales/deposit-contracts/services/deposit-contract-service')
  const stub = () => ({ mutate: vi.fn(), mutateAsync: vi.fn() })
  return {
    ...actual,
    useApproveDepositContract: stub,
    useRejectDepositContract: stub,
    useDeleteDepositContract: stub,
    useAdminLeadApproveDepositContract: stub,
    useAccountantApproveDepositContract: stub,
    useAbandonDepositContract: stub,
    useRefundDepositContract: () => ({ mutate: vi.fn(), mutateAsync: refundSpy.mutateAsync }),
    usePreviewReclaimedDepositEmail: stub,
    useSendReclaimedDepositEmail: stub,
  }
})

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import { DepositContractListTable } from './DepositContractListTable'
import type { DepositContract } from '@/features/sales/deposit-contracts/services/deposit-contract-service'

/**
 * `code` và `contract_number` cố tình KHÁC nhau, và khác cả về hình dạng chuỗi — dữ liệu thật
 * trên dev cũng vậy (`DC-2026-001894` ↔ `2026-940102`, đo 20/08/2026: 0/100 dòng trùng nhau).
 * Cho hai giá trị giống nhau thì test không phân biệt được cột mới đang đọc đúng field hay
 * đang vô tình đọc lại `code`.
 */
function makeRow(overrides: Partial<DepositContract> = {}): DepositContract {
  return {
    id: 7,
    code: 'DC-2026-001894',
    contract_number: '2026-940102',
    customer_detail: { id: 3, name: 'Nguyễn Văn A' },
    project_detail: { id: 12, code: 'DA-12', name: 'Khu đô thị Mai Việt Land' },
    product_inventory_detail: { id: 55, code: 'BDS-55', unit_number: 'A-12-05' },
    listed_price: '5000000000',
    contract_date: '2026-08-20',
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
          <DepositContractListTable data={rows} isLoading={false} totalRecords={rows.length} />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/**
 * `indexOf` trần trả `-1` khi không tìm thấy, mà `-1` vẫn so sánh lọt qua mọi phép `toBe`/
 * `toBeLessThan` — nên gỡ hẳn cột đi test vẫn xanh, đúng thứ bộ test này sinh ra để bắt.
 * Ném lỗi ngay khi cột vắng mặt là cách duy nhất giữ phép so sánh có nghĩa.
 */
function headerIndex(headers: (string | undefined)[], label: string): number {
  const i = headers.indexOf(label)
  if (i < 0) throw new Error(`không có cột "${label}" trên bảng — headers: ${headers.join(' | ')}`)
  return i
}

/** Đọc đúng ô nằm dưới một cột, để assert vào NỘI DUNG Ô chứ không phải vào "có chuỗi này đâu đó trên bảng". */
function cellUnder(view: RenderResult, label: string, rowIdx = 0): string {
  const headers = view.getAllByRole('columnheader').map((th) => th.textContent?.trim())
  const col = headerIndex(headers, label)
  // Dòng đầu của `rowgroup` là hàng tiêu đề, nên dòng dữ liệu thứ n nằm ở rowIdx + 1.
  const rows = view.getAllByRole('row')
  const row = rows[rowIdx + 1]
  if (!row) throw new Error(`không có dòng dữ liệu thứ ${rowIdx} trên bảng`)
  const cells = within(row).getAllByRole('cell')
  return (cells[col]?.textContent ?? '').trim()
}

describe('DepositContractListTable — cột "Mã phiếu đặt cọc" (CR 86eypf4gk)', () => {
  it('hiển thị giá trị contract_number của từng bản ghi', () => {
    const { getByText } = renderTable()

    expect(getByText('Mã phiếu đặt cọc')).toBeInTheDocument()
    expect(getByText('2026-940102')).toBeInTheDocument()
  })

  it('đọc contract_number chứ không phải code', () => {
    const view = renderTable([
      makeRow({
        code: 'DC-2026-000001',
        contract_number: '2026-999999',
      } as Partial<DepositContract>),
    ])

    // Assert vào NỘI DUNG của đúng ô: cột mới phải in contract_number, còn cột "Mã hợp đồng"
    // vẫn in code. Chỉ kiểm "có chuỗi này trên bảng" thì cột mới đọc nhầm sang code vẫn lọt.
    expect(cellUnder(view, 'Mã phiếu đặt cọc')).toBe('2026-999999')
    expect(cellUnder(view, 'Mã hợp đồng')).toBe('DC-2026-000001')
  })

  it('đặt cột Mã phiếu đặt cọc ngay sau Mã hợp đồng', () => {
    const { getAllByRole } = renderTable()
    const headers = getAllByRole('columnheader').map((th) => th.textContent?.trim())

    expect(headerIndex(headers, 'Mã phiếu đặt cọc')).toBe(headerIndex(headers, 'Mã hợp đồng') + 1)
  })

  it('giữ nguyên 8 cột dữ liệu cũ, đúng thứ tự cũ', () => {
    const { getAllByRole } = renderTable()
    const headers = getAllByRole('columnheader').map((th) => th.textContent?.trim())

    const previous = [
      'Mã hợp đồng',
      'Khách hàng',
      'Dự án',
      'Bất động sản',
      'Giá niêm yết',
      'Trạng thái',
      'Trạng thái phê duyệt',
      'Ngày hợp đồng',
    ]
    const positions = previous.map((label) => headerIndex(headers, label))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('hiển thị "-" khi bản ghi chưa có số phiếu', () => {
    const view = renderTable([makeRow({ contract_number: '' } as Partial<DepositContract>)])

    // Ô phải rơi về đúng dấu gạch ngang — assert thẳng vào nội dung ô, vì một ô rỗng hay ô in
    // "undefined" cũng sẽ lọt qua mọi phép kiểm "không thấy giá trị cũ ở đâu cả".
    expect(cellUnder(view, 'Mã phiếu đặt cọc')).toBe('-')
  })
})

/**
 * Hộp thoại Hoàn tiền bắt người dùng nhập tài khoản khách nhận, nhưng màn danh sách lại không
 * gửi khối đó lên API — trong khi BE khai cả ba field `required=True`. Người dùng điền xong
 * vẫn ăn 400, còn cùng hộp thoại ấy gọi từ màn chi tiết thì gửi đủ (ClickUp 86eyqjbtb).
 */
describe('DepositContractListTable — hoàn tiền gửi đủ khối tài khoản nhận (86eyqjbtb)', () => {
  // Từ 25/08/2026 BE trả sẵn `total_deposit_amount` và FE không cộng lại nữa (backend PR
  // #3370), nên fixture phải mang đúng ba field như API thật trả về. Giữ `registration_amount`
  // và `supplementary_amount` khác 0 và khác hẳn bậc của nhau: nếu ai đó thêm lại nhánh tự cộng
  // ở FE thì hai nguồn vẫn khớp và test này sẽ KHÔNG bắt được — chỗ bắt việc đó là
  // `deposit-amount.test.ts`. Ở đây chỉ ghim rằng bảng truyền đúng con số xuống hộp thoại.
  const REFUNDABLE = {
    registration_amount: '5000000000',
    supplementary_amount: '250000000',
    total_deposit_amount: '5250000000',
    approval_status: 'approved',
    status: 'new',
  } as Partial<DepositContract>
  const TONG_COC = 5_250_000_000

  /** Giá trị người dùng gõ trong hộp thoại — mỗi ô một giá trị KHÁC nhau, để một phép ánh xạ
   * lẫn field này sang field kia không thể lọt. */
  const TYPED = {
    note: 'Khách xin rút cọc',
    refundedAmount: 4_000_000_000,
    refundPayeeAccountName: 'NGUYEN VAN A',
    refundPayeeAccountNumber: '0011001234567',
    refundPayeeBankName: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    retainedReason: 'forfeit',
    retainedNote: 'Giữ lại phí phạt',
  }

  async function openRefundDialog() {
    dialogSpy.content = null
    refundSpy.mutateAsync.mockReset().mockResolvedValue(undefined)

    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const view = renderTable([makeRow(REFUNDABLE)])

    await user.click(view.getAllByRole('button', { name: 'Open actions menu' })[0])
    await user.click(await view.findByText('Hoàn tiền'))

    const content = dialogSpy.content as { props: Record<string, unknown> } | null
    if (!content?.props) throw new Error('bảng không mở được hộp thoại Hoàn tiền')
    return content.props
  }

  it('truyền tổng tiền cọc để khối "Lý do giữ lại" hiện được khi hoàn thiếu', async () => {
    const props = await openRefundDialog()

    // Cả hai prop phải là TỔNG cọc BE trả (`total_deposit_amount`), khớp cách BE chặn ở
    // `_validate_refund_amount` và `_retained_on_refund`. Ghim con số tuyệt đối chứ không
    // ghim "khác undefined": trần thiếu 250tr vẫn là một con số hợp lệ, chỉ là sai.
    expect(props.maxRefundAmount).toBe(TONG_COC)
    expect(props.totalDepositAmount).toBe(TONG_COC)
  })

  it('gửi lên API đủ khối tài khoản nhận và lý do giữ lại', async () => {
    const props = await openRefundDialog()

    await (props.onSubmit as (v: typeof TYPED) => Promise<void>)(TYPED)

    expect(refundSpy.mutateAsync).toHaveBeenCalledTimes(1)
    expect(refundSpy.mutateAsync.mock.calls[0][0]).toMatchObject({
      note: TYPED.note,
      refunded_amount: TYPED.refundedAmount,
      refund_payee_account_name: TYPED.refundPayeeAccountName,
      refund_payee_account_number: TYPED.refundPayeeAccountNumber,
      refund_payee_bank_name: TYPED.refundPayeeBankName,
      retained_reason: TYPED.retainedReason,
      retained_note: TYPED.retainedNote,
    })
  })
})
