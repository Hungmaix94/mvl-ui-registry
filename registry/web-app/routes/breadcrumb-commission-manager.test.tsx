import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// jsdom lacks ResizeObserver, which parts of the layout rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

import PageTitle from '@/components/ui/page-title/PageTitle'
import { APP_PATH } from '@/routes'
import { buildMenuItems, type SidebarMenuItem } from '@/constants/menu-items'

/**
 * Màn danh sách không tự khai `title`/`breadcrumb` — cả hai sinh từ metadata route trong
 * `AppRoute.constant.ts`. Route nào thiếu mục title thì `PageTitle` rơi về fallback capitalize
 * segment URL, ra nhãn tiếng Anh kiểu "Manager-monthly" lệch hẳn với menu sidebar.
 * Test này khoá lại: nhãn breadcrump cấp cuối + tiêu đề màn phải trùng đúng nhãn trong menu.
 */
const findMenuTitleByUrl = (items: Array<SidebarMenuItem>, url: string): string | undefined => {
  // Destructure thay vì `item.children` — luật `testing-library/no-node-access` tưởng nhầm
  // cây menu là DOM node.
  for (const { title, url: itemUrl, children } of items) {
    if (itemUrl === url) return title
    const found = children ? findMenuTitleByUrl(children, url) : undefined
    if (found) return found
  }
  return undefined
}

const renderAt = (pathname: string, extraProps: { title?: string; idLabel?: string } = {}) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <PageTitle {...extraProps} />
    </MemoryRouter>
  )

const crumbTexts = () =>
  screen
    .getAllByRole('listitem')
    .map((li) => li.textContent?.trim())
    .filter((t): t is string => !!t)

describe('Breadcrumb của màn "HH theo tháng — Quản lý"', () => {
  const menuTitle = 'HH theo tháng — Quản lý'

  it('dùng đúng nhãn của menu sidebar, không phải segment URL', () => {
    expect(findMenuTitleByUrl(buildMenuItems(), APP_PATH.COMMISSION_MANAGER_MONTHLY)).toBe(
      menuTitle
    )

    renderAt(APP_PATH.COMMISSION_MANAGER_MONTHLY)

    expect(crumbTexts()).toEqual(['Kế toán', 'Hoa hồng quản lý', menuTitle])
    expect(screen.getByRole('heading', { name: menuTitle })).toBeInTheDocument()
  })

  it('nằm dưới namespace "Hoa hồng quản lý" đúng nhóm menu, không phải "Hoa hồng sale"', () => {
    // Màn thuộc nhóm sidebar "Hoa hồng quản lý" nên URL phải nằm dưới namespace của nhóm đó —
    // crumb cha sinh thẳng từ segment URL nên đặt sai chỗ là lệch nhóm ngay.
    expect(
      APP_PATH.COMMISSION_MANAGER_MONTHLY.startsWith(
        `${APP_PATH.ACCOUNTING_COMMISSION_MANAGEMENT}/`
      )
    ).toBe(true)
    expect(
      APP_PATH.COMMISSION_MANAGER_DETAIL.startsWith(`${APP_PATH.COMMISSION_MANAGER_MONTHLY}/`)
    ).toBe(true)
  })

  it('màn chi tiết đi đủ cấp Kế toán → Hoa hồng quản lý → danh sách → tên nhân viên', () => {
    renderAt(APP_PATH.COMMISSION_MANAGER_DETAIL.replace(':id', '276'), {
      title: 'Phiếu chi trả HH Quản lý · Kỳ 8/2026',
      idLabel: 'Đặng Thị Vượng',
    })

    expect(crumbTexts()).toEqual(['Kế toán', 'Hoa hồng quản lý', menuTitle, 'Đặng Thị Vượng'])
    expect(screen.getByRole('link', { name: menuTitle })).toHaveAttribute(
      'href',
      APP_PATH.COMMISSION_MANAGER_MONTHLY
    )
  })
})
