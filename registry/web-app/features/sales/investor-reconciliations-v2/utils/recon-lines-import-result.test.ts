import { describe, expect, it } from 'vitest'

import { ImportJobStatus } from '@/api/schema'
import type { ImportJob } from '@/services/export-service'

import { parseResultFiles, resolveImportOutcomeMessage } from './recon-lines-import-result'

/**
 * `ImportJob` là schema sinh tự động với nhiều field readonly; test chỉ quan tâm
 * status/error_message nên fixture khai báo phần dùng tới rồi ép kiểu MỘT lần ở
 * ranh giới test.
 */
function makeJob(overrides: Partial<ImportJob> = {}): ImportJob {
  return {
    status: ImportJobStatus.succeeded,
    success_count: 0,
    failure_count: 0,
    error_message: null,
    ...overrides,
  } as ImportJob
}

describe('resolveImportOutcomeMessage', () => {
  it('trả null khi job thành công — dialog hiện khối tóm tắt số căn', () => {
    expect(resolveImportOutcomeMessage(makeJob({ status: ImportJobStatus.succeeded }))).toBeNull()
  })

  it('job bị huỷ KHÔNG được coi là thành công', () => {
    // Nếu chỉ kiểm tra `status === 'failed'`, job huỷ sẽ rơi vào nhánh thành công
    // và hiện "Thêm thành công 0 căn" màu xanh — người dùng tưởng file rỗng.
    expect(resolveImportOutcomeMessage(makeJob({ status: ImportJobStatus.cancelled }))).toBe(
      'Tiến trình nhập đã bị huỷ.'
    )
  })

  it('job thất bại không kèm error_message vẫn có thông báo mặc định', () => {
    expect(resolveImportOutcomeMessage(makeJob({ status: ImportJobStatus.failed }))).toBe(
      'Nhập dữ liệu thất bại.'
    )
  })

  it('ưu tiên error_message của BE khi có', () => {
    expect(
      resolveImportOutcomeMessage(
        makeJob({ status: ImportJobStatus.failed, error_message: 'Thiếu cột Mã căn' })
      )
    ).toBe('Thiếu cột Mã căn')
  })

  it('job huỷ kèm error_message thì hiện message của BE', () => {
    expect(
      resolveImportOutcomeMessage(
        makeJob({ status: ImportJobStatus.cancelled, error_message: 'Worker bị dừng' })
      )
    ).toBe('Worker bị dừng')
  })
})

describe('parseResultFiles', () => {
  const files = {
    success_file: { url: 'https://example.test/ok.csv' },
    failed_file: { url: 'https://example.test/err.csv' },
  }

  it('trả nguyên object khi BE gửi dạng object', () => {
    expect(parseResultFiles(files as never)).toEqual(files)
  })

  it('parse được khi BE gửi dạng chuỗi JSON', () => {
    expect(parseResultFiles(JSON.stringify(files))).toEqual(files)
  })

  it('trả null với chuỗi JSON hỏng thay vì ném lỗi', () => {
    expect(parseResultFiles('{khong-phai-json')).toBeNull()
  })

  it.each([null, undefined, ''])('trả null với giá trị rỗng: %s', (raw) => {
    expect(parseResultFiles(raw as never)).toBeNull()
  })
})
