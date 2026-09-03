import { useCallback, useRef, useState, type ReactNode } from 'react'

import AppDialog from '@/components/dialog/AppDialog'

import {
  buildReconDeductionConfirmLines,
  shouldConfirmReconDeduction,
  type ReconDeductionConfirmPayload,
} from './recon-deduction-confirm'

export interface UseReconDeductionConfirmResult {
  /**
   * Hỏi xác nhận trước khi lưu một căn CÓ giảm trừ (`feeDeduction > 0`); không có giảm trừ ⇒ resolve
   * `true` ngay (không mở dialog). Resolve `false` khi user Huỷ / đóng dialog.
   */
  confirmDeduction: (payload: ReconDeductionConfirmPayload) => Promise<boolean>
  /** Render node này CẠNH form host (như AppDialog "Xác nhận thay đổi thông tin" của v1). */
  deductionConfirmDialog: ReactNode
}

/**
 * Dialog "Xác nhận giảm trừ kỳ này" — AppDialog `variant="alert"` CỤC BỘ, state điều khiển tại chỗ
 * (pattern: InvestorReconciliationForm "Xác nhận thay đổi thông tin").
 *
 * KHÔNG dùng `useDialog().displayConfirm` (global dialog store): store chỉ giữ MỘT config — mở confirm
 * qua store từ trong một form đang hiển thị bằng store (vd dialog "Thêm căn" v2) sẽ THAY THẾ và phá
 * luôn form host.
 */
export function useReconDeductionConfirm(): UseReconDeductionConfirmResult {
  const [payload, setPayload] = useState<ReconDeductionConfirmPayload | null>(null)
  // Resolver của promise đang chờ — ref để settle idempotent (onConfirm xong AppDialog vẫn gọi
  // onOpenChange(false); lần settle sau thành no-op).
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setPayload(null)
  }, [])

  const confirmDeduction = useCallback(
    (nextPayload: ReconDeductionConfirmPayload): Promise<boolean> => {
      if (!shouldConfirmReconDeduction(nextPayload)) return Promise.resolve(true)
      // Một confirm đang mở mà bị gọi lại (double-click) ⇒ huỷ promise cũ cho khỏi treo.
      resolveRef.current?.(false)
      setPayload(nextPayload)
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve
      })
    },
    []
  )

  const deductionConfirmDialog: ReactNode = payload ? (
    <AppDialog
      variant="alert"
      open
      onOpenChange={(open) => {
        if (!open) settle(false)
      }}
      title="Xác nhận giảm trừ kỳ này"
      titleDescription={`Căn ${payload.unitLabel} có giảm trừ trong kỳ — kiểm tra lũy kế trước khi lưu.`}
      confirmText="Xác nhận"
      cancelText="Huỷ"
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
      content={
        <div className="flex flex-col gap-1.5 px-6 pt-4">
          {buildReconDeductionConfirmLines(payload).map((line) => (
            <span key={line} className="typo-body-sm-regular text-content-dark-2">
              {line}
            </span>
          ))}
        </div>
      }
    />
  ) : null

  return { confirmDeduction, deductionConfirmDialog }
}
