import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FeatureGuard } from '@/routes/FeatureGuard'

/**
 * Dựng một cây route tối giản mô phỏng cách `wrapRoutesWithPermission` bọc guard:
 * route cha là layout KHÔNG có element riêng (chỉ `<Outlet />`), route con mới render page.
 * Mục tiêu là chứng minh guard vừa chặn được URL vừa không làm hỏng route lồng nhau.
 */
function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route
          element={
            <FeatureGuard>
              <Outlet />
            </FeatureGuard>
          }
        >
          <Route path="/elibrary" element={<div>Trang thư viện</div>} />
          <Route path="/elibrary/my-documents" element={<div>Tài liệu cá nhân</div>} />
          <Route path="/chat" element={<div>Trang trò chuyện</div>} />
          <Route path="/chat/group-channels" element={<div>Trang group chat</div>} />
          <Route path="/hrm/employee" element={<div>Trang nhân viên</div>} />
          <Route path="/docs/:token" element={<div>Trang tài liệu chia sẻ</div>} />
        </Route>
        <Route path="/404" element={<div>Trang 404</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// `getForbiddenFeatures()` đọc `import.meta.env` tại thời điểm GỌI, nên chỉ cần stub env —
// không phải resetModules rồi nạp lại module như test của menu.
function setForbiddenFeatures(rawValue: string) {
  vi.stubEnv('VITE_FORBIDDEN_FEATURES', rawValue)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('FeatureGuard', () => {
  it('cho qua khi không tắt cụm nào', () => {
    setForbiddenFeatures('')
    renderAt('/elibrary')

    expect(screen.getByText('Trang thư viện')).toBeInTheDocument()
  })

  it('cho qua đường dẫn không thuộc cụm tính năng nào', () => {
    setForbiddenFeatures('elibrary,accounting')
    renderAt('/hrm/employee')

    expect(screen.getByText('Trang nhân viên')).toBeInTheDocument()
  })

  it('redirect về /404 khi vào thẳng URL của cụm đã tắt', () => {
    setForbiddenFeatures('elibrary')
    renderAt('/elibrary')

    expect(screen.getByText('Trang 404')).toBeInTheDocument()
    expect(screen.queryByText('Trang thư viện')).not.toBeInTheDocument()
  })

  it('chặn cả đường dẫn con của cụm đã tắt', () => {
    setForbiddenFeatures('elibrary')
    renderAt('/elibrary/my-documents')

    expect(screen.getByText('Trang 404')).toBeInTheDocument()
    expect(screen.queryByText('Tài liệu cá nhân')).not.toBeInTheDocument()
  })

  it('route lồng nhau vẫn render qua Outlet khi cụm còn bật', () => {
    setForbiddenFeatures('accounting')
    renderAt('/elibrary/my-documents')

    expect(screen.getByText('Tài liệu cá nhân')).toBeInTheDocument()
    expect(screen.queryByText('Trang 404')).not.toBeInTheDocument()
  })

  it('tắt Trò chuyện không chặn nhầm Group Chat', () => {
    setForbiddenFeatures('chat')
    renderAt('/chat/group-channels')

    expect(screen.getByText('Trang group chat')).toBeInTheDocument()
  })

  it('tắt Group Chat không chặn nhầm Trò chuyện', () => {
    setForbiddenFeatures('group-chat')
    renderAt('/chat')

    expect(screen.getByText('Trang trò chuyện')).toBeInTheDocument()
  })

  it('không chặn trang tài liệu chia sẻ public dù tắt hết mọi cụm', () => {
    setForbiddenFeatures('elibrary,project-secretary,accounting,chat,group-chat')
    renderAt('/docs/abc-token')

    expect(screen.getByText('Trang tài liệu chia sẻ')).toBeInTheDocument()
  })
})
