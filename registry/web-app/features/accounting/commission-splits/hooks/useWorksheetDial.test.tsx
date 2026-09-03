import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useWorksheetDial, type WorksheetRow } from './useWorksheetDial'
import type { CommissionSplitDetail } from '../services/commission-splits-service'

// Hook chỉ dùng một export runtime của service; phần còn lại là type (bị xoá khi build).
// Object trả về phải HẰNG — literal mới mỗi lượt gọi sẽ làm memo đổi identity mỗi render.
const { paymentProgressQuery } = vi.hoisted(() => ({
  paymentProgressQuery: { data: { periods: [] as unknown[] } },
}))
vi.mock('../services/commission-splits-service', () => ({
  useDealPaymentProgress: () => paymentProgressQuery,
}))

const WORKSHEET_ID = 181

function makeDetail(feeDefaultPct: string): CommissionSplitDetail {
  return {
    deal_id: 2907,
    fee_default_pct: feeDefaultPct,
    f2_default_pct: feeDefaultPct,
    dial_note: '',
    positions: [],
  } as unknown as CommissionSplitDetail
}

function makeWorksheet(feePct: string | null): WorksheetRow {
  return {
    worksheet_id: WORKSHEET_ID,
    representative_pbtv_id: 787,
    period_year: 2026,
    period_month: 8,
    fee_progress_pct: feePct,
    bonus_progress_pct: '0',
    f2_progress_pct: null,
    bonus_f2_progress_pct: null,
    total_distribution_pct: '40',
  } as unknown as WorksheetRow
}

describe('useWorksheetDial — seed dial không được đè lên số kế toán đang xem', () => {
  it('response không đổi số thì KHÔNG seed lại — giữ nguyên % kế toán vừa gõ', () => {
    // `refetchWorksheetQueries` bắn song song query detail và query danh sách kỳ. Detail về
    // trước ⇒ `detail` là object mới trong khi dòng danh sách VẪN mang % cũ. Neo effect vào
    // object là dial bị kéo về % cũ ngay sau khi lưu (đo được: 40 → 10 → 40, tiền Mục ④ nháy
    // theo), và kế toán blur trúng khoảng đó là PATCH đè lại con số cũ.
    const staleRow = makeWorksheet('10')
    const { result, rerender } = renderHook(
      ({ detail, currentWorksheet }) =>
        useWorksheetDial({
          detail,
          currentWorksheet,
          worksheets: [currentWorksheet],
          isWorksheetListSettled: true,
          worksheetId: WORKSHEET_ID,
        }),
      { initialProps: { detail: makeDetail('40'), currentWorksheet: staleRow } }
    )

    expect(result.current.localFeePct).toBe(10)

    // Kế toán gõ 40.
    act(() => result.current.setLocalFeePct(40))
    expect(result.current.localFeePct).toBe(40)

    // Detail refetch về: object MỚI, mọi con số y hệt. Dòng danh sách cũng là object mới
    // nhưng vẫn mang % cũ (chưa kịp refetch xong).
    rerender({ detail: makeDetail('40'), currentWorksheet: makeWorksheet('10') })

    expect(result.current.localFeePct).toBe(40)
  })

  it('seed lại khi server thực sự đổi %', () => {
    const { result, rerender } = renderHook(
      ({ detail, currentWorksheet }) =>
        useWorksheetDial({
          detail,
          currentWorksheet,
          worksheets: [currentWorksheet],
          isWorksheetListSettled: true,
          worksheetId: WORKSHEET_ID,
        }),
      { initialProps: { detail: makeDetail('40'), currentWorksheet: makeWorksheet('10') } }
    )

    expect(result.current.localFeePct).toBe(10)
    rerender({ detail: makeDetail('40'), currentWorksheet: makeWorksheet('25') })
    expect(result.current.localFeePct).toBe(25)
  })

  it('danh sách kỳ chưa về thì KHÔNG rơi về fee_default_pct', () => {
    // `currentWorksheet` undefined lúc này nghĩa là "chưa biết", KHÔNG phải "kỳ chưa ghim
    // dial". Seed default ở đây là biến % kế toán đang xem thành default của BE trong im lặng
    // — đúng cú PATCH ghi đè 40% quan sát được trên `split-sheets/181`.
    const { result, rerender } = renderHook(
      ({ worksheets, currentWorksheet, isWorksheetListSettled }) =>
        useWorksheetDial({
          detail: makeDetail('40'),
          currentWorksheet,
          worksheets,
          isWorksheetListSettled,
          worksheetId: WORKSHEET_ID,
        }),
      {
        initialProps: {
          worksheets: undefined as WorksheetRow[] | undefined,
          currentWorksheet: undefined as WorksheetRow | undefined,
          isWorksheetListSettled: false,
        },
      }
    )

    expect(result.current.localFeePct).toBe(0)

    // Danh sách về, kỳ CHƯA ghim dial ⇒ lúc này mới được lấy default của BE.
    const unpinned = makeWorksheet(null)
    rerender({
      worksheets: [unpinned],
      currentWorksheet: unpinned,
      isWorksheetListSettled: true,
    })
    expect(result.current.localFeePct).toBe(40)
  })

  it('query danh sách kỳ HỎNG vẫn phải seed — không được để overlay phủ chết màn', () => {
    // `worksheets` undefined vì query lỗi, không phải vì chưa tải xong. Nếu effect vẫn thoát
    // sớm thì `dialSeededFor` đứng yên ⇒ `isDialSyncing` không bao giờ tắt ⇒ `BusyOverlay`
    // phủ Mục ③④⑤⑥ vĩnh viễn, kế toán không thao tác được gì cho tới khi F5.
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() =>
        useWorksheetDial({
          detail: makeDetail('40'),
          currentWorksheet: undefined,
          worksheets: undefined,
          isWorksheetListSettled: true,
          worksheetId: WORKSHEET_ID,
        })
      )

      expect(result.current.localFeePct).toBe(40)

      // `isDialSyncing` chỉ tắt khi dial đã seed XONG *và* bản debounce bắt kịp — phải để
      // 400ms của `useDebounceValue` trôi qua, nếu không mọi lượt render đầu đều "đang đồng bộ".
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(result.current.isDialSyncing).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
