import { ApiPaths, components } from '@/api/schema'
import { useHrmCommonDashboardRealtime } from '@/features/dashboard/services/dashboard-service'
import { Flex } from '@radix-ui/themes'
import RealtimeButton from './RealtimeButton'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconBed,
  IconCake,
  IconCalendarcheck,
  IconCalendarx,
  IconClipboardtext,
  IconClock,
  IconCrown,
  IconFile,
  IconFiletext,
  IconFilex,
  IconFloppydisk,
  IconGift,
  IconHourglass,
  IconNote,
  IconNotebook,
  IconUsersfour,
  IconWarning,
  IconWarningcircle,
} from '@/assets/icons'
import { useMemo, ReactNode } from 'react'
import { useAbility } from '@/lib/ability'

// Type lấy trực tiếp từ schema OpenAPI — không tự định nghĩa lại để tránh type drift
type DashboardItem = components['schemas']['DashboardItem']
type DashboardItemQueryParams = components['schemas']['DashboardItemQueryParams']

// Icon mapping cho các proposals
const PROPOSAL_ICON_MAP: Record<string, ReactNode> = {
  proposals_post_maternity_benefits: <IconBed />,
  proposals_late_exemption: <IconClock />,
  proposals_overtime_work: <IconHourglass />,
  proposals_paid_leave: <IconCalendarcheck />,
  proposals_unpaid_leave: <IconCalendarx />,
  proposals_maternity_leave: <IconBed />,
  proposals_job_transfer: <IconUsersfour />,
  proposals_asset_allocation: <IconGift />,
  proposals_device_change: <IconFloppydisk />,
}

// Icon mặc định cho các loại khác
const DEFAULT_ICON_MAP: Record<string, ReactNode> = {
  attendance_other_pending: <IconClipboardtext />,
  timesheet_complaints_pending: <IconNote />,
  penalty_tickets_unpaid: <IconFilex />,
  proposals_overdue: <IconWarning />,
  conflicting_workdays: <IconWarningcircle />,
}

const HrmCommonRealtime = () => {
  const ability = useAbility()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const canView = useMemo(() => ability.can('realtime', 'hrm.dashboard.common'), [ability])

  // Don't call API if no permission
  if (!canView) {
    return null
  }

  return <HrmCommonRealtimeContent navigate={navigate} searchParams={searchParams} />
}

export const HrmCommonRealtimeContent = ({
  navigate,
  searchParams,
}: {
  navigate: ReturnType<typeof useNavigate>
  searchParams: URLSearchParams
}) => {
  const { data: response, isLoading } = useHrmCommonDashboardRealtime()

  const handleNavigate = (path: string, queryParams: DashboardItemQueryParams) => {
    // Preserve current query params
    const currentParams = new URLSearchParams(searchParams)

    // Merge with new query params (override if key exists)
    // value có thể là number (vd birthday_month) → ép String cho URLSearchParams
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value != null) currentParams.set(key, String(value))
    })

    navigate(`${path}?${currentParams.toString()}`)
  }

  // Tách 3 nhóm: nhóm chính (đề xuất + các mục khác), nhóm HĐ sắp hết hạn và nhóm sinh nhật
  // (2 nhóm sau cùng hiển thị chung hàng dưới cùng)
  const { mainItems, contractItems, birthdayItems } = useMemo(() => {
    const mainItems: Array<DashboardItem & { icon: ReactNode }> = []
    const contractItems: Array<DashboardItem & { icon: ReactNode }> = []
    const birthdayItems: Array<DashboardItem & { icon: ReactNode }> = []

    if (!response) return { mainItems, contractItems, birthdayItems }

    // proposals_pending → nhóm chính
    const proposalsPending = response.proposals_pending
    if (proposalsPending?.items) {
      proposalsPending.items.forEach((item) => {
        mainItems.push({
          ...item,
          icon: PROPOSAL_ICON_MAP[item.key] || <IconNotebook />,
        })
      })
    }

    // các mục khác → nhóm chính
    const otherKeys = [
      'attendance_other_pending',
      'timesheet_complaints_pending',
      'penalty_tickets_unpaid',
      'proposals_overdue',
      'conflicting_workdays',
    ] as const

    otherKeys.forEach((key) => {
      const item = response[key]
      if (item && typeof item === 'object' && 'count' in item) {
        mainItems.push({
          ...item,
          icon: DEFAULT_ICON_MAP[key] || <IconFile />,
        })
      }
    })

    // contracts_about_to_expire → hàng riêng tách hẳn ở dưới cùng
    const contractsAboutToExpire = response.contracts_about_to_expire
    if (contractsAboutToExpire?.items) {
      contractsAboutToExpire.items.forEach((item) => {
        contractItems.push({
          ...item,
          icon: <IconFiletext />,
        })
      })
    }

    // sinh nhật trong tháng (CR257) → cùng hàng dưới với HĐ sắp hết hạn
    // path + query_params (birthday_month / position__is_leadership / statuses / ordering)
    // đều do BE cung cấp; click-through dùng chung handleNavigate như các mục HĐ sắp hết hạn.
    // Ordering danh sách NV theo ngày sinh (birthday_day) do BE quyết định — KHÔNG override ở FE.
    if (response.birthday_this_month) {
      birthdayItems.push({
        ...response.birthday_this_month,
        icon: <IconCake />,
      })
    }
    if (response.leadership_birthday_this_month) {
      birthdayItems.push({
        ...response.leadership_birthday_this_month,
        icon: <IconCrown />,
      })
    }

    return { mainItems, contractItems, birthdayItems }
  }, [response])

  if (isLoading) {
    return null // TODO: Add skeleton loading
  }

  if (!mainItems.length && !contractItems.length && !birthdayItems.length) {
    return null
  }

  // HĐ sắp hết hạn + sinh nhật trong tháng nằm chung hàng dưới cùng (theo mockup CR257)
  const bottomRowItems = [...contractItems, ...birthdayItems]

  const renderButton = (item: DashboardItem & { icon: ReactNode }) => (
    <RealtimeButton
      key={item.key}
      icon={item.icon}
      label={item.label}
      count={item.count}
      onClick={() => handleNavigate(item.path, item.query_params || {})}
    />
  )

  return (
    <Flex
      direction="column"
      gap="6"
      className="p-10 pb-0"
      data-api={ApiPaths.hrm_dashboard_hrm_common_realtime_retrieve}
    >
      {mainItems.length > 0 && (
        <Flex className="flex-wrap gap-6">{mainItems.map(renderButton)}</Flex>
      )}
      {bottomRowItems.length > 0 && (
        <Flex className="flex-wrap gap-6">{bottomRowItems.map(renderButton)}</Flex>
      )}
    </Flex>
  )
}

export default HrmCommonRealtime
