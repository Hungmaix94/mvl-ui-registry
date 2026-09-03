import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table'

import { ColoredValueVariant, components } from '@/api/schema'
import { IconEye, IconProhibit, IconCheckcircle, IconChecks } from '@/assets/icons'
import { Chip, Table } from '@/components/ui'
import { APP_PATH } from '@/routes'
import type { TableAction, ColumnConfig } from '@/types/table'
import { formatCurrencyVND, formatPct, formatPctFloor } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'
import { WorksheetStatusChip } from '@/features/accounting/commission-splits/components/WorksheetStatusChip'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { useReleasePaymentSuspension } from '@/features/accounting/commission-splits/services/deal-payment-suspensions-service'
import { PaymentSuspensionDialog } from '@/features/accounting/commission-splits/components/PaymentSuspensionDialog'
import { useDialog } from '@/hooks/useDialog'
import { useDealPeriodAllocationAdminApproveWorksheet as useAdminApproveWorksheet } from '@/features/accounting/deal-period-allocations/services/deal-period-allocation-service'
import {
  formatAgencyFee,
  formatInvoiceMonth,
  formatRevenueFee,
} from '@/features/accounting/commission-splits/utils/worksheet-fee-cells'
import { DistributionPctFormulaHint } from '@/features/accounting/commission-splits/components/DistributionPctFormulaHint'
import { WorksheetBasisCell } from '@/features/accounting/commission-splits/components/WorksheetBasisCell'
// CR STT17 (86eydbph4): màn này phải hiện đúng cột/dòng như "Chia HH theo tháng" — dùng lại
// component đã build cho màn đó thay vì viết lại logic người bán + tổ chức lần hai.
import {
  SELLER_COLUMN_SIZE,
  SELLER_COLUMN_WIDTH,
  SellerList,
} from '@/features/accounting/commission-splits/components/WorksheetParticipantCells'
import {
  InvestorNameCell,
  ProjectNameCell,
  UnitNumberCell,
} from '@/features/accounting/commission-splits/components/WorksheetIdentityCells'
import {
  BonusProgressPctCell,
  EmphasisMoneyCell,
  ProgressPctCell,
  formatPayoutMoney,
  optionalWorksheetTotal,
} from '@/features/accounting/commission-splits/components/WorksheetPayoutCells'
import { worksheetPaymentPct } from '@/features/accounting/commission-splits/utils/split-helpers'

export type DealPeriodWorksheetListRow = components['schemas']['DealPeriodWorksheetListRow'] & {
  unit_number?: string | null
}

// Worksheet lifecycle status (PBTV approval state) — no schema enum / app-constant exists for
// the list row's `worksheet_status`, so the closed set is declared locally.
const WORKSHEET_STATUS = {
  DRAFT: 'DRAFT',
  ADMIN_APPROVED: 'ADMIN_APPROVED',
  APPROVED: 'APPROVED',
  VOIDED: 'VOIDED',
} as const

type Props = {
  data: DealPeriodWorksheetListRow[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  isShowTableColumnConfig?: boolean
  /** Enable the built-in checkbox column for bulk approval (admin only). */
  selectionEnabled?: boolean
  /** Controlled selection keyed by representative_pbtv_id — cross-page source of truth in the page. */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (next: RowSelectionState) => void
  /**
   * Column totals over the WHOLE filtered set, straight from the API — never summed from
   * `data`, which holds one page. Null in `deal` timeline mode (deal-level constants repeated
   * per period would sum to nonsense); the row hides then.
   */
  totals?: components['schemas']['PaginatedDealPeriodWorksheetListRowList']['totals']
  /** Rows behind `totals`, shown next to the "TỔNG CỘNG" label. */
  totalsRowCount?: number | null
}

export const DealPeriodAllocationWorksheetTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = 25,
  currentPageIndex = 0,
  onPaginationChange,
  isShowTableColumnConfig,
  selectionEnabled = false,
  rowSelection,
  onRowSelectionChange,
  totals,
  totalsRowCount,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const canSuspend = ability.can('create', 'dealpaymentsuspension')
  const canRelease = ability.can('release', 'dealpaymentsuspension')
  const canViewExchange = ability.can('retrieve', 'exchange')
  const canViewCollaborator = ability.can('retrieve', 'collaborator')

  const { mutateAsync: releaseSuspension } = useReleasePaymentSuspension()
  const [suspendDeal, setSuspendDeal] = useState<{ id: number; code: string } | null>(null)

  const { mutateAsync: adminApproveWorksheet } = useAdminApproveWorksheet()
  const { displayConfirm } = useDialog()
  const [isProcessingApprove, setIsProcessingApprove] = useState<Record<number, boolean>>({})

  const handleReleaseSuspension = async (pbtvId: number) => {
    try {
      await releaseSuspension({ pbtv_id: pbtvId, payload: { reason: 'Bỏ tạm ngưng' } })
      toastService.success('Đã bỏ tạm ngưng chi trả thành công')
    } catch (error: any) {
      toastService.error(error?.message || 'Có lỗi xảy ra khi bỏ tạm ngưng chi trả')
    }
  }

  const allColumns = useMemo<ColumnDef<DealPeriodWorksheetListRow>[]>(
    () => [
      {
        id: 'worksheet_code',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'worksheet_code_tier1',
            header: 'Mã phân bổ',
            meta: { width: 'w-[150px]', align: 'left', rowSpan: 2 },
            columns: [
              {
                id: 'worksheet_code_col',
                header: '',
                meta: { width: 'w-[150px]', align: 'left', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => {
                  const detailPathPattern = APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL
                  return (
                    <span
                      className="text-brand-primary-default cursor-pointer font-medium hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(
                          detailPathPattern.replace(':id', row.original.worksheet_id.toString())
                        )
                      }}
                    >
                      {row.original.worksheet_code}
                    </span>
                  )
                },
              },
            ],
          },
        ],
      },
      // CR 86eym80zg (đợt 2): "Dự án" (B) và "Mã BĐS" (C) lên trước "Chủ đầu tư" (D) và ĐÔNG
      // CỨNG để kéo ngang không mất điểm neo. `frozen` phải khai ở CẢ BA tầng: `TableHeader` đọc
      // meta của từng tầng header, `TableRow` đọc meta của cột LÁ — thiếu tầng nào thì tầng đó
      // trôi trong khi các tầng kia đứng yên. Offset do `calculateFrozenOffsets` cộng dồn theo lá.
      {
        id: 'project_name',
        header: '(B)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
          frozen: true,
        },
        columns: [
          {
            id: 'project_name_tier1',
            header: 'Dự án',
            meta: { width: 'w-[180px]', align: 'left', rowSpan: 2, frozen: true },
            columns: [
              {
                id: 'project_name_col',
                header: '',
                meta: {
                  width: 'w-[180px]',
                  align: 'left',
                  rowSpan: 2,
                  hiddenHeader: true,
                  frozen: true,
                },
                cell: ({ row }) => <ProjectNameCell row={row.original} />,
              },
            ],
          },
        ],
      },
      {
        id: 'unit_number',
        header: '(C)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
          frozen: true,
        },
        columns: [
          {
            id: 'unit_number_tier1',
            header: 'Mã BĐS',
            meta: { width: 'w-[160px]', align: 'left', rowSpan: 2, frozen: true },
            columns: [
              {
                id: 'unit_number_col',
                header: '',
                meta: {
                  width: 'w-[160px]',
                  align: 'left',
                  rowSpan: 2,
                  hiddenHeader: true,
                  frozen: true,
                },
                cell: ({ row }) => <UnitNumberCell row={row.original} />,
              },
            ],
          },
        ],
      },
      {
        id: 'investor_name',
        header: '(D)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'investor_name_tier1',
            header: 'Chủ đầu tư / Nguồn hàng',
            meta: { width: 'w-[200px]', align: 'left', rowSpan: 2 },
            columns: [
              {
                id: 'investor_name_col',
                header: '',
                meta: { width: 'w-[200px]', align: 'left', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => <InvestorNameCell row={row.original} />,
              },
            ],
          },
        ],
      },
      {
        id: 'l_group',
        header: '(L)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'sellers',
            header: 'Danh sách sale',
            size: SELLER_COLUMN_SIZE,
            meta: { width: SELLER_COLUMN_WIDTH, align: 'left', rowSpan: 2 },
            columns: [
              {
                id: 'sellers_col',
                header: '',
                size: SELLER_COLUMN_SIZE,
                meta: {
                  width: SELLER_COLUMN_WIDTH,
                  align: 'left',
                  rowSpan: 2,
                  hiddenHeader: true,
                  cellClassName: 'align-top',
                },
                cell: ({ row }) => (
                  <SellerList
                    row={row.original}
                    canViewExchange={canViewExchange}
                    canViewCollaborator={canViewCollaborator}
                  />
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'deposit_date',
        header: '(I)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'deposit_date_tier1',
            header: 'Ngày cọc',
            meta: { width: 'w-[120px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'deposit_date_col',
                header: '',
                meta: { width: 'w-[120px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                // `formatDate` (date-utils) thay cho `new Date(...).toLocaleDateString('vi-VN')` — quy ước
                // dự án cấm dựng Date thô từ chuỗi API, và toLocaleDateString cho ra 30/7/2026 (không pad
                // 0) lệch với 30/07/2026 của màn "Chia HH theo tháng".
                cell: ({ row }) => formatDate(row.original.deposit_date),
              },
            ],
          },
        ],
      },
      {
        id: 'list_price',
        header: '(G)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'list_price_tier1',
            header: 'Giá niêm yết',
            meta: { width: 'w-[140px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'list_price_col',
                header: '',
                meta: { width: 'w-[140px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => formatCurrencyVND(Number(row.original.list_price || 0)),
                footer: () => formatSummaryCurrency(totals?.list_price),
              },
            ],
          },
        ],
      },
      {
        id: 'basis',
        header: '(H)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'basis_tier1',
            // CR STT51 (86eymm0hq), BA chốt 21/08. ĐẢO CHIỀU nhãn của CR STT17 (18/08) —
            // BA xác nhận sau khi được cho xem lịch sử đó. Giữ khớp với `CommissionSplitTable`.
            header: 'Giá tính phí',
            meta: { width: 'w-[160px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'basis_col',
                header: '',
                meta: { width: 'w-[160px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => <WorksheetBasisCell row={row.original} />,
                footer: () => formatSummaryCurrency(totals?.basis),
              },
            ],
          },
        ],
      },
      {
        id: 'fee_pct',
        header: '(M)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'fee_pct_tier1',
            // CR STT51: bỏ hậu tố "(%)" là CỐ Ý — ô in số tiền khi SA cấu hình theo số tiền.
            header: 'Phí đại lý',
            meta: { width: 'w-[110px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'fee_pct_col',
                header: '',
                meta: { width: 'w-[110px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => formatAgencyFee(row.original),
              },
            ],
          },
        ],
      },
      {
        id: 'fee_amount',
        header: '(N)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'fee_amount_tier1',
            header: 'Thành tiền phí',
            meta: { width: 'w-[140px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'fee_amount_col',
                header: '',
                meta: { width: 'w-[140px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => formatCurrencyVND(Number(row.original.fee_amount || 0)),
                footer: () => formatSummaryCurrency(totals?.fee_amount),
              },
            ],
          },
        ],
      },
      {
        // CR STT51 (86eymm0hq). Không có chữ cái cột nguồn nên nhóm để trống.
        id: 'revenue',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'revenue_tier1',
            header: 'Phí doanh thu',
            meta: { width: 'w-[130px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'revenue_col',
                header: '',
                meta: { width: 'w-[130px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                // Không có footer: ô mang HAI đơn vị (tỷ lệ hoặc số tiền tuỳ cấu hình deal), nên
                // một dòng tổng dưới nó không đối chiếu được với gì. Export cũng để trống ô tổng.
                cell: ({ row }) => formatRevenueFee(row.original),
              },
            ],
          },
        ],
      },
      {
        id: 'bonus',
        header: '(Q)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'bonus_tier1',
            header: 'Thưởng',
            meta: { width: 'w-[140px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'bonus_col',
                header: '',
                meta: { width: 'w-[140px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => formatCurrencyVND(Number(row.original.bonus || 0)),
                footer: () => formatSummaryCurrency(totals?.bonus),
              },
            ],
          },
        ],
      },
      {
        id: 'total',
        header: '(X)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'total_tier1',
            header: 'Tổng phí + thưởng',
            meta: { width: 'w-[160px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'total_col',
                header: '',
                meta: { width: 'w-[160px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => (
                  <span className="text-brand-primary-default font-semibold">
                    {formatCurrencyVND(Number(row.original.total || 0))}
                  </span>
                ),
                footer: () => (
                  <span className="text-brand-primary-default">
                    {formatSummaryCurrency(totals?.total)}
                  </span>
                ),
              },
            ],
          },
        ],
      },
      // Cụm "trả sale" — CR STT17 (86eydbph4). Đã thêm ở 04/08, bị `492e71fa7` gỡ im lặng
      // hôm sau, và 06/08 chốt nhầm là "giữ nguyên hiện trạng". BA yêu cầu lại 13/08 nên cụm
      // này quay lại, đúng thứ tự của màn "Chia HH theo tháng": giữa `total` và `invoice_no`.
      // Renderer lấy từ `WorksheetPayoutCells` — copy sang từng bảng đúng là cách hai màn
      // trôi khỏi nhau hai lần trước.
      {
        id: 'sales_fee_pct',
        header: '(V)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'sales_fee_pct_tier1',
            header: 'Phí trả sale (%)',
            meta: { width: 'w-[140px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'sales_fee_pct_col',
                header: '',
                meta: { width: 'w-[140px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => formatPct(row.original.sales_fee_pct, 2),
              },
            ],
          },
        ],
      },
      {
        id: 'fee_progress_pct',
        header: '(O)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'fee_progress_pct_tier1',
            header: '% TT Phí',
            meta: { width: 'w-[110px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'fee_progress_pct_col',
                header: '',
                meta: { width: 'w-[110px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => <ProgressPctCell value={row.original.fee_progress_pct} />,
              },
            ],
          },
        ],
      },
      {
        id: 'sales_fee_amount',
        header: '(W)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'sales_fee_amount_tier1',
            header: 'Thành tiền trả sale',
            meta: { width: 'w-[150px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'sales_fee_amount_col',
                header: '',
                meta: { width: 'w-[150px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => formatPayoutMoney(row.original.sales_fee_amount),
                // `totals` của API chưa có khoá này ⇒ ô tổng hiện `—`, giống hệt màn kia.
                footer: () =>
                  formatSummaryCurrency(optionalWorksheetTotal(totals, 'sales_fee_amount')),
              },
            ],
          },
        ],
      },
      {
        id: 'bonus_progress_pct',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'bonus_progress_pct_tier1',
            header: '% TT Thưởng',
            meta: { width: 'w-[120px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'bonus_progress_pct_col',
                header: '',
                meta: { width: 'w-[120px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => <BonusProgressPctCell row={row.original} />,
              },
            ],
          },
        ],
      },
      {
        id: 'sales_bonus',
        header: '(S)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'sales_bonus_tier1',
            header: 'Thưởng trả sale',
            meta: { width: 'w-[140px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'sales_bonus_col',
                header: '',
                meta: { width: 'w-[140px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => formatPayoutMoney(row.original.sales_bonus),
                footer: () => formatSummaryCurrency(optionalWorksheetTotal(totals, 'sales_bonus')),
              },
            ],
          },
        ],
      },
      {
        id: 'total_sales_payout',
        header: '(X)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'total_sales_payout_tier1',
            header: 'Tổng trả sale',
            meta: { width: 'w-[160px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'total_sales_payout_col',
                header: '',
                meta: { width: 'w-[160px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => (
                  <EmphasisMoneyCell>
                    {formatPayoutMoney(row.original.total_sales_payout)}
                  </EmphasisMoneyCell>
                ),
                footer: () => (
                  <EmphasisMoneyCell>
                    {formatSummaryCurrency(totals?.total_sales_payout)}
                  </EmphasisMoneyCell>
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'f2_progress_pct',
        header: '(T)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'f2_progress_pct_tier1',
            header: '% TT F2',
            meta: { width: 'w-[110px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'f2_progress_pct_col',
                header: '',
                meta: { width: 'w-[110px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => <ProgressPctCell value={row.original.f2_progress_pct} />,
              },
            ],
          },
        ],
      },
      {
        id: 'invoice_no',
        header: '(F)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'invoice_no_tier1',
            header: 'Số hoá đơn',
            meta: { width: 'w-[145px]', align: 'left', rowSpan: 2 },
            columns: [
              {
                id: 'invoice_no_col',
                header: '',
                meta: { width: 'w-[145px]', align: 'left', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => (
                  <span
                    className={`font-mono text-xs ${
                      row.original.invoice_no
                        ? 'text-brand-primary-default cursor-pointer hover:underline'
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (row.original.invoice_no)
                        navigate(
                          `${APP_PATH.SALES_INVOICE}?search=${encodeURIComponent(row.original.invoice_no)}`
                        )
                    }}
                  >
                    {row.original.invoice_no || '—'}
                  </span>
                ),
              },
            ],
          },
        ],
      },
      {
        // CR STT51 — ngay sau "Số hoá đơn": hai ô đến từ cùng một hoá đơn đại diện (BA 21/08 Q8).
        id: 'invoice_month',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'invoice_month_tier1',
            header: 'Tháng xuất hoá đơn',
            meta: { width: 'w-[135px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'invoice_month_col',
                header: '',
                meta: { width: 'w-[135px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => formatInvoiceMonth(row.original),
              },
            ],
          },
        ],
      },
      {
        id: 'receipt_no',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'receipt_no_tier1',
            header: 'Số phiếu thu',
            meta: { width: 'w-[145px]', align: 'left', rowSpan: 2 },
            columns: [
              {
                id: 'receipt_no_col',
                header: '',
                meta: { width: 'w-[145px]', align: 'left', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => (
                  <span
                    className={`font-mono text-xs ${
                      row.original.receipt_no
                        ? 'text-brand-primary-default cursor-pointer hover:underline'
                        : 'text-gray-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (row.original.receipt_no)
                        navigate(
                          `${APP_PATH.RECEIPT_VOUCHER}?search=${encodeURIComponent(row.original.receipt_no)}`
                        )
                    }}
                  >
                    {row.original.receipt_no || '—'}
                  </span>
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'paid_pct',
        // Chữ (O) thuộc về `% TT Phí`, không phải cột này — màn "Chia HH theo tháng" để trống ô
        // chữ cái ở đây. Trước CR STT17 màn này mượn tạm (O) vì `% TT Phí` chưa có mặt; giữ lại
        // là hàng chữ cái Excel có HAI ô (O), tra ngược sang file Excel gốc thành mơ hồ.
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'paid_pct_tier1',
            header: '% Thanh toán',
            meta: { width: 'w-[150px]', align: 'right', rowSpan: 2 },
            columns: [
              {
                id: 'paid_pct_col',
                header: '',
                meta: { width: 'w-[150px]', align: 'right', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => {
                  // "% Thanh toán" = % TỔNG commission (phí + thưởng) CĐT đã thanh toán của căn trong kỳ.
                  // Dùng total_distribution_pct (đã chuẩn hóa pre-VAT), KHÔNG dùng paid_pct (chỉ theo phí và
                  // còn lệch VAT). Giữ nguyên column id 'paid_pct' để không mất cấu hình ẩn/hiện cột đã lưu.
                  const pct = Number(row.original.total_distribution_pct || 0)
                  const color =
                    pct >= 100 ? 'bg-green-500' : pct > 0 ? 'bg-orange-500' : 'bg-gray-300'
                  return (
                    <div className="flex flex-col items-end gap-1">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full ${color}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {/* `formatPctFloor(pct, 2)` giống màn "Chia HH theo tháng" — `formatPercent` để
                        nguyên 3 chữ số lẻ (29,577%), lệch hẳn cách hiển thị bên đó. */}
                        <span className="text-xs whitespace-nowrap">{formatPctFloor(pct, 2)}</span>
                        <DistributionPctFormulaHint
                          breakdown={row.original.distribution_pct_breakdown}
                        />
                      </div>
                    </div>
                  )
                },
              },
            ],
          },
        ],
      },
      {
        id: 'received_group',
        header: '(P)',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            // Nhóm cột 2 tầng: header cha "Thành tiền nhận về" + 2 cột con chưa/có VAT — đồng bộ
            // với màn "Chia HH theo tháng" (CR STT17 86eydbph4, phụ thuộc CR STT18 86eydb087 đã xong).
            id: 'received_group_col',
            header: 'Thành tiền nhận về',
            meta: { align: 'center' },
            columns: [
              {
                id: 'received_net',
                header: 'Chưa VAT',
                cell: ({ row }) => {
                  const pct = worksheetPaymentPct(row.original)
                  const receivedNet = Number(row.original.received_net || 0)
                  const textColor =
                    pct >= 100
                      ? 'text-data-green-default'
                      : pct > 0
                        ? 'text-data-orange-default'
                        : 'text-neutral-400'
                  return (
                    <span className={`font-medium ${textColor}`}>
                      {receivedNet > 0 ? formatCurrencyVND(receivedNet) : '—'}
                    </span>
                  )
                },
                footer: () => formatSummaryCurrency(totals?.received_net),
                meta: { width: 'w-[150px]', align: 'right' },
              },
              {
                id: 'received',
                header: 'Có VAT',
                cell: ({ row }) => {
                  const pct = worksheetPaymentPct(row.original)
                  const received = Number(row.original.received || 0)
                  const textColor =
                    pct >= 100
                      ? 'text-data-green-default'
                      : pct > 0
                        ? 'text-data-orange-default'
                        : 'text-neutral-400'
                  return (
                    <span className={`font-medium ${textColor}`}>
                      {received > 0 ? formatCurrencyVND(received) : '—'}
                    </span>
                  )
                },
                footer: () => formatSummaryCurrency(totals?.received),
                meta: { width: 'w-[150px]', align: 'right' },
              },
            ],
          },
        ],
      },
      {
        id: 'payment_suspended',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'payment_suspended_tier1',
            header: 'Tạm ngưng chi trả',
            meta: { width: 'w-[150px]', align: 'center', rowSpan: 2 },
            columns: [
              {
                id: 'payment_suspended_col',
                header: '',
                meta: { width: 'w-[150px]', align: 'center', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => {
                  return row.original.payment_suspended ? (
                    <Chip label="Tạm ngưng" variant={ColoredValueVariant.RED} />
                  ) : (
                    <Chip label="Bình thường" variant={ColoredValueVariant.GREY} />
                  )
                },
              },
            ],
          },
        ],
      },
      {
        id: 'status',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'status_tier1',
            header: 'Trạng thái',
            meta: { width: 'w-[140px]', align: 'center', rowSpan: 2 },
            columns: [
              {
                id: 'status_col',
                header: '',
                meta: { width: 'w-[140px]', align: 'center', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => {
                  // Nhất quán với cột "% Thanh toán": trạng thái suy từ % TỔNG commission đã thu
                  // (total_distribution_pct, đã chuẩn hóa pre-VAT) — KHÔNG dùng row.status cũ (tính theo
                  // phí, lệch VAT, và trả về lowercase không khớp switch nên luôn rơi vào nhánh default).
                  const pct = Number(row.original.total_distribution_pct || 0)
                  if (pct >= 100)
                    return <Chip label="Đã nhận đủ" variant={ColoredValueVariant.GREEN} />
                  if (pct > 0)
                    return <Chip label="Thu một phần" variant={ColoredValueVariant.ORANGE} />
                  return <Chip label="Chưa thu" variant={ColoredValueVariant.GREY} />
                },
              },
            ],
          },
        ],
      },
      // CR 86eym80zg: 3 cột dưới đây trước nằm ngay sau "Mã phân bổ" (đầu bảng), nay chuyển
      // xuống cuối. CR chỉ nêu màn "Chia HH theo tháng", nhưng invariant CR STT17
      // (`worksheet-list-columns.test.ts`) khoá thứ tự cột lõi giống nhau giữa hai màn nên màn
      // này đổi cùng lúc — QA từng bắt lệch 2 lần khi hai bảng trôi khỏi nhau.
      {
        id: 'worksheet_status',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'worksheet_status_tier1',
            header: 'Trạng thái duyệt',
            meta: { width: 'w-[180px]', align: 'center', rowSpan: 2 },
            columns: [
              {
                id: 'worksheet_status_col',
                header: '',
                meta: { width: 'w-[180px]', align: 'center', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => <WorksheetStatusChip status={row.original.worksheet_status} />,
                // 180px: nhãn dài nhất ("KT đã duyệt thực nhận") đo được 145px + padding ô 24px.
              },
            ],
          },
        ],
      },
      {
        id: 'dial_deviates',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'dial_deviates_tier1',
            header: 'Duyệt lệch tiền về',
            meta: { width: 'w-[165px]', align: 'center', rowSpan: 2 },
            columns: [
              {
                id: 'dial_deviates_col',
                header: '',
                meta: { width: 'w-[165px]', align: 'center', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) =>
                  row.original.dial_deviates ? (
                    <span title="Dial % chi trả (phí/F2) kế toán chốt khác với tỷ lệ tiền CĐT đã thanh toán — xem giải trình trong màn chi tiết.">
                      <Chip label="Duyệt lệch" variant={ColoredValueVariant.YELLOW} size="small" />
                    </span>
                  ) : (
                    <span className="text-content-dark-3 text-xs">—</span>
                  ),
              },
            ],
          },
        ],
      },
      {
        id: 'deal_code',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500',
        },
        columns: [
          {
            id: 'deal_code_tier1',
            header: 'Mã deal',
            meta: { width: 'w-[175px]', align: 'left', rowSpan: 2 },
            columns: [
              {
                id: 'deal_code_col',
                header: '',
                meta: { width: 'w-[175px]', align: 'left', rowSpan: 2, hiddenHeader: true },
                cell: ({ row }) => (
                  <span
                    className="text-brand-primary-default cursor-pointer font-medium hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(APP_PATH.DEAL_DETAIL.replace(':id', row.original.deal_id.toString()))
                    }}
                  >
                    {row.original.deal_code}
                  </span>
                ),
              },
            ],
          },
        ],
      },
    ],
    [navigate, totals, canViewExchange, canViewCollaborator]
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'worksheet_code', label: 'Mã phân bổ', visible: false, order: 0 },
      // CR 86eym80zg (đợt 2): B, C lên trước D — và là hai cột đông cứng của bảng.
      { id: 'project_name', label: 'Dự án', visible: true, order: 1 },
      { id: 'unit_number', label: 'Mã BĐS', visible: true, order: 2 },
      { id: 'investor_name', label: 'Chủ đầu tư / Nguồn hàng', visible: true, order: 3 },
      // CR 86eyj75hg: (L) còn đúng MỘT cột người bán đã gộp. Khối/Phòng ban KHÔNG phải cột — nằm
      // inline trong ô của từng người (sửa 20/08); hai màn phải giống hệt nhau (CR STT17).
      { id: 'l_group', label: 'Danh sách sale', visible: true, order: 4 },
      { id: 'deposit_date', label: 'Ngày cọc', visible: true, order: 5 },
      { id: 'list_price', label: 'Giá niêm yết', visible: true, order: 6 },
      // CR STT17 (86eydbph4): bốn nhãn này đồng bộ với màn "Chia HH theo tháng". `0e4bcc5bb` đã
      // đổi một lần rồi bị `492e71fa7` trả về nhãn gốc tháng 6 cùng lượt gỡ cụm "trả sale";
      // user chốt đồng bộ nốt (18/08). Đổi ở đây phải đổi kèm `header` của tầng `*_tier1`.
      // CR STT51 (86eymm0hq, 21/08/2026): BA ĐẢO CHIỀU 2 nhãn mà CR STT17 chốt ngày 18/08
      // — "Thành tiền DT" -> "Giá tính phí", "Phí DT (%)" -> "Phí đại lý" (bỏ hậu tố
      // "(%)" vì ô nay in cả số tiền). BA xác nhận SAU KHI được cho xem lịch sử STT17, nên
      // quyết định muộn hơn thắng. Cùng CR thêm 2 cột "Phí doanh thu" + "Tháng xuất hoá đơn".
      { id: 'basis', label: 'Giá tính phí', visible: true, order: 7 },
      { id: 'fee_pct', label: 'Phí đại lý', visible: true, order: 8 },
      { id: 'fee_amount', label: 'Thành tiền phí', visible: true, order: 9 },
      { id: 'revenue', label: 'Phí doanh thu', visible: true, order: 10 },
      { id: 'bonus', label: 'Thưởng', visible: true, order: 11 },
      { id: 'total', label: 'Tổng phí + thưởng', visible: true, order: 12 },
      // CR STT17 (86eydbph4) — cụm "trả sale" quay lại theo yêu cầu BA 13/08.
      { id: 'sales_fee_pct', label: 'Phí trả sale (%)', visible: true, order: 13 },
      { id: 'fee_progress_pct', label: '% TT Phí', visible: true, order: 14 },
      { id: 'sales_fee_amount', label: 'Thành tiền trả sale', visible: true, order: 15 },
      { id: 'bonus_progress_pct', label: '% TT Thưởng', visible: true, order: 16 },
      { id: 'sales_bonus', label: 'Thưởng trả sale', visible: true, order: 17 },
      { id: 'total_sales_payout', label: 'Tổng trả sale', visible: true, order: 18 },
      { id: 'f2_progress_pct', label: '% TT F2', visible: true, order: 19 },
      { id: 'invoice_no', label: 'Số hoá đơn', visible: true, order: 20 },
      // Ngay sau "Số hoá đơn": hai ô đọc từ CÙNG một hoá đơn đại diện (BA 21/08 Q8).
      { id: 'invoice_month', label: 'Tháng xuất hoá đơn', visible: true, order: 21 },
      { id: 'receipt_no', label: 'Số phiếu thu', visible: true, order: 22 },
      { id: 'paid_pct', label: '% Thanh toán', visible: true, order: 23 },
      { id: 'received_group', label: 'Thành tiền nhận về', visible: true, order: 24 },
      { id: 'payment_suspended', label: 'Tạm ngưng chi trả', visible: true, order: 25 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 26 },
      // CR 86eym80zg — 3 cột cuối bảng. `order` phải khớp chỉ số mảng vì `handleReset` gán
      // `order = index`; lệch nhau thì "Đặt lại" cho ra thứ tự khác lần đầu vào màn.
      { id: 'worksheet_status', label: 'Trạng thái duyệt', visible: true, order: 27 },
      { id: 'dial_deviates', label: 'Duyệt lệch tiền về', visible: true, order: 28 },
      { id: 'deal_code', label: 'Mã deal', visible: true, order: 29 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'admin-deal-period-allocations',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<DealPeriodWorksheetListRow>[]
  }, [columnConfig, allColumns])

  const rowActions: TableAction<DealPeriodWorksheetListRow>[] = useMemo(() => {
    const actions: TableAction<DealPeriodWorksheetListRow>[] = []

    // Ba mục dưới đã gate sẵn; riêng mục này thì chưa (ClickUp 86eync7g0). Route đích
    // `DEAL_PERIOD_ALLOCATION_DETAIL` khai `dealperiodworksheet.admin_preview` — KHÔNG phải
    // `.retrieve`, vốn là mã của route bảng chia thường.
    if (ability.can('admin_preview', 'dealperiodworksheet')) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          const pathPattern = APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL
          navigate(pathPattern.replace(':id', record.worksheet_id.toString()))
        },
      })
    }

    const canApprove = ability.can('admin_approve', 'dealperiodworksheet')
    if (canApprove) {
      actions.push({
        label: 'Duyệt chi',
        icon: <IconChecks size={16} />,
        show: (record) => record.worksheet_status === 'DRAFT',
        onClick: (record) => {
          const worksheetId = record.worksheet_id
          if (isProcessingApprove[worksheetId]) return

          // Admin "Duyệt chi" = chỉ authorize chi cho căn (DRAFT -> ADMIN_APPROVED) qua
          // /admin-approve/. Việc chia mặc định + confirm splits + tạo CommissionPayable
          // diễn ra SAU, ở bước kế toán "Duyệt chi thực nhận" (/approve/, đã gộp confirm
          // từ Mục 5). Không gọi confirm-default-splits ở đây — trước đây gọi là sai
          // endpoint/luồng, giống hệt bản vá đã áp ở màn "Thực nhận HH".
          displayConfirm({
            title: 'Duyệt chi',
            content:
              'Bạn có chắc chắn muốn duyệt chi cho căn này? Hành động này không thể hoàn tác.',
            confirmText: 'Duyệt chi',
            onConfirm: async () => {
              try {
                setIsProcessingApprove((prev) => ({ ...prev, [worksheetId]: true }))
                await adminApproveWorksheet({ id: worksheetId, data: { note: '' } })
                toastService.success('Đã duyệt chi thành công')
              } catch (err: any) {
                toastService.error(err?.message || 'Có lỗi xảy ra khi duyệt chi')
              } finally {
                setIsProcessingApprove((prev) => ({ ...prev, [worksheetId]: false }))
              }
            },
          })
        },
      })
    }

    if (canSuspend) {
      actions.push({
        label: 'Tạm ngưng chi trả',
        icon: <IconProhibit size={16} />,
        show: (record) => !record.payment_suspended,
        onClick: (record) => setSuspendDeal({ id: record.deal_id, code: record.deal_code }),
      })
    }

    if (canRelease) {
      actions.push({
        label: 'Bỏ tạm ngưng chi trả',
        icon: <IconCheckcircle size={16} />,
        show: (record) => !!record.payment_suspended,
        onClick: (record) => handleReleaseSuspension(record.representative_pbtv_id),
      })
    }

    return actions
  }, [
    navigate,
    canSuspend,
    canRelease,
    ability,
    isProcessingApprove,
    adminApproveWorksheet,
    displayConfirm,
  ])

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Có lỗi xảy ra khi tải dữ liệu: {(error as any)?.message || 'Unknown error'}
      </div>
    )
  }

  return (
    <>
      <Table
        bordered
        data={data}
        columns={visibleColumns}
        // "Thành tiền nhận về" là group-column 2 tầng → header có 2 dòng; ghim rowSpan cho cột
        // STT tự chèn để không hiện lặp ở cả 2 dòng (cùng cách CommissionSplitTable đã xử lý).
        sttMeta={{ rowSpan: 3 }}
        isLoading={isLoading}
        totalRecords={totalRecords}
        pageSize={pageSize}
        currentPageIndex={currentPageIndex}
        onPaginationChange={onPaginationChange}
        pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
        enableRowSelection={
          selectionEnabled
            ? (row) => row.original.worksheet_status === WORKSHEET_STATUS.DRAFT
            : false
        }
        getRowId={(row) => String(row.worksheet_id)}
        rowSelection={selectionEnabled ? rowSelection : undefined}
        onRowSelectionChange={selectionEnabled ? onRowSelectionChange : undefined}
        enablePagination
        manualPagination
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        className="pb-0"
        showSummaryRow={!!totals}
        summaryRowCount={totalsRowCount}
        showActions={rowActions.length > 0}
        rowActions={rowActions}
        onRowClick={(record) => {
          const pathPattern = APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL
          navigate(pathPattern.replace(':id', record.worksheet_id.toString()))
        }}
        isShowTableColumnConfig={isShowTableColumnConfig}
        columnConfig={columnConfig}
        onColumnConfigApply={handleApply}
        onColumnConfigReset={handleReset}
      />
      {suspendDeal && (
        <PaymentSuspensionDialog
          dealId={suspendDeal.id}
          dealCode={suspendDeal.code}
          isOpen={!!suspendDeal}
          onClose={() => setSuspendDeal(null)}
        />
      )}
    </>
  )
}
