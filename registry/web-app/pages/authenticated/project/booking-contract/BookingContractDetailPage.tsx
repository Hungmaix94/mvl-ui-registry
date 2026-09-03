import { FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases.ts'
import toastService from '@/services/toast-service'
import { useDialog } from '@/hooks/useDialog'
import { APP_PATH } from '@/routes/AppRoute.constant.ts'
import {
  useApproveBooking,
  useBooking,
  useRejectBooking,
  useAccountantApproveBooking,
  useAdminLeadApproveBooking,
  useDeleteBooking,
} from '@/services/sales-service'
import { TextArea } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import BookingContractDetail from '@/features/project/booking-contract/components/BookingContractDetail.tsx'
import { BookingContractActionMenu } from '@/features/project/booking-contract/components/BookingContractActionMenu.tsx'
import { BookingContractStatus } from '@/features/project/booking-contract/types/booking-contract-types.ts'
import { useAbility } from '@/lib/ability'

const BookingContractDetailPage: FC = () => {
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const contractId = Number(id)

  const { data: detailData, isLoading, error } = useBooking(contractId)
  const { mutateAsync: approveBooking } = useApproveBooking()
  const { mutateAsync: accountantApproveBooking } = useAccountantApproveBooking()
  const { mutateAsync: adminLeadApproveBooking } = useAdminLeadApproveBooking()
  const { mutateAsync: rejectBooking } = useRejectBooking()
  const { mutateAsync: deleteBooking } = useDeleteBooking()
  const { displayFormContent, displayConfirm, displayClose, setLoading } = useDialog()

  // Check for error/not found states
  const isError = !!error
  const isNotFound = !!error && (error as any)?.response?.status === 404

  const openApprovalModal = (
    action:
      | 'approve'
      | 'accountant_approve'
      | 'admin_lead_approve'
      | 'reject_accountant'
      | 'reject_admin'
      | 'reject_admin_lead'
      | 'reject'
  ) => {
    let note = ''

    const actionConfig = {
      approve: { title: 'Xác nhận phê duyệt', confirmText: 'Phê duyệt', actionName: 'phê duyệt' },
      accountant_approve: {
        title: 'Kế toán phê duyệt',
        confirmText: 'Xác nhận',
        actionName: 'phê duyệt (kế toán)',
      },
      admin_lead_approve: {
        title: 'Quản lý xác nhận',
        confirmText: 'Xác nhận',
        actionName: 'quản lý xác nhận',
      },
      reject_accountant: {
        title: 'Kế toán từ chối',
        confirmText: 'Từ chối',
        actionName: 'kế toán từ chối',
      },
      reject_admin: { title: 'Admin từ chối', confirmText: 'Từ chối', actionName: 'admin từ chối' },
      reject_admin_lead: {
        title: 'Quản lý từ chối',
        confirmText: 'Từ chối',
        actionName: 'quản lý từ chối',
      },
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
        if (action.startsWith('reject') && !note.trim()) {
          toastService.error('Vui lòng nhập lý do từ chối')
          return
        }
        try {
          setLoading(true)
          if (action === 'approve') {
            await approveBooking({ id: contractId, data: { note, is_approved: true } })
          } else if (action === 'accountant_approve') {
            await accountantApproveBooking({ id: contractId, data: { note, is_approved: true } })
          } else if (action === 'admin_lead_approve') {
            await adminLeadApproveBooking({ id: contractId, data: { note, is_approved: true } })
          } else if (action === 'reject_accountant') {
            await accountantApproveBooking({ id: contractId, data: { note, is_approved: false } })
          } else if (action === 'reject_admin') {
            await approveBooking({ id: contractId, data: { note, is_approved: false } })
          } else if (action === 'reject_admin_lead') {
            await adminLeadApproveBooking({ id: contractId, data: { note, is_approved: false } })
          } else if (action === 'reject') {
            await rejectBooking({ id: contractId, data: { note } })
          }

          toastService.success(`Đã ${config.actionName} thành công hợp đồng`)
          displayClose()
          navigate(APP_PATH.PROJECT_BOOKING_CONTRACT)
        } catch (err) {
          toastService.error('Có lỗi xảy ra khi xử lý')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleDelete = () => {
    displayConfirm({
      title: 'Xóa hợp đồng đặt chỗ',
      content: 'Bạn có chắc chắn muốn xóa hợp đồng đặt chỗ này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deleteBooking(contractId)
          toastService.success('Xóa hợp đồng thành công')
          navigate(APP_PATH.PROJECT_BOOKING_CONTRACT)
        } catch (err: any) {
          toastService.error(err?.message || 'Có lỗi xảy ra khi xử lý')
        }
      },
    })
  }

  // Determine if we show confirm/reject buttons based on status
  const isPendingAccountant =
    detailData?.approval_status === DepositContractApprovalStatus.pending_accountant
  const isPendingAdmin = detailData?.approval_status === DepositContractApprovalStatus.pending_admin
  const isPendingAdminLead =
    detailData?.approval_status === DepositContractApprovalStatus.pending_admin_lead ||
    detailData?.approval_status === (DepositContractApprovalStatus.pending_manager as any)

  const canEditOrDelete =
    (detailData?.booking_status as unknown as string) === BookingContractStatus.PENDING_APPROVAL

  // Edit is gated on approval_status, not booking_status: a REJECTED booking is sent
  // back to the previous editor for rework (BE rewind), so it must stay editable.
  // Only the frozen desks are read-only — pending_accountant (backend blocks PATCH
  // with 400, booking FSD §4.2.1) and approved (finalized).
  const canEdit =
    !!detailData &&
    detailData.approval_status !== DepositContractApprovalStatus.approved &&
    detailData.approval_status !== DepositContractApprovalStatus.pending_accountant

  return (
    <>
      <PageTitle
        title={detailData?.code || ''}
        idLabel={detailData?.code || ''}
        enableBackButton
        handleEdit={
          canEdit
            ? () => navigate(APP_PATH.PROJECT_BOOKING_CONTRACT_EDIT.replace(':id', String(id)))
            : undefined
        }
        handleShowHistory={() =>
          navigate(APP_PATH.PROJECT_BOOKING_CONTRACT_HISTORY.replace(':id', id || ''))
        }
        customActions={
          <Flex gap="2">
            {detailData && (
              <BookingContractActionMenu
                contract={detailData}
                onRefund={() =>
                  navigate(APP_PATH.PROJECT_BOOKING_CONTRACT_REFUND.replace(':id', String(id)))
                }
                onApprove={isPendingAdmin ? () => openApprovalModal('approve') : undefined}
                onAccountantApprove={
                  isPendingAccountant ? () => openApprovalModal('accountant_approve') : undefined
                }
                onAdminLeadApprove={
                  isPendingAdminLead ? () => openApprovalModal('admin_lead_approve') : undefined
                }
                onRejectApprove={
                  isPendingAdmin ? () => openApprovalModal('reject_admin') : undefined
                }
                onRejectAccountantApprove={
                  isPendingAccountant ? () => openApprovalModal('reject_accountant') : undefined
                }
                onAdminLeadReject={
                  isPendingAdminLead ? () => openApprovalModal('reject_admin_lead') : undefined
                }
                onDelete={canEditOrDelete ? handleDelete : undefined}
              />
            )}
          </Flex>
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'booking')}
      >
        {detailData && (
          <>
            <BookingContractDetail contract={detailData} />
          </>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default BookingContractDetailPage
