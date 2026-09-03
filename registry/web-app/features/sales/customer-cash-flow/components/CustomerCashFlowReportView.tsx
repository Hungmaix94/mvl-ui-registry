import { useMemo, useState } from 'react'
import { Table as RadixTable, Tooltip } from '@radix-ui/themes'
import { Info, TriangleAlert } from 'lucide-react'
import PageTitle from '@/components/ui/page-title/PageTitle'
import { Button } from '@/components/ui/button'
import { LoadingWrapper } from '@/components'
import { IconDownloadsimple } from '@/assets/icons'
import { useAbility } from '@/lib/ability'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import toastService from '@/services/toast-service'
import {
  CASH_FLOW_CUSTODY_ROWS,
  CASH_FLOW_EMPHASIS_ROWS,
  CASH_FLOW_ROW_ORDER,
  getCustomerCashFlowService,
  useCustomerCashFlow,
  type CustomerCashFlowParams,
} from '../services/customer-cash-flow-service'

/**
 * Báo cáo thu-chi tiền khách (18.9).
 *
 * Ba yêu cầu hiển thị KHÔNG được bỏ, vì mỗi cái vá một cách hiểu sai cụ thể:
 *  1. Dòng "Đã thu, chưa đối chiếu với CĐT" phải kèm tooltip nói rõ là TRẦN TRÊN.
 *     Hệ thống chưa từng ghi nhận khoản đã nộp về CĐT, nên gọi nó là "công nợ CĐT"
 *     là đặt tên cho một con số mà không có gì bảo chứng.
 *  2. Cột "chưa xác định" phải nổi bật khi > 0 — dev đã có 41 phiếu đặt chỗ rơi vào
 *     đây ngay từ ngày đầu, không phải chỉ dữ liệu cũ.
 *  3. Khối chất lượng dữ liệu phải hiện, vì các kỳ lịch sử đếm hai lần ở những hợp
 *     đồng cọc đã đóng trước khi tính năng này ra đời.
 */

const SUMMARY_KEY = 'summary'

type Props = {
  params?: CustomerCashFlowParams
  onOpenDetail?: (unitName: string, rowKey: string) => void
}

export const CustomerCashFlowReportView = ({ params, onOpenDetail }: Props) => {
  const ability = useAbility()
  const [isExporting, setIsExporting] = useState(false)
  const { data, isLoading, error } = useCustomerCashFlow(params)

  const canExport = ability.can('get', 'reports.customercashflow')

  const weeks = data?.weeks ?? []
  const labels = data?.row_labels ?? {}

  const unitNames = useMemo(
    () => Object.keys(data?.data ?? {}).filter((name) => name !== SUMMARY_KEY),
    [data]
  )

  const handleExport = async () => {
    if (!params) return
    try {
      setIsExporting(true)
      await getCustomerCashFlowService().exportPivot(params)
    } catch {
      toastService.error('Không xuất được Excel')
    } finally {
      setIsExporting(false)
    }
  }

  const colSpan = weeks.length + 2

  const renderRows = (unitName: string) => {
    const rows = data?.data?.[unitName] ?? {}
    return CASH_FLOW_ROW_ORDER.map((rowKey) => {
      const cells = rows[rowKey] ?? {}
      const isCustody = CASH_FLOW_CUSTODY_ROWS.includes(rowKey)
      const isEmphasis = CASH_FLOW_EMPHASIS_ROWS.includes(rowKey)
      const isClosing = rowKey === 'not_reconciled_with_investor'
      const total = Number(cells.total ?? 0)

      return (
        <RadixTable.Row key={`${unitName}-${rowKey}`}>
          <RadixTable.Cell
            className={[
              isCustody ? 'pl-8 text-content-dark-3' : '',
              isEmphasis ? 'font-semibold' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="inline-flex items-center gap-1">
              {labels[rowKey] ?? rowKey}
              {isClosing && (
                <Tooltip content="Đây là trần trên. Hệ thống chưa theo dõi khoản đã nộp về Chủ đầu tư, nên số này chưa trừ phần đó.">
                  <Info size={14} className="text-content-dark-3" />
                </Tooltip>
              )}
            </span>
          </RadixTable.Cell>
          {weeks.map((week) => (
            <RadixTable.Cell key={week.index} align="right">
              {formatCurrencyVND(Number(cells[String(week.index)] ?? 0))}
            </RadixTable.Cell>
          ))}
          <RadixTable.Cell
            align="right"
            className={isEmphasis ? 'font-bold' : 'font-semibold'}
            onClick={() => onOpenDetail?.(unitName, rowKey)}
          >
            {formatCurrencyVND(total)}
          </RadixTable.Cell>
        </RadixTable.Row>
      )
    })
  }

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Thu - Chi tiền khách"
        customActions={
          canExport ? (
            <Button
              variant="secondary-border"
              size="small"
              onClick={handleExport}
              disabled={isExporting || isLoading || !params}
            >
              <span className="flex items-center gap-2">
                <IconDownloadsimple size={16} />
                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
              </span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
        {error ? (
          <div className="border-border-1 bg-content-light-1 flex flex-1 items-center justify-center rounded-md border p-6 text-red-500">
            Có lỗi xảy ra khi tải dữ liệu: {(error as Error)?.message || 'Unknown error'}
          </div>
        ) : (
          <>
            {/* Hai con số vận hành, cố ý đặt TRÊN bảng: chúng là thứ người dùng
                phải hành động, còn pivot là thứ để tra cứu. */}
            <div className="flex flex-wrap gap-4">
              <div className="border-border-1 bg-content-light-1 min-w-64 flex-1 rounded-md border p-4">
                <p className="text-content-dark-3 text-xs">Đã duyệt hoàn, CHƯA chi</p>
                <p className="typo-body-large-semibold text-content-dark-1">
                  {formatCurrencyVND(Number(data?.pending_payment?.amount ?? 0))}
                </p>
                <p className="text-content-dark-3 text-xs">
                  {(data?.pending_payment?.booking_refund_count ?? 0) +
                    (data?.pending_payment?.deposit_refund_count ?? 0)}{' '}
                  phiếu — tiền công ty đã cam kết trả mà chưa trả
                </p>
              </div>

              {Number(data?.data_quality?.deposits_missing_booking_credit ?? 0) > 0 && (
                <div className="min-w-64 flex-1 rounded-md border border-amber-300 bg-amber-50 p-4">
                  <p className="flex items-center gap-1 text-xs text-amber-800">
                    <TriangleAlert size={14} /> Chất lượng dữ liệu
                  </p>
                  <p className="typo-body-large-semibold text-amber-900">
                    {data?.data_quality?.deposits_missing_booking_credit} hợp đồng cọc
                  </p>
                  <p className="text-xs text-amber-800">
                    Đã đóng trước khi có tính năng này nên mất dấu tiền đặt chỗ — các kỳ lịch sử có
                    thể đếm hai lần (
                    {formatCurrencyVND(
                      Number(data?.data_quality?.deposits_missing_booking_credit_amount ?? 0)
                    )}
                    ). Từ ngày triển khai trở đi con số đúng.
                  </p>
                </div>
              )}
            </div>

            <LoadingWrapper isLoading={isLoading} containerHeight={300}>
              <RadixTable.Root size="2" variant="surface">
                <RadixTable.Header>
                  <RadixTable.Row>
                    <RadixTable.ColumnHeaderCell>Chỉ tiêu</RadixTable.ColumnHeaderCell>
                    {weeks.map((week) => (
                      <RadixTable.ColumnHeaderCell
                        key={week.index}
                        align="right"
                        title={`${formatDate(week.week_start)} – ${formatDate(week.week_end)}`}
                      >
                        Tuần {week.index}
                      </RadixTable.ColumnHeaderCell>
                    ))}
                    <RadixTable.ColumnHeaderCell align="right">Cộng</RadixTable.ColumnHeaderCell>
                  </RadixTable.Row>
                </RadixTable.Header>
                <RadixTable.Body>
                  {unitNames.length === 0 ? (
                    <RadixTable.Row>
                      <RadixTable.Cell colSpan={colSpan}>
                        <p className="text-content-dark-3 py-6 text-center text-sm">
                          Không có dữ liệu
                        </p>
                      </RadixTable.Cell>
                    </RadixTable.Row>
                  ) : (
                    <>
                      {unitNames.map((unitName) => (
                        <>
                          <RadixTable.Row key={`${unitName}-head`} className="bg-neutral-10">
                            <RadixTable.Cell colSpan={colSpan} className="font-bold">
                              {unitName}
                            </RadixTable.Cell>
                          </RadixTable.Row>
                          {renderRows(unitName)}
                        </>
                      ))}
                      {data?.data?.[SUMMARY_KEY] && (
                        <>
                          <RadixTable.Row className="bg-neutral-10 border-neutral-60 border-t border-double">
                            <RadixTable.Cell colSpan={colSpan} className="font-bold">
                              Tổng cộng
                            </RadixTable.Cell>
                          </RadixTable.Row>
                          {renderRows(SUMMARY_KEY)}
                        </>
                      )}
                    </>
                  )}
                </RadixTable.Body>
              </RadixTable.Root>
            </LoadingWrapper>
          </>
        )}
      </div>
    </div>
  )
}

export default CustomerCashFlowReportView
