import { useState, useMemo } from 'react'
import { Flex, Table } from '@radix-ui/themes'
import { ChevronDown } from 'lucide-react'
import { Text, Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import { formatDate } from '@/utils/date-utils'
import { IconFile, IconDownloadsimple } from '@/assets/icons'
import { formatFileSize } from '@/features/project/project-documents/helpers'
import { renderTbcValueCell } from './renderTbcValueCell'
import { useExchanges } from '@/services/realestate-service'
import { formatPercent, formatCurrencyVND } from '@/utils/common'

/**
 * BE chưa lưu người duyệt cấu hình TBC: `TimeBoundCommission` kế thừa `BaseModel` vốn chỉ có
 * `created_at` / `updated_at` — không có `approved_by`, cũng không có `created_by`. Vì vậy ô này
 * hiển thị gạch ngang cho tới khi BE bổ sung trường thật.
 *
 * Trước đây chỗ này in một tên người cố định lấy từ `tbc-mock-data.ts`. Trên màn quyết định hoa
 * hồng, một cái tên bịa trông y như thật nguy hiểm hơn hẳn ô để trống — người đọc tin đó là
 * người duyệt có thật. Đừng đưa giá trị giả vào lại đây.
 *
 * ClickUp 86exm4ud9: BE đã có `approved_by` + `approved_by_name`, nên ô này in tên thật.
 * Vẫn giữ gạch ngang khi BE trả null — cấu hình chưa ai duyệt, và bản ghi có từ trước
 * migration cũng cố tình để trống vì không ai thật sự ký vào chúng.
 */
const APPROVER_PLACEHOLDER = '—'

export type CurrentTbcConfigCardPeriod = {
  __version: string
  record: any
}

type CurrentTbcConfigCardProps = {
  current: CurrentTbcConfigCardPeriod | null
}

const CurrentTbcConfigCard = ({ current }: CurrentTbcConfigCardProps) => {
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(true)
  const { data: exchangesData } = useExchanges({ page_size: 1000 })

  const f2Rates = useMemo(() => {
    if (!current?.record || !current.record.f2_rates_by_exchange) return []
    try {
      const obj = current.record.f2_rates_by_exchange as Record<string, any>
      const exchangesMap = new Map<number, string>()
      exchangesData?.results?.forEach((ex) => {
        if (ex.id) exchangesMap.set(ex.id, ex.name || '')
      })

      return Object.entries(obj).map(([exchangeId, val]) => {
        const idNum = Number(exchangeId)
        const name = exchangesMap.get(idNum) || `Sàn F2 #${exchangeId}`
        const commStr =
          val.pct_f2_commission != null
            ? `${formatPercent(parseFloat(val.pct_f2_commission))}`
            : val.amt_f2_commission != null
              ? `${formatCurrencyVND(parseFloat(val.amt_f2_commission))} VNĐ`
              : '—'
        const bonusStr =
          val.pct_f2_bonus != null
            ? `${formatPercent(parseFloat(val.pct_f2_bonus))}`
            : val.amt_f2_bonus != null
              ? `${formatCurrencyVND(parseFloat(val.amt_f2_bonus))} VNĐ`
              : '—'
        return {
          exchangeId,
          exchangeName: name,
          commStr,
          bonusStr,
        }
      })
    } catch {
      return []
    }
  }, [current?.record, exchangesData])

  const attachments = useMemo(() => {
    return (current?.record as any)?.attachments || []
  }, [current?.record])

  if (!current) {
    return (
      <div className="border-border-1 rounded-md border bg-white p-5">
        <Text className="text-content-dark-3 italic">Chưa có cấu hình nào được áp dụng</Text>
      </div>
    )
  }

  const { record } = current
  const effectiveFrom = record.effective_from ? formatDate(record.effective_from) : '—'
  const effectiveTo = record.effective_to ? formatDate(record.effective_to) : 'đến nay'

  return (
    <div className="border-border-1 overflow-hidden rounded-md border bg-white">
      {/* Header row: title • version • effective range • approver • Đang áp dụng pill */}
      <Flex justify="between" align="center" gap="4" className="border-border-1 border-b px-5 py-4">
        <Flex gap="2" align="baseline" wrap="wrap">
          <Text className="typo-body-base-semibold text-content-dark-1">Cấu hình đang áp dụng</Text>
          <Text className="typo-body-base-medium text-content-dark-3">{current.__version}</Text>
          <Text className="text-content-dark-4">•</Text>
          <Text className="typo-body-base-regular text-content-dark-3">
            Áp dụng từ <span className="text-content-dark-1 font-medium">{effectiveFrom}</span> —{' '}
            <span className="text-content-dark-1 font-medium">{effectiveTo}</span>
          </Text>
          <Text className="text-content-dark-4">•</Text>
          <Text className="typo-body-base-regular text-content-dark-3">
            Người duyệt{' '}
            <span className="text-content-dark-1 font-medium">
              {current.record?.approved_by_name || APPROVER_PLACEHOLDER}
            </span>
          </Text>
        </Flex>
        <Chip
          variant={ColoredValueVariant.GREEN}
          size="small"
          label="Đang áp dụng"
          showDot
          type="outlined"
        />
      </Flex>

      {/* Single-row grouped table */}
      <div className="overflow-x-auto">
        <Table.Root variant="surface" className="tbc-current-card-table table-no-radius w-full">
          <Table.Header>
            <Table.Row className="bg-background-2">
              <Table.ColumnHeaderCell
                colSpan={3}
                className="border-border-1 text-content-dark-1 !border-b-data-blue-default bg-background-2 border-r border-b-2 px-4 py-3 text-center align-middle font-medium"
              >
                <span className={'typo-body-sm-semibold'}>Chủ đầu tư trả MV</span>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell
                colSpan={3}
                className="border-border-1 text-content-dark-1 !border-b-data-red-default bg-background-2 border-r border-b-2 px-4 py-3 text-center align-middle font-medium"
              >
                <span className={'typo-body-sm-semibold'}>Chia cho Sale</span>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell
                rowSpan={2}
                className="border-border-1 text-content-dark-1 !border-b-data-green-default bg-background-2 border-r border-b-2 px-4 py-3 font-medium"
              >
                <div className="typo-body-sm-semibold flex h-full w-full items-center justify-center text-center">
                  Tỉ lệ doanh thu
                </div>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell
                rowSpan={2}
                className="border-border-1 text-content-dark-1 !border-b-data-green-default bg-background-2 border-r border-b-2 px-4 py-3 font-medium"
              >
                <div className="typo-body-sm-semibold flex h-full w-full items-center justify-center text-center">
                  Doanh thu KPI Sàn liên kết
                </div>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell
                rowSpan={2}
                className="border-border-1 text-content-dark-1 bg-background-2 px-4 py-3 font-medium"
              >
                <div className="typo-body-sm-semibold flex h-full w-full items-center justify-center text-center">
                  Ghi chú
                </div>
              </Table.ColumnHeaderCell>
            </Table.Row>
            <Table.Row className="bg-background-2">
              <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                <span className={'typo-body-sm-medium'}>Phí đại lý</span>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                <span className={'typo-body-sm-medium'}>Phí đại lý tăng thêm</span>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                <span className={'typo-body-sm-medium'}>Thưởng đại lý</span>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                <span className={'typo-body-sm-medium'}>HH</span>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                <span className={'typo-body-sm-medium'}>Thưởng</span>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="border-border-1 text-content-dark-3 bg-background-2 border-r px-4 py-3 text-center align-middle font-medium">
                <span className={'typo-body-sm-medium'}>Thưởng MV</span>
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body className="bg-white">
            <Table.Row>
              {/* Chủ đầu tư trả MV */}
              {renderTbcValueCell(record, 'agency_fee')}
              {renderTbcValueCell(record, 'investor_bonus')}
              {renderTbcValueCell(record, 'shared_bonus')}
              {/* Chia cho Sale — HH = sale_commission, Thưởng = investor_bonus_to_sale,
                  Thưởng MV = staff_incentive (MVL tự chi, chỉ có số tiền) */}
              {renderTbcValueCell(record, 'sale_commission')}
              {renderTbcValueCell(record, 'investor_bonus_to_sale')}
              {renderTbcValueCell(record, 'staff_incentive')}
              {/* Tỉ lệ doanh thu */}
              {renderTbcValueCell(record, 'revenue')}
              {/* Doanh thu KPI Sàn liên kết */}
              {renderTbcValueCell(record, 'kpi_revenue_slk')}
              <Table.Cell className="border-border-1 text-content-dark-1 typo-body-base-regular px-4 py-4 align-middle">
                {record.note || '—'}
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </div>

      {/* Cấu hình Phí sàn liên kết (F2) */}
      {f2Rates.length > 0 && (
        <div className="border-border-1 border-t p-5">
          <div className="mb-3">
            <Text className="typo-body-base-semibold text-content-dark-1">
              Cấu hình Phí sàn liên kết (F2)
            </Text>
          </div>
          <div className="border-border-1 overflow-hidden rounded-md border">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-border-1 text-content-dark-3 border-b bg-[#FAFAFA] font-semibold">
                  <th className="px-4 py-3 text-sm font-semibold">Đối tác sàn</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Phí hoa hồng F2</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Thưởng F2</th>
                </tr>
              </thead>
              <tbody>
                {f2Rates.map((f2, idx) => (
                  <tr
                    key={idx}
                    className="border-border-1 border-b bg-white last:border-0 hover:bg-neutral-50/50"
                  >
                    <td className="text-content-dark-1 px-4 py-3 text-sm font-medium">
                      {f2.exchangeName}
                    </td>
                    <td className="text-content-dark-1 px-4 py-3 text-right text-sm font-bold">
                      {f2.commStr}
                    </td>
                    <td className="text-content-dark-1 px-4 py-3 text-right text-sm font-bold">
                      {f2.bonusStr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tài liệu đính kèm thực tế */}
      {attachments.length > 0 && (
        <div className="border-border-1 border-t px-5 py-4">
          <button
            type="button"
            onClick={() => setIsAttachmentsOpen((open) => !open)}
            aria-expanded={isAttachmentsOpen}
            className="hover:bg-background-2 -mx-2 flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors"
          >
            <Text className="typo-body-sm-medium text-content-dark-3">Thông tin bổ sung</Text>
            <Text className="typo-body-sm-medium text-content-dark-1">
              {attachments.length} tài liệu
            </Text>
            <ChevronDown
              size={16}
              className={`text-content-dark-3 ml-auto transition-transform ${
                isAttachmentsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isAttachmentsOpen && (
            <div className="mt-3">
              <Text className="typo-body-sm-medium text-content-dark-3 mb-2 block">
                Tài liệu đính kèm
              </Text>
              <Flex direction="column" gap="2" align="start">
                {attachments.map((file: any, idx: number) => {
                  const handleDownload = () => {
                    const downloadUrl = file.download_url || file.file_path
                    const link = document.createElement('a')
                    link.href = downloadUrl
                    link.download = file.file_name
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={handleDownload}
                      title={`Tải xuống ${file.file_name}`}
                      aria-label={`Tải xuống ${file.file_name}`}
                      className="border-border-1 bg-background-2 hover:bg-background-2 focus-visible:ring-action-primary-red-default group inline-flex w-fit cursor-pointer items-center gap-2 rounded border px-3 py-2 transition-colors hover:cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <IconFile size={16} className="text-content-dark-3" />
                      <Text className="typo-body-sm-medium text-content-dark-1">
                        {file.file_name}
                      </Text>
                      {file.size != null && (
                        <>
                          <Text className="text-content-dark-4">·</Text>
                          <Text className="typo-body-sm-medium text-content-dark-3">
                            {formatFileSize(file.size)}
                          </Text>
                        </>
                      )}
                      <IconDownloadsimple
                        size={16}
                        className="text-content-dark-3 group-hover:text-content-dark-1 ml-1"
                      />
                    </button>
                  )
                })}
              </Flex>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CurrentTbcConfigCard
