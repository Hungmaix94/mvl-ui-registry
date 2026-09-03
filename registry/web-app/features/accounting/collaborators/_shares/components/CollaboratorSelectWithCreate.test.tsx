import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CollaboratorSelectWithCreate, {
  buildCollaboratorCreateUrl,
} from './CollaboratorSelectWithCreate'

const { emptyQuery, canMock, hasLoadFailedMock } = vi.hoisted(() => ({
  // Từ khoá mà `Select` sẽ truyền vào `renderEmpty` — mỗi test tự đặt lại.
  emptyQuery: { current: '' },
  canMock: vi.fn(),
  hasLoadFailedMock: vi.fn(),
}))

// Stub `Select`: cmdk + popover không chạy ổn trong jsdom, ở đây chỉ cần render đúng khối empty.
vi.mock('@/components/ui', async () => {
  const { forwardRef } = await import('react')
  return {
    Select: forwardRef(({ label, searchPlaceholder, renderEmpty }: any, _ref: unknown) => (
      <div>
        <span>{label}</span>
        <span data-testid="search-placeholder">{searchPlaceholder}</span>
        <div data-testid="empty-state">{renderEmpty?.(emptyQuery.current)}</div>
      </div>
    )),
  }
})

vi.mock('@/hooks/useCollaboratorSelect', () => ({
  useCollaboratorSelect: () => ({
    loadCollaboratorOptions: vi.fn().mockResolvedValue({ items: [] }),
    loadInitialCollaboratorOptions: vi.fn().mockResolvedValue([]),
    hasLoadFailed: hasLoadFailedMock,
  }),
}))

vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: canMock }) }))

function renderSelect(props: Record<string, unknown> = {}) {
  return render(<CollaboratorSelectWithCreate label="Cộng tác viên (CTV)" {...props} />)
}

describe('buildCollaboratorCreateUrl', () => {
  it('prefill CCCD khi từ khoá là chuỗi số căn cước', () => {
    expect(buildCollaboratorCreateUrl('079123456789', 'http://localhost:3000')).toBe(
      'http://localhost:3000/accounting/collaborator/manage/new?id_number=079123456789'
    )
  })

  // Kiểm qua `URLSearchParams` chứ không so chuỗi thô: đây đúng là bộ giải mã mà `useSearchParams`
  // của trang tạo CTV dùng (khoảng trắng mã hoá thành `+`, không phải `%20`).
  it('prefill họ tên khi từ khoá là chữ', () => {
    const url = new URL(buildCollaboratorCreateUrl('Nguyễn Văn Hoàng', 'http://localhost:3000'))

    expect(url.pathname).toBe('/accounting/collaborator/manage/new')
    expect(url.searchParams.get('name')).toBe('Nguyễn Văn Hoàng')
    expect(url.searchParams.get('id_number')).toBeNull()
  })

  it('không gắn param khi chưa gõ gì', () => {
    expect(buildCollaboratorCreateUrl('   ', 'http://localhost:3000')).toBe(
      'http://localhost:3000/accounting/collaborator/manage/new'
    )
  })
})

describe('CollaboratorSelectWithCreate (CR STT26)', () => {
  beforeEach(() => {
    // `restoreAllMocks` phải chạy TRƯỚC: nó gỡ cả implementation của `vi.fn()`, đặt sau thì
    // `canMock` trả undefined và nút tạo mới biến mất ở mọi test.
    vi.restoreAllMocks()
    emptyQuery.current = ''
    canMock.mockReset().mockReturnValue(true)
    hasLoadFailedMock.mockReset().mockReturnValue(false)
  })

  it('gợi ý tìm theo mã / họ tên / CCCD trong ô tìm kiếm', () => {
    renderSelect()

    expect(screen.getByTestId('search-placeholder')).toHaveTextContent(
      'Tìm theo mã, họ tên hoặc CCCD...'
    )
  })

  it('không tìm thấy → hiện nút "Tạo mới CTV" kèm từ khoá đang gõ', () => {
    emptyQuery.current = '079123456789'
    renderSelect()

    expect(screen.getByTestId('empty-state')).toHaveTextContent(
      'Không tìm thấy cộng tác viên "079123456789"'
    )
    expect(screen.getByRole('button', { name: /Tạo mới CTV/i })).toBeInTheDocument()
  })

  it('ẩn nút tạo mới khi không có quyền `collaborator.create`', () => {
    canMock.mockReturnValue(false)
    emptyQuery.current = 'Nguyễn Văn Hoàng'
    renderSelect()

    expect(screen.getByTestId('empty-state')).toHaveTextContent(
      'Không tìm thấy cộng tác viên "Nguyễn Văn Hoàng".'
    )
    expect(screen.queryByRole('button', { name: /Tạo mới CTV/i })).not.toBeInTheDocument()
  })

  it('ẩn nút tạo mới khi field đang bị disabled', () => {
    emptyQuery.current = 'Nguyễn Văn Hoàng'
    renderSelect({ disabled: true })

    expect(screen.queryByRole('button', { name: /Tạo mới CTV/i })).not.toBeInTheDocument()
  })

  // Rỗng-vì-API-lỗi mà vẫn mời tạo mới thì người dùng sẽ tạo trùng một CTV đã tồn tại.
  it('tải lỗi → báo lỗi và KHÔNG mời tạo mới', () => {
    hasLoadFailedMock.mockReturnValue(true)
    emptyQuery.current = 'Nguyễn Văn Hoàng'
    renderSelect()

    expect(screen.getByTestId('empty-state')).toHaveTextContent(
      'Không tải được danh sách cộng tác viên. Vui lòng thử lại.'
    )
    expect(screen.queryByRole('button', { name: /Tạo mới CTV/i })).not.toBeInTheDocument()
  })

  // Mở TAB MỚI chứ không điều hướng tab hiện tại: form hợp đồng CTV đang dở phải còn nguyên.
  it('nhấn "Tạo mới CTV" → mở trang tạo CTV ở tab mới kèm prefill', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    emptyQuery.current = '079123456789'
    renderSelect()

    await user.click(screen.getByRole('button', { name: /Tạo mới CTV/i }))

    expect(openSpy).toHaveBeenCalledWith(
      `${window.location.origin}/accounting/collaborator/manage/new?id_number=079123456789`,
      '_blank',
      'noopener,noreferrer'
    )
  })
})
