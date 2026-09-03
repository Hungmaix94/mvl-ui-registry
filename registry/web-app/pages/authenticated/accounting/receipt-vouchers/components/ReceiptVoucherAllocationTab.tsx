import { Fragment, useState } from 'react'
import { Button, Chip } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import { Check, AlertTriangle, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { formatCurrencyVND, formatNumber, formatSignedCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { APP_PATH } from '@/routes'
import { type SalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { ColoredValueVariant } from '@/api/schema'
import { DealPeriodAllocationStatusBadge } from '@/features/accounting/deal-period-allocations/components/DealPeriodAllocationStatusBadge'
import toastService from '@/services/toast-service'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { IconInfo } from '@/assets/icons'
import { DealPeriodAllocationStatus as DealPeriodAllocationStatus } from '@/constants/api-schema-aliases'
import {
  isRoundingDifferenceLine,
  lineSignedTotal,
  roundingDifferenceLabel,
  splitInvoiceAllocationAcrossLines,
  ROUNDING_DIFFERENCE_TOOLTIP,
} from '@/features/accounting/receipt-vouchers/utils/rounding-difference-line'

const getFormattedDealLabel = (dealDetail: any) => {
  const projName = dealDetail?.project?.name
  const unitNo = dealDetail?.product_inventory?.unit_number || dealDetail?.code
  if (projName && unitNo) {
    return `${projName} / ${unitNo}`
  }
  return dealDetail?.id ? `Giao dịch #${dealDetail.id}` : '—'
}

/**
 * Giá trị CÓ DẤU của một dòng hoá đơn. Trước đây hàm này gác bằng `> 0` nên dòng "Chênh lệch làm
 * tròn" âm (BE PR #3239) trả 0 ⇒ hiện "—" và biến mất khỏi mọi phép cộng. Xem
 * `rounding-difference-line.ts` (có test) để biết cả 3 hình dạng của dòng đó.
 */
const getLineCommissionVal = lineSignedTotal

const getInvoiceCommissionVal = (detail: any) => {
  const withVat = Number(detail?.total_amount_with_vat)
  if (!isNaN(withVat) && withVat !== 0) return withVat
  return Number(detail?.total_amount) || 0
}

interface ReceiptVoucherAllocationTabProps {
  record: any
  salesInvoicesMap: Record<number, SalesInvoice>
  editedAllocations: Record<string, number | string>
  setEditedAllocations: React.Dispatch<React.SetStateAction<Record<string, number | string>>>
  lockedUnits: Record<string, boolean>
  deletedUnits: Record<string, boolean>
  handleSaveAllocation: (rowKey?: string) => Promise<void>
  allocationsByVoucherLine: Record<number, any>
}

export const ReceiptVoucherAllocationTab = ({
  record,
  salesInvoicesMap,
  editedAllocations,
  setEditedAllocations,
  lockedUnits,
  deletedUnits,
  handleSaveAllocation,
  allocationsByVoucherLine,
}: ReceiptVoucherAllocationTabProps) => {
  const [expandedInvoices, setExpandedInvoices] = useState<Record<number, boolean>>({})

  const toggleInvoiceExpand = (salesInvoiceId: number) => {
    setExpandedInvoices((prev) => ({
      ...prev,
      [salesInvoiceId]: !prev[salesInvoiceId],
    }))
  }

  const isDraft = record?.status === 'DRAFT'

  // Calculate totals across all valid rows
  return (
    <>
      {record.invoices && record.invoices.length > 0 ? (
        (() => {
          const totalAllocated = record.invoices.reduce((sum: number, inv: any) => {
            const detail = salesInvoicesMap[inv.sales_invoice]
            if (detail && detail.lines && detail.lines.length > 0) {
              let invSum = 0
              detail.lines.forEach((_: any, idx: number) => {
                const rKey = `${inv.sales_invoice}-${idx}`
                if (!deletedUnits[rKey]) {
                  invSum += Number(editedAllocations[rKey] ?? 0)
                }
              })
              return sum + invSum
            } else {
              const rKey = `${inv.sales_invoice}-0`
              if (!deletedUnits[rKey]) {
                return sum + Number(editedAllocations[rKey] ?? 0)
              }
              return sum
            }
          }, 0)

          // Mẫu số là MỆNH GIÁ TẤT TOÁN, không phải tiền mặt. Tab này nói về phân bổ: một
          // phiếu phân bổ đủ mặt hoá đơn là ĐÚNG, kể cả khi CĐT chuyển thiếu vài đồng. So với
          // `total_amount` thì mọi phiếu có chênh lệch thu hợp lệ đều hiện chip "Lệch" như một
          // lỗi — trong khi tab Thông tin chung ngay cạnh gọi đúng nó là công nợ vụn.
          // `allocated_total` là cột lưu do BE roll-up (PR #3289); phiếu cũ chưa backfill trả 0
          // nên lùi về tổng phân bổ đọc từ các tier.
          const allocatedTotal = Number(record.allocated_total || 0) || totalAllocated
          const isMatched = Math.abs(totalAllocated - allocatedTotal) < 1
          const diff = allocatedTotal - totalAllocated
          // Chênh lệch giữa tiền mặt và mệnh giá — hiển thị riêng, KHÔNG trộn vào isMatched.
          const collectionVariance = Number(record.total_amount || 0) - allocatedTotal

          const totalOriginalCommission = record.invoices.reduce((sum: number, inv: any) => {
            const detail = salesInvoicesMap[inv.sales_invoice]
            if (detail && detail.lines && detail.lines.length > 0) {
              let invSum = 0
              detail.lines.forEach((line: any, idx: number) => {
                const rKey = `${inv.sales_invoice}-${idx}`
                if (!deletedUnits[rKey]) {
                  invSum += getLineCommissionVal(line)
                }
              })
              return sum + invSum
            } else {
              const rKey = `${inv.sales_invoice}-0`
              if (!deletedUnits[rKey]) {
                return sum + getInvoiceCommissionVal(detail)
              }
              return sum
            }
          }, 0)

          return (
            <div className="flex flex-col gap-5">
              {/* ── Summary Board Container ── */}
              <div className="border-border-1 flex flex-wrap items-center gap-12 rounded-xl border bg-white px-6 py-4 shadow-sm sm:gap-16 lg:gap-20">
                {/* Column 1: hai số tách nhau — tiền mặt thực nhận và mệnh giá tất toán */}
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-80 text-[11px] font-bold tracking-wider uppercase">
                    Mệnh giá tất toán
                  </span>
                  <span className="text-[22px] font-bold text-neutral-100">
                    {formatCurrencyVND(allocatedTotal)}
                    <span className="ml-0.5 underline decoration-1 underline-offset-2 select-none">
                      đ
                    </span>
                  </span>
                  <span className="text-neutral-70 text-[11px]">
                    Tiền thực nhận {formatCurrencyVND(Number(record.total_amount || 0))} đ
                    {collectionVariance !== 0 && (
                      <span className="text-data-orange-default ml-1">
                        ({formatSignedCurrencyVND(collectionVariance)} đ chênh lệch thu)
                      </span>
                    )}
                  </span>
                </div>

                {/* Column 2: Tổng HH các căn */}
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-80 text-[11px] font-bold tracking-wider uppercase">
                    Tổng HH các căn
                  </span>
                  <span className="text-[22px] font-bold text-neutral-100">
                    {formatSignedCurrencyVND(totalOriginalCommission)}
                    <span className="ml-0.5 underline decoration-1 underline-offset-2 select-none">
                      đ
                    </span>
                  </span>
                </div>

                {/* Column 3: Đã phân bổ */}
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-80 text-[11px] font-bold tracking-wider uppercase">
                    Đã phân bổ
                  </span>
                  <span
                    className={`text-[22px] font-bold ${isMatched ? 'text-emerald-600' : 'text-amber-600'}`}
                  >
                    {formatSignedCurrencyVND(totalAllocated)}
                    <span className="ml-0.5 underline decoration-1 underline-offset-2 select-none">
                      đ
                    </span>
                    {isMatched && (
                      <span className="ml-2 rounded-full bg-emerald-100/60 px-1.5 py-0.5 align-middle text-[10px] font-bold text-emerald-600 uppercase">
                        Khớp
                      </span>
                    )}
                  </span>
                </div>

                {/* Column 4: Còn lại */}
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-80 text-[11px] font-bold tracking-wider uppercase">
                    Còn lại
                  </span>
                  <span
                    className={`text-[22px] font-bold ${isMatched ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {formatSignedCurrencyVND(diff)}
                    <span className="ml-0.5 underline decoration-1 underline-offset-2 select-none">
                      đ
                    </span>
                  </span>
                </div>
              </div>

              {/* ── Draft Control Bar ── */}
              {isDraft && (
                <div
                  className={`mt-0.5 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 shadow-sm transition-all duration-300 ${
                    isMatched
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-amber-200 bg-amber-50/50'
                  }`}
                >
                  {/* Left-side info section */}
                  <div className="flex items-center gap-3">
                    {/* Circular Icon block */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm ${
                        isMatched ? 'border-emerald-200' : 'border-amber-200'
                      }`}
                    >
                      {isMatched ? (
                        <Check className="h-4 w-4 font-bold text-emerald-600" strokeWidth={3} />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>

                    {/* Title & Description */}
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-sm leading-none font-bold text-neutral-900">
                        {isMatched ? (
                          'Đã phân bổ đủ số tiền thu'
                        ) : (
                          <>
                            Chưa phân bổ đủ số tiền thu{' '}
                            <span className="ml-1 font-bold text-rose-600">
                              (Lệch: {formatCurrencyVND(Math.abs(diff))})
                            </span>
                          </>
                        )}
                      </h4>
                      <p className="text-sm leading-normal text-neutral-600">
                        Mỗi nhóm = 1 mã căn (Dự chi). Trong căn, tiền được chia tự động theo % tỷ lệ
                        của từng người. Hold cấp căn / cấp người sẽ giảm tỷ lệ chi tương ứng.
                      </p>
                    </div>
                  </div>

                  {/* Right-side button group */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="small"
                      variant="secondary-border"
                      leftIcon={<AlertTriangle className="h-3.5 w-3.5 text-neutral-500" />}
                      onClick={() => {
                        const nextAllocations = { ...editedAllocations }
                        record.invoices?.forEach((inv: any) => {
                          const detail = salesInvoicesMap[inv.sales_invoice]
                          if (detail && detail.lines && detail.lines.length > 0) {
                            // Dòng cấp chứng từ (chênh lệch làm tròn) nhận đúng số của nó rồi bị loại
                            // khỏi mẫu số; phần còn lại mới chia theo tỷ trọng HH của các căn.
                            splitInvoiceAllocationAcrossLines(
                              inv.sales_invoice,
                              detail.lines,
                              Number(inv.allocated_amount) || 0
                            ).forEach(({ rowKey, allocatedAmount }) => {
                              nextAllocations[rowKey] = allocatedAmount
                            })
                          } else {
                            const rKey = `${inv.sales_invoice}-0`
                            nextAllocations[rKey] = Number(inv.allocated_amount) || 0
                          }
                        })
                        setEditedAllocations(nextAllocations)
                        toastService.success('Đã áp dụng gợi ý chia theo hoa hồng thành công')
                      }}
                      className="shrink-0 rounded-lg border-neutral-300 bg-white font-bold text-neutral-800 shadow-sm transition-all hover:bg-neutral-50"
                    >
                      Gợi ý chia theo HH
                    </Button>

                    <Button
                      size="small"
                      variant="primary"
                      onClick={() => handleSaveAllocation()}
                      className="border-data-red-default bg-data-red-default hover:bg-data-red-hover shrink-0 rounded-lg font-bold text-white shadow-sm transition-all"
                    >
                      Lưu & Đồng bộ phân bổ
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Premium Allocation Table Layout ── */}
              <div className="border-border-1 bg-surface-primary-default w-full overflow-hidden overflow-x-auto border p-0 shadow-sm">
                <table className="w-full min-w-[1000px] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[12%]" />
                    <col className="w-[18%]" />
                    <col className="w-[20%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-border-1 border-b">
                      <th className="text-content-dark-2 p-3.5 pl-8 text-left text-sm font-medium tracking-wider whitespace-nowrap capitalize">
                        Mã căn / Giao dịch
                      </th>
                      <th className="text-content-dark-2 p-3.5 text-right text-sm font-medium tracking-wider whitespace-nowrap capitalize">
                        % chia
                      </th>
                      <th className="text-content-dark-2 p-3.5 text-right text-sm font-medium tracking-wider whitespace-nowrap capitalize">
                        Tiền phân bổ
                      </th>
                      <th className="text-content-dark-2 p-3.5 text-right text-sm font-medium tracking-wider whitespace-nowrap capitalize">
                        Tổng tiền HH gốc/Giao dịch
                      </th>
                      <th className="text-content-dark-2 p-3.5 text-center text-sm font-medium tracking-wider whitespace-nowrap capitalize">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-1 divide-y">
                    {record.invoices.map((inv: any) => {
                      const detail = salesInvoicesMap[inv.sales_invoice]
                      const isExpanded = expandedInvoices[inv.sales_invoice] === true
                      const lines =
                        detail?.lines && detail.lines.length > 0
                          ? detail.lines
                          : [
                              {
                                id: 0,
                                description: `Giao dịch #${inv.sales_invoice}`,
                                total_amount: detail?.total_amount || 0,
                              },
                            ]

                      const invoiceAllocatedSum = lines.reduce(
                        (sum: number, _: any, idx: number) => {
                          const rKey = `${inv.sales_invoice}-${idx}`
                          if (deletedUnits[rKey]) return sum
                          return sum + Number(editedAllocations[rKey] ?? 0)
                        },
                        0
                      )

                      const invoicePct =
                        totalAllocated > 0 ? (invoiceAllocatedSum / totalAllocated) * 100 : 0

                      return (
                        <Fragment key={inv.sales_invoice}>
                          {/* Invoice Group Header Row */}
                          <tr className="border-t border-b border-neutral-200 bg-neutral-50/80 font-semibold text-neutral-800">
                            <td colSpan={1} className="p-3 pl-4">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleInvoiceExpand(inv.sales_invoice)}
                                  className="shrink-0 rounded p-1 text-neutral-600 transition-colors hover:bg-neutral-200"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                                <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
                                <ReferenceCode
                                  code={detail?.code || `GD #${inv.sales_invoice}`}
                                  linkTo={APP_PATH.SALES_INVOICE_DETAIL.replace(
                                    ':id',
                                    String(inv.sales_invoice)
                                  )}
                                />
                                {detail?.external_invoice_no && (
                                  <span className="font-mono text-xs font-medium text-neutral-500">
                                    (Số HĐ: {detail.external_invoice_no})
                                  </span>
                                )}
                                <span className="text-content-dark-1 text-sm font-semibold">
                                  {detail?.customer_name || 'Khách hàng liên kết'}
                                </span>
                                <span className="text-content-dark-3 text-sm font-medium">
                                  ({detail?.invoice_date ? formatDate(detail.invoice_date) : '—'})
                                </span>
                              </div>
                            </td>
                            <td colSpan={1} className="p-3 text-right">
                              <div className="flex flex-col items-end justify-end gap-0.5 pr-3 text-right">
                                <span className="text-content-dark-3 text-[10px] font-semibold tracking-wider uppercase">
                                  Tỷ lệ chia đợt này
                                </span>
                                <span className="font-semibold text-neutral-800">
                                  {formatNumber(invoicePct, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                  %
                                </span>
                              </div>
                            </td>
                            <td colSpan={1} className="p-3 text-right">
                              <div className="flex flex-col items-end justify-end gap-0.5 pr-4 text-right">
                                <span className="text-content-dark-3 text-[10px] font-semibold tracking-wider uppercase">
                                  Thanh toán đợt này
                                </span>
                                <span className="font-semibold text-emerald-600">
                                  {formatSignedCurrencyVND(invoiceAllocatedSum)}
                                </span>
                              </div>
                            </td>
                            <td colSpan={1} className="p-3 text-right">
                              <div className="flex flex-col items-end justify-end gap-0.5 pr-3 text-right">
                                <span className="text-content-dark-3 text-[10px] font-semibold tracking-wider uppercase">
                                  Tổng tiền giao dịch
                                </span>
                                <span className="text-content-dark-1 font-semibold">
                                  {detail?.total_amount_with_vat
                                    ? formatCurrencyVND(Number(detail.total_amount_with_vat))
                                    : '—'}
                                </span>
                              </div>
                            </td>
                            <td colSpan={1} className="p-3 text-center">
                              —
                            </td>
                          </tr>

                          {/* Invoice Lines / Units */}
                          {isExpanded &&
                            lines.map((line: any, lineIdx: number) => {
                              const rowKey = `${inv.sales_invoice}-${lineIdx}`
                              const vl =
                                inv.lines?.find((x: any) => x.sales_invoice_line === line.id) ||
                                (lines.length === 1 && line.id === 0 ? inv.lines?.[0] : null)
                              const allocation = vl ? allocationsByVoucherLine[vl.id] : null

                              const currentAllocatedVal = Number(editedAllocations[rowKey] ?? 0)

                              const isLocked = lockedUnits[rowKey] ?? false
                              const isDraft = record?.status === 'DRAFT'
                              // "Chênh lệch làm tròn" thuộc về chứng từ, không thuộc căn nào: BE chốt
                              // số, sửa tay ở đây sẽ làm hoá đơn lệch với phiếu đối chiếu sinh ra nó.
                              const isRoundingLine = isRoundingDifferenceLine(line)
                              const isEditable = isDraft && !isLocked && !isRoundingLine

                              if (deletedUnits[rowKey]) return null

                              return (
                                <Fragment key={rowKey}>
                                  {/* Parent Unit Row */}
                                  <tr
                                    className={`border-border-1 border-b transition-colors duration-150 ${isLocked ? 'bg-neutral-50 text-neutral-400' : 'bg-white hover:bg-neutral-50/50'}`}
                                  >
                                    {/* Column 1: Mã căn */}
                                    <td
                                      className={`p-3 pl-12 text-left align-middle transition-colors duration-150 ${isLocked ? 'text-neutral-400' : 'text-neutral-900'}`}
                                    >
                                      <div className="flex min-w-0 items-center justify-start gap-2 text-left">
                                        <span className="truncate text-left text-sm font-semibold">
                                          {isRoundingLine
                                            ? roundingDifferenceLabel(line)
                                            : allocation?.deal_detail
                                              ? getFormattedDealLabel(allocation.deal_detail)
                                              : line.deal_detail
                                                ? getFormattedDealLabel(line.deal_detail)
                                                : line.description ||
                                                  (line.deal
                                                    ? `Giao dịch #${line.deal}`
                                                    : `Căn hộ #${lineIdx + 1}`)}
                                        </span>
                                        {isRoundingLine && (
                                          <Tooltip>
                                            <TooltipTrigger
                                              type="button"
                                              tabIndex={-1}
                                              aria-label="Giải thích dòng chênh lệch làm tròn"
                                              className="shrink-0 cursor-help outline-none"
                                            >
                                              <IconInfo
                                                size={14}
                                                className="text-content-dark-3 hover:text-content-dark-1 transition-colors"
                                              />
                                            </TooltipTrigger>
                                            <TooltipContent
                                              side="top"
                                              align="start"
                                              className="max-w-[320px]"
                                            >
                                              {ROUNDING_DIFFERENCE_TOOLTIP}
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </td>

                                    {/* Column 2: % chia */}
                                    <td
                                      className={`p-3 pr-8 text-right text-sm font-semibold transition-colors duration-150 ${isLocked ? 'text-neutral-400' : 'text-neutral-700'}`}
                                    >
                                      {totalAllocated > 0
                                        ? `${formatNumber((currentAllocatedVal / totalAllocated) * 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                                        : '0,00%'}
                                    </td>

                                    {/* Column 3: Tiền phân bổ */}
                                    {isEditable ? (
                                      <td className="relative !p-0 align-middle transition-colors duration-150">
                                        <FullCellNumberInput
                                          variant="editable"
                                          placeholder="0"
                                          value={
                                            editedAllocations[rowKey] !== undefined
                                              ? String(editedAllocations[rowKey])
                                              : ''
                                          }
                                          onChange={(e) => {
                                            const amtVal = e.target.value
                                            setEditedAllocations((prev) => ({
                                              ...prev,
                                              [rowKey]: amtVal,
                                            }))
                                          }}
                                          suffix="VNĐ"
                                          isHideSuffix={true}
                                          className="h-full w-full text-right font-bold !text-red-600"
                                          inputWrapperClassName="absolute inset-0"
                                        />
                                      </td>
                                    ) : (
                                      <td
                                        className={`p-3 text-right text-sm font-semibold whitespace-nowrap tabular-nums transition-colors duration-150 ${
                                          isLocked
                                            ? 'text-neutral-400'
                                            : currentAllocatedVal < 0
                                              ? 'text-data-red-default'
                                              : 'text-neutral-700'
                                        }`}
                                        title={
                                          isRoundingLine ? ROUNDING_DIFFERENCE_TOOLTIP : undefined
                                        }
                                      >
                                        {formatSignedCurrencyVND(currentAllocatedVal)}
                                      </td>
                                    )}

                                    {/* Column 4: HH gốc */}
                                    <td
                                      className={`p-3 text-right text-sm font-semibold whitespace-nowrap tabular-nums transition-colors duration-150 ${
                                        isLocked
                                          ? 'text-neutral-400'
                                          : getLineCommissionVal(line) < 0
                                            ? 'text-data-red-default'
                                            : 'text-neutral-700'
                                      }`}
                                    >
                                      {getLineCommissionVal(line) !== 0
                                        ? formatSignedCurrencyVND(getLineCommissionVal(line))
                                        : '—'}
                                    </td>

                                    {/* Column 5: Trạng thái */}
                                    <td
                                      className={`p-3 text-center text-xs font-semibold transition-colors duration-150 ${isLocked ? 'text-neutral-400' : 'text-neutral-700'}`}
                                    >
                                      {isRoundingLine ? (
                                        <Chip
                                          label="Theo chứng từ"
                                          variant={ColoredValueVariant.GREY}
                                          size="small"
                                        />
                                      ) : allocation?.status ? (
                                        <DealPeriodAllocationStatusBadge
                                          status={allocation.status as DealPeriodAllocationStatus}
                                        />
                                      ) : isDraft ? (
                                        <Chip
                                          label="Nháp"
                                          variant={ColoredValueVariant.GREY}
                                          size="small"
                                        />
                                      ) : isLocked ? (
                                        'Đã chốt'
                                      ) : (
                                        'Chờ duyệt'
                                      )}
                                    </td>
                                  </tr>
                                </Fragment>
                              )
                            })}
                        </Fragment>
                      )
                    })}

                    {/* ── Table Summary Footer Row ── */}
                    <tr className="border-border-1 border-t font-bold">
                      <td className="text-content-dark-1 p-3.5 pl-5 align-middle font-bold">
                        TỔNG PHÂN BỔ
                      </td>
                      <td className="text-content-dark-2 p-3.5 text-right text-sm font-bold">
                        {totalAllocated > 0 ? '100,00%' : '0,00%'}
                      </td>
                      <td className="text-content-dark-1 p-3.5 text-right font-bold">
                        {formatSignedCurrencyVND(totalAllocated)}
                      </td>
                      <td className="text-content-dark-2 p-3.5 text-right font-bold">
                        {formatSignedCurrencyVND(totalOriginalCommission)}
                      </td>
                      <td className="p-3.5 text-center">
                        <Chip
                          label={isMatched ? 'Khớp 100%' : 'Lệch'}
                          variant={isMatched ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
                          size="small"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()
      ) : (
        <div className="border-border-1 bg-background-2 rounded-xl border border-dashed px-6 py-10 text-center">
          <span className="text-3xl">📄</span>
          <p className="text-content-dark-3 mt-2 text-sm font-medium">
            Không có giao dịch phân bổ đính kèm phiếu thu này
          </p>
        </div>
      )}
    </>
  )
}
