import { describe, expect, it, vi } from 'vitest'
import type { Notification } from '@/services/notification-service'

// Mock the `@/routes` barrel: importing it for real pulls the full AppRoute tree
// (lazy pages + BreadcrumbWrapper) which has a circular init in isolated tests.
// We only need APP_PATH constants here.
vi.mock('@/routes', () => ({
  APP_PATH: {
    ELIBRARY_ACCESS_REQUESTS: '/elibrary/access-requests',
    ELIBRARY_ITEM_ACCESS_REQUESTS: '/elibrary/items/:itemId/access-requests',
    PROPOSAL_MANAGE: '/proposal-management',
  },
}))

import { getNotificationRedirectPath } from './notification-navigation-utils'

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: 1,
    actor: { id: 1 } as never,
    recipient: 2,
    verb: '',
    target_type: 'elibrary.libraryitem',
    target_id: '789',
    message: '',
    extra_data: {},
    delivery_method: 'email' as never,
    created_at: '2026-07-18T00:00:00Z',
    updated_at: '2026-07-18T00:00:00Z',
    ...overrides,
  } as Notification
}

describe('getNotificationRedirectPath — access requests', () => {
  it('routes owner "new request" notification to the item-scoped review page', () => {
    const n = makeNotification({
      verb: 'ELIBRARY_ACCESS_REQUEST',
      target_id: '789',
      extra_data: { item_id: 789, request_id: 42 },
    })
    expect(getNotificationRedirectPath(n)).toBe('/elibrary/items/789/access-requests')
  })

  it('falls back to the global tab when target_id is missing', () => {
    const n = makeNotification({
      verb: 'ELIBRARY_ACCESS_REQUEST',
      target_id: '',
      extra_data: {},
    })
    expect(getNotificationRedirectPath(n)).toBe('/elibrary/access-requests')
  })

  it('routes requester "response" notification to the "sent" tab', () => {
    const n = makeNotification({
      verb: 'ELIBRARY_ACCESS_REQUEST_RESPONSE',
      extra_data: { item_id: 789, status: 'approved' },
    })
    expect(getNotificationRedirectPath(n)).toBe('/elibrary/access-requests?role=requester')
  })

  it('returns null for unrelated verbs', () => {
    const n = makeNotification({ verb: 'SOMETHING_ELSE', target_type: 'hrm.proposal' })
    expect(getNotificationRedirectPath(n)).toBeNull()
  })
})
