import { Flex, Text } from '@radix-ui/themes'
import { useMemo, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ApiPaths, components } from '@/api/schema'
import { IconBuildings, IconHandshake, IconStorefront } from '@/assets/icons'
import RealtimeButton from '@/features/dashboard/components/hrm-common/RealtimeButton'
import { usePartnerDashboardRealtime } from '@/features/dashboard/services/dashboard-service'
import { useAbility } from '@/lib/ability'
import {
  SALES_ADMIN_DASHBOARD_ACTIONS,
  SALES_ADMIN_DASHBOARD_SUBJECT,
} from '@/features/dashboard/components/sales/sales-admin-dashboard-constants'

type PartnerDashboardItem = components['schemas']['PartnerDashboardItem']

const ICON_MAP: Record<string, ReactNode> = {
  investor_established_this_month: <IconBuildings />,
  exchange_established_this_month: <IconStorefront />,
  source_exchange_established_this_month: <IconHandshake />,
}

/**
 * Sinh nhật đối tác trong tháng — CR STT27 (ClickUp 86eykqg66).
 *
 * Ba tile, mỗi tile trỏ tới ĐÚNG MỘT màn danh sách. Không gộp "sàn" làm một tile: "Nguồn sàn" và
 * "Sàn liên kết" là hai lát cắt của cùng một bảng ở BE, nên một tile gộp sẽ dẫn người dùng tới màn
 * hiện ít dòng hơn con số trên badge.
 *
 * `path` và `query_params` do BE quyết, FE không tự dựng — nhờ vậy con số trên tile và bộ lọc ở màn
 * đích luôn sinh ra từ cùng một nguồn.
 */
const PartnerRealtime = () => {
  const ability = useAbility()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Cụm này đã chuyển từ đầu trang xuống trong "Tổng quan Sales", nên nó gate theo quyền của chính
  // cụm đó — không còn theo quyền hai màn đối tác nữa. Đổi lại: ai chỉ có quyền CĐT/Sàn mà không có
  // `sales.admindashboard.summary` thì không còn thấy tile sinh nhật.
  const canView = useMemo(
    () => ability.can(SALES_ADMIN_DASHBOARD_ACTIONS.SUMMARY, SALES_ADMIN_DASHBOARD_SUBJECT),
    [ability]
  )

  if (!canView) {
    return null
  }

  return <PartnerRealtimeContent navigate={navigate} searchParams={searchParams} />
}

export const PartnerRealtimeContent = ({
  navigate,
  searchParams,
}: {
  navigate: ReturnType<typeof useNavigate>
  searchParams: URLSearchParams
}) => {
  const { data: response, isLoading } = usePartnerDashboardRealtime()

  const items = useMemo(() => {
    if (!response) return []
    // Đọc theo thứ tự cố định thay vì Object.values(): thứ tự key trong JSON không phải hợp đồng,
    // và tile phải xếp cùng thứ tự với cây menu (CĐT → Sàn liên kết → Nguồn sàn).
    return (
      [
        'investor_established_this_month',
        'exchange_established_this_month',
        'source_exchange_established_this_month',
      ] as const
    )
      .map((key) => response[key] as PartnerDashboardItem | undefined)
      .filter((item): item is PartnerDashboardItem => Boolean(item))
  }, [response])

  const handleNavigate = (item: PartnerDashboardItem) => {
    // Giữ lại query param hiện có của dashboard rồi chồng param của tile lên, giống HrmCommonRealtime.
    const params = new URLSearchParams(searchParams)
    Object.entries(item.query_params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // value có thể là number (established_month) → ép String cho URLSearchParams
        params.set(key, String(value))
      }
    })
    navigate(`${item.path}?${params.toString()}`)
  }

  if (isLoading || !items.length) {
    return null
  }

  return (
    <Flex
      direction="column"
      gap="4"
      data-api={ApiPaths.realestate_dashboard_partner_realtime_retrieve}
    >
      <Text className="typo-body-base-semibold text-content-dark-1">
        Sinh nhật đối tác trong tháng
      </Text>
      <Flex className="flex-wrap gap-6">
        {items.map((item) => (
          <RealtimeButton
            key={item.key}
            icon={ICON_MAP[item.key]}
            label={item.label}
            count={item.count}
            onClick={() => handleNavigate(item)}
          />
        ))}
      </Flex>
    </Flex>
  )
}

export default PartnerRealtime
