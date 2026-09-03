import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { Button, Select, Table, type ColumnDef } from '@/components/ui'
import { IconBuildings, IconEye, IconTrash, IconWarningcircle } from '@/assets/icons'
import { usePositionSelect } from '@/hooks/usePositionSelect.ts'
import { APP_PATH } from '@/routes'
import type { LineConflict, ResultCard, ResultCardLine } from './wizard-logic'

type ResultCardViewProps = {
  card: ResultCard
  onRemoveLine: (employeeId: number) => void
  onPositionChange: (employeeId: number, positionId: number) => void
  disabled?: boolean
  lineConflicts?: Record<number, LineConflict>
}

const ResultCardView = ({
  card,
  onRemoveLine,
  onPositionChange,
  disabled,
  lineConflicts,
}: ResultCardViewProps) => {
  const { loadPositionOptions, loadInitialPositionOptions } = usePositionSelect()

  const columns: ColumnDef<ResultCardLine>[] = useMemo(
    () => [
      { accessorKey: 'employeeCode', header: 'Mã NV', meta: { width: 'w-32' } },
      {
        accessorKey: 'employeeName',
        header: 'Tên nhân viên',
        cell: ({ row }) => {
          const conflict = lineConflicts?.[row.original.employeeId]
          return (
            <Flex direction="column" gap="1">
              <span>{row.original.employeeName}</span>
              {conflict && (
                <Flex direction="column" gap="1" className="max-w-[260px]">
                  <Flex align="start" gap="1">
                    <IconWarningcircle
                      className="text-data-red-default mt-0.5 shrink-0"
                      size={14}
                    />
                    <span className="text-data-red-default typo-body-xs-regular">
                      {conflict.message}
                    </span>
                  </Flex>
                  <Link
                    to={APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_DETAIL.replace(
                      ':id',
                      String(conflict.proposalId)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-action-primary-red-default hover:text-action-primary-red-hover flex items-center gap-1"
                    title="Xem đề xuất đang chờ duyệt"
                  >
                    <IconEye size={14} />
                    <span className="typo-body-xs-semibold underline">Xem đề xuất</span>
                  </Link>
                </Flex>
              )}
            </Flex>
          )
        },
        meta: { width: 'w-72' },
      },
      {
        id: 'position',
        header: 'Chức vụ',
        cell: ({ row }) => {
          const line = row.original
          return (
            <Select
              // Select's onChange only reports the picked id (no label) — positionName becomes
              // undefined after a change; it is a display convenience only, never sent to the API
              // (buildLinesPayload only reads positionId).
              value={line.positionId}
              onChange={(value) => {
                if (value) {
                  onPositionChange(line.employeeId, Number(value))
                }
              }}
              loadOptions={loadPositionOptions}
              loadInitialOptions={async (values) => {
                // Common case: value is still the original, already-known position — skip the API call.
                if (
                  values.length === 1 &&
                  Number(values[0]) === line.positionId &&
                  line.positionName
                ) {
                  return [{ label: line.positionName, value: line.positionId }]
                }
                return loadInitialPositionOptions(values)
              }}
              enableSearch
              searchPlaceholder="Tìm kiếm chức vụ..."
              disabled={disabled}
            />
          )
        },
        meta: { width: 'w-56' },
      },
      {
        id: 'remove',
        header: '',
        cell: ({ row }) => (
          <Button
            type="button"
            variant="secondary"
            iconOnly
            size="medium"
            leftIcon={<IconTrash />}
            onClick={() => onRemoveLine(row.original.employeeId)}
            disabled={disabled}
            className="bg-data-red-disabled text-data-red-default p-2"
            title="Xoá khỏi danh sách"
          />
        ),
        meta: { width: 'w-[56px]', align: 'right' },
      },
    ],
    [
      loadPositionOptions,
      loadInitialPositionOptions,
      onPositionChange,
      onRemoveLine,
      disabled,
      lineConflicts,
    ]
  )

  const { branchName, blockName, departmentName } = card.destination
  const orgPath = [branchName, blockName, departmentName].filter(Boolean).join(' / ')

  return (
    <div className="border-border-2 flex w-full flex-col gap-4 rounded-lg border border-solid p-4">
      <Flex
        align="center"
        gap="3"
        className="bg-background-2 border-action-primary-red-default rounded-md border-l-4 py-2.5 pr-4 pl-3"
      >
        <span className="bg-content-light-1 text-action-primary-red-default flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <IconBuildings size={16} />
        </span>
        <Flex direction="column" gap="0" className="min-w-0">
          <span className="text-content-dark-3 typo-body-xs-regular">Điều chuyển đến</span>
          <span className="text-content-dark-1 typo-body-base-semibold truncate" title={orgPath}>
            {orgPath}
          </span>
        </Flex>
      </Flex>
      <Table
        data={card.lines}
        columns={columns}
        showSTT
        enablePagination={false}
        showActions={false}
        className="px-0 pb-0"
        getRowClassName={(line) =>
          lineConflicts?.[line.employeeId] ? 'bg-data-red-disabled/40' : ''
        }
      />
    </div>
  )
}

export default ResultCardView
