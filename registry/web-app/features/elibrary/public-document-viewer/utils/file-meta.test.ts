import { describe, expect, it } from 'vitest'

import { formatFileSize, getFileExtension } from './file-meta'

describe('getFileExtension', () => {
  it('returns the lowercased extension', () => {
    expect(getFileExtension('Report.PDF')).toBe('pdf')
    expect(getFileExtension('a.b.docx')).toBe('docx')
  })

  it('returns empty string when there is no usable extension', () => {
    expect(getFileExtension('noext')).toBe('')
    expect(getFileExtension('trailing.')).toBe('')
    expect(getFileExtension('')).toBe('')
    expect(getFileExtension(null)).toBe('')
    expect(getFileExtension(undefined)).toBe('')
  })
})

describe('formatFileSize', () => {
  it('formats sizes across units', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(153185)).toBe('149.6 KB')
    expect(formatFileSize(1048576)).toBe('1.0 MB')
  })

  it('returns a dash for nullish or invalid sizes', () => {
    expect(formatFileSize(null)).toBe('—')
    expect(formatFileSize(undefined)).toBe('—')
    expect(formatFileSize(-1)).toBe('—')
    expect(formatFileSize(Number.NaN)).toBe('—')
  })
})
