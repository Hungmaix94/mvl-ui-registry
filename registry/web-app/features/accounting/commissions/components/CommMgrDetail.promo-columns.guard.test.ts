/**
 * Guard: bảng mục ⑥ "Hoa hồng Đầu tư, Xúc tiến & Phát triển Dự án" chỉ có 2 cột.
 *
 * Bộ cột của bảng này đã bị đảo BA lần trong 4 ngày, mỗi lần theo một hướng khác nhau:
 *
 *  1. Bản gốc: 10 cột (Mã deal · Dự án·KH · 5 vai trò · Tổng ghi nhận · % tiền về · HH thực tế),
 *     trong đó 5 cột vai trò VĨNH VIỄN `—` vì tra `line.pct_type` mà item `sources.promo` gộp
 *     theo payee nên không hề mang `pct_type`.
 *  2. 2026-08-14 (`21f9fabf5` + `ed2f5e19d`): dựng lại 1 dòng / dự án, sửa tận gốc để 5 cột vai
 *     trò có số thật, rút còn 7 cột.
 *  3. 2026-08-18 (ClickUp 86eyku6xq): BA chốt **ẩn hẳn 5 cột vai trò** → còn 2 cột.
 *
 * Vì sao cần guard: bước (3) đi NGƯỢC lại ý đồ được ghi rõ trong chính commit (2) — "5 cột vai
 * trò LUÔN hiện đủ theo thứ tự nghiệp vụ… để khung cột giữ nguyên giữa các kỳ / các người".
 * Người đọc code sau này gặp `row.roles` / `getPromoColumnPctTypes` vẫn còn nguyên trong
 * `promo-by-project.ts` (giữ lại vì phiếu phân bổ xúc tiến còn dùng khái niệm vai trò, và BA có
 * thể lật lại) sẽ rất dễ "sửa lỗi" bằng cách nối cột vai trò trở lại bảng. Guard này là chỗ duy
 * nhất nói rằng việc bỏ cột là CỐ Ý.
 *
 * Hỏng im lặng: thêm cột lại thì không lỗi, không cảnh báo, test nào cũng xanh — chỉ BA mở màn
 * lên mới thấy. Đúng loại lỗi mà test phải canh thay cho tài liệu.
 *
 * Guard đọc source thay vì render DOM: đo bộ cột phải đi ngược cây cha, mà
 * `testing-library/no-node-access` (bật ở `eslint.config.js`, `--max-warnings 0`) cấm đúng thao
 * tác đó. Xem `docs/ai/conventions.md` § "Viết test đo layout / đi ngược cây cha".
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const COMPONENT = join(dirname(fileURLToPath(import.meta.url)), 'CommMgrDetail.tsx')
const source = readFileSync(COMPONENT, 'utf8')

/**
 * Thân của một khai báo `const X = …`, cắt tới khai báo top-level kế tiếp.
 *
 * File này có ~15 bảng con dùng chung lối viết (`<th>`, `TỔNG NHÓM`, `formatCurrencyVND`), nên
 * đếm trên toàn file là đếm nhầm bảng khác. Mọi phép đếm dưới đây chạy trong lát cắt này.
 */
function declarationBody(declaration: string): string {
  const startsAt = source.indexOf(declaration)
  expect(
    startsAt,
    `không còn tìm thấy "${declaration}" — guard mất hiệu lực, cập nhật lại`
  ).toBeGreaterThan(-1)

  const endsAt = source.indexOf('\nconst ', startsAt + declaration.length)
  return source.slice(startsAt, endsAt === -1 ? source.length : endsAt)
}

const promoTable = declarationBody('const TransactionGroupATable = ')
const tooltipHelper = declarationBody('const promoTotalTooltip = ')

/**
 * Dòng TỔNG NHÓM của chính bảng mục ⑥ — cắt trong lát cắt trên, không cắt trên toàn file.
 *
 * Phải lùi về thẻ `<tr` bao ngoài: nhãn "TỔNG NHÓM" nằm BÊN TRONG ô đầu tiên, cắt từ nhãn là
 * bỏ sót đúng ô đó và phép đếm ô luôn hụt 1.
 */
const promoTotalRow = (() => {
  const labelAt = promoTable.indexOf('TỔNG NHÓM')
  expect(labelAt, 'bảng mục ⑥ không còn dòng TỔNG NHÓM').toBeGreaterThan(-1)
  return promoTable.slice(
    promoTable.lastIndexOf('<tr', labelAt),
    promoTable.indexOf('</tr>', labelAt)
  )
})()

const countOf = (haystack: string, tag: RegExp) => (haystack.match(tag) ?? []).length

describe('CommMgrDetail — khung cột bảng mục ⑥ (86eyku6xq)', () => {
  it('neo đúng bảng mục ⑥, không phải một bảng con khác của màn', () => {
    // Tự kiểm: lát cắt vừa neo đúng là bảng dựng từ dòng promo gom theo dự án.
    expect(promoTable).toContain('buildPromoProjectRows')
    expect(promoTable).toContain('<PromoProjectCell row={row} />')
    expect(promoTable).toContain('Tên dự án')
  })

  it('header đúng 2 cột: Tên dự án · Tổng tiền', () => {
    expect(
      countOf(promoTable, /<th\b/g),
      'bảng mục ⑥ phải còn đúng 2 cột — thêm cột nào là đi ngược yêu cầu 86eyku6xq'
    ).toBe(2)
    expect(promoTable).toContain('>Tên dự án</th>')
    expect(promoTable).toContain('>Tổng tiền</th>')
  })

  it('dòng TỔNG NHÓM có đúng số ô bằng số cột header', () => {
    // Lệch nhau là bảng vỡ cột — dòng tổng trượt sang cột khác mà không có cảnh báo nào.
    expect(countOf(promoTotalRow, /<td\b/g)).toBe(countOf(promoTable, /<th\b/g))
  })

  it('không dựng lại cột vai trò xúc tiến', () => {
    expect(promoTable, 'nhãn vai trò quay lại ⇒ cột vai trò đã bị nối lại vào bảng').not.toContain(
      'PROMOTION_PCT_TYPE_LABEL'
    )
    expect(promoTable).not.toContain('PromoRoleCell')
    expect(promoTable).not.toContain('getPromoColumnPctTypes')
    // `row.roles` / `totals.roles` vẫn tồn tại trong util; render chúng ra bảng mới là vi phạm.
    expect(promoTable).not.toMatch(/\broles\[/)
  })

  it('phụ đề mục ⑥ không còn hứa hẹn cell vai trò', () => {
    // Phụ đề cũ ghi "mỗi cell vai trò: thành tiền (…)" — giữ lại là mô tả một bảng không còn tồn tại.
    expect(source).not.toContain('mỗi cell vai trò')
  })

  it('tooltip Tổng tiền vẫn gánh mẫu số đã mất cùng các cột bị bỏ', () => {
    // Bỏ cột mà bỏ luôn tooltip là xoá sạch đường đọc con số: không còn quỹ xúc tiến, không còn
    // phần được hưởng, không còn tỷ lệ tiền về ở bất kỳ đâu trên màn.
    expect(promoTable).toContain('promoTotalTooltip(row)')
    expect(tooltipHelper).toContain('Quỹ xúc tiến dự án')
    expect(tooltipHelper).toContain('Được hưởng')
    expect(tooltipHelper).toContain('Tiền về kỳ này')
  })
})
