/**
 * Guard: màn Danh sách hợp đồng đặt cọc phải có thanh kéo ngang và header ghim.
 *
 * Bảng này rộng ~2400px (11 cột khai `size` + STT + checkbox + cột thao tác), luôn rộng hơn
 * khung ở 1440px. Trước bản sửa nó thiếu cả hai thứ:
 *
 *  1. **Không có thanh kéo ngang.** `Table` chỉ dựng `HorizontalScrollBar` ở đúng nhánh
 *     `paginationPosition="static"`; để mặc định `"fixed"` thì viewport của Radix ScrollArea
 *     nuốt luôn thanh cuộn native ⇒ không có bất kỳ thanh kéo ngang nào trên màn, các cột cuối
 *     im lặng biến mất. Đây là luật đã ghi ở `AGENTS.md`, đã gặp thật ở màn 20.16.
 *  2. **Header không ghim.** `position: sticky` thuần không ăn: Radix bọc `Table.Root` trong
 *     `.rt-ScrollAreaViewport` có `overflow: scroll`, biến nó thành containing block của sticky,
 *     mà chính nó không bao giờ trượt. Phải dùng `useStickyTableHeader`.
 *
 * Cả hai hỏng **im lặng**: không lỗi, không cảnh báo, và vô hình khi màn hình đủ rộng hoặc dữ
 * liệu đủ ngắn. Vì thế guard đọc source thay vì render DOM — đo được hai thứ này trên DOM phải
 * đi ngược lên phần tử cha, mà `testing-library/no-node-access` (bật ở `eslint.config.js`) cấm
 * đúng thao tác đó.
 *
 * Mẫu theo `CommissionByRevenueDetailPage.layout.guard.test.ts`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const pageSource = readFileSync(join(HERE, 'DepositContractsPage.tsx'), 'utf8')
const tableSource = readFileSync(join(HERE, 'components/DepositContractListTable.tsx'), 'utf8')

/**
 * Chiều cao khối phân trang `fixed bottom-0` (thanh kéo ngang + footer), đo thật ~62px ở zoom
 * 100%. Lấy tròn 64px = `pb-16`, đúng nấc Tailwind phần còn lại của hệ thống đang chừa.
 */
const BOTTOM_CHROME_PX = 64

/** Mặc định của `Table`: `cn('flex-1 space-y-4 px-7 pb-16', className)`. */
const TABLE_DEFAULT_BOTTOM_PX = 64

/** `pb-16` → 64px. Trên cùng một phần tử, `!pb-0` thắng `pb-16` vì `!important`. */
function bottomPaddingOf(className: string): number | null {
  const tokens = className.split(/\s+/)
  const important = tokens.filter((t) => /^!pb-\d+$/.test(t)).pop()
  const normal = tokens.filter((t) => /^pb-\d+$/.test(t)).pop()
  const winner = important ?? normal
  return winner === undefined ? null : Number(winner.replace(/^!?pb-/, '')) * 4
}

/** Phần tử chứa `anchor`, cắt từ `<` tới `>` — anchor là chuỗi chỉ có ở đúng phần tử đó. */
function elementContaining(source: string, anchor: string): string {
  const anchorAt = source.indexOf(anchor)
  expect(
    anchorAt,
    `không còn tìm thấy "${anchor}" — guard mất hiệu lực, cập nhật lại`
  ).toBeGreaterThan(-1)
  return source.slice(source.lastIndexOf('<', anchorAt), source.indexOf('>', anchorAt))
}

function classNameOfElementContaining(source: string, anchor: string): string {
  const match = /\bclassName="([^"]*)"/.exec(elementContaining(source, anchor))
  expect(match, `phần tử chứa "${anchor}" không còn className dạng chuỗi`).not.toBeNull()
  return match![1]
}

/**
 * `className` của `Table` — chấp nhận cả `className="…"` lẫn `className={HẰNG}`.
 *
 * Bảng này truyền hằng chứ không gõ tay chuỗi (một nguồn duy nhất cho lớp neo), nên guard phải
 * tra ngược hằng đó về giá trị khai báo; đọc thẳng `className="…"` sẽ không khớp gì cả.
 */
function tableClassNameFrom(source: string, anchor: string): string {
  const element = elementContaining(source, anchor)
  const literal = /\bclassName="([^"]*)"/.exec(element)
  if (literal) return literal[1]

  const viaConst = /\bclassName=\{([A-Z_][A-Z0-9_]*)\}/.exec(element)
  expect(
    viaConst,
    `phần tử chứa "${anchor}" không còn className dạng chuỗi lẫn dạng hằng`
  ).not.toBeNull()

  const declared = new RegExp(`\\b${viaConst![1]} = '([^']+)'`).exec(source)
  expect(declared, `không tìm thấy khai báo hằng ${viaConst![1]}`).not.toBeNull()
  return declared![1]
}

/**
 * Div bọc bảng ở trang — cũng là vùng cuộn thật.
 *
 * Neo vào chuỗi lớp chứ không vào `<DepositContractListTable`: className nằm trên div CHA,
 * neo vào chính thẻ bảng thì cắt ra một phần tử không có className và guard chết vì lý do sai.
 */
const scrollWrapperClassName = classNameOfElementContaining(
  pageSource,
  'overflow-x-auto overflow-y-auto'
)
/** `className` truyền vào `Table`; không khai `pb` nào thì `pb-16` mặc định có hiệu lực. */
const tableClassName = tableClassNameFrom(tableSource, 'paginationPosition="static"')

describe('DepositContractsPage — thanh kéo ngang (86eyqjbtb)', () => {
  it('Table bật phân trang static, nếu không thì HorizontalScrollBar không được dựng', () => {
    expect(
      tableSource,
      'thiếu `paginationPosition="static"` ⇒ Table nhảy về nhánh "fixed", không dựng HorizontalScrollBar và Radix nuốt luôn thanh cuộn native'
    ).toContain('paginationPosition="static"')
  })

  it('tắt overflow trong Table để không có hai thanh cuộn ngang chồng nhau', () => {
    expect(tableSource).toContain('disableInnerOverflow={true}')
  })

  it('trang có đúng một vùng cuộn mang cả hai lớp overflow', () => {
    // `useStickyTableHeader` tìm container theo đúng cặp lớp này; thiếu một lớp là hook
    // return sớm và header thôi ghim mà không báo gì.
    expect(scrollWrapperClassName).toContain('overflow-x-auto')
    expect(scrollWrapperClassName).toContain('overflow-y-auto')

    const wrappers = pageSource.match(/overflow-x-auto overflow-y-auto/g) ?? []
    expect(wrappers, 'nhiều vùng cuộn lồng nhau thì thanh kéo đồng bộ sai container').toHaveLength(
      1
    )
  })

  it('chừa đủ chỗ đáy cho khối phân trang cố định', () => {
    const onTable = bottomPaddingOf(tableClassName) ?? TABLE_DEFAULT_BOTTOM_PX
    const onWrapper = bottomPaddingOf(scrollWrapperClassName) ?? 0

    expect(
      onTable + onWrapper,
      `khối phân trang fixed cao ~62px sẽ che dòng cuối. Đang chừa: Table ${onTable}px + wrapper ${onWrapper}px`
    ).toBeGreaterThanOrEqual(BOTTOM_CHROME_PX)
  })
})

describe('DepositContractsPage — header ghim khi cuộn (86eyqjbtb)', () => {
  it('bảng gọi useStickyTableHeader', () => {
    expect(tableSource).toContain('useStickyTableHeader(')
  })

  it('dùng hook dùng chung, không chép lại pattern querySelector vào file', () => {
    // Bốn bảng trước đã chép tay đoạn này; hook đã được tách ra ở `@/hooks`.
    expect(tableSource).toContain("from '@/hooks/useStickyTableHeader'")
    expect(tableSource).not.toContain("document.querySelector('.js-")
  })

  it('lớp neo và className của Table cùng đọc MỘT hằng, không ai gõ tay chuỗi', () => {
    // Đây là chỗ duy nhất hai bên có thể lệch nhau, và lệch thì hỏng im lặng: hook không tìm
    // thấy bảng, return sớm, header thôi ghim, không lỗi nào được ném ra. Ghim bằng cấu trúc
    // (cả hai cùng tham chiếu hằng) chứ không bằng cách so hai chuỗi — so chuỗi vẫn cho phép
    // ai đó gõ tay đúng giá trị hôm nay rồi đổi hằng vào ngày mai.
    const declared = /const TABLE_SCOPE_CLASS = '([^']+)'/.exec(tableSource)
    expect(declared, 'không còn khai báo TABLE_SCOPE_CLASS').not.toBeNull()

    expect(tableSource).toContain('useStickyTableHeader(`.${TABLE_SCOPE_CLASS}`')
    expect(
      elementContaining(tableSource, 'paginationPosition="static"'),
      'className của Table phải dùng hằng TABLE_SCOPE_CLASS, không gõ lại chuỗi'
    ).toContain('className={TABLE_SCOPE_CLASS}')
    expect(tableClassName.split(/\s+/)).toContain(declared![1])
  })

  it('hook re-sync khi dữ liệu đổi trang', () => {
    // `<thead>` bị thay node mỗi lần render lại; thiếu resyncKey thì tham chiếu cũ chết lặng.
    expect(tableSource).toContain('useStickyTableHeader(`.${TABLE_SCOPE_CLASS}`, data)')
  })
})
