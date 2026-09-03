import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/constants'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

import FeeSupportWithdrawReasonDialog from '@/features/sales/fee-support-requests/components/FeeSupportWithdrawReasonDialog'
import {
  FEE_SUPPORT_ACTION,
  FEE_SUPPORT_PERMISSION_SUBJECT,
} from '@/features/sales/fee-support-requests/constants/fee-support-request-constants'
import { useWithdrawFeeSupportRequest } from '@/features/sales/fee-support-requests/services/fee-support-request-service'
import {
  classifyFeeSupportUntick,
  hasActiveFeeSupport,
} from '@/features/sales/fee-support-requests/utils/fee-support-proposal-link'

import type { DepositContractDetail } from '../services/deposit-contract-service'
import { useFeeSupportProposalCreator } from './useFeeSupportProposalCreator'

interface UseFeeSupportProposalToggleArgs {
  isEdit: boolean
  /** HĐ cọc đã lưu (chỉ có ở màn sửa) — nguồn phiếu liên kết + prefill. */
  depositContract?: DepositContractDetail
  /** Giá trị checkbox hiện tại (watch). */
  isChecked: boolean
  /** Ghi giá trị checkbox về form (setValue). */
  setChecked: (value: boolean) => void
}

interface UseFeeSupportProposalToggleResult {
  onCheckedChange: (checked: boolean) => void
  showCreateButton: boolean
  onClickCreate: () => void
}

/**
 * Điều phối checkbox "đề xuất hỗ trợ phí bán hàng" trên HĐ cọc:
 * - Màn TẠO MỚI (hoặc chưa có HĐ): tick/untick im lặng, chỉ set cờ.
 * - Màn SỬA — TICK: dialog "Có / Để sau". "Có" → dialog tạo phiếu inline (prefill
 *   + link deposit_contract, backdrop-lock). "Để sau" → giữ tick + hiện nút tạo.
 * - Màn SỬA — BỎ TICK: đọc phiếu liên kết → free (bỏ tự do) / cancellable (popup
 *   lý do + withdraw) / blocked (chặn, phải thu hồi phiếu đã duyệt trước).
 */
export function useFeeSupportProposalToggle({
  isEdit,
  depositContract,
  isChecked,
  setChecked,
}: UseFeeSupportProposalToggleArgs): UseFeeSupportProposalToggleResult {
  const { displayCustom, displayClose, alert } = useDialog()
  const ability = useAbility()
  const queryClient = useQueryClient()
  const withdrawMutation = useWithdrawFeeSupportRequest()
  const { openCreateDialog: openProposalCreateDialog, confirmThenCreate } =
    useFeeSupportProposalCreator()

  const feeSupportRequests = depositContract?.fee_support_requests ?? []
  const contractId = depositContract?.id
  // Id các phiếu CÒN phải thu hồi — mutable để lần retry chỉ gọi lại id chưa thành công.
  const withdrawIdsRef = useRef<number[]>([])
  const canCreate = ability.can(FEE_SUPPORT_ACTION.CREATE, FEE_SUPPORT_PERMISSION_SUBJECT)

  const invalidateContract = useCallback(() => {
    if (contractId) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.DETAIL(contractId),
      })
    }
  }, [queryClient, contractId])

  // Màn sửa: mở dialog tạo phiếu, ở lại trang (không điều hướng) — hook chung tự
  // toast + invalidate detail sau khi tạo thành công.
  const openCreateDialog = useCallback(() => {
    if (!depositContract) return
    openProposalCreateDialog(depositContract)
  }, [depositContract, openProposalCreateDialog])

  const openWithdrawDialog = useCallback(
    (cancellableIds: number[]) => {
      withdrawIdsRef.current = [...cancellableIds]
      displayCustom({
        title: 'Cảnh báo',
        size: 'md',
        hideFooter: true,
        // Khóa backdrop: chỉ đóng qua nút (tránh đóng nhầm khi withdraw đang chạy).
        disableBackdropClose: true,
        content: (
          <FeeSupportWithdrawReasonDialog
            onCancel={displayClose}
            onConfirm={async (reason) => {
              const ids = withdrawIdsRef.current
              // allSettled: thu hồi độc lập từng phiếu — 1 phiếu lỗi không chặn phiếu khác.
              const results = await Promise.allSettled(
                ids.map((id) => withdrawMutation.mutateAsync({ id, data: { reason } }))
              )
              // Giữ lại id THẤT BẠI để retry không gọi lại phiếu đã thu hồi.
              withdrawIdsRef.current = ids.filter((_, i) => results[i].status === 'rejected')
              invalidateContract() // refresh danh sách phiếu liên kết dù thành công một phần
              const firstRejected = results.find(
                (r): r is PromiseRejectedResult => r.status === 'rejected'
              )
              if (firstRejected) {
                toastService.error(
                  extractErrorMessage(firstRejected.reason, 'Không thể thu hồi phiếu hỗ trợ.')
                )
                throw firstRejected.reason // giữ dialog để thử lại (chỉ id còn lại)
              }
              setChecked(false)
              displayClose()
              toastService.success('Đã thu hồi phiếu hỗ trợ và bỏ chọn')
            }}
          />
        ),
      })
    },
    [displayCustom, displayClose, withdrawMutation, setChecked, invalidateContract]
  )

  const onCheckedChange = useCallback(
    (checked: boolean) => {
      if (checked) {
        setChecked(true)
        // Màn tạo mới (hoặc chưa có HĐ): tick im lặng — không dialog.
        if (!isEdit || !depositContract) return
        // Không có quyền tạo phiếu → chỉ set cờ, không mời tạo (khớp showCreateButton).
        if (!canCreate) return
        // "Để sau" giữ tick (không onSkip); "Có" mở dialog tạo phiếu, ở lại trang.
        confirmThenCreate(depositContract)
        return
      }

      // BỎ TICK
      if (!isEdit || !depositContract) {
        setChecked(false)
        return
      }
      const plan = classifyFeeSupportUntick(feeSupportRequests)
      if (plan.kind === 'free') {
        setChecked(false)
        return
      }
      if (plan.kind === 'blocked') {
        alert({
          title: 'Không thể bỏ chọn',
          content:
            'Không thể bỏ chọn vì đã có phiếu hỗ trợ bán hàng đã được duyệt liên kết với giao dịch này. Vui lòng hủy/thu hồi phiếu hỗ trợ trước khi thực hiện thao tác này.',
          confirmText: 'Đã hiểu',
        })
        return // giữ tick
      }
      // cancellable
      if (!ability.can(FEE_SUPPORT_ACTION.WITHDRAW, FEE_SUPPORT_PERMISSION_SUBJECT)) {
        alert({
          title: 'Không thể bỏ chọn',
          content:
            'Phiếu hỗ trợ đang chờ duyệt cần được thu hồi trước. Bạn không có quyền thu hồi — vui lòng liên hệ người phụ trách.',
          confirmText: 'Đã hiểu',
        })
        return
      }
      openWithdrawDialog(plan.cancellableIds)
    },
    [
      isEdit,
      depositContract,
      feeSupportRequests,
      setChecked,
      confirmThenCreate,
      alert,
      ability,
      canCreate,
      openWithdrawDialog,
    ]
  )

  const showCreateButton =
    isEdit &&
    !!depositContract &&
    isChecked &&
    !hasActiveFeeSupport(feeSupportRequests) &&
    canCreate

  return { onCheckedChange, showCreateButton, onClickCreate: openCreateDialog }
}
