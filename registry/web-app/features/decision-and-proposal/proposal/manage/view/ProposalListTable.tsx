import { useMemo, useCallback, useRef } from 'react'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconCheck, IconX } from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import { ColoredValueVariant } from '@/api/schema'
import { useAbility } from '@/lib/ability'
import { Flex } from '@radix-ui/themes'
import { type ProposalCombined } from '@/features/decision-and-proposal/services/proposal-base-service'
import {
  useApproveProposalByType,
  useRejectProposalByType,
} from '@/features/decision-and-proposal/services/use-proposal-by-type-mutations'
import ApproveComplaintDialogContent, {
  type ApproveComplaintDialogContentRef,
} from '@/features/attendance/timesheet/view-details/ApproveComplaintDialogContent'
import { useDialog } from '@/hooks/useDialog'
import { getProposalApproveRejectTitle } from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils'
import {
  getProposalResourceName,
  getProposalDetailPathBuilder,
  getProposalTypeTextColorClass,
} from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils'
import { cn } from '@/utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import ProposalApproveRejectDialogContent, {
  type ProposalApproveRejectDialogContentRef,
} from '@/features/decision-and-proposal/proposal/_shares/components/ProposalApproveRejectDialogContent'
import ProposalListShortDetailCell from '@/features/decision-and-proposal/proposal/_shares/components/ProposalListShortDetailCell'
import { formatDate } from '@/utils/date-utils.ts'
import { showBulkJobTransferApprovedInfo } from '@/features/decision-and-proposal/proposal/bulk-job-transfer/utils/showBulkJobTransferApprovedInfo.tsx'
import { ProposalStatus, ProposalType } from '@/constants/api-schema-aliases'

type ProposalListTableProps = {
  data: ProposalCombined[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter: boolean
}

export default function ProposalListTable({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter,
}: ProposalListTableProps) {
  const navigate = useNavigate()
  const ability = useAbility()
  const { displayCustom } = useDialog()

  const approveMutation = useApproveProposalByType()
  const rejectMutation = useRejectProposalByType()

  const approveNoteRef = useRef<ProposalApproveRejectDialogContentRef | null>(null)
  const approveComplaintRef = useRef<ApproveComplaintDialogContentRef | null>(null)
  const rejectContentRef = useRef<ProposalApproveRejectDialogContentRef | null>(null)

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES,
      APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE,
      APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES,
    ],
  })

  const getStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  const proposalTypeLabelMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE) as Record<string, string>) || {}
      : {}
  }, [keysMap])

  const verifierStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  const getDetailPath = useCallback((record: ProposalCombined): string => {
    const type = record.proposal_type as ProposalType | null
    if (!type) return '#'
    return getProposalDetailPathBuilder(type)(record.id)
  }, [])

  const handleApprove = useCallback(
    (record: ProposalCombined) => {
      const proposalType = record.proposal_type as ProposalType | null
      const typeLabel = proposalType
        ? proposalTypeLabelMapping[proposalType] || proposalType
        : undefined
      const approveTitle = getProposalApproveRejectTitle(proposalType, 'approve', typeLabel)

      if (!proposalType) return

      if (proposalType === ProposalType.timesheet_entry_complaint) {
        approveComplaintRef.current = null
        displayCustom({
          title: approveTitle,
          content: (
            <ApproveComplaintDialogContent
              ref={(ref) => {
                approveComplaintRef.current = ref
              }}
              complaint={record}
            />
          ),
          confirmText: 'Xác nhận',
          cancelText: 'Huỷ',
          size: 'lg',
          loading: approveMutation.isPending,
          footerFlexJustify: 'end',
          onConfirm: async () => {
            const formData = approveComplaintRef.current?.getData()
            if (!formData) {
              const err = new Error('Validation failed')
              ;(err as Error & { isValidationError?: boolean }).isValidationError = true
              throw err
            }
            try {
              await approveMutation.mutateAsync({
                proposalType,
                id: record.id,
                data: formData,
              })
              toastService.success('Duyệt đề xuất thành công')
            } catch (err) {
              console.error('Failed to approve proposal:', err)
              toastService.error(extractErrorMessage(err))
              throw err
            }
          },
          onCancel: () => {},
        })
        return
      }

      approveNoteRef.current = null
      displayCustom({
        title: approveTitle,
        content: (
          <ProposalApproveRejectDialogContent
            ref={(ref) => {
              approveNoteRef.current = ref
            }}
            type="approve"
          />
        ),
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        size: 'md',
        loading: approveMutation.isPending,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const formData = approveNoteRef.current?.getData()
          if (!formData) {
            const err = new Error('Validation failed')
            ;(err as Error & { isValidationError?: boolean }).isValidationError = true
            throw err
          }
          try {
            await approveMutation.mutateAsync({
              proposalType,
              id: record.id,
              data: { approval_note: formData.note || null },
            })
            toastService.success('Duyệt đề xuất thành công')
            if (proposalType === ProposalType.bulk_job_transfer) {
              showBulkJobTransferApprovedInfo(displayCustom, record)
            }
          } catch (err) {
            console.error('Failed to approve proposal:', err)
            toastService.error(extractErrorMessage(err))
            throw err
          }
        },
        onCancel: () => {},
      })
    },
    [displayCustom, approveMutation, proposalTypeLabelMapping]
  )

  const handleReject = useCallback(
    (record: ProposalCombined) => {
      const proposalType = record.proposal_type as ProposalType | null
      const typeLabel = proposalType
        ? proposalTypeLabelMapping[proposalType] || proposalType
        : undefined
      const rejectTitle = getProposalApproveRejectTitle(proposalType, 'reject', typeLabel)

      if (!proposalType) return

      rejectContentRef.current = null

      displayCustom({
        title: rejectTitle,
        content: (
          <ProposalApproveRejectDialogContent
            ref={(ref) => {
              rejectContentRef.current = ref
            }}
            type="reject"
          />
        ),
        confirmText: 'Từ chối',
        cancelText: 'Huỷ',
        size: 'md',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        loading: rejectMutation.isPending,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const formData = rejectContentRef.current?.getData()
          if (!formData) {
            const err = new Error('Validation failed')
            ;(err as Error & { isValidationError?: boolean }).isValidationError = true
            throw err
          }
          if (!formData.note) {
            const err = new Error('Ghi chú là bắt buộc')
            ;(err as Error & { isValidationError?: boolean }).isValidationError = true
            throw err
          }
          try {
            await rejectMutation.mutateAsync({
              proposalType,
              id: record.id,
              data: { approval_note: formData.note },
            })
            toastService.success('Từ chối đề xuất thành công')
          } catch (err) {
            console.error('Failed to reject proposal:', err)
            toastService.error(extractErrorMessage(err))
            throw err
          }
        },
        onCancel: () => {},
      })
    },
    [displayCustom, rejectMutation, proposalTypeLabelMapping]
  )

  const columns: ColumnDef<ProposalCombined>[] = useMemo(
    () => [
      // {
      //   accessorKey: 'code',
      //   header: 'Mã đề xuất',
      //   cell: ({ getValue }) => {
      //     const code = getValue() as string
      //     return (
      //       <span className="text-content-dark-1 text-sm" title={code}>
      //         {code || '-'}
      //       </span>
      //     )
      //   },
      //   meta: { width: 'w-[130px]' },
      // },
      {
        accessorKey: 'proposal_type',
        header: 'Loại đề xuất',
        cell: ({ getValue }) => {
          const proposalType = getValue() as ProposalType | null
          const label =
            proposalType && proposalTypeLabelMapping[proposalType]
              ? proposalTypeLabelMapping[proposalType]
              : proposalType || '-'
          return (
            <span
              className={cn(getProposalTypeTextColorClass(proposalType), 'text-sm')}
              title={label}
            >
              {label}
            </span>
          )
        },
        meta: { width: '160px', sortable: false },
      },
      {
        accessorKey: 'created_by',
        header: 'Nhân viên đề xuất',
        cell: ({ row }) => {
          const createdBy = row.original.created_by
          const code = createdBy?.code ?? '-'
          const fullname = createdBy?.fullname ?? '-'
          const branchName = createdBy?.branch?.name ?? ''
          const blockName = createdBy?.block?.name ?? ''
          const departmentName = createdBy?.department?.name ?? ''
          const title = `Mã: ${code}\nTên: ${fullname}\nChi nhánh: ${branchName}\nKhối: ${blockName}\nPhòng ban: ${departmentName}`
          return (
            <Flex direction="column" width="100%" title={title} gap={'2'}>
              <Flex direction={'column'} className="text-content-dark-1 typo-body-sm-medium">
                <span>{code}</span>
                <span>{fullname}</span>
              </Flex>
              <Flex
                direction="column"
                align="start"
                gap="1"
                className="text-content-dark-3 text-xs"
              >
                <span>{branchName}</span>
                <span>{blockName}</span>
                <span>{departmentName}</span>
              </Flex>
            </Flex>
          )
        },
        meta: { width: '240px', sortable: false },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo đề xuất',
        cell: ({ getValue }) => {
          const date = getValue() as string | null
          const display = date ? formatDate(date) : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display}
            </span>
          )
        },
        meta: { width: 'w-[140px]' },
      },
      {
        accessorKey: 'colored_proposal_status',
        header: 'Trạng thái duyệt',
        cell: ({ getValue }) => {
          const colored = getValue() as ProposalCombined['colored_proposal_status']
          if (!colored?.value) {
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />
          }
          return (
            <Chip
              size="small"
              label={getStatusMapping[colored.value] || colored.value}
              variant={colored.variant}
            />
          )
        },
        meta: { width: '120px', sortable: false },
      },
      {
        accessorKey: 'proposal_verifier',
        header: 'Trạng thái xác nhận',
        cell: ({ row }) => {
          const proposalVerifier = row.original.proposal_verifier
          if (!proposalVerifier?.status) {
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />
          }
          return (
            <Chip
              size="small"
              label={
                verifierStatusMapping[proposalVerifier.colored_status?.value] ||
                proposalVerifier.colored_status?.value ||
                proposalVerifier.status
              }
              variant={proposalVerifier.colored_status?.variant || ColoredValueVariant.GREY}
            />
          )
        },
        meta: { width: '150px', sortable: false },
      },
      {
        accessorKey: 'short_description',
        header: 'Chi tiết sơ bộ',
        cell: ({ row }) => <ProposalListShortDetailCell record={row.original} />,
        meta: { width: '200px', sortable: false },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const note = getValue() as string | null
          const display = note ?? '-'
          return (
            <span className="text-content-dark-1 block max-w-[180px] text-sm" title={display}>
              {display}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
    ],
    [getStatusMapping, proposalTypeLabelMapping, verifierStatusMapping]
  )

  const actions: TableAction<ProposalCombined>[] = useMemo(() => {
    const baseActions: TableAction<ProposalCombined>[] = [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          const path = getDetailPath(record)
          if (path !== '#') {
            navigate(path, {
              state: { from: window.location.pathname + window.location.search },
            })
          }
        },
        show: (record) => {
          const type = record.proposal_type as ProposalType | null
          if (!type) return false
          const resource = getProposalResourceName(type)
          return ability.can('retrieve', resource)
        },
      },
    ]

    const isPending = (record: ProposalCombined) =>
      record.colored_proposal_status?.value === ProposalStatus.pending

    baseActions.push(
      {
        label: 'Từ chối',
        icon: <IconX size={16} />,
        onClick: handleReject,
        variant: 'danger',
        show: (record) => {
          const type = record.proposal_type as ProposalType | null
          if (!type || !isPending(record)) return false
          return ability.can('reject', getProposalResourceName(type))
        },
      },
      {
        label: 'Duyệt',
        icon: <IconCheck size={16} />,
        onClick: handleApprove,
        variant: 'success',
        show: (record) => {
          const type = record.proposal_type as ProposalType | null
          if (!type || !isPending(record)) return false
          return ability.can('approve', getProposalResourceName(type))
        },
      }
    )

    return baseActions
  }, [navigate, ability, getDetailPath, handleApprove, handleReject])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      enablePagination
      manualPagination
      manualSorting
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
      disableInnerOverflow
      paginationPosition="static"
    />
  )
}
