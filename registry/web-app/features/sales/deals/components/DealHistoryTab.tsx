import React, { useMemo, useState } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { ColumnDef } from '@tanstack/react-table'
import { Table as CustomTable, Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import { useDealCommissionLogs } from '@/features/sales/deals/services/deal-service'
import { Loader2, ArrowRight, History } from 'lucide-react'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { isHiddenCommissionField } from '@/constants/commission'

const FIELD_TRANSLATIONS: Record<string, string> = {
  // Promotion
  pct_relationship: 'Phí quan hệ',
  pct_planning: 'Phí lập kế hoạch',
  pct_packaging: 'Phí đóng gói',
  pct_sales_support: 'Phí hỗ trợ bán hàng',
  pct_coordination: 'Phí điều phối',

  // Split & Config
  pct_agency_fee: 'Phí môi giới (CĐT)',
  pct_investor_bonus: 'Thưởng CĐT',
  pct_revenue: 'Tỷ lệ tính doanh thu',
  pct_investor_bonus_to_sale: 'Hoa hồng cơ bản của sàn',
  pct_shared_bonus: 'Thưởng đại lý (%)',
  amt_shared_bonus: 'Thưởng đại lý',

  pct_sale_commission: 'HH Sale/Đại lý',
  pct_mv_bonus_to_sale: 'Thưởng nóng MV cho Sale',
  pct_f2_commission: 'HH cho Sàn liên kết',
  pct_f2_bonus: 'Thưởng nóng CĐT cho Sàn liên kết',
  pct_mv_bonus_to_f2: 'Thưởng nóng MV cho Sàn liên kết',

  // Participation
  pct_deal_share: 'Tỷ lệ tham gia (%)',
  pct_participation: 'Tỷ lệ tham gia (%)',
  participation_percentage: 'Tỷ lệ tham gia (%)',
  participation: 'Tỷ lệ tham gia (%)',

  // Categories
  agency_fee: 'Phí Môi giới',
  project_bonus: 'Thưởng dự án',
  mv_bonus: 'Thưởng MV',
  investor_bonus: 'Thưởng CĐT',
}

const ROLE_TRANSLATIONS: Record<string, string> = {
  ceo: 'TGĐ',
  deputy_ceo: 'P.TGĐ',
  project_director: 'GĐ Dự án',
  sales_director: 'GĐ Bán hàng',
  sales_manager: 'TP KD',
  head_sales_secretary: 'T.P TK Bán hàng',
  project_secretary: 'TK Dự án',
  branch_director: 'GĐ Chi nhánh',
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  agency_fee: 'Thưởng quản lý',
  project_bonus: 'Thưởng dự án',
  mv_bonus: 'Thưởng quản lý bổ sung',
  investor_bonus: 'Thưởng quản lý từ CDT',
}

const EVENT_TYPE_TRANSLATIONS: Record<string, { label: string; tone: ColoredValueVariant }> = {
  initial_creation: { label: 'Khởi tạo', tone: ColoredValueVariant.GREY },
  system_recalculation: { label: 'Hệ thống tính lại', tone: ColoredValueVariant.BLUE },
  custom_override: { label: 'Ghi đè thủ công', tone: ColoredValueVariant.YELLOW },
  post_confirmed_override: { label: 'Ghi đè sau chốt', tone: ColoredValueVariant.ORANGE },
  override_cleared: { label: 'Xóa ghi đè', tone: ColoredValueVariant.GREY },
  price_reconciliation: { label: 'Đối chiếu giá', tone: ColoredValueVariant.GREEN },
  recipient_reassignment: { label: 'Đổi người nhận', tone: ColoredValueVariant.BLUE },
  cancellation: { label: 'Hủy bỏ', tone: ColoredValueVariant.RED },
  manual_create: { label: 'Tạo thủ công', tone: ColoredValueVariant.GREEN },
  untracked: { label: 'Không track', tone: ColoredValueVariant.GREY },
  investor_recon_cascade: { label: 'Đối chiếu CĐT', tone: ColoredValueVariant.GREEN },
}

const translateCategory = (key: string, log?: any) => {
  if (!key) return 'Không rõ'
  let label = FIELD_TRANSLATIONS[key] || key

  if (key.startsWith('mgmt_')) {
    const match = key.match(/^mgmt_(.*)_(agency_fee|project_bonus|mv_bonus|investor_bonus)$/)
    if (match) {
      const role = ROLE_TRANSLATIONS[match[1]] || match[1]
      const cat = CATEGORY_TRANSLATIONS[match[2]] || match[2]
      label = `${cat} (${role})`
    }
  }

  const recipient =
    log?.recipient_name ||
    log?.share?.recipient_name ||
    log?.share?.resolved_employee?.fullname ||
    log?.share?.collaborator?.name ||
    log?.share?.exchange?.name

  if (recipient) {
    return `${label} (${recipient})`
  }

  return label
}

interface Props {
  dealId: number
}

export const DealHistoryTab: React.FC<Props> = ({ dealId }) => {
  const { data, isLoading, error } = useDealCommissionLogs(dealId)
  const [search, setSearch] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        header: 'Thời gian',
        accessorKey: 'created_at',
        size: 140,
        cell: ({ row }) => (
          <span className="text-content-dark-2 text-xs font-medium">
            {formatDate(row.getValue('created_at'), 'dd/MM/yyyy • HH:mm')}
          </span>
        ),
      },
      {
        header: 'Người thực hiện',
        id: 'changed_by',
        size: 160,
        cell: ({ row }) => {
          const log = row.original
          return (
            <span className="text-content-dark-1 text-xs font-semibold">
              {log.changed_by_name ||
                log.changed_by?.fullname ||
                log.changed_by?.username ||
                'Hệ thống'}
            </span>
          )
        },
      },
      {
        header: 'Hành động',
        id: 'event_type',
        size: 140,
        cell: ({ row }) => {
          const log = row.original
          const ev = EVENT_TYPE_TRANSLATIONS[log.event_type] || {
            label: log.event_type,
            tone: ColoredValueVariant.GREY,
          }
          return <Chip label={ev.label} variant={ev.tone} size="small" />
        },
      },
      {
        header: 'Hạng mục',
        accessorKey: 'category',
        size: 180,
        cell: ({ row }) => (
          <span className="text-content-dark-2 text-xs font-medium">
            {translateCategory(row.getValue('category'), row.original)}
          </span>
        ),
      },
      {
        header: 'Tỷ lệ thay đổi',
        id: 'percentage_change',
        size: 130,
        meta: { align: 'center' },
        cell: ({ row }) => {
          const log = row.original
          const rawOldPct = log.old_percentage ?? log.old_participation
          const rawNewPct =
            log.new_percentage ?? log.new_participation ?? log.participation_percentage
          const oldPct = rawOldPct != null ? parseFloat(rawOldPct) : null
          const newPct = rawNewPct != null ? parseFloat(rawNewPct) : null

          if (
            oldPct === newPct ||
            (oldPct === null && newPct === 0) ||
            (oldPct === 0 && newPct === null)
          ) {
            return <span className="text-content-dark-3 text-xs">-</span>
          }
          // old_percentage/new_percentage là numeric(14,10) — giữ đủ 10 chữ số thập phân.
          // Nhánh participation vẫn là numeric(5,2) nên trần rộng hơn không đổi cách hiện.
          return (
            <div className="flex items-center justify-center gap-2 font-medium">
              <span className="text-content-dark-3 text-xs line-through">
                {oldPct !== null ? formatPercent(oldPct, false, 10) : formatPercent(0)}
              </span>
              <ArrowRight className="text-content-dark-3 h-3 w-3" />
              <span className="text-data-green-default text-xs font-semibold">
                {newPct !== null ? formatPercent(newPct, false, 10) : formatPercent(0)}
              </span>
            </div>
          )
        },
      },
      {
        header: 'Số tiền thay đổi',
        id: 'amount_change',
        size: 160,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const log = row.original
          let oldAmt = log.old_amount != null ? parseFloat(log.old_amount) : null
          let newAmt = log.new_amount != null ? parseFloat(log.new_amount) : null

          // Fallback to calculated amount for percentage shares
          if ((oldAmt === null || oldAmt === 0) && (newAmt === null || newAmt === 0)) {
            if (log.old_calculated_amount != null || log.new_calculated_amount != null) {
              oldAmt = log.old_calculated_amount != null ? parseFloat(log.old_calculated_amount) : 0
              newAmt = log.new_calculated_amount != null ? parseFloat(log.new_calculated_amount) : 0
            }
          }

          if (
            oldAmt === newAmt ||
            (oldAmt === null && newAmt === 0) ||
            (oldAmt === 0 && newAmt === null)
          ) {
            return <span className="text-content-dark-3 text-xs">-</span>
          }
          return (
            <div className="flex items-center justify-end gap-2 font-medium">
              <span className="text-content-dark-3 text-xs line-through">
                {oldAmt !== null ? formatCurrencyVND(oldAmt) : '0'}
              </span>
              <ArrowRight className="text-content-dark-3 h-3 w-3" />
              <span className="text-data-green-default text-xs font-semibold">
                {newAmt !== null ? formatCurrencyVND(newAmt) : '0'}
              </span>
            </div>
          )
        },
      },
      {
        header: 'Ghi chú',
        accessorKey: 'note',
        size: 200,
        cell: ({ row }) => {
          const note = row.getValue<string>('note')
          if (!note) return <span className="text-content-dark-3 text-xs">-</span>
          return <span className="text-content-dark-2 text-xs italic">{note}</span>
        },
      },
    ],
    []
  )

  const logs = useMemo(() => {
    return (data as any)?.data || (data as any)?.commission_logs || data || []
  }, [data])

  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return []
    return logs.filter((log: any) => {
      // "Thưởng cho sàn LK từ MV" (mv_bonus_to_f2) ẩn khỏi toàn bộ UI (ClickUp 86eycwqq1).
      if (isHiddenCommissionField(log?.category)) return false

      if (eventTypeFilter !== 'all' && log.event_type !== eventTypeFilter) {
        return false
      }

      if (!search) return true
      const query = search.toLowerCase()
      const name = (
        log.changed_by_name ||
        log.changed_by?.fullname ||
        log.changed_by?.username ||
        'Hệ thống'
      ).toLowerCase()
      const cat = translateCategory(log.category).toLowerCase()
      const note = (log.note || '').toLowerCase()
      const reason = (log.reason || '').toLowerCase()

      return (
        name.includes(query) ||
        cat.includes(query) ||
        note.includes(query) ||
        reason.includes(query)
      )
    })
  }, [logs, search, eventTypeFilter])

  if (isLoading) {
    return (
      <Flex align="center" justify="center" className="h-40">
        <Loader2 className="text-content-dark-3 h-6 w-6 animate-spin" />
      </Flex>
    )
  }

  if (error) {
    return (
      <Flex align="center" justify="center" className="text-data-red-default h-40 text-sm">
        Có lỗi xảy ra khi tải lịch sử.
      </Flex>
    )
  }

  if (!Array.isArray(logs) || logs.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="3"
        className="border-border-1 h-60 rounded-xl border bg-white"
      >
        <History className="text-content-dark-4 h-10 w-10 opacity-50" />
        <Text className="text-content-dark-3 text-sm">Chưa có dữ liệu lịch sử thay đổi.</Text>
      </Flex>
    )
  }

  return (
    <div className="border-border-1 overflow-hidden rounded-lg border bg-white">
      <div className="border-border-1 bg-surface-primary-subtle flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
        <Text className="typo-body-base-semibold text-content-dark-1 flex items-center gap-2">
          <History className="text-content-dark-2 h-5 w-5" />
          Lịch sử thay đổi cấu hình hoa hồng
        </Text>

        <Flex gap="3" align="center" className="flex-wrap">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border-1 w-64 rounded border px-3 py-1.5 text-xs outline-none focus:border-neutral-300 focus:ring-1 focus:ring-neutral-200"
          />
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="border-border-1 text-content-dark-1 rounded border bg-white px-3 py-1.5 text-xs outline-none focus:border-neutral-300"
          >
            <option value="all">Tất cả hành động</option>
            <option value="initial_creation">Khởi tạo</option>
            <option value="system_recalculation">Hệ thống tính lại</option>
            <option value="custom_override">Ghi đè thủ công</option>
            <option value="price_reconciliation">Đối chiếu giá</option>
            <option value="recipient_reassignment">Đổi người nhận</option>
            <option value="cancellation">Hủy bỏ</option>
          </select>
        </Flex>
      </div>

      <CustomTable<any>
        className="border-t-0 !p-0 text-xs shadow-none"
        bordered={false}
        columns={columns}
        data={filteredLogs}
        enablePagination={false}
      />
    </div>
  )
}
