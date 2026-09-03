import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PermissionTable } from './PermissionTable'
import type { Permission } from '@/services/permission-service.ts'

function makePermission(overrides: Partial<Permission> = {}): Permission {
  return {
    id: 1,
    code: 'test.permission',
    name: 'Test Permission',
    description: '',
    module: '',
    submodule: '',
    is_deprecated: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

describe('PermissionTable', () => {
  it('vô hiệu hoá checkbox và gắn nhãn cho quyền đã ngừng dùng (deprecated)', () => {
    const active = makePermission({ id: 1, name: 'Active permission', is_deprecated: false })
    const deprecated = makePermission({ id: 2, name: 'Deprecated permission', is_deprecated: true })

    render(
      <PermissionTable
        permissions={[active, deprecated]}
        selectedIds={[]}
        onSelect={vi.fn()}
        onSelectAll={vi.fn()}
        isAllSelected={false}
        isIndeterminate={false}
        disabledIds={[deprecated.id]}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    // index 0 = header "select all" checkbox, 1 = active row, 2 = deprecated row
    expect(checkboxes[1]).not.toBeDisabled()
    expect(checkboxes[2]).toBeDisabled()

    expect(screen.getByText(/Deprecated permission \(Đã ngừng dùng\)/)).toBeInTheDocument()
    expect(screen.getByText('Active permission')).toBeInTheDocument()
  })

  it('không disable checkbox nào khi không truyền disabledIds', () => {
    const active = makePermission({ id: 1, name: 'Active permission' })

    render(
      <PermissionTable
        permissions={[active]}
        selectedIds={[]}
        onSelect={vi.fn()}
        onSelectAll={vi.fn()}
        isAllSelected={false}
        isIndeterminate={false}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach((checkbox) => expect(checkbox).not.toBeDisabled())
  })
})
