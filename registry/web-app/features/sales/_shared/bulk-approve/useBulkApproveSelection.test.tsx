import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useBulkApproveSelection } from './useBulkApproveSelection'
import {
  BULK_APPROVE_MAX_ITEMS,
  BULK_APPROVE_STEP,
  type BulkApproveOutcome,
  type BulkApproveResult,
} from './bulk-approve-model'

type Row = { id: number; code: string; status: string }

const PAGE_1: Row[] = [
  { id: 1, code: 'HD-001', status: 'pending_admin' },
  { id: 2, code: 'HD-002', status: 'pending_accountant' },
  { id: 3, code: 'HD-003', status: 'approved' },
]
const PAGE_2: Row[] = [{ id: 4, code: 'HD-004', status: 'pending_admin_lead' }]

const STEP_BY_STATUS: Record<string, (typeof BULK_APPROVE_STEP)[keyof typeof BULK_APPROVE_STEP]> = {
  pending_admin: BULK_APPROVE_STEP.ADMIN,
  pending_admin_lead: BULK_APPROVE_STEP.ADMIN_LEAD,
  pending_accountant: BULK_APPROVE_STEP.ACCOUNTANT,
}

const EMPTY_RESULT: BulkApproveResult = { approved: [], skipped: [] }

type Params = Parameters<typeof useBulkApproveSelection<Row>>[0]

function setup(overrides: Partial<Params> = {}) {
  const submit: Params['submit'] & ReturnType<typeof vi.fn> = vi
    .fn()
    .mockResolvedValue(EMPTY_RESULT)

  const params: Params = {
    rows: PAGE_1 as readonly Row[],
    scopeKey: 'status=pending',
    enabled: true,
    getRowId: (row: Row) => row.id,
    resolveStep: (row: Row) => STEP_BY_STATUS[row.status] ?? null,
    canRunStep: () => true,
    describeRow: (row: Row) => ({ code: row.code, subject: 'Khách A' }),
    submit,
    ...overrides,
  }

  const view = renderHook((props: Params) => useBulkApproveSelection<Row>(props), {
    initialProps: params,
  })
  return { ...view, submit, params }
}

describe('useBulkApproveSelection', () => {
  it('chỉ cho tích dòng đang chờ duyệt', () => {
    const { result } = setup()
    expect(result.current.isRowSelectable(PAGE_1[0])).toBe(true)
    // `approved` không nằm trong luồng duyệt
    expect(result.current.isRowSelectable(PAGE_1[2])).toBe(false)
  })

  it('không cho tích dòng mà người dùng thiếu quyền của đúng bàn duyệt đó', () => {
    const { result } = setup({
      canRunStep: (step) => step === BULK_APPROVE_STEP.ACCOUNTANT,
    })
    // đang chờ Admin, người dùng chỉ có quyền Kế toán
    expect(result.current.isRowSelectable(PAGE_1[0])).toBe(false)
    expect(result.current.isRowSelectable(PAGE_1[1])).toBe(true)
  })

  it('giữ lựa chọn của trang trước khi sang trang mới', () => {
    const { result, rerender, params } = setup()

    act(() => result.current.setRowSelection({ '1': true }))
    expect(result.current.candidates.map((c) => c.code)).toEqual(['HD-001'])

    // Sang trang 2: dòng id=1 không còn trong `rows` nữa
    rerender({ ...params, rows: PAGE_2 })
    act(() => result.current.setRowSelection({ '1': true, '4': true }))

    expect(result.current.candidates.map((c) => c.id).sort()).toEqual([1, 4])
    expect(result.current.selectedCount).toBe(2)
  })

  it('xoá sạch lựa chọn khi đổi bộ lọc (scopeKey đổi)', () => {
    const { result, rerender, params } = setup()

    act(() => result.current.setRowSelection({ '1': true, '2': true }))
    expect(result.current.selectedCount).toBe(2)

    rerender({ ...params, scopeKey: 'status=approved' })
    expect(result.current.selectedCount).toBe(0)
    expect(result.current.rowSelection).toEqual({})
  })

  it('đếm số bản ghi theo từng bàn duyệt', () => {
    const { result } = setup()
    act(() => result.current.setRowSelection({ '1': true, '2': true }))

    expect(result.current.countByStep).toEqual({
      [BULK_APPROVE_STEP.ADMIN]: 1,
      [BULK_APPROVE_STEP.ACCOUNTANT]: 1,
    })
  })

  it('gửi ghi chú RIÊNG cho từng bản ghi, không dùng một ghi chú chung', async () => {
    const { result, submit } = setup()

    act(() => result.current.setRowSelection({ '1': true, '2': true }))
    act(() => result.current.setNote(1, 'ghi chú của một'))
    act(() => result.current.setNote(2, 'ghi chú của hai'))

    await act(async () => {
      await result.current.runApprove()
    })

    expect(submit).toHaveBeenCalledTimes(1)
    const items = submit.mock.calls[0][0] as { id: number; note: string }[]
    expect([...items].sort((a, b) => a.id - b.id)).toEqual([
      { id: 1, note: 'ghi chú của một' },
      { id: 2, note: 'ghi chú của hai' },
    ])
  })

  it('bỏ tích một dòng thì ghi chú của dòng đó không được gửi kèm nữa', async () => {
    const { result, submit } = setup()

    act(() => result.current.setRowSelection({ '1': true, '2': true }))
    act(() => result.current.setNote(1, 'gõ rồi lại bỏ chọn'))
    act(() => result.current.setRowSelection({ '2': true }))

    await act(async () => {
      await result.current.runApprove()
    })

    expect(submit.mock.calls[0][0]).toEqual([{ id: 2, note: '' }])
  })

  it('tích lại dòng đã bỏ thì ghi chú cũ KHÔNG sống lại', async () => {
    // Bỏ tích là người dùng đã rút dòng đó ra; tích lại mà ô ghi chú tự điền lại chữ cũ thì họ
    // có thể duyệt kèm một ghi chú mình không còn muốn gửi mà không nhận ra.
    const { result, submit } = setup()

    act(() => result.current.setRowSelection({ '1': true }))
    act(() => result.current.setNote(1, 'chữ cũ'))
    act(() => result.current.setRowSelection({}))
    act(() => result.current.setRowSelection({ '1': true }))

    expect(result.current.notes[1] ?? '').toBe('')

    await act(async () => {
      await result.current.runApprove()
    })
    expect(submit.mock.calls[0][0]).toEqual([{ id: 1, note: '' }])
  })

  it('ghi chú chỉ có khoảng trắng được coi như để trống', async () => {
    const { result, submit } = setup()

    act(() => result.current.setRowSelection({ '1': true }))
    act(() => result.current.setNote(1, '   '))

    await act(async () => {
      await result.current.runApprove()
    })

    expect(submit.mock.calls[0][0]).toEqual([{ id: 1, note: '' }])
  })

  it('báo vượt trần khi chọn nhiều hơn giới hạn của BE', () => {
    const manyRows: Row[] = Array.from({ length: BULK_APPROVE_MAX_ITEMS + 1 }, (_, i) => ({
      id: i + 1,
      code: `HD-${i + 1}`,
      status: 'pending_admin',
    }))
    const { result } = setup({ rows: manyRows })

    act(() =>
      result.current.setRowSelection(
        Object.fromEntries(manyRows.map((row) => [String(row.id), true]))
      )
    )

    expect(result.current.selectedCount).toBe(BULK_APPROVE_MAX_ITEMS + 1)
    expect(result.current.isOverLimit).toBe(true)
  })

  it('không vượt trần khi chọn đúng bằng giới hạn', () => {
    const rows: Row[] = Array.from({ length: BULK_APPROVE_MAX_ITEMS }, (_, i) => ({
      id: i + 1,
      code: `HD-${i + 1}`,
      status: 'pending_admin',
    }))
    const { result } = setup({ rows })

    act(() =>
      result.current.setRowSelection(Object.fromEntries(rows.map((r) => [String(r.id), true])))
    )
    expect(result.current.isOverLimit).toBe(false)
  })

  it('duyệt sạch cả lô thì KHÔNG mở dialog kết quả, chỉ trả outcome cho call site tự toast', async () => {
    // Dialog toàn màu xanh không có gì để đọc; bắt bấm "Đóng" là thêm một cú bấm vô nghĩa vào
    // việc người duyệt làm hàng chục lần mỗi phiên. Đây cũng là hành vi đã ghi trong SRS và
    // comment QA — lệch là QA báo bug.
    const submit = vi.fn().mockResolvedValue({
      approved: [
        { id: 1, code: 'HD-001', step: BULK_APPROVE_STEP.ADMIN },
        { id: 2, code: 'HD-002', step: BULK_APPROVE_STEP.ACCOUNTANT },
      ],
      skipped: [],
    } satisfies BulkApproveResult)
    const { result } = setup({ submit })

    act(() => result.current.setRowSelection({ '1': true, '2': true }))
    // Hứng qua mảng thay vì biến `let`: gán bên trong callback thì TS không thấy, nên biến khai
    // `= null` bị thu hẹp về `never` và mọi truy cập thuộc tính sau đó thành lỗi biên dịch.
    const returned: (BulkApproveOutcome | null)[] = []
    await act(async () => {
      returned.push(await result.current.runApprove())
    })

    expect(result.current.outcome).toBeNull()
    expect(returned[0]?.approvedRows).toHaveLength(2)
    expect(returned[0]?.skippedRows).toEqual([])
    expect(result.current.selectedCount).toBe(0)
  })

  it('duyệt xong thì xoá lựa chọn và mở dialog kết quả', async () => {
    const submit = vi.fn().mockResolvedValue({
      approved: [{ id: 1, code: 'HD-001', step: BULK_APPROVE_STEP.ADMIN }],
      skipped: [{ id: 2, code: '', reason: 'Chưa có phiếu hỗ trợ phí được duyệt' }],
    } satisfies BulkApproveResult)
    const { result } = setup({ submit })

    act(() => result.current.setRowSelection({ '1': true, '2': true }))
    await act(async () => {
      await result.current.runApprove()
    })

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.confirmOpen).toBe(false)
    expect(result.current.outcome?.approvedRows).toHaveLength(1)
    // `code` rỗng từ BE vẫn hiện đúng mã người dùng vừa thấy trên bảng
    expect(result.current.outcome?.skippedRows[0]).toMatchObject({
      id: 2,
      code: 'HD-002',
      reason: 'Chưa có phiếu hỗ trợ phí được duyệt',
    })
  })

  it('không gọi API khi chưa chọn dòng nào', async () => {
    const { result, submit } = setup()
    await act(async () => {
      await expect(result.current.runApprove()).resolves.toBeNull()
    })
    expect(submit).not.toHaveBeenCalled()
  })

  it('lỗi cấp-lô được ném ra cho call site, lựa chọn KHÔNG bị xoá', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('mất mạng'))
    const { result } = setup({ submit })

    act(() => result.current.setRowSelection({ '1': true }))
    await act(async () => {
      await expect(result.current.runApprove()).rejects.toThrow('mất mạng')
    })

    // Xoá lựa chọn khi gọi API thất bại là bắt người dùng tích lại và gõ lại ghi chú.
    expect(result.current.selectedCount).toBe(1)
    expect(result.current.outcome).toBeNull()
  })
})
