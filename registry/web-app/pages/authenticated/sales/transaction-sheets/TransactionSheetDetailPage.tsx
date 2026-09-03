import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle, Button, TextArea } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { useDialog } from '@/hooks/useDialog'
import {
  useTransactionSheet,
  useApproveTransactionSheet,
  useRejectTransactionSheet,
  useManagerConfirmTransactionSheet,
  useAdminLeadApproveTransactionSheet,
} from '@/features/sales/transaction-sheets/services/transaction-sheet-service'
import { TransactionSheetStatus } from '@/features/sales/transaction-sheets/types/transaction-sheet'
import { TransactionSheetDetail } from './components/TransactionSheetDetail'
import toastService from '@/services/toast-service'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { handleApiError } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability'

export const TransactionSheetDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ability = useAbility()

  const { data: transactionSheet, isLoading, error } = useTransactionSheet(id)

  const { mutateAsync: approveTransactionSheet } = useApproveTransactionSheet()
  const { mutateAsync: rejectTransactionSheet } = useRejectTransactionSheet()
  const { mutateAsync: managerConfirmTransactionSheet } = useManagerConfirmTransactionSheet()
  const { mutateAsync: adminLeadApproveTransactionSheet } = useAdminLeadApproveTransactionSheet()

  const { displayFormContent, displayClose, setLoading } = useDialog()

  const refreshData = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.DETAIL(id),
    })
    await queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.SALES.TRANSACTION_SHEETS.LIST({})],
    })
  }, [queryClient, id])

  const openApprovalModal = (action: 'approve' | 'reject') => {
    let note = ''

    const approvalStatus = transactionSheet?.approval_status as unknown as TransactionSheetStatus

    const actionConfig = {
      approve: { title: 'Xác nhận phê duyệt', confirmText: 'Phê duyệt', actionName: 'phê duyệt' },
      reject: { title: 'Xác nhận từ chối', confirmText: 'Từ chối', actionName: 'từ chối' },
    }

    const config = actionConfig[action]

    displayFormContent({
      title: config.title,
      description: 'Vui lòng nhập ghi chú cho quyết định này',
      content: (
        <div className="p-4">
          <TextArea
            label="Ghi chú"
            placeholder="Nhập lý do/ghi chú..."
            onChange={(value) => {
              note = value
            }}
            rows={4}
          />
        </div>
      ),
      confirmText: config.confirmText,
      cancelText: 'Hủy',
      onConfirm: async () => {
        if (action === 'reject' && !note.trim()) {
          toastService.error('Vui lòng nhập lý do từ chối')
          return
        }

        try {
          setLoading(true)
          const is_approved = action === 'approve'

          if (approvalStatus === TransactionSheetStatus.PENDING_MANAGER) {
            await managerConfirmTransactionSheet({ id, is_approved, note })
          } else if (approvalStatus === TransactionSheetStatus.PENDING_ADMIN_LEAD) {
            await adminLeadApproveTransactionSheet({ id, is_approved, note })
          } else {
            if (is_approved) {
              await approveTransactionSheet({ id, note })
            } else {
              await rejectTransactionSheet({ id, note: note || '' })
            }
          }

          toastService.success(`Đã ${config.actionName} thành công phiếu thông tin giao dịch`)
          displayClose()
          refreshData()
        } catch (err) {
          console.error(err)
          handleApiError(err)
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleEdit = useCallback(() => {
    const status = transactionSheet?.approval_status as unknown as TransactionSheetStatus
    // REJECTED is rewound to the previous editor and stays editable; only the frozen
    // final-approver desk (pending_admin_lead) and approved (finalized) are read-only.
    if (
      status !== TransactionSheetStatus.APPROVED &&
      status !== TransactionSheetStatus.PENDING_ADMIN_LEAD
    ) {
      navigate(APP_PATH.TRANSACTION_SHEET_EDIT.replace(':id', String(id)))
    }
  }, [navigate, id, transactionSheet?.approval_status])

  const handleViewHistory = useCallback(() => {
    navigate(APP_PATH.TRANSACTION_SHEET_HISTORY.replace(':id', String(id)))
  }, [navigate, id])

  const isNotFound = !isLoading && !transactionSheet && error ? true : false
  const isError = !isLoading && !!error && !isNotFound
  const approvalStatus = transactionSheet?.approval_status as TransactionSheetStatus | undefined

  const canApprove = useMemo(() => {
    if (!approvalStatus) return false
    if (approvalStatus === TransactionSheetStatus.PENDING_CONFIRM) {
      return ability.can('confirm', 'transaction_sheet')
    }
    if (approvalStatus === TransactionSheetStatus.PENDING_MANAGER) {
      return ability.can('manager_confirm', 'transaction_sheet')
    }
    if (approvalStatus === TransactionSheetStatus.PENDING_ADMIN) {
      return ability.can('approve', 'transaction_sheet')
    }
    if (approvalStatus === TransactionSheetStatus.PENDING_ADMIN_LEAD) {
      return ability.can('admin_lead_approve', 'transaction_sheet')
    }
    return false
  }, [approvalStatus, ability])

  const canReject = useMemo(() => {
    if (!approvalStatus) return false
    const isPending =
      approvalStatus === TransactionSheetStatus.PENDING_CONFIRM ||
      approvalStatus === TransactionSheetStatus.PENDING_MANAGER ||
      approvalStatus === TransactionSheetStatus.PENDING_ADMIN ||
      approvalStatus === TransactionSheetStatus.PENDING_ADMIN_LEAD
    return isPending && ability.can('reject', 'transaction_sheet')
  }, [approvalStatus, ability])

  return (
    <>
      <PageTitle
        enableBackButton
        handleShowHistory={transactionSheet ? handleViewHistory : undefined}
        handleEdit={
          approvalStatus !== TransactionSheetStatus.APPROVED &&
          approvalStatus !== TransactionSheetStatus.PENDING_ADMIN_LEAD &&
          ability.can('update', 'transaction_sheet')
            ? handleEdit
            : undefined
        }
        customActions={
          transactionSheet && (
            <Flex gap="3" align="center">
              {canReject && (
                <Button variant="secondary" color="red" onClick={() => openApprovalModal('reject')}>
                  Từ chối
                </Button>
              )}
              {canApprove && (
                <Button color="green" onClick={() => openApprovalModal('approve')}>
                  {approvalStatus === TransactionSheetStatus.PENDING_CONFIRM ||
                  approvalStatus === TransactionSheetStatus.PENDING_MANAGER
                    ? 'Xác nhận'
                    : 'Phê duyệt'}
                </Button>
              )}
            </Flex>
          )
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'transaction_sheet')}
      >
        {transactionSheet ? <TransactionSheetDetail sheet={transactionSheet} /> : <div />}
      </DetailPageWrapper>
    </>
  )
}

export default TransactionSheetDetailPage
