import { Flex } from '@radix-ui/themes'
import type { HrContactCsvRow } from '@/features/org/branch/_shares/utils/branchLeadershipHrCsv.ts'
import { Text, Table, type ColumnDef } from '@/components/ui'

type BranchHrContactInfoCsvSectionProps = {
  rows: HrContactCsvRow[]
}

const BranchHrContactInfoCsvSection = ({ rows }: BranchHrContactInfoCsvSectionProps) => {
  if (!rows.length) {
    return null
  }

  const columns: ColumnDef<HrContactCsvRow>[] = [
    {
      accessorKey: 'businessLine',
      header: 'Nghiệp vụ',
      cell: ({ row }) => row.original.businessLine || '-',
      meta: {
        width: 'w-[200px]',
      },
    },
    {
      accessorKey: 'fullName',
      header: 'Họ và tên',
      cell: ({ row }) => row.original.fullName || '-',
      meta: {
        width: 'w-[200px]',
      },
    },
    {
      accessorKey: 'phone',
      header: 'Số điện thoại',
      cell: ({ row }) => row.original.phone || '-',
      meta: {
        width: 'w-[150px]',
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || '-',
      meta: {
        width: 'flex-1',
      },
    },
  ]

  return (
    <Flex direction="column" gap="3">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin liên lạc HR</Text>

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

export default BranchHrContactInfoCsvSection
