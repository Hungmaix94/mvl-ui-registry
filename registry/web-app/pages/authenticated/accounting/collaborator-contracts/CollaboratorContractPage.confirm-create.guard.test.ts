import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `AppDialog.handleConfirm` await `onConfirm()` rồi ĐÓNG dialog nếu promise resolve, và chỉ giữ
 * dialog mở khi nó reject. Bọc `try/catch` quanh `submitForm()` ở đây biến "form dừng vì lỗi"
 * thành "thành công" ⇒ dialog đóng, người dùng mất trắng dữ liệu vừa nhập.
 *
 * Cái bẫy này đã sập thật trong lúc sửa ClickUp 86eypf62k (thêm `catch` cho "gọn", rồi phải đo
 * bằng click chuột thật mới thấy dialog biến mất), và **không** test hành vi nào bắt được — nên
 * mới cần guard đọc thẳng source.
 */
const PAGE_PATH = join(
  process.cwd(),
  'src/pages/authenticated/accounting/collaborator-contracts/CollaboratorContractPage.tsx'
)

function handleConfirmCreateBody(source: string): string {
  const start = source.indexOf('const handleConfirmCreate')
  expect(
    start,
    'không tìm thấy `handleConfirmCreate` — đổi tên thì cập nhật guard này'
  ).toBeGreaterThan(-1)
  const end = source.indexOf('}, [', start)
  expect(end, 'không tìm thấy chỗ đóng của `handleConfirmCreate`').toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('CollaboratorContractPage — handleConfirmCreate', () => {
  const source = readFileSync(PAGE_PATH, 'utf8')
  const body = handleConfirmCreateBody(source)

  it('trả nguyên promise của submitForm để AppDialog còn biết là form đã dừng', () => {
    expect(body).toMatch(/return\s+createFormRef\.current\?\.submitForm\(\)/)
  })

  it('KHÔNG nuốt lỗi: không try/catch, không .catch() quanh submitForm', () => {
    expect(body).not.toMatch(/\btry\b/)
    expect(body).not.toMatch(/\bcatch\b/)
    expect(body).not.toMatch(/\.catch\(/)
  })
})
