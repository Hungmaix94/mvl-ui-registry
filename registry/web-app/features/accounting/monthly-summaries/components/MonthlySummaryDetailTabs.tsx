import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Text } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { Table, Button, Chip } from '@/components/ui'
import { formatCurrencyVND } from '@/utils/common'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { ColoredValueVariant } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import {
  getMonthlySummaryLines,
  MonthlyBeneficiaryCommissionSummaryDetail,
  MonthlySummaryRole,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { CompositionLine, ROLE_LABELS, SourceRole } from './MonthlySummaryConstants'
import { MonthlySummaryGrossComposition } from './MonthlySummaryGrossComposition'
import { MonthlySummaryAllocationChart } from './MonthlySummaryAllocationChart'
import { MonthlySummaryEmployeeInfo } from './MonthlySummaryEmployeeInfo'
import { MonthlySummaryDetailTable } from './MonthlySummaryDetailTable'
import CommSummaryAdjustmentDialog from '../../commissions/components/CommSummaryAdjustmentDialog'
import CommissionTransferDialog from '../../commissions/components/CommissionTransferDialog'
import MonthlySummaryTransferSection from './MonthlySummaryTransferSection'

const ROLE_VARIANTS: Record<string, ColoredValueVariant> = {
  [SourceRole.SALE]: ColoredValueVariant.GREEN,
  [SourceRole.MGMT]: ColoredValueVariant.BLUE,
  [SourceRole.F2]: ColoredValueVariant.PURPLE,
  [SourceRole.PROMO]: ColoredValueVariant.YELLOW,
  [SourceRole.SLK]: ColoredValueVariant.BLUE,
  [SourceRole.HHQL]: ColoredValueVariant.BLUE,
  [SourceRole.BACKOFFICE]: ColoredValueVariant.GREY,
  [SourceRole.BONUS]: ColoredValueVariant.GREEN,
  [SourceRole.PROJECT_DIRECTOR]: ColoredValueVariant.BLUE,
}

interface MonthlySummaryDetailTabsProps {
  record: MonthlyBeneficiaryCommissionSummaryDetail
  role?: MonthlySummaryRole
  onEditHold?: () => void
  onEditAdvance?: () => void
  auditLogs?: any[]
  isHistoriesLoading?: boolean
}

export function MonthlySummaryDetailTabs({
  record,
  role,
  onEditHold,
  onEditAdvance,
  auditLogs = [],
  isHistoriesLoading = false,
}: MonthlySummaryDetailTabsProps) {
  const isPaid = record.status === 'PAID'
  const preTaxTotal = Number(record.pre_tax_total || 0)
  const netPayable = Number(record.net_payable || 0)
  const queryClient = useQueryClient()
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)

  const sources = useMemo(() => {
    let s: any = record.sources
    if (typeof s === 'string') {
      try {
        s = JSON.parse(s)
      } catch (e) {
        s = undefined
      }
    }
    return s || {}
  }, [record.sources])

  const bonusItems = useMemo(() => {
    return sources?.bonus?.items || []
  }, [sources])

  const totalBonus = useMemo(() => {
    return bonusItems.reduce((sum: number, item: any) => {
      if (item.bonus_type === 'AD_SUPPORT') return sum
      const val = Number(item.amount || 0)
      return val > 0 ? sum + val : sum
    }, 0)
  }, [bonusItems])

  const totalDeduction = useMemo(() => {
    return bonusItems.reduce((sum: number, item: any) => {
      if (item.bonus_type === 'AD_SUPPORT') return sum
      const val = Number(item.amount || 0)
      return val < 0 ? sum + Math.abs(val) : sum
    }, 0)
  }, [bonusItems])

  const clientPromoTotal = useMemo(() => {
    const draftAdSupport = bonusItems
      .filter((item: any) => item.isDraft && item.bonus_type === 'AD_SUPPORT')
      .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
    return Number(record.promo_total || 0) + draftAdSupport
  }, [record.promo_total, bonusItems])

  // Create composition lines mapped to record totals
  const compositionLines = useMemo<CompositionLine[]>(() => {
    const lines: CompositionLine[] = [
      {
        key: SourceRole.SALE,
        label: ROLE_LABELS[SourceRole.SALE],
        amount: Number(record.sale_total || 0),
        link: '20.8.1',
      },
      {
        key: SourceRole.MGMT,
        label: ROLE_LABELS[SourceRole.MGMT],
        amount: Number(record.mgmt_total || 0),
      },
      {
        key: SourceRole.HHQL,
        label: ROLE_LABELS[SourceRole.HHQL],
        amount: Number(record.hhql_total || 0),
      },
      {
        key: SourceRole.F2,
        label: ROLE_LABELS[SourceRole.F2],
        amount: Number(record.f2_total || 0),
      },
      {
        key: SourceRole.SLK,
        label: ROLE_LABELS[SourceRole.SLK],
        amount: Number(record.slk_total || 0),
        link: '20.13.1',
      },
      {
        key: SourceRole.PROMO,
        label: ROLE_LABELS[SourceRole.PROMO],
        amount: clientPromoTotal,
        link: '20.13.1',
      },
      {
        key: SourceRole.BACKOFFICE,
        label: ROLE_LABELS[SourceRole.BACKOFFICE],
        amount: Number(record.backoffice_total || 0),
      },
    ]

    if (totalBonus > 0 || totalDeduction === 0) {
      lines.push({
        key: SourceRole.BONUS,
        label: 'Thưởng khác chi trả kỳ này',
        amount: totalBonus,
      })
    }
    if (totalDeduction > 0) {
      lines.push({
        key: SourceRole.BONUS,
        label: 'Khấu trừ khác trong kỳ',
        amount: -totalDeduction,
      })
    }

    lines.push({
      key: SourceRole.PROJECT_DIRECTOR,
      label: ROLE_LABELS[SourceRole.PROJECT_DIRECTOR],
      amount: Number(record.project_director_total || 0),
      link: '20.8.7',
    })

    // Khấu trừ hoa hồng (nghiệp vụ riêng, trước thuế). Ba số này KHÔNG net vào rổ nguồn:
    // `hhql_total` giữ nguyên số KPI gộp, còn phần net đã nằm ở `pre_tax_total`.
    // Dòng khấu trừ đứng ngay sau rổ nguồn để thấy quan hệ nhân - quả.
    const transferOut = Number(record.transfer_out_total || 0)
    const transferIn = Number(record.transfer_in_total || 0)
    const permanentDeduction = Number(record.deduction_total || 0)
    if (transferOut !== 0) {
      lines.push({
        key: SourceRole.TRANSFER_OUT_HHQL,
        label: ROLE_LABELS[SourceRole.TRANSFER_OUT_HHQL],
        amount: transferOut,
      })
    }
    if (permanentDeduction !== 0) {
      lines.push({
        key: SourceRole.DEDUCTION_HHQL,
        label: ROLE_LABELS[SourceRole.DEDUCTION_HHQL],
        amount: permanentDeduction,
      })
    }
    if (transferIn !== 0) {
      lines.push({
        key: SourceRole.TRANSFER_IN_HHQL,
        label: ROLE_LABELS[SourceRole.TRANSFER_IN_HHQL],
        amount: transferIn,
      })
    }

    return lines
  }, [record, totalBonus, totalDeduction, clientPromoTotal])

  // TanStack columns for transaction lines (Tab 2)
  const linesColumns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: 'source_role',
        header: 'Nguồn/Vai trò',
        cell: ({ row }) => {
          const roleKey = row.original.source_role
          const variant = ROLE_VARIANTS[roleKey] || ColoredValueVariant.GREY
          return <Chip label={ROLE_LABELS[roleKey] || roleKey} variant={variant} size="small" />
        },
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'deal_code',
        header: 'Mã Deal / Đối chiếu',
        cell: ({ row }) => {
          const info = row.original._parsedInfo
          const dealId = info.deal_id || info.deal?.id
          const code = info.deal_code || info.code || info.deal?.code || '-'
          if (dealId && code !== '-') {
            return (
              <Link
                to={APP_PATH.DEAL_DETAIL.replace(':id', String(dealId))}
                className="text-brand-primary font-semibold hover:underline"
              >
                <code className="text-xs">{code}</code>
              </Link>
            )
          }
          return (
            <code className="bg-neutral-30 rounded px-1.5 py-0.5 text-xs text-neutral-600">
              {code}
            </code>
          )
        },
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'project_name',
        header: 'Dự án',
        cell: ({ row }) => {
          const info = row.original._parsedInfo
          return (
            <span className="text-neutral-700">
              {info.project_name || info.project?.name || '-'}
            </span>
          )
        },
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'customer_name',
        header: 'Khách hàng',
        cell: ({ row }) => {
          const info = row.original._parsedInfo
          return (
            <span className="text-neutral-700">
              {info.customer_name || info.customer?.fullname || '-'}
            </span>
          )
        },
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'agency_fee_amount',
        header: () => <div className="text-right">Thưởng quản lý</div>,
        cell: ({ row }) => {
          const val = row.original.agency_fee_amount
          // `!== 0` (not `> 0`): a director-commission clawback line is negative and
          // must still render — `> 0` would silently hide it as an em dash.
          return (
            <div className="text-right font-medium text-neutral-900">
              {val !== 0 ? `${formatCurrencyVND(val)} ₫` : '—'}
            </div>
          )
        },
        meta: { width: 'w-[180px]', align: 'right' },
      },
      {
        id: 'investor_bonus_amount',
        header: () => <div className="text-right">Thưởng quản lý từ CDT</div>,
        cell: ({ row }) => {
          const val = row.original.investor_bonus_amount
          return (
            <div className="text-right font-medium text-neutral-700">
              {val > 0 ? `${formatCurrencyVND(val)} ₫` : '—'}
            </div>
          )
        },
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'mv_bonus_amount',
        header: () => <div className="text-right">Thưởng quản lý bổ sung</div>,
        cell: ({ row }) => {
          const val = row.original.mv_bonus_amount
          return (
            <div className="text-right font-medium text-neutral-700">
              {val > 0 ? `${formatCurrencyVND(val)} ₫` : '—'}
            </div>
          )
        },
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'hold_amount',
        header: () => <div className="text-right">Giữ lại HH</div>,
        cell: ({ row }) => {
          const val = row.original.hold_amount
          return (
            <div className="text-right font-semibold text-red-600">
              {val > 0 ? `-${formatCurrencyVND(val)} ₫` : '—'}
            </div>
          )
        },
        meta: { width: 'w-[120px]', align: 'right' },
      },
      {
        id: 'net_amount',
        header: () => <div className="text-right">Thực nhận</div>,
        cell: ({ row }) => {
          const val = row.original.net_amount
          // Negative = director-commission clawback; render the sign instead of "0 ₫".
          return (
            <div className="text-right font-bold text-neutral-900">
              {val !== 0 ? `${formatCurrencyVND(val)} ₫` : '0 ₫'}
            </div>
          )
        },
        meta: { width: 'w-[130px]', align: 'right' },
      },
    ],
    []
  )

  const linesData = useMemo(() => {
    const rawLines = getMonthlySummaryLines(record)
    const parsedLines = rawLines.map((line: any) => {
      let parsed = {}
      if (line.source_info && typeof line.source_info === 'object') {
        parsed = line.source_info
      } else if (line.source_info && typeof line.source_info === 'string') {
        try {
          parsed = JSON.parse(line.source_info)
        } catch (e) {
          // Silently catch JSON parsing errors
        }
      }
      return {
        ...line,
        _parsedInfo: parsed,
      }
    })

    // Group by deal_id/deal_code
    const groups: Record<string, any> = {}
    parsedLines.forEach((line, idx) => {
      const info = line._parsedInfo || {}
      const dealId = info.deal_id || info.deal?.id || line.deal_id || ''
      const dealCode = info.deal_code || info.code || info.deal?.code || line.deal_code || '-'
      // If there is no dealId, group by line.id or use a stable index-based key
      const key = dealId ? String(dealId) : line.id || `no-deal-${idx}`

      if (!groups[key]) {
        groups[key] = {
          key,
          deal_id: dealId,
          deal_code: dealCode,
          project_name: info.project_name || info.project?.name || line.project_name || '-',
          customer_name: info.customer_name || info.customer?.fullname || line.customer_name || '-',
          source_role: line.source_role,
          _parsedInfo: info,
          agency_fee_amount: 0,
          investor_bonus_amount: 0,
          mv_bonus_amount: 0,
          hold_amount: 0,
          net_amount: 0,
        }
      }

      // Determine category of the line
      const type = (line.pct_type || '').toLowerCase()
      const isInvestor = type.endsWith('investor_bonus')
      const isMv = type.endsWith('mv_bonus')

      const amount = Number(line.amount || 0)
      const holdVal = Number(line.account_hold_amount || line.hold_amount || 0)
      // Clamp to 0 only for positive lines (a hold bigger than the amount nets to 0).
      // A director-commission clawback is legitimately negative and must keep its sign.
      const netVal = amount < 0 ? amount - holdVal : Math.max(0, amount - holdVal)

      if (isInvestor) {
        groups[key].investor_bonus_amount += amount
      } else if (isMv) {
        groups[key].mv_bonus_amount += amount
      } else {
        groups[key].agency_fee_amount += amount
      }

      groups[key].hold_amount += holdVal
      groups[key].net_amount += netVal
    })

    return Object.values(groups)
  }, [record])

  return (
    <div className="animate-in fade-in flex w-full flex-col gap-6 duration-300">
      {/* Big breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlySummaryGrossComposition
            record={record}
            compositionLines={compositionLines}
            preTaxTotal={preTaxTotal}
            netPayable={netPayable}
            isPaid={isPaid}
            onEditHold={onEditHold}
            onEditAdvance={onEditAdvance}
          />
        </div>
        <div className="flex flex-col gap-5">
          <MonthlySummaryAllocationChart
            compositionLines={compositionLines}
            preTaxTotal={preTaxTotal}
          />
          <MonthlySummaryEmployeeInfo record={record} />

          {(onEditHold || onEditAdvance || record.status === 'DRAFT') && (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
                Thao tác
              </div>
              <div className="flex flex-col gap-2">
                {onEditHold && (
                  <Button
                    variant="secondary-border"
                    className="h-9 justify-start px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                    onClick={onEditHold}
                  >
                    Chỉnh tạm giữ HH
                  </Button>
                )}
                {record.status === 'DRAFT' && (
                  <Button
                    variant="secondary-border"
                    className="h-9 justify-start px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setIsAdjustmentDialogOpen(true)}
                  >
                    Thêm thưởng / Khấu trừ
                  </Button>
                )}
                {record.status === 'DRAFT' && Number(record.hhql_total || 0) > 0 && (
                  <Button
                    variant="secondary-border"
                    className="h-9 justify-start px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setIsTransferDialogOpen(true)}
                  >
                    Khấu trừ để thưởng
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chi tiết các nguồn HH */}
      <MonthlySummaryDetailTable compositionLines={compositionLines} preTaxTotal={preTaxTotal} />

      {/* Khấu trừ HHQL (để thưởng cho người khác + khấu trừ vĩnh viễn) */}
      <MonthlySummaryTransferSection
        transferOut={sources?.transfer_out}
        transferIn={sources?.transfer_in}
        deduction={sources?.deduction}
        hhqlTotal={record.hhql_total as string | undefined}
      />

      {/* Chi tiết giao dịch */}
      {linesData.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-gray-100 bg-gray-50/50 px-5 py-4">
            <Text className="font-semibold text-gray-900">Chi tiết giao dịch</Text>
            <Text className="text-xs text-gray-400">
              Danh sách các giao dịch phát sinh hoa hồng trong kỳ của người thụ hưởng này
            </Text>
          </div>
          <Table
            columns={linesColumns}
            data={linesData}
            tableContainerClassName="border-0 bg-white"
            enableRowSelection={false}
            enablePagination={false}
          />
        </div>
      )}

      {/* Lịch sử thao tác (Audit block matching mockup) */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
          Lịch sử thao tác
        </div>
        {isHistoriesLoading ? (
          <Text className="animate-pulse text-xs text-neutral-400">Đang tải lịch sử...</Text>
        ) : auditLogs.length > 0 ? (
          <div className="flex flex-col gap-2 text-xs text-neutral-600">
            {auditLogs.map((log: any) => (
              <div key={log.log_id} className="flex items-start gap-4">
                <span className="w-28 font-mono text-[11px] text-neutral-400">
                  {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}
                </span>
                <div className="text-neutral-700">
                  • <span className="font-semibold text-neutral-800">{log.action}</span> trên{' '}
                  <span className="font-medium">
                    {log.object_repr || log.object_type || 'Bảng tổng hợp'}
                  </span>
                  {log.full_name || log.username ? (
                    <span className="text-neutral-400"> · {log.full_name || log.username}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text className="text-xs text-neutral-400">Chưa ghi nhận lịch sử thao tác nào.</Text>
        )}
      </div>
      {record.status === 'DRAFT' && isTransferDialogOpen && (
        <CommissionTransferDialog
          open={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
          year={record.year}
          month={record.month}
          employeeId={record.beneficiary_employee!}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_DETAIL(
                role || 'employees',
                record.id
              ),
            })
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(record.id),
            })
          }}
        />
      )}
      {record.status === 'DRAFT' && isAdjustmentDialogOpen && (
        <CommSummaryAdjustmentDialog
          open={isAdjustmentDialogOpen}
          onOpenChange={setIsAdjustmentDialogOpen}
          year={record.year}
          month={record.month}
          employeeId={record.beneficiary_employee!}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_DETAIL(
                role || 'employees',
                record.id
              ),
            })
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(record.id),
            })
          }}
        />
      )}
    </div>
  )
}
