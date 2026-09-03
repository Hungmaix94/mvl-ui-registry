import { describe, it, expect } from 'vitest'

import {
  buildCollaboratorLabel,
  buildCollaboratorOption,
  buildCollaboratorOptionLabel,
  looksLikeIdNumber,
  toCollaboratorId,
} from '@/features/accounting/collaborators/_shares/utils/collaborator-option.ts'

describe('buildCollaboratorLabel', () => {
  it('formats "code - name" when both are present (trimmed)', () => {
    expect(
      buildCollaboratorLabel({ id: 7, code: ' CTV000000001 ', name: ' Nguyễn Văn Hoàng ' })
    ).toBe('CTV000000001 - Nguyễn Văn Hoàng')
  })

  it('falls back to name / code / id when parts are missing', () => {
    expect(buildCollaboratorLabel({ id: 7, name: 'Nguyễn Văn Hoàng' })).toBe('Nguyễn Văn Hoàng')
    expect(buildCollaboratorLabel({ id: 7, code: 'CTV001' })).toBe('CTV001')
    expect(buildCollaboratorLabel({ id: 7 })).toBe('7')
    expect(buildCollaboratorLabel({ id: 9, code: null, name: null })).toBe('9')
  })
})

describe('buildCollaboratorOptionLabel', () => {
  // cmdk lọc client-side theo chuỗi này; thiếu CCCD ở đây thì gõ căn cước sẽ không khớp dòng nào.
  it('appends the CCCD so a CCCD query still matches the row', () => {
    expect(
      buildCollaboratorOptionLabel({
        id: 7,
        code: 'CTV001',
        name: 'Nguyễn Văn Hoàng',
        id_number: '079123456789',
      })
    ).toBe('CTV001 - Nguyễn Văn Hoàng - CCCD: 079123456789')
  })

  it('keeps the plain label when the collaborator has no CCCD', () => {
    expect(buildCollaboratorOptionLabel({ id: 7, code: 'CTV001', name: 'Nguyễn Văn Hoàng' })).toBe(
      'CTV001 - Nguyễn Văn Hoàng'
    )
    expect(
      buildCollaboratorOptionLabel({
        id: 7,
        code: 'CTV001',
        name: 'Nguyễn Văn Hoàng',
        id_number: '  ',
      })
    ).toBe('CTV001 - Nguyễn Văn Hoàng')
  })
})

describe('buildCollaboratorOption', () => {
  it('builds { value: stringified id, label, optionLabel with CCCD }', () => {
    expect(
      buildCollaboratorOption({ id: 42, code: 'CTV042', name: 'Trần B', id_number: '001234567890' })
    ).toEqual({
      value: '42',
      label: 'CTV042 - Trần B',
      optionLabel: 'CTV042 - Trần B - CCCD: 001234567890',
    })
  })

  it('omits optionLabel when it would duplicate the label', () => {
    expect(buildCollaboratorOption({ id: 42, code: 'CTV042', name: 'Trần B' })).toEqual({
      value: '42',
      label: 'CTV042 - Trần B',
    })
  })
})

describe('looksLikeIdNumber', () => {
  it('accepts digit-only strings of CMND/CCCD length', () => {
    expect(looksLikeIdNumber('079123456789')).toBe(true) // CCCD 12 số
    expect(looksLikeIdNumber('123456789')).toBe(true) // CMND 9 số
    expect(looksLikeIdNumber('  079123456789  ')).toBe(true)
  })

  it('rejects names, codes and short numbers', () => {
    expect(looksLikeIdNumber('Nguyễn Văn Hoàng')).toBe(false)
    expect(looksLikeIdNumber('CTV000000001')).toBe(false)
    expect(looksLikeIdNumber('12345')).toBe(false)
    expect(looksLikeIdNumber('')).toBe(false)
  })
})

describe('toCollaboratorId', () => {
  it('coerces select values to a collaborator id', () => {
    expect(toCollaboratorId('42')).toBe(42)
    expect(toCollaboratorId(['7', '8'])).toBe(7)
    expect(toCollaboratorId(null)).toBeNull()
    expect(toCollaboratorId('')).toBeNull()
  })
})
