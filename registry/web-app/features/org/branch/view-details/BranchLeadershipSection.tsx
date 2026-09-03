import { Flex } from '@radix-ui/themes'
import type { LeadershipCsvRow } from '@/features/org/branch/_shares/utils/branchLeadershipHrCsv.ts'
import { Text, Table, type ColumnDef } from '@/components/ui'

type BranchLeadershipSectionProps = {
  rows: LeadershipCsvRow[]
}

const BranchLeadershipSection = ({ rows }: BranchLeadershipSectionProps) => {
  if (!rows.length) {
    return null
  }

  const columns: ColumnDef<LeadershipCsvRow>[] = [
    {
      accessorKey: 'position',
      header: 'Vị trí',
      cell: ({ row }) => row.original.position || '-',
      meta: {
        width: 'flex-1',
      },
    },
    {
      accessorKey: 'fullName',
      header: 'Họ và tên',
      cell: ({ row }) => row.original.fullName || '-',
      meta: {
        width: 'flex-1',
      },
    },
  ]

  return (
    <Flex direction="column" gap="3">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin lãnh đạo</Text>

      <Table
        data={rows}
        columns={columns}
        showSTT={false}
        enablePagination={false}
        className="px-0 pb-0"
        bordered={false}
      />
    </Flex>
  )
}

export default BranchLeadershipSection
