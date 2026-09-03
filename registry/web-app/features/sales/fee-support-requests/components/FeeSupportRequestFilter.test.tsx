import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'

const h = vi.hoisted(() => ({
  selectProps: [] as Array<Record<string, any>>,
}))

vi.mock('@/hooks/useProjectSelect', () => ({
  useProjectSelect: () => ({
    loadProjectOptions: vi.fn(),
    loadInitialProjectOptions: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMapOptions: new Map() }),
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

import {
  FEE_SUPPORT_DOCUMENT_STATUS_LABEL,
  FeeSupportRequestDocument_status,
} from '../constants/fee-support-request-constants'
import FeeSupportRequestFilter, { type FeeSupportRequestFilterRef } from './FeeSupportRequestFilter'

const DOCUMENT_STATUS_LABEL = 'Trạng thái duyệt hồ sơ'

beforeEach(() => {
  h.selectProps.length = 0
})

const propsByLabel = (label: string) => h.selectProps.find((p) => p.label === label)

describe('FeeSupportRequestFilter — bộ lọc trạng thái duyệt hồ sơ (CR 86eyhfz9b)', () => {
  it('render dropdown "Trạng thái duyệt hồ sơ" cạnh các bộ lọc sẵn có', () => {
    render(<FeeSupportRequestFilter ref={createRef<FeeSupportRequestFilterRef>()} />)

    expect(propsByLabel(DOCUMENT_STATUS_LABEL)).toBeDefined()
    expect(propsByLabel('Trạng thái')).toBeDefined()
    expect(propsByLabel('Nguồn tạo')).toBeDefined()
    expect(propsByLabel('Dự án')).toBeDefined()
  })

  // Lưới 2 cột ⇒ thứ tự khai báo QUYẾT ĐỊNH bố cục: hàng trên là bối cảnh,
  // hàng dưới gom 2 trạng thái cạnh nhau. Đảo thứ tự là phá layout.
  it('xếp Dự án + Nguồn tạo hàng trên, 2 trạng thái hàng dưới', () => {
    render(<FeeSupportRequestFilter ref={createRef<FeeSupportRequestFilterRef>()} />)

    // Component render nhiều lần nên mock tích luỹ — lấy thứ tự xuất hiện đầu tiên.
    const order = [...new Set(h.selectProps.map((p) => p.label as string))]
    expect(order).toEqual(['Dự án', 'Nguồn tạo', 'Trạng thái', DOCUMENT_STATUS_LABEL])
  })

  it('liệt kê đủ 4 trạng thái hồ sơ kèm nhãn tiếng Việt', () => {
    render(<FeeSupportRequestFilter ref={createRef<FeeSupportRequestFilterRef>()} />)

    expect(propsByLabel(DOCUMENT_STATUS_LABEL)?.options).toEqual(
      Object.values(FeeSupportRequestDocument_status).map((value) => ({
        value,
        label: FEE_SUPPORT_DOCUMENT_STATUS_LABEL[value],
      }))
    )
  })

  it('cho phép xoá lựa chọn (isClearable) để về danh sách đầy đủ', () => {
    render(<FeeSupportRequestFilter ref={createRef<FeeSupportRequestFilterRef>()} />)

    expect(propsByLabel(DOCUMENT_STATUS_LABEL)?.isClearable).toBe(true)
  })

  it('getValues trả về document_status đã chọn sẵn từ URL', () => {
    const ref = createRef<FeeSupportRequestFilterRef>()
    render(
      <FeeSupportRequestFilter
        ref={ref}
        initialValues={{ document_status: FeeSupportRequestDocument_status.needs_supplement }}
      />
    )

    expect(ref.current?.getValues().document_status).toBe(
      FeeSupportRequestDocument_status.needs_supplement
    )
  })

  it('clearForm xoá cả document_status, không chỉ các bộ lọc cũ', () => {
    const ref = createRef<FeeSupportRequestFilterRef>()
    render(
      <FeeSupportRequestFilter
        ref={ref}
        initialValues={{
          status: 'approved',
          origin: 'web_secretary',
          project: '12',
          document_status: FeeSupportRequestDocument_status.docs_approved,
        }}
      />
    )

    act(() => ref.current?.clearForm())

    expect(ref.current?.getValues()).toEqual({
      status: undefined,
      origin: undefined,
      project: undefined,
      document_status: undefined,
    })
  })
})
