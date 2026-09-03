import { useMemo, useCallback, useRef } from 'react'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconCheck, IconX } from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { type ProposalVerifierNeedVerification } from '@/features/decision-and-proposal/services/proposal-base-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useAbility } from '@/lib/ability.ts'
import { formatDate } from '@/utils/date-utils'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/utils'
import { useVerifyProposalVerifier, useRejectProposalVerifier } from '@/services'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog'
import { getProposalApproveRejectTitle } from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import ProposalApproveRejectDialogContent, {
  type ProposalApproveRejectDialogContentRef,
} from '@/features/decision-and-proposal/proposal/_shares/components/ProposalApproveRejectDialogContent'
import { ProposalType, ProposalVerifierStatus } from '@/constants/api-schema-aliases'

type ProposalManageTableProps = {
  data: ProposalVerifierNeedVerification[]
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

const ProposalVerifierManageTable = ({
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
}: ProposalManageTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const queryClient = useQueryClient()
  const { displayCustom } = useDialog()

  const verifyProposalVerifierMutation = useVerifyProposalVerifier()
  const rejectProposalVerifierMutation = useRejectProposalVerifier()

  const verifyContentRef = useRef<ProposalApproveRejectDialogContentRef | null>(null)
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

  const verifierStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_VERIFIER_STATUS_CHOICES) as Record<
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

  // Navigation helper function based on proposal_type
  const getDetailPath = (proposalVerifier: ProposalVerifierNeedVerification): string => {
    const id = String(proposalVerifier.id)

    // Use unified manage detail route with id and proposal_type as query param
    const basePath = APP_PATH.PROPOSAL_MANAGE_DETAIL.replace(':id', id)
    return `${basePath}`
  }

  const handleVerifierApprove = useCallback(
    (record: ProposalVerifierNeedVerification) => {
      const proposalType = record.proposal.proposal_type as ProposalType | null
      const typeLabel = proposalType
        ? proposalTypeLabelMapping[proposalType] || proposalType
        : undefined
      const approveTitle = getProposalApproveRejectTitle(proposalType, 'approve', typeLabel)

      verifyContentRef.current = null

      displayCustom({
        title: approveTitle,
        content: (
          <ProposalApproveRejectDialogContent
            ref={(ref) => {
              verifyContentRef.current = ref
            }}
            type="approve"
          />
        ),
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        size: 'md',
        loading: verifyProposalVerifierMutation.isPending,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = verifyContentRef.current?.getData()
          if (!data) {
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          try {
            await verifyProposalVerifierMutation.mutateAsync({
              id: record.id,
              data: { note: data.note || null },
            })
            toastService.success('Xác nhận đề xuất thành công')
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposal-verifiers', 'list'],
            })
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposal-verifiers', 'detail', record.id],
            })
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposal-verifiers', 'mine', 'list'],
            })
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposals', 'mine', 'list'],
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
    },
    [verifyProposalVerifierMutation, displayCustom, queryClient, proposalTypeLabelMapping]
  )

  const handleVerifierReject = useCallback(
    (record: ProposalVerifierNeedVerification) => {
      const proposalType = record.proposal.proposal_type as ProposalType | null
      const typeLabel = proposalType
        ? proposalTypeLabelMapping[proposalType] || proposalType
        : undefined
      const rejectTitle = getProposalApproveRejectTitle(proposalType, 'reject', typeLabel)

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
        loading: rejectProposalVerifierMutation.isPending,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = rejectContentRef.current?.getData()
          if (!data) {
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          if (!data.note) {
            const error = new Error('Ghi chú là bắt buộc')
            ;(error as any).isValidationError = true
            throw error
          }

          try {
            await rejectProposalVerifierMutation.mutateAsync({
              id: record.id,
              data: { note: data.note },
            })
            toastService.success('Từ chối đề xuất thành công')
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposal-verifiers', 'list'],
            })
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposal-verifiers', 'detail', record.id],
            })
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposal-verifiers', 'mine', 'list'],
            })
            await queryClient.invalidateQueries({
              queryKey: ['hrm', 'proposals', 'mine', 'list'],
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
    },
    [rejectProposalVerifierMutation, displayCustom, queryClient, proposalTypeLabelMapping]
  )

  // Columns
  const columns: ColumnDef<ProposalVerifierNeedVerification>[] = useMemo(
    () => [
      {
        accessorKey: 'proposal.code',
        header: 'Mã đề xuất',
        cell: ({ getValue }) => {
          const code = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={code}>
              {code || '-'}
            </span>
          )
        },
        meta: { width: 'w-[130px]' },
      },
      {
        accessorKey: 'proposal.proposal_type',
        header: 'Loại đề xuất',
        cell: ({ getValue }) => {
          const proposalType = getValue() as ProposalType | null
          // Use mapping from useAppConstant if available, otherwise fallback to enum value
          const label =
            proposalType && proposalTypeLabelMapping[proposalType]
              ? proposalTypeLabelMapping[proposalType]
              : proposalType || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={label}>
              {label}
            </span>
          )
        },
        meta: { width: 'w-[180px]', sortable: false },
      },
      {
        accessorKey: 'employee',
        header: 'Nhân viên đề xuất',
        cell: ({ row }) => {
          const employeeFullName = row.original.proposal.created_by.fullname
          const branchName = row.original.proposal.created_by.branch.name
          const blockName = row.original.proposal.created_by.block.name
          const departmentName = row.original.proposal.created_by.department.name
          return (
            <>
              <Flex
                direction={'column'}
                width={'100%'}
                title={`Tên nhân viên: ${employeeFullName}\nChi nhánh: ${branchName}\nKhối: ${blockName}\nPhòng ban: ${departmentName}`}
              >
                <div className="text-content-dark-1 text-sm">{employeeFullName || '-'}</div>
                <Flex justify={'between'} align={'center'} wrap={'wrap'}>
                  <span className={cn('text-content-dark-3 text-xs')}>{branchName}</span>
                  <span>-</span>
                  <span className={cn('text-content-dark-3 text-xs')}>{blockName}</span>
                  <span>-</span>
                  <span className={cn('text-content-dark-3 text-xs')}>{departmentName}</span>
                </Flex>
              </Flex>
            </>
          )
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        accessorKey: 'proposal_date_display',
        header: 'Ngày tạo đề xuất',
        cell: ({ row }) => {
          const display = formatDate(row.original.proposal.created_at)
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display || '-'}
            </span>
          )
        },
        meta: { width: 'w-[140px]', sortable: true },
      },
      {
        accessorKey: 'proposal.colored_proposal_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const colored =
            getValue() as ProposalVerifierNeedVerification['proposal']['colored_proposal_status']
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
        meta: { width: 'w-[110px]', sortable: false },
      },
      {
        accessorKey: 'colored_status',
        header: 'Trạng thái xác nhận',
        cell: ({ getValue }) => {
          const colored = getValue() as ProposalVerifierNeedVerification['colored_status']
          if (!colored?.value) {
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />
          }

          return (
            <Chip
              size="small"
              label={verifierStatusMapping[colored.value] || colored.value}
              variant={colored.variant}
            />
          )
        },
        meta: { width: 'w-[110px]', sortable: false },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const note = getValue() as string | null
          const display = note || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
    ],
    [getStatusMapping, proposalTypeLabelMapping]
  )

  // Row actions
  const actions: TableAction<ProposalVerifierNeedVerification>[] = useMemo(() => {
    const baseActions: TableAction<ProposalVerifierNeedVerification>[] = [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          const detailPath = getDetailPath(record)
          if (detailPath !== '#') {
            navigate(detailPath, {
              state: { from: window.location.pathname + window.location.search },
            })
          }
        },
        show: () => ability.can('retrieve', 'proposal_verifier'),
      },
    ]

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
            const isPending = record.colored_status?.value === ProposalVerifierStatus.pending
            return canRejectVerifier && isPending
          },
        },
        {
          label: 'Xác nhận',
          icon: <IconCheck size={16} />,
          onClick: handleVerifierApprove,
          variant: 'success',
          show: (record) => {
            const isPending = record.colored_status?.value === ProposalVerifierStatus.pending
            return canVerifyVerifier && isPending
          },
        }
      )
    }

    return baseActions
  }, [navigate, ability, handleVerifierApprove, handleVerifierReject])

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
    />
  )
}

export default ProposalVerifierManageTable
