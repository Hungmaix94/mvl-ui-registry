import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Text } from '@radix-ui/themes'
import { format, parseISO } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import Chip, { ChipVariant } from '@/components/ui/chip/Chip.tsx'
import { Table } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useProposalVerifiers } from '@/features/decision-and-proposal/services/proposal-base-service'
import { ProposalVerifierStatus } from '@/constants/api-schema-aliases'

type ComplaintVerifierInfoTableProps = {
  proposalId?: number | null
}

type VerifierRowData = {
  id: number
  fullname: string
  department: string
  position: string
  status: ProposalVerifierStatus | null
  verifiedTime: string
  note: string
  variant: ChipVariant
}

const ComplaintVerifierInfoTable = ({ proposalId }: ComplaintVerifierInfoTableProps) => {
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

  const { data: verifiersData } = useProposalVerifiers(
    proposalId ? { page_size: 1000, proposal: Number(proposalId) } : undefined
  )
  const verifiers = useMemo(() => verifiersData?.results || [], [verifiersData?.results])

  const tableData = useMemo<VerifierRowData[]>(() => {
    return verifiers.map((v) => ({
      id: v.id,
      fullname: v.employee?.fullname || '-',
      department: v.employee?.department?.name || '-',
      position: v.employee?.position?.name || '-',
      status: (v.colored_status?.value as ProposalVerifierStatus) || null,
      verifiedTime: v.verified_time ? format(parseISO(v.verified_time), DATE_FORMAT) : '-',
      note: v.note || '-',
      variant: (v.colored_status?.variant as ChipVariant) || ColoredValueVariant.GREY,
    }))
  }, [verifiers])

  const columns: ColumnDef<VerifierRowData>[] = useMemo(
    () => [
      {
        accessorKey: 'fullname',
        header: 'Họ tên',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: { width: 'w-full', align: 'left' as const },
      },
      {
        accessorKey: 'department',
        header: 'Phòng ban',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: { width: 'w-full', align: 'left' as const },
      },
      {
        accessorKey: 'position',
        header: 'Chức vụ',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: { width: 'w-full', align: 'left' as const },
      },
      {
        accessorKey: 'verifiedTime',
        header: 'Thời gian',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: { width: 'w-full', align: 'center' as const },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const status = row.original.status
          const label = status ? statusMapping[status] || '-' : '-'
          const variant = row.original.variant
          return label === '-' ? (
            <Text className="typo-body-base-regular text-content-dark-1">-</Text>
          ) : (
            <Chip label={label} variant={variant} size="small" type="outlined" />
          )
        },
        meta: { width: 'w-full', align: 'center' as const },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: { width: 'w-full', align: 'left' as const },
      },
    ],
    [statusMapping]
  )

  return (
    <section className="flex flex-col gap-5">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin người xác nhận</Text>
      {tableData.length > 0 && (
        <Table
          data={tableData}
          columns={columns}
          showSTT={false}
          showActions={false}
          enablePagination={false}
          enableSorting={false}
          className="!px-0 !pb-0"
          emptyMessage="Không có thông tin người xác nhận"
        />
      )}
    </section>
  )
}

export default ComplaintVerifierInfoTable
