import { ReactNode, useMemo } from 'react'
import { Flex, Grid } from '@radix-ui/themes'
import { Chip, Table, type ColumnDef } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { type ProposalBulkJobTransfer } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { components } from '@/api/schema.ts'
import ProposalInfoRow from '@/features/decision-and-proposal/proposal/_shares/components/ProposalInfoRow.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { IconBuildings, IconCalendarcheck, IconNotepad, IconUsersthree } from '@/assets/icons'

type ProposalJobTransferLine = components['schemas']['ProposalJobTransferLine']

type BulkJobTransferProposalInfoProps = {
  proposal: ProposalBulkJobTransfer
}

type DestinationGroup = {
  departmentId: number
  orgPath: string
  lines: ProposalJobTransferLine[]
}

/** BE-fixed status codes (see `ProposalBulkJobTransfer.transfer_status`) — not the generated
 * schema enum, whose name is regenerated per query param and therefore unstable; these literal
 * codes are the stable part of the API contract (mirrors how `transferStatusLabels` below already
 * indexes by raw string, with no enum import). */
const TRANSFER_STATUS_VARIANT: Record<string, ColoredValueVariant> = {
  not_transferred: ColoredValueVariant.GREY,
  transferred: ColoredValueVariant.GREEN,
  rejected: ColoredValueVariant.RED,
}

function buildOrgPath(
  branch?: { name?: string } | null,
  block?: { name?: string } | null,
  department?: { name?: string } | null
): string {
  const parts = [branch?.name, block?.name, department?.name].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : '-'
}

/** Groups lines by destination department so each card mirrors the create wizard's
 * ResultCardView grouping — the two screens read as the same feature. */
function groupLinesByDestination(lines: ProposalJobTransferLine[]): DestinationGroup[] {
  const groups = new Map<number, DestinationGroup>()

  lines.forEach((line) => {
    const departmentId = line.new_department.id
    const existing = groups.get(departmentId)
    if (existing) {
      existing.lines.push(line)
      return
    }

    groups.set(departmentId, {
      departmentId,
      orgPath: buildOrgPath(line.new_branch, line.new_block, line.new_department),
      lines: [line],
    })
  })

  return Array.from(groups.values())
}

const StatTile = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <Flex align="center" gap="3" className="border-border-2 rounded-md border border-solid px-4 py-3">
    <span className="bg-background-2 text-content-dark-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
      {icon}
    </span>
    <Flex direction="column" gap="0" className="min-w-0">
      <span className="text-content-dark-3 typo-body-xs-regular">{label}</span>
      <span className="text-content-dark-1 typo-body-base-semibold truncate" title={value}>
        {value}
      </span>
    </Flex>
  </Flex>
)

const OrgCallout = ({
  label,
  orgPath,
  accentClassName,
  badgeClassName,
}: {
  label: string
  orgPath: string
  accentClassName: string
  badgeClassName: string
}) => (
  <Flex
    align="center"
    gap="3"
    className={`bg-background-2 rounded-md border-l-4 py-2.5 pr-4 pl-3 ${accentClassName}`}
  >
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${badgeClassName}`}
    >
      <IconBuildings size={16} />
    </span>
    <Flex direction="column" gap="0" className="min-w-0">
      <span className="text-content-dark-3 typo-body-xs-regular">{label}</span>
      <span className="text-content-dark-1 typo-body-base-semibold truncate" title={orgPath}>
        {orgPath}
      </span>
    </Flex>
  </Flex>
)

const BulkJobTransferProposalInfo = ({ proposal }: BulkJobTransferProposalInfoProps) => {
  const lines = useMemo(() => proposal.job_transfer_lines || [], [proposal.job_transfer_lines])

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES],
  })
  const transferStatusLabels = useMemo(() => {
    const raw = keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES)
    return raw && typeof raw === 'object' ? raw : {}
  }, [keysMap])

  const destinationGroups = useMemo(() => groupLinesByDestination(lines), [lines])

  // Every line shares one source department — a bulk transfer always originates from the
  // proposer's own department (see wizard-logic.ts's buildInitialCardsFromLines) — so the
  // "from" side only needs to be shown once instead of repeated on every row.
  const sourceOrgPath = useMemo(() => {
    const first = lines[0]
    return first ? buildOrgPath(first.old_branch, first.old_block, first.old_department) : '-'
  }, [lines])

  const columns: ColumnDef<ProposalJobTransferLine>[] = useMemo(
    () => [
      {
        accessorKey: 'employee',
        header: 'Nhân sự',
        cell: ({ row }) => {
          const line = row.original
          return (
            <Flex direction="column" gap="0">
              <span
                className="text-content-dark-1 typo-body-base-medium"
                title={line.employee?.fullname}
              >
                {line.employee?.fullname}
              </span>
              <span className="text-content-dark-3 typo-body-xs-regular">
                {line.employee?.code}
                {line.old_position?.name ? ` · ${line.old_position.name}` : ''}
              </span>
            </Flex>
          )
        },
        meta: { width: 'w-96', sortable: false },
      },
      {
        accessorKey: 'new_position',
        header: 'Chức vụ mới',
        cell: ({ row }) => (
          <span className="text-content-dark-1 typo-body-base-regular">
            {row.original.new_position?.name || '-'}
          </span>
        ),
        meta: { width: 'w-56', sortable: false },
      },
      {
        accessorKey: 'reason',
        header: 'Lý do',
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span
              className="text-content-dark-1 typo-body-base-regular text-start break-words whitespace-normal"
              title={value || ''}
            >
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'w-[220px]', sortable: false },
      },
    ],
    []
  )

  return (
    <div className="flex w-full flex-col gap-5">
      <Flex align="center" justify="between" gap="3" wrap="wrap">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin đề xuất</p>
        <Chip
          label={transferStatusLabels[proposal.transfer_status] || proposal.transfer_status}
          variant={TRANSFER_STATUS_VARIANT[proposal.transfer_status] ?? ColoredValueVariant.GREY}
          size="large"
          showDot
        />
      </Flex>

      <Grid columns={{ initial: '1', sm: '3' }} gap="3" className="w-full">
        <StatTile icon={<IconNotepad size={18} />} label="Mã đề xuất" value={proposal.code} />
        <StatTile
          icon={<IconCalendarcheck size={18} />}
          label="Ngày hiệu lực"
          value={formatDate(proposal.job_transfer_effective_date)}
        />
        <StatTile
          icon={<IconUsersthree size={18} />}
          label="Số nhân sự"
          value={String(lines.length)}
        />
      </Grid>

      {destinationGroups.length > 0 ? (
        <>
          <OrgCallout
            label="Điều chuyển từ"
            orgPath={sourceOrgPath}
            accentClassName="border-data-blue-default"
            badgeClassName="bg-data-blue-disabled text-data-blue-default"
          />

          <div className="flex flex-col gap-4">
            {destinationGroups.map((group) => (
              <div
                key={group.departmentId}
                className="border-border-2 flex w-full flex-col gap-4 rounded-lg border border-solid p-4"
              >
                <OrgCallout
                  label="Điều chuyển đến"
                  orgPath={group.orgPath}
                  accentClassName="border-action-primary-red-default"
                  badgeClassName="bg-content-light-1 text-action-primary-red-default"
                />
                <Table
                  data={group.lines}
                  columns={columns}
                  showSTT
                  showActions={false}
                  enablePagination={false}
                  enableSorting={false}
                  className="px-0 pb-0"
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex w-full items-center justify-center py-8">
          <span className="text-content-dark-3">Không có nhân sự nào trong đề xuất</span>
        </div>
      )}

      <div className="flex flex-col">
        <ProposalInfoRow label="Ghi chú" value={proposal.note} />
        <ProposalInfoRow label="Ngày tạo đề xuất" value={formatDate(proposal.created_at)} />
        <ProposalInfoRow
          label="Ngày cập nhật cuối cùng"
          value={formatDate(proposal.updated_at)}
          isLast
        />
      </div>
    </div>
  )
}

export default BulkJobTransferProposalInfo
