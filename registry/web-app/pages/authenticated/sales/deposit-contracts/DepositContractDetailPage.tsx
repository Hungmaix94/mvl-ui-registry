import { useCallback, useMemo } from 'react'
import {
  extractBlockers,
  extractErrorExtra,
  extractErrorMessage,
  extractFieldErrorDetail,
} from '@/utils/error-utils'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases.ts'

import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import {
  useDepositContract,
  useApproveDepositContract,
  useRejectDepositContract,
  useDeleteDepositContract,
  useAccountantApproveDepositContract,
  useAdminLeadApproveDepositContract,
  useAbandonDepositContract,
  useRefundDepositContract,
  useConfirmDepositRefundPayment,
  useConfirmDepositInvestorRecovery,
  usePreviewReclaimedDepositEmail,
  useSendReclaimedDepositEmail,
} from '@/features/sales/deposit-contracts/services/deposit-contract-service'

import { useFeeSupportProposalCreator } from '@/features/sales/deposit-contracts/hooks/useFeeSupportProposalCreator'
import {
  FEE_SUPPORT_ACTION,
  FEE_SUPPORT_GATE_ERROR_CODE,
  FEE_SUPPORT_PERMISSION_SUBJECT,
  type FeeSupportGateExtra,
} from '@/features/sales/fee-support-requests/constants/fee-support-request-constants'
import {
  canOfferFeeSupportCreate,
  isDepositFeeSupportBlocked,
} from '@/features/sales/fee-support-requests/utils/fee-support-proposal-link'
import {
  FEE_SUPPORT_GATE_REASON,
  FEE_SUPPORT_GATE_TITLE,
  FeeSupportGateNotice,
  FeeSupportGateNoticeFromError,
  feeSupportBlockingRows,
} from '@/features/sales/fee-support-requests/components/FeeSupportGateNotice'

import { DepositContractDetail } from './components/DepositContractDetail'
import { DepositContractActionMenu } from '@/features/sales/deposit-contracts/components/DepositContractActionMenu.tsx'
import toastService from '@/services/toast-service'
import { extractReclaimedEmailWarnings } from '@/features/sales/deposit-contracts/utils/reclaimed-email-warnings'
import { getTotalDepositAmount } from '@/features/sales/deposit-contracts/utils/deposit-amount'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { Loading } from '@/components/Loading'
import { BlockerList } from '@/components/commons'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { DepositStatus } from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import RefundPaymentForm, {
  type RefundPaymentFormValues,
} from '@/features/project/refund-booking/components/RefundPaymentForm'
import {
  REFUND_PAYMENT_ERROR,
  getRefundPaymentErrorCode,
} from '@/features/project/refund-booking/types/refund-payment-types'
import { formatDateToApi } from '@/utils/date-utils'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import {
  DepositContractActionForm,
  DepositContractActionFormValues,
} from './components/DepositContractActionForm'

export const DepositContractDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ability = useAbility()

  const { data: depositContract, isLoading, error } = useDepositContract(id)

  const { mutateAsync: approveDepositContract } = useApproveDepositContract()
  const { mutateAsync: rejectDepositContract } = useRejectDepositContract()
  const { mutateAsync: deleteDepositContract } = useDeleteDepositContract()
  const { mutateAsync: accountantApprove } = useAccountantApproveDepositContract()
  const { mutateAsync: adminLeadApprove } = useAdminLeadApproveDepositContract()
  const { mutateAsync: abandonDepositContract } = useAbandonDepositContract()
  const { mutateAsync: refundDepositContract } = useRefundDepositContract()
  const { mutateAsync: confirmDepositRefundPayment } = useConfirmDepositRefundPayment()
  const { mutateAsync: confirmDepositInvestorRecovery } = useConfirmDepositInvestorRecovery()
  const { mutateAsync: previewReclaimedDepositEmail } = usePreviewReclaimedDepositEmail()
  const { mutateAsync: sendReclaimedDepositEmail } = useSendReclaimedDepositEmail()

  const { displayFormContent, displayConfirm, displayCustom, displayClose, setLoading } =
    useDialog()

  const refreshData = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.DETAIL(id),
    })
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.LIST({}),
    })
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.SALES.BOOKINGS.LIST({}),
    })
  }, [queryClient, id])

  // HĐ cọc tick cờ "có đề xuất hỗ trợ phí" nhưng phiếu chưa duyệt xong thì BE chặn mọi
  // bước duyệt. Màn SỬA — nơi duy nhất tạo được phiếu neo theo HĐ cọc — lại bị ẩn từ
  // `pending_accountant`, còn màn phiếu đề xuất chỉ chọn được theo giao dịch (chỉ có sau
  // khi duyệt) ⇒ kẹt cứng. Mở đúng dialog tạo phiếu đó ngay tại màn chi tiết, không nới
  // quyền sửa HĐ.
  const { openCreateDialog: openFeeSupportCreateDialog } = useFeeSupportProposalCreator()

  const handleCreateFeeSupportRequest = useCallback(() => {
    if (!depositContract) return
    openFeeSupportCreateDialog(depositContract, { onClose: refreshData })
  }, [depositContract, openFeeSupportCreateDialog, refreshData])

  const canCreateFeeSupport = ability.can(FEE_SUPPORT_ACTION.CREATE, FEE_SUPPORT_PERMISSION_SUBJECT)

  const feeSupportBlocked = useMemo(
    () => (depositContract ? isDepositFeeSupportBlocked(depositContract) : false),
    [depositContract]
  )

  /**
   * Cổng đề xuất hỗ trợ phí trả 400 kèm `extra` máy-đọc-được. Toast một dòng làm mất mã
   * phiếu + trạng thái + việc phải làm, nên hiện hộp thoại riêng. Trả về true khi đã xử
   * lý để caller dừng chuỗi fallback.
   */
  const handleFeeSupportGateError = useCallback(
    (err: unknown): boolean => {
      const extra = extractErrorExtra<FeeSupportGateExtra>(err)
      const handledCodes: string[] = [
        FEE_SUPPORT_GATE_ERROR_CODE.MISSING,
        FEE_SUPPORT_GATE_ERROR_CODE.NOT_APPROVED,
        FEE_SUPPORT_GATE_ERROR_CODE.DEFERRED_FAILED,
      ]
      if (!extra || !handledCodes.includes(extra.code)) return false

      displayClose()
      displayCustom({
        title: FEE_SUPPORT_GATE_TITLE,
        size: 'md',
        hideFooter: true,
        content: (
          <FeeSupportGateNoticeFromError
            extra={extra}
            onCreate={
              canCreateFeeSupport
                ? () => {
                    displayClose()
                    handleCreateFeeSupportRequest()
                  }
                : undefined
            }
          />
        ),
      })
      return true
    },
    [displayClose, displayCustom, canCreateFeeSupport, handleCreateFeeSupportRequest]
  )

  const openNoteModal = useCallback(
    (
      title: string,
      confirmText: string,
      onConfirm: (
        note: string,
        refundedAmount?: number,
        confirmUnpaidReconciliation?: boolean,
        refundExtras?: Pick<
          DepositContractActionFormValues,
          | 'refundPayeeAccountName'
          | 'refundPayeeAccountNumber'
          | 'refundPayeeBankName'
          | 'retainedReason'
          | 'retainedNote'
        >
      ) => Promise<void>,
      requireNote = true,
      showRefundAmount = false
    ) => {
      displayFormContent({
        title,
        description: 'Vui lòng nhập thông tin cho quyết định này',
        hideFooter: true,
        content: (
          <DepositContractActionForm
            requireNote={requireNote}
            showRefundAmount={showRefundAmount}
            // `maxRefundAmount` trước 24/08/2026 chỉ đọc `registration_amount` trong khi
            // `totalDepositAmount` ngay dưới đã cộng cả tiền bổ sung — hai prop cùng mô tả một
            // đại lượng mà tính bằng hai công thức. BE chặn theo TỔNG (`_validate_refund_amount`),
            // nên trần thiếu sẽ chặn oan lệnh hoàn hợp lệ của hợp đồng có tiền bổ sung. Cả hai
            // nay đọc cùng một field BE trả sẵn (`total_deposit_amount`) — ClickUp 86eyqjbtb.
            maxRefundAmount={getTotalDepositAmount(depositContract)}
            totalDepositAmount={getTotalDepositAmount(depositContract)}
            confirmText={confirmText}
            onCancel={() => displayClose()}
            onSubmit={async (data: DepositContractActionFormValues) => {
              try {
                setLoading(true)
                await onConfirm(data.note, data.refundedAmount, undefined, {
                  refundPayeeAccountName: data.refundPayeeAccountName,
                  refundPayeeAccountNumber: data.refundPayeeAccountNumber,
                  refundPayeeBankName: data.refundPayeeBankName,
                  retainedReason: data.retainedReason,
                  retainedNote: data.retainedNote,
                })
                displayClose()
                refreshData()
              } catch (err: any) {
                // Cờ "có đề xuất hỗ trợ phí" bật mà phiếu chưa duyệt xong → chặn cứng mọi
                // bước duyệt. Đứng đầu chuỗi vì đây là refusal cụ thể nhất và có hành động
                // đi kèm (tạo phiếu / duyệt nốt phiếu).
                if (handleFeeSupportGateError(err)) return

                // Bug 86expaf56: hóa đơn đầu ra của deal đã xuất hoặc đã thu tiền → chặn cứng
                // (400 kèm code invoice_blocked + blockers[]). Toast chỉ hiện câu tóm tắt, mất
                // mã hóa đơn và việc cần làm — thứ người dùng thực sự cần — nên hiện danh sách.
                // Phải xử lý TRƯỚC cảnh báo mềm: cờ xác nhận không vượt được chặn này.
                const invoiceBlockers = extractBlockers(err)
                if (invoiceBlockers.length > 0) {
                  displayClose()
                  displayCustom({
                    title: 'Chưa kết thúc được hợp đồng cọc',
                    size: 'lg',
                    hideFooter: true,
                    content: (
                      <BlockerList
                        heading="Chưa hoàn / huỷ được hợp đồng cọc vì"
                        items={invoiceBlockers}
                      />
                    ),
                  })
                  return
                }

                // Deal có đối chiếu CĐT/F2/CTV đã xác nhận nhưng chưa thanh toán — đây là
                // cảnh báo mềm (400 kèm attr confirm_unpaid_reconciliation), không phải lỗi
                // chặn cứng. Hỏi lại người dùng, xác nhận thì gửi lại kèm cờ true.
                const reconciliationWarning = extractFieldErrorDetail(
                  err,
                  'confirm_unpaid_reconciliation'
                )
                if (reconciliationWarning) {
                  displayClose()
                  displayConfirm({
                    title: 'Deal đang có đối chiếu đã xác nhận',
                    content: reconciliationWarning,
                    confirmText,
                    cancelText: 'Huỷ',
                    onConfirm: async () => {
                      try {
                        setLoading(true)
                        await onConfirm(data.note, data.refundedAmount, true)
                        displayClose()
                        refreshData()
                      } catch (err2: any) {
                        console.error(err2)
                        toastService.error(
                          extractErrorMessage(err2, 'Có lỗi xảy ra, vui lòng thử lại sau')
                        )
                      } finally {
                        setLoading(false)
                      }
                    },
                  })
                  return
                }

                // Căn đã có hợp đồng cọc khác còn hiệu lực (BE trả attr
                // product_inventory_id kèm mã HĐ đang giữ căn). Toast một dòng dễ trôi
                // trong khi người dùng cần đọc mã HĐ kia để xử lý, nên hiện hộp thoại.
                const unitConflict = extractFieldErrorDetail(err, 'product_inventory_id')
                if (unitConflict) {
                  displayClose()
                  displayCustom({
                    title: 'Căn đã có hợp đồng cọc khác',
                    size: 'md',
                    hideFooter: true,
                    content: <p className="text-content-dark-2 text-sm">{unitConflict}</p>,
                  })
                  return
                }

                console.error(err)
                toastService.error(extractErrorMessage(err, 'Có lỗi xảy ra, vui lòng thử lại sau'))
              } finally {
                setLoading(false)
              }
            }}
          />
        ),
      })
    },
    [
      displayFormContent,
      displayClose,
      displayConfirm,
      displayCustom,
      setLoading,
      refreshData,
      handleFeeSupportGateError,
    ]
  )

  const handleApprove = useCallback(async () => {
    if (!id) return
    try {
      await approveDepositContract({ id })
      toastService.success('Đã phê duyệt hợp đồng đặt cọc')
      refreshData()
    } catch (err) {
      if (handleFeeSupportGateError(err)) return
      toastService.error(extractErrorMessage(err, 'Có lỗi xảy ra, vui lòng thử lại sau'))
    }
  }, [id, approveDepositContract, refreshData, handleFeeSupportGateError])

  const handleReject = useCallback(() => {
    openNoteModal(
      'Từ chối hợp đồng đặt cọc',
      'Xác nhận Từ chối',
      async (note) => {
        await rejectDepositContract({ id, note })
        toastService.success('Đã từ chối hợp đồng đặt cọc')
      },
      true
    )
  }, [id, rejectDepositContract, openNoteModal])

  const handleAdminLeadApprove = useCallback(() => {
    openNoteModal(
      'Xác nhận (Trưởng nhóm Admin)',
      'Xác nhận',
      async (note) => {
        await adminLeadApprove({ id, isApproved: true, note })
        toastService.success('Trưởng nhóm Admin đã xác nhận hợp đồng')
      },
      false
    )
  }, [id, adminLeadApprove, openNoteModal])

  const handleAdminLeadReject = useCallback(() => {
    openNoteModal(
      'Từ chối (Trưởng nhóm Admin)',
      'Từ chối',
      async (note) => {
        await adminLeadApprove({ id, isApproved: false, note })
        toastService.success('Trưởng nhóm Admin đã từ chối hợp đồng')
      },
      true
    )
  }, [id, adminLeadApprove, openNoteModal])

  const handleAccountantApprove = useCallback(() => {
    openNoteModal(
      'Kế toán phê duyệt',
      'Phê duyệt',
      async (note) => {
        await accountantApprove({ id, isApproved: true, note })
        toastService.success('Kế toán đã phê duyệt hợp đồng')
      },
      false
    )
  }, [id, accountantApprove, openNoteModal])

  const handleAccountantReject = useCallback(() => {
    openNoteModal(
      'Kế toán từ chối',
      'Từ chối',
      async (note) => {
        await accountantApprove({ id, isApproved: false, note })
        toastService.success('Kế toán đã từ chối hợp đồng')
      },
      true
    )
  }, [id, accountantApprove, openNoteModal])

  const handleEdit = useCallback(() => {
    if (
      (depositContract?.status as string) !== DepositStatus.APPROVED &&
      depositContract?.approval_status !== DepositContractApprovalStatus.pending_accountant
    ) {
      navigate(APP_PATH.DEPOSIT_CONTRACT_EDIT.replace(':id', String(id)))
    }
  }, [navigate, id, depositContract?.status, depositContract?.approval_status])

  const handleAbandon = useCallback(() => {
    openNoteModal(
      'Hủy hợp đồng đặt cọc',
      'Hủy bỏ',
      async (note, _refundedAmount, confirmUnpaidReconciliation) => {
        await abandonDepositContract({ id, note, confirmUnpaidReconciliation })
        toastService.success('Đã hủy hợp đồng đặt cọc')
      },
      true
    )
  }, [id, abandonDepositContract, openNoteModal])

  const handleRefund = useCallback(() => {
    openNoteModal(
      'Hoàn tiền hợp đồng',
      'Hoàn tiền',
      async (note, refunded_amount, confirmUnpaidReconciliation, refundExtras) => {
        await refundDepositContract({
          id,
          note,
          refunded_amount,
          confirmUnpaidReconciliation,
          refund_payee_account_name: refundExtras?.refundPayeeAccountName,
          refund_payee_account_number: refundExtras?.refundPayeeAccountNumber,
          refund_payee_bank_name: refundExtras?.refundPayeeBankName,
          retained_reason: refundExtras?.retainedReason,
          retained_note: refundExtras?.retainedNote,
        })
        // Lệnh hoàn xong KHÔNG có nghĩa tiền đã chuyển — bước chi là thao tác riêng.
        toastService.success(
          'Đã ghi nhận lệnh hoàn. Tiếp theo: "Xác nhận đã chi" khi tiền thực chuyển.'
        )
      },
      true,
      true // showRefundAmount
    )
  }, [id, refundDepositContract, openNoteModal])

  /**
   * Xác nhận đã chi tiền hoàn cọc. Dùng đúng form của luồng hoàn đặt chỗ —
   * BE cho hai endpoint chung một shape payload nên FE cũng chung một form.
   */
  const submitDepositRefundPayment = useCallback(
    async (
      values: RefundPaymentFormValues,
      { confirmAccountMismatch = false }: { confirmAccountMismatch?: boolean } = {}
    ) => {
      try {
        await confirmDepositRefundPayment({
          id,
          data: {
            paid_amount: String(values.paidAmount),
            paid_at: formatDateToApi(values.paidAt),
            mv_account_number: values.mvAccountNumber,
            mv_account_name: values.mvAccountName,
            mv_bank_name: values.mvBankName,
            bank_ref: values.bankRef,
            note: values.note,
            confirm_account_mismatch: confirmAccountMismatch || undefined,
          },
        })
        displayClose()
        toastService.success('Đã ghi nhận chi tiền hoàn cọc')
        refreshData()
      } catch (err) {
        const code = getRefundPaymentErrorCode(err)

        if (code === REFUND_PAYMENT_ERROR.INVESTOR_RECOVERY_PENDING) {
          displayConfirm({
            title: 'Chưa đòi lại được tiền từ Chủ đầu tư',
            content:
              'Tiền cọc này khách nộp thẳng cho Chủ đầu tư. Cần xác nhận đã đòi lại tiền trước khi chi.',
            confirmText: 'Xác nhận đã đòi lại',
            cancelText: 'Để sau',
            onConfirm: async () => {
              await confirmDepositInvestorRecovery({
                id,
                data: { recovered_on: formatDateToApi(new Date()) },
              })
              toastService.success(
                'Đã ghi nhận đòi lại tiền từ CĐT. Mở lại "Xác nhận đã chi" để tiếp tục.'
              )
              refreshData()
            },
          })
          return
        }

        if (code === REFUND_PAYMENT_ERROR.ACCOUNT_MISMATCH) {
          displayConfirm({
            title: 'Tài khoản nhận khác tài khoản khách đã chuyển',
            content: 'Tài khoản nhận tiền hoàn không trùng tài khoản khách đã chuyển đi. Vẫn chi?',
            confirmText: 'Vẫn chi',
            cancelText: 'Xem lại',
            onConfirm: () => submitDepositRefundPayment(values, { confirmAccountMismatch: true }),
          })
          return
        }

        toastService.error('Không ghi nhận được việc chi tiền')
        throw err
      }
    },
    [
      id,
      confirmDepositRefundPayment,
      confirmDepositInvestorRecovery,
      displayClose,
      displayConfirm,
      refreshData,
    ]
  )

  const handleConfirmRefundPayment = useCallback(() => {
    displayFormContent({
      title: 'Xác nhận đã chi tiền',
      description: `Hợp đồng ${depositContract?.code ?? ''}`,
      hideFooter: true,
      content: (
        <RefundPaymentForm
          approvedAmount={Number(depositContract?.refunded_amount ?? 0)}
          retainedAmount={Number((depositContract as any)?.retained_amount ?? 0)}
          onSubmit={(values) => submitDepositRefundPayment(values)}
          onCancel={() => displayClose()}
        />
      ),
    })
  }, [depositContract, displayFormContent, displayClose, submitDepositRefundPayment])

  const handlePreviewEmail = useCallback(async () => {
    try {
      setLoading(true)
      const res: any = await previewReclaimedDepositEmail(id)
      extractReclaimedEmailWarnings(res).forEach((warning) => toastService.warning(warning))
      displayFormContent({
        title: 'Xem trước Email',
        content: (
          <div className="max-h-[60vh] overflow-auto p-4">
            <div
              dangerouslySetInnerHTML={{ __html: res?.html_content || res?.content || String(res) }}
            />
          </div>
        ),
        hideFooter: true,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, previewReclaimedDepositEmail, displayFormContent, setLoading])

  const handleSendEmail = useCallback(() => {
    displayConfirm({
      title: 'Gửi Email thu hồi',
      description: 'Bạn có chắc chắn muốn gửi email thu hồi cọc cho khách hàng này không?',
      confirmText: 'Gửi Email',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          setLoading(true)
          const res = await sendReclaimedDepositEmail(id)
          toastService.success(`Đã gửi email thành công`)
          // Bên nào thiếu email thì bị bỏ qua — báo để người dùng bổ sung vào hồ sơ.
          extractReclaimedEmailWarnings(res).forEach((warning) => toastService.warning(warning))
          displayClose()
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      },
    })
  }, [id, sendReclaimedDepositEmail, displayConfirm, displayClose, setLoading])

  const handleCreateTransactionSheet = useCallback(() => {
    navigate(`${APP_PATH.TRANSACTION_SHEET_CREATE}?deposit_contract_id=${id}`)
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    displayConfirm({
      title: 'Xóa hợp đồng đặt cọc',
      content: 'Bạn có chắc chắn muốn xóa hợp đồng đặt cọc này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteDepositContract(id)
          toastService.success('Xóa hợp đồng thành công')
          navigate(APP_PATH.DEPOSIT_CONTRACT)
        } catch (err: any) {
          toastService.error(err?.message || 'Có lỗi xảy ra khi xử lý')
        }
      },
    })
  }, [id, deleteDepositContract, navigate, displayConfirm])

  const isNotFound = !isLoading && !depositContract && error ? true : false
  const isError = !isLoading && !!error && !isNotFound
  const status = depositContract?.status as string | undefined
  const approvalStatus = depositContract?.approval_status as
    | DepositContractApprovalStatus
    | undefined

  return (
    <>
      <PageTitle
        title={`Chi tiết Hợp đồng Đặt cọc ${depositContract?.contract_number || depositContract?.code || ''}`}
        idLabel={depositContract?.contract_number || depositContract?.code}
        enableBackButton
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Hợp đồng Đặt cọc', href: APP_PATH.DEPOSIT_CONTRACT },
          {
            label: depositContract?.contract_number || depositContract?.code || 'Chi tiết',
            isCurrentPage: true,
          },
        ]}
        handleEdit={
          status !== DepositStatus.APPROVED &&
          approvalStatus !== DepositContractApprovalStatus.pending_accountant &&
          ability.can('update', 'deposit_contract')
            ? handleEdit
            : undefined
        }
        handleShowHistory={() =>
          navigate(APP_PATH.DEPOSIT_CONTRACT_HISTORY.replace(':id', String(id)))
        }
        customActions={
          depositContract && (
            <Flex gap="2" align="center">
              <DepositContractActionMenu
                onAdminLeadApprove={
                  ability.can('admin_lead_approve', 'deposit_contract') &&
                  (approvalStatus === DepositContractApprovalStatus.pending_admin_lead ||
                    approvalStatus === (DepositContractApprovalStatus.pending_manager as any))
                    ? handleAdminLeadApprove
                    : undefined
                }
                onAdminLeadReject={
                  ability.can('admin_lead_approve', 'deposit_contract') &&
                  (approvalStatus === DepositContractApprovalStatus.pending_admin_lead ||
                    approvalStatus === (DepositContractApprovalStatus.pending_manager as any))
                    ? handleAdminLeadReject
                    : undefined
                }
                onAccountantApprove={
                  ability.can('accountant_approve', 'deposit_contract') &&
                  approvalStatus === DepositContractApprovalStatus.pending_accountant
                    ? handleAccountantApprove
                    : undefined
                }
                onAccountantReject={
                  ability.can('accountant_approve', 'deposit_contract') &&
                  approvalStatus === DepositContractApprovalStatus.pending_accountant
                    ? handleAccountantReject
                    : undefined
                }
                onApprove={
                  ability.can('approve', 'deposit_contract') &&
                  approvalStatus === DepositContractApprovalStatus.pending_admin
                    ? handleApprove
                    : undefined
                }
                onReject={
                  ability.can('approve', 'deposit_contract') &&
                  approvalStatus === DepositContractApprovalStatus.pending_admin
                    ? handleReject
                    : undefined
                }
                onAbandon={
                  ability.can('update', 'deposit_contract') && status !== DepositStatus.REJECTED
                    ? handleAbandon
                    : undefined
                }
                onRefund={
                  ability.can('update', 'deposit_contract') &&
                  approvalStatus === DepositContractApprovalStatus.approved &&
                  status !== DepositStatus.REFUNDED
                    ? handleRefund
                    : undefined
                }
                onConfirmRefundPayment={
                  ability.can('update', 'deposit_contract') &&
                  status === DepositStatus.REFUNDED &&
                  (depositContract as any)?.refund_payment_status === 'pending'
                    ? handleConfirmRefundPayment
                    : undefined
                }
                onReclaimedEmailPreview={
                  ability.can('retrieve', 'deposit_contract') &&
                  (depositContract?.status as string) === DepositStatus.ABANDONED
                    ? handlePreviewEmail
                    : undefined
                }
                onReclaimedEmailSend={
                  ability.can('update', 'deposit_contract') &&
                  (depositContract?.status as string) === DepositStatus.ABANDONED
                    ? handleSendEmail
                    : undefined
                }
                onEdit={
                  status !== DepositStatus.APPROVED &&
                  approvalStatus !== DepositContractApprovalStatus.pending_accountant &&
                  ability.can('update', 'deposit_contract')
                    ? handleEdit
                    : undefined
                }
                onDelete={
                  ability.can('destroy', 'deposit_contract') && status !== DepositStatus.APPROVED
                    ? handleDelete
                    : undefined
                }
                onCreateTransactionSheet={
                  ability.can('create', 'transaction_sheet') &&
                  approvalStatus === DepositContractApprovalStatus.approved &&
                  status !== DepositStatus.ABANDONED &&
                  status !== DepositStatus.REFUNDED &&
                  status !== DepositStatus.REJECTED
                    ? handleCreateTransactionSheet
                    : undefined
                }
                onCreateFeeSupportRequest={
                  canCreateFeeSupport &&
                  canOfferFeeSupportCreate({
                    hasFeeSupportProposal: !!depositContract.has_fee_support_proposal,
                    requests: depositContract.fee_support_requests ?? [],
                    depositStatus: status,
                  })
                    ? handleCreateFeeSupportRequest
                    : undefined
                }
                approveDisabledReason={feeSupportBlocked ? FEE_SUPPORT_GATE_REASON : undefined}
              />
            </Flex>
          )
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'deposit_contract')}
      >
        {depositContract ? (
          <>
            {feeSupportBlocked && (
              <div className="px-10 pt-4">
                <FeeSupportGateNotice
                  blocking={feeSupportBlockingRows(depositContract.fee_support_requests)}
                  onCreate={canCreateFeeSupport ? handleCreateFeeSupportRequest : undefined}
                />
              </div>
            )}
            <DepositContractDetail contract={depositContract} />
          </>
        ) : (
          <Flex justify="center" align="center" style={{ height: '50vh' }}>
            <Loading />
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default DepositContractDetailPage
