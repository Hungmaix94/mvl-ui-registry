import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Text } from '@radix-ui/themes'
import {
  type ProposalTimesheetEntryComplaint,
  type GetProposalsTimesheetEntryComplaintParams,
  useProposalsTimesheetEntryComplaint,
  useApproveProposalTimesheetEntryComplaint,
  useRejectProposalTimesheetEntryComplaint,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { Table, TableAction } from '@/components/ui'
import Chip, { ChipVariant } from '@/components/ui/chip/Chip.tsx'
import { DATE_FORMAT } from '@/constants/date-format'
import { formatDate } from '@/utils/date-utils'
import { IconEye, IconCheck, IconX } from '@/assets/icons'
import toastService from '@/services/toast-service'
import { APP_PATH } from '@/routes'
import ComplaintStatusBadge from '@/features/attendance/timesheet-complaint/components/ComplaintStatusBadge.tsx'
import { ColoredValueVariant } from '@/api/schema.ts'
import TableError from '@/components/ui/table/TableError'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useDialog } from '@/hooks/useDialog'
import ApproveComplaintDialogContent, {
  type ApproveComplaintDialogContentRef,
} from '@/features/attendance/timesheet/view-details/ApproveComplaintDialogContent'
import RejectComplaintDialogContent, {
  type RejectComplaintDialogContentRef,
} from '@/features/attendance/timesheet/view-details/RejectComplaintDialogContent'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { extractErrorMessage } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability'
import { useAuth } from '@/store/auth-store'
import { useRejectProposalVerifier, useVerifyProposalVerifier } from '@/services'
import { getProposalBaseService } from '@/features/decision-and-proposal/services/proposal-base-service'
import VerifierActionDialogContent, {
  type VerifierActionDialogContentRef,
} from '@/features/attendance/timesheet-complaint/components/VerifierActionDialogContent.tsx'
import { ProposalStatus, ProposalVerifierStatus } from '@/constants/api-schema-aliases'

type TimesheetComplaintListTableProps = {
  apiParams?: GetProposalsTimesheetEntryComplaintParams
  isQueryReady?: boolean
  currentPage: number
  pageSize: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const TimesheetComplaintListTable = ({
  apiParams,
  isQueryReady = false,
  currentPage,
  pageSize,
  onPaginationChange,
  onClearFilter,
  hasFilter = false,
}: TimesheetComplaintListTableProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ability = useAbility()
  const { displayCustom, setLoading: setDialogLoading } = useDialog()

  const approveMutation = useApproveProposalTimesheetEntryComplaint()
  const rejectMutation = useRejectProposalTimesheetEntryComplaint()

  const approveContentRef = useRef<ApproveComplaintDialogContentRef | null>(null)
  const rejectContentRef = useRef<RejectComplaintDialogContentRef | null>(null)
  const verifierActionRef = useRef<VerifierActionDialogContentRef | null>(null)
  const [loading, setLoadingState] = useState(false)
  const { user } = useAuth()

  const verifyProposalVerifierMutation = useVerifyProposalVerifier()
  const rejectProposalVerifierMutation = useRejectProposalVerifier()

  const {
    data: apiResponse,
    isLoading,
    error,
  } = useProposalsTimesheetEntryComplaint(isQueryReady && apiParams ? apiParams : undefined)

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS],
  })

  const statusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])

  // Extract API data
  const { proposals, totalRecords, pageCount } = useMemo(() => {
    const results = apiResponse?.results || []
    const total = apiResponse?.count || 0
    return {
      proposals: results,
      totalRecords: total,
      pageCount: Math.ceil(total / pageSize) || 1,
    }
  }, [apiResponse?.results, apiResponse?.count, pageSize])

  // Format complaint date
  const formatComplaintDate = (value?: string | null) => {
    if (!value) return '-'
    try {
      return format(parseISO(value), DATE_FORMAT)
    } catch {
      return '-'
    }
  }

  const onClickViewComplaintDetail = useCallback(
    (record: ProposalTimesheetEntryComplaint) => {
      const path = APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_DETAIL.replace(':id', String(record.id))
      navigate(path, {
        state: {
          from: window.location.pathname + window.location.search,
        },
      })
    },
    [navigate]
  )

  const onClickViewTimesheetDetail = useCallback(
    (record: ProposalTimesheetEntryComplaint) => {
      const entryId = record.timesheet_entry_id

      if (entryId) {
        const path = APP_PATH.ATTENDANCE_TIMESHEET_DETAIL.replace(':entryId', String(entryId))
        navigate(path, {
          state: {
            from: window.location.pathname + window.location.search,
          },
        })
      } else {
        console.warn('Cannot navigate: timesheet_entry ID not found in proposal', record)
        toastService.error('Không tìm thấy thông tin ngày công')
      }
    },
    [navigate]
  )

  const handleReject = useCallback(
    (complaint: ProposalTimesheetEntryComplaint) => {
      rejectContentRef.current = null

      const isApprovedStatus = complaint.colored_proposal_status?.value === ProposalStatus.approved

      const approver = complaint.approved_by
      const approverInfo =
        approver?.fullname && approver?.code
          ? `${approver.fullname} (${approver.code})`
          : approver?.fullname || approver?.code || '-'

      displayCustom({
        title: 'Từ chối xác nhận công',
        content: (
          <div className="flex w-full flex-col gap-4">
            {isApprovedStatus && (
              <div className="flex flex-col gap-3">
                <p className="typo-body-base text-content-dark-2">
                  Bạn có muốn từ chối xác nhận công{' '}
                  <span className="typo-body-base-semibold text-content-dark-1">đã được duyệt</span>{' '}
                  của nhân viên?
                </p>
                <div className="border-border-1 bg-background-2 rounded-lg border p-3">
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                      <span className="typo-body-sm text-content-dark-3">Nhân viên:</span>
                      <span className="typo-body-sm-semibold text-content-dark-1">
                        {complaint.created_by?.fullname || '-'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                      <span className="typo-body-sm text-content-dark-3">Mã nhân viên:</span>
                      <span className="typo-body-sm-semibold text-content-dark-1">
                        {complaint.created_by?.code || '-'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                      <span className="typo-body-sm text-content-dark-3">Ngày xác nhận:</span>
                      <span className="typo-body-sm-semibold text-content-dark-1">
                        {formatDate(complaint.timesheet_entry_complaint_complaint_date)}
                      </span>
                    </div>
                    {complaint.timesheet_entry_complaint_approved_check_in_time && (
                      <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                        <span className="typo-body-sm text-content-dark-3">Giờ vào đã duyệt:</span>
                        <span className="typo-body-sm-semibold text-content-dark-1">
                          {complaint.timesheet_entry_complaint_approved_check_in_time.slice(0, 5)}
                        </span>
                      </div>
                    )}
                    {complaint.timesheet_entry_complaint_approved_check_out_time && (
                      <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                        <span className="typo-body-sm text-content-dark-3">Giờ ra đã duyệt:</span>
                        <span className="typo-body-sm-semibold text-content-dark-1">
                          {complaint.timesheet_entry_complaint_approved_check_out_time.slice(0, 5)}
                        </span>
                      </div>
                    )}
                    {approver && (
                      <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                        <span className="typo-body-sm text-content-dark-3">Người đã duyệt:</span>
                        <span className="typo-body-sm-semibold text-content-dark-1">
                          {approverInfo}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <RejectComplaintDialogContent
              ref={(ref) => {
                rejectContentRef.current = ref
              }}
              complaint={complaint}
            />
          </div>
        ),
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        size: 'lg',
        loading: rejectMutation.isPending || loading,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = rejectContentRef.current?.getData()
          if (!data) {
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          setLoadingState(true)
          setDialogLoading(true)
          try {
            await rejectMutation.mutateAsync({
              id: complaint.id,
              data: {
                approval_note: data.note,
              },
            })
          } catch (error) {
            console.error('Failed to reject complaint:', error)
            const errorMessage = extractErrorMessage(error)
            toastService.error(errorMessage)
            throw error
          } finally {
            setLoadingState(false)
            setDialogLoading(false)
          }

          toastService.success('Từ chối xác nhận công thành công')
          // Fire-and-forget invalidations so a refetch error does not block dialog close
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
          })
          queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
          })
          queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposals', 'list'],
          })
        },
        onCancel: () => {},
      })
    },
    [rejectMutation, displayCustom, loading, queryClient, setDialogLoading]
  )

  const handleApprove = useCallback(
    (complaint: ProposalTimesheetEntryComplaint) => {
      approveContentRef.current = null

      displayCustom({
        title: 'Duyệt xác nhận công',
        content: (
          <ApproveComplaintDialogContent
            ref={(ref) => {
              approveContentRef.current = ref
            }}
            complaint={complaint}
          />
        ),
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        size: 'lg',
        loading: approveMutation.isPending || loading,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = approveContentRef.current?.getData()
          if (!data) {
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          setLoadingState(true)
          try {
            await approveMutation.mutateAsync({
              id: complaint.id,
              data,
            })
            toastService.success('Duyệt xác nhận công thành công')
            // Invalidate and refetch complaint list query
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
            })
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
            })
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposals', 'list'],
            })
          } catch (error) {
            console.error('Failed to approve complaint:', error)
            const errorMessage = extractErrorMessage(error)
            toastService.error(errorMessage)
            throw error
          } finally {
            setLoadingState(false)
          }
        },
      })
    },
    [approveMutation, displayCustom, loading, queryClient]
  )

  const handleVerifierApprove = useCallback(
    async (complaint: ProposalTimesheetEntryComplaint) => {
      try {
        // Fetch verifiers for this complaint
        const proposalVerifierData = await queryClient.fetchQuery({
          queryKey: [
            'hrm',
            'proposal-verifiers',
            'list',
            { proposal: complaint.id, page_size: 1000 },
          ],
          queryFn: () =>
            getProposalBaseService().getProposalVerifiers({
              proposal: complaint.id,
              page_size: 1000,
            }),
          staleTime: 1000 * 60 * 5,
        })

        const proposalVerifiers = proposalVerifierData?.results || []
        const currentPendingVerifier = proposalVerifiers.find(
          (verifier) =>
            verifier.colored_status.value === ProposalVerifierStatus.pending &&
            verifier.employee.code === user?.employee?.code
        )

        if (!currentPendingVerifier?.id || !complaint?.id) {
          toastService.error('Không tìm thấy verifier đang chờ xử lý')
          return
        }

        verifierActionRef.current = null

        displayCustom({
          title: 'Xác nhận đề xuất',
          content: (
            <VerifierActionDialogContent
              ref={(ref) => {
                verifierActionRef.current = ref
              }}
              isReject={false}
            />
          ),
          confirmText: 'Xác nhận',
          cancelText: 'Huỷ',
          size: 'lg',
          loading: verifyProposalVerifierMutation.isPending,
          footerFlexJustify: 'end',
          onConfirm: async () => {
            const data = verifierActionRef.current?.getData()
            if (!data) {
              const error = new Error('Validation failed')
              ;(error as any).isValidationError = true
              throw error
            }

            try {
              await verifyProposalVerifierMutation.mutateAsync({
                id: currentPendingVerifier.id,
                data: { note: data.note ?? null },
              })
              toastService.success('Xác nhận đề xuất thành công')
              await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
              })
              await queryClient.invalidateQueries({
                queryKey: ['hrm', 'proposal-verifiers'],
              })
              await queryClient.invalidateQueries({
                queryKey: ['hrm', 'proposals', 'mine', 'list'],
              })
              await queryClient.invalidateQueries({
                queryKey: ['hrm', 'proposals', 'list'],
              })
              await queryClient.invalidateQueries({
                queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
              })
            } catch (error) {
              console.error('Failed to verify proposal:', error)
              const errorMessage = extractErrorMessage(error)
              toastService.error(errorMessage)
              throw error
            }
          },
          onCancel: () => {},
        })
      } catch (error) {
        console.error('Failed to fetch verifiers:', error)
        toastService.error('Không thể tải thông tin verifier')
      }
    },
    [verifyProposalVerifierMutation, displayCustom, queryClient, user?.employee?.code]
  )

  const handleVerifierReject = useCallback(
    async (complaint: ProposalTimesheetEntryComplaint) => {
      try {
        // Fetch verifiers for this complaint
        const proposalVerifierData = await queryClient.fetchQuery({
          queryKey: [
            'hrm',
            'proposal-verifiers',
            'list',
            { proposal: complaint.id, page_size: 1000 },
          ],
          queryFn: () =>
            getProposalBaseService().getProposalVerifiers({
              proposal: complaint.id,
              page_size: 1000,
            }),
          staleTime: 1000 * 60 * 5,
        })

        const proposalVerifiers = proposalVerifierData?.results || []
        const currentPendingVerifier = proposalVerifiers.find(
          (verifier) =>
            verifier.colored_status.value === ProposalVerifierStatus.pending &&
            verifier.employee.code === user?.employee?.code
        )

        if (!currentPendingVerifier?.id || !complaint?.id) {
          toastService.error('Không tìm thấy verifier đang chờ xử lý')
          return
        }

        verifierActionRef.current = null

        displayCustom({
          title: 'Từ chối đề xuất',
          content: (
            <VerifierActionDialogContent
              ref={(ref) => {
                verifierActionRef.current = ref
              }}
              isReject={true}
            />
          ),
          confirmText: 'Xác nhận',
          cancelText: 'Huỷ',
          size: 'lg',
          loading: rejectProposalVerifierMutation.isPending,
          footerFlexJustify: 'end',
          onConfirm: async () => {
            const data = verifierActionRef.current?.getData()
            if (!data) {
              const error = new Error('Validation failed')
              ;(error as any).isValidationError = true
              throw error
            }

            try {
              await rejectProposalVerifierMutation.mutateAsync({
                id: currentPendingVerifier.id,
                data: { note: data.note },
              })
              toastService.success('Từ chối đề xuất thành công')
              await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
              })
              await queryClient.invalidateQueries({
                queryKey: ['hrm', 'proposal-verifiers'],
              })
              await queryClient.invalidateQueries({
                queryKey: ['hrm', 'proposals', 'mine', 'list'],
              })
              await queryClient.invalidateQueries({
                queryKey: ['hrm', 'proposals', 'list'],
              })
              await queryClient.invalidateQueries({
                queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
              })
            } catch (error) {
              console.error('Failed to reject proposal:', error)
              const errorMessage = extractErrorMessage(error)
              toastService.error(errorMessage)
              throw error
            }
          },
          onCancel: () => {},
        })
      } catch (error) {
        console.error('Failed to fetch verifiers:', error)
        toastService.error('Không thể tải thông tin verifier')
      }
    },
    [rejectProposalVerifierMutation, displayCustom, queryClient, user?.employee?.code]
  )

  // Columns
  const columns: ColumnDef<ProposalTimesheetEntryComplaint>[] = useMemo(
    () => [
      {
        accessorKey: 'created_by.code',
        id: 'employee_code',
        header: 'Mã nhân viên',
        cell: ({ row }) => {
          const employee = row.original.created_by
          const value = employee?.code || '-'
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </span>
          )
        },
        meta: {
          width: '140px',
          frozen: true,
        },
      },
      {
        accessorKey: 'created_by.fullname',
        id: 'employee_name',
        header: 'Tên nhân viên',
        cell: ({ row }) => {
          const employee = row.original.created_by
          const value = employee?.fullname || '-'
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
          frozen: true,
        },
      },
      {
        accessorKey: 'created_by.branch.name',
        id: 'branch',
        header: 'Chi nhánh',
        cell: ({ row }) => {
          const employee = row.original.created_by
          const value = employee?.branch?.name || '-'
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </span>
          )
        },
        meta: {
          width: '150px',
          sortable: false,
        },
      },
      {
        accessorKey: 'created_by.block.name',
        id: 'block',
        header: 'Khối',
        cell: ({ row }) => {
          const employee = row.original.created_by
          const value = employee?.block?.name || '-'
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
          sortable: false,
        },
      },
      {
        accessorKey: 'created_by.department.name',
        id: 'department',
        header: 'Phòng ban',
        cell: ({ row }) => {
          const employee = row.original.created_by
          const value = employee?.department?.name || '-'
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
          sortable: false,
        },
      },
      {
        accessorKey: 'created_by.position.name',
        id: 'position',
        header: 'Chức vụ',
        cell: ({ row }) => {
          const employee = row.original.created_by
          const value = employee?.position?.name || '-'
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
          sortable: false,
        },
      },
      {
        accessorKey: 'timesheet_entry_complaint_complaint_date',
        header: 'Ngày xác nhận công',
        cell: ({ getValue }) => {
          const value =
            getValue() as ProposalTimesheetEntryComplaint['timesheet_entry_complaint_complaint_date']
          const formattedDate = formatComplaintDate(value)
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: {
          width: '125px',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'colored_proposal_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const colored = getValue() as { value: string; variant: ColoredValueVariant } | undefined
          return (
            <div className="flex justify-center">
              <ComplaintStatusBadge status={colored} />
            </div>
          )
        },
        meta: {
          width: '100px',
          align: 'center',
          sortable: false,
        },
      },
      {
        accessorKey: 'proposal_verifier.colored_status',
        header: 'Trạng thái xác nhận',
        cell: ({ row }) => {
          const verifier = row.original.proposal_verifier
          const status = verifier?.colored_status?.value
          const label = status ? statusMapping[status] || '-' : '-'
          const variant =
            (verifier?.colored_status?.variant as ChipVariant) || ColoredValueVariant.GREY
          return (
            <div className="flex justify-center">
              {label === '-' ? (
                <Text className="typo-body-base-regular text-content-dark-1">-</Text>
              ) : (
                <Chip label={label} variant={variant} size="small" type="outlined" />
              )}
            </div>
          )
        },
        meta: {
          width: '100px',
          align: 'center',
          sortable: false,
        },
      },
    ],
    [statusMapping]
  )

  // Row actions
  const actions: TableAction<ProposalTimesheetEntryComplaint>[] = useMemo(() => {
    const baseActions: TableAction<ProposalTimesheetEntryComplaint>[] = [
      {
        label: 'Xem chi tiết xác nhận công',
        icon: <IconEye size={16} />,
        onClick: onClickViewComplaintDetail,
      },
      {
        label: 'Xem chi tiết ngày công',
        icon: <IconEye size={16} />,
        onClick: onClickViewTimesheetDetail,
        show: (record) => !!record.timesheet_entry_id,
      },
    ]

    // Add approve/reject actions conditionally based on permission and status
    const canApprove = ability.can('approve', 'proposal_timesheet_entry_complaint')
    const canReject = ability.can('reject', 'proposal_timesheet_entry_complaint')

    if (canApprove || canReject) {
      baseActions.push(
        {
          label: 'Từ chối xác nhận công',
          icon: <IconX size={16} />,
          onClick: handleReject,
          variant: 'danger',
          className: 'whitespace-nowrap min-w-[200px]',
          show: (record) => {
            const isPending = record.colored_proposal_status?.value === ProposalStatus.pending
            return canReject && isPending
          },
        },
        {
          label: 'Đổi trạng thái sang Từ chối',
          icon: <IconX size={16} />,
          onClick: handleReject,
          variant: 'danger',
          show: (record) => {
            const isApproved = record.colored_proposal_status?.value === ProposalStatus.approved
            return canReject && isApproved
          },
        },
        {
          label: 'Duyệt xác nhận công',
          icon: <IconCheck size={16} />,
          onClick: handleApprove,
          variant: 'success',
          show: (record) => {
            const isPending = record.colored_proposal_status?.value === ProposalStatus.pending
            return canApprove && isPending
          },
        }
      )
    }

    // Add verifier actions (Xác nhận/Từ chối) conditionally based on permission
    const canVerifyVerifier = ability.can('verify', 'proposal_verifier')
    const canRejectVerifier = ability.can('reject', 'proposal_verifier')

    if (canVerifyVerifier || canRejectVerifier) {
      baseActions.push(
        {
          label: 'Từ chối',
          icon: <IconX size={16} />,
          onClick: handleVerifierReject,
          variant: 'danger',
          show: (record) => {
            // Check if there's a verifier with pending status for current user
            // Note: This is a basic check. Full verification happens in handler
            const verifier = record.proposal_verifier
            const isPending = verifier?.colored_status?.value === ProposalVerifierStatus.pending
            const isCurrentUserVerifier = verifier?.employee?.code === user?.employee?.code
            return canRejectVerifier && isPending && isCurrentUserVerifier
          },
        },
        {
          label: 'Xác nhận',
          icon: <IconCheck size={16} />,
          onClick: handleVerifierApprove,
          variant: 'success',
          show: (record) => {
            // Check if there's a verifier with pending status for current user
            // Note: This is a basic check. Full verification happens in handler
            const verifier = record.proposal_verifier
            const isPending = verifier?.colored_status?.value === ProposalVerifierStatus.pending
            const isCurrentUserVerifier = verifier?.employee?.code === user?.employee?.code
            return canVerifyVerifier && isPending && isCurrentUserVerifier
          },
        }
      )
    }

    return baseActions
  }, [
    onClickViewTimesheetDetail,
    onClickViewComplaintDetail,
    handleReject,
    handleApprove,
    handleVerifierApprove,
    handleVerifierReject,
    ability,
    user?.employee?.code,
  ])

  // Sticky header logic - find scroll container from page level
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const scrollContainer = document.querySelector(
        '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
      ) as HTMLElement
      if (!scrollContainer) return

      const table = scrollContainer.querySelector('table') as HTMLElement
      if (!table) return

      const thead = table.querySelector('thead') as HTMLElement
      if (!thead) return

      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement

      const updateStickyTop = () => {
        if (!scrollContainer || !navBar) return

        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const navBarRect = navBar.getBoundingClientRect()
        const scrollContainerTop = scrollContainerRect.top
        const navBarBottom = navBarRect.bottom

        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        }

        thead.style.top = `${topOffset}px`
      }

      updateStickyTop()

      const scrollHandler = () => {
        updateStickyTop()
      }
      scrollContainer.addEventListener('scroll', scrollHandler)
      window.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updateStickyTop)

      cleanup = () => {
        scrollContainer.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) {
        cleanup()
      }
    }
  }, [proposals])

  if (error) {
    return <TableError />
  }

  return (
    <Table<ProposalTimesheetEntryComplaint>
      data={proposals}
      columns={columns}
      enablePagination={true}
      enableSorting={false}
      enableFiltering={false}
      showSTT={true}
      showActions={true}
      rowActions={actions}
      isLoading={isLoading}
      emptyMessage="Không có xác nhận công nào"
      pageSize={pageSize}
      manualPagination={true}
      pageCount={pageCount}
      totalRecords={totalRecords}
      currentPageIndex={currentPage - 1}
      onPaginationChange={onPaginationChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      disableInnerOverflow={true}
      paginationPosition="static"
      actionMenuPosition="cursor"
      className="px-10"
    />
  )
}

export default TimesheetComplaintListTable
