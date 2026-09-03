import { useMemo } from 'react'
import { Grid } from '@radix-ui/themes'
import { type ProposalAssetAllocation } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { Table, ColumnDef } from '@/components/ui'
import { components } from '@/api/schema.ts'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'

type AssetAllocationProposalInfoProps = {
  proposal: ProposalAssetAllocation
}

type AssetTableData = {
  id: number
  name: string
  unit_type: string | null
  quantity: number
  note: string | null
}

const AssetAllocationProposalInfo = ({ proposal }: AssetAllocationProposalInfoProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES],
  })

  // Map unit_type enum to display labels
  const unitTypeMapping: Record<string, string> = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_ASSET_UNIT_TYPE_CHOICES) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])

  // Transform assets to table data.
  // Assets removed by HR during approval are flagged `removed_on_approval` (kept for audit)
  // rather than deleted — hide them so the rendered proposal shows HR's final list.
  const tableData: AssetTableData[] = useMemo(() => {
    return (proposal.assets || [])
      .filter((asset: components['schemas']['ProposalAsset']) => !asset.removed_on_approval)
      .map((asset: components['schemas']['ProposalAsset']) => ({
        id: asset.id,
        name: asset.name || '-',
        unit_type: asset.unit_type || null,
        quantity: asset.quantity || 0,
        note: asset.note || null,
      }))
  }, [proposal.assets])

  const columns: ColumnDef<AssetTableData>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên tài sản',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <span className="text-content-dark-1 truncate text-sm" title={value}>
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
      {
        accessorKey: 'unit_type',
        header: 'Đơn vị tính',
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          const displayValue = value ? unitTypeMapping[value] || value : '-'
          return (
            <span className="text-content-dark-1 truncate text-sm" title={displayValue}>
              {displayValue}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
      {
        accessorKey: 'quantity',
        header: 'Số lượng',
        cell: ({ getValue }) => {
          const value = getValue() as number
          return (
            <span className="text-content-dark-1 text-sm" title={String(value)}>
              {value ?? '-'}
            </span>
          )
        },
        meta: { width: 'w-[230px]', sortable: false },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span
              className="text-content-dark-1 text-start text-sm break-words whitespace-normal"
              title={value || ''}
            >
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'w-[300px]', sortable: false, align: 'center' },
      },
    ],
    []
  )

  return (
    <div className="flex w-full flex-col gap-0">
      <p className="typo-body-xl-semibold text-content-dark-1 mb-5">Thông tin đề xuất</p>

      {/* Assets table */}
      <div className="flex flex-col gap-5">
        <Table
          data={tableData}
          columns={columns}
          showSTT={false}
          showActions={false}
          enablePagination={false}
          enableSorting={false}
          className="px-0 pb-2"
        />
      </div>

      {/* Additional info fields */}
      <Grid columns="2" gap="5" className="w-full">
        <div className="flex flex-col">
          <ProposalInfoRow label="Mã đề xuất" value={proposal.code} />
          {/*<ProposalInfoRowStatus status={proposal.colored_proposal_status} />*/}
          <ProposalInfoRow label="Lý do" value={proposal.note} isLast />
        </div>
        <div className="flex flex-col pl-6">
          <ProposalInfoRow
            label="Ngày tạo đề xuất"
            value={proposal.created_at ? formatDate(proposal.created_at) : null}
          />
          <ProposalInfoRow
            label="Ngày cập nhật cuối cùng"
            value={proposal.updated_at ? formatDate(proposal.updated_at) : null}
            isLast
          />
        </div>
      </Grid>
    </div>
  )
}

export default AssetAllocationProposalInfo
