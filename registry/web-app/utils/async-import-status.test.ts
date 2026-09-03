import { describe, expect, it } from 'vitest'

import { ImportJobStatus } from '@/api/schema'

import { IMPORT_TERMINAL_STATUSES, isTerminalImportStatus } from './async-import-status'

describe('isTerminalImportStatus', () => {
  it.each(['succeeded', 'failed', 'cancelled'])(
    'coi "%s" là trạng thái kết thúc — ngừng poll và trả job cuối',
    (status) => {
      expect(isTerminalImportStatus(status)).toBe(true)
    }
  )

  it.each(['queued', 'running'])('vẫn tiếp tục poll ở trạng thái "%s"', (status) => {
    expect(isTerminalImportStatus(status)).toBe(false)
  })

  it.each([undefined, null, ''])('không coi giá trị rỗng (%s) là kết thúc', (status) => {
    expect(isTerminalImportStatus(status)).toBe(false)
  })

  it('khớp đúng bộ trạng thái kết thúc BE khai báo ở ImportJob.status', () => {
    // Enum BE: queued | running | succeeded | failed | cancelled
    expect([...IMPORT_TERMINAL_STATUSES]).toEqual([
      ImportJobStatus.succeeded,
      ImportJobStatus.failed,
      ImportJobStatus.cancelled,
    ])
  })
})
