import { describe, expect, it } from 'vitest'

import { PAGE_SIZE } from '@/constants/table'
import { FeeSupportRequestDocument_status } from '@/features/sales/fee-support-requests/constants/fee-support-request-constants'

import {
  SIMPLE_FILTER_KEYS,
  applyFeeSupportRequestFilterToParams,
  buildFeeSupportRequestApiParams,
  clearFeeSupportRequestFilterFromParams,
  countFeeSupportRequestActiveFilters,
  getFeeSupportRequestFilterFormMountKey,
  getFeeSupportRequestFilterValues,
} from './fee-support-request-filter-params'

const sp = (query: string) => new URLSearchParams(query)

const DOCUMENT_STATUSES = Object.values(FeeSupportRequestDocument_status)

describe('buildFeeSupportRequestApiParams', () => {
  it('defaults page_size to PAGE_SIZE and omits page when the URL is empty', () => {
    expect(buildFeeSupportRequestApiParams(sp(''))).toEqual({ page_size: PAGE_SIZE })
  })

  it('keeps a valid page and a whitelisted page_size', () => {
    const params = buildFeeSupportRequestApiParams(sp('page=3&page_size=50'))
    expect(params.page).toBe(3)
    expect(params.page_size).toBe(50)
  })

  it('falls back to PAGE_SIZE for a non-whitelisted page_size', () => {
    expect(buildFeeSupportRequestApiParams(sp('page_size=999')).page_size).toBe(PAGE_SIZE)
  })

  it('maps search, ordering, status, origin and project', () => {
    const params = buildFeeSupportRequestApiParams(
      sp('search=FSR-2026&ordering=-created_at&status=approved&origin=web_secretary&project=12')
    )
    expect(params.search).toBe('FSR-2026')
    expect(params.ordering).toBe('-created_at')
    expect(params.status).toBe('approved')
    expect(params.origin).toBe('web_secretary')
    expect(params.project).toBe(12)
  })

  // CR 86eyhfz9b — the whole point of the change: the dropdown must reach the API.
  it('forwards document_status to the API params', () => {
    const params = buildFeeSupportRequestApiParams(sp('document_status=needs_supplement'))
    expect(params.document_status).toBe('needs_supplement')
  })

  it.each(DOCUMENT_STATUSES)('forwards the %s document status verbatim', (value) => {
    expect(buildFeeSupportRequestApiParams(sp(`document_status=${value}`)).document_status).toBe(
      value
    )
  })

  it('omits document_status when the filter is cleared', () => {
    expect(buildFeeSupportRequestApiParams(sp('status=approved')).document_status).toBeUndefined()
  })

  it('keeps document_status independent of status — both are sent together', () => {
    const params = buildFeeSupportRequestApiParams(
      sp(`status=draft&document_status=${FeeSupportRequestDocument_status.awaiting_docs}`)
    )
    expect(params.status).toBe('draft')
    expect(params.document_status).toBe(FeeSupportRequestDocument_status.awaiting_docs)
  })

  // The "Hàng đợi kế toán" preset was removed (CR 86eyhfz9b): a stale bookmark
  // must not silently re-apply the composite accountant queue.
  it('ignores a leftover awaiting_documents param', () => {
    const params = buildFeeSupportRequestApiParams(sp('awaiting_documents=true'))
    expect(params).not.toHaveProperty('awaiting_documents')
  })
})

describe('getFeeSupportRequestFilterValues', () => {
  it('pre-fills every filter field from the URL', () => {
    expect(
      getFeeSupportRequestFilterValues(
        sp('status=approved&project=12&origin=mobile_sale&document_status=docs_approved')
      )
    ).toEqual({
      status: 'approved',
      project: '12',
      origin: 'mobile_sale',
      document_status: 'docs_approved',
    })
  })

  it('omits keys absent from the URL', () => {
    expect(getFeeSupportRequestFilterValues(sp('document_status=awaiting_docs'))).toEqual({
      document_status: 'awaiting_docs',
    })
  })
})

describe('countFeeSupportRequestActiveFilters', () => {
  it('counts document_status as an active filter', () => {
    expect(countFeeSupportRequestActiveFilters(sp('document_status=awaiting_docs'))).toBe(1)
  })

  it('counts each filter field once and ignores pagination and search', () => {
    expect(
      countFeeSupportRequestActiveFilters(
        sp('page=2&page_size=25&search=abc&status=approved&document_status=docs_approved')
      )
    ).toBe(2)
  })

  it('returns 0 when no filter is applied', () => {
    expect(countFeeSupportRequestActiveFilters(sp('page=1&page_size=25'))).toBe(0)
  })
})

describe('getFeeSupportRequestFilterFormMountKey', () => {
  it('changes when document_status changes so the form remounts', () => {
    const before = getFeeSupportRequestFilterFormMountKey(sp('status=approved'))
    const after = getFeeSupportRequestFilterFormMountKey(
      sp('status=approved&document_status=docs_approved')
    )
    expect(after).not.toBe(before)
  })

  it('is stable for the same filter values', () => {
    expect(getFeeSupportRequestFilterFormMountKey(sp('document_status=awaiting_docs'))).toBe(
      getFeeSupportRequestFilterFormMountKey(sp('document_status=awaiting_docs'))
    )
  })
})

describe('applyFeeSupportRequestFilterToParams', () => {
  it('resets to page 1 and keeps page_size, search and ordering', () => {
    const params = applyFeeSupportRequestFilterToParams(
      { document_status: 'docs_approved' },
      { pageSize: '50', search: 'FSR', ordering: '-code' }
    )
    expect(params.get('page')).toBe('1')
    expect(params.get('page_size')).toBe('50')
    expect(params.get('search')).toBe('FSR')
    expect(params.get('ordering')).toBe('-code')
    expect(params.get('document_status')).toBe('docs_approved')
  })

  it('omits search and ordering when absent', () => {
    const params = applyFeeSupportRequestFilterToParams({}, { pageSize: '25' })
    expect(params.has('search')).toBe(false)
    expect(params.has('ordering')).toBe(false)
  })

  it('drops cleared fields instead of writing empty values', () => {
    const params = applyFeeSupportRequestFilterToParams(
      { status: 'approved', document_status: undefined, origin: '' },
      { pageSize: '25' }
    )
    expect(params.get('status')).toBe('approved')
    expect(params.has('document_status')).toBe(false)
    expect(params.has('origin')).toBe(false)
  })

  it('round-trips through buildFeeSupportRequestApiParams', () => {
    const applied = applyFeeSupportRequestFilterToParams(
      {
        status: 'approved',
        project: '7',
        origin: 'web_secretary',
        document_status: 'awaiting_docs',
      },
      { pageSize: '25' }
    )
    const params = buildFeeSupportRequestApiParams(applied)
    expect(params).toMatchObject({
      page: 1,
      page_size: 25,
      status: 'approved',
      project: 7,
      origin: 'web_secretary',
      document_status: 'awaiting_docs',
    })
  })
})

describe('clearFeeSupportRequestFilterFromParams', () => {
  it('removes every filter field, including document_status', () => {
    const params = clearFeeSupportRequestFilterFromParams(
      sp('page=4&page_size=50&search=abc&status=approved&document_status=docs_approved&project=3')
    )
    for (const key of SIMPLE_FILTER_KEYS) expect(params.has(key)).toBe(false)
    expect(params.get('page')).toBe('1')
    expect(params.get('page_size')).toBe('50')
    expect(params.get('search')).toBe('abc')
  })
})
