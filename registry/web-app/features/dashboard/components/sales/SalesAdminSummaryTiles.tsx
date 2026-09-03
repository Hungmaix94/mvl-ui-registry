import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import {
  IconBuildings,
  IconCalendar,
  IconCalendarblank,
  IconChecksquare,
  IconClock,
  IconCoin,
  IconFiletext,
  IconHandshake,
} from '@/assets/icons'
import { LoadingWrapper } from '@/components'
import RealtimeButton from '@/features/dashboard/components/hrm-common/RealtimeButton'
import {
  useAdminDashboardPendingReconciliations,
  useAdminDashboardSummary,
} from '@/features/sales/admin-dashboard/services/admin-dashboard-service'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { getThisWeekRangeApi, getTodayApiDate } from '@/utils/date-utils'
import { RealtimeTilesSkeleton } from './dashboard-skeletons'
import {
  PENDING_RECON_COUNT_LIMIT,
  SALES_ADMIN_DASHBOARD_ACTIONS,
  SALES_ADMIN_DASHBOARD_SUBJECT,
} from './sales-admin-dashboard-constants'

/**
 * Lưới tile của "Tổng quan Sales" — cùng ngôn ngữ hình với lưới HRM ở đầu trang (icon tròn +
 * badge số) thay cho 10 thẻ số liệu cũ.
 *
 * MỘT hàng chảy tự do, tự xuống dòng theo bề rộng màn — không chia hàng cứng theo nhóm. Thứ tự
 * trong mảng vẫn đi theo ngữ nghĩa (kết quả tháng → hàng chờ duyệt → nhịp gần đây) nên ở màn rộng
 * các ô cùng nhóm vẫn nằm cạnh nhau, còn màn hẹp thì không chừa khoảng trống ở cuối mỗi nhóm.
 *
 * Badge KHÔNG cắt ở "99+" (`maxCount={null}`): ở đây có ô đếm hàng trăm ("Dự án đang mở bán"),
 * cắt là mất số thật chứ không phải rút gọn. Lưới HRM giữ nguyên "99+" của nó.
 */

type Tile = {
  key: string
  icon: ReactNode
  label: string
  count: number
  onClick: () => void
}

/**
 * Ô hàng chờ đọc số CỦA CHÍNH NGƯỜI DÙNG.
 *
 * `*_mine` là số phiếu đang dừng ở đúng bậc duyệt mà người đang đăng nhập được ký; nó là `null`
 * — không phải 0 — khi người dùng không có quyền duyệt ở bậc nào cả, và khi đó ô đổi nhãn sang
 * "chờ xử lý" rồi đếm tổng mọi bậc (SRS 18.7 FSD §4.1).
 *
 * Thẻ cũ hiện "69 / 75" (của tôi / tổng). Mẫu số đã bỏ theo yêu cầu: badge chỉ còn chỗ cho một
 * con số, và con số người duyệt cần là phần việc của chính họ.
 */
type QueueCounter = { mine: number | null; total: number }

function readQueueCounter(data: unknown, totalKey: string, mineKey: string): QueueCounter {
  // Cast tại chỗ dùng: `*_mine` lên trước khi schema được sinh lại.
  const raw = (data ?? {}) as Record<string, number | null | undefined>
  return { mine: raw[mineKey] ?? null, total: raw[totalKey] ?? 0 }
}

const queueCount = ({ mine, total }: QueueCounter) => mine ?? total

const queueLabel = ({ mine }: QueueCounter, subject: string) =>
  mine === null ? `${subject} chờ xử lý` : `${subject} chờ tôi duyệt`

function SalesAdminSummaryTiles() {
  const ability = useAbility()
  const navigate = useNavigate()

  const canViewSummary = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.SUMMARY,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )
  const canViewPendingRecon = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.PENDING_RECONCILIATIONS,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )

  // `enabled` theo đúng quyền của từng endpoint: thiếu quyền mà vẫn gọi thì nhận 403 và đẩy một
  // lỗi vô nghĩa lên toast.
  const { data, isLoading } = useAdminDashboardSummary(undefined, { enabled: canViewSummary })
  const { data: pendingRecon, isLoading: isLoadingRecon } = useAdminDashboardPendingReconciliations(
    { limit: PENDING_RECON_COUNT_LIMIT },
    { enabled: canViewPendingRecon }
  )

  const tiles = useMemo<Tile[]>(() => {
    const today = getTodayApiDate()
    const week = getThisWeekRangeApi()

    // Deep-link mỗi tile sang đúng màn danh sách, lọc sẵn để danh sách khớp con số trên badge.
    const goToList = (path: string, params: Record<string, string> = {}) => {
      const search = new URLSearchParams(params).toString()
      navigate(search ? `${path}?${search}` : path)
    }

    const bookings = readQueueCounter(data, 'pending_bookings', 'pending_bookings_mine')
    const deposits = readQueueCounter(data, 'pending_deposits', 'pending_deposits_mine')
    const sheets = readQueueCounter(
      data,
      'pending_transaction_sheets',
      'pending_transaction_sheets_mine'
    )

    /** Kết quả tháng + hàng chờ duyệt của tôi + nhịp gần đây — tất cả đọc từ `summary/`. */
    const summaryTiles: Tile[] = canViewSummary
      ? [
          {
            key: 'active_projects',
            icon: <IconBuildings />,
            label: 'Dự án đang mở bán',
            count: data?.active_projects ?? 0,
            onClick: () => goToList(APP_PATH.PROJECT_MANAGEMENT, { is_active: 'true' }),
          },
          {
            key: 'sold_this_month',
            icon: <IconHandshake />,
            label: 'Đã bán trong tháng',
            count: data?.sold_this_month ?? 0,
            onClick: () =>
              goToList(APP_PATH.DEAL, {
                sold: 'true',
                deposit_month: String(data?.month ?? ''),
                deposit_year: String(data?.year ?? ''),
              }),
          },
          {
            key: 'pending_bookings',
            icon: <IconClock />,
            label: queueLabel(bookings, 'Booking'),
            count: queueCount(bookings),
            onClick: () => goToList(APP_PATH.PROJECT_BOOKING_CONTRACT, { awaiting_me: 'true' }),
          },
          {
            key: 'pending_deposits',
            icon: <IconCoin />,
            label: queueLabel(deposits, 'Đặt cọc'),
            count: queueCount(deposits),
            onClick: () => goToList(APP_PATH.DEPOSIT_CONTRACT, { awaiting_me: 'true' }),
          },
          {
            key: 'pending_transaction_sheets',
            icon: <IconFiletext />,
            label: queueLabel(sheets, 'Phiếu giao dịch'),
            count: queueCount(sheets),
            onClick: () => goToList(APP_PATH.TRANSACTION_SHEET, { awaiting_me: 'true' }),
          },
        ]
      : []

    /** Ô đối soát đọc endpoint khác và gate bằng quyền khác, nên đứng riêng khi ghép mảng. */
    const reconTile: Tile[] = canViewPendingRecon
      ? [
          {
            key: 'pending_reconciliations',
            icon: <IconChecksquare />,
            label: 'Đối soát chờ duyệt',
            count: pendingRecon?.count ?? 0,
            // Cố ý KHÔNG kèm bộ lọc trạng thái: tập "chờ duyệt" do BE định nghĩa, FE không biết
            // nó gồm những trạng thái nào. Đây đúng là đích mà nút "Xem tất cả" của khối danh
            // sách cũ trỏ tới — tự đoán một `status` là dựng ra một lời khai sai.
            onClick: () => goToList(APP_PATH.INVESTOR_RECONCILIATION),
          },
        ]
      : []

    const paceTiles: Tile[] = canViewSummary
      ? [
          {
            key: 'bookings_today',
            icon: <IconCalendar />,
            label: 'Booking hôm nay',
            count: data?.bookings_today ?? 0,
            onClick: () =>
              goToList(APP_PATH.PROJECT_BOOKING_CONTRACT, {
                booking_date_from: today,
                booking_date_to: today,
              }),
          },
          {
            key: 'bookings_this_week',
            icon: <IconCalendarblank />,
            label: 'Booking tuần này',
            count: data?.bookings_this_week ?? 0,
            onClick: () =>
              goToList(APP_PATH.PROJECT_BOOKING_CONTRACT, {
                booking_date_from: week.from,
                booking_date_to: week.to,
              }),
          },
          {
            key: 'deposits_today',
            icon: <IconCalendar />,
            label: 'Đặt cọc hôm nay',
            count: data?.deposits_today ?? 0,
            onClick: () =>
              goToList(APP_PATH.DEPOSIT_CONTRACT, {
                contract_date_from: today,
                contract_date_to: today,
              }),
          },
          {
            key: 'deposits_this_week',
            icon: <IconCalendarblank />,
            label: 'Đặt cọc tuần này',
            count: data?.deposits_this_week ?? 0,
            onClick: () =>
              goToList(APP_PATH.DEPOSIT_CONTRACT, {
                contract_date_from: week.from,
                contract_date_to: week.to,
              }),
          },
        ]
      : []

    return [...summaryTiles, ...reconTile, ...paceTiles]
  }, [canViewPendingRecon, canViewSummary, data, navigate, pendingRecon])

  if (!canViewSummary && !canViewPendingRecon) return null

  const isBusy = (canViewSummary && isLoading) || (canViewPendingRecon && isLoadingRecon)

  return (
    <LoadingWrapper
      isLoading={isBusy}
      containerHeight={180}
      loadingSkeleton={<RealtimeTilesSkeleton count={10} />}
    >
      <Flex className="flex-wrap gap-6">
        {tiles.map((tile) => (
          <RealtimeButton
            key={tile.key}
            icon={tile.icon}
            label={tile.label}
            count={tile.count}
            maxCount={null}
            onClick={tile.onClick}
          />
        ))}
      </Flex>
    </LoadingWrapper>
  )
}

export default SalesAdminSummaryTiles
