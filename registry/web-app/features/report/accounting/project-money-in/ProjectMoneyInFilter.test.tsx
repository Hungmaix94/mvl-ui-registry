import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { createRef } from 'react'

const h = vi.hoisted(() => ({
  getProductInventoryDropdownMock: vi.fn(),
  selectProps: [] as Array<Record<string, any>>,
}))

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({
    getProductInventoryDropdown: h.getProductInventoryDropdownMock,
  }),
}))

vi.mock('@/hooks/useProjectSelect', () => ({
  useProjectSelect: () => ({
    loadProjectOptions: vi.fn(),
    loadInitialProjectOptions: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMapOptions: new Map(),
  }),
}))

vi.mock('@/components/ui', async () => {
  const { forwardRef } = await import('react')
  return {
    Select: forwardRef((props: Record<string, any>, _ref) => {
      h.selectProps.push(props)
      return null
    }),
  }
})

import ProjectMoneyInFilter, { type ProjectMoneyInFilterRef } from './ProjectMoneyInFilter'

beforeEach(() => {
  h.getProductInventoryDropdownMock.mockReset()
  h.selectProps.length = 0
})

function getSelectPropsByLabel(label: string) {
  return h.selectProps.find((p) => p.label === label)
}

describe('ProjectMoneyInFilter — filter mã căn (unit_code)', () => {
  it('hỗ trợ loadInitialOptions theo mảng values và trả về danh sách SelectOption hợp lệ', async () => {
    h.getProductInventoryDropdownMock.mockResolvedValue({
      results: [
        {
          id: 123,
          code: 'BH000002364',
          unit_number: 'A.1204',
          status: 'available',
        },
      ],
    })

    const ref = createRef<ProjectMoneyInFilterRef>()
    render(
      <ProjectMoneyInFilter ref={ref} initialValues={{ unit_code: 'BH000002364' }} isOpen={true} />
    )

    const unitCodeProps = getSelectPropsByLabel('Mã căn')
    expect(unitCodeProps).toBeDefined()
    expect(unitCodeProps?.loadInitialOptions).toBeDefined()

    // Test loadInitialOptions with array of values
    const options = await unitCodeProps?.loadInitialOptions(['BH000002364'])
    expect(h.getProductInventoryDropdownMock).toHaveBeenCalledWith({
      search: 'BH000002364',
      page_size: 10,
    })
    expect(options).toEqual([
      {
        label: 'BH000002364 - A.1204',
        value: 'BH000002364',
      },
    ])
  })

  it('tải danh sách mã căn loadOptions theo tham số tìm kiếm và dự án đã chọn', async () => {
    h.getProductInventoryDropdownMock.mockResolvedValue({
      results: [
        {
          id: 123,
          code: 'BH000002364',
          unit_number: 'A.1204',
          status: 'available',
        },
      ],
      next: null,
    })

    const ref = createRef<ProjectMoneyInFilterRef>()
    render(<ProjectMoneyInFilter ref={ref} initialValues={{ project: '196' }} isOpen={true} />)

    const unitCodeProps = getSelectPropsByLabel('Mã căn')
    const result = await unitCodeProps?.loadOptions({
      page: 1,
      pageSize: 25,
      query: 'BH000',
    })

    expect(h.getProductInventoryDropdownMock).toHaveBeenCalledWith({
      page: 1,
      page_size: 25,
      search: 'BH000',
      project: 196,
    })
    expect(result).toEqual({
      items: [
        {
          label: 'BH000002364 - A.1204',
          value: 'BH000002364',
        },
      ],
      hasNextPage: false,
      nextPage: 2,
    })
  })
})
