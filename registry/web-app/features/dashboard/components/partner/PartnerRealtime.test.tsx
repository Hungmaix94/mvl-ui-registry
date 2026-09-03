import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

import { usePartnerDashboardRealtime } from '@/features/dashboard/services/dashboard-service'
import { buildApiParamsFromUrl as buildInvestorParams } from '@/pages/authenticated/investor/InvestorManagementPage'
import { buildApiParamsFromUrl as buildExchangeParams } from '@/pages/authenticated/exchange/ExchangeManagementPage'
import { PartnerRealtimeContent } from './PartnerRealtime'

// Importing the component transitively pulls @/lib/firebase, which calls getAnalytics()/
// getMessaging() at module load and throws without env config in the test runner.
vi.mock('@/lib/firebase', () => ({
  analytics: {},
  app: {},
  messaging: {},
  getFCMToken: vi.fn(),
}))

vi.mock('@/features/dashboard/services/dashboard-service', () => ({
  usePartnerDashboardRealtime: vi.fn(),
}))

const mockedUseRealtime = vi.mocked(usePartnerDashboardRealtime)

/**
 * Mirrors the `/api/realestate/dashboard/partner/realtime/` payload (CR STT27, 86eykqg66).
 * `path` + `query_params` come from the BE verbatim — the FE must not rewrite them.
 */
function makeResponse() {
  const queryParams = { established_month: 8, is_active: 'true', ordering: 'established_day' }
  return {
    investor_established_this_month: {
      key: 'investor_established_this_month',
      label: 'Sinh nhật CĐT trong tháng',
      count: 4,
      path: '/project-admin/project/investor',
      query_params: queryParams,
    },
    exchange_established_this_month: {
      key: 'exchange_established_this_month',
      label: 'Sinh nhật sàn liên kết trong tháng',
      count: 3,
      path: '/project-admin/project/exchange',
      query_params: queryParams,
    },
    source_exchange_established_this_month: {
      key: 'source_exchange_established_this_month',
      label: 'Sinh nhật nguồn sàn trong tháng',
      count: 2,
      path: '/project-admin/project/source-exchange',
      query_params: queryParams,
    },
  }
}

function renderContent(navigate: ReturnType<typeof vi.fn>) {
  render(createElement(PartnerRealtimeContent, { navigate, searchParams: new URLSearchParams() }))
}

describe('PartnerRealtimeContent — tile click-through (CR STT27)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error — a partial query-result mock is enough for this test
    mockedUseRealtime.mockReturnValue({ data: makeResponse(), isLoading: false })
  })

  it('renders one tile per partner screen', () => {
    renderContent(vi.fn())

    expect(screen.getByText('Sinh nhật CĐT trong tháng')).toBeInTheDocument()
    expect(screen.getByText('Sinh nhật sàn liên kết trong tháng')).toBeInTheDocument()
    expect(screen.getByText('Sinh nhật nguồn sàn trong tháng')).toBeInTheDocument()
  })

  // The literal destinations, spelled out. A tile pointing at the wrong screen is the defect that
  // makes the badge disagree with what the user sees after clicking, and it is invisible to any
  // assertion that compares the response against itself.
  it.each([
    ['Sinh nhật CĐT trong tháng', '/project-admin/project/investor'],
    ['Sinh nhật sàn liên kết trong tháng', '/project-admin/project/exchange'],
    ['Sinh nhật nguồn sàn trong tháng', '/project-admin/project/source-exchange'],
  ])('tile %s navigates to %s', (label, expectedPath) => {
    const navigate = vi.fn()
    renderContent(navigate)

    fireEvent.click(screen.getByText(label))

    expect(navigate).toHaveBeenCalledTimes(1)
    const url: string = navigate.mock.calls[0][0]
    expect(url.split('?')[0]).toBe(expectedPath)
  })

  it('forwards the BE query params verbatim instead of rebuilding them on the FE', () => {
    const navigate = vi.fn()
    renderContent(navigate)

    fireEvent.click(screen.getByText('Sinh nhật CĐT trong tháng'))

    const url: string = navigate.mock.calls[0][0]
    expect(url).toContain('established_month=8')
    expect(url).toContain('is_active=true')
    expect(url).toContain('ordering=established_day')
  })

  it('renders nothing while loading, so no empty section flashes on the dashboard', () => {
    // @ts-expect-error — partial mock
    mockedUseRealtime.mockReturnValue({ data: undefined, isLoading: true })

    const { container } = render(
      createElement(PartnerRealtimeContent, {
        navigate: vi.fn(),
        searchParams: new URLSearchParams(),
      })
    )

    expect(container).toBeEmptyDOMElement()
  })
})

/**
 * The contract that actually makes the badge honest: the URL param the tile emits has to be a param
 * the destination list page reads, AND it has to translate to the API filter name.
 *
 * These two halves live in different files and nothing else compares them — a rename on either side
 * leaves the tile navigating to an unfiltered list, which looks like a wrong count rather than a
 * wiring bug.
 */
describe('tile query params survive the trip into the list pages (CR STT27)', () => {
  const TILE_PARAMS = { established_month: '8', is_active: 'true' }

  it.each([
    ['investor', buildInvestorParams],
    ['exchange', buildExchangeParams],
  ])('%s list page translates established_month -> established_date__month', (_name, build) => {
    const params = build(new URLSearchParams(TILE_PARAMS))

    expect(params.established_date__month).toBe(8)
    expect(params.is_active).toBe(true)
  })

  it.each([
    ['investor', buildInvestorParams],
    ['exchange', buildExchangeParams],
  ])('%s list page ignores an out-of-range month rather than sending it', (_name, build) => {
    expect(
      build(new URLSearchParams({ established_month: '13' })).established_date__month
    ).toBeUndefined()
    expect(
      build(new URLSearchParams({ established_month: '0' })).established_date__month
    ).toBeUndefined()
  })

  it.each([
    ['investor', buildInvestorParams],
    ['exchange', buildExchangeParams],
  ])('%s list page leaves the filters unset when the tile params are absent', (_name, build) => {
    const params = build(new URLSearchParams())

    expect(params.established_date__month).toBeUndefined()
    expect(params.is_active).toBeUndefined()
  })
})
