import { FC, useMemo } from 'react'
import { Flex, Box, Text } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { Chip, Button } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import AppDialog from '@/components/dialog/AppDialog'
import { formatCurrencyVND, formatPercent, formatRatePct, formatNumber } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import {
  resolveRateTriple,
  formatRateSpecEquivalent,
  formatRateSpecFraction,
  type RateSpecRequest,
} from '@/utils/rate-spec'
import toastService from '@/services/toast-service'
import { ArrowRight, FileText, AlertTriangle, Copy } from 'lucide-react'
import { formatFileSize } from '@/features/project/project-documents/helpers'
import { getLadEventTitle, buildLadDetailPath } from '../utils/lad-event'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

interface LadDetailModalProps {
  ladId: number
  dealId: number
  onClose: () => void
  configList: any[]
  dealPrice: number
}

interface KindMeta {
  label: string
  tone: ColoredValueVariant
}

const KIND_METAS: Record<string, KindMeta> = {
  creation: { label: 'Áp dụng mới', tone: ColoredValueVariant.GREY },
  bulk_retro: { label: 'Hồi tố', tone: ColoredValueVariant.ORANGE },
  reconciliation: { label: 'Đối chiếu', tone: ColoredValueVariant.GREEN },
  manual: { label: 'Sửa đổi', tone: ColoredValueVariant.YELLOW },
}

interface TrackMeta {
  label: string
  tone: ColoredValueVariant
}

const TRACK_METAS: Record<string, TrackMeta> = {
  mv: { label: 'MV nội bộ', tone: ColoredValueVariant.RED },
  cdt: { label: 'CĐT đã xác nhận', tone: ColoredValueVariant.GREEN },
  both: { label: 'Áp cả 2 phía', tone: ColoredValueVariant.GREY },
}

const ROLE_LABELS: Record<string, string> = {
  ceo: 'Tổng Giám đốc',
  deputy_ceo: 'Phó Tổng Giám đốc',
  project_director: 'Giám đốc Dự án',
  sales_director: 'Giám đốc Kinh doanh',
  sales_manager: 'Trưởng phòng Kinh doanh',
  head_sales_secretary: 'Trưởng phòng Thư ký Kinh doanh',
  project_secretary: 'Thư ký Dự án',
}

const CATEGORY_LABELS: Record<string, string> = {
  agency_fee: 'Thưởng quản lý',
  project_bonus: 'Thưởng Dự án',
  investor_bonus: 'Thưởng quản lý từ CDT',
  mv_bonus: 'Thưởng quản lý bổ sung',
}

export const LadDetailModal: FC<LadDetailModalProps> = ({
  ladId,
  onClose,
  configList,
  dealPrice,
}) => {
  const { keysMap: realestateKeysMap } = useAppConstant({
    module: 'realestate',
    keys: [
      APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_CATEGORY_LABELS,
      APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_ROLE_LABELS,
    ],
  })

  const mgmtCategoryLabels = realestateKeysMap.get(
    APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_CATEGORY_LABELS
  ) as Record<string, string> | undefined

  const mgmtRoleLabels = realestateKeysMap.get(
    APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_ROLE_LABELS
  ) as Record<string, string> | undefined
  // Find current config version
  const config = useMemo(() => {
    return configList.find((c) => c.id === ladId)
  }, [configList, ladId])

  // Find previous config version to show comparisons
  const prevConfig = useMemo(() => {
    if (!config) return null
    const sortedAsc = [...configList].sort(
      (a: any, b: any) => (a.version_number || 0) - (b.version_number || 0)
    )
    const idx = sortedAsc.findIndex((c) => c.id === ladId)
    return idx > 0 ? sortedAsc[idx - 1] : null
  }, [configList, config, ladId])

  // Map each config item to its preceding rate value to calculate delta
  const deltaData = useMemo(() => {
    if (!config) return { fee_from: null, fee_to: 0, delta_pct: 0 }
    const sortedAsc = [...configList].sort(
      (a: any, b: any) => (a.version_number || 0) - (b.version_number || 0)
    )
    const idx = sortedAsc.findIndex((c) => c.id === ladId)
    const currentVal = parseFloat(config.pct_agency_fee || '0')
    const prevVal = idx > 0 ? parseFloat(sortedAsc[idx - 1].pct_agency_fee || '0') : null
    return {
      fee_from: prevVal,
      fee_to: currentVal,
      delta_pct: prevVal !== null ? currentVal - prevVal : 0,
    }
  }, [configList, config, ladId])

  const rateRows = useMemo(() => {
    if (!config) return []

    const rows = [
      {
        label: 'Phí đại lý (Agency Fee)',
        prevPct: prevConfig?.pct_agency_fee,
        prevAmt: prevConfig?.amt_agency_fee,
        currPct: config.pct_agency_fee,
        currAmt: config.amt_agency_fee,
      },
      {
        label: 'Phí đại lý tăng thêm (Additional Agency Fee)',
        prevPct: prevConfig?.pct_investor_bonus,
        prevAmt: prevConfig?.amt_investor_bonus,
        currPct: config.pct_investor_bonus,
        currAmt: config.amt_investor_bonus,
      },
      {
        label: 'Tỉ lệ doanh thu',
        prevPct: prevConfig?.pct_revenue,
        prevAmt: prevConfig?.amt_revenue,
        currPct: config.pct_revenue,
        currAmt: config.amt_revenue,
      },
      {
        label: 'Hoa hồng sale (Sale Commission)',
        prevPct: prevConfig?.pct_sale_commission,
        prevAmt: prevConfig?.amt_sale_commission,
        currPct: config.pct_sale_commission,
        currAmt: config.amt_sale_commission,
      },
      {
        label: 'Thưởng cho sale',
        prevPct: prevConfig?.pct_investor_bonus_to_sale,
        prevAmt: prevConfig?.amt_investor_bonus_to_sale,
        currPct: config.pct_investor_bonus_to_sale,
        currAmt: config.amt_investor_bonus_to_sale,
      },
      {
        label: 'Thưởng đại lý (Agency Reward)',
        prevPct: prevConfig?.pct_shared_bonus,
        prevAmt: prevConfig?.amt_shared_bonus,
        currPct: config.pct_shared_bonus,
        currAmt: config.amt_shared_bonus,
      },
    ]

    return rows.filter(
      (r) => r.currPct != null || r.currAmt != null || r.prevPct != null || r.prevAmt != null
    )
  }, [config, prevConfig])

  const f2Rates = useMemo(() => {
    if (!config || !config.f2_rates_by_exchange) return []
    try {
      const obj = config.f2_rates_by_exchange as Record<string, any>
      return Object.entries(obj).map(([exchangeId, val]) => {
        return {
          exchangeId,
          exchangeName: `Sàn F2 #${exchangeId}`,
          // RateSpec (phân số / % trực tiếp) — nguồn sự thật, XOR với cache pct/amt phẳng.
          pct_f2_commission_spec: val.pct_f2_commission_spec,
          pct_f2_commission: val.pct_f2_commission,
          amt_f2_commission: val.amt_f2_commission,
          pct_f2_bonus: val.pct_f2_bonus,
          amt_f2_bonus: val.amt_f2_bonus,
        }
      })
    } catch {
      return []
    }
  }, [config])

  const attachments = useMemo(() => {
    return (config as any).attachments || []
  }, [config])

  const formatVal = (pct: string | null | undefined, amt: string | null | undefined) => {
    if (pct != null) return `${formatPercent(parseFloat(pct))}`
    if (amt != null) return `${formatCurrencyVND(parseFloat(amt))} VNĐ`
    return '—'
  }

  /**
   * Hoa hồng F2 (read-only): ưu tiên RateSpec (phân số / % trực tiếp) → khi cấu hình kiểu phân số
   * thì giữ "x / y của z" làm chính, % (hoặc đ) dẫn xuất hiện mờ "≈ …" bên dưới; nếu không có spec
   * thì rơi về cache pct/amt phẳng như cũ. Mirror LadImpactTable / LadConfigSnapshotTable.
   */
  const renderF2Commission = (
    spec: RateSpecRequest | null | undefined,
    pct: string | null | undefined,
    amt: string | null | undefined
  ) => {
    const fraction = formatRateSpecFraction(spec)
    if (!fraction) {
      const pair = resolveRateTriple(spec, pct, amt)
      return pair.pct != null
        ? formatRatePct(pair.pct)
        : pair.amt != null
          ? `${formatCurrencyVND(pair.amt)} đ`
          : '—'
    }
    const equivalent = formatRateSpecEquivalent(spec)
    return (
      <span className="flex flex-col items-end">
        <span>{fraction}</span>
        {equivalent && (
          <span className="text-content-dark-3 text-xs font-normal">≈ {equivalent}</span>
        )}
      </span>
    )
  }

  const getDeltaCell = (
    prevPct: string | null | undefined,
    prevAmt: string | null | undefined,
    currPct: string | null | undefined,
    currAmt: string | null | undefined
  ) => {
    const prevVal =
      prevPct != null ? parseFloat(prevPct) : prevAmt != null ? parseFloat(prevAmt) : null
    const currVal =
      currPct != null ? parseFloat(currPct) : currAmt != null ? parseFloat(currAmt) : null

    if (prevVal === null && currVal !== null) {
      return (
        <span className="text-data-blue-default bg-data-blue-disabled rounded-full px-2 py-0.5 text-[10px] font-bold">
          MỚI
        </span>
      )
    }
    if (prevVal !== null && currVal === null) {
      return (
        <span className="text-content-dark-3 bg-data-light-grey-disabled rounded-full px-2 py-0.5 text-[10px] font-bold">
          XÓA
        </span>
      )
    }
    if (prevVal !== null && currVal !== null) {
      const isPct = currPct != null
      const diff = currVal - prevVal
      if (diff === 0) return <span className="text-content-dark-3">—</span>
      const diffStr = isPct
        ? `${diff >= 0 ? '+' : ''}${formatNumber(diff, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
        : `${diff >= 0 ? '+' : ''}${formatCurrencyVND(diff)} VNĐ`
      return (
        <span
          className={
            diff > 0
              ? 'text-data-green-default font-semibold'
              : 'text-data-red-default font-semibold'
          }
        >
          {diffStr}
        </span>
      )
    }
    return <span className="text-content-dark-3">—</span>
  }

  if (!config) return null

  const track =
    config.source === 'creation' ? 'both' : config.source === 'reconciliation' ? 'cdt' : 'mv'
  const km = KIND_METAS[config.source] || { label: config.source, tone: ColoredValueVariant.GREY }
  const tm = TRACK_METAS[track]
  const isPendingMv = track === 'mv'

  const eventTitle = getLadEventTitle(config)
  const ladPath = buildLadDetailPath(config)
  // Lô chưa đặt tên ⇒ tiêu đề đã mượn chính lý do; đừng lặp lại nó ở dòng mô tả dưới tiêu đề
  // (khối "Lý do áp dụng" ở cuối modal vẫn luôn hiển thị đầy đủ).
  const rawReason = config.reason?.trim()
  const reasonText = rawReason && rawReason !== eventTitle ? rawReason : ''
  const scopeLabel =
    config.source === 'creation'
      ? 'Auto · áp template tại thời điểm tạo GD'
      : `LAD #${config.version_number} · 1 Giao dịch`

  const handleCopy = () => {
    const text =
      `Phiên bản LAD: #${config.version_number}\n` +
      `Mã lô: ${config.batch_code || '—'}\n` +
      `Loại lô: ${km.label}\n` +
      `Phạm vi: ${tm.label}\n` +
      // pct_agency_fee là numeric(14,10) — giữ đủ 10 chữ số thập phân, đừng cắt còn 3.
      `Phí môi giới mới: ${formatPercent(parseFloat(config.pct_agency_fee || '0'), false, 10)}\n` +
      `Lý do: ${config.reason || 'Không cung cấp lý do.'}`
    navigator.clipboard.writeText(text).then(() => {
      toastService.success('Đã sao chép thông tin lô áp dụng vào bộ nhớ tạm!')
    })
  }

  const titleNode = (
    <Flex direction="column" gap="1.5" className="w-full">
      <Flex align="center" gap="2" className="flex-wrap">
        <code className="bg-surface-secondary-default text-content-dark-2 rounded px-2 py-0.5 text-xs font-semibold">
          {config.batch_code || `LAD #${config.version_number}`}
        </code>
        <Chip label={km.label} variant={km.tone} size="small" />
        <Chip label={tm.label} variant={tm.tone} size="small" />
      </Flex>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--color-content-dark-1)',
          marginTop: 4,
        }}
      >
        {eventTitle}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-content-dark-3)', fontWeight: 400 }}>
        {scopeLabel}
      </div>
    </Flex>
  )

  const hasManagementRates = config.management_rates && config.management_rates.length > 0

  const modalContent = (
    <Flex direction="column" gap="4" className="w-full">
      {/* Rate adjustment snapshot */}
      <Box className="border-border-1 bg-surface-primary-subtle rounded-lg border p-4">
        <Text className="text-content-dark-3 text-[10px] font-bold tracking-wider uppercase">
          Biến động phí môi giới
        </Text>
        <Flex align="center" gap="3" className="mt-2 flex-wrap">
          <span
            className={`text-content-dark-2 text-base font-semibold ${
              deltaData.fee_from !== null ? 'text-content-dark-4 line-through' : ''
            }`}
          >
            {/* fee_from/fee_to đều là `pct_agency_fee` (numeric(14,10)) — giữ đủ 10 chữ số. */}
            {deltaData.fee_from !== null ? formatPercent(deltaData.fee_from, false, 10) : '—'}
          </span>
          <ArrowRight className="text-content-dark-4 h-4 w-4 shrink-0" />
          <span className="text-content-dark-1 text-lg font-bold">
            {formatPercent(deltaData.fee_to, false, 10)}
          </span>
          <span
            className={`ml-2 rounded px-2 py-1 text-xs font-bold ${
              isPendingMv
                ? 'bg-data-orange-disabled text-data-orange-default'
                : 'bg-data-green-disabled text-data-green-default'
            }`}
          >
            {deltaData.delta_pct >= 0 ? '+' : ''}
            {formatNumber(deltaData.delta_pct, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            % · {formatCurrencyVND(Math.round((dealPrice * deltaData.delta_pct) / 100))} VNĐ
          </span>
        </Flex>
      </Box>

      {/* Detail info grid */}
      <div className="border-border-1 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2.5 border-b pb-4 text-sm">
        <span className="text-content-dark-3">Áp dụng tại</span>
        <span className="text-content-dark-1 font-semibold">
          {formatDate(config.created_at, 'dd/MM/yyyy • HH:mm')}
        </span>

        <span className="text-content-dark-3">Nguồn</span>
        <span className="text-content-dark-1">
          {ladPath ? (
            <Link to={ladPath} title="Mở chi tiết lô áp dụng" className="hover:underline">
              <code className="bg-neutral-30 text-action-primary-red-default rounded px-1.5 py-0.5 text-xs font-semibold">
                {config.batch_code || config.source}
              </code>
            </Link>
          ) : (
            <code className="bg-neutral-30 text-action-primary-default rounded px-1.5 py-0.5 text-xs font-semibold">
              {config.batch_code || config.source}
            </code>
          )}
        </span>

        <span className="text-content-dark-3">Scope</span>
        <span className="text-content-dark-1 font-semibold">1 Giao dịch</span>

        <span className="text-content-dark-3">Người tạo</span>
        <span className="text-content-dark-1">Hệ thống</span>

        <span className="text-content-dark-3">Phục hồi / Ghi đè</span>
        <span>
          <Chip
            label={config.override_locked ? 'CÓ' : 'KHÔNG'}
            variant={config.override_locked ? ColoredValueVariant.BLUE : ColoredValueVariant.GREY}
            size="small"
          />
        </span>
      </div>

      {/* Detailed comparison table */}
      <Box className="border-border-1 overflow-hidden rounded-lg border">
        <div className="bg-surface-primary-subtle border-border-1 border-b px-4 py-2.5">
          <span className="text-content-dark-1 text-xs font-bold tracking-wider uppercase">
            Bảng so sánh cấu hình phí & thưởng
          </span>
        </div>
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-border-1 text-content-dark-3 border-b bg-neutral-50 font-semibold">
              <th className="px-3 py-2 font-semibold">Hạng mục</th>
              <th className="px-3 py-2 text-right font-semibold">Trước</th>
              <th className="px-3 py-2 text-right font-semibold">Sau</th>
              <th className="px-3 py-2 text-right font-semibold">Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {rateRows.map((r, idx) => (
              <tr
                key={idx}
                className="border-border-1 border-b last:border-0 hover:bg-neutral-50/50"
              >
                <td className="text-content-dark-2 px-3 py-2.5 font-medium">{r.label}</td>
                <td className="text-content-dark-3 px-3 py-2.5 text-right">
                  {formatVal(r.prevPct, r.prevAmt)}
                </td>
                <td className="text-content-dark-1 px-3 py-2.5 text-right font-semibold">
                  {formatVal(r.currPct, r.currAmt)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {getDeltaCell(r.prevPct, r.prevAmt, r.currPct, r.currAmt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      {/* Management rates table */}
      {hasManagementRates && (
        <Box className="border-border-1 overflow-hidden rounded-lg border">
          <div className="bg-surface-primary-subtle border-border-1 border-b px-4 py-2.5">
            <span className="text-content-dark-1 text-xs font-bold tracking-wider uppercase">
              Cấu hình Thưởng HH quản lý
            </span>
          </div>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-border-1 text-content-dark-3 border-b bg-neutral-50 font-semibold">
                <th className="px-3 py-2 font-semibold">Vai trò</th>
                <th className="px-3 py-2 font-semibold">Loại hoa hồng</th>
                <th className="px-3 py-2 text-right font-semibold">Giá trị</th>
                <th className="px-3 py-2 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {config.management_rates.map((mr: any, idx: number) => {
                const valStr =
                  mr.pct != null
                    ? `${formatPercent(parseFloat(mr.pct))}`
                    : mr.amt != null
                      ? `${formatCurrencyVND(parseFloat(mr.amt))} VNĐ`
                      : '—'
                return (
                  <tr
                    key={idx}
                    className="border-border-1 border-b last:border-0 hover:bg-neutral-50/50"
                  >
                    <td className="text-content-dark-1 px-3 py-2.5 font-semibold">
                      {mgmtRoleLabels?.[mr.role] || ROLE_LABELS[mr.role] || mr.role}
                    </td>
                    <td className="text-content-dark-2 px-3 py-2.5">
                      {CATEGORY_LABELS[mr.category] ||
                        mgmtCategoryLabels?.[mr.category] ||
                        mr.category}
                    </td>
                    <td className="text-content-dark-1 px-3 py-2.5 text-right font-bold">
                      {valStr}
                    </td>
                    <td className="text-content-dark-3 px-3 py-2.5 italic">{mr.note || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Box>
      )}

      {/* F2 Rates table */}
      {f2Rates.length > 0 && (
        <Box className="border-border-1 overflow-hidden rounded-lg border">
          <div className="bg-surface-primary-subtle border-border-1 border-b px-4 py-2.5">
            <span className="text-content-dark-1 text-xs font-bold tracking-wider uppercase">
              Cấu hình Phí sàn liên kết (F2)
            </span>
          </div>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-border-1 text-content-dark-3 border-b bg-neutral-50 font-semibold">
                <th className="px-3 py-2 font-semibold">Đối tác sàn</th>
                <th className="px-3 py-2 text-right font-semibold">Phí hoa hồng F2</th>
                <th className="px-3 py-2 text-right font-semibold">Thưởng F2</th>
              </tr>
            </thead>
            <tbody>
              {f2Rates.map((f2: any, idx: number) => {
                const bonusStr =
                  f2.pct_f2_bonus != null
                    ? `${formatRatePct(parseFloat(f2.pct_f2_bonus))}`
                    : f2.amt_f2_bonus != null
                      ? `${formatCurrencyVND(parseFloat(f2.amt_f2_bonus))} VNĐ`
                      : '—'
                return (
                  <tr
                    key={idx}
                    className="border-border-1 border-b last:border-0 hover:bg-neutral-50/50"
                  >
                    <td className="text-content-dark-1 px-3 py-2.5 font-semibold">
                      {f2.exchangeName}
                    </td>
                    <td className="text-content-dark-1 px-3 py-2.5 text-right font-bold">
                      {renderF2Commission(
                        f2.pct_f2_commission_spec,
                        f2.pct_f2_commission,
                        f2.amt_f2_commission
                      )}
                    </td>
                    <td className="text-content-dark-1 px-3 py-2.5 text-right font-bold">
                      {bonusStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Box>
      )}

      {/* Reason details */}
      <Flex direction="column" gap="1.5">
        <Text className="text-content-dark-3 text-[10px] font-bold tracking-wider uppercase">
          Lý do áp dụng
        </Text>
        <Box className="border-border-1 bg-surface-primary-default text-content-dark-1 rounded-lg border p-3 text-sm">
          {config.reason || 'Không cung cấp lý do.'}
        </Box>
      </Flex>

      {/* Tệp đính kèm */}
      <Flex direction="column" gap="1.5">
        <Text className="text-content-dark-3 text-[10px] font-bold tracking-wider uppercase">
          Tệp đính kèm
        </Text>
        {attachments.length > 0 ? (
          <Flex direction="column" gap="2">
            {attachments.map((file: any) => {
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
                <Flex
                  key={file.id}
                  align="center"
                  gap="2"
                  p="2"
                  className="border-border-1 cursor-pointer rounded-lg border bg-white hover:bg-neutral-50"
                  onClick={handleDownload}
                  title={`Tải xuống ${file.file_name}`}
                >
                  <FileText className="text-content-dark-3 h-4 w-4 shrink-0" />
                  <span className="text-content-dark-1 min-w-0 flex-1 truncate text-xs font-medium">
                    {file.file_name}
                  </span>
                  {file.size != null && (
                    <span className="text-content-dark-3 shrink-0 text-[10px]">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </Flex>
              )
            })}
          </Flex>
        ) : (
          <Text className="text-content-dark-3 text-xs italic">Không có tệp đính kèm</Text>
        )}
      </Flex>

      {/* Warning banner for pending track MV */}
      {isPendingMv && (
        <Flex
          p="3"
          gap="2.5"
          align="start"
          className="border-data-orange-focus rounded-lg border bg-[#FFFBF4]"
        >
          <AlertTriangle className="text-data-orange-default mt-0.5 h-4 w-4 shrink-0" />
          <Text className="text-data-orange-default text-xs leading-relaxed">
            Lô này có <b>track=mv</b> — MV đã apply nội bộ, chưa có phiếu đối chiếu CĐT tương ứng.
            Đợi HD04 kế tiếp để tự sinh lô đối chiếu (track=cdt).
          </Text>
        </Flex>
      )}
    </Flex>
  )

  const leftFooterContent = (
    <Flex gap="2">
      <Button
        variant="secondary"
        size="small"
        onClick={handleCopy}
        className="flex items-center gap-1.5"
        leftIcon={<Copy className="h-3.5 w-3.5" />}
      >
        Sao chép
      </Button>
    </Flex>
  )

  return (
    <AppDialog
      variant="custom"
      size="2xl"
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onCancel={onClose}
      onConfirm={onClose}
      title={titleNode}
      titleDescription={reasonText || 'Chi tiết lô cấu hình'}
      content={modalContent}
      isHideCancelButton={true}
      confirmText="Đóng"
      leftFooterContent={leftFooterContent}
    />
  )
}

export default LadDetailModal
