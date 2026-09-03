import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const loadInitialProjectOptions = vi.fn().mockResolvedValue([{ value: 12, label: 'DA-12 - Khu A' }])

vi.mock('@/hooks/useProjectSelect', () => ({
  useProjectSelect: () => ({
    loadProjectOptions: vi
      .fn()
      .mockResolvedValue({ items: [], nextPage: null, hasNextPage: false }),
    loadInitialProjectOptions,
  }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMapOptions: new Map() }),
}))

import RefundBookingFilterForm, {
  RefundBookingFilterFormRef,
  RefundBookingFilterFormData,
} from './RefundBookingFilterForm'
import { BookingRefundStatus as BookingRefundStatusFilter } from '@/constants/api-schema-aliases'
function mountForm(initialValues?: Record<string, unknown>) {
  const ref = createRef<RefundBookingFilterFormRef>()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RefundBookingFilterForm ref={ref} initialValues={initialValues} isOpen />
    </QueryClientProvider>
  )
  return ref
}

describe('RefundBookingFilterForm — tên field khớp query param BE', () => {
  it('trả về key `project` (không phải `project_id`) để BE nhận được bộ lọc dự án', () => {
    const formRef = mountForm({ project: '12', status: BookingRefundStatusFilter.pending_admin })

    const values = formRef.current?.getValues() as RefundBookingFilterFormData

    expect(values).toEqual({ project: 12, status: BookingRefundStatusFilter.pending_admin })
    expect(values).not.toHaveProperty('project_id')
  })

  it('ép `project` từ chuỗi URL về number để Select khớp đúng option', () => {
    const formRef = mountForm({ project: '7' })

    expect(formRef.current?.getValues().project).toBe(7)
  })

  it('bỏ qua `project` không hợp lệ trên URL thay vì gửi NaN lên API', () => {
    const formRef = mountForm({ project: 'abc' })

    expect(formRef.current?.getValues().project).toBeUndefined()
  })

  it('clearForm() xoá sạch cả hai tiêu chí', () => {
    const formRef = mountForm({ project: '12', status: BookingRefundStatusFilter.approved })

    formRef.current?.clearForm()

    expect(formRef.current?.getValues()).toEqual({ project: undefined, status: undefined })
  })

  it('nạp lại nhãn dự án đang lọc khi mở lại dialog (loadInitialOptions)', async () => {
    mountForm({ project: '12' })

    await waitFor(() => expect(loadInitialProjectOptions).toHaveBeenCalledWith([12]))
  })
})
