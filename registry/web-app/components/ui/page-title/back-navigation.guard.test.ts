/**
 * Guard: hạ tầng "back giữ bộ lọc" phải còn nguyên 3 mắt xích.
 *
 * Ba thứ dưới đây hỏng hoàn toàn IM LẶNG — không lỗi biên dịch, không test đơn vị nào đỏ, chỉ là
 * người dùng bấm back rồi mất bộ lọc, đúng bug 86eynmdkf:
 *
 *  1. `PageTitle` quay lại đoán bằng `document.referrer`. Trong SPA giá trị này chỉ phản ánh cách
 *     tab được mở LẦN ĐẦU và không đổi khi điều hướng client-side, nên mở tab mới / gõ URL / F5
 *     đều cho referrer rỗng ⇒ cả phiên bị coi nhầm là "vào thẳng từ ngoài" và mọi nút back đẩy
 *     người dùng về đường dẫn cha TRẦN.
 *  2. `useListUrlMemory` bị gỡ khỏi `AppLayout`. Không còn ai ghi thì bộ nhớ luôn rỗng, nhưng mọi
 *     hàm đọc vẫn chạy và vẫn trả chuỗi rỗng hợp lệ.
 *  3. `BreadcrumbWrapper` render thẳng `item.href`. Breadcrumb về danh sách mất bộ lọc, trong khi
 *     nút back vẫn đúng — nên rất dễ nghiệm thu sót.
 *
 * Guard đọc source thay vì render: `eslint.config.js` bật `testing-library/no-node-access` +
 * `no-container` nên không đo được cây DOM, và `yarn lint --max-warnings 0` không cho tắt lệ.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const PAGE_TITLE = join(SRC, 'components', 'ui', 'page-title', 'PageTitle.tsx')
const BREADCRUMB_WRAPPER = join(SRC, 'components', 'ui', 'breadcrumb', 'BreadcrumbWrapper.tsx')
const APP_LAYOUT = join(SRC, 'layouts', 'AppLayout.tsx')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

/** Bỏ comment để guard không bắt nhầm chính đoạn văn giải thích vì sao KHÔNG dùng thứ đó. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('guard: neo có trỏ đúng chỗ không', () => {
  it('ba file được soi đều đọc được và không rỗng', () => {
    for (const path of [PAGE_TITLE, BREADCRUMB_WRAPPER, APP_LAYOUT]) {
      expect(read(path).length).toBeGreaterThan(0)
    }
  })

  it('stripComments chỉ bỏ comment, giữ nguyên code', () => {
    expect(stripComments('const a = 1 // ghi chú\n/* khối */\nconst b = 2')).toContain(
      'const a = 1'
    )
    expect(stripComments('const a = 1 // ghi chú\n/* khối */\nconst b = 2')).toContain(
      'const b = 2'
    )
    expect(stripComments('// chỉ là ghi chú')).not.toContain('ghi chú')
  })

  it('PageTitle đúng là file chứa nút back (neo vào handleBackBtn)', () => {
    expect(read(PAGE_TITLE)).toContain('const handleBackBtn')
  })
})

describe('1. PageTitle không được quay lại heuristic document.referrer', () => {
  it('không còn đọc document.referrer trong code', () => {
    expect(stripComments(read(PAGE_TITLE))).not.toContain('document.referrer')
  })

  it('quyết định nhánh back đi qua resolveBackTarget', () => {
    expect(stripComments(read(PAGE_TITLE))).toContain('resolveBackTarget(')
  })

  it('điều kiện lùi được lấy từ canGoBackInApp, không phải referrer', () => {
    expect(stripComments(read(PAGE_TITLE))).toContain('canGoBackInApp()')
  })

  it('nhánh fallback đọc bộ nhớ URL danh sách', () => {
    expect(stripComments(read(PAGE_TITLE))).toContain('getRememberedSearch(')
  })
})

describe('2. AppLayout phải còn gắn useListUrlMemory', () => {
  it('gọi hook — không ai ghi thì bộ nhớ luôn rỗng mà không lỗi gì', () => {
    expect(stripComments(read(APP_LAYOUT))).toContain('useListUrlMemory()')
  })
})

describe('3. BreadcrumbWrapper phải ghép lại bộ lọc đã nhớ', () => {
  it('Link đi qua withRememberedSearch chứ không dùng thẳng item.href', () => {
    const source = stripComments(read(BREADCRUMB_WRAPPER))

    expect(source).toContain('withRememberedSearch(item.href)')
    expect(source).not.toContain('<Link to={item.href}>')
  })
})
