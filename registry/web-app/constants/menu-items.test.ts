import { afterEach, describe, expect, it, vi } from 'vitest'

import { FEATURE_KEY, FEATURE_LABEL, type FeatureKey } from '../constants/feature-flags'
import {
  buildMenuItems,
  removeForbiddenFeatureItems,
  type SidebarMenuItem,
} from '../constants/menu-items'

const ALL_FEATURE_KEYS: Array<FeatureKey> = Object.values(FEATURE_KEY)

function collectTitles(items: Array<SidebarMenuItem>): Array<string> {
  return items.flatMap((item) => [item.title, ...collectTitles(item.children ?? [])])
}

function titlesAfterHiding(...forbidden: Array<FeatureKey>): Array<string> {
  return collectTitles(removeForbiddenFeatureItems(buildMenuItems(), new Set(forbidden)))
}

describe('removeForbiddenFeatureItems', () => {
  const menu: Array<SidebarMenuItem> = [
    { title: 'Dashboard', url: '/' },
    {
      title: 'Kế toán',
      featureKey: FEATURE_KEY.ACCOUNTING,
      children: [{ title: 'Hoá đơn bán ra', url: '/accounting/sales-invoices' }],
    },
    {
      title: 'Nhân sự',
      children: [
        { title: 'Nhân viên', url: '/hrm/employee' },
        { title: 'Trò chuyện lồng cấp 2', featureKey: FEATURE_KEY.CHAT, url: '/chat' },
      ],
    },
  ]

  it('trả về nguyên menu khi không có cụm nào bị tắt', () => {
    expect(removeForbiddenFeatureItems(menu, new Set())).toBe(menu)
  })

  it('xoá item cấp 1 kèm toàn bộ cây con của nó', () => {
    const titles = collectTitles(
      removeForbiddenFeatureItems(menu, new Set([FEATURE_KEY.ACCOUNTING]))
    )

    expect(titles).not.toContain('Kế toán')
    expect(titles).not.toContain('Hoá đơn bán ra')
    expect(titles).toContain('Dashboard')
  })

  it('xoá được cả item gắn featureKey ở cấp sâu hơn', () => {
    const titles = collectTitles(removeForbiddenFeatureItems(menu, new Set([FEATURE_KEY.CHAT])))

    expect(titles).not.toContain('Trò chuyện lồng cấp 2')
    expect(titles).toContain('Nhân viên')
  })

  it('không mutate mảng gốc', () => {
    const snapshot = collectTitles(menu)
    removeForbiddenFeatureItems(menu, new Set([FEATURE_KEY.ACCOUNTING]))

    expect(collectTitles(menu)).toEqual(snapshot)
  })
})

describe('menu thật — gắn featureKey đúng 5 cụm', () => {
  it('mỗi cụm tính năng có đúng một item cấp 1 mang featureKey tương ứng', () => {
    const topLevelItems = buildMenuItems()

    ALL_FEATURE_KEYS.forEach((featureKey) => {
      const owners = topLevelItems.filter((item) => item.featureKey === featureKey)

      expect(owners).toHaveLength(1)
      expect(owners[0].title).toBe(FEATURE_LABEL[featureKey])
    })
  })

  it('hiển thị đủ 5 cụm khi không tắt cụm nào', () => {
    const titles = titlesAfterHiding()

    ALL_FEATURE_KEYS.forEach((featureKey) => {
      expect(titles).toContain(FEATURE_LABEL[featureKey])
    })
  })

  it('ẩn đúng cụm được chỉ định, không đụng cụm khác', () => {
    const titles = titlesAfterHiding(FEATURE_KEY.ELIBRARY, FEATURE_KEY.CHAT)

    expect(titles).not.toContain(FEATURE_LABEL[FEATURE_KEY.ELIBRARY])
    expect(titles).not.toContain(FEATURE_LABEL[FEATURE_KEY.CHAT])
    expect(titles).toContain(FEATURE_LABEL[FEATURE_KEY.ACCOUNTING])
    expect(titles).toContain(FEATURE_LABEL[FEATURE_KEY.GROUP_CHAT])
  })

  it('ẩn cụm "Kế toán" kéo theo toàn bộ menu con của nó', () => {
    const titles = titlesAfterHiding(FEATURE_KEY.ACCOUNTING)

    expect(titles).not.toContain(FEATURE_LABEL[FEATURE_KEY.ACCOUNTING])
    expect(titles).not.toContain('Tài khoản ngân hàng')
    expect(titles).toContain('Dashboard')
  })

  it('ẩn cụm "Thư ký dự án" kéo theo toàn bộ menu con của nó', () => {
    const titles = titlesAfterHiding(FEATURE_KEY.PROJECT_SECRETARY)

    expect(titles).not.toContain(FEATURE_LABEL[FEATURE_KEY.PROJECT_SECRETARY])
    expect(titles).toContain('Dashboard')
  })

  it('ẩn được toàn bộ 5 cụm cùng lúc mà phần menu còn lại vẫn nguyên', () => {
    const titles = titlesAfterHiding(...ALL_FEATURE_KEYS)

    ALL_FEATURE_KEYS.forEach((featureKey) => {
      expect(titles).not.toContain(FEATURE_LABEL[featureKey])
    })
    expect(titles).toContain('Dashboard')
    expect(titles).toContain('Nhân sự')
  })
})

describe('getMenuItems — nối biến môi trường vào menu', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function getMenuTitlesWithEnv(rawValue: string): Promise<Array<string>> {
    vi.stubEnv('VITE_FORBIDDEN_FEATURES', rawValue)
    vi.resetModules()
    const menuModule = await import('../constants/menu-items')
    return collectTitles(menuModule.getMenuItems())
  }

  // Timeout nới rộng: mỗi case phải resetModules rồi nạp lại cả cây import của menu.
  it('đọc VITE_FORBIDDEN_FEATURES và lọc menu theo đúng giá trị', { timeout: 30_000 }, async () => {
    const titles = await getMenuTitlesWithEnv('elibrary,chat')

    expect(titles).not.toContain(FEATURE_LABEL[FEATURE_KEY.ELIBRARY])
    expect(titles).not.toContain(FEATURE_LABEL[FEATURE_KEY.CHAT])
    expect(titles).toContain(FEATURE_LABEL[FEATURE_KEY.ACCOUNTING])
  })

  it('giữ nguyên đủ 5 cụm khi VITE_FORBIDDEN_FEATURES rỗng', { timeout: 30_000 }, async () => {
    const titles = await getMenuTitlesWithEnv('')

    ALL_FEATURE_KEYS.forEach((featureKey) => {
      expect(titles).toContain(FEATURE_LABEL[featureKey])
    })
  })
})
