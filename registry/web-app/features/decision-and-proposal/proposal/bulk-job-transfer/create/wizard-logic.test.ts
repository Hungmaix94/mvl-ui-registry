import { describe, expect, it } from 'vitest'
import {
  assignEmployeesToCards,
  buildInitialCardsFromLines,
  buildLineConflictsFromError,
  buildLinesPayload,
  employeeToResultCardLine,
  filterAvailableEmployees,
  removeLineFromCards,
  updateLinePosition,
} from './wizard-logic'

// This test file is parsed without the TypeScript-eslint plugin (the repo's testing eslint
// config block has no TS parser configured), so it intentionally avoids type-only syntax
// (`import type`, type annotations, `as` casts) even though the file has a `.ts` extension.
// Default values (rather than `: type` annotations) let tsc still infer number/string params.
function makeEmployee(id = 0, code = '', positionId = 0, positionName = '') {
  return {
    id,
    code,
    fullname: `Employee ${id}`,
    position: { id: positionId, name: positionName },
  }
}

describe('employeeToResultCardLine', () => {
  it('maps an employee to a line, defaulting position to the current one', () => {
    const employee = makeEmployee(1, 'MV001', 10, 'Nhân viên')
    expect(employeeToResultCardLine(employee)).toEqual({
      employeeId: 1,
      employeeCode: 'MV001',
      employeeName: 'Employee 1',
      positionId: 10,
      positionName: 'Nhân viên',
    })
  })
})

describe('assignEmployeesToCards', () => {
  const destinationA = {
    branchId: 1,
    branchName: 'CN1',
    blockId: 1,
    blockName: 'K1',
    departmentId: 100,
    departmentName: 'Phòng KD 1',
  }
  const destinationB = {
    branchId: 1,
    branchName: 'CN1',
    blockId: 1,
    blockName: 'K1',
    departmentId: 200,
    departmentName: 'Phòng KD 2',
  }

  it('creates a new card when the destination department is new', () => {
    const cards = assignEmployeesToCards([], destinationA, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    expect(cards).toHaveLength(1)
    expect(cards[0].destination).toEqual(destinationA)
    expect(cards[0].lines).toHaveLength(1)
  })

  it('merges into the existing card when the same destination is chosen again', () => {
    const first = assignEmployeesToCards([], destinationA, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    const second = assignEmployeesToCards(first, destinationA, [
      makeEmployee(2, 'MV002', 11, 'Trưởng nhóm'),
    ])
    expect(second).toHaveLength(1)
    expect(second[0].lines.map((l) => l.employeeId)).toEqual([1, 2])
  })

  it('does not duplicate an employee already present in the target card', () => {
    const first = assignEmployeesToCards([], destinationA, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    const second = assignEmployeesToCards(first, destinationA, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    expect(second[0].lines).toHaveLength(1)
  })

  it('keeps separate cards for different destinations', () => {
    const first = assignEmployeesToCards([], destinationA, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    const second = assignEmployeesToCards(first, destinationB, [
      makeEmployee(2, 'MV002', 11, 'Trưởng nhóm'),
    ])
    expect(second).toHaveLength(2)
  })
})

describe('removeLineFromCards', () => {
  const destination = {
    branchId: 1,
    branchName: 'CN1',
    blockId: 1,
    blockName: 'K1',
    departmentId: 100,
    departmentName: 'Phòng KD 1',
  }

  it('removes only the targeted line', () => {
    const cards = assignEmployeesToCards([], destination, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
      makeEmployee(2, 'MV002', 11, 'Trưởng nhóm'),
    ])
    const result = removeLineFromCards(cards, 100, 1)
    expect(result).toHaveLength(1)
    expect(result[0].lines.map((l) => l.employeeId)).toEqual([2])
  })

  it('drops the whole card once its last line is removed', () => {
    const cards = assignEmployeesToCards([], destination, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    const result = removeLineFromCards(cards, 100, 1)
    expect(result).toHaveLength(0)
  })
})

describe('updateLinePosition', () => {
  it('updates only the matching line in the matching card', () => {
    const destination = {
      branchId: 1,
      branchName: 'CN1',
      blockId: 1,
      blockName: 'K1',
      departmentId: 100,
      departmentName: 'Phòng KD 1',
    }
    const cards = assignEmployeesToCards([], destination, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    const result = updateLinePosition(cards, 100, 1, 99, 'Trưởng phòng')
    expect(result[0].lines[0]).toEqual({
      employeeId: 1,
      employeeCode: 'MV001',
      employeeName: 'Employee 1',
      positionId: 99,
      positionName: 'Trưởng phòng',
    })
  })

  it('leaves positionName undefined when the caller does not know the new label', () => {
    const destination = {
      branchId: 1,
      branchName: 'CN1',
      blockId: 1,
      blockName: 'K1',
      departmentId: 100,
      departmentName: 'Phòng KD 1',
    }
    const cards = assignEmployeesToCards([], destination, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    const result = updateLinePosition(cards, 100, 1, 99)
    expect(result[0].lines[0].positionId).toBe(99)
    expect(result[0].lines[0].positionName).toBeUndefined()
  })
})

describe('filterAvailableEmployees', () => {
  it('excludes employees already assigned to any card', () => {
    const destination = {
      branchId: 1,
      branchName: 'CN1',
      blockId: 1,
      blockName: 'K1',
      departmentId: 100,
      departmentName: 'Phòng KD 1',
    }
    const all = [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
      makeEmployee(2, 'MV002', 11, 'Trưởng nhóm'),
    ]
    const cards = assignEmployeesToCards([], destination, [all[0]])
    expect(filterAvailableEmployees(all, cards)).toEqual([all[1]])
  })
})

describe('buildLinesPayload', () => {
  it('flattens every card into the API line-input shape', () => {
    const destinationA = {
      branchId: 1,
      branchName: 'CN1',
      blockId: 1,
      blockName: 'K1',
      departmentId: 100,
      departmentName: 'Phòng KD 1',
    }
    const destinationB = {
      branchId: 1,
      branchName: 'CN1',
      blockId: 1,
      blockName: 'K1',
      departmentId: 200,
      departmentName: 'Phòng KD 2',
    }
    const afterFirst = assignEmployeesToCards([], destinationA, [
      makeEmployee(1, 'MV001', 10, 'Nhân viên'),
    ])
    const cards = assignEmployeesToCards(afterFirst, destinationB, [
      makeEmployee(2, 'MV002', 11, 'Trưởng nhóm'),
    ])

    expect(buildLinesPayload(cards)).toEqual([
      { employee_id: 1, new_department_id: 100, new_position_id: 10, reason: undefined },
      { employee_id: 2, new_department_id: 200, new_position_id: 11, reason: undefined },
    ])
  })
})

describe('buildInitialCardsFromLines', () => {
  it('groups existing proposal lines by destination department', () => {
    const lines = [
      {
        employee: { id: 1, code: 'MV001', fullname: 'Employee 1' },
        new_branch: { id: 1, name: 'CN1' },
        new_block: { id: 1, name: 'K1' },
        new_department: { id: 100, name: 'Phòng KD 1' },
        new_position: { id: 10, name: 'Nhân viên' },
      },
      {
        employee: { id: 2, code: 'MV002', fullname: 'Employee 2' },
        new_branch: { id: 1, name: 'CN1' },
        new_block: { id: 1, name: 'K1' },
        new_department: { id: 100, name: 'Phòng KD 1' },
        new_position: { id: 11, name: 'Trưởng nhóm' },
      },
      {
        employee: { id: 3, code: 'MV003', fullname: 'Employee 3' },
        new_branch: { id: 2, name: 'CN2' },
        new_block: { id: 2, name: 'K2' },
        new_department: { id: 200, name: 'Phòng KD 2' },
        new_position: { id: 12, name: 'Nhân viên' },
      },
    ]

    const cards = buildInitialCardsFromLines(lines)
    expect(cards).toHaveLength(2)
    const cardForDept100 = cards.find((c) => c.destination.departmentId === 100)
    expect(cardForDept100?.lines.map((l) => l.employeeId)).toEqual([1, 2])
    const cardForDept200 = cards.find((c) => c.destination.departmentId === 200)
    expect(cardForDept200?.lines.map((l) => l.employeeId)).toEqual([3])
  })
})

describe('buildLineConflictsFromError', () => {
  it('maps the active_transfer_conflict error to a per-employee conflict record (real base-service.ts envelope shape)', () => {
    // What `throw response.error` in base-service.ts actually produces: the API's full
    // `{ success, data, error }` envelope, not the inner validation object directly.
    const error = {
      success: false,
      data: null,
      error: {
        type: 'validation_error',
        errors: [
          {
            code: 'active_transfer_conflict',
            detail:
              'Những nhân sự sau đã có đề xuất điều chuyển ở trạng thái chờ duyệt hoặc đã duyệt (chưa tới ngày hiệu lực): Trần Thị Hồng Ánh',
            attr: 'lines',
          },
        ],
        extra: { conflicts: [{ employee_id: 13313, proposal_id: 4977 }] },
      },
    }

    expect(buildLineConflictsFromError(error)).toEqual({
      13313: {
        message:
          'Những nhân sự sau đã có đề xuất điều chuyển ở trạng thái chờ duyệt hoặc đã duyệt (chưa tới ngày hiệu lực): Trần Thị Hồng Ánh',
        proposalId: 4977,
      },
    })
  })

  it('maps every conflicting employee when the BE flags more than one', () => {
    const error = {
      error: {
        errors: [{ detail: 'Đã có đề xuất điều chuyển khác đang chờ duyệt' }],
        extra: {
          conflicts: [
            { employee_id: 1, proposal_id: 10 },
            { employee_id: 2, proposal_id: 20 },
          ],
        },
      },
    }

    expect(buildLineConflictsFromError(error)).toEqual({
      1: { message: 'Đã có đề xuất điều chuyển khác đang chờ duyệt', proposalId: 10 },
      2: { message: 'Đã có đề xuất điều chuyển khác đang chờ duyệt', proposalId: 20 },
    })
  })

  it('also accepts the already-unwrapped shape (defensive — callers should not rely on this)', () => {
    const error = {
      errors: [{ detail: 'Đã có đề xuất điều chuyển khác đang chờ duyệt' }],
      extra: { conflicts: [{ employee_id: 1, proposal_id: 10 }] },
    }

    expect(buildLineConflictsFromError(error)).toEqual({
      1: { message: 'Đã có đề xuất điều chuyển khác đang chờ duyệt', proposalId: 10 },
    })
  })

  it('returns an empty record for unrelated errors', () => {
    expect(
      buildLineConflictsFromError({ error: { errors: [{ detail: 'Ngày không hợp lệ' }] } })
    ).toEqual({})
    expect(buildLineConflictsFromError(null)).toEqual({})
    expect(buildLineConflictsFromError(undefined)).toEqual({})
    expect(buildLineConflictsFromError({})).toEqual({})
  })
})
