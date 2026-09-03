import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { createRef } from 'react'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

// `Select` chaining `.then()` lên `loadInitialOptions` để nạp nhãn cho giá trị đã chọn sẵn,
// nên stub phải trả Promise — trả `undefined` là component chết ngay trong render.
const loadEmployeeOptions = vi.fn().mockResolvedValue({ items: [], hasNextPage: false })
const loadInitialEmployeeOptions = vi.fn().mockResolvedValue([])
const loadPositionOptions = vi.fn().mockResolvedValue({ items: [], hasNextPage: false })
const loadInitialPositionOptions = vi.fn().mockResolvedValue([])
vi.mock('@/hooks/useEmployeeSelect', () => ({
  useEmployeeSelect: () => ({
    loadEmployeeOptions,
    loadInitialEmployeeOptions,
  }),
}))
vi.mock('@/hooks/usePositionSelect', () => ({
  usePositionSelect: () => ({
    loadPositionOptions,
    loadInitialPositionOptions,
  }),
}))

/**
 * Ghi lại đúng key mà form hỏi app-constant. Bộ lọc phải đọc enum *snapshot* của bảng KPI,
 * không phải `hrm.EmployeeType`: hai enum lệch nhau giá trị `UNPAID_PROBATION_OFFICIAL`, và
 * chọn phải giá trị thừa đó thì API trả rỗng — trông y hệt "phòng này không có ai loại đó".
 */
const appConstantKeysRequested: string[][] = []
vi.mock('@/hooks/useAppConstant', () => ({
  default: ({ keys }: { keys: string[] }) => {
    appConstantKeysRequested.push(keys)
    return {
      keysMapOptions: new Map([
        [
          'EmployeeMonthlyKpi_EMPLOYEE_TYPE_SNAPSHOT_CHOICES',
          [
            { value: 'OFFICIAL', label: 'Chính thức' },
            { value: 'PROBATION', label: 'Thử việc' },
          ],
        ],
      ]),
    }
  },
}))

import {
  EmployeeMonthlyKpiFilter,
  EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS,
  type EmployeeMonthlyKpiFilterRef,
} from './EmployeeMonthlyKpiFilter'

/**
 * Mounts the form and hands back its imperative ref — the ref IS the subject here, since the
 * parent dialog drives this component through `getValues` / `clearForm` rather than through DOM.
 */
function mountFilter(initialValues?: Record<string, unknown>) {
  const ref = createRef<EmployeeMonthlyKpiFilterRef>()
  render(
    <EmployeeMonthlyKpiFilter
      ref={ref}
      isOpen
      department={55}
      initialValues={initialValues as never}
    />
  )
  return ref
}

beforeEach(() => {
  vi.clearAllMocks()
  appConstantKeysRequested.length = 0
})

describe('EmployeeMonthlyKpiFilter — các trường (CR 86eyj31ch R4)', () => {
  it('hiện đủ ba bộ lọc: nhân viên, chức vụ, loại nhân viên', () => {
    mountFilter()

    expect(screen.getByText('Nhân viên')).toBeInTheDocument()
    expect(screen.getByText('Chức vụ')).toBeInTheDocument()
    expect(screen.getByText('Loại nhân viên')).toBeInTheDocument()
  })

  it('đọc enum snapshot của bảng KPI, không đọc enum nhân sự chung', () => {
    mountFilter()

    expect(appConstantKeysRequested.flat()).toContain(
      'EmployeeMonthlyKpi_EMPLOYEE_TYPE_SNAPSHOT_CHOICES'
    )
    expect(appConstantKeysRequested.flat()).not.toContain('EmployeeType')
  })
})

describe('EmployeeMonthlyKpiFilter — ref API', () => {
  it('getValues trả về giá trị khởi tạo của cả ba trường', () => {
    const ref = mountFilter({
      employee: '109',
      position: '7',
      employee_type_snapshot: 'PROBATION',
    })

    expect(ref.current?.getValues()).toMatchObject({
      employee: '109',
      position: '7',
      employee_type_snapshot: 'PROBATION',
    })
  })

  it('clearForm xoá TẤT CẢ các trường, không sót trường mới thêm', () => {
    const ref = mountFilter({
      employee: '109',
      position: '7',
      employee_type_snapshot: 'PROBATION',
    })

    ref.current?.clearForm()

    const cleared = ref.current?.getValues() ?? {}
    EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS.forEach((field) => {
      expect(cleared[field]).toBeFalsy()
    })
  })
})

describe('EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS', () => {
  it('liệt kê đúng các trường form sở hữu — nguồn duy nhất cho badge và clear', () => {
    expect([...EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS]).toEqual([
      'employee',
      'position',
      'employee_type_snapshot',
    ])
  })
})
