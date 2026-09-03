/**
 * Guard: cột `promo_total` ở CẢ BA bảng "HH theo tháng" phải đọc nhãn từ một nguồn duy nhất
 * (`ROLE_LABELS[SourceRole.PROMO]`), và nguồn đó không được là nhãn của loại thưởng AD_SUPPORT.
 *
 * Vì sao cần guard:
 *
 *  1. 2026-08-06 (CR ClickUp 86eyj2er9): `promo_total` được đặt nhãn literal "Hỗ trợ quảng cáo"
 *     ở bảng Quản lý, cho khớp 3 export Sale/CTV/F2 vốn đã dùng chữ đó.
 *  2. 2026-08-21 (ClickUp 86eykqe00): BA Nhung Nguyễn phát hiện màn list và màn chi tiết gọi
 *     CÙNG một con số bằng hai cái tên — "E map lại cho c list đồng nhất vs chi tiết nhé".
 *     Nặng hơn: "Hỗ trợ quảng cáo" là nhãn CÓ THẬT của loại thưởng `AD_SUPPORT`
 *     (`ImportedBonusEntryDialog`, `CommSummaryAdjustmentDialog`, BE `constants.py:342`), nên
 *     một cái tên đang gọi hai rổ tiền khác nhau.
 *
 * Hỏng im lặng: gõ lại chuỗi literal vào `header` của một trong ba bảng thì không lỗi, không
 * cảnh báo, mọi test khác vẫn xanh — chỉ kế toán mở màn lên mới thấy list lệch chi tiết. Và hai
 * trong ba bảng (`CommSaleMonthlyTable`, `CommEmployeeTable`) KHÔNG có test render nào, nên đây
 * là chỗ duy nhất canh chúng.
 *
 * Guard đọc source thay vì render: hai bảng kia cần cả một cây provider/query để render, trong
 * khi thứ cần canh chỉ là "header trỏ về đâu" — đọc source trả lời đúng câu đó và không phụ
 * thuộc dữ liệu giả.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  ROLE_LABELS,
  SourceRole,
} from '@/features/accounting/monthly-summaries/components/MonthlySummaryConstants'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Nhãn AD_SUPPORT — khái niệm KHÁC, phải giữ nguyên chữ này ở nơi của nó. */
const AD_SUPPORT_LABEL = 'Hỗ trợ quảng cáo'

/** Ba bảng cùng render `promo_total`. Thiếu một cái là nó lặng lẽ trôi khỏi hai cái kia. */
const TABLES = [
  'CommMgrMonthlyTable.tsx',
  'CommSaleMonthlyTable.tsx',
  'CommEmployeeTable.tsx',
] as const

const sourceOf = (file: string) => readFileSync(join(HERE, file), 'utf8')

/**
 * Cắt bỏ comment để phép đếm chỉ nhìn vào code chạy được.
 *
 * Cần thiết vì các file này CÓ nhắc "Hỗ trợ quảng cáo" trong comment giải thích vì sao không
 * dùng nó nữa — đếm cả comment là guard tự báo động vì chính lời giải thích của mình.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('promo_total — một nhãn, một nguồn (86eykqe00)', () => {
  it('nhãn nguồn đúng là nhãn PROMO, không phải nhãn AD_SUPPORT', () => {
    // Chuỗi ghim literal ở đây là CHỦ ĐÍCH: nếu vế phải cũng đọc ROLE_LABELS thì hai vế cùng
    // nguồn và phép so thành rỗng — đổi map thành chữ gì test cũng xanh.
    expect(ROLE_LABELS[SourceRole.PROMO]).toBe('HH Đầu tư, Xúc tiến & PT Dự án')
    expect(ROLE_LABELS[SourceRole.PROMO]).not.toBe(AD_SUPPORT_LABEL)
  })

  it.each(TABLES)('%s lấy header cột promo_total từ ROLE_LABELS', (file) => {
    const code = stripComments(sourceOf(file))
    const HEADER = 'header: ROLE_LABELS[SourceRole.PROMO]'

    const headerAt = code.indexOf(HEADER)
    expect(
      headerAt,
      `${file} phải đọc nhãn từ ROLE_LABELS[SourceRole.PROMO] để không trôi khỏi màn chi tiết`
    ).toBeGreaterThan(-1)

    // Neo vào ĐÚNG cột promo_total, không chỉ "có mặt đâu đó trong file": gắn nhãn PROMO lên một
    // cột khác rồi để promo_total mang nhãn thứ ba là hỏng y hệt, mà phép `toContain` trần không
    // thấy. Cửa sổ ±400 ký tự đủ bao một ColumnDef của repo này (id/accessorKey · header · cell).
    const around = code.slice(Math.max(0, headerAt - 400), headerAt + 400)
    expect(
      around,
      `${file}: nhãn PROMO không nằm cùng ColumnDef với promo_total — đang gắn nhầm cột`
    ).toContain('promo_total')
  })

  it.each(TABLES)('%s không gõ lại nhãn AD_SUPPORT làm header', (file) => {
    const code = stripComments(sourceOf(file))

    expect(
      code,
      `${file} đang gọi promo_total là "${AD_SUPPORT_LABEL}" — đó là tên của loại thưởng AD_SUPPORT`
    ).not.toContain(AD_SUPPORT_LABEL)
  })
})
