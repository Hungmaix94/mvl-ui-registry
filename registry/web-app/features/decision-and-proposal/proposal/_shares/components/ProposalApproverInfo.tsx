import { Chip, Table, ColumnDef } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { type Employee } from '@/features/employee/services/employee-service'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

type ProposalApproverInfoProps = {
  approver: Employee | null | undefined
  approvedAt?: string | null
  status?: string | null
  note?: string | null
}

type ApproverTableData = {
  id: number
  fullname: string
  department: string
  position: string
  approved_at: string | null
  status: string | null
  note: string | null
}

const ProposalApproverInfo = ({
  approver,
  approvedAt,
  status,
  note,
}: ProposalApproverInfoProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES],
  })

  const statusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  const getStatusVariant = (status: string): ColoredValueVariant => {
    if (status === 'approved') return ColoredValueVariant.GREEN
    if (status === 'rejected') return ColoredValueVariant.RED
    return ColoredValueVariant.YELLOW
  }

  const getStatusLabel = (status: string): string => {
    return statusMapping[status] || status
  }

  // Transform approver data for table
  const tableData: ApproverTableData[] = useMemo(() => {
    if (!approver) return []

    return [
      {
        id: approver.id || 0,
        fullname: approver.fullname || '-',
        department: approver.department?.name || '-',
        position: approver.position?.name || '-',
        approved_at: approvedAt || null,
        status: status || null,
        note: note || null,
      },
    ]
  }, [approver, approvedAt, status, note])

  // Define columns
  const columns: ColumnDef<ApproverTableData>[] = useMemo(
    () => [
      {
        accessorKey: 'fullname',
        header: 'Họ tên',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'department',
        header: 'Phòng ban',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'position',
        header: 'Chức vụ',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'approved_at',
        header: 'Thời gian',
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          const formatted = value ? format(new Date(value), DATE_FORMAT) : '-'
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={formatted}>
              {formatted}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
          align: 'center',
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const statusValue = getValue() as string | null
          if (!statusValue) {
            return <span className="typo-body-base-regular text-content-dark-1">-</span>
          }
          return (
            <Chip
              label={getStatusLabel(statusValue)}
              variant={getStatusVariant(statusValue)}
              size="small"
            />
          )
        },
        meta: {
          width: 'flex-1',
          align: 'center',
        },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span
              className="typo-body-base-regular text-content-dark-1 truncate"
              title={value || undefined}
            >
              {value || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
    ],
    []
  )

  if (!approver) {
    return (
      <div className="flex w-full flex-col gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin người duyệt</p>
        <div className="flex w-full items-center justify-center py-8">
          <span className="text-content-dark-3">Không có thông tin</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <p className="typo-body-xl-semibold text-content-dark-1">Thông tin người duyệt</p>
      <Table
        data={tableData}
        columns={columns}
        showSTT={false}
        showActions={false}
        enablePagination={false}
        enableSorting={false}
        emptyMessage="Không có thông tin người duyệt"
        className="px-0"
      />
    </div>
  )
}

export default ProposalApproverInfo
