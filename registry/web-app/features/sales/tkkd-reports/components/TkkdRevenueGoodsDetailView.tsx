import { Fragment, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Table as RadixTable } from '@radix-ui/themes'
import PageTitle from '@/components/ui/page-title/PageTitle'
import { Button } from '@/components/ui/button'
import { LoadingWrapper } from '@/components'
import { IconCaretright } from '@/assets/icons'
import { useApiQuery } from '@/hooks/useApiQuery'
import { QUERY_KEYS } from '@/constants'
import DealSalesParticipantsPanel from '@/features/sales/deals/components/DealSalesParticipantsPanel'
import type {
  TkkdDealsForUnitParams,
  TkkdDealsForUnitResponse,
  TkkdDealsForUnitRow,
} from '@/features/sales/tkkd-reports/services/tkkd-report-service'
import type { TkkdRevenueGoodsReportConfig } from '@/features/sales/tkkd-reports/constants'
import { formatCurrencyVND, formatNumber, parsePositiveInt } from '@/utils/common'

const QUANTITY_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

type TkkdRevenueGoodsDetailViewProps = {
  config: TkkdRevenueGoodsReportConfig
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-content-dark-3 text-xs">{label}</span>
      <span className="text-content-dark-1 font-semibold">{value}</span>
    </div>
  )
}

export default function TkkdRevenueGoodsDetailView({ config }: TkkdRevenueGoodsDetailViewProps) {
  const { title, dimensionLabel, dimension, fetchDeals } = config
  const isProject = dimension === 'project'
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const unit = parsePositiveInt(id ?? null)
  const year = parsePositiveInt(searchParams.get('year'))
  const month = parsePositiveInt(searchParams.get('month'))
  const branch = parsePositiveInt(searchParams.get('branch')) || undefined

  const params = useMemo<TkkdDealsForUnitParams | undefined>(() => {
    if (!unit || !year || !month) return undefined
    return { unit, year, month, ...(branch ? { branch } : {}) } as TkkdDealsForUnitParams
  }, [unit, year, month, branch])

  const { data, isLoading, error } = useApiQuery<TkkdDealsForUnitResponse>(
    QUERY_KEYS.SALES.TKKD_REPORTS.DEALS_FOR_UNIT(
      dimension,
      (params ?? {}) as Record<string, unknown>
    ),
    () => fetchDeals(params!) as Promise<TkkdDealsForUnitResponse>,
    { enabled: !!params, staleTime: 1000 * 60 * 5 }
  )

  const rows = data?.rows ?? []
  const summary = data?.summary
  const periodLabel = year && month ? `${String(month).padStart(2, '0')}/${year}` : ''

  const toggle = (dealId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(dealId)) next.delete(dealId)
      else next.add(dealId)
      return next
    })
  }

  const summaryName =
    summary?.code && summary?.name ? `${summary.name} • ${summary.code}` : summary?.name

  const belongsToUnit = (p: {
    project_id?: number | null
    branch_id?: number | null
    block_id?: number | null
    department_id?: number | null
  }) => {
    if (unit == null) return false
    if (dimension === 'project') return p.project_id === unit
    if (dimension === 'branch') return p.branch_id === unit
    if (dimension === 'block') return p.block_id === unit
    return p.department_id === unit
  }

  return (
    <div className="bg-neutral-2 flex h-full flex-col">
      <PageTitle
        title={`${title} — Chi tiết ${periodLabel ? `(kỳ ${periodLabel})` : ''}`}
        toolbarLeftContent={
          <Button variant="secondary-border" size="small" onClick={() => navigate(-1)}>
            ← Quay lại
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {error ? (
          <div className="border-border-1 bg-content-light-1 flex flex-1 items-center justify-center rounded-md border p-6 text-red-500">
            Có lỗi xảy ra khi tải dữ liệu: {(error as Error)?.message || 'Unknown error'}
          </div>
        ) : (
          <LoadingWrapper isLoading={isLoading} containerHeight={300}>
            {/* Summary — the unit's own row from the list report, shown as proof context */}
            {summary && (
              <div className="border-border-1 bg-content-light-1 mb-4 rounded-md border p-4">
                <div className="text-content-dark-3 mb-3 text-sm">
                  Đang xem chi tiết theo <span className="font-medium">{dimensionLabel}</span>:{' '}
                  <span className="text-content-dark-1 font-semibold">{summaryName}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <SummaryItem
                    label={isProject ? 'Số lượng (deal)' : 'Số lượng'}
                    value={
                      isProject
                        ? formatNumber(Number(summary.quantity))
                        : formatNumber(Number(summary.quantity), QUANTITY_FORMAT)
                    }
                  />
                  {summary.quantity_weighted != null && (
                    <SummaryItem
                      label="Số lượng quy đổi"
                      value={formatNumber(Number(summary.quantity_weighted), QUANTITY_FORMAT)}
                    />
                  )}
                  <SummaryItem
                    label="Doanh thu"
                    value={formatCurrencyVND(Number(summary.revenue))}
                  />
                  <SummaryItem
                    label="Tiền hàng"
                    value={formatCurrencyVND(Number(summary.goods_value))}
                  />
                  <SummaryItem
                    label="Đối chiếu"
                    value={formatCurrencyVND(Number(summary.reconciliation))}
                  />
                  <SummaryItem
                    label="Còn lại"
                    value={formatCurrencyVND(Number(summary.remaining))}
                  />
                </div>
              </div>
            )}

            <p className="text-content-dark-3 mb-3 text-sm">
              Danh sách giao dịch cấu thành số liệu trên. Bấm để xem đối tượng tham gia + tỉ lệ &
              hoa hồng của từng giao dịch.{' '}
              <span className="text-action-primary-red-default">●</span> = đối tượng thuộc{' '}
              {dimensionLabel.toLowerCase()} đang xem.
            </p>
            <RadixTable.Root size="2" variant="surface">
              <RadixTable.Header>
                <RadixTable.Row>
                  <RadixTable.ColumnHeaderCell className="w-10" />
                  <RadixTable.ColumnHeaderCell className="w-16">STT</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Mã GD</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Dự án</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell>Mã căn</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell align="right">Số lượng</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell align="right">Doanh thu</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell align="right">Tiền hàng</RadixTable.ColumnHeaderCell>
                  <RadixTable.ColumnHeaderCell align="right">
                    Chưa ghi nhận
                  </RadixTable.ColumnHeaderCell>
                </RadixTable.Row>
              </RadixTable.Header>
              <RadixTable.Body>
                {rows.length === 0 ? (
                  <RadixTable.Row>
                    <RadixTable.Cell colSpan={9}>
                      <p className="text-content-dark-3 py-6 text-center text-sm">
                        Không có dữ liệu
                      </p>
                    </RadixTable.Cell>
                  </RadixTable.Row>
                ) : (
                  <>
                    {rows.map((row: TkkdDealsForUnitRow, index: number) => {
                      const hasUnrecognized = (row.unrecognized_lines?.length ?? 0) > 0
                      const isOpen = expanded.has(row.deal_id)
                      return (
                        <Fragment key={row.deal_id}>
                          <RadixTable.Row
                            onClick={() => toggle(row.deal_id)}
                            className="hover:bg-neutral-3 cursor-pointer"
                          >
                            <RadixTable.Cell>
                              <IconCaretright
                                size={14}
                                className={`text-content-dark-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              />
                            </RadixTable.Cell>
                            <RadixTable.Cell className="text-content-dark-3">
                              {index + 1}
                            </RadixTable.Cell>
                            <RadixTable.Cell className="font-medium">{row.code}</RadixTable.Cell>
                            <RadixTable.Cell title={row.project_name ?? ''}>
                              {row.project_name}
                            </RadixTable.Cell>
                            <RadixTable.Cell>{row.unit_number}</RadixTable.Cell>
                            <RadixTable.Cell align="right" className="">
                              {formatNumber(Number(row.quantity), QUANTITY_FORMAT)}
                            </RadixTable.Cell>
                            <RadixTable.Cell align="right" className="">
                              {formatCurrencyVND(Number(row.revenue))}
                            </RadixTable.Cell>
                            <RadixTable.Cell align="right" className="">
                              {formatCurrencyVND(Number(row.goods_value))}
                            </RadixTable.Cell>
                            <RadixTable.Cell align="right" className="">
                              {formatNumber(Number(row.unrecognized_quantity), QUANTITY_FORMAT)}
                            </RadixTable.Cell>
                          </RadixTable.Row>
                          {isOpen && (
                            <RadixTable.Row className="bg-neutral-2">
                              <RadixTable.Cell colSpan={9} className="px-6 py-2">
                                <DealSalesParticipantsPanel
                                  dealId={row.deal_id}
                                  highlightMatch={belongsToUnit}
                                />
                                {hasUnrecognized && (
                                  <div className="border-border-1/50 mt-2 border-t pt-2">
                                    <p className="text-content-dark-3 mb-1 text-xs font-medium">
                                      Phần tham gia chưa ghi nhận doanh thu (lý do deal đếm &lt; 1):
                                    </p>
                                    <ul className="text-content-dark-3 space-y-0.5 text-sm">
                                      {row.unrecognized_lines?.map((line, i) => (
                                        <li key={i}>
                                          ↳ {line.name} —{' '}
                                          {formatNumber(
                                            Number(line.participation_percentage),
                                            QUANTITY_FORMAT
                                          )}
                                          %{' '}
                                          <span className="text-content-dark-4 text-xs">
                                            ({line.reason})
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </RadixTable.Cell>
                            </RadixTable.Row>
                          )}
                        </Fragment>
                      )
                    })}
                  </>
                )}
              </RadixTable.Body>
            </RadixTable.Root>
          </LoadingWrapper>
        )}
      </div>
    </div>
  )
}
