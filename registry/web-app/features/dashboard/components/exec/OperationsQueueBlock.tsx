import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { LoadingWrapper } from '@/components'
import { IconClipboardtext, IconCoin, IconFile, IconNote, IconUsersfour } from '@/assets/icons'
import RealtimeButton from '@/features/dashboard/components/hrm-common/RealtimeButton'
import { useManagerDashboardRealtime } from '@/features/dashboard/services/dashboard-service'
import { useAdminDashboardSummary } from '@/features/sales/admin-dashboard/services/admin-dashboard-service'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes/AppRoute.constant'
import {
  SALES_ADMIN_DASHBOARD_ACTIONS,
  SALES_ADMIN_DASHBOARD_SUBJECT,
} from '../sales/sales-admin-dashboard-constants'

/**
 * "Việc cần xử lý" — hàng đợi phê duyệt của trưởng phòng / giám đốc, dạng ô tròn.
 *
 * Gộp hai nguồn vào MỘT lưới thay vì hai dải thẻ rời:
 * - `hrm/dashboard/manager/realtime` → đề xuất cần duyệt, KPI cần đánh giá, đánh giá thử việc/tái ký
 * - `sales/admin-dashboard/summary`  → booking / đặt cọc / phiếu giao dịch chờ duyệt
 *
 * Dùng lại `RealtimeButton` của lưới HRM để hai chỗ trông như một, thay vì dựng ô tròn nhái lại.
 *
 * Chỉ hiện mục có việc (`count > 0`): dashboard vận hành mà bày một dãy số 0 thì người ta thôi
 * không nhìn nó nữa. Không còn việc nào thì nói thẳng một câu.
 */

type QueueItem = { key: string; label: string; count: number; icon: ReactNode; onClick: () => void }

function OperationsQueueBlock() {
  const navigate = useNavigate()
  const ability = useAbility()

  const { data: manager, isLoading: loadingManager } = useManagerDashboardRealtime()
  const canViewSales = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.SUMMARY,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )
  const { data: sales, isLoading: loadingSales } = useAdminDashboardSummary(undefined, {
    enabled: canViewSales,
  })

  const goTo = (path: string, params: Record<string, string> = {}) => {
    const search = new URLSearchParams(params).toString()
    navigate(search ? `${path}?${search}` : path)
  }

  const items = useMemo<QueueItem[]>(() => {
    const out: QueueItem[] = []

    // BE trả sẵn `path` + `query_params` cho từng mục; `path` là null khi không có ngữ cảnh để đi
    // tới (vd chưa mở kỳ KPI) — lúc đó vẫn hiện số nhưng bấm không đi đâu, đừng dựng link bịa.
    const managerItems = [
      { field: 'proposals_to_verify', icon: <IconFile /> },
      { field: 'kpi_assessments_pending', icon: <IconNote /> },
      { field: 'intern_evaluations_pending_manager', icon: <IconUsersfour /> },
      { field: 'recontract_evaluations_pending_manager', icon: <IconUsersfour /> },
      { field: 'intern_evaluations_pending_hr', icon: <IconClipboardtext /> },
      { field: 'recontract_evaluations_pending_hr', icon: <IconClipboardtext /> },
    ] as const

    for (const { field, icon } of managerItems) {
      const item = (manager as Record<string, unknown> | undefined)?.[field] as
        | {
            key?: string
            label?: string
            count?: number
            path?: string | null
            query_params?: Record<string, unknown>
          }
        | undefined
      if (!item || !item.count) continue
      out.push({
        key: item.key ?? field,
        label: item.label ?? field,
        count: item.count,
        icon,
        onClick: () => {
          if (!item.path) return
          const params: Record<string, string> = {}
          Object.entries(item.query_params ?? {}).forEach(([k, v]) => {
            if (v != null) params[k] = String(v)
          })
          goTo(item.path, params)
        },
      })
    }

    if (canViewSales) {
      // `*_mine` là số chờ ĐÚNG bước duyệt của người này; null nghĩa là họ không có quyền duyệt
      // nào nên rơi về tổng (xem ghi chú `readQueueCounter` trong SalesAdminSummaryTiles).
      const raw = (sales ?? {}) as Record<string, number | null | undefined>
      const salesItems = [
        {
          mine: 'pending_bookings_mine',
          total: 'pending_bookings',
          label: 'Booking chờ duyệt',
          path: APP_PATH.PROJECT_BOOKING_CONTRACT,
          icon: <IconClipboardtext />,
        },
        {
          mine: 'pending_deposits_mine',
          total: 'pending_deposits',
          label: 'Đặt cọc chờ duyệt',
          path: APP_PATH.DEPOSIT_CONTRACT,
          icon: <IconCoin />,
        },
        {
          mine: 'pending_transaction_sheets_mine',
          total: 'pending_transaction_sheets',
          label: 'Phiếu giao dịch chờ duyệt',
          path: APP_PATH.TRANSACTION_SHEET,
          icon: <IconFile />,
        },
      ] as const

      for (const s of salesItems) {
        const count = raw[s.mine] ?? raw[s.total] ?? 0
        if (!count) continue
        out.push({
          key: s.total,
          label: s.label,
          count,
          icon: s.icon,
          onClick: () => goTo(s.path, { awaiting_me: 'true' }),
        })
      }
    }

    return out
  }, [manager, sales, canViewSales]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="border-border-1 bg-background-1 flex flex-col gap-4 rounded-lg border p-4">
      <Flex direction="column" align="start" gap="1">
        <h2 className="typo-body-lg-semibold text-content-dark-1">Việc cần xử lý</h2>
        <p className="typo-body-sm text-content-dark-3">
          Đề xuất, đánh giá và hồ sơ đang chờ bạn duyệt — bấm để mở danh sách
        </p>
      </Flex>

      <LoadingWrapper isLoading={loadingManager || loadingSales}>
        {items.length === 0 ? (
          <div className="text-content-dark-3 typo-body-sm flex h-[100px] items-center justify-center">
            Không có việc nào đang chờ bạn duyệt
          </div>
        ) : (
          <Flex className="flex-wrap gap-6">
            {items.map((item) => (
              <RealtimeButton
                key={item.key}
                icon={item.icon}
                label={item.label}
                count={item.count}
                onClick={item.onClick}
              />
            ))}
          </Flex>
        )}
      </LoadingWrapper>
    </div>
  )
}

export default OperationsQueueBlock
