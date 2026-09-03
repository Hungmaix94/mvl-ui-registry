import { IconPencil, IconTrash } from '@/assets/icons'
import { Chip, Button } from '@/components/ui'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ColoredValueVariant } from '@/api/schema'
import { TBC_STATUS_STYLES } from '@/constants/commission'
import { formatDate } from '@/utils/date-utils'
import { cn } from '@/utils'
import { MoreVertical } from 'lucide-react'
import { Table } from '@radix-ui/themes'
import { formatCurrencyVND, formatRatePct } from '@/utils/common'
import { formatRateSpecWithEquivalent, resolveRateTriple } from '@/utils/rate-spec'
import type { F2PeriodEntry, F2Record } from './f2-constants'

type F2RowAction = 'edit' | 'delete' | 'clone' | 'detail'

type F2PeriodHistoryListProps = {
  entries: F2PeriodEntry[]
  isReadOnly?: boolean
  onRowAction: (entry: F2PeriodEntry, action: F2RowAction) => void
}

function resolvePeriodStatus(entry: F2PeriodEntry) {
  const periodStatus = entry.entry?.period_status || entry.period_status
  const isCurrent = entry.entry?.is_current || entry.is_current

  if (periodStatus === 'active' && !isCurrent) {
    return { variant: ColoredValueVariant.GREY, label: 'Không áp dụng' }
  }

  return TBC_STATUS_STYLES[periodStatus ?? ''] || TBC_STATUS_STYLES.fallback
}

function formatMetricSummary(record: F2Record, catKey: string) {
  const rawPct = record?.[`pct_${catKey}`] as string | number | null | undefined
  const rawAmt = record?.[`amt_${catKey}`] as string | number | null | undefined
  const spec = catKey === 'f2_commission' ? record?.f2_commission_spec : null
  const fractionText = formatRateSpecWithEquivalent(spec)
  const resolved = spec ? resolveRateTriple(spec, rawPct, rawAmt) : null
  const pct = resolved ? resolved.pct : rawPct
  const amt = resolved ? resolved.amt : rawAmt

  if (fractionText) {
    return fractionText
  }
  if (amt != null && pct != null && amt !== '' && pct !== '') {
    return `${formatCurrencyVND(Number(amt))} đ / ${formatRatePct(pct)}`
  }
  if (amt != null && amt !== '') {
    return `${formatCurrencyVND(Number(amt))} đ`
  }
  if (pct != null && pct !== '') {
    return formatRatePct(pct)
  }
  return '—'
}

export function F2PeriodHistoryList({
  entries,
  isReadOnly = false,
  onRowAction,
}: F2PeriodHistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="border-border-1 bg-background-1 text-content-dark-3 rounded-lg border border-dashed p-8 text-center text-sm">
        Chưa có lịch sử cấu hình
      </div>
    )
  }

  return (
    <div className="border-border-1 bg-surface-primary-default overflow-hidden rounded-lg border">
      <Table.Root variant="surface">
        <Table.Header className="bg-background-2">
          <Table.Row>
            <Table.ColumnHeaderCell className="text-content-dark-2 text-xs font-semibold">
              Kỳ
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-content-dark-2 text-xs font-semibold">
              Loại sàn
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-content-dark-2 text-xs font-semibold">
              Thời gian
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-content-dark-2 text-xs font-semibold">
              Nguồn
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-content-dark-2 text-xs font-semibold">
              SLK (HH / Thưởng)
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-content-dark-2 text-xs font-semibold">
              Xúc tiến (HH / Thưởng)
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-content-dark-2 text-xs font-semibold">
              Trạng thái
            </Table.ColumnHeaderCell>
            {!isReadOnly && (
              <Table.ColumnHeaderCell className="text-content-dark-2 text-center text-xs font-semibold">
                Thao tác
              </Table.ColumnHeaderCell>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {entries.map((entry, index) => {
            const record: F2Record = entry.record ?? entry
            const statusConfig = resolvePeriodStatus(entry)
            const recordId = record.id || entry.id
            const isCurrent = entry.entry?.is_current || entry.is_current
            const isF1 = !!(
              record.pct_f2_inventory_hold && Number(record.pct_f2_inventory_hold) > 0
            )

            return (
              <Table.Row
                key={recordId ?? index}
                className={cn(isCurrent && 'bg-data-green-disabled/20 font-medium')}
              >
                <Table.RowHeaderCell className="align-middle">
                  Kỳ #{entries.length - index}
                </Table.RowHeaderCell>
                <Table.Cell className="align-middle">
                  <Chip
                    variant={isF1 ? ColoredValueVariant.BLUE : ColoredValueVariant.PURPLE}
                    size="small"
                    label={isF1 ? 'F1' : 'F2'}
                  />
                </Table.Cell>
                <Table.Cell className="align-middle">
                  {formatDate(record.effective_from)} →{' '}
                  {record.effective_to ? formatDate(record.effective_to) : 'Hiện tại'}
                </Table.Cell>
                <Table.Cell className="align-middle text-xs">
                  {record.tbc_source === 'sa' ? (
                    <span className="font-medium text-[#3E63DD]">
                      Kế thừa từ thông tin bán hàng
                    </span>
                  ) : (
                    <span className="text-content-dark-3">Cấu hình riêng</span>
                  )}
                </Table.Cell>
                <Table.Cell className="align-middle text-sm">
                  {formatMetricSummary(record, 'f2_commission')} /{' '}
                  {formatMetricSummary(record, 'f2_bonus')}
                </Table.Cell>
                <Table.Cell className="align-middle text-sm">
                  {formatMetricSummary(record, 'prom_f2_commission')} /{' '}
                  {formatMetricSummary(record, 'prom_f2_bonus')}
                </Table.Cell>
                <Table.Cell className="align-middle">
                  <Chip variant={statusConfig.variant} size="small" label={statusConfig.label} />
                </Table.Cell>
                {!isReadOnly && (
                  <Table.Cell className="text-center align-middle">
                    <TooltipProvider delayDuration={0}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="text"
                            size="small"
                            iconOnly
                            className="text-content-dark-1 hover:bg-background-3 mx-auto h-8 w-8 px-0"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContentPrimitive
                          align="end"
                          sideOffset={4}
                          className="border-border-1 bg-surface-primary-default z-50 w-[120px] rounded-md border p-1 shadow-md"
                        >
                          <div className="flex flex-col space-y-1">
                            <button
                              type="button"
                              className={cn(
                                'hover:bg-data-light-grey-hover flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer',
                                !entry.can_edit && entry.lock_reason
                                  ? 'text-content-dark-3 opacity-50'
                                  : 'text-content-dark-1'
                              )}
                              onClick={() => onRowAction(entry, 'edit')}
                            >
                              <span className="flex h-4 w-4 items-center justify-center">
                                <IconPencil size={16} />
                              </span>
                              <span>Chỉnh sửa</span>
                            </button>
                            <button
                              type="button"
                              className={cn(
                                'hover:bg-data-red-disabled flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:cursor-pointer',
                                !entry.can_delete && entry.lock_reason
                                  ? 'text-content-dark-3 opacity-50'
                                  : 'text-data-red-default hover:text-data-red-hover'
                              )}
                              onClick={() => onRowAction(entry, 'delete')}
                            >
                              <span className="flex h-4 w-4 items-center justify-center">
                                <IconTrash size={16} />
                              </span>
                              <span>Xóa</span>
                            </button>
                          </div>
                        </PopoverContentPrimitive>
                      </Popover>
                    </TooltipProvider>
                  </Table.Cell>
                )}
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </div>
  )
}
