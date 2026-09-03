import { describe, expect, it } from 'vitest'

import { resolveLibraryItemOpenError, resolveLibraryItemOpenSuccess } from './library-item-open'

describe('resolveLibraryItemOpenSuccess', () => {
  it('opens with view_url when present', () => {
    expect(resolveLibraryItemOpenSuccess({ view_url: 'https://s3/view' })).toEqual({
      type: 'open',
      url: 'https://s3/view',
    })
  })

  it('falls back to download_url when view_url is missing', () => {
    expect(
      resolveLibraryItemOpenSuccess({ view_url: null, download_url: 'https://s3/dl' })
    ).toEqual({ type: 'open', url: 'https://s3/dl' })
  })

  it('is unopenable for a folder / item without any presigned URL', () => {
    expect(resolveLibraryItemOpenSuccess({ view_url: null, download_url: null })).toEqual({
      type: 'unopenable',
    })
    expect(resolveLibraryItemOpenSuccess({})).toEqual({ type: 'unopenable' })
    expect(resolveLibraryItemOpenSuccess(null)).toEqual({ type: 'unopenable' })
  })
})

describe('resolveLibraryItemOpenError', () => {
  it('maps 403 to the request-access dialog', () => {
    expect(resolveLibraryItemOpenError({ status: 403 })).toEqual({ type: 'request-access' })
  })

  it('maps 404 to the deleted toast', () => {
    expect(resolveLibraryItemOpenError({ status: 404 })).toEqual({ type: 'deleted' })
  })

  it('maps any other status (or none) to a generic error', () => {
    expect(resolveLibraryItemOpenError({ status: 500 })).toEqual({ type: 'error' })
    expect(resolveLibraryItemOpenError({})).toEqual({ type: 'error' })
    expect(resolveLibraryItemOpenError(null)).toEqual({ type: 'error' })
  })
})
