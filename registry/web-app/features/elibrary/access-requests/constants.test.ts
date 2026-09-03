import { describe, expect, it } from 'vitest'
import { ColoredValueVariant } from '@/api/schema.ts'
import { getAccessRequestStatusDisplay } from './constants'

describe('getAccessRequestStatusDisplay', () => {
  it('maps known statuses to Vietnamese label + variant', () => {
    expect(getAccessRequestStatusDisplay('pending')).toEqual({
      label: 'Đang chờ',
      variant: ColoredValueVariant.YELLOW,
    })
    expect(getAccessRequestStatusDisplay('approved')).toEqual({
      label: 'Đã duyệt',
      variant: ColoredValueVariant.GREEN,
    })
    expect(getAccessRequestStatusDisplay('rejected')).toEqual({
      label: 'Đã từ chối',
      variant: ColoredValueVariant.RED,
    })
    expect(getAccessRequestStatusDisplay('cancelled')).toEqual({
      label: 'Đã huỷ',
      variant: ColoredValueVariant.GREY,
    })
  })

  it('falls back to the raw value + grey for unknown status', () => {
    expect(getAccessRequestStatusDisplay('weird')).toEqual({
      label: 'weird',
      variant: ColoredValueVariant.GREY,
    })
  })

  it('falls back to "-" + grey for empty/null status', () => {
    expect(getAccessRequestStatusDisplay(null)).toEqual({
      label: '-',
      variant: ColoredValueVariant.GREY,
    })
    expect(getAccessRequestStatusDisplay(undefined)).toEqual({
      label: '-',
      variant: ColoredValueVariant.GREY,
    })
  })
})
