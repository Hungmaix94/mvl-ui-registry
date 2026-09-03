import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { QUERY_KEYS } from '@/constants'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'

import FeeSupportProposalDialogForm from '@/features/sales/fee-support-requests/components/FeeSupportProposalDialogForm'
import { useCreateFeeSupportRequest } from '@/features/sales/fee-support-requests/services/fee-support-request-service'

import type { DepositContractDetail } from '../services/deposit-contract-service'

interface OpenCreateDialogOptions {
  /**
   * Gọi SAU khi dialog đóng — dù tạo phiếu thành công hay người dùng bấm "Hủy".
   * Dùng để điều hướng (vd: về màn chi tiết HĐ cọc). Bỏ trống nếu muốn ở lại
   * (màn sửa: chỉ invalidate để refresh phiếu liên kết).
   */
  onClose?: () => void
}

interface ConfirmThenCreateOptions {
  /** Side-effect sau khi dialog TẠO phiếu đóng (tạo xong hoặc bấm Hủy). */
  onCreateClose?: () => void
  /** Khi người dùng chọn "Để sau" (bỏ qua tạo phiếu). */
  onSkip?: () => void
}

interface UseFeeSupportProposalCreatorResult {
  openCreateDialog: (
    depositContract: DepositContractDetail,
    options?: OpenCreateDialogOptions
  ) => void
  confirmThenCreate: (
    depositContract: DepositContractDetail,
    options?: ConfirmThenCreateOptions
  ) => void
}

/**
 * Mở dialog TẠO phiếu hỗ trợ bán hàng (inline, deposit_contract-driven) từ một
 * `DepositContractDetail` đã có. Tách khỏi `useFeeSupportProposalToggle` để dùng
 * chung: (1) màn SỬA khi bấm "Có"/nút "Tạo phiếu"; (2) màn TẠO MỚI sau khi lưu HĐ
 * có tick đề xuất. Backdrop khóa; tạo lỗi → giữ dialog + show lỗi (trong form).
 */
export function useFeeSupportProposalCreator(): UseFeeSupportProposalCreatorResult {
  const { displayConfirm, displayCustom, displayClose } = useDialog()
  const queryClient = useQueryClient()
  const createMutation = useCreateFeeSupportRequest()

  const openCreateDialog = useCallback(
    (depositContract: DepositContractDetail, options?: OpenCreateDialogOptions) => {
      displayCustom({
        title: 'Tạo phiếu hỗ trợ bán hàng',
        size: '2xl',
        hideFooter: true,
        disableBackdropClose: true,
        destroyOnClose: true,
        content: (
          <FeeSupportProposalDialogForm
            depositContract={depositContract}
            onCancel={() => {
              displayClose()
              options?.onClose?.()
            }}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload)
              displayClose()
              toastService.success('Tạo phiếu hỗ trợ bán hàng thành công')
              // Refresh HĐ cọc để danh sách phiếu liên kết + cờ được cập nhật.
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.DETAIL(depositContract.id),
              })
              options?.onClose?.()
            }}
          />
        ),
      })
    },
    [displayCustom, displayClose, createMutation, queryClient]
  )

  // Popup xác nhận "Có/Để sau" trước khi mở dialog tạo phiếu. Dùng chung màn sửa
  // (tick checkbox) và màn tạo (sau khi lưu). `disableBackdropClose` bắt buộc phải
  // đóng qua nút → onConfirm/onCancel LUÔN chạy; nếu để đóng nền/Esc thì cả hai
  // callback đều bị bỏ qua, kẹt luồng (màn tạo có thể submit trùng HĐ).
  const confirmThenCreate = useCallback(
    (depositContract: DepositContractDetail, options?: ConfirmThenCreateOptions) => {
      displayConfirm({
        title: 'Xác nhận',
        content:
          'Bạn có muốn tạo phiếu hỗ trợ bán hàng không? Hợp đồng cọc chỉ duyệt được sau khi phiếu đề xuất đã được duyệt.',
        confirmText: 'Có',
        cancelText: 'Để sau',
        disableBackdropClose: true,
        // onConfirm mở dialog khác — tắt auto-close để không đóng luôn dialog tạo
        // phiếu vừa mở (dialog là single-instance).
        disableAutoCloseOnConfirm: true,
        onConfirm: () => openCreateDialog(depositContract, { onClose: options?.onCreateClose }),
        onCancel: options?.onSkip,
      })
    },
    [displayConfirm, openCreateDialog]
  )

  return { openCreateDialog, confirmThenCreate }
}
