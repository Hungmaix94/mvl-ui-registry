/**
 * Guard: bảng kê HHQL phải giải thích được ĐỦ số tổng của chính nó (ClickUp 86eykq956).
 *
 * Cạm bẫy gốc: đầu bảng kê in một con số tổng lấy từ MỘT nguồn, còn danh sách "DIỄN GIẢI" bên dưới
 * cộng từ MỘT nguồn khác. Rổ tiền nào có trong nguồn tổng mà thiếu trong danh sách sẽ **không báo
 * lỗi gì cả**: các mục vẫn hiện, chỉ là cộng lại không ra tổng.
 *
 * Đã xảy ra thật **hai lần**:
 *
 *  1. Hoa hồng khối hỗ trợ (`backoffice_total`) không có mặt trong `breakdown`, nên bảng kê của
 *     MV000000002 kỳ 07/2026 hiện **cả 7 mục = 0 đ trong khi Tổng = 809.407 đ**.
 *  2. Bảng kê chỉ liệt kê tiền đợt chi QUẢN LÝ nhưng in các field header của summary
 *     (`pre_tax_total` / `hold_amount` / `pit_amount` / `net_payable`) — đều là số của **cả kỳ,
 *     gộp đợt SALE**. Đo trên mvl_local_staging: summary #3 kỳ 07/2026 in các mục cộng lại
 *     **2.857.385 đ dưới một cái tổng 38.574.696 đ**.
 *
 * Đây là chứng từ có nút *Xuất PDF* / *Gửi bảng kê* — sai ở đây là sai trên giấy gửi cho nhân viên.
 *
 * Cách chữa (2) là lấy số tổng từ `payout_waves` — khối BE tính riêng cho từng đợt chi, cân bằng
 * theo thiết kế `payable − hold − pit − other_deductions === net` (xem
 * `monthly_summary_service.build_wave_breakdown` + `test_payout_wave.py`).
 *
 * Guard đọc source thay vì render: `breakdown` là biến nội bộ của component, không có đường nào
 * chạm tới từ ngoài, và đo bằng DOM thì phải đi ngược cây cha — thao tác bị
 * `testing-library/no-node-access` cấm (xem `CommMgrDetail.promo-columns.guard.test.ts`).
 *
 * Thêm rổ tiền mới vào đợt chi quản lý ⇒ thêm một dòng vào `BUCKETS_PHAI_CO`, và nhớ nối nó vào
 * `breakdown` + `totalBreakdown` + `structureTiles` — đúng ba chỗ guard này canh.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const COMPONENT = join(dirname(fileURLToPath(import.meta.url)), 'CommMgrDetail.tsx')
const PAGE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../pages/authenticated/accounting/commissions/CommMgrDetailPage.tsx'
)
const LIST = join(dirname(fileURLToPath(import.meta.url)), 'CommMgrMonthlyTable.tsx')
const source = readFileSync(COMPONENT, 'utf8')
const pageSource = readFileSync(PAGE, 'utf8')
const listSource = readFileSync(LIST, 'utf8')

/**
 * Field header của summary — số của CẢ KỲ (hai đợt chi cộng lại).
 *
 * Không field nào trong đây được xuất hiện ở phần tổng của bảng kê: màn này chỉ liệt kê tiền đợt
 * chi QUẢN LÝ, in số cả kỳ lên là lỗi (2) ở docstring. Chúng phải đến từ `payout_waves`.
 */
const FIELD_CA_KY: readonly string[] = [
  'pre_tax_total',
  'hold_amount',
  'pit_amount',
  'net_payable',
  'recovered_advance_amount',
]

/** Cột subtotal của đợt chi quản lý → biểu thức tiền tương ứng trong `totalBreakdown`. */
const BUCKETS_PHAI_CO: ReadonlyArray<readonly [string, string]> = [
  ['promo_total', 'breakdown.groupA'],
  ['hhql_total', 'breakdown.hhql'],
  ['slk_total', 'breakdown.slk'],
  ['backoffice_total', 'breakdown.backoffice'],
  ['project_director_total', 'breakdown.directorCommission'],
]

/**
 * Rổ tiền của đợt chi SALE — CỐ TÌNH không có mặt trên bảng kê này (20/08/2026).
 *
 * `WAVE_FOR_ROLE` phía BE xếp cả `SALE` (HH bán hàng cá nhân) lẫn `BONUS` (Thưởng thực chi trong
 * kỳ) vào đợt chi SALE, còn màn này là chứng từ của đợt chi MGMT. Hai rổ đó đã có bảng kê riêng ở
 * màn 20.8.1; in lại ở đây là in trùng chứng từ, mà cộng vào tổng thì sai tiền.
 */
const BUCKETS_CUA_DOT_SALE: ReadonlyArray<readonly [string, string]> = [
  ['sale_total', 'breakdown.sale'],
  ['bonus_total', 'breakdown.bonus'],
]

function catLatCat(batDau: string, ketThuc: string): string {
  const i = source.indexOf(batDau)
  expect(i, `không tìm thấy "${batDau}" trong CommMgrDetail.tsx`).toBeGreaterThan(-1)
  const j = source.indexOf(ketThuc, i)
  expect(j, `không tìm thấy "${ketThuc}" sau "${batDau}"`).toBeGreaterThan(-1)
  return source.slice(i, j)
}

/** Bỏ dòng comment trước khi bóc biểu thức — comment có nhắc tên biến, đếm vào là đếm nhầm. */
function boComment(than: string): string {
  return than
    .split('\n')
    .filter((dong) => !dong.trim().startsWith('//') && !dong.trim().startsWith('*'))
    .join('\n')
}

/**
 * Chỉ giữ lại CODE: bỏ cả comment khối (`/* *\/`, `{/* *\/}`) lẫn comment dòng.
 *
 * Cần thiết cho các assert dạng "không được còn chuỗi X": chính comment giải thích *vì sao* đã gỡ
 * X lại chứa chuỗi X, nên assert trên source thô sẽ đỏ vĩnh viễn và ép người sau xoá lời giải
 * thích để test xanh — đúng thứ không được để xảy ra.
 */
function chiCode(than: string): string {
  return boComment(than.replace(/\/\*[\s\S]*?\*\//g, ''))
}

/** Tập biểu thức tiền (`breakdown.x`) xuất hiện trong một lát cắt source. */
function bieuThucTien(than: string): Set<string> {
  return new Set(boComment(than).match(/\bbreakdown\.\w+\b/g) || [])
}

const thanBreakdown = catLatCat('const breakdown = useMemo(', 'const totalBreakdown')
const thanTotalBreakdown = catLatCat('const totalBreakdown =', '// Điều chuyển hoa hồng')
const thanStructureTiles = catLatCat('const structureTiles = [', '\n  ]\n')
/** Phần tổng của panel Diễn giải: từ dòng tổng trước thuế tới hết dòng THỰC NHẬN. */
const thanPhanTong = catLatCat(
  'label="Tổng hoa hồng quản lý trước thuế"',
  '</div>\n          </div>'
)

describe('CommMgrDetail — bảng kê phải cộng ra đúng tổng của nó', () => {
  it('mọi rổ tiền của đợt chi quản lý đều có mặt trong breakdown', () => {
    const thieu = BUCKETS_PHAI_CO.filter(([cot]) => !thanBreakdown.includes(cot)).map(
      ([cot]) => cot
    )

    expect(
      thieu,
      `breakdown thiếu rổ tiền: ${thieu.join(', ')} — mục diễn giải sẽ cộng không ra tổng của đợt chi`
    ).toEqual([])
  })

  it('mọi rổ tiền đều được cộng vào totalBreakdown', () => {
    const co = bieuThucTien(thanTotalBreakdown)
    const thieu = BUCKETS_PHAI_CO.filter(([, bt]) => !co.has(bt)).map(([, bt]) => bt)

    expect(
      thieu,
      `totalBreakdown bỏ sót: ${thieu.join(', ')} — tổng của phần diễn giải sẽ nhỏ hơn tiền thật`
    ).toEqual([])
  })

  it('"Cấu trúc HH" có ĐÚNG một ô cho mỗi khoản đang nằm trong mẫu số', () => {
    // Lỗi thật (20/08/2026): `totalBreakdown` cộng cả `directorCommission` + `backoffice` nhưng
    // khối "Cấu trúc HH" chỉ viết tay 6 ô và **thiếu hẳn hai mục đó** ⇒ tỷ trọng của mọi ô còn
    // lại bị pha loãng bởi tiền không hiện ở đâu cả, và Σ các ô không bao giờ ra 100%.
    const trongMauSo = bieuThucTien(thanTotalBreakdown)
    const coO = bieuThucTien(thanStructureTiles)

    const thieuO = [...trongMauSo].filter((bt) => !coO.has(bt))
    const thuaO = [...coO].filter((bt) => !trongMauSo.has(bt))

    expect(
      { thieuO, thuaO },
      'mỗi khoản trong totalBreakdown phải có đúng một ô "Cấu trúc HH" và ngược lại — lệch là tỷ trọng "% của tổng" sai'
    ).toEqual({ thieuO: [], thuaO: [] })
  })

  it('không rổ tiền nào của đợt chi SALE lọt vào bảng kê quản lý', () => {
    const coO = bieuThucTien(thanStructureTiles)
    const sot = BUCKETS_CUA_DOT_SALE.filter(
      ([cot, bt]) => thanBreakdown.includes(cot) || thanTotalBreakdown.includes(bt) || coO.has(bt)
    ).map(([cot]) => cot)

    expect(
      sot,
      `${sot.join(', ')} là tiền đợt chi SALE nhưng vẫn nằm trong breakdown/totalBreakdown/structureTiles — bảng kê quản lý sẽ cộng thừa`
    ).toEqual([])
  })

  it('không còn mục / bảng / workflow nào của hai rổ tiền đợt SALE', () => {
    expect(source).not.toContain('<TransactionSaleTable')
    expect(source).not.toContain('const linesSale')
    expect(source).not.toContain('<BonusTable')
    expect(source).not.toContain('CommSummaryAdjustmentDialog')
    expect(source).not.toMatch(/label="\d+ - HH bán hàng cá nhân/)
    expect(source).not.toMatch(/label="\d+ - Thưởng thực chi trong kỳ/)
  })

  it('phần tổng đọc từ payout_waves, KHÔNG đọc field cả kỳ của summary', () => {
    // Lỗi (2): mọi field dưới đây là số của cả hai đợt chi. In chúng ở đây là quảng cáo một cái
    // tổng mà các mục bên trên không bao giờ cộng ra được.
    const pham = FIELD_CA_KY.filter((field) => thanPhanTong.includes(`summary.${field}`))

    expect(
      pham,
      `phần tổng đang đọc ${pham.join(', ')} của summary — đó là số CẢ KỲ (gộp đợt Sale), phải lấy từ payout_waves`
    ).toEqual([])
    expect(thanPhanTong).toContain('wavePayable')
    expect(thanPhanTong).toContain('wavePit')
  })

  it('headline "Thực nhận" lấy net của đợt chi, không lấy net cả kỳ', () => {
    const thanHeadline = catLatCat('Thực nhận đợt chi Quản lý', 'Diễn giải')
    expect(thanHeadline).toContain('formatCurrencyVND(waveNet)')
    expect(thanHeadline).not.toContain('summary.net_payable')
  })

  it('không màn quản lý nào cắt phiếu chi lẻ từng người', () => {
    // Hoa hồng quản lý chi theo CẢ ĐỢT (wave MGMT) — một đợt là một lần chi, đi qua
    // `payout_wave_service.pay_wave` / màn lô chi 20.18. BA chốt 20/08/2026.
    //
    // Trước đó CẢ HAI màn quản lý (chi tiết + danh sách) đều cắt phiếu bằng `net_payable`, vốn là
    // net CẢ KỲ gồm cả tiền đợt Sale — mà màn HH Sale cũng cắt phiếu trên đúng bản ghi đó. Nối
    // nút này lại là ký hai phiếu cho cùng một số tiền, không lỗi nào nổ.
    for (const [ten, than] of [
      ['CommMgrDetailPage', chiCode(pageSource)],
      ['CommMgrMonthlyTable', chiCode(listSource)],
    ] as const) {
      expect(than, `${ten} không được có nút/action "Tạo phiếu chi"`).not.toContain('Tạo phiếu chi')
      expect(than, `${ten} không được điều hướng sang màn tạo phiếu chi`).not.toContain(
        'PAYMENT_VOUCHER_CREATE'
      )
    }
  })

  it('có mục diễn giải + bảng chi tiết cho hoa hồng khối hỗ trợ', () => {
    expect(source).toContain('6 - Hoa hồng khối hỗ trợ (Backoffice)')
    expect(source).toContain('const linesBackoffice')
    expect(source).toContain('<BackofficeTable lines={linesBackoffice} />')
  })

  it('bảng khối hỗ trợ không mượn cột riêng của sàn liên kết', () => {
    const than = catLatCat('const BackofficeTable', 'const SlkTable')
    // Hai cột này chỉ có nghĩa với pool SLK; dòng chia theo phòng không bao giờ mang chúng,
    // nối vào chỉ tạo ra cột vĩnh viễn rỗng — đúng lỗi đã vấp ở 86eykqk16.
    expect(than).not.toContain('Nguồn F2')
    expect(than).not.toContain('Doanh thu nguồn')
    expect(than).toContain('% chia từ pool')
  })
})
