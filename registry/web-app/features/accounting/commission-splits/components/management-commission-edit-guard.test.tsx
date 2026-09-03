// @vitest-environment jsdom
/**
 * Mục ⑤ "Thưởng HH quản lý" — **chỉ đọc, không thao tác nào.**
 *
 * Bảng ⑤ chưa từng có một ô nhập nào: tiền thưởng quản lý là số dẫn xuất (cấu hình cả căn ×
 * dial `% TT phí`, BE tính ở `set-period-progress`). Hai đường ghi đã bị gỡ, cùng ClickUp
 * 86eyqgbct nhưng ở hai vòng khác nhau — và file này canh **cả hai**, vì mỗi cái từng lọt
 * qua một loại kiểm tra khác nhau:
 *
 * 1. Nút "Lưu thưởng quản lý" gọi `PATCH …/split-by-recipient/` với `pct_type = mgmt_*`.
 *    Endpoint đó theo đặc tả chỉ nhận `pct_type ∈ SALES_PCT_TYPES` (srs
 *    `deal-period-allocation/fsd.md:1281`) ⇒ mọi lần bấm ăn 400 `"mgmt_ceo_agency_fee"
 *    không phải là một lựa chọn hợp lệ`.
 * 2. Nút **tạm giữ / bỏ giữ** ở cột "Thao tác". Vòng 1 giữ lại nút này và cho nó đứng bằng
 *    quyền (`canHold`); QA test thì lộ ra nó ghi xong (200) nhưng bảng không tự cập nhật, và
 *    BA chốt **bỏ hẳn action** thay vì đi sửa refresh.
 *
 * Cả hai guard canh ở mức **HOOK**, không ở mức nút: một `saveMgmt`/`handleHold` bị thêm lại
 * có thể nấp sau một nút mà test không bấm tới, còn lời gọi hook thì chạy ngay lúc render nên
 * không trốn được.
 *
 * Mọi phép assert VẮNG MẶT ở đây đi kèm một assert HIỆN DIỆN trong cùng test: dựng đúng
 * điều kiện mà bản cũ SẼ hiện cột (kế toán + `recipients_editable` + không duyệt chi), rồi
 * mới khẳng định nó không còn. Thiếu vế đó thì test xanh vì cây rỗng, không vì bug đã hết.
 */
import { FormProvider, useForm } from 'react-hook-form'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useUpdateRecipients: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useHoldShare: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useReleaseShareHold: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}))

vi.mock('../services/commission-splits-service', () => ({
  useManagementKpi: () => ({ data: [] }),
  useUpdateRecipients: mocks.useUpdateRecipients,
  useHoldShare: mocks.useHoldShare,
  useReleaseShareHold: mocks.useReleaseShareHold,
}))
vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/components/commons', () => ({ EmployeeProfileLink: () => null }))

import type { FormValues } from './commission-split-form.types'
import { ManagementCommissionSection } from './ManagementCommissionSection'

const MANAGER_NAME = 'Nguyễn Văn A'
/** Người thứ hai mang sẵn một khoản giữ đến từ bảng kê tháng (20.14), không từ màn này. */
const HELD_MANAGER_NAME = 'Trần Thị B'

const MGMT_POSITIONS = [
  {
    pct_type: 'mgmt_tp_agency_fee',
    owner_code: 'NV001',
    owner_name: MANAGER_NAME,
    recipient_id: 1,
    actual_amount: '1000000',
    recipients: [],
  },
  {
    pct_type: 'mgmt_tp_agency_fee',
    owner_code: 'NV002',
    owner_name: HELD_MANAGER_NAME,
    recipient_id: 2,
    actual_amount: '1000000',
    recipients: [{ account_hold_amount: '150000' }],
  },
] as unknown as FormValues['positions']

const DETAIL = { recipients_editable: true, period_month: 7, period_year: 2026 }

type Overrides = { isKT?: boolean; recipientsEditable?: boolean }

const Harness = ({ isKT = true, recipientsEditable = true }: Overrides) => {
  const form = useForm<FormValues>({ defaultValues: { positions: MGMT_POSITIONS } })
  return (
    <FormProvider {...form}>
      <ManagementCommissionSection
        detail={{ ...DETAIL, recipients_editable: recipientsEditable } as never}
        worksheetId={1}
        effectivePositions={MGMT_POSITIONS}
        appliedFeePct={24.2424242424}
        isKT={isKT}
        isAdminView={false}
        isTkdaView={!isKT}
        categories={[{ key: 'agency_fee', label: 'Thưởng quản lý' }]}
        isMgmt={() => true}
        mgmtRoleCode={(t) => t}
        mgmtRoleLabels={{}}
      />
    </FormProvider>
  )
}

/** Bảng ⑤ là bảng duy nhất có cột "Giữ lại HH" — bảng ⑥ (KPI) cũng render cùng lúc. */
function mgmtTable(): HTMLElement {
  const table = screen.getAllByRole('table').find((t) =>
    within(t)
      .queryAllByRole('columnheader')
      .some((th) => th.textContent?.trim() === 'Giữ lại HH')
  )
  if (!table) throw new Error('không tìm thấy bảng ⑤ (không có cột "Giữ lại HH")')
  return table
}

const headerLabels = () =>
  within(mgmtTable())
    .getAllByRole('columnheader')
    .map((th) => th.textContent?.trim() ?? '')

/**
 * Ô của một cột trên hàng của một người. Ném lỗi thay vì trả `-1`/`undefined`: `indexOf`
 * trần thì cột bị gỡ vẫn cho ra một chỉ số so sánh được và phép assert hoá rỗng.
 */
function cellOf(managerName: string, columnLabel: string): string {
  const labels = headerLabels()
  const col = labels.indexOf(columnLabel)
  if (col < 0) throw new Error(`bảng ⑤ không có cột "${columnLabel}" — có: ${labels.join(' | ')}`)

  // Hàng tiêu đề chỉ có `columnheader`, nên lọc theo `cell` là tự loại nó ra.
  const row = within(mgmtTable())
    .getAllByRole('row')
    .find((tr) => within(tr).queryAllByRole('cell')[0]?.textContent?.includes(managerName))
  if (!row) throw new Error(`không có hàng của "${managerName}"`)

  // Ô đầu là "Chức vụ" và hàng dữ liệu không có ô phụ nào (không checkbox, không STT), nên
  // chỉ số cột dùng thẳng được. Kiểm bằng chính điều kiện tìm hàng ở trên.
  return within(row).getAllByRole('cell')[col]?.textContent?.trim() ?? ''
}

const hasActionColumn = () => headerLabels().includes('Thao tác')

beforeEach(() => {
  mocks.useUpdateRecipients.mockClear()
  mocks.useHoldShare.mockClear()
  mocks.useReleaseShareHold.mockClear()
})

describe('Mục ⑤ Thưởng HH quản lý — không còn đường ghi nào', () => {
  it('không dựng mutation nào: cả `split-by-recipient` lẫn `hold-share`', () => {
    render(<Harness />)

    // Đối chứng HIỆN DIỆN: khối ⑤ đã mount thật với đúng điều kiện mà bản cũ sẽ hiện nút.
    expect(screen.getByText('Thưởng HH quản lý')).toBeTruthy()
    expect(headerLabels()).toContain('Thực nhận')

    expect(mocks.useUpdateRecipients).not.toHaveBeenCalled()
    expect(mocks.useHoldShare).not.toHaveBeenCalled()
    expect(mocks.useReleaseShareHold).not.toHaveBeenCalled()
  })

  it('không còn nút Chỉnh sửa / Lưu / tạm giữ trên toàn khối', () => {
    render(<Harness />)

    expect(screen.getByText('Thưởng HH quản lý')).toBeTruthy()
    expect(screen.queryByText('Chỉnh sửa')).toBeNull()
    expect(screen.queryByText('Lưu thưởng quản lý')).toBeNull()
    // Nút tạm giữ là icon-only, nhận diện bằng `title`. Cả bảng ⑤ không được còn `<button>` nào.
    expect(within(mgmtTable()).queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByTitle('Tạm giữ')).toBeNull()
    expect(screen.queryByTitle('Bỏ tạm giữ')).toBeNull()
  })

  it('cột "Thao tác" biến mất KỂ CẢ với kế toán + bảng chưa khoá (điều kiện cũ của `canHold`)', () => {
    const { rerender } = render(<Harness />)
    expect(screen.getByText('Thưởng HH quản lý')).toBeTruthy()
    expect(hasActionColumn()).toBe(false)

    // Vế còn lại của điều kiện cũ: bảng đã khoá sau khi duyệt. Khối ⑤ vẫn hiện (vẫn là kế
    // toán) — đối chứng này chặn ca "cột vắng vì cả khối vắng".
    rerender(<Harness recipientsEditable={false} />)
    expect(screen.getByText('Thưởng HH quản lý')).toBeTruthy()
    expect(hasActionColumn()).toBe(false)
  })

  it('góc nhìn TKDA ẩn hẳn khối Thưởng HH quản lý', () => {
    const { rerender } = render(<Harness />)
    expect(screen.getByText('Thưởng HH quản lý')).toBeTruthy()

    rerender(<Harness isKT={false} />)
    expect(screen.queryByText('Thưởng HH quản lý')).toBeNull()
  })
})

describe('Mục ⑤ — cột "Giữ lại HH" ở lại dù không còn thao tác giữ', () => {
  it('vẫn hiện số tiền bị giữ từ nguồn khác (bảng kê tháng 20.14)', () => {
    render(<Harness />)

    // Cột phải còn: nó là phần chênh giữa tổng thưởng và "Thực nhận"; gỡ đi thì chênh lệch
    // thành không giải thích được.
    expect(headerLabels()).toContain('Giữ lại HH')
    expect(cellOf(HELD_MANAGER_NAME, 'Giữ lại HH')).toContain('150.000')
  })

  it('chưa giữ gì thì hiện "—", KHÔNG hiện "0 ₫"', () => {
    render(<Harness />)

    // `0 ₫` là hành vi của vòng 1, khi ô số 0 đi kèm một nút bấm được ngay cạnh. Không còn
    // thao tác nào thì một số 0 đọc như "vừa có ai đó giữ rồi thả" — sai sự thật.
    expect(cellOf(MANAGER_NAME, 'Giữ lại HH')).toBe('—')
  })
})
