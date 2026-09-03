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

/**
 * Hai màn chi tiết "Giao dịch tiền về đợt này" và "Chia HH theo tháng" từng tự ráp mảng
 * breadcrumb bên trong feature component. Test này khoá lại hợp đồng đúng: crumb sinh từ
 * metadata route trong `AppRoute.constant.ts`, cấp cuối đến từ `idLabel`.
 */
const renderAt = (pathname: string, idLabel: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <PageTitle title="Bất kỳ" idLabel={idLabel} />
    </MemoryRouter>
  )

const crumbTexts = () =>
  screen
    .getAllByRole('listitem')
    .map((li) => li.textContent?.trim())
    .filter((t): t is string => !!t)

describe('Breadcrumb của màn chi tiết chia hoa hồng', () => {
  it('màn "Giao dịch tiền về đợt này" đi đủ cấp Kế toán → Giao dịch → danh sách → mã căn', () => {
    renderAt(APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL.replace(':id', '178'), 'VH100011')

    expect(crumbTexts()).toEqual([
      'Kế toán',
      'Giao dịch',
      // Nhãn phải trùng menu (`menu-items.ts`) và tiêu đề màn danh sách.
      'Giao dịch tiền về đợt này',
      'VH100011',
    ])
  })

  it('màn "Chia HH theo tháng" đi đủ cấp Kế toán → Hoa hồng sale → danh sách → mã căn', () => {
    renderAt(APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL.replace(':id', '178'), 'VH100011')

    expect(crumbTexts()).toEqual(['Kế toán', 'Hoa hồng sale', 'Chia HH theo tháng', 'VH100011'])
  })

  it('cấp namespace không bấm được, cấp danh sách thì có link', () => {
    renderAt(APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL.replace(':id', '178'), 'VH100011')

    // "Giao dịch" là namespace (`FORBIDDEN_NAVIGATE_ROUTES`) — bấm vào sẽ ra 404.
    expect(screen.queryByRole('link', { name: 'Giao dịch' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Giao dịch tiền về đợt này' })).toHaveAttribute(
      'href',
      APP_PATH.DEAL_PERIOD_ALLOCATION
    )
  })
})
