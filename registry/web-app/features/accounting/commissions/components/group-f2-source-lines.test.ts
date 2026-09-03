import { describe, expect, it } from 'vitest'

import { LinkedExchangeRevenueLineF2_source as F2Source } from '@/api/schema'

import { groupLinesByF2Source } from './group-f2-source-lines'

type Line = { id: number; f2_source: F2Source }

const ORDER = [F2Source.linked, F2Source.company]

describe('groupLinesByF2Source', () => {
  it('groups lines into fixed-order sections by source', () => {
    const lines: Line[] = [
      { id: 1, f2_source: F2Source.company },
      { id: 2, f2_source: F2Source.linked },
      { id: 3, f2_source: F2Source.linked },
    ]

    const sections = groupLinesByF2Source(lines, ORDER)

    expect(sections.map((s) => s.source)).toEqual([F2Source.linked, F2Source.company])
    expect(sections[0].lines.map((l) => l.id)).toEqual([2, 3])
    expect(sections[1].lines.map((l) => l.id)).toEqual([1])
  })

  it('emits a section per order entry even when it has no lines', () => {
    const lines: Line[] = [{ id: 1, f2_source: F2Source.linked }]

    const sections = groupLinesByF2Source(lines, ORDER)

    expect(sections).toHaveLength(ORDER.length)
    expect(sections[1].source).toBe(F2Source.company)
    expect(sections[1].lines).toEqual([])
  })

  it('preserves the declared section order regardless of input order', () => {
    const lines: Line[] = [
      { id: 1, f2_source: F2Source.company },
      { id: 2, f2_source: F2Source.linked },
    ]

    const sections = groupLinesByF2Source(lines, [F2Source.company, F2Source.linked])

    expect(sections.map((s) => s.source)).toEqual([F2Source.company, F2Source.linked])
  })
})
