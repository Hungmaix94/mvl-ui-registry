import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  isNonFieldError,
  isUnallocatedTrancheError,
  useBlockedActionDialog,
} from '@/features/accounting/_shares/hooks/useBlockedActionDialog'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { formatPct } from '@/utils/common'
import { extractErrorMessage } from '@/utils/error-utils'

import { ApproveProgressSteps, buildApproveSteps } from '../components/ApproveProgressSteps'
import { readDialSkippedRals } from '../utils/dial-skipped-rals'
import {
  type CommissionSplitDetail,
  refetchWorksheetQueries,
  useAdminApproveWorksheet,
  useApproveWorksheet,
  useReopenWorksheet,
  useSetPeriodProgress,
} from '../services/commission-splits-service'
import { useReleasePaymentSuspension } from '../services/deal-payment-suspensions-service'

import type { WorksheetRow } from './useWorksheetDial'

interface UseWorksheetActionsArgs {
  detail: CommissionSplitDetail
  worksheetId: number
  /** Kỳ đang chọn — dial được chốt lên chính kỳ này ở bước 1 của luồng duyệt. */
  currentWorksheet: WorksheetRow | undefined
  activeWorksheet: WorksheetRow | null | undefined
  pbtvId: number | null
  isAdminView: boolean
  /** Đã chia thực nhận chưa — chỉ đổi lời cảnh báo trong hộp xác nhận. */
  hasBeenSplit: boolean
  localFeePct: number
  localBonusPct: number | null
  localF2Pct: number | null
  localBonusF2Pct: number | null
  dialNote: string
  onRefresh?: () => void
}

/**
 * Mọi thao tác GHI cấp trang lên bảng tính: duyệt chi (admin và kế toán), mở lại bảng kê,
 * bỏ tạm ngưng chi trả — cùng cờ "đang bận" mà chúng áp lên màn.
 *
 * Gom chung vì ba việc này chia nhau đúng một tài nguyên và một bất biến: trong lúc ghi thì
 * form KHÔNG được nạp lại (`worksheetBusyRef`) và Mục ③④ phải bị phủ overlay. Tách rời ra là
 * mỗi nơi tự quản một nửa cờ rồi lệch nhau.
 */
export function useWorksheetActions({
  detail,
  worksheetId,
  currentWorksheet,
  activeWorksheet,
  pbtvId,
  isAdminView,
  hasBeenSplit,
  localFeePct,
  localBonusPct,
  localF2Pct,
  localBonusF2Pct,
  dialNote,
  onRefresh,
}: UseWorksheetActionsArgs) {
  const { mutateAsync: adminApproveWorksheet } = useAdminApproveWorksheet()
  // Duyệt chi = 2 PATCH nối tiếp; `silent` tắt invalidate riêng của từng mutation để cả
  // luồng chỉ refetch MỘT lần ở cuối (refetchWorksheetQueries) — trước đây mỗi mutation
  // tự bung 4 invalidate nên 1 lần duyệt sinh 9 GET và số liệu nhảy theo từng response.
  const { mutateAsync: approveWorksheet } = useApproveWorksheet({ silent: true })
  const { mutateAsync: setPeriodProgress } = useSetPeriodProgress({ silent: true })
  const { mutateAsync: reopenWorksheet } = useReopenWorksheet()
  const { mutateAsync: releaseSuspension, isPending: isReleasing } = useReleasePaymentSuspension()
  const { showBlocked } = useBlockedActionDialog()
  const { displayConfirm, displayClose, updateConfig } = useDialog()
  const queryClient = useQueryClient()

  const [isApproving, setIsApproving] = useState(false)
  // Tách khỏi isApproving: "Mở lại bảng kê" dùng chung cờ nên overlay/gate của duyệt chi
  // bật lây sang thao tác không liên quan.
  const [isReopening, setIsReopening] = useState(false)
  // Lưu dial (Mục 3) cũng ghi lại tiền của Mục 4 → cùng cần đóng băng + overlay như duyệt chi.
  const [isDialSaving, setIsDialSaving] = useState(false)
  const isWorksheetBusy = isApproving || isDialSaving
  // Chặn effect re-seed form trong MỌI lần ghi worksheet (duyệt chi + lưu dial). Là ref chứ
  // không phải state vì effect prefill đọc nó ngay trong lượt render đang chạy.
  const worksheetBusyRef = useRef(false)

  const markWorksheetBusy = (busy: boolean) => {
    worksheetBusyRef.current = busy
    setIsDialSaving(busy)
  }

  const onApproveDisbursement = () => {
    if (!worksheetId) {
      toastService.error('Không tìm thấy ID bảng tính hoa hồng')
      return
    }
    // Admin "Duyệt chi" = project admin approves disbursement for this unit. It only
    // transitions the worksheet DRAFT -> ADMIN_APPROVED (PATCH .../admin-approve/); the
    // default splits/holds are materialized later at the KT "approve" stage — so just
    // the admin-approve call here, no split/confirm.
    if (isAdminView) {
      displayConfirm({
        title: 'Duyệt chi',
        content: 'Bạn có chắc chắn muốn duyệt chi cho căn này? Hành động này không thể hoàn tác.',
        confirmText: 'Duyệt chi',
        onConfirm: async () => {
          try {
            setIsApproving(true)
            await adminApproveWorksheet({ id: worksheetId, data: { note: '' } })
            toastService.success('Đã duyệt chi thành công')
            onRefresh?.()
          } catch (error) {
            toastService.error(extractErrorMessage(error))
          } finally {
            setIsApproving(false)
          }
        },
      })
      return
    }

    // KT "Duyệt chi thực nhận" — chỉ CHUYỂN TRẠNG THÁI worksheet ADMIN_APPROVED ->
    // APPROVED bằng đúng một call PATCH /approve/. BE cascade duyệt các PBTV theo mức
    // thực nhận HIỆN TẠI (đã chia hay chưa): tạo default split 100% cho dòng chưa chia,
    // materialize hold, và confirm mọi split thành CommissionPayable — tất cả atomic.
    // KHÔNG gọi split-by-recipient ở đây: việc "sửa thực nhận" là thao tác riêng qua
    // modal Chia/Sửa từng đối tượng (saveGroup) đã persist sẵn trước khi bấm duyệt.
    // Hoàn tác khi kỳ kế toán còn mở: nút "Mở lại bảng kê để sửa thực nhận".
    const feePctLabel = formatPct(localFeePct, 2)
    const showStep = (index: number) =>
      updateConfig({
        content: <ApproveProgressSteps steps={buildApproveSteps(index, feePctLabel)} />,
        // Khoá nút xác nhận trong lúc chạy. Trước đây `config.loading` không bao giờ được
        // set ở luồng này nên bấm 2 lần là gọi API 2 lần.
        loading: true,
        disableBackdropClose: true,
      })

    displayConfirm({
      title: 'Duyệt chi thực nhận',
      content: hasBeenSplit
        ? 'Bạn có chắc chắn muốn duyệt chi thực nhận cho giao dịch này? Các khoản phải chi sẽ được tạo theo phương án chia hiện tại.'
        : 'Giao dịch này chưa được chia thực nhận. Hệ thống sẽ tự động phân bổ theo tỷ lệ mặc định và duyệt chi.',
      confirmText: 'Duyệt chi',
      // Luồng này tự quản lý đóng/mở: dialog phải SỐNG qua 3 bước để hiển thị tiến trình,
      // và nếu dial bị chặn thì thông báo của showBlocked mới không bị auto-close đè lên
      // (GlobalDialog.handleConfirm đọc `config` của closure cũ nên vẫn gọi closeDialog).
      disableAutoCloseOnConfirm: true,
      onConfirm: async () => {
        try {
          setIsApproving(true)
          worksheetBusyRef.current = true
          let skippedRals = { paidCount: 0, approvedNotPaidCount: 0 }

          // Bước 1 — chốt dial.
          showStep(0)
          if (currentWorksheet?.worksheet_id) {
            try {
              const dialSaved = await setPeriodProgress({
                id: Number(currentWorksheet.worksheet_id),
                data: {
                  fee_pct: localFeePct.toString(),
                  ...(localBonusPct != null ? { bonus_pct: localBonusPct.toString() } : {}),
                  ...(localF2Pct != null ? { f2_pct: localF2Pct.toString() } : {}),
                  ...(localBonusF2Pct != null ? { bonus_f2_pct: localBonusF2Pct.toString() } : {}),
                  // Giải trình bắt buộc khi dial lệch default — thiếu ở call site này là
                  // 400 lẻ khó tái hiện (plan dial-auto-default §3.2).
                  ...(dialNote.trim() ? { note: dialNote.trim() } : {}),
                },
              })
              skippedRals = readDialSkippedRals(dialSaved)
            } catch (dialError: unknown) {
              // ABORT trên MỌI lỗi dial. Trước đây chỉ `isNonFieldError` mới dừng, lỗi
              // field-level bị bỏ qua rồi vẫn gọi approve — mà `approve` không đọc
              // request.data và `_auto_pin_dials` ghim DEFAULT, nên % kế toán gõ trên màn
              // biến thành default trong im lặng (doanh thu ghi nhận sai, không ai biết).
              if (isNonFieldError(dialError)) {
                showBlocked(dialError, {
                  title: 'Chưa duyệt chi được',
                  hint: 'Tiến độ % chưa lưu được nên chưa duyệt chi. Xử lý bước nêu trên rồi thử lại.',
                })
              } else {
                displayClose()
                toastService.error(
                  `Chưa lưu được tiến độ chi nên chưa duyệt: ${extractErrorMessage(dialError)}`
                )
              }
              return
            }
          }

          // Bước 2 — duyệt chi (BE cascade PBTV + tạo phải chi, atomic).
          showStep(1)
          try {
            await approveWorksheet({ id: worksheetId, data: { allow_unallocated: false } })
          } catch (approveError: unknown) {
            // BE chặn khi một đợt có tiền phí về mà không chia được đồng nào — dấu hiệu
            // dial của kỳ đã cũ so với đợt mới. Mặc định là BẮT sửa dial, vì duyệt luôn
            // sẽ đóng băng số 0 vào khoản phải chi. Chỉ cho ghi đè khi kế toán đã ghi lý
            // do ở ô giải trình dial — có vết mới cho qua.
            if (isUnallocatedTrancheError(approveError)) {
              const reason = dialNote.trim()
              if (!reason) {
                showBlocked(approveError, {
                  title: 'Chưa duyệt chi được',
                  hint: 'Đợt tiền về mới chưa được phân bổ vì % TT phí của kỳ đang giữ mức cũ. Chỉnh lại % ở Mục 3, hoặc ghi lý do vào ô giải trình nếu thật sự muốn giữ lại đợt này rồi duyệt lại.',
                })
                return
              }
              await approveWorksheet({
                id: worksheetId,
                data: { allow_unallocated: true, note: reason },
              })
            } else {
              throw approveError
            }
          }

          // Bước 3 — MỘT lượt refetch có await: số liệu trên màn chỉ đổi đúng một lần,
          // khi mọi query đã về (thay cho 2 wave invalidate + onRefresh không await).
          showStep(2)
          await refetchWorksheetQueries(queryClient, worksheetId)
          displayClose()
          toastService.success('Đã duyệt chi thực nhận — các khoản phải chi đã được tạo')
          // Dòng đã duyệt "Chia hoa hồng thực nhận" khác (chưa chi) trong CÙNG bảng kê bị
          // loại khỏi lượt tính lại — ClickUp 86eyjxwd3: báo cho kế toán, không âm thầm bỏ qua.
          if (skippedRals.approvedNotPaidCount > 0) {
            toastService.warning(
              `${skippedRals.approvedNotPaidCount} dòng đã duyệt Chia hoa hồng thực nhận (chưa chi) khác trong kỳ này được giữ nguyên, không tính lại theo tỷ lệ mới.`
            )
          }
        } catch (error) {
          displayClose()
          toastService.error(extractErrorMessage(error))
        } finally {
          worksheetBusyRef.current = false
          setIsApproving(false)
        }
      },
    })
  }

  // "Mở lại bảng kê để sửa thực nhận": worksheet APPROVED -> ADMIN_APPROVED, các khoản
  // phải chi CHƯA chi bị hủy để kế toán chia lại rồi duyệt chi lần nữa. BE chặn khi kỳ
  // kế toán đã khóa hoặc đã có phiếu chi thật trong kỳ.
  const onReopenWorksheet = () => {
    if (!worksheetId) return
    displayConfirm({
      title: 'Mở lại bảng kê để sửa thực nhận',
      content:
        'Các khoản phải chi CHƯA thanh toán của kỳ này sẽ bị hủy để chia lại; sau khi sửa xong cần Duyệt chi thực nhận lại. Tiếp tục?',
      confirmText: 'Mở lại bảng kê',
      onConfirm: async () => {
        try {
          setIsReopening(true)
          await reopenWorksheet({
            id: worksheetId,
            data: { reason: 'Mở lại bảng kê để sửa thực nhận' },
          })
          toastService.success('Đã mở lại bảng kê — chỉnh sửa xong hãy Duyệt chi thực nhận lại')
          onRefresh?.()
        } catch (error) {
          toastService.error(extractErrorMessage(error))
        } finally {
          setIsReopening(false)
        }
      },
    })
  }

  const isPaymentSuspended = !!(
    (activeWorksheet as { payment_suspended?: boolean } | null | undefined)?.payment_suspended ||
    detail.payment_suspended
  )

  const handleReleaseSuspension = async () => {
    const pbtv_id = Number(pbtvId)
    if (!pbtv_id) {
      toastService.error('Không tìm thấy ID phân bổ thực nhận')
      return
    }
    try {
      await releaseSuspension({ pbtv_id, payload: { reason: 'Bỏ tạm ngưng' } })
      toastService.success('Đã mở lại chi trả')
      onRefresh?.()
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    }
  }

  return {
    isApproving,
    isReopening,
    isReleasing,
    isWorksheetBusy,
    isPaymentSuspended,
    /** Cho effect prefill form đọc ngay trong lượt render — đừng đổi sang state. */
    worksheetBusyRef,
    markWorksheetBusy,
    onApproveDisbursement,
    onReopenWorksheet,
    handleReleaseSuspension,
  }
}
