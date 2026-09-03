import { useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDialog } from '@/hooks/useDialog'
import CheckinDetailDialogContent from '../../timesheet/view-details/CheckinDetailDialogContent'
import ApproveAttendanceDialogContent from '../components/ApproveAttendanceDialogContent'
import RejectAttendanceDialogContent from '../components/RejectAttendanceDialogContent'
import {
  useBulkApproveOtherAttendance,
  useRejectOtherAttendance,
  useConfirmOtherAttendance,
  type AttendanceRecord,
} from '@/features/attendance/services/attendance-record-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { formatDate } from '@/utils/date-utils.ts'
import { DATE_FORMAT, TIME_FORMAT } from '@/constants/date-format'
import { APP_PATH } from '@/routes/AppRoute.constant'

/**
 * Common shape exposed by both Approve/Reject dialog content refs.
 * Approve returns an optional note; Reject validates and returns null when empty.
 */
type NoteDialogRef = {
  getData: () => { note?: string | null } | null
}

function getImageUrl(record: AttendanceRecord): string | null {
  return record.image?.view_url || null
}

/**
 * Encapsulates every row action dialog for the "Chấm công khác" table:
 * approve/reject a pending record, confirm/reject the department-head
 * confirmation tier (CR215), reject an already-approved record, view detail
 * and view history. All note-based dialogs share a single runner to avoid
 * duplicating the open → validate → mutate → toast flow.
 */
export function useOtherAttendanceActions() {
  const navigate = useNavigate()
  const { displayCustom, setLoading } = useDialog()

  const approveMutation = useBulkApproveOtherAttendance()
  const rejectMutation = useRejectOtherAttendance()
  const confirmMutation = useConfirmOtherAttendance()

  const runNoteActionDialog = useCallback(
    (config: {
      title: string
      isPending: boolean
      danger?: boolean
      successMessage: string
      errorLog: string
      renderContent: (setRef: (ref: NoteDialogRef | null) => void) => ReactNode
      submit: (note: string | null | undefined) => Promise<void>
    }) => {
      const contentRef: { current: NoteDialogRef | null } = { current: null }

      displayCustom({
        title: config.title,
        content: config.renderContent((ref) => {
          contentRef.current = ref
        }),
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        confirmButtonClassName: config.danger
          ? 'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white'
          : undefined,
        size: 'lg',
        disableBackdropClose: true,
        loading: config.isPending,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = contentRef.current?.getData()
          if (!data) {
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          setLoading(true)
          try {
            await config.submit(data.note)
            toastService.success(config.successMessage)
          } catch (error) {
            console.error(config.errorLog, error)
            toastService.error(extractErrorMessage(error))
            throw error
          } finally {
            setLoading(false)
          }
        },
        onCancel: () => {},
      })
    },
    [displayCustom, setLoading]
  )

  const handleViewDetail = useCallback(
    (record: AttendanceRecord) => {
      displayCustom({
        size: 'xl',
        title: `Chi tiết chấm công - ${record?.employee?.fullname} - ${record?.employee?.code}`,
        content: (
          <CheckinDetailDialogContent
            location={record.address_text || '-'}
            date={formatDate(record.timestamp, DATE_FORMAT)}
            time={formatDate(record.timestamp, TIME_FORMAT)}
            imageUrl={getImageUrl(record) || ''}
            latitude={record.latitude || null}
            longitude={record.longitude || null}
            reason={record.description ?? null}
          />
        ),
        hideFooter: true,
        onClose: () => {},
      })
    },
    [displayCustom]
  )

  const handleReject = useCallback(
    (record: AttendanceRecord) => {
      runNoteActionDialog({
        title: 'Từ chối chấm công',
        isPending: approveMutation.isPending,
        danger: true,
        successMessage: 'Từ chối chấm công thành công',
        errorLog: 'Failed to reject attendance:',
        renderContent: (setRef) => (
          <RejectAttendanceDialogContent ref={setRef} attendanceRecord={record} />
        ),
        submit: async (note) => {
          await approveMutation.mutateAsync({
            ids: [record.id],
            is_approve: false,
            note: note ?? undefined,
          })
        },
      })
    },
    [runNoteActionDialog, approveMutation]
  )

  const handleApprove = useCallback(
    (record: AttendanceRecord) => {
      runNoteActionDialog({
        title: 'Duyệt chấm công',
        isPending: approveMutation.isPending,
        successMessage: 'Duyệt chấm công thành công',
        errorLog: 'Failed to approve attendance:',
        renderContent: (setRef) => (
          <ApproveAttendanceDialogContent ref={setRef} attendanceRecord={record} />
        ),
        submit: async (note) => {
          await approveMutation.mutateAsync({
            ids: [record.id],
            is_approve: true,
            note: note || undefined,
          })
        },
      })
    },
    [runNoteActionDialog, approveMutation]
  )

  const handleConfirmConfirmation = useCallback(
    (record: AttendanceRecord) => {
      runNoteActionDialog({
        title: 'Xác nhận chấm công',
        isPending: confirmMutation.isPending,
        successMessage: 'Xác nhận chấm công thành công',
        errorLog: 'Failed to confirm attendance:',
        renderContent: (setRef) => (
          <ApproveAttendanceDialogContent ref={setRef} attendanceRecord={record} />
        ),
        submit: async (note) => {
          await confirmMutation.mutateAsync({
            id: record.id,
            is_confirm: true,
            note: note || undefined,
          })
        },
      })
    },
    [runNoteActionDialog, confirmMutation]
  )

  const handleRejectConfirmation = useCallback(
    (record: AttendanceRecord) => {
      runNoteActionDialog({
        title: 'Từ chối xác nhận chấm công',
        isPending: confirmMutation.isPending,
        danger: true,
        successMessage: 'Từ chối xác nhận chấm công thành công',
        errorLog: 'Failed to reject attendance confirmation:',
        renderContent: (setRef) => (
          <RejectAttendanceDialogContent ref={setRef} attendanceRecord={record} />
        ),
        submit: async (note) => {
          await confirmMutation.mutateAsync({
            id: record.id,
            is_confirm: false,
            note: note ?? undefined,
          })
        },
      })
    },
    [runNoteActionDialog, confirmMutation]
  )

  const handleEdit = useCallback(
    (record: AttendanceRecord) => {
      const approver = record.approved_by
      const approverInfo =
        approver?.fullname && approver?.code
          ? `${approver.fullname} (${approver.code})`
          : approver?.fullname || approver?.code || '-'

      runNoteActionDialog({
        title: 'Từ chối chấm công',
        isPending: rejectMutation.isPending,
        danger: true,
        successMessage: 'Cập nhật chấm công thành công',
        errorLog: 'Failed to edit attendance:',
        renderContent: (setRef) => (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-3">
              <p className="typo-body-base text-content-dark-2">
                Bạn có muốn từ chối chấm công khác{' '}
                <span className="typo-body-base-semibold text-content-dark-1">đã được duyệt</span>{' '}
                của nhân viên?
              </p>
              <div className="border-border-1 bg-background-2 rounded-lg border p-3">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-[120px_1fr] items-center gap-x-2">
                    <span className="typo-body-sm text-content-dark-3">Nhân viên:</span>
                    <span className="typo-body-sm-semibold text-content-dark-1">
                      {record.employee?.fullname || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center gap-x-2">
                    <span className="typo-body-sm text-content-dark-3">Mã nhân viên:</span>
                    <span className="typo-body-sm-semibold text-content-dark-1">
                      {record.employee?.code || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center gap-x-2">
                    <span className="typo-body-sm text-content-dark-3">Ngày chấm công:</span>
                    <span className="typo-body-sm-semibold text-content-dark-1">
                      {formatDate(record.timestamp, DATE_FORMAT)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center gap-x-2">
                    <span className="typo-body-sm text-content-dark-3">Giờ chấm công:</span>
                    <span className="typo-body-sm-semibold text-content-dark-1">
                      {formatDate(record.timestamp, TIME_FORMAT)}
                    </span>
                  </div>
                  {approver && (
                    <div className="grid grid-cols-[120px_1fr] items-center gap-x-2">
                      <span className="typo-body-sm text-content-dark-3">Người đã duyệt:</span>
                      <span className="typo-body-sm-semibold text-content-dark-1">
                        {approverInfo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <RejectAttendanceDialogContent ref={setRef} attendanceRecord={record} />
          </div>
        ),
        submit: async (note) => {
          await rejectMutation.mutateAsync({ id: record.id, note: note ?? '' })
        },
      })
    },
    [runNoteActionDialog, rejectMutation]
  )

  const handleViewHistory = useCallback(
    (record: AttendanceRecord) => {
      navigate(APP_PATH.ATTENDANCE_OTHER_HISTORY.replace(':id', String(record.id)))
    },
    [navigate]
  )

  return {
    handleViewDetail,
    handleReject,
    handleApprove,
    handleConfirmConfirmation,
    handleRejectConfirmation,
    handleEdit,
    handleViewHistory,
  }
}
