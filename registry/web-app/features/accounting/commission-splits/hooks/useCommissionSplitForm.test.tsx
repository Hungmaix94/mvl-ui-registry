import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useCommissionSplitForm } from './useCommissionSplitForm'
import type { CommissionSplitDetail } from '../services/commission-splits-service'
import type { WorksheetRow } from './useWorksheetDial'

// Mục ⑤ (thưởng HH quản lý) đến từ endpoint riêng — không phải thứ đang test ở đây.
// Mock TRỌN module: `importActual` kéo theo cả tầng api/notification-store và nổ khi collect.
// Hook chỉ dùng đúng một export runtime từ service này, phần còn lại là type (bị xoá khi build).
//
// Kết quả phải là object HẰNG (qua `vi.hoisted`, vì factory của `vi.mock` bị hoist lên đầu file
// nên không đọc được biến top-level). Trả literal mới mỗi lượt gọi thì `mgmtBonusesData` đổi
// identity theo từng render → memo đổi → effect prefill chạy lại → reset → render → lặp vô hạn.
// react-query thật giữ nguyên reference giữa các render nên chỉ test mới dính.
const { mgmtBonusesQuery } = vi.hoisted(() => ({ mgmtBonusesQuery: { data: [] as unknown[] } }))
vi.mock('../services/commission-splits-service', () => ({
  useManagementBonuses: () => mgmtBonusesQuery,
}))

const WORKSHEET_ID = 181

/** Bảng kê một dòng sale, tiền do server chốt theo % phí kỳ này. */
function makeDetail(expected: string, feePct = '40'): CommissionSplitDetail {
  return {
    deal_id: 2907,
    // Payload detail mang theo CHÍNH % đã sinh ra `positions` bên dưới.
    fee_progress_pct: feePct,
    bonus_progress_pct: '0',
    basis: '220000000',
    positions: [
      {
        commission_share_id: 11243,
        pct_type: 'pct_sale_commission',
        pct: '2.20',
        owner_name: 'Đỗ Hà My',
        owner_code: 'MV000013711',
        recipient_id: 13711,
        expected_amount: expected,
        share_full_amount: '220000000',
        actual_amount: '0',
        recipients: [{ amount: expected, pct_of_parent: '100.00', recipient_name: 'Đỗ Hà My' }],
      },
    ],
  } as unknown as CommissionSplitDetail
}

function makeWorksheet(feePct: string): WorksheetRow {
  return {
    worksheet_id: WORKSHEET_ID,
    fee_progress_pct: feePct,
    bonus_progress_pct: '0',
    basis: '220000000',
  } as unknown as WorksheetRow
}

/** Số tiền của dòng sale mà Mục ④ đang hiển thị. */
function payoutOf(effectivePositions: { recipients?: { amount?: string }[] }[]) {
  return effectivePositions[0]?.recipients?.[0]?.amount
}

describe('useCommissionSplitForm — nạp lại form sau khi ghi worksheet', () => {
  it('nạp số mới của server khi cờ "đang ghi" nhả ra, dù detail đã về từ lúc còn bận', () => {
    // Kịch bản thật của luồng "Lưu dial Mục ③": handleSaveDial bật cờ → PATCH → `await
    // refetchWorksheetQueries` (detail MỚI về khi cờ VẪN bật) → `finally` mới nhả cờ.
    //
    // Hai object dưới đây phải dùng LẠI nguyên reference qua các lượt rerender, đúng như
    // react-query giữ nguyên `data` khi không có response mới. Dựng object mới mỗi lượt là
    // deps `[detail, ...]` tự đổi và effect chạy lại — test xanh cả khi bug còn nguyên.
    const detailBefore = makeDetail('88000000', '40')
    const detailAfterSave = makeDetail('33000000', '15')
    const busyRef = { current: false }

    const { result, rerender } = renderHook(
      ({ detail, isWorksheetBusy, feePct }) =>
        useCommissionSplitForm({
          detail,
          worksheetId: WORKSHEET_ID,
          worksheetBusyRef: busyRef,
          isWorksheetBusy,
          activeWorksheet: makeWorksheet(feePct),
          currentWorksheet: makeWorksheet(feePct),
          debouncedFeePct: Number(feePct),
          debouncedBonusPct: 0,
          debouncedF2Pct: null,
          debouncedBonusF2Pct: null,
        }),
      {
        // 40% → 88.000.000: trạng thái trước khi kế toán sửa dial.
        initialProps: { detail: detailBefore, isWorksheetBusy: false, feePct: '40' },
      }
    )

    expect(payoutOf(result.current.effectivePositions)).toBe('88000000')

    // Bắt đầu ghi: cờ bật (ref đọc ngay trong render, state kích re-render).
    act(() => {
      busyRef.current = true
    })
    rerender({ detail: detailBefore, isWorksheetBusy: true, feePct: '40' })

    // Refetch về TRONG lúc còn bận: server đã chốt 15% → 33.000.000. Form CHƯA nạp lại được
    // (cờ còn bật) nên vẫn giữ positions của 40%. Mục ④ vẫn phải ra 33.000.000 — bằng đường
    // rescale preview, vì "% đã lưu" neo theo payload đã seed form (40%) chứ không theo
    // `detail` mới (15%). Neo nhầm vào `detail` là `dialPct == storedPct` ⇒ tắt rescale ⇒
    // loé 88.000.000 đúng khoảng này (đo được 2,7s trên trình duyệt).
    rerender({ detail: detailAfterSave, isWorksheetBusy: true, feePct: '15' })
    expect(payoutOf(result.current.effectivePositions)).toBe('33000000')

    // Nhả cờ trong `finally`. `detail`/`mgmtBonuses` KHÔNG đổi thêm lần nào nữa —
    // đây chính là lượt duy nhất còn lại để form nạp số đã chốt.
    act(() => {
      busyRef.current = false
    })
    rerender({ detail: detailAfterSave, isWorksheetBusy: false, feePct: '15' })

    expect(payoutOf(result.current.effectivePositions)).toBe('33000000')
  })

  it('không nạp lại form trong lúc đang ghi — số nửa vời không được lọt lên Mục ④', () => {
    const detailBefore = makeDetail('88000000')
    const detailMidWrite = makeDetail('11111111')
    const busyRef = { current: false }

    const { result, rerender } = renderHook(
      ({ detail, isWorksheetBusy, feePct }) =>
        useCommissionSplitForm({
          detail,
          worksheetId: WORKSHEET_ID,
          worksheetBusyRef: busyRef,
          isWorksheetBusy,
          activeWorksheet: makeWorksheet(feePct),
          currentWorksheet: makeWorksheet(feePct),
          debouncedFeePct: Number(feePct),
          debouncedBonusPct: 0,
          debouncedF2Pct: null,
          debouncedBonusF2Pct: null,
        }),
      {
        initialProps: { detail: detailBefore, isWorksheetBusy: false, feePct: '40' },
      }
    )

    act(() => {
      busyRef.current = true
    })
    // Response nửa chừng của một PATCH trong chuỗi duyệt chi.
    rerender({ detail: detailMidWrite, isWorksheetBusy: true, feePct: '40' })

    expect(payoutOf(result.current.effectivePositions)).toBe('88000000')
  })
})
