/**
 * Guard: tổng của phần đang lọc ở mục HHQL phải đọc từ khối `summary` do BE trả về —
 * KHÔNG được cộng lại các dòng đang hiện trên trang. CR ClickUp 86ey9mytk.
 *
 * Cạm bẫy này khác các guard cạnh đây ở chỗ nó **không nổ, không đỏ, không lệch rõ ràng**: lọc ra
 * 40 dòng rải 4 trang, trang 1 hiện 10 dòng, cộng lại ra một con số vẫn đẹp và vẫn có đơn vị "đ".
 * Không ai soi ra bằng mắt, kể cả QA — chỉ khi kế toán đối chiếu mới lòi. Đây là màn tiền, số sai
 * ở đây đi thẳng vào bảng kê gửi nhân viên.
 *
 * Backend đã dựng sẵn `HhqlLineSummaryPagination` để trả tổng của TOÀN tập đã lọc; guard này canh
 * FE thật sự dùng nó. Cùng họ với luật vàng ở `docs/ai/patterns.md` và với
 * `CommMgrDetail.section-total.guard.test.ts` (canh header không tự cộng `lines`).
 *
 * Guard đọc source thay vì render, cùng lý do đã ghi ở `CommMgrDetail.backoffice.guard.test.ts`:
 * con số nằm trong biến nội bộ của component, đo bằng DOM phải đi ngược cây cha — thao tác bị
 * `testing-library/no-node-access` cấm.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const COMPONENT = join(dirname(fileURLToPath(import.meta.url)), 'CommMgrDetail.tsx')
const source = readFileSync(COMPONENT, 'utf8')

/** Vị trí một mốc trong source — NÉM khi không thấy, để guard không xanh giả khi mốc bị đổi tên. */
function viTri(moc: string, tu = 0): number {
  const i = source.indexOf(moc, tu)
  if (i < 0) throw new Error(`không tìm thấy mốc "${moc}" trong CommMgrDetail.tsx`)
  return i
}

/** Thân của `KpiHhqlTable` — từ chỗ khai tới hết component (mốc component kế tiếp). */
function thanBangHhql(): string {
  const batDau = viTri('const KpiHhqlTable = ({')
  const ketThuc = source.indexOf('\nconst ', batDau + 20)
  return source.slice(batDau, ketThuc > -1 ? ketThuc : undefined)
}

describe('CommMgrDetail — bộ lọc org mục HHQL (CR 86ey9mytk)', () => {
  it('tổng phần đang lọc đọc từ `summary` của BE', () => {
    const than = thanBangHhql()

    expect(
      /data\?\.summary\?\.amount/.test(than),
      'không thấy đọc `data?.summary?.amount` — tổng của bộ lọc phải do BE tính trên toàn tập, ' +
        'FE chỉ cầm một trang nên không tự cộng đúng được'
    ).toBe(true)
  })

  it('KHÔNG cộng lại `rows` để ra tiền', () => {
    const than = thanBangHhql()
    // `rows` là kết quả của MỘT trang. Mọi phép gộp trên nó đều cho ra con số mang nghĩa "trang
    // này" trong khi nhãn trên màn đọc là "phần đang lọc".
    const pham = /rows\s*\.\s*reduce|rows\s*\.\s*map\([^)]*\)\s*\.\s*reduce/.test(than)

    expect(
      pham,
      'có phép `rows.reduce(...)` trong KpiHhqlTable — cộng một trang rồi gắn nhãn của cả bộ lọc; ' +
        'dùng `data.summary.amount` thay vì tự cộng'
    ).toBe(false)
  })

  it('số đếm dòng khớp cũng lấy từ `summary`, không lấy `rows.length`', () => {
    const than = thanBangHhql()

    expect(
      /summary\?\.line_count/.test(than),
      'số "N dòng khớp" phải đọc `summary.line_count`; `rows.length` chỉ là số dòng của trang'
    ).toBe(true)
  })

  it('tham số gửi API đi qua `toHhqlApiParams`, không tự dựng tay', () => {
    const than = thanBangHhql()

    expect(
      /toHhqlApiParams\(/.test(source) && /\.\.\.apiFilter/.test(than),
      'phải dùng `toHhqlApiParams` — nó là nơi duy nhất biết tham số phải mang tiền tố `kpi_`. ' +
        'Tự dựng tay rất dễ gõ `department`, mà tên đó bị filterset màn danh sách bắt trước và ' +
        'làm API trả 404 thay vì danh sách rỗng.'
    ).toBe(true)
  })

  it('không có tham số trần `department:` / `branch:` gửi lên endpoint hhql-lines', () => {
    const than = thanBangHhql()
    const goiHook = than.slice(than.indexOf('useManagementHhqlLines'))
    const doanGoi = goiHook.slice(0, goiHook.indexOf('})') + 2)

    expect(
      /\b(branch|block|department)\s*:/.test(doanGoi),
      `lời gọi useManagementHhqlLines đang mang tham số không có tiền tố kpi_:\n${doanGoi}`
    ).toBe(false)
  })

  it('header mục HHQL vẫn giữ Tổng nhóm của CẢ phiếu, không đổi theo bộ lọc', () => {
    // Luật của CR 86eynz1a2 (STT54): header luôn là `breakdown.hhql` = `summary.hhql_total`.
    // Nếu ai đó "sửa cho nhất quán" để header chạy theo bộ lọc thì kế toán mở phiếu, lỡ để bộ
    // lọc, rồi đọc nhầm số tiền phải chi.
    // Mốc cắt bám mục HHQL. Màn đánh số lại 1→6 ngày 20/08/2026 khi gỡ hai rổ tiền của đợt chi
    // Sale, nên HHQL từ ③ thành ②; cắt tới mục kế tiếp (③ SLK).
    const batDau = viTri('{/* Section ②')
    const ketThuc = viTri('{/* Section ③', batDau)
    const khoi = source.slice(batDau, ketThuc)

    expect(khoi).toContain('<SectionTotal value={breakdown.hhql} />')
  })
})
