import { describe, expect, it } from 'vitest'

import { PREVIEW_KIND, resolvePreviewKind } from './preview-type'

describe('resolvePreviewKind', () => {
  it('maps image extensions', () => {
    for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp']) {
      expect(resolvePreviewKind(`anh.${ext}`)).toBe(PREVIEW_KIND.IMAGE)
    }
  })

  it('maps pdf', () => {
    expect(resolvePreviewKind('tai-lieu.pdf')).toBe(PREVIEW_KIND.PDF)
  })

  it('maps docx but treats legacy .doc as download-only', () => {
    expect(resolvePreviewKind('a.docx')).toBe(PREVIEW_KIND.DOCX)
    expect(resolvePreviewKind('a.doc')).toBe(PREVIEW_KIND.DOWNLOAD)
  })

  it('maps spreadsheet extensions (xls/xlsx/csv)', () => {
    for (const ext of ['xls', 'xlsx', 'csv']) {
      expect(resolvePreviewKind(`bang.${ext}`)).toBe(PREVIEW_KIND.SPREADSHEET)
    }
  })

  it('maps txt to text', () => {
    expect(resolvePreviewKind('note.txt')).toBe(PREVIEW_KIND.TEXT)
  })

  it('falls back to download for unsupported formats', () => {
    for (const ext of ['ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'zip']) {
      expect(resolvePreviewKind(`x.${ext}`)).toBe(PREVIEW_KIND.DOWNLOAD)
    }
  })

  it('is case-insensitive on extension', () => {
    expect(resolvePreviewKind('A.PDF')).toBe(PREVIEW_KIND.PDF)
  })

  it('uses mime hint only when extension cannot resolve', () => {
    expect(resolvePreviewKind('noext', 'image/png')).toBe(PREVIEW_KIND.IMAGE)
    expect(resolvePreviewKind('noext', 'application/pdf')).toBe(PREVIEW_KIND.PDF)
    expect(resolvePreviewKind('noext', 'text/plain')).toBe(PREVIEW_KIND.TEXT)
    expect(resolvePreviewKind('noext', null)).toBe(PREVIEW_KIND.DOWNLOAD)
    expect(resolvePreviewKind('noext', undefined)).toBe(PREVIEW_KIND.DOWNLOAD)
  })

  it('prefers extension over mime hint', () => {
    expect(resolvePreviewKind('a.pdf', 'image/png')).toBe(PREVIEW_KIND.PDF)
  })
})
