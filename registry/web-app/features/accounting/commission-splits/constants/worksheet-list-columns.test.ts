/**
 * CR STT17 (`86eydbph4`): hai màn worksheet kỳ phải hiện ĐÚNG cùng một bộ cột, cùng thứ tự —
 * "Chia HH theo tháng" và "Giao dịch tiền về đợt này" đọc chung endpoint, chung row type.
 *
 * Yêu cầu này từng bị hạ (06/08/2026) sau khi `492e71fa7` gỡ cụm "trả sale" khỏi màn "Giao dịch
 * tiền về đợt này" và việc đó được chốt nhầm là "giữ nguyên hiện trạng". **BA bác lại ngày
 * 13/08** ⇒ khôi phục yêu cầu trùng khít. Bài học đáng giữ: cụm cột biến mất trong một commit
 * mang nhãn "hot: add Excel column letter row" thì không ai đọc ra — nên phải có test nói thẳng.
 *
 *  1. Bộ cột lõi hợp lệ (id duy nhất, order tăng dần, có nhãn).
 *  2. CẢ HAI màn khai đúng bộ lõi, đúng thứ tự — thêm/bớt/đổi tên ở một màn mà quên màn kia là
 *     đỏ ngay, không đợi tới lượt QA.
 *  3. Cụm "trả sale" có mặt ở CẢ HAI màn, **liền khối**, đúng vị trí giữa `total` và
 *     `invoice_no`. Khoá riêng để thông báo lỗi chỉ thẳng vào cụm đã mất.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  WORKSHEET_FROZEN_COLUMN_IDS,
  WORKSHEET_LIST_COLUMNS,
  WORKSHEET_SALES_PAYOUT_COLUMN_IDS,
  WORKSHEET_SELLER_COLUMN_IDS,
  WORKSHEET_TRAILING_COLUMN_IDS,
  buildWorksheetListColumns,
} from './worksheet-list-columns'

/** Cột con của nhóm 2 tầng "Thành tiền nhận về" — không phải cột cấp 1 nên loại khi so sánh. */
const RECEIVED_SUB_COLUMN_IDS = ['received_net', 'received']

/**
 * `492e71fa7` bọc mỗi cột phẳng thành nhóm 3 tầng để có hàng chữ cái Excel: id cấp 1 giữ nguyên,
 * thêm `<id>_tier1` (tầng mang nhãn) và `<id>_col` (leaf chứa cell). Hai hậu tố đó là id phái
 * sinh, không phải cột mới — không loại thì phép so lệch hẳn (89/68 id thay vì 31/24).
 */
const DERIVED_ID_SUFFIXES = ['_tier1', '_col']

function readSource(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')
}

/**
 * Rút hàng chữ cái Excel (`header: '(X)'` ở tầng nhóm) theo đúng thứ tự khai báo.
 *
 * Hàng này để kế toán tra ngược sang file Excel gốc, nên **một chữ cái chỉ được trỏ tới một
 * cột**. Bẫy thật đã gặp: trước CR STT17 màn "Giao dịch tiền về đợt này" mượn tạm `(O)` cho
 * `% Thanh toán` vì `% TT Phí` chưa có mặt; thêm cụm "trả sale" vào là có ngay HAI ô `(O)`.
 */
function extractColumnLetters(source: string): string[] {
  const start = source.indexOf('const allColumns')
  const end = source.indexOf('const defaultColumnConfig')
  return Array.from(source.slice(start, end).matchAll(/header: '(\([A-Z]\))'/g)).map((m) => m[1])
}

/**
 * Rút map `id → nhãn hiển thị` từ tầng `<id>_tier1` (tầng mang nhãn trong header 3 tầng).
 *
 * Đây là nhãn người dùng NHÌN THẤY trên bảng, khác với `label` trong `defaultColumnConfig` —
 * cái đó chỉ hiện trong dialog cấu hình cột. Hai chỗ lệch nhau là chuyện đã xảy ra.
 */
function extractTierLabels(source: string): Record<string, string> {
  const start = source.indexOf('const allColumns')
  const end = source.indexOf('const defaultColumnConfig')
  const matches = source
    .slice(start, end)
    .matchAll(/id: '([a-z0-9_]+)_tier1',\s*\n\s*header: '([^']*)',/g)
  return Object.fromEntries(Array.from(matches, (m) => [m[1], m[2]]))
}

/** Rút map `id → label` khai trong khối `defaultColumnConfig`. */
function extractConfigLabels(source: string): Record<string, string> {
  const start = source.indexOf('const defaultColumnConfig')
  const end = source.indexOf('useColumnConfig(', start)
  const matches = source.slice(start, end).matchAll(/\{ id: '([a-z0-9_]+)', label: '([^']*)'/g)
  return Object.fromEntries(Array.from(matches, (m) => [m[1], m[2]]))
}

/** Rút danh sách id cột cấp 1 khai trong khối `allColumns` của một component bảng. */
function extractColumnIds(source: string): string[] {
  const start = source.indexOf('const allColumns')
  const end = source.indexOf('const defaultColumnConfig')
  expect(start, 'không tìm thấy khối allColumns').toBeGreaterThan(-1)
  expect(end, 'không tìm thấy khối defaultColumnConfig').toBeGreaterThan(start)

  const block = source.slice(start, end)
  const ids = Array.from(block.matchAll(/\bid: '([a-z0-9_]+)'/g)).map((match) => match[1])
  return ids.filter(
    (id) =>
      !RECEIVED_SUB_COLUMN_IDS.includes(id) &&
      !DERIVED_ID_SUFFIXES.some((suffix) => id.endsWith(suffix))
  )
}

/**
 * Rút cặp `(id, order)` khai trong khối `defaultColumnConfig`.
 *
 * Đây mới là thứ quyết định thứ tự cột NHÌN THẤY: `visibleColumns` lọc theo `visible`, **sort
 * theo `order`**, rồi mới tra ngược sang `allColumns`. Thứ tự mảng `allColumns` không ảnh hưởng
 * render — nên chỉ dựa vào `extractColumnIds` là khoá hụt đúng thứ mà CR yêu cầu.
 */
function extractDefaultConfig(source: string): { id: string; order: number }[] {
  const start = source.indexOf('const defaultColumnConfig')
  const end = source.indexOf('useColumnConfig(', start)
  expect(start, 'không tìm thấy khối defaultColumnConfig').toBeGreaterThan(-1)
  expect(end, 'không tìm thấy lời gọi useColumnConfig').toBeGreaterThan(start)

  return Array.from(
    source.slice(start, end).matchAll(/\{ id: '([a-z0-9_]+)',[^}]*order: (\d+) \}/g)
  ).map((match) => ({ id: match[1], order: Number(match[2]) }))
}

const WORKSHEET_SCREENS = [
  { name: 'Chia HH theo tháng', path: '../components/CommissionSplitTable.tsx' },
  {
    name: 'Giao dịch tiền về đợt này',
    path: '../../deal-period-allocations/components/DealPeriodAllocationWorksheetTable.tsx',
  },
] as const

const coreIds = WORKSHEET_LIST_COLUMNS.map((column) => column.id)

describe('WORKSHEET_LIST_COLUMNS', () => {
  it('không có id trùng', () => {
    expect(new Set(coreIds).size).toBe(coreIds.length)
  })

  it('order tăng dần theo thứ tự khai báo', () => {
    const orders = WORKSHEET_LIST_COLUMNS.map((column) => column.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('mọi cột đều có nhãn hiển thị', () => {
    expect(WORKSHEET_LIST_COLUMNS.every((column) => column.label.trim().length > 0)).toBe(true)
  })

  it('bộ lõi chứa đủ cụm "trả sale", liền khối, ngay sau "Tổng phí + thưởng"', () => {
    const payoutIds = [...WORKSHEET_SALES_PAYOUT_COLUMN_IDS]
    const start = coreIds.indexOf(payoutIds[0])

    expect(start, 'cụm "trả sale" không có trong bộ lõi').toBeGreaterThan(-1)
    expect(coreIds[start - 1], 'cụm "trả sale" phải nằm ngay sau `total`').toBe('total')
    expect(coreIds.slice(start, start + payoutIds.length)).toEqual(payoutIds)
    expect(coreIds[start + payoutIds.length], 'cụm "trả sale" phải liền trước `invoice_no`').toBe(
      'invoice_no'
    )
  })

  it('trả về bản sao ghi được, không dùng chung tham chiếu giữa hai màn', () => {
    const first = buildWorksheetListColumns()
    const second = buildWorksheetListColumns()

    expect(first).toEqual(second)
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(second[0])
    expect(first[0]).not.toBe(WORKSHEET_LIST_COLUMNS[0])
  })
})

describe('đồng bộ cột giữa hai màn worksheet (CR STT17)', () => {
  const monthlySplitIds = extractColumnIds(readSource('../components/CommissionSplitTable.tsx'))
  const dealPeriodIds = extractColumnIds(
    readSource('../../deal-period-allocations/components/DealPeriodAllocationWorksheetTable.tsx')
  )

  it('bảng "Chia HH theo tháng" khai đúng bộ cột dùng chung', () => {
    expect(monthlySplitIds).toEqual(coreIds)
  })

  it('bảng "Giao dịch tiền về đợt này" khai đúng bộ cột dùng chung', () => {
    expect(dealPeriodIds).toEqual(coreIds)
  })

  it('hai màn có cùng danh sách cột, cùng thứ tự', () => {
    expect(dealPeriodIds).toEqual(monthlySplitIds)
  })

  /**
   * Khoá riêng dù phép so ở trên đã bao — vì đây đúng là thứ đã trôi mất một lần. Mất cụm này
   * trong một phép so 31 phần tử thì thông báo lỗi là một mảng dài không ai đọc; khoá riêng thì
   * nó nói thẳng "màn X thiếu cụm trả sale".
   */
  it('cụm "trả sale" có đủ ở CẢ HAI màn, liền khối, giữa `total` và `invoice_no`', () => {
    const payoutIds = [...WORKSHEET_SALES_PAYOUT_COLUMN_IDS]

    for (const [name, ids] of [
      ['Chia HH theo tháng', monthlySplitIds],
      ['Giao dịch tiền về đợt này', dealPeriodIds],
    ] as const) {
      const start = ids.indexOf(payoutIds[0])
      expect(start, `màn "${name}" thiếu cụm "trả sale"`).toBeGreaterThan(-1)
      expect(ids.slice(start, start + payoutIds.length), `màn "${name}" khai lệch cụm`).toEqual(
        payoutIds
      )
      expect(ids[start - 1], `màn "${name}": cụm phải nằm ngay sau \`total\``).toBe('total')
      expect(
        ids[start + payoutIds.length],
        `màn "${name}": cụm phải liền trước \`invoice_no\``
      ).toBe('invoice_no')
    }
  })

  /**
   * Nhãn cột cũng đã trôi đúng một lần cùng cụm "trả sale": `0e4bcc5bb` đồng bộ bốn nhãn
   * (`basis`, `fee_pct`, `fee_amount`, `bonus`), `492e71fa7` trả chúng về nhãn gốc tháng 6.
   * Khoá luôn để lần sau đổi nhãn một màn mà quên màn kia là đỏ ngay.
   */
  it('nhãn cột khớp nhau giữa hai màn', () => {
    const monthly = extractTierLabels(readSource('../components/CommissionSplitTable.tsx'))
    const dealPeriod = extractTierLabels(
      readSource('../../deal-period-allocations/components/DealPeriodAllocationWorksheetTable.tsx')
    )

    expect(Object.keys(monthly).length, 'không rút được nhãn nào — regex hụt?').toBeGreaterThan(10)
    expect(dealPeriod).toEqual(monthly)
  })

  it('nhãn trong `defaultColumnConfig` khớp nhãn hiển thị trên header', () => {
    for (const screen of WORKSHEET_SCREENS) {
      const source = readSource(screen.path)
      const tierLabels = extractTierLabels(source)
      const configLabels = extractConfigLabels(source)

      // Chỉ đối chiếu id có cả hai phía: `l_group` gộp 3 cột con nên nhãn cấu hình
      // ("Sale / Sàn F2 / CTV") cố ý khác nhãn hiển thị.
      for (const [id, tierLabel] of Object.entries(tierLabels)) {
        if (!(id in configLabels)) continue
        expect(
          configLabels[id],
          `màn "${screen.name}", cột '${id}': dialog cấu hình ghi "${configLabels[id]}" nhưng header hiện "${tierLabel}"`
        ).toBe(tierLabel)
      }
    }
  })

  it('hàng chữ cái Excel khớp nhau giữa hai màn', () => {
    const monthly = extractColumnLetters(readSource('../components/CommissionSplitTable.tsx'))
    const dealPeriod = extractColumnLetters(
      readSource('../../deal-period-allocations/components/DealPeriodAllocationWorksheetTable.tsx')
    )

    expect(monthly.length, 'không rút được chữ cái nào — regex hụt?').toBeGreaterThan(10)
    expect(dealPeriod).toEqual(monthly)
  })

  /**
   * `(X)` cố ý dùng hai lần (`total` và `total_sales_payout`) — đúng như file Excel gốc. Mọi chữ
   * cái KHÁC chỉ được trỏ tới một cột, không thì kế toán tra ngược ra hai chỗ.
   */
  it('mỗi chữ cái chỉ trỏ tới một cột (trừ (X) dùng đôi có chủ đích)', () => {
    for (const screen of WORKSHEET_SCREENS) {
      const letters = extractColumnLetters(readSource(screen.path))
      const counts = new Map<string, number>()
      for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1)

      const duplicated = [...counts.entries()]
        .filter(([letter, count]) => count > 1 && letter !== '(X)')
        .map(([letter, count]) => `${letter} x${count}`)

      expect(duplicated, `màn "${screen.name}" có chữ cái Excel trùng`).toEqual([])
    }
  })
})

/**
 * CR `86eym80zg` (13/08/2026): "Trạng thái duyệt", "Duyệt lệch tiền về" và "Mã deal" phải nằm ở
 * ba vị trí CUỐI bảng, thay vì đứng ngay sau "Mã phân bổ" như trước.
 *
 * Bộ test "đồng bộ hai màn" ở trên KHÔNG bao được yêu cầu này: nó chỉ đòi hai màn giống nhau,
 * nên chèn thêm một cột mới vào sau "Mã deal" là hai màn vẫn khớp mà CR đã bị phá.
 */
describe('CR 86eym80zg — ba cột về cuối bảng worksheet', () => {
  const trailingIds = [...WORKSHEET_TRAILING_COLUMN_IDS]

  it('bộ cột lõi khai ba cột đó ở ba vị trí cuối', () => {
    expect(coreIds.slice(-trailingIds.length)).toEqual(trailingIds)
  })

  for (const screen of WORKSHEET_SCREENS) {
    it(`bảng "${screen.name}" render ba cột đó cuối cùng`, () => {
      const config = extractDefaultConfig(readSource(screen.path))

      // Chống test rỗng: regex rút cấu hình đòi cả entry nằm gọn trên MỘT dòng. Prettier xuống
      // dòng một entry (nhãn dài chẳng hạn) là entry đó biến mất khỏi `config` — và phép so
      // "ba cột cuối" bên dưới vẫn xanh trong khi thứ tự thật đã hỏng. Chốt trước là ba cột của
      // CR có mặt, để hỏng regex thì đỏ ngay chứ không im lặng.
      for (const id of trailingIds) {
        expect(
          config.map((column) => column.id),
          `không rút được '${id}' từ defaultColumnConfig — regex hụt hay entry đã bị xuống dòng?`
        ).toContain(id)
      }

      const rendered = [...config].sort((a, b) => a.order - b.order).map((column) => column.id)
      expect(rendered.slice(-trailingIds.length)).toEqual(trailingIds)
    })

    it(`bảng "${screen.name}": order khớp chỉ số mảng`, () => {
      // `useColumnConfig.handleReset` gán `order = index`. Lệch nhau thì nút "Đặt lại" cho ra
      // thứ tự khác hẳn lần đầu vào màn — im lặng và rất khó truy.
      const config = extractDefaultConfig(readSource(screen.path))
      expect(config.map((column) => column.order)).toEqual(config.map((_, index) => index))
    })
  }
})

/**
 * CR `86eym80zg` (đợt 2): "Dự án" (B) và "Mã BĐS" (C) lên trước "Chủ đầu tư" (D), và hai cột đó
 * phải ĐÔNG CỨNG khi kéo ngang.
 *
 * Hai bảng này là bảng đầu tiên trong repo vừa có header 3 tầng vừa đông cứng cột, nên rủi ro
 * lớn nhất không phải thứ tự mà là **khai thiếu `frozen` ở một tầng**: khi đó tầng đó trôi trong
 * khi các tầng còn lại đứng yên — trông như lỗi render chứ không như thiếu cấu hình.
 */
describe('CR 86eym80zg (đợt 2) — B/C lên trước D và đông cứng', () => {
  const frozenIds = [...WORKSHEET_FROZEN_COLUMN_IDS]

  it('bộ cột lõi xếp Dự án → Mã BĐS → Chủ đầu tư', () => {
    const identityIds = coreIds.filter((id) =>
      ['project_name', 'unit_number', 'investor_name'].includes(id)
    )
    expect(identityIds).toEqual(['project_name', 'unit_number', 'investor_name'])
  })

  for (const screen of WORKSHEET_SCREENS) {
    it(`bảng "${screen.name}": hai cột đông cứng đứng NGAY ĐẦU bảng`, () => {
      const config = extractDefaultConfig(readSource(screen.path))
      const rendered = [...config].sort((a, b) => a.order - b.order).map((column) => column.id)

      // `worksheet_code` mặc định ẩn nên không tính; hai cột đông cứng phải là hai cột hiển thị
      // đầu tiên, nếu không sẽ có cột thường chen vào giữa STT và khối đông cứng.
      expect(rendered.filter((id) => id !== 'worksheet_code').slice(0, 2)).toEqual(frozenIds)
    })

    it(`bảng "${screen.name}": \`frozen\` khai đủ ở CẢ BA tầng của mỗi cột`, () => {
      const source = readSource(screen.path)

      for (const id of frozenIds) {
        for (const tierId of [id, `${id}_tier1`, `${id}_col`]) {
          // Khối của một tầng bắt đầu ở `id: '<tierId>'` và kết thúc khi gặp `id:` kế tiếp —
          // đủ để biết `frozen: true` có nằm trong meta của CHÍNH tầng đó không.
          const start = source.indexOf(`id: '${tierId}',`)
          expect(start, `không tìm thấy tầng '${tierId}'`).toBeGreaterThan(-1)
          const next = source.indexOf("id: '", start + 10)
          const block = source.slice(start, next === -1 ? source.length : next)

          expect(
            block,
            `tầng '${tierId}' thiếu \`frozen: true\` — tầng này sẽ trôi khi kéo ngang`
          ).toContain('frozen: true')
        }
      }
    })
  }
})

/**
 * CR STT30 (`86eyetck6`): ô "Danh sách sale" phải kèm **tỷ lệ tham gia** của từng người —
 * chốt của BA trên ClickUp 31/07/2026: *"bổ sung thêm tỷ lệ tham gia từng người nữa ạ.
 * VD: Nguyễn A (30%), Nguyễn B (70%)"*.
 *
 * Vì sao khoá bằng test đọc SOURCE chứ không chỉ tin test của component:
 * component dùng chung render tỷ lệ và đã có 23 test riêng — **vẫn xanh suốt** trong khi màn hình
 * thật KHÔNG hề hiện tỷ lệ. Lý do: mỗi bảng tự khai một `SalesParticipantList` tại chỗ, in mã +
 * tên + org nhưng bỏ qua `participation_percentage`, và component dùng chung trở thành code chết
 * (chỉ còn file test của chính nó import). Test cấp component không bắt được loại lỗi đó — chỉ có
 * phép kiểm "bảng có THẬT SỰ gọi component dùng chung không" mới bắt.
 *
 * Đo trên dev 20/08/2026 trước khi sửa: API trả `participation_percentage` cho **71/71**
 * participant, mà `innerHTML` của ô không có lấy một node nào chứa `%`.
 *
 * ⚠️ Cập nhật 20/08 (CR `86eyj75hg`): tên đã đổi nhưng **luật thì không**. Ba cột đồng bán gộp
 * thành một, nên component dùng chung nay là `SellerList` (không còn `MvSaleList`) và leaf là
 * `sellers_col` (không còn `sales_col`). Giữ nguyên bộ test này vì thứ nó canh — "bảng phải đi
 * qua component dùng chung, đừng tự dựng renderer tại chỗ" — chính là thứ đã làm tỷ lệ tham gia
 * biến mất suốt 3 tuần.
 */
describe('CR STT30 — "Danh sách sale" phải đi qua component dùng chung (có tỷ lệ tham gia)', () => {
  for (const screen of WORKSHEET_SCREENS) {
    it(`bảng "${screen.name}": ô sellers_col render bằng \`SellerList\``, () => {
      const source = readSource(screen.path)

      expect(
        source,
        'bảng không import `SellerList` — ô "Danh sách sale" nhiều khả năng lại tự dựng renderer riêng'
      ).toMatch(/SellerList,?\s*\n?\s*\}? from '[^']*WorksheetParticipantCells'/)

      // Lấy đúng khối của leaf `sellers_col` để chắc chắn CHÍNH ô đó dùng `SellerList`, chứ không
      // phải import về rồi dùng ở một cột khác.
      const start = source.indexOf("id: 'sellers_col',")
      expect(start, "không tìm thấy leaf 'sellers_col'").toBeGreaterThan(-1)
      const next = source.indexOf("id: '", start + 10)
      const block = source.slice(start, next === -1 ? source.length : next)

      expect(
        block,
        'ô "Danh sách sale" không gọi `SellerList` — tỷ lệ tham gia sẽ biến mất khỏi màn hình'
      ).toContain('<SellerList')
    })

    it(`bảng "${screen.name}": KHÔNG tự khai lại renderer danh sách sale`, () => {
      const source = readSource(screen.path)

      // Đây chính là hình dạng của bản dựng tại chỗ đã nuốt mất tỷ lệ suốt 3 tuần.
      expect(
        source,
        'bảng khai lại `SalesParticipantList` tại chỗ — đúng cách mà tỷ lệ tham gia đã bị bỏ quên'
      ).not.toMatch(/function SalesParticipantList\b/)
      expect(source).not.toContain('<SalesParticipantList')
    })
  }

  it('`SellerList` render tỷ lệ tham gia — nguồn duy nhất của cả hai màn', () => {
    const source = readSource('../components/WorksheetParticipantCells.tsx')

    expect(source, 'entry không còn truyền `pct` xuống thân entry').toMatch(/pct=\{entry\.pct\}/)
    expect(source, 'entry không còn format tỷ lệ — cả hai màn sẽ mất tỷ lệ cùng lúc').toContain(
      'formatPct(pct, 2)'
    )
  })
})

/**
 * CR `86eyj75hg` (19/08/2026): ba cột đồng bán gộp thành ĐÚNG MỘT cột `sellers`. Bản đầu còn tách
 * `seller_block` / `seller_department` thành hai cột căn dòng theo nó; user bác (20/08) nên khối
 * và phòng ban về nằm inline trong ô người bán.
 *
 * Bộ test "đồng bộ hai màn" ở trên KHÔNG bao được yêu cầu này — nó chỉ đòi hai màn giống nhau,
 * nên gỡ cả cụm ở CẢ HAI màn là vẫn xanh. Mà "gỡ ở cả hai màn" chính xác là thứ `492e71fa7` đã
 * làm với cụm trả sale, và là lý do CR này tồn tại.
 */
describe('CR 86eyj75hg — cụm cột đồng bán đã gộp', () => {
  const sellerIds = [...WORKSHEET_SELLER_COLUMN_IDS]

  it('bộ cột lõi khai cụm đồng bán liền khối, ngay sau `l_group`', () => {
    const start = coreIds.indexOf(sellerIds[0])

    expect(start, 'bộ lõi không còn cụm đồng bán').toBeGreaterThan(-1)
    expect(coreIds[start - 1], 'cụm đồng bán phải nằm ngay sau `l_group`').toBe('l_group')
    expect(coreIds.slice(start, start + sellerIds.length)).toEqual(sellerIds)
  })

  it('ba cột đồng bán CŨ đã biến mất khỏi bộ lõi', () => {
    // Còn sót một id cũ nghĩa là gộp mới xong một nửa: bảng hiện đồng thời cột gộp và cột cũ.
    for (const legacyId of ['sales', 'f2_exchanges', 'ctvs']) {
      expect(coreIds, `id cũ '${legacyId}' vẫn còn trong bộ lõi`).not.toContain(legacyId)
    }
  })

  for (const screen of WORKSHEET_SCREENS) {
    it(`bảng "${screen.name}" khai cụm đồng bán liền khối`, () => {
      const ids = extractColumnIds(readSource(screen.path))
      const start = ids.indexOf(sellerIds[0])

      expect(start, `màn "${screen.name}" thiếu cột 'sellers'`).toBeGreaterThan(-1)
      expect(
        ids.slice(start, start + sellerIds.length),
        `màn "${screen.name}" khai lệch cụm`
      ).toEqual(sellerIds)
    })

    /**
     * Khối và Phòng ban KHÔNG được là cột.
     *
     * Bản đầu của CR dựng chúng thành hai cột riêng dưới một nhóm không mang chữ cái Excel; user
     * bác (20/08) và chốt đưa vào inline trong ô người bán. Khoá lại vì đây là thứ rất dễ bị
     * "sửa lại cho đúng CR" — chữ trong mô tả CR là *"Bổ sung thêm cột: Khối"*, đọc một mình thì
     * ai cũng dựng cột. Test này là chỗ duy nhất ghi rằng chữ đó đã bị chính người đặt hàng đổi ý.
     */
    it(`bảng "${screen.name}": Khối/Phòng ban KHÔNG phải cột — nằm inline trong ô người bán`, () => {
      const source = readSource(screen.path)
      const block = source.slice(source.indexOf('const allColumns'))

      for (const removedId of ['seller_org_group', 'seller_block', 'seller_department']) {
        expect(
          block,
          `màn "${screen.name}" dựng lại cột '${removedId}' — user đã bác bố cục này 20/08`
        ).not.toContain(`id: '${removedId}'`)
      }
    })
  }
})

/**
 * Header phải ĐỨNG YÊN khi cuộn dọc (user chốt 20/08: "cần sticky được header của table thì task
 * này mới được coi là done").
 *
 * Khoá ở tầng nguồn vì jsdom không có layout — `getBoundingClientRect()` trả 0 hết, nên không thể
 * kiểm hành vi sticky thật bằng unit test; phải đo trên trình duyệt (đã đo, xem `Table.tsx`).
 * Thứ test này bắt được là hồi quy hay gặp hơn nhiều: ai đó dọn props và gỡ mất cờ.
 *
 * ⚠️ Riêng cờ này KHÔNG suy ra được từ `TableHeader` — ở đó đã có sẵn `sticky top-0` từ lâu mà
 * header vẫn trôi, vì scrollport gần nhất (`.rt-ScrollAreaViewport` của Radix) không bao giờ cuộn.
 * Thấy `sticky top-0` trong `TableHeader` rồi kết luận "có rồi, bỏ cờ đi" là đúng cái bẫy đã làm
 * lỗi này sống sót lâu nay.
 */
describe('sticky header — cả hai màn worksheet', () => {
  for (const screen of WORKSHEET_SCREENS) {
    it(`bảng "${screen.name}" bật \`stickyHeader\` cho <Table>`, () => {
      expect(
        readSource(screen.path),
        `màn "${screen.name}" mất cờ \`stickyHeader\` — header sẽ trôi khi cuộn`
      ).toMatch(/^\s*stickyHeader\s*$/m)
    })
  }
})
