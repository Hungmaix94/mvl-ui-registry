import { describe, expect, it } from 'vitest'
import { QUERY_KEYS } from '@/constants'
import { ladScopeChangeQueryKeys } from './lad-cache-invalidation'

const BATCH_ID = 42

describe('ladScopeChangeQueryKeys', () => {
  it('làm mới danh sách GD (LINES) khi phạm vi đổi', () => {
    const keys = ladScopeChangeQueryKeys(BATCH_ID)
    expect(keys).toContainEqual(QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.LINES(BATCH_ID, {}))
  })

  // REGRESSION: thêm GD ở Bước 1 trước đây chỉ invalidate LINES, BỎ SÓT F2S ⇒ Bước 2 phục vụ cache
  // rỗng cũ khi remount (global staleTime) ⇒ không thấy F2 nào sau khi đổi phạm vi GD.
  it('làm mới danh sách F2 (F2S) khi phạm vi đổi — chống tái diễn bug Bước 2 trống', () => {
    const keys = ladScopeChangeQueryKeys(BATCH_ID)
    expect(keys).toContainEqual(QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.F2S(BATCH_ID, {}))
  })

  it('khớp đúng key của useLadF2s(batchId) — hook gọi params undefined ⇒ F2S(id, {})', () => {
    const keys = ladScopeChangeQueryKeys(BATCH_ID)
    const f2sKey = QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.F2S(BATCH_ID, {})
    const matched = keys.find(
      (k) => k.length === f2sKey.length && k.every((p, i) => p === f2sKey[i])
    )
    expect(matched).toBeDefined()
  })

  it('gắn đúng batchId vào mọi key', () => {
    const keys = ladScopeChangeQueryKeys(BATCH_ID)
    for (const key of keys) {
      expect(key).toContain(BATCH_ID)
    }
  })
})
