// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { ProjectDirectorCommissionPeriodBalance_state } from '@/api/schema'
import type { ProjectDirectorCommissionPeriod } from '@/features/accounting/director-commissions/services/director-commission-service'
import { DirectorCommissionStatus } from '@/features/accounting/director-commissions/constants/director-commission-constants'

/**
 * Bảng Hoa hồng Giám đốc dự án — canh cột "Giám đốc dự án" (ClickUp 86eyr1rju).
 *
 * Cột này phải nằm ĐÚNG giữa "Dự án" và "Tiền về trong kỳ": file Excel export do BE sinh
 * đã xếp đúng thứ tự đó (A=Tháng B=Mã dự án C=Dự án D=Giám đốc dự án E=Tiền về trong kỳ),
 * nên màn hình lệch khỏi thứ tự này là lệch với chính file người dùng tải về.
 *
 * Hai test đếm ô (`giữ nguyên số cột` / `dòng TỔNG KỲ`) canh một lỗi rất êm: thêm cột mà
 * quên sửa `colSpan` thì bảng vẫn render, chỉ lệch cột — không có lỗi nào để nhìn thấy.
 */

// `vi.mock` được hoist lên trước mọi import, nên spy phải dựng bằng `vi.hoisted` mới dùng
// được bên trong factory.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }))

// Mock TỪNG PHẦN: barrel `@/components/ui` kéo theo PageTitle -> AppRoute, nên mock
// trọn gói react-router-dom sẽ làm mất `Outlet` và cả file test không collect được.
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateSpy,
}))

// Cũng phải ổn định tham chiếu: `rowActions` là useMemo phụ thuộc `[ability, ...]`, nên
// trả object MỚI mỗi lần gọi là vô hiệu hoá memo ở mọi render. Đổi hành vi qua `abilityCan`
// (biến), giữ nguyên `ABILITY` (tham chiếu) — `EmployeeProfileLink`/`ProjectDetailLink` cũng
// đọc chính hook này nên mock ở đây phủ luôn cả hai.
let abilityCan: (action: string, subject: string) => boolean = () => true
const ABILITY = { can: (action: string, subject: string) => abilityCan(action, subject) }
vi.mock('@/lib/ability', () => ({ useAbility: () => ABILITY }))

beforeEach(() => {
  abilityCan = () => true
  navigateSpy.mockClear()
})

// Hằng số ở module scope: trả về object MỚI mỗi lần gọi sẽ làm mọi useMemo phía dưới
// tính lại mỗi render và che mất đúng loại lỗi memo-hoá mà test khác có thể cần bắt.
const STATUS_LABELS: Record<string, string> = {
  [DirectorCommissionStatus.DRAFT]: 'Bản nháp',
  [DirectorCommissionStatus.CONFIRMED]: 'Xác nhận',
  [DirectorCommissionStatus.VOIDED]: 'Đã hủy',
}
const BALANCE_LABELS: Record<string, string> = {
  owed: 'Còn nợ',
  overpaid: 'Chi lố',
  settled: 'Đã tất toán',
}
vi.mock('@/features/accounting/director-commissions/hooks/useDirectorCommissionConstants', () => ({
  useDirectorCommissionConstants: () => ({
    statusLabels: STATUS_LABELS,
    balanceLabels: BALANCE_LABELS,
    statusOptions: [],
  }),
}))

import DirectorCommissionTable from './DirectorCommissionTable'

/**
 * Fixture khai kiểu bằng CHÍNH schema + dựng bằng object literal, nên `tsc` bắt cả field
 * thiếu lẫn field thừa khi BE đổi shape — mạnh hơn hẳn một phép gán suông.
 */
function periodRow(
  over: Partial<ProjectDirectorCommissionPeriod> & { id: number }
): ProjectDirectorCommissionPeriod {
  const base: ProjectDirectorCommissionPeriod = {
    id: over.id,
    code: `HHGD-${over.id}`,
    project: 1,
    project_code: 'DA000000311',
    project_name: 'Dự án Sun Riverside Villas',
    accounting_period: 10,
    period_year: 2026,
    period_month: 7,
    director: 13762,
    director_name: 'Trần Vỹ Minh',
    director_code: 'MV000013762',
    pct_entitled: '1.20',
    pct_payout: '1.20',
    payout_override_amount: null,
    receipt_in_period: '136000000',
    receipt_cum: '136000000',
    entitled_cum: '1632000',
    paid_before: '0',
    payout_amount: '1632000',
    balance_after: '0',
    balance_state: ProjectDirectorCommissionPeriodBalance_state.settled,
    status: DirectorCommissionStatus.DRAFT,
    confirmed_at: null,
    confirmed_by: null,
    voided_at: null,
    voided_by: null,
    void_reason: '',
    note: '',
    adjustments: [],
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  }
  return { ...base, ...over }
}

// Dữ liệu thật kỳ 07/2026 (đo từ API) — giữ nguyên để test nói cùng ngôn ngữ với màn hình.
const ROWS: ProjectDirectorCommissionPeriod[] = [
  periodRow({ id: 1, project_name: 'Dự án Sun Riverside Villas', director_name: 'Trần Vỹ Minh' }),
  periodRow({
    id: 2,
    project_name: 'Dự án Vinaconex7(N test)_Sửa tên',
    director_name: 'Nguyễn Quang Nhất',
    status: DirectorCommissionStatus.CONFIRMED,
  }),
  periodRow({
    id: 3,
    project_name: 'Dự án Làng Vân(N test)',
    director_name: 'Nguyễn Quang Nhất',
  }),
  periodRow({ id: 4, project_name: 'Alacarte Hạ Long', director_name: 'Trần Anh Tân' }),
]

/** Helper KHÔNG mở đầu bằng `render` — luật `testing-library/render-result-naming-convention`. */
function tableOnScreen() {
  return screen.getByRole('table')
}

function columnLabels(): string[] {
  return within(tableOnScreen())
    .getAllByRole('columnheader')
    .map((th) => th.textContent?.trim() ?? '')
}

/** Ném lỗi khi không thấy cột: `indexOf` trần trả -1 và mọi phép so sau đó vẫn "đúng". */
function columnIndex(label: string): number {
  const i = columnLabels().indexOf(label)
  if (i < 0)
    throw new Error(`không có cột "${label}" trên bảng — có: ${columnLabels().join(' | ')}`)
  return i
}

/** Các dòng dữ liệu (bỏ dòng tiêu đề: nó chỉ có `columnheader`, không có `cell`). */
function bodyRows() {
  return within(tableOnScreen())
    .getAllByRole('row')
    .filter((tr) => within(tr).queryAllByRole('cell').length > 0)
}

describe('DirectorCommissionTable — cột Giám đốc dự án (86eyr1rju)', () => {
  it('đặt cột "Giám đốc dự án" ngay sau "Dự án" và ngay trước "Tiền về trong kỳ"', () => {
    render(<DirectorCommissionTable data={ROWS} isLoading={false} periodLabel="07/2026" />)

    expect(columnIndex('Giám đốc dự án')).toBe(columnIndex('Dự án') + 1)
    expect(columnIndex('Tiền về trong kỳ')).toBe(columnIndex('Giám đốc dự án') + 1)
  })

  it('in đúng tên Giám đốc dự án của từng dòng', () => {
    render(<DirectorCommissionTable data={ROWS} isLoading={false} periodLabel="07/2026" />)

    const col = columnIndex('Giám đốc dự án')
    // Đọc riêng phần TÊN (link), không đọc cả ô: ô còn có pill mã nhân viên đứng dưới.
    const names = bodyRows()
      .slice(0, ROWS.length)
      .map((tr) =>
        within(within(tr).getAllByRole('cell')[col]).getByRole('link').textContent?.trim()
      )

    expect(names).toEqual([
      'Trần Vỹ Minh',
      'Nguyễn Quang Nhất',
      'Nguyễn Quang Nhất',
      'Trần Anh Tân',
    ])
  })

  it('hiện "—" khi bản ghi chưa có tên Giám đốc dự án', () => {
    render(
      <DirectorCommissionTable
        data={[periodRow({ id: 9, director_name: '' })]}
        isLoading={false}
        periodLabel="07/2026"
      />
    )

    const col = columnIndex('Giám đốc dự án')
    expect(within(bodyRows()[0]).getAllByRole('cell')[col]).toHaveTextContent('—')
  })

  it('giữ nguyên số cột: mỗi dòng dữ liệu có đúng số ô bằng số tiêu đề', () => {
    render(<DirectorCommissionTable data={ROWS} isLoading={false} periodLabel="07/2026" />)

    const headerCount = columnLabels().length
    expect(headerCount).toBe(10)

    for (const tr of bodyRows().slice(0, ROWS.length)) {
      expect(within(tr).getAllByRole('cell')).toHaveLength(headerCount)
    }
  })

  it('Dự án và Giám đốc dự án là link mở TAB MỚI, không cướp tab hiện tại', () => {
    render(<DirectorCommissionTable data={[ROWS[0]]} isLoading={false} periodLabel="07/2026" />)

    const duAn = within(bodyRows()[0]).getByRole('link', { name: 'Dự án Sun Riverside Villas' })
    const gd = within(bodyRows()[0]).getByRole('link', { name: 'Trần Vỹ Minh' })

    // href THẬT (không phải div bắt click) => chuột giữa / Ctrl+click / "mở tab mới" chạy được
    expect(duAn).toHaveAttribute('href', '/project-admin/project/management/1')
    expect(gd).toHaveAttribute('href', '/employee/management/13762')
    for (const a of [duAn, gd]) {
      expect(a).toHaveAttribute('target', '_blank')
      // thiếu `noopener` là trang đích cầm được `window.opener` của mình
      expect(a).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('bấm vào link KHÔNG kéo tab hiện tại sang trang chi tiết', () => {
    render(<DirectorCommissionTable data={[ROWS[0]]} isLoading={false} periodLabel="07/2026" />)

    // ĐỐI CHỨNG trước: bấm vào vùng trống của dòng thì PHẢI điều hướng. Thiếu vế này thì phép
    // "không được gọi" ở dưới vẫn xanh kể cả khi onClick của dòng đã hỏng hoàn toàn.
    fireEvent.click(within(bodyRows()[0]).getAllByRole('cell')[0])
    expect(navigateSpy).toHaveBeenCalledTimes(1)

    // Rồi mới tới vế thật: link có stopPropagation nên không kích hoạt onClick của dòng.
    navigateSpy.mockClear()
    fireEvent.click(within(bodyRows()[0]).getByRole('link', { name: 'Trần Vỹ Minh' }))
    fireEvent.click(within(bodyRows()[0]).getByRole('link', { name: 'Dự án Sun Riverside Villas' }))
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('KHÔNG có quyền xem thì hiện chữ thường, không dựng link dẫn vào trang 403', () => {
    // ĐỐI CHỨNG nằm TRONG CÙNG test: phép "không còn link nào" tự nó xanh cả khi component
    // bỏ hẳn link, hoặc khi selector sai. Chốt vế CÓ trước rồi mới chốt vế KHÔNG.
    const { unmount } = render(
      <DirectorCommissionTable data={[ROWS[0]]} isLoading={false} periodLabel="07/2026" />
    )
    expect(within(bodyRows()[0]).getAllByRole('link')).toHaveLength(2)
    unmount()

    abilityCan = (action, subject) =>
      !(action === 'retrieve' && (subject === 'project' || subject === 'employee'))
    render(<DirectorCommissionTable data={[ROWS[0]]} isLoading={false} periodLabel="07/2026" />)

    expect(within(bodyRows()[0]).queryAllByRole('link')).toHaveLength(0)
    // vẫn phải ĐỌC được thông tin, chỉ là không bấm được
    expect(bodyRows()[0]).toHaveTextContent('Dự án Sun Riverside Villas')
    expect(bodyRows()[0]).toHaveTextContent('Trần Vỹ Minh')
  })

  it('cột Giám đốc dự án in kèm mã nhân viên', () => {
    render(
      <DirectorCommissionTable
        data={[periodRow({ id: 7, director_name: 'Trần Vỹ Minh', director_code: 'NV000456' })]}
        isLoading={false}
        periodLabel="07/2026"
      />
    )

    const o = within(bodyRows()[0]).getAllByRole('cell')[columnIndex('Giám đốc dự án')]
    expect(o).toHaveTextContent('Trần Vỹ Minh')
    expect(o).toHaveTextContent('NV000456')
  })

  it('BE chưa trả mã nhân viên thì chỉ ẩn mã, tên vẫn hiện bình thường', () => {
    // Ca này sống thật: FE có thể lên dev trước khi PR backend deploy xong.
    render(
      <DirectorCommissionTable
        data={[periodRow({ id: 8, director_name: 'Trần Vỹ Minh', director_code: '' })]}
        isLoading={false}
        periodLabel="07/2026"
      />
    )

    const o = within(bodyRows()[0]).getAllByRole('cell')[columnIndex('Giám đốc dự án')]
    expect(o).toHaveTextContent('Trần Vỹ Minh')
    expect(o.textContent).not.toContain('NV')
  })

  it('dòng TỔNG KỲ vẫn phủ đủ số cột sau khi thêm cột mới', () => {
    render(<DirectorCommissionTable data={ROWS} isLoading={false} periodLabel="07/2026" />)

    const headerCount = columnLabels().length
    const footer = bodyRows().find((tr) => within(tr).queryByText(/TỔNG KỲ/)) as HTMLElement
    expect(footer).toBeTruthy()

    const covered = within(footer)
      .getAllByRole('cell')
      .reduce((sum, td) => sum + Number(td.getAttribute('colspan') ?? 1), 0)
    expect(covered).toBe(headerCount)
  })
})
