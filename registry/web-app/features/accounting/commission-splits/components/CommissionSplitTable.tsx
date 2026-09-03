// src/features/accounting/commission-splits/components/CommissionSplitTable.tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'

import { ColoredValueVariant } from '@/api/schema'
import { IconCheckcircle, IconEye, IconProhibit } from '@/assets/icons'
import { Chip, Table } from '@/components/ui'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import type { TableAction, ColumnConfig } from '@/types/table'
import { formatCurrencyVND, formatPct, formatPctFloor } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'

import { formatSummaryCurrency } from '@/utils/table/summary'

import type {
  CommissionSplitListRow,
  PaginatedCommissionSplitListRows,
} from '../services/commission-splits-service'
import { useReleasePaymentSuspension } from '../services/deal-payment-suspensions-service'
import { isWorksheetPaymentPctPinned, worksheetPaymentPct } from '../utils/split-helpers'
import { formatAgencyFee, formatInvoiceMonth, formatRevenueFee } from '../utils/worksheet-fee-cells'

import { PaymentSuspensionDialog } from './PaymentSuspensionDialog'
import { WorksheetBasisCell } from './WorksheetBasisCell'
import { SELLER_COLUMN_SIZE, SELLER_COLUMN_WIDTH, SellerList } from './WorksheetParticipantCells'
import { InvestorNameCell, ProjectNameCell, UnitNumberCell } from './WorksheetIdentityCells'
import { WorksheetStatusChip } from './WorksheetStatusChip'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'

/**
 * Bảng 20.8 có header 2 tầng, và cả hai tầng đều phải ghi đè style mặc định của `Table`
 * (nên có `!`). Gom về hằng số vì mỗi cột khai `meta` hai lần (tier1 + cột con) — trước đây
 * chuỗi này lặp 88 lần, sửa một sắc thái là phải sửa 88 chỗ.
 */
const GROUP_HEADER_CLS = '!bg-neutral-50 !font-bold !text-[11px] !text-neutral-500'
const COLUMN_HEADER_CLS = '!font-semibold !text-neutral-900'

type Props = {
  data: CommissionSplitListRow[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  isShowTableColumnConfig?: boolean
  isAdminView?: boolean
  /**
   * Column totals over the WHOLE filtered set, straight from the API — never summed from
   * `data`, which holds one page. Null in `deal` timeline mode (deal-level constants repeated
   * per period would sum to nonsense); the row hides then.
   */
  totals?: PaginatedCommissionSplitListRows['totals']
  /** Rows behind `totals`, shown next to the "TỔNG CỘNG" label. */
  totalsRowCount?: number | null
}

export const CommissionSplitTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = 25,
  currentPageIndex = 0,
  onPaginationChange,
  isShowTableColumnConfig,
  isAdminView = false,
  totals,
  totalsRowCount,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const canViewExchange = ability.can('retrieve', 'exchange')
  const canViewCollaborator = ability.can('retrieve', 'collaborator')

  const allColumns = useMemo<ColumnDef<CommissionSplitListRow>[]>(() => {
    const cols: ColumnDef<CommissionSplitListRow>[] = [
      {
        id: 'worksheet_code',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'worksheet_code_tier1',
            header: 'Mã phân bổ',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[150px]',
              align: 'left',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'worksheet_code_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[150px]',
                  align: 'left',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => {
                  const detailPathPattern = isAdminView
                    ? APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL
                    : APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL
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
          headerClassName: GROUP_HEADER_CLS,
          frozen: true,
        },
        columns: [
          {
            id: 'project_name_tier1',
            header: 'Dự án',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[180px]',
              align: 'left',
              rowSpan: 2,
              frozen: true,
            },
            columns: [
              {
                id: 'project_name_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
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
          headerClassName: GROUP_HEADER_CLS,
          frozen: true,
        },
        columns: [
          {
            id: 'unit_number_tier1',
            header: 'Mã BĐS',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[160px]',
              align: 'left',
              rowSpan: 2,
              frozen: true,
            },
            columns: [
              {
                id: 'unit_number_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'investor_name_tier1',
            header: 'Chủ đầu tư / Nguồn hàng',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[200px]',
              align: 'left',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'investor_name_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[200px]',
                  align: 'left',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'sellers',
            header: 'Danh sách sale',
            size: SELLER_COLUMN_SIZE,
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: SELLER_COLUMN_WIDTH,
              align: 'left',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'sellers_col',
                header: '',
                size: SELLER_COLUMN_SIZE,
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'deposit_date_tier1',
            header: 'Ngày cọc',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[120px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'deposit_date_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[120px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'list_price_tier1',
            header: 'Giá niêm yết',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[140px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'list_price_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[140px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'basis_tier1',
            // CR STT51 (86eymm0hq), BA chốt 21/08: "Chỉ cần đổi lại tên, Thành tiền DT là số tiền
            // khác". ĐẢO CHIỀU nhãn mà CR STT17 (86eydbph4) chốt ngày 18/08 — BA xác nhận sau khi
            // được cho xem đúng lịch sử đó, nên quyết định muộn hơn thắng. Đừng "sửa lại cho khớp"
            // changelog của STT17.
            header: 'Giá tính phí',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[160px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'basis_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[160px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'fee_pct_tier1',
            // CR STT51: bỏ hậu tố "(%)" là CỐ Ý — ô nay in số tiền khi SA cấu hình phí đại lý
            // theo số tiền (BA 21/08: "đôi khi là %, đôi khi là số tiền … hãy hiển thị hết").
            header: 'Phí đại lý',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[110px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'fee_pct_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[110px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'fee_amount_tier1',
            header: 'Thành tiền phí',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[140px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'fee_amount_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[140px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => formatCurrencyVND(Number(row.original.fee_amount || 0)),
                footer: () => formatSummaryCurrency(totals?.fee_amount),
              },
            ],
          },
        ],
      },
      {
        // CR STT51 (86eymm0hq). Không có chữ cái cột nguồn nên nhóm để trống, giống "Số phiếu thu".
        id: 'revenue',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'revenue_tier1',
            header: 'Phí doanh thu',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[130px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'revenue_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[130px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                // Không có footer: cột này mang HAI đơn vị (tỷ lệ với deal khai %, số tiền với
                // deal khai cố định), nên một dòng tổng dưới nó là con số không đối chiếu được
                // với gì cả. Export cũng để trống ô tổng vì đúng lý do này.
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'bonus_tier1',
            header: 'Thưởng',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[140px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'bonus_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[140px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'total_tier1',
            header: 'Tổng phí + thưởng',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[160px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'total_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[160px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
      {
        id: 'sales_fee_pct',
        header: '(V)',
        meta: {
          align: 'center',
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'sales_fee_pct_tier1',
            header: 'Phí trả sale (%)',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[140px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'sales_fee_pct_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[140px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => formatPct((row.original as any).sales_fee_pct, 2),
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'fee_progress_pct_tier1',
            header: '% TT Phí',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[110px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'fee_progress_pct_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[110px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => {
                  const val = row.original.fee_progress_pct
                  if (val == null) return <span className="text-xs text-neutral-400">—</span>
                  return (
                    <span className="font-semibold text-neutral-900">
                      {formatPct(Number(val), 2)}
                    </span>
                  )
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'sales_fee_amount_tier1',
            header: 'Thành tiền trả sale',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[150px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'sales_fee_amount_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[150px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) =>
                  formatCurrencyVND(Number((row.original as any).sales_fee_amount || 0)),
                footer: () => formatSummaryCurrency((totals as any)?.sales_fee_amount),
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'bonus_progress_pct_tier1',
            header: '% TT Thưởng',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[120px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'bonus_progress_pct_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[120px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => {
                  // Số DẪN XUẤT từ đối chiếu (E3), server ghi. Kỳ chưa ghi gì mà VẪN có tiền thưởng
                  // thì suy ngược từ tiền: cột này từng hiện "—" trên đúng những kỳ đang chia thưởng.
                  const val = row.original.bonus_progress_pct
                  if (val != null) {
                    return (
                      <span className="font-semibold text-neutral-900">
                        {formatPct(Number(val), 2)}
                      </span>
                    )
                  }
                  const bonusMoney = Number((row.original as any).sales_bonus || 0)
                  const bonusBase = Number((row.original as any).bonus || 0)
                  if (bonusMoney > 0 && bonusBase > 0) {
                    return (
                      <span
                        className="font-semibold text-neutral-900"
                        title="Suy từ tiền thưởng đã chia của kỳ."
                      >
                        {formatPct((bonusMoney / bonusBase) * 100, 2)}
                      </span>
                    )
                  }
                  return <span className="text-xs text-neutral-400">—</span>
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'sales_bonus_tier1',
            header: 'Thưởng trả sale',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[140px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'sales_bonus_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[140px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) =>
                  formatCurrencyVND(Number((row.original as any).sales_bonus || 0)),
                footer: () => formatSummaryCurrency((totals as any)?.sales_bonus),
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'total_sales_payout_tier1',
            header: 'Tổng trả sale',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[160px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'total_sales_payout_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[160px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => (
                  <span className="font-semibold text-neutral-900">
                    {formatCurrencyVND(Number(row.original.total_sales_payout || 0))}
                  </span>
                ),
                footer: () => (
                  <span className="font-semibold text-neutral-900">
                    {formatSummaryCurrency((totals as any)?.total_sales_payout)}
                  </span>
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'f2_progress_pct_tier1',
            header: '% TT F2',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[110px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'f2_progress_pct_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[110px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => {
                  const val = row.original.f2_progress_pct
                  if (val == null) return <span className="text-xs text-neutral-400">—</span>
                  return (
                    <span className="font-semibold text-neutral-900">
                      {formatPct(Number(val), 2)}
                    </span>
                  )
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'invoice_no_tier1',
            header: 'Số hoá đơn',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[145px]',
              align: 'left',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'invoice_no_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[145px]',
                  align: 'left',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => (
                  <span
                    className={`font-mono text-xs ${
                      row.original.invoice_no
                        ? 'text-brand-primary-default cursor-pointer hover:underline'
                        : 'text-neutral-400'
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
        // CR STT51 — đặt NGAY SAU "Số hoá đơn" vì hai ô đến từ cùng một hoá đơn đại diện
        // (BA 21/08 Q8). Tách chúng ra xa là mời gọi đọc nhầm tháng của hoá đơn khác.
        id: 'invoice_month',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'invoice_month_tier1',
            header: 'Tháng xuất hoá đơn',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[135px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'invoice_month_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[135px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'receipt_no_tier1',
            header: 'Số phiếu thu',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[145px]',
              align: 'left',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'receipt_no_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[145px]',
                  align: 'left',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => (
                  <span
                    className={`font-mono text-xs ${
                      row.original.receipt_no
                        ? 'text-brand-primary-default cursor-pointer hover:underline'
                        : 'text-neutral-400'
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
        // Column id giữ nguyên 'paid_pct' để không mất cấu hình ẩn/hiện cột người dùng đã lưu.
        // Con số thì lấy theo dial % TT phí đã ghim, fallback Σ % phân bổ phí — xem
        // `worksheetPaymentPct`. KHÔNG đọc `paid_pct` trực tiếp: mẫu số của nó là phí gross
        // nên lệch trần `fee_collected_cap_pct` của Mục 3 (BE PR #2856).
        id: 'paid_pct',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'paid_pct_tier1',
            header: '% Thanh toán',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[150px]',
              align: 'right',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'paid_pct_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[150px]',
                  align: 'right',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => {
                  const pct = worksheetPaymentPct(row.original)
                  const color =
                    pct >= 100 ? 'bg-[#22C55E]' : pct > 0 ? 'bg-[#F97316]' : 'bg-neutral-300'
                  return (
                    <div
                      className="flex flex-col items-end gap-1"
                      title={
                        isWorksheetPaymentPctPinned(row.original)
                          ? 'Dial % TT phí kế toán đã chốt cho kỳ này (Mục 4 màn chi tiết).'
                          : 'Kỳ chưa ghim dial — % tiền phí CĐT đã thanh toán của kỳ (Σ % phân bổ phí, cùng mẫu số với luỹ kế Mục 3).'
                      }
                    >
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className={`h-full ${color}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs whitespace-nowrap">{formatPctFloor(pct, 2)}</span>
                    </div>
                  )
                },
              },
            ],
          },
        ],
      },
      {
        // Nhóm cột 2 tầng: header cha "Thành tiền nhận về" + 2 cột con chưa/có VAT — thay vì
        // 2 cột rời cùng lặp lại tiền tố "Thành tiền nhận về" ở mỗi header. `id` ở cấp cha chỉ
        // để `isAdminView`/`useColumnConfig` toggle CẢ nhóm làm 1 đơn vị — 2 cột con vẫn giữ id
        // riêng (`received_net`/`received`) cho `totals`/footer hoạt động bình thường.
        id: 'received_group',
        header: '(P)',
        meta: {
          align: 'center',
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'received_group_col',
            header: 'Thành tiền nhận về',
            meta: { align: 'center' },
            columns: [
              {
                id: 'received_net',
                header: 'Chưa VAT',
                cell: ({ row }) => {
                  // Cùng quy tắc màu/ẩn hiện với cột "có VAT" — xem ghi chú ở cột 'received'.
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
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[150px]',
                  align: 'right',
                },
              },
              {
                id: 'received',
                header: 'Có VAT',
                cell: ({ row }) => {
                  // Màu neo cùng con số cột "% Thanh toán". Còn hiện/ẩn thì theo tiền thật của dòng:
                  // dial ghim > 0 mà kỳ chưa có phiếu thu nào thì không được vẽ ra tiền nhận về.
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
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[150px]',
                  align: 'right',
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'payment_suspended_tier1',
            header: 'Tạm ngưng chi trả',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[150px]',
              align: 'center',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'payment_suspended_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[150px]',
                  align: 'center',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'status_tier1',
            header: 'Trạng thái',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[140px]',
              align: 'center',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'status_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[140px]',
                  align: 'center',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
                cell: ({ row }) => {
                  // Nhất quán với cột "% Thanh toán": suy từ chính con số đang hiển thị, KHÔNG dùng
                  // `row.status` (BE derive theo received_net/phí gross nên có thể nói "Đã nhận đủ"
                  // trong khi cột % chỉ 69,23). Giống bảng admin dự án đã đổi trước đó.
                  const pct = worksheetPaymentPct(row.original)
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
      // xuống cuối theo yêu cầu — cột nghiệp vụ (chủ đầu tư, dự án, tiền) lên trước.
      // Màn "Giao dịch tiền về đợt này" đổi cùng lúc để giữ invariant CR STT17
      // (`worksheet-list-columns.test.ts`).
      {
        id: 'worksheet_status',
        header: ' ',
        meta: {
          align: 'center',
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'worksheet_status_tier1',
            header: 'Trạng thái duyệt',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[180px]',
              align: 'center',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'worksheet_status_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[180px]',
                  align: 'center',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'dial_deviates_tier1',
            header: 'Duyệt lệch tiền về',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[165px]',
              align: 'center',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'dial_deviates_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[165px]',
                  align: 'center',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
          headerClassName: GROUP_HEADER_CLS,
        },
        columns: [
          {
            id: 'deal_code_tier1',
            header: 'Mã deal',
            meta: {
              headerClassName: COLUMN_HEADER_CLS,
              width: 'w-[175px]',
              align: 'left',
              rowSpan: 2,
            },
            columns: [
              {
                id: 'deal_code_col',
                header: '',
                meta: {
                  headerClassName: COLUMN_HEADER_CLS,
                  width: 'w-[175px]',
                  align: 'left',
                  rowSpan: 2,
                  hiddenHeader: true,
                },
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
    ]
    return isAdminView ? cols.filter((col) => col.id !== 'received_group') : cols
  }, [navigate, isAdminView, totals, canViewExchange, canViewCollaborator])

  const defaultColumnConfig: ColumnConfig[] = useMemo(() => {
    const config = [
      { id: 'worksheet_code', label: 'Mã phân bổ', visible: false, order: 0 },
      // CR 86eym80zg (đợt 2): B, C lên trước D — và là hai cột đông cứng của bảng.
      { id: 'project_name', label: 'Dự án', visible: true, order: 1 },
      { id: 'unit_number', label: 'Mã BĐS', visible: true, order: 2 },
      { id: 'investor_name', label: 'Chủ đầu tư / Nguồn hàng', visible: true, order: 3 },
      // CR 86eyj75hg: (L) còn đúng MỘT cột người bán đã gộp. Khối/Phòng ban KHÔNG phải cột — nằm
      // inline trong ô của từng người (sửa 20/08), nên không có id nào để bật/tắt riêng.
      { id: 'l_group', label: 'Danh sách sale', visible: true, order: 4 },
      { id: 'deposit_date', label: 'Ngày cọc', visible: true, order: 5 },
      { id: 'list_price', label: 'Giá niêm yết', visible: true, order: 6 },
      // CR 86eymm0hq (STT51): 2 nhãn dưới đây ĐẢO CHIỀU quyết định của CR STT17 (18/08) theo
      // đúng chốt của BA ngày 21/08. "Phí đại lý" cố ý không còn hậu tố "(%)".
      { id: 'basis', label: 'Giá tính phí', visible: true, order: 7 },
      { id: 'fee_pct', label: 'Phí đại lý', visible: true, order: 8 },
      { id: 'fee_amount', label: 'Thành tiền phí', visible: true, order: 9 },
      { id: 'revenue', label: 'Phí doanh thu', visible: true, order: 10 },
      { id: 'bonus', label: 'Thưởng', visible: true, order: 11 },
      { id: 'total', label: 'Tổng phí + thưởng', visible: true, order: 12 },
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
    ]
    return isAdminView ? config.filter((c) => c.id !== 'received_group') : config
  }, [isAdminView])

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: isAdminView ? 'admin-deal-period-allocations' : 'accounting-commission-splits',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<CommissionSplitListRow>[]
  }, [columnConfig, allColumns])

  const { mutateAsync: releaseSuspension } = useReleasePaymentSuspension()
  const [suspendDeal, setSuspendDeal] = useState<{ id: number; code: string } | null>(null)

  const handleReleaseSuspension = async (pbtvId: number) => {
    try {
      await releaseSuspension({ pbtv_id: pbtvId, payload: { reason: 'Bỏ tạm ngưng' } })
      toastService.success('Đã bỏ tạm ngưng chi trả thành công')
    } catch (error: any) {
      toastService.error(error?.message || 'Có lỗi xảy ra khi bỏ tạm ngưng chi trả')
    }
  }

  const rowActions: TableAction<CommissionSplitListRow>[] = useMemo(() => {
    /**
     * "Xem chi tiết" đi tới HAI route khác nhau tuỳ `isAdminView`, và hai route đó khai HAI mã
     * quyền khác nhau — nên gate cũng phải rẽ theo đúng nhánh đó (`AppRoute.tsx`):
     *   admin  → `DEAL_PERIOD_ALLOCATION_DETAIL`        ⇒ `dealperiodworksheet.admin_preview`
     *   thường → `MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL` ⇒ `dealperiodworksheet.retrieve`
     * Gate cả hai nhánh bằng `.retrieve` cho gọn là giấu nút của người chỉ có quyền admin_preview,
     * và ngược lại (`docs/ai/conventions.md` §"Gate một hành động bằng đúng quyền…").
     */
    const canOpenDetail = isAdminView
      ? ability.can('admin_preview', 'dealperiodworksheet')
      : ability.can('retrieve', 'dealperiodworksheet')

    const actions: TableAction<CommissionSplitListRow>[] = []

    if (canOpenDetail) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          const pathPattern = isAdminView
            ? APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL
            : APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL
          navigate(pathPattern.replace(':id', record.worksheet_id.toString()))
        },
      })
    }

    if (!isAdminView) {
      // Hai mục này ghi vào `dealpaymentsuspension`, KHÔNG phải vào bảng chia — cùng mã mà
      // `DealPeriodAllocationTable` đang dùng cho đúng cặp hành động này.
      if (ability.can('create', 'dealpaymentsuspension')) {
        actions.push({
          label: 'Tạm ngưng chi trả',
          icon: <IconProhibit size={16} />,
          show: (record) => !record.payment_suspended,
          onClick: (record) => setSuspendDeal({ id: record.deal_id, code: record.deal_code }),
        })
      }
      if (ability.can('release', 'dealpaymentsuspension')) {
        actions.push({
          label: 'Bỏ tạm ngưng chi trả',
          icon: <IconCheckcircle size={16} />,
          show: (record) => !!record.payment_suspended,
          onClick: (record) => handleReleaseSuspension(record.representative_pbtv_id),
        })
      }
    }

    return actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, isAdminView, ability])

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
        // "Thành tiền nhận về" là group-column 2 tầng → header có 2 dòng. Cột STT tự chèn
        // (Table.tsx) không tự biết điều này nên hiện lặp ở CẢ 2 dòng nếu không ghim rowSpan
        // — cùng cách KpiCommissionRuleTable đã xử lý cho bảng có group-column.
        sttMeta={{ rowSpan: 3 }}
        isLoading={isLoading}
        totalRecords={totalRecords}
        pageSize={pageSize}
        currentPageIndex={currentPageIndex}
        onPaginationChange={onPaginationChange}
        pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
        enableRowSelection={false}
        enablePagination
        manualPagination
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        className="pb-0"
        showSummaryRow={!!totals}
        summaryRowCount={totalsRowCount}
        showActions={!isAdminView || rowActions.length > 0}
        rowActions={rowActions}
        onRowClick={(record) => {
          const pathPattern = isAdminView
            ? APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL
            : APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL
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
