import { describe, expect, it } from 'vitest'

import { buildPublicDocViewerUrl } from './share-link'

describe('buildPublicDocViewerUrl', () => {
  it('builds a /docs/<token>/ URL on the current origin with a trailing slash', () => {
    const token = 'P6UGbeoQk8rnEdwOurcb1GQ6hXvnZKoOptLOdyYy3tc'
    expect(buildPublicDocViewerUrl(token)).toBe(`${window.location.origin}/docs/${token}/`)
  })

  it('URL-encodes characters that are unsafe in a path segment', () => {
    expect(buildPublicDocViewerUrl('a/b c')).toBe(`${window.location.origin}/docs/a%2Fb%20c/`)
  })
})
