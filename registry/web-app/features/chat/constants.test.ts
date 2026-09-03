import { describe, expect, it } from 'vitest'
import { REACTION_TYPES } from './constants'

describe('REACTION_TYPES', () => {
  it('should contain the full 8-type reaction set supported by the backend (US-212)', () => {
    expect(REACTION_TYPES).toHaveLength(8)
    expect(REACTION_TYPES.map((r) => r.key)).toEqual([
      'like',
      'heart',
      'laugh',
      'wow',
      'sad',
      'angry',
      'clap',
      'celebrate',
    ])
  })
})
