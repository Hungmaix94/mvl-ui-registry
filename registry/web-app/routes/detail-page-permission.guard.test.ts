import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guard cho `docs/ai/conventions.md`: *"Chặn ở route rồi thì trong trang cũng đừng ghi cứng
 * `hasPermission={true}` cho `DetailPageWrapper` — hỏi `ability.can(action, subject)` với đúng
 * mã đó."*
 *
 * Vì sao cần guard thay vì chỉ sửa một lượt: `hasPermission={true}` **không gây lỗi gì cả** —
 * nó chỉ lặng lẽ vô hiệu hoá tầng phòng thủ thứ hai của trang. Trước ClickUp 86eync7g0 nó đã
 * sinh sôi tới **56 chỗ** mà không ai nhận ra, vì `PermissionGuard` ở route vẫn chặn nên không
 * có triệu chứng nào để phát hiện.
 *
 * Danh sách miễn trừ dưới đây là các ca ghi cứng ĐÚNG. Muốn thêm mục mới thì phải sửa cả con số
 * ở test cuối — tức phải đọc lại cả danh sách, không lặng lẽ nới ra được.
 */

const ROOT = process.cwd()

/** file (rel to src) -> vì sao ghi cứng `true` ở đây là đúng. */
const ALLOWED = new Map<string, string>([
  [
    'features/sales/deal-v3/components/overview/DealCashflowTab.tsx',
    'Code chết: cả hai chỗ nằm trong nhánh isLoading / isError, mà DetailPageWrapper kiểm ba cờ đó TRƯỚC hasPermission. Là khung xương chờ tải, không phải cổng quyền.',
  ],
  [
    'features/sales/deal-v3/components/overview/DealCommissionTab.tsx',
    'Code chết: cả hai chỗ nằm trong nhánh isLoading / isError, mà DetailPageWrapper kiểm ba cờ đó TRƯỚC hasPermission. Là khung xương chờ tải, không phải cổng quyền.',
  ],
  [
    'features/kpi/assessment/AssessmentAssessContainer.tsx',
    'Render bởi AssessmentDetailPage — trang này nằm trên BỐN route với BỐN mã quyền khác nhau, ghi cứng một mã là chặn nhầm ba route còn lại.',
  ],
  [
    'features/kpi/assessment/AssessmentDetailContainer.tsx',
    'Render bởi AssessmentDetailPage — trang này nằm trên BỐN route với BỐN mã quyền khác nhau, ghi cứng một mã là chặn nhầm ba route còn lại.',
  ],
  [
    'pages/authenticated/object-history/BaseHistoryDetailPage.tsx',
    'Component dùng chung cho màn lịch sử của rất nhiều thực thể, mỗi route gọi nó khai một mã quyền riêng. Ghi cứng một mã là chặn nhầm mọi màn còn lại.',
  ],
])

function collect(dir: string): string[] {
  const out: string[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...collect(p))
    else if (/\.tsx$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p)
  }
  return out
}

const HARDCODED = /hasPermission=\{true\}/

const offenders: string[] = []
let scanned = 0
let totalHardcoded = 0
for (const file of collect(path.join(ROOT, 'src'))) {
  scanned++
  const src = fs.readFileSync(file, 'utf8')
  if (!HARDCODED.test(src)) continue
  totalHardcoded++
  const rel = path.relative(path.join(ROOT, 'src'), file).replace(/\\/g, '/')
  if (!ALLOWED.has(rel)) offenders.push(rel)
}

describe('DetailPageWrapper — không ghi cứng hasPermission', () => {
  it('phép đo có thật: quét được file và vẫn thấy các ca miễn trừ', () => {
    // Tiền đề. Đổi đường dẫn hay đổi regex làm guard quét ra 0 file thì "không ai vi phạm" đọc
    // y hệt "mọi trang đều đúng" — đúng loại test rỗng cần chặn.
    expect(scanned).toBeGreaterThan(300)
    expect(totalHardcoded).toBe(ALLOWED.size)
  })

  it('không trang nào ghi cứng hasPermission ngoài danh sách miễn trừ', () => {
    expect(offenders).toEqual([])
  })

  it('mỗi mục miễn trừ phải có lý do, và số lượng được chốt cứng', () => {
    for (const [file, reason] of ALLOWED) {
      expect(reason.length, `miễn trừ "${file}" thiếu lý do`).toBeGreaterThan(60)
      expect(
        fs.existsSync(path.join(ROOT, 'src', file)),
        `miễn trừ "${file}" trỏ vào file không tồn tại`
      ).toBe(true)
    }
    expect(ALLOWED.size).toBe(5)
  })
})
