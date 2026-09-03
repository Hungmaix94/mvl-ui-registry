/**
 * Guard cho BỘ CỘT CHUNG của ba bảng deal — màn HH Sale, HH CTV (hai bảng) và HH F2.
 *
 * Ba màn có cột tiền khác nhau nhưng ba cột đầu (mã deal · dự án · đứng tên) là CÙNG một thứ
 * nghiệp vụ. Trước 26/08/2026 mỗi màn tự viết lại nên lệch nhau lặng lẽ: chỉ Sale có link mã
 * căn + phiếu chia, chỉ F2 link tên dự án, CTV nhét badge nhận hộ vào cột "Mã deal" còn Sale
 * đã tách cột riêng. Ba ô đó nay sống ở `DealTableCells.tsx`; guard này chặn việc một màn
 * quay lại tự dựng ô của riêng nó.
 *
 * Guard thứ hai: bảng Sale phải CỘNG tiền theo `pct_type`, không `find`. BE gom
 * `sources.*.by_deal` theo `deal_id` (`_append_to_deal_group`), nên người nhận hộ N sale trên
 * cùng một căn có N item cùng `pct_sale_commission` trong MỘT group. Bản cũ dùng `.find()`:
 *
 *   summary 42 · deal HD06-2026-000001 · kỳ 08/2026 — nhận hộ Đạt + Hoàng + Cường
 *   cột "HH bán hàng" in 19.173.982   (item ĐẦU)
 *   cột "HH ghi nhận" in 48.208.869   (`subtotal`, BE đã cộng đủ)
 *
 * Hỏng im lặng: `tsc` xanh, không warning, các cột vẫn ra số đẹp — chỉ kế toán cộng tay mới
 * phát hiện. Hai màn CTV/F2 còn mang `@ts-nocheck` nên lưới an toàn ở đó mỏng hơn nữa.
 *
 * Guard đọc source thay vì render DOM: quan hệ "dòng deal ↔ dòng con" phải đi ngược cây cha, mà
 * `testing-library/no-node-access` (bật ở `eslint.config.js`, `--max-warnings 0`) cấm đúng thao
 * tác đó. Xem `docs/ai/conventions.md` § "Viết test đo layout / đi ngược cây cha".
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Source đã bỏ chú thích. Cần thiết vì chính các file này ghi lại lỗi cũ trong docstring —
 * `deal.items.find(pct_type)`, `Dự án · KH` — nên grep trên source thô sẽ báo đỏ đúng dòng
 * giải thích tại sao không được viết như vậy.
 */
const readCode = (file: string) =>
  readFileSync(join(HERE, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const saleTable = readCode('SaleDealCommissionTable.tsx')
const sharedCells = readCode('DealTableCells.tsx')

/** Ba bảng deal tiêu thụ bộ ô chung. Bảng Sale ở file riêng, CTV có HAI bảng trong một file. */
const CONSUMERS = [
  { name: 'Sale — Mục ①', code: saleTable },
  {
    name: 'CTV — bảng ① HH CTV + bảng ② nhận hộ sàn F2',
    code: readCode('CommCtvMonthlyDetail.tsx'),
  },
  { name: 'F2 — Mục ①', code: readCode('CommF2MonthlyDetail.tsx') },
]

describe('Ba màn dùng chung một bộ cột deal', () => {
  it.each(CONSUMERS)('$name render qua ô chung, không tự dựng lại', ({ code }) => {
    for (const cell of ['DealCodeCell', 'DealProjectCell', 'DealSourceCell']) {
      expect(code, `thiếu ${cell} — cột này sẽ lệch với hai màn kia`).toContain(cell)
    }
  })

  it.each(CONSUMERS)('$name lấy nhãn cột từ hằng số dùng chung', ({ code }) => {
    expect(code).toContain('DEAL_COLUMN_LABELS.code')
    expect(code).toContain('DEAL_COLUMN_LABELS.project')
    expect(code).toContain('DEAL_COLUMN_LABELS.source')
  })

  it.each(CONSUMERS)('$name không còn tiêu đề "Dự án · KH"', ({ code }) => {
    // Tên khách chỉ là dòng chú thích dưới tên dự án, không phải một cột thứ hai bị dồn vào.
    expect(code).not.toContain('Dự án · KH')
  })

  it.each(CONSUMERS)('$name không tự lấy người nhận hộ ĐẦU TIÊN nữa', ({ code }) => {
    // getDealProxyInfo = `items.find(received_on_behalf)` — chỉ trả người đầu, nên một người
    // nhận hộ ba sale đọc ra như nhận hộ một người.
    expect(code).not.toContain('getDealProxyInfo')
  })
})

describe('Ô chung — ba entry point mà bố cục cũ thiếu', () => {
  it('mã căn link sang màn chi tiết căn', () => {
    expect(sharedCells).toContain('APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL')
    expect(sharedCells).toContain('deal.unit_id')
  })

  it('có link sang phiếu chia (màn 20.8), gated bằng quyền xem worksheet', () => {
    expect(sharedCells).toContain('APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL')
    expect(sharedCells).toMatch(/canViewSplitSheet && deal\.worksheet_id/)
  })

  it('tên dự án là link', () => {
    expect(sharedCells).toContain('APP_PATH.PROJECT_MANAGEMENT_DETAIL')
  })

  it('màn Sale không còn cột "Ngày thu" in cứng gạch ngang', () => {
    expect(
      saleTable,
      'BE trả receipt_dates từ lâu, cột cũ vẫn in "—" — nay ngày thu nằm dưới ô "% tiền về"'
    ).not.toContain('whitespace-nowrap text-neutral-400">—<')
    expect(saleTable).toContain('DealReceiptDates')
  })
})

describe('Ô chung — pill dùng đúng cặp màu của bảng chia thực nhận', () => {
  it('chính chủ xanh lá, nhận hộ hổ phách — cùng màu màn 20.8', () => {
    // `RecipientPayoutTable` / `RecipientSplitEditor` ghi cứng #DCFCE7/#166534 và
    // #FEF3C7/#92400E; green-100/800 và amber-100/800 của Tailwind ĐÚNG BẰNG bốn mã đó.
    // Đi giữa hai màn mà quy ước màu đổi là kế toán phải học lại — đừng đổi một bên.
    expect(sharedCells).toMatch(/OWN_PILL[^\n]*bg-green-100 text-green-800/)
    expect(sharedCells).toMatch(/PROXY_PILL[^\n]*bg-amber-100 text-amber-800/)
  })

  it('nhãn chữ thường, khớp bảng chia thực nhận', () => {
    expect(sharedCells).toContain('>chính chủ<')
    // Chữ thường áp cho NỘI DUNG pill; tooltip vẫn là câu hoàn chỉnh nên viết hoa đầu câu.
    expect(sharedCells).toMatch(/`nhận hộ \$\{partial\}`/)
  })
})

describe('Ô chung — badge nhận hộ không được vỡ', () => {
  it('pill không ôm tên người; tên xuống dòng riêng để truncate', () => {
    // Bảng kê 45: "Nhận hộ · NV Nguyễn Quỳnh Trang · 50%" wrap giữa pill, vỡ viền bo.
    expect(sharedCells).toContain('source.ownerLabel')
    expect(
      sharedCells,
      'pill phải nowrap — nội dung tối đa "nhận hộ 50%", không được xuống dòng'
    ).toMatch(/SOURCE_PILL_BASE[\s\S]{0,200}whitespace-nowrap/)
  })

  it('cột đứng tên có bề rộng cố định để tên dài bị cắt chứ không ngắt dòng', () => {
    expect(sharedCells).toContain('w-[190px]')
  })

  it('nhiều nguồn thì liệt kê ĐỦ, dù bảng có dựng được dòng con hay không', () => {
    // Không có onToggle (CTV/F2) → xếp chồng badge; có onToggle (Sale) → nút bung dòng con.
    expect(sharedCells).toMatch(/if\s*\(!onToggle\)/)
    expect(sharedCells).toContain('summariseSources')
  })
})

describe('Bảng Sale — cộng theo pct_type, không find', () => {
  it('không dùng items.find() để lấy tiền theo pct_type', () => {
    expect(
      saleTable,
      'lấy item ĐẦU của một pct_type: deal nhận hộ nhiều người sẽ in thiếu tiền — dùng ' +
        'sumDealItemsByPctType / sumSourceByPctType'
    ).not.toMatch(/items\??\.find\s*\(/)
  })

  it('bốn cột tiền của dòng deal đều đi qua hàm cộng', () => {
    for (const pctType of ['PCT.F1_SALE.pct', 'PCT.F1_BONUS.pct', 'PCT.F1_INVESTOR_BONUS.pct']) {
      expect(saleTable).toContain(`sumDealItemsByPctType(deal, ${pctType})`)
    }
    // "Thưởng MV" khớp qua isStaffIncentivePctType — pct_type duy nhất không có tiền tố.
    expect(saleTable).toContain('getDealStaffIncentive(deal)')
  })

  it('"HH ghi nhận" đọc getDealRecognisedTotal, "HH thực tế" đọc subtotal', () => {
    // Trước 26/08/2026 cả hai cột đều in `Number(deal.subtotal)`, khiến hai cột "% tiền về"
    // nằm giữa chúng không giải thích được gì.
    expect(saleTable).toContain('formatMoneyOrDash(getDealRecognisedTotal(deal))')
    expect(saleTable).toContain('formatCurrencyVND(Number(deal.subtotal))')
    expect(
      (saleTable.match(/Number\(deal\.subtotal\)/g) || []).length,
      '`subtotal` chỉ được xuất hiện ở đúng cột "HH thực tế"'
    ).toBe(1)
  })

  it('không còn hai cột người nhận mail (bỏ 26/08/2026 để ba màn cùng bộ cột)', () => {
    expect(saleTable).not.toContain('Nhân viên nhận mail')
    expect(saleTable).not.toContain('DealRecipientEditableCell')
  })
})

describe('Bảng CTV cũng phải cộng, không find', () => {
  const ctv = readCode('CommCtvMonthlyDetail.tsx')

  it('cột HH CTV / Thưởng đi qua sumDealItemsByPctType', () => {
    // Cùng lỗi tiềm ẩn với màn Sale: CTV nhận hộ nhiều sale trên một căn thì `.find()` in thiếu.
    expect(ctv).toContain('sumDealItemsByPctType')
    expect(ctv).not.toMatch(/items\??\.find\s*\(/)
  })

  it('"% HH" là tổng phần của người hưởng, không phải rate của một share', () => {
    expect(ctv).toContain('getDealAggregateCommissionPct')
    expect(ctv).not.toContain('getDealEffectiveCommissionPct')
  })
})
