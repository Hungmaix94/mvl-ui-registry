import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { type BrokerCertificate } from '@/features/accounting/broker-certificates/services/broker-certificate-service'
import {
  CERT_STATUS_META,
  CERT_TYPE_LABEL,
  collaboratorNameOf,
} from '@/features/accounting/broker-certificates/types/broker-certificate-types'

type Props = {
  data: BrokerCertificate[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onRevoke?: (record: BrokerCertificate) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const BrokerCertificateTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onRevoke,
  onClearFilter,
  hasFilter,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const columns: ColumnDef<BrokerCertificate>[] = useMemo(
    () => [
      {
        id: 'holder',
        header: 'Cộng tác viên',
        cell: ({ row }) => (
          <span className="typo-body-base-semibold" title={collaboratorNameOf(row.original)}>
            {collaboratorNameOf(row.original)}
          </span>
        ),
        meta: { width: 'w-[220px]', sortable: false },
      },
      {
        id: 'cert_type',
        header: 'Loại',
        cell: ({ row }) =>
          row.original.cert_type
            ? CERT_TYPE_LABEL[row.original.cert_type] || row.original.cert_type
            : '—',
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'certificate_number',
        header: 'Mã số',
        cell: ({ getValue }) => {
          const v = getValue() as string
          return v ? <code>{v}</code> : '—'
        },
        meta: { width: 'w-[170px]', sortable: true },
      },
      {
        accessorKey: 'expected_issue_date',
        header: 'Ngày chờ cấp',
        cell: ({ getValue }) => formatDate(getValue() as string | null),
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'expiry_date',
        header: 'Hết hạn',
        cell: ({ getValue }) => formatDate(getValue() as string | null),
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'status',
        header: 'Tình trạng',
        cell: ({ getValue }) => {
          const meta = CERT_STATUS_META[(getValue() as string) ?? '']
          return meta ? <Chip variant={meta.variant} label={meta.label} size="small" /> : '—'
        },
        meta: { width: 'w-[130px]', sortable: false },
      },
    ],
    []
  )

  const rowActions: TableAction<BrokerCertificate>[] = useMemo(() => {
    const actions: TableAction<BrokerCertificate>[] = []
    if (ability.can('retrieve', 'brokercertificate')) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (r) => navigate(APP_PATH.BROKER_CERTIFICATE_DETAIL.replace(':id', String(r.id))),
      })
    }
    if (onRevoke && ability.can('revoke', 'brokercertificate')) {
      actions.push({
        label: 'Thu hồi',
        variant: 'danger',
        onClick: (r) => onRevoke(r),
        show: (r) => r.status !== 'REVOKED',
      })
    }
    return actions
  }, [ability, navigate, onRevoke])

  if (error) return <TableError />

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      showSTT
      showActions
      rowActions={rowActions}
      manualPagination
      manualSorting
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
      stickyHeader
    />
  )
}

export default BrokerCertificateTable
