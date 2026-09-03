import { describe, expect, it } from 'vitest'

import {
  collectSplitCreateFailureMessages,
  collectValidationMessages,
  firstSplitCreateFailureReason,
} from './collaborator-contract-create-errors'

// Standard DRF validation_error envelope as re-thrown by base-service.ts (throw response.error).
function validationError(detail: string, attr = 'collaborator') {
  return {
    error: {
      type: 'validation_error',
      errors: [{ code: 'invalid', attr, detail }],
    },
  }
}

function fulfilled<T>(value: T): PromiseFulfilledResult<T> {
  return { status: 'fulfilled', value }
}

function rejected(reason: unknown): PromiseRejectedResult {
  return { status: 'rejected', reason }
}

describe('collectSplitCreateFailureMessages', () => {
  it('returns no messages when every request succeeds', () => {
    const settled = [fulfilled({ id: 1 }), fulfilled({ id: 2 })]

    expect(collectSplitCreateFailureMessages(settled)).toEqual([])
  })

  it('prefixes the row number when more than one request fails', () => {
    const settled = [
      fulfilled({ id: 1 }),
      rejected(validationError('CTV này đã có hợp đồng cho thương vụ này.')),
      rejected(validationError('Vui lòng chọn % hoa hồng hợp lệ.', 'pct_commission')),
    ]

    expect(collectSplitCreateFailureMessages(settled)).toEqual([
      'Dòng 2: CTV này đã có hợp đồng cho thương vụ này.',
      'Dòng 3: Vui lòng chọn % hoa hồng hợp lệ.',
    ])
  })

  it('does not prefix a row number when only one request fails, even mid-array', () => {
    const settled = [
      fulfilled({ id: 1 }),
      rejected(validationError('CTV này đã có hợp đồng cho thương vụ này.')),
      fulfilled({ id: 3 }),
    ]

    expect(collectSplitCreateFailureMessages(settled)).toEqual([
      'CTV này đã có hợp đồng cho thương vụ này.',
    ])
  })

  it('dedupes identical messages across failing rows', () => {
    const settled = [
      rejected(validationError('CTV này đã có hợp đồng cho thương vụ này.')),
      rejected(validationError('CTV này đã có hợp đồng cho thương vụ này.')),
    ]

    // Same detail, different rows — still one line per row so the user knows both failed.
    expect(collectSplitCreateFailureMessages(settled)).toEqual([
      'Dòng 1: CTV này đã có hợp đồng cho thương vụ này.',
      'Dòng 2: CTV này đã có hợp đồng cho thương vụ này.',
    ])
  })

  it('falls back to a generic message for a non-validation error (e.g. network failure)', () => {
    const settled = [rejected(new Error('Network Error'))]

    expect(collectSplitCreateFailureMessages(settled)).toEqual(['Network Error'])
  })
})

describe('firstSplitCreateFailureReason', () => {
  it('returns undefined when nothing failed', () => {
    expect(firstSplitCreateFailureReason([fulfilled({ id: 1 })])).toBeUndefined()
  })

  it('returns the first rejected reason, in array order', () => {
    const first = validationError('Lỗi dòng 1')
    const second = validationError('Lỗi dòng 2')
    const settled = [fulfilled({ id: 1 }), rejected(first), rejected(second)]

    expect(firstSplitCreateFailureReason(settled)).toBe(first)
  })
})

// ClickUp 86eypf62k — bấm "Xác nhận" trên form thiếu dữ liệu: không request nào rời trình duyệt
// và không chữ nào hiện ra, vì mọi lỗi nằm ở `splits[i].*` (ô không in lỗi) và rejection bị vứt.
describe('collectValidationMessages', () => {
  it('returns no message when the form has no errors', () => {
    expect(collectValidationMessages({})).toEqual([])
    expect(collectValidationMessages(undefined)).toEqual([])
  })

  it('labels every failing split row so the user knows WHICH row is wrong', () => {
    const errors = {
      splits: [
        { collaborator: { message: 'Vui lòng chọn người nhận' } },
        { pct_commission: { message: 'Vui lòng nhập % hoa hồng' } },
      ],
    }

    expect(collectValidationMessages(errors)).toEqual([
      'Dòng 1: Vui lòng chọn người nhận',
      'Dòng 2: Vui lòng nhập % hoa hồng',
    ])
  })

  it('reports every failing cell of one row, not just the first', () => {
    const errors = {
      splits: [
        {
          dc_sale: { message: 'Vui lòng chọn căn' },
          collaborator: { message: 'Vui lòng chọn người nhận' },
          pct_commission: { message: 'Vui lòng nhập % hoa hồng' },
        },
      ],
    }

    expect(collectValidationMessages(errors)).toHaveLength(3)
  })

  it('keeps the same message on different rows — the row number is what distinguishes them', () => {
    const errors = {
      splits: [
        { collaborator: { message: 'Vui lòng chọn người nhận' } },
        { collaborator: { message: 'Vui lòng chọn người nhận' } },
      ],
    }

    expect(collectValidationMessages(errors)).toEqual([
      'Dòng 1: Vui lòng chọn người nhận',
      'Dòng 2: Vui lòng chọn người nhận',
    ])
  })

  it('skips rows that are valid, and numbers rows by position not by order of failure', () => {
    const errors = {
      splits: [undefined, { dc_sale: { message: 'Vui lòng chọn căn' } }],
    }

    expect(collectValidationMessages(errors)).toEqual(['Dòng 2: Vui lòng chọn căn'])
  })

  it('reports top-level field errors verbatim, without a row prefix', () => {
    const errors = {
      contract_amount: {
        message: 'Tổng tiền các dòng chia (1.000 đ) phải bằng số tiền hợp đồng (2.000 đ)',
      },
    }

    expect(collectValidationMessages(errors)).toEqual([
      'Tổng tiền các dòng chia (1.000 đ) phải bằng số tiền hợp đồng (2.000 đ)',
    ])
  })

  it('reports the array-level issue when the splits table itself is empty', () => {
    // `min(1)` lỗi ở cấp mảng: RHF để nó thành MỘT node, không phải danh sách theo dòng.
    const errors = { splits: { message: 'Vui lòng thêm ít nhất một dòng chia' } }

    expect(collectValidationMessages(errors)).toEqual(['Vui lòng thêm ít nhất một dòng chia'])
  })

  it('dedupes an identical top-level message instead of toasting it twice', () => {
    const errors = {
      contract_amount: { message: 'Giá trị không hợp lệ' },
      pct_line_bonus: { message: 'Giá trị không hợp lệ' },
    }

    expect(collectValidationMessages(errors)).toEqual(['Giá trị không hợp lệ'])
  })

  it('ignores nodes that carry no usable message', () => {
    const errors = {
      contract_amount: { type: 'custom' },
      splits: [{ dc_sale: { type: 'custom' } }],
    }

    expect(collectValidationMessages(errors)).toEqual([])
  })
})
