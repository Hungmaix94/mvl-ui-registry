import { useEffect, useState, forwardRef, useImperativeHandle, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DashboardOrgActivity as OrgActivity,
  DashboardPerformanceGroup as TimeGroup,
  DashboardPerformanceGroupOrg as OrgGroup,
} from '@/constants/api-schema-aliases'
import type { PerformanceByOrgFilterFormValues } from '@/features/dashboard/components/sales/PerformanceByOrgFilterForm.tsx'

/** Giá trị mà form "trả về" khi hook bấm Áp dụng — test đặt trước mỗi lần chạy. */
let formValues: PerformanceByOrgFilterFormValues

vi.mock('@/features/dashboard/components/sales/PerformanceByOrgFilterForm.tsx', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/dashboard/components/sales/PerformanceByOrgFilterForm.tsx')
  >('@/features/dashboard/components/sales/PerformanceByOrgFilterForm.tsx')

  // Chỉ thay phần UI: hook chỉ giao tiếp với form qua `getValues()`/`clearForm()`, nên giữ
  // nguyên phần logic thật (`getDefaultPerformanceFilterValues`, ORG_GROUP_OPTIONS,
  // TIME_GROUP_OPTIONS) để test không xanh giả khi ai đó đổi giá trị mặc định.
  const StubForm = forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({
      clearForm: () => {},
      getValues: () => formValues,
    }))
    return null
  })
  StubForm.displayName = 'StubPerformanceByOrgFilterForm'

  return { ...actual, default: StubForm }
})

type DialogArgs = { content: ReactNode; footer: ReactNode }
const dialogListeners: ((args: DialogArgs) => void)[] = []

vi.mock('@/hooks/useDialog.ts', () => ({
  useDialog: () => ({
    displayFormContent: (args: DialogArgs) => dialogListeners.forEach((l) => l(args)),
    displayClose: vi.fn(),
  }),
}))

// Imported after the mocks above are registered.
import { usePerformanceByOrgFilter } from './usePerformanceByOrgFilter'

function Harness() {
  const [dialog, setDialog] = useState<DialogArgs | null>(null)
  useEffect(() => {
    dialogListeners.push(setDialog)
    return () => {
      dialogListeners.length = 0
    }
  }, [])

  const { openFilterModal, apiParams, subTitle, filterCount } = usePerformanceByOrgFilter()

  return (
    <>
      <button type="button" onClick={openFilterModal}>
        Mở bộ lọc
      </button>
      <span data-testid="params">{JSON.stringify(apiParams)}</span>
      <span data-testid="subtitle">{subTitle}</span>
      <span data-testid="count">{filterCount}</span>
      {dialog?.content}
      {dialog?.footer}
    </>
  )
}

const applyFilter = async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
  await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
}

const params = () => JSON.parse(screen.getByTestId('params').textContent || '{}')

/** Mốc đầu/cuối tháng hiện tại, tính bằng Date thuần — không mượn lại chính hàm đang test. */
const currentMonthRange = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0')
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${lastDay}` }
}

describe('usePerformanceByOrgFilter — mặc định là kỳ hiện tại', () => {
  beforeEach(() => {
    dialogListeners.length = 0
  })

  it('chưa đụng vào bộ lọc thì đã truy vấn đúng tháng hiện tại', () => {
    render(<Harness />)

    expect(params()).toMatchObject(currentMonthRange())
  })

  // User chốt 2026-08-24: "cứ khi nào bộ lọc có giá trị là phải đếm nó vào". Kỳ mặc định
  // vẫn thu hẹp dữ liệu thật nên phải vào badge — trước đây nó bị loại và người dùng nhìn
  // màn đang lọc tháng 8 mà badge trống.
  it('badge ĐẾM cả kỳ mặc định — màn đang lọc tháng hiện tại thì badge phải nói ra', () => {
    render(<Harness />)

    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('chọn kỳ khác kỳ hiện tại thì badge vẫn là 1 — một ô có giá trị, một điểm', async () => {
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '2025-01',
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('xoá kỳ về "tất cả kỳ" thì badge về 0 — không còn ô lọc nào có giá trị', async () => {
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '',
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('0')
    expect(params().from).toBeUndefined()
    expect(params().to).toBeUndefined()
  })

  // Chốt phạm vi 2026-08-24: hai ô "Nhóm theo" chỉ đổi CÁCH GỘP, không bỏ bớt dòng nào, nên
  // không vào badge. Bỏ guard này là badge lặng lẽ không bao giờ nhỏ hơn 2.
  it('đổi "Nhóm theo tổ chức"/"Nhóm theo thời gian" KHÔNG vào badge — chúng gộp chứ không lọc', async () => {
    formValues = {
      groupOrg: OrgGroup.branch,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.year,
      dateRange: null,
      period: '',
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ group: TimeGroup.year, group_org: OrgGroup.branch })
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('"tất cả kỳ" + khoảng ngày đếm 1 — đúng một ô lọc đang có giá trị', async () => {
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: { from: new Date(2026, 5, 10), to: new Date(2026, 6, 20) },
      period: '',
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('"Xoá bộ lọc" đưa về kỳ hiện tại, không phải về tất cả kỳ', async () => {
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '2025-01',
    }
    render(<Harness />)
    await applyFilter()
    expect(params()).toMatchObject({ from: '2025-01-01', to: '2025-01-31' })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))

    expect(params()).toMatchObject(currentMonthRange())
  })
})

describe('usePerformanceByOrgFilter — lọc theo kỳ', () => {
  beforeEach(() => {
    dialogListeners.length = 0
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '',
    }
  })

  it('chọn một kỳ thì gửi from/to đúng hai mốc của kỳ đó lên API', async () => {
    formValues = { ...formValues, period: '2026-06' }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-06-01', to: '2026-06-30' })
  })

  it('kỳ ghi đè khoảng ngày — không gửi hai bộ lọc thời gian mâu thuẫn nhau', async () => {
    formValues = {
      ...formValues,
      period: '2026-06',
      dateRange: { from: new Date(2025, 0, 1), to: new Date(2026, 11, 31) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-06-01', to: '2026-06-30' })
  })

  it('không chọn kỳ thì vẫn dùng khoảng ngày như trước', async () => {
    formValues = {
      ...formValues,
      period: '',
      dateRange: { from: new Date(2026, 5, 10), to: new Date(2026, 6, 20) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-06-10', to: '2026-07-20' })
  })

  it('kỳ theo tuần quy về đúng Thứ 2 - Chủ nhật, không phải 7 ngày tính từ đầu năm', async () => {
    formValues = { ...formValues, timeGroup: TimeGroup.week, period: '2026-W23' }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-06-01', to: '2026-06-07' })
  })

  it('phụ đề in kỳ thay cho khoảng ngày, khớp với truy vấn thật đang chạy', async () => {
    formValues = {
      ...formValues,
      period: '2026-06',
      dateRange: { from: new Date(2025, 0, 1), to: new Date(2026, 11, 31) },
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('subtitle').textContent).toContain('Tháng 06/2026')
    expect(screen.getByTestId('subtitle').textContent).not.toContain('01/01/2025')
  })

  // Kỳ ghi đè khoảng ngày ở `apiParams`, nhưng badge đếm theo Ô ĐANG CÓ GIÁ TRỊ chứ không
  // theo tham số cuối cùng gửi đi — người dùng mở dialog ra đếm bằng mắt thấy 2 ô đã điền.
  it('kỳ và khoảng ngày cùng có giá trị thì badge đếm 2 — hai ô, hai điểm', async () => {
    formValues = {
      ...formValues,
      period: '2026-06',
      dateRange: { from: new Date(2025, 0, 1), to: new Date(2026, 11, 31) },
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('2')
  })

  it('badge cộng thêm khi lọc chi nhánh và khối — mỗi ô một điểm', async () => {
    formValues = { ...formValues, period: '2026-06', branches: [7], blocks: [3, 4] }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('3')
  })

  it('nhãn kỳ rác không làm hỏng truy vấn — bỏ qua kỳ, quay về khoảng ngày', async () => {
    formValues = {
      ...formValues,
      period: 'linh tinh',
      dateRange: { from: new Date(2026, 5, 10), to: new Date(2026, 6, 20) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-06-10', to: '2026-07-20' })
  })
})

describe('usePerformanceByOrgFilter — lọc theo Ngày làm phiếu TTGD (độc lập với Khoảng thời gian)', () => {
  beforeEach(() => {
    dialogListeners.length = 0
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '',
    }
  })

  it('gửi transaction_sheet_date_from/to đúng tên tham số lên API', async () => {
    formValues = {
      ...formValues,
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  // Regression: bộ lọc mới không được đổi hành vi của "Khoảng thời gian"/kỳ đã có sẵn khi
  // người dùng không đụng tới nó.
  it('không đụng field mới thì khoảng ngày cọc vẫn gửi đúng như trước, không có tham số TTGD', async () => {
    formValues = {
      ...formValues,
      dateRange: { from: new Date(2026, 5, 10), to: new Date(2026, 6, 20) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-06-10', to: '2026-07-20' })
    expect(params().transaction_sheet_date_from).toBeUndefined()
    expect(params().transaction_sheet_date_to).toBeUndefined()
  })

  it('điền cả hai khoảng ngày thì cả hai cặp tham số cùng có mặt (AND, không ghi đè nhau)', async () => {
    formValues = {
      ...formValues,
      dateRange: { from: new Date(2026, 5, 10), to: new Date(2026, 6, 20) },
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({
      from: '2026-06-10',
      to: '2026-07-20',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  // Kỳ ghi đè `dateRange`/from-to như trước (chốt cũ), nhưng KHÔNG được ghi đè lên ngày TTGD —
  // đây là hai trục độc lập hoàn toàn khác nhau.
  it('kỳ ghi đè khoảng ngày cọc như cũ, nhưng không đụng tới ngày TTGD', async () => {
    formValues = {
      ...formValues,
      period: '2026-06',
      dateRange: { from: new Date(2025, 0, 1), to: new Date(2026, 11, 31) },
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({
      from: '2026-06-01',
      to: '2026-06-30',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('badge đếm ngày TTGD riêng, độc lập với khoảng ngày cọc', async () => {
    formValues = {
      ...formValues,
      dateRange: { from: new Date(2026, 5, 10), to: new Date(2026, 6, 20) },
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('2')
  })

  it('chỉ điền ngày TTGD thì badge đếm 1', async () => {
    formValues = {
      ...formValues,
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('"Xoá bộ lọc" xoá luôn ngày TTGD', async () => {
    formValues = {
      ...formValues,
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)
    await applyFilter()
    expect(params().transaction_sheet_date_from).toBe('2026-08-01')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))

    expect(params().transaction_sheet_date_from).toBeUndefined()
    expect(params().transaction_sheet_date_to).toBeUndefined()
  })
})

describe('usePerformanceByOrgFilter — lọc theo chi nhánh và khối', () => {
  beforeEach(() => {
    dialogListeners.length = 0
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '',
    }
  })

  it('gửi branch__in / block__in lên API — BE lọc, không phải FE tự cắt', async () => {
    formValues = { ...formValues, branches: [7, 9], blocks: [3] }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ branch__in: [7, 9], block__in: [3] })
  })

  it('không chọn gì thì KHÔNG gửi tham số rỗng — `branch__in=[]` là một truy vấn khác hẳn', async () => {
    formValues = { ...formValues, branches: [], blocks: [] }
    render(<Harness />)

    await applyFilter()

    expect(params().branch__in).toBeUndefined()
    expect(params().block__in).toBeUndefined()
  })

  // Kỳ ghi đè khoảng ngày bằng một nhánh `return` sớm trong `apiParams`. Bộ lọc tổ chức phải
  // được gán TRƯỚC nhánh đó, không thì chọn kỳ là bộ lọc chi nhánh im lặng biến mất.
  it('chọn kỳ vẫn giữ nguyên bộ lọc tổ chức', async () => {
    formValues = { ...formValues, period: '2026-06', branches: [7] }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-06-01', to: '2026-06-30', branch__in: [7] })
  })

  it('phụ đề gọi tên chi nhánh khi còn ít, đếm số khi đã nhiều', async () => {
    formValues = {
      ...formValues,
      branches: [7, 9],
      branchNames: ['CN Hà Nội', 'CN Hải Phòng'],
    }
    render(<Harness />)
    await applyFilter()
    expect(screen.getByTestId('subtitle').textContent).toContain('CN Hà Nội, CN Hải Phòng')

    formValues = {
      ...formValues,
      branches: [7, 9, 11],
      branchNames: ['CN Hà Nội', 'CN Hải Phòng', 'CN Đà Nẵng'],
    }
    await applyFilter()
    expect(screen.getByTestId('subtitle').textContent).toContain('3 chi nhánh')
  })

  it('phụ đề đếm số khi thiếu tên, không in ra chuỗi rỗng', async () => {
    formValues = { ...formValues, branches: [7, 9], branchNames: ['', ''] }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('subtitle').textContent).toContain('2 chi nhánh')
  })

  it('"Xoá bộ lọc" bỏ luôn bộ lọc tổ chức', async () => {
    formValues = { ...formValues, branches: [7], blocks: [3] }
    render(<Harness />)
    await applyFilter()
    expect(params().branch__in).toEqual([7])

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))

    expect(params().branch__in).toBeUndefined()
    expect(params().block__in).toBeUndefined()
  })
})

describe('usePerformanceByOrgFilter — phụ đề đọc theo thứ tự của dialog', () => {
  beforeEach(() => {
    dialogListeners.length = 0
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '2026-06',
      branches: [7],
      branchNames: ['CN Hà Nội'],
      blocks: [3],
      blockNames: ['Khối Kinh doanh'],
    }
  })

  // Thứ tự chính là nội dung ở đây: thứ ĐANG thu hẹp dữ liệu phải nằm trước cách bày, đúng
  // thứ tự các ô trong dialog. Để "Phòng ban · Theo tháng" lên đầu là đẩy kỳ và chi nhánh
  // xuống cuối — chỗ mắt tới sau cùng, trong khi đó mới là thứ người ta liếc để tìm.
  it('lọc trước, gộp sau', async () => {
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('subtitle').textContent).toBe(
      'Tháng 06/2026 · CN Hà Nội · Khối Kinh doanh · Phòng ban · Theo tháng'
    )
  })

  it('không lọc tổ chức thì phụ đề không có chỗ trống hay dấu chấm thừa', async () => {
    formValues = { ...formValues, branches: [], branchNames: [], blocks: [], blockNames: [] }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('subtitle').textContent).toBe(
      'Tháng 06/2026 · Phòng ban · Theo tháng'
    )
  })
})

// Ô "Đơn vị" khác mọi ô lọc khác trên dialog: nó không thu hẹp một tập có sẵn mà ĐỔI HẲN
// tập đơn vị server dựng ra. Đơn vị không phát sinh giao dịch vốn VẮNG MẶT khỏi response
// mặc định (báo cáo dựng từ bảng phân bổ doanh thu), nên web không thể tự suy ra.
describe('usePerformanceByOrgFilter — đơn vị có / không phát sinh giao dịch', () => {
  beforeEach(() => {
    dialogListeners.length = 0
  })

  it('mặc định gửi org_activity=with_deals — giữ nguyên biểu đồ vốn có', () => {
    render(<Harness />)

    expect(params().org_activity).toBe(OrgActivity.with_deals)
  })

  it('chọn "không phát sinh giao dịch" thì gửi org_activity=without_deals', async () => {
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.without_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '2026-08',
    }
    render(<Harness />)

    await applyFilter()

    expect(params().org_activity).toBe(OrgActivity.without_deals)
  })

  it('chọn "tất cả đơn vị" thì gửi org_activity=all', async () => {
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.all,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '2026-08',
    }
    render(<Harness />)

    await applyFilter()

    expect(params().org_activity).toBe(OrgActivity.all)
  })

  it('badge đếm thêm 1 khi khác mặc định, và KHÔNG đếm khi để mặc định', async () => {
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '2026-08',
    }
    render(<Harness />)
    await applyFilter()
    expect(screen.getByTestId('count').textContent).toBe('1') // chỉ kỳ

    formValues = { ...formValues, orgActivity: OrgActivity.without_deals }
    await applyFilter()
    expect(screen.getByTestId('count').textContent).toBe('2') // kỳ + đơn vị
  })

  it('phụ đề nói ra lựa chọn khác mặc định, và im lặng với mặc định', async () => {
    formValues = {
      groupOrg: OrgGroup.department,
      orgActivity: OrgActivity.with_deals,
      timeGroup: TimeGroup.month,
      dateRange: null,
      period: '2026-08',
    }
    render(<Harness />)
    await applyFilter()
    expect(screen.getByTestId('subtitle').textContent).not.toContain('Đơn vị không phát sinh')

    formValues = { ...formValues, orgActivity: OrgActivity.without_deals }
    await applyFilter()
    expect(screen.getByTestId('subtitle').textContent).toContain('Đơn vị không phát sinh giao dịch')
  })
})
