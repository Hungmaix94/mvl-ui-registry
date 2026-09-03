import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guard toàn mảng Kế toán cho `docs/ai/conventions.md` § "Mã quyền khai ở route phải là mã BE
 * thật sự sinh ra".
 *
 * Vì sao cần một guard QUÉT NGUỒN thay vì test từng màn: một mã gõ sai không gây lỗi ở đâu cả.
 * `defineAbilitiesFor` chỉ dựng rule từ danh sách BE trả về, nên mã không tồn tại đơn giản là
 * không khớp gì ⇒ `ability.can` luôn false ⇒ **nút biến mất với mọi tài khoản trừ superuser**.
 * Không crash, không cảnh báo, và bấm thử bằng tài khoản test (superuser) cũng không lộ.
 *
 * Guard này cố ý **hẹp mà đúng**: chỉ soi lời gọi có HAI THAM SỐ LITERAL (`ability.can('x','y')`).
 * Lời gọi truyền biến (`ability.can(action, subject)`) không đọc tĩnh được nên bỏ qua — bắt bừa
 * một lần là lần sau không ai tin guard nữa.
 */

const ROOT = process.cwd()
const SCHEMA = fs.readFileSync(path.join(ROOT, 'src/api/schema.ts'), 'utf8')

/** Mọi mã BE tự khai trong JSDoc của schema. */
const DOCUMENTED = new Set(
  [...SCHEMA.matchAll(/\*\*Require permission:\*\*\s*`([^`]+)`/g)].map((m) => m[1])
)

/**
 * Mã KHÔNG có trong `schema.ts` nhưng đã xác minh là không phải lỗi. Thêm vào đây phải kèm lý do
 * — danh sách này là chỗ duy nhất guard chịu nhượng bộ, để trống lý do là mở đường cho mã bịa.
 */
const ALLOWLIST = new Map<string, string>([
  [
    'monthlycommissionsummary.retrieve',
    'Có thật trong `../srs/docs/handover/permissions-matrix.html` (nguồn đầy đủ; schema.ts chỉ là tập con). Dùng làm nhánh `||` dự phòng ở MonthlySummaryDetailPage.',
  ],
  [
    'monthlycommissionsummary.create',
    'KHÔNG có ở cả schema lẫn matrix — nhưng nằm ở vế phải một phép `||`, nên chỉ là nhánh dự phòng chết, không giấu nút của ai. Đã báo trong ClickUp 86eync7g0 để chủ sở hữu dọn.',
  ],
  [
    'linkedexchangetarget.view_related_roles',
    'KHÔNG có ở cả schema lẫn matrix — nhưng call site là `true || ability.can(...)`, tức đã bị short-circuit vô hiệu hoá từ trước. Đã báo trong ClickUp 86eync7g0.',
  ],
])

const SCAN_DIRS = ['src/features/accounting', 'src/pages/authenticated/accounting']

function collectFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(p))
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(p)
  }
  return out
}

type Usage = { code: string; file: string }

const usages: Usage[] = []
for (const dir of SCAN_DIRS) {
  for (const file of collectFiles(path.join(ROOT, dir))) {
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(/ability\.can\(\s*'([a-z_]+)'\s*,\s*'([a-z_]+)'\s*\)/g)) {
      usages.push({ code: `${m[2]}.${m[1]}`, file: path.relative(ROOT, file).replace(/\\/g, '/') })
    }
  }
}

describe('mã quyền literal trong mảng Kế toán phải là mã BE thật sự sinh ra', () => {
  it('phép đo có thật: quét ra mã, và schema đọc được', () => {
    // Cả hai khẳng định đều là TIỀN ĐỀ. Không có chúng thì một lần đổi regex / đổi đường dẫn làm
    // guard quét ra 0 mã, và "không mã nào sai" đọc y hệt "mọi mã đều đúng".
    expect(usages.length).toBeGreaterThan(50)
    expect(DOCUMENTED.size).toBeGreaterThan(500)
    expect(DOCUMENTED.has('paymentvoucher.create')).toBe(true)
  })

  it('không có mã nào vắng mặt ở cả schema lẫn allowlist', () => {
    const unknown = usages.filter((u) => !DOCUMENTED.has(u.code) && !ALLOWLIST.has(u.code))
    // In kèm file để người sửa biết đi đâu, thay vì chỉ thấy một con số.
    expect(unknown.map((u) => `${u.code}  <- ${u.file}`)).toEqual([])
  })

  it('allowlist không phình ra âm thầm — mỗi mục phải có lý do', () => {
    for (const [code, reason] of ALLOWLIST) {
      expect(reason.length, `allowlist "${code}" thiếu lý do`).toBeGreaterThan(40)
    }
    // Chốt số lượng: thêm mục mới buộc phải sửa con số này, tức phải đọc lại cả danh sách.
    expect(ALLOWLIST.size).toBe(3)
  })

  it('mã đã vào allowlist mà BE bổ sung sau này thì phải gỡ khỏi allowlist', () => {
    const nowDocumented = [...ALLOWLIST.keys()].filter((c) => DOCUMENTED.has(c))
    expect(nowDocumented).toEqual([])
  })
})
