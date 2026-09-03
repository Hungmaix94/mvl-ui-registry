/**
 * Guard: bảng ① "Các deal đã chốt và góp vào HH kỳ này" (màn HH theo tháng-F2) có ĐÚNG 8 cột,
 * và **không** có cột "HH F2 ghi nhận".
 *
 * Vì sao cần guard — cột này đã bị lật hai lần theo hai hướng ngược nhau trong 2 tuần:
 *
 *  1. 04/08/2026, ClickUp 86eyh04b6: QA báo cột ra số sai. Nó render `deal.total_commission`,
 *     mà theo hợp đồng API field đó là *tổng phí đại lý của cả deal*
 *     (`pct_agency_fee × fee_calculation_price / 100 + amt_agency_fee`) — nên nhìn như tỷ lệ
 *     doanh thu, đúng triệu chứng QA mô tả.
 *  2. 11/08/2026: BA chốt **bỏ hẳn cột**, không sửa số. Nguyên văn reply của Nhung Nguyễn trên
 *     https://app.clickup.com/t/86eyh04b6 — "BA conf ẩn => ẩn hộ c cột đó nhé", trả lời cho
 *     chính câu hỏi "cột HH F2 là HH cho cả căn của F2 hay cho đợt tiền về ghi nhận" (BA không
 *     chốt được nghĩa của cột nên bỏ).
 *  3. 17/08/2026 (`b257119fa`): cột được **sửa cho đúng giá trị** (đọc `f2_total_commission` do
 *     BE phục vụ sẵn) — tức đi ngược quyết định (2), vì người sửa bám mô tả gốc của task chứ
 *     không đọc thread comment.
 *  4. 19/08/2026: bỏ cột theo đúng (2).
 *
 * Nghĩa là trong repo vẫn còn nguyên `getDealRecognisedCommission` + docstring dài giải thích
 * cách tính đúng của "HH ghi nhận" (giữ lại vì màn **HH quản lý** vẫn dùng). Người đọc code sau
 * này rất dễ kết luận màn F2 "quên" gọi nó rồi nối cột trở lại — đúng như bước (3) đã xảy ra.
 * Guard này là chỗ duy nhất nói rằng việc bỏ cột là CỐ Ý.
 *
 * Hỏng im lặng: nối cột lại thì không lỗi, không cảnh báo, `tsc` xanh, mọi test xanh — chỉ BA mở
 * màn lên mới thấy. Bài học 86eydbph4 (7 cột bị gỡ im lặng, 13 ngày không ai biết) áp y nguyên.
 *
 * Guard đọc source thay vì render DOM: đo bộ cột phải đi ngược cây cha, mà
 * `testing-library/no-node-access` (bật ở `eslint.config.js`, `--max-warnings 0`) cấm đúng thao
 * tác đó. Xem `docs/ai/conventions.md` § "Viết test đo layout / đi ngược cây cha".
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const COMPONENT = join(dirname(fileURLToPath(import.meta.url)), 'CommF2MonthlyDetail.tsx')
const source = readFileSync(COMPONENT, 'utf8')

/**
 * Lát cắt của riêng bảng ①.
 *
 * File còn 3 bảng/khối khác dùng chung lối viết (`<th>`, `formatCurrencyVND`), nên đếm trên toàn
 * file là đếm nhầm bảng khác. Mọi phép đếm dưới đây chạy trong lát cắt này.
 */
const dealsTable = (() => {
  const startsAt = source.indexOf('Các deal đã chốt và góp vào HH kỳ này')
  expect(
    startsAt,
    'không còn tìm thấy tiêu đề bảng ① — guard mất hiệu lực, cập nhật lại mốc cắt'
  ).toBeGreaterThan(-1)

  const endsAt = source.indexOf('Section ②', startsAt)
  expect(
    endsAt,
    'không còn tìm thấy mốc "Section ②" — guard mất hiệu lực, cập nhật lại mốc cắt'
  ).toBeGreaterThan(-1)

  return source.slice(startsAt, endsAt)
})()

/**
 * Bỏ chú thích JSX trước khi đếm.
 *
 * BẮT BUỘC: chính chú thích giải thích việc ẩn cột có chứa nguyên văn chuỗi "HH F2 ghi nhận",
 * nên khớp trên bản còn chú thích là guard tự đánh lừa mình — nó sẽ "thấy" cột kể cả khi cột
 * đã bị gỡ.
 */
const markup = dealsTable.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

/** Nhãn của từng `<th>`, theo đúng thứ tự render. */
const headers = (() => {
  const openAt = markup.indexOf('<thead>')
  const closeAt = markup.indexOf('</thead>')
  expect(openAt, 'bảng ① không còn <thead>').toBeGreaterThan(-1)
  expect(closeAt, 'bảng ① không còn </thead>').toBeGreaterThan(openAt)

  return [...markup.slice(openAt, closeAt).matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
    m[1].replace(/\s+/g, ' ').trim()
  )
})()

/**
 * Bề rộng thật của một dòng, tính cả `colSpan`, ở một NHÁNH của cột nguồn.
 *
 * Cột "Đứng tên / Nhận hộ" của màn F2 render có điều kiện (`showSourceColumn` — người hưởng là
 * sàn nên gần như luôn chính chủ, xem `hasAnyProxySource`). Vì vậy `colSpan` viết dưới dạng
 * `{showSourceColumn ? 3 : 2}` và chính ô cột nguồn cũng nằm trong `{showSourceColumn && (…)}`.
 * Đo bề rộng phải đo TỪNG nhánh, không thì hai dòng gộp và dòng dữ liệu lệch nhau lúc chạy thật.
 */
function rowWidth(row: string, withSource: boolean): number {
  const cells = [...row.matchAll(/<td\b[^>]*>/g)]
  expect(cells.length, 'dòng không có ô nào — cắt sai lát').toBeGreaterThan(0)
  return cells.reduce((total, cell) => {
    const span = resolveSpan(cell[0], withSource)
    if (span === null) return total // ô của cột nguồn, không tồn tại ở nhánh này
    return total + span
  }, 0)
}

/** `colSpan` của một ô ở nhánh đang xét; `null` nghĩa là ô đó không render ở nhánh này. */
function resolveSpan(cellTag: string, withSource: boolean): number | null {
  const fixed = /colSpan=\{(\d+)\}/.exec(cellTag)
  if (fixed) return Number(fixed[1])
  const ternary = /colSpan=\{showSourceColumn \? (\d+) : (\d+)\}/.exec(cellTag)
  if (ternary) return Number(withSource ? ternary[1] : ternary[2])
  return 1
}

/** Số cột thực tế ở mỗi nhánh: `headers` đếm cả cột nguồn (nó vẫn nằm trong source). */
const widthWithSource = () => headers.length
const widthWithoutSource = () => headers.length - 1

describe('CommF2MonthlyDetail — bộ cột bảng deal (ClickUp 86eyh04b6)', () => {
  it('giữ đúng 8 cột, đúng thứ tự nghiệp vụ', () => {
    // Ba cột đầu render qua ô chung của `DealTableCells.tsx` (26/08/2026 — ba màn Sale/CTV/F2
    // dùng chung một bộ cột), nên nhãn đọc ra là biểu thức chứ không phải chuỗi thô.
    expect(headers).toEqual([
      '{DEAL_COLUMN_LABELS.code}',
      '{DEAL_COLUMN_LABELS.project}',
      '{DEAL_COLUMN_LABELS.source}',
      'Giá tính phí',
      '% F2',
      '% tiền về',
      'HH F2 thực tế',
      'HĐ đầu vào',
    ])
  })

  it('KHÔNG có cột "HH F2 ghi nhận" — BA chốt ẩn 11/08/2026, đừng nối lại', () => {
    const offenders = headers.filter((h) => h.includes('ghi nhận'))
    expect(
      offenders,
      'cột "HH F2 ghi nhận" đã quay lại bảng. Đây KHÔNG phải hồi quy cần sửa: BA đã chốt ẩn ' +
        '(ClickUp 86eyh04b6, reply 11/08/2026). Muốn hiện lại phải có yêu cầu mới từ BA.'
    ).toEqual([])
  })

  it('ô "không có giao dịch" trải đúng bề rộng bảng ở CẢ HAI nhánh cột nguồn', () => {
    const emptyCell = /<td colSpan=\{([^}]+)\}[^>]*py-12[^>]*>/.exec(markup)
    expect(emptyCell, 'không còn tìm thấy ô rỗng py-12 của bảng ①').not.toBeNull()
    const tag = `<td colSpan={${emptyCell?.[1]}}>`
    expect(resolveSpan(tag, true), 'colSpan lệch khi có cột nguồn ⇒ bảng vỡ').toBe(
      widthWithSource()
    )
    expect(resolveSpan(tag, false), 'colSpan lệch khi ẩn cột nguồn ⇒ bảng vỡ').toBe(
      widthWithoutSource()
    )
  })

  it('dòng TỔNG CỘNG rộng đúng bằng số cột ở CẢ HAI nhánh', () => {
    const labelAt = markup.indexOf('TỔNG CỘNG')
    expect(labelAt, 'bảng ① không còn dòng TỔNG CỘNG').toBeGreaterThan(-1)

    // Lùi về thẻ <tr> bao ngoài: nhãn "TỔNG CỘNG" nằm BÊN TRONG ô đầu tiên, cắt từ nhãn là bỏ
    // sót đúng ô đó và phép đếm luôn hụt 1.
    const totalRow = markup.slice(
      markup.lastIndexOf('<tr', labelAt),
      markup.indexOf('</tr>', labelAt)
    )
    expect(rowWidth(totalRow, true)).toBe(widthWithSource())
    expect(rowWidth(totalRow, false)).toBe(widthWithoutSource())
  })

  it('mỗi dòng deal có đúng một ô cho mỗi cột', () => {
    // Dòng dữ liệu là <tr> mang `key={i}` — phân biệt với <tr> của thead và của TỔNG CỘNG.
    const keyedAt = markup.indexOf('<tr key={i}')
    expect(keyedAt, 'không còn tìm thấy dòng deal (<tr key={i}>)').toBeGreaterThan(-1)
    const dataRow = markup.slice(keyedAt, markup.indexOf('</tr>', keyedAt))
    // Ô cột nguồn nằm trong `{showSourceColumn && (…)}`; ở nhánh ẩn nó không render.
    expect(rowWidth(dataRow, true)).toBe(widthWithSource())
    expect(rowWidth(dataRow, true) - 1).toBe(widthWithoutSource())
  })

  it('cột nguồn ẩn theo DỮ LIỆU, không xoá hẳn khỏi màn', () => {
    // Sàn gần như luôn tự đứng tên nên một cột toàn "chính chủ" là nhiễu; nhưng `_dispatch_f2`
    // đi qua đúng `_append_to_deal_group` như hai bucket kia nên nhận hộ VẪN có thể xảy ra —
    // xoá hẳn cột thì ca đó âm thầm hiện sai số, đúng lỗi đã sửa ở màn Sale.
    // `hasAnyProxySource` được gọi ở đầu component, ngoài lát cắt của riêng bảng ①.
    expect(source).toContain('hasAnyProxySource')
    expect(dealsTable).toMatch(/\{showSourceColumn && \(/)
  })
})

describe('CommF2MonthlyDetail — thứ KHÔNG được xoá kèm', () => {
  it('giữ nhãn card Diễn giải "HH F2 ghi nhận từ các deal"', () => {
    // Cùng chữ với cột vừa bỏ nhưng là đại lượng KHÁC: nhãn này dán lên `summary.f2_total`
    // (= tổng `subtotal` = cột "HH F2 thực tế"). Chủ dự án đã chốt giữ nhãn cũ ngày 17/08/2026
    // (`b23e67f24`) — xem docs/ai/domain/accounting-vouchers-commissions.md.
    expect(
      source,
      'nhãn card Diễn giải bị xoá nhầm khi dọn cột — nó KHÔNG thuộc phạm vi 86eyh04b6'
    ).toContain('label="HH F2 ghi nhận từ các deal"')
  })
})
