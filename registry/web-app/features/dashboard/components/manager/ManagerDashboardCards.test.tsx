import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { APP_PATH } from '@/routes/AppRoute.constant'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: () => true }),
}))

// Mirrors the shape the BE dashboard returns: each eval card carries a coarse `status` + `form_type`
// in `query_params`. The list page filters by the granular `display_status`, so the component must
// translate `status` → `display_status` (and split WAITING_MANAGER into both manager tiers).
vi.mock('@/features/dashboard/services/dashboard-service', () => ({
  useManagerDashboardRealtime: () => ({
    isLoading: false,
    data: {
      intern_evaluations_pending_manager: {
        key: 'intern_evaluations_pending_manager',
        label: 'Đánh giá thực tập sinh chờ quản lý duyệt',
        count: 1,
        path: '/contract-evaluations/manager',
        query_params: { form_type: 'intern', status: 'waiting_manager' },
      },
      recontract_evaluations_pending_manager: {
        key: 'recontract_evaluations_pending_manager',
        label: 'Đánh giá tái ký chờ quản lý duyệt',
        count: 1,
        path: '/contract-evaluations/manager',
        query_params: { form_type: 'recontract', status: 'waiting_manager' },
      },
      intern_evaluations_pending_hr: {
        key: 'intern_evaluations_pending_hr',
        label: 'Đánh giá thực tập sinh chờ HR duyệt',
        count: 8,
        path: '/contract-evaluations/hr',
        query_params: { form_type: 'intern', status: 'waiting_hr' },
      },
      recontract_evaluations_pending_hr: {
        key: 'recontract_evaluations_pending_hr',
        label: 'Đánh giá tái ký chờ HR duyệt',
        count: 1,
        path: '/contract-evaluations/hr',
        query_params: { form_type: 'recontract', status: 'waiting_hr' },
      },
    },
  }),
}))

// Imported after the mocks above are registered.
import ManagerDashboardCards from './ManagerDashboardCards'

// Card render order for the mock above (proposals + KPI omitted, so not rendered). Each card renders
// exactly one "Xem tất cả" button, so the button at a card's index is that card's trigger.
const CARD_ORDER = [
  'Đánh giá thực tập sinh chờ quản lý duyệt',
  'Đánh giá tái ký chờ quản lý duyệt',
  'Đánh giá thực tập sinh chờ HR duyệt',
  'Đánh giá tái ký chờ HR duyệt',
]

const clickViewAll = (cardTitle: string) => {
  const buttons = screen.getAllByRole('button', { name: 'Xem tất cả' })
  fireEvent.click(buttons[CARD_ORDER.indexOf(cardTitle)])
}

const setup = () =>
  render(
    <MemoryRouter>
      <ManagerDashboardCards />
    </MemoryRouter>
  )

describe('ManagerDashboardCards navigation', () => {
  beforeEach(() => navigateMock.mockClear())

  it('deep-links the "chờ quản lý duyệt" cards to the manager list with both manager tiers', () => {
    // Coarse WAITING_MANAGER spans department-leader + block-director, so the deep link must carry
    // both display_status codes to match the card count.
    setup()

    clickViewAll('Đánh giá thực tập sinh chờ quản lý duyệt')
    expect(navigateMock).toHaveBeenCalledWith(
      `${APP_PATH.CONTRACT_EVALUATION_MANAGER}?form_type=intern&display_status=waiting_manager&display_status=waiting_block_director`
    )

    clickViewAll('Đánh giá tái ký chờ quản lý duyệt')
    expect(navigateMock).toHaveBeenCalledWith(
      `${APP_PATH.CONTRACT_EVALUATION_MANAGER}?form_type=recontract&display_status=waiting_manager&display_status=waiting_block_director`
    )
  })

  it('deep-links the "chờ HR duyệt" cards to the HR list with the waiting_hr filter', () => {
    setup()

    clickViewAll('Đánh giá thực tập sinh chờ HR duyệt')
    expect(navigateMock).toHaveBeenCalledWith(
      `${APP_PATH.CONTRACT_EVALUATION_HR}?form_type=intern&display_status=waiting_hr`
    )

    clickViewAll('Đánh giá tái ký chờ HR duyệt')
    expect(navigateMock).toHaveBeenCalledWith(
      `${APP_PATH.CONTRACT_EVALUATION_HR}?form_type=recontract&display_status=waiting_hr`
    )
  })
})
