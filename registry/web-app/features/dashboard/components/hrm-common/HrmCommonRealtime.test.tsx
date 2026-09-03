import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

import { useHrmCommonDashboardRealtime } from '@/features/dashboard/services/dashboard-service'
import { HrmCommonRealtimeContent } from './HrmCommonRealtime'

// Importing the component transitively pulls @/lib/firebase, which calls
// getAnalytics()/getMessaging() at module load and throws without env config
// in the test runner. Stub it — this component does not use Firebase directly.
vi.mock('@/lib/firebase', () => ({
  analytics: {},
  app: {},
  messaging: {},
  getFCMToken: vi.fn(),
}))

vi.mock('@/features/dashboard/services/dashboard-service', () => ({
  useHrmCommonDashboardRealtime: vi.fn(),
}))

const mockedUseRealtime = vi.mocked(useHrmCommonDashboardRealtime)

// Mirrors the backend /hrm/dashboard/hrm/common/realtime payload for the two
// birthday widgets after CR257 (BE sends ordering=birthday_day).
function makeResponse() {
  return {
    birthday_this_month: {
      key: 'birthday_this_month',
      label: 'Sinh nhật trong tháng',
      count: 100,
      path: '/employee/management',
      query_params: {
        birthday_month: 7,
        statuses: 'Active',
        is_os_code_type: 'false',
        include_report_excluded_positions: 'false',
        ordering: 'birthday_day',
      },
    },
    leadership_birthday_this_month: {
      key: 'leadership_birthday_this_month',
      label: 'Sinh nhật Ban lãnh đạo trong tháng',
      count: 7,
      path: '/employee/management',
      query_params: {
        birthday_month: 7,
        statuses: 'Active',
        position__is_leadership: 'true',
        is_os_code_type: 'false',
        include_report_excluded_positions: 'false',
        ordering: 'birthday_day',
      },
    },
  }
}

describe('HrmCommonRealtimeContent — birthday widget click-through (CR257)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error — a partial query-result mock is enough for this test
    mockedUseRealtime.mockReturnValue({ data: makeResponse(), isLoading: false })
  })

  it('forwards the backend ordering (birthday_day) unchanged — no FE override to date_of_birth', () => {
    const navigate = vi.fn()
    render(
      createElement(HrmCommonRealtimeContent, {
        navigate,
        searchParams: new URLSearchParams(),
      })
    )

    fireEvent.click(screen.getByText('Sinh nhật trong tháng'))

    expect(navigate).toHaveBeenCalledTimes(1)
    const url = navigate.mock.calls[0][0]
    expect(url).toContain('ordering=birthday_day')
    expect(url).not.toContain('date_of_birth')
    expect(url).toContain('birthday_month=7')
  })

  it('forwards ordering=birthday_day for the leadership birthday widget too', () => {
    const navigate = vi.fn()
    render(
      createElement(HrmCommonRealtimeContent, {
        navigate,
        searchParams: new URLSearchParams(),
      })
    )

    fireEvent.click(screen.getByText('Sinh nhật Ban lãnh đạo trong tháng'))

    const url = navigate.mock.calls[0][0]
    expect(url).toContain('ordering=birthday_day')
    expect(url).not.toContain('date_of_birth')
    expect(url).toContain('position__is_leadership=true')
  })
})
