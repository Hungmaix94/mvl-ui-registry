/**
 * Guard: báo cáo 20.9 "Thanh toán HH F2/Sàn" phải giữ đủ bộ ba cột tiền
 * `Tổng HH F2 được hưởng` → `HH F2 nhận` → `CTV nhận hộ`, ĐÚNG thứ tự đó, và **không**
 * có lại 2 cột `STK Ngân hàng` / `Chủ tài khoản`.
 *
 * Vì sao cần guard:
 *
 *  1. Bộ ba cột là một phép phân hoạch, không phải 3 số rời:
 *     `HH F2 nhận` + `CTV nhận hộ` = `Tổng HH F2 được hưởng`. BE bảo đảm bất biến này
 *     ở `f2_payment_report_service.enrich_rows` (có assert). Gỡ hoặc đảo một cột thì
 *     bảng vẫn render bình thường, `tsc` vẫn xanh — chỉ kế toán mở lên mới thấy hai cột
 *     không cộng ra cột thứ ba. Đúng kiểu hỏng im lặng.
 *  2. `sales_f2` / `bank_account_no` / `bank_account_owner` từng bị **bỏ khỏi spec** ở
 *     FSD 20.9 changelog 2026-07-22 (PR #2699, "F2 không có khái niệm STK/NVKD người
 *     nhận ở báo cáo này") nhưng FE vẫn giữ nguyên 3 cột đó suốt từ đó, render `-` vì BE
 *     không trả field — `ExchangeDropdownSerializer` cũng chỉ có id/code/name.
 *     Ngày 2026-08-24 BA mở lại **duy nhất** `Sales F2` và giữ bỏ 2 cột ngân hàng.
 *     Người đọc code sau này rất dễ thấy `Sales F2` sống lại rồi nối luôn 2 cột kia về.
 *     Guard này là chỗ duy nhất nói việc bỏ 2 cột ngân hàng là CỐ Ý.
 *
 * Guard đọc source thay vì render DOM: đo bộ cột phải đi ngược cây cha, mà
 * `testing-library/no-node-access` (bật ở `eslint.config.js`, `--max-warnings 0`) cấm đúng
 * thao tác đó. Xem `docs/ai/conventions.md` § "Viết test đo layout / đi ngược cây cha".
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const COMPONENT = join(dirname(fileURLToPath(import.meta.url)), 'F2PaymentReportTable.tsx')
const source = readFileSync(COMPONENT, 'utf8')

/**
 * Bỏ chú thích trước khi khớp.
 *
 * BẮT BUỘC: chính chú thích trong component giải thích vì sao 2 cột ngân hàng bị bỏ, và
 * chuỗi giải thích đó có chứa nguyên văn tên cột — khớp trên bản còn chú thích là guard
 * tự đánh lừa mình.
 */
const code = source.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const headerAt = (label: string) => code.indexOf(`header: '${label}'`)

describe('F2PaymentReportTable — bộ cột', () => {
  it('giữ đủ bộ ba cột tiền, đúng thứ tự phân hoạch A → B → C', () => {
    const entitlement = headerAt('Tổng HH F2 được hưởng')
    const received = headerAt('HH F2 nhận')
    const proxy = headerAt('CTV nhận hộ')

    expect(entitlement, 'mất cột "Tổng HH F2 được hưởng" (A)').toBeGreaterThan(-1)
    expect(received, 'mất cột "HH F2 nhận" (B)').toBeGreaterThan(-1)
    expect(proxy, 'mất cột "CTV nhận hộ" (C)').toBeGreaterThan(-1)

    expect(entitlement, 'A phải đứng trước B — đọc là "được hưởng, trong đó nhận"').toBeLessThan(
      received
    )
    expect(received, 'B phải đứng ngay trước C — B + C = A, tách rời thì mất nghĩa').toBeLessThan(
      proxy
    )
  })

  it('cột B đọc f2_received_amount, KHÔNG phải total', () => {
    // Sec 2.1-bis của plan: `total` là expected của cả account, gồm cả tiền sàn này đứng
    // tên nhận hộ CHO NGƯỜI KHÁC. Lấy `total` làm B là làm vỡ A = B + C đúng lúc báo cáo
    // đang cần giải thích một vụ nhận hộ.
    const block = code.slice(headerAt('HH F2 nhận'), headerAt('CTV nhận hộ'))
    expect(block).toContain('receivedOf(row.original)')
    expect(block, 'cột B không được lấy từ row.original.total').not.toContain('row.original.total')
  })

  it('KHÔNG có lại 2 cột ngân hàng — BA chốt bỏ, đừng nối lại', () => {
    for (const label of ['STK Ngân hàng', 'Chủ tài khoản']) {
      expect(
        code.includes(`header: '${label}'`),
        `cột "${label}" đã quay lại bảng. Đây KHÔNG phải hồi quy cần sửa: FSD 20.9 ` +
          'changelog 2026-07-22 bỏ nó khỏi spec và BA giữ nguyên quyết định đó ngày ' +
          '2026-08-24 (chỉ mở lại "Sales F2"). Nếu BA đổi ý thì sửa guard này kèm ' +
          'changelog mới, đừng nối cột suông.'
      ).toBe(false)
    }
  })

  it('cột Trạng thái đọc status thật, không hardcode', () => {
    const block = code.slice(headerAt('Trạng thái'))
    expect(block, 'trạng thái bị hardcode trở lại').not.toContain("'Đã xác nhận'")
    expect(block).toContain('STATUS_LABEL')
  })
})
