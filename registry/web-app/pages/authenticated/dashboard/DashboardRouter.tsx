import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '@/store/auth-store'
import {
  DASHBOARD_PRESET,
  PRESET_TITLE,
  canSwitchDashboard,
  resolveDashboardPreset,
  type DashboardPreset,
} from '@/features/dashboard/constants/dashboard-blocks'
import PresetDashboard from '@/features/dashboard/components/preset/PresetDashboard'
import DashboardPresetTabs from '@/features/dashboard/components/preset/DashboardPresetTabs'
import DashboardPage from './DashboardPage'

const PRESET_QUERY_KEY = 'preset'

function isKnownPreset(value: string | null): value is DashboardPreset {
  return value !== null && (Object.values(DASHBOARD_PRESET) as string[]).includes(value)
}

/**
 * Một cửa vào duy nhất cho mọi vai trò: `/`.
 *
 * Cố ý KHÔNG làm submenu kiểu "Dashboard kế toán" / "Dashboard CEO" / "Dashboard trưởng phòng" —
 * người dùng không nên phải tự biết mình thuộc loại nào rồi đi tìm mục của mình.
 *
 * Vai trò chưa map preset thì rơi về `DashboardPage` — trang `/` ĐANG CHẠY, y nguyên. Đây là điểm
 * quan trọng nhất của thiết kế: kế toán / TKKD / HR không mất gì cả, chỉ vai trò được map mới đổi,
 * nên rủi ro hồi quy gần bằng không và thêm preset sau này chỉ là thêm một dòng vào map.
 */
const DashboardRouter = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const defaultPreset = resolveDashboardPreset(user?.role?.code)

  /**
   * Ai được đổi bảng: vai trò trong `SWITCHABLE_ROLE_CODES` (chốt nghiệp vụ: chỉ CEO), cộng
   * superuser để QA kiểm được preset của vai trò chưa có tài khoản thật.
   *
   * Người KHÔNG được đổi mà tự sửa `?preset=` trên URL thì tham số bị bỏ qua hoàn toàn — nếu không,
   * TPKD bật preset điều hành là thấy khung công nợ và HH phải trả, trái điều đã chốt.
   */
  const canSwitch = canSwitchDashboard(user?.role?.code) || !!user?.is_superuser

  const requested = searchParams.get(PRESET_QUERY_KEY)
  const selected =
    canSwitch && isKnownPreset(requested) ? requested : (defaultPreset ?? DASHBOARD_PRESET.FULL)

  const handleSwitch = useCallback(
    (next: DashboardPreset) => {
      const params = new URLSearchParams(searchParams)
      // Về đúng bảng mặc định thì bỏ hẳn tham số cho URL sạch, thay vì để `?preset=exec` lủng lẳng.
      if (next === defaultPreset) params.delete(PRESET_QUERY_KEY)
      else params.set(PRESET_QUERY_KEY, next)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams, defaultPreset]
  )

  const tabs =
    canSwitch && defaultPreset ? (
      <DashboardPresetTabs value={selected} onChange={handleSwitch} />
    ) : undefined

  // "Tổng hợp" chính là trang `/` cũ — nó tự dựng khung riêng nên không đi qua PresetDashboard.
  // Vẫn truyền bộ đổi bảng xuống, nếu không thì đổi sang đây xong là mất đường quay lại.
  if (selected === DASHBOARD_PRESET.FULL) return <DashboardPage tabs={tabs} />

  // Có tab rồi thì tiêu đề để "Dashboard" thôi — tab đã nói đang đứng ở bảng nào, ghi
  // "Dashboard điều hành" ngay cạnh tab "Điều hành" là lặp chữ. Vai trò KHÔNG có tab thì tiêu đề
  // phải là tên đầy đủ, vì lúc đó không còn gì khác nói cho họ biết đang xem bảng nào.
  const title = tabs ? 'Dashboard' : PRESET_TITLE[selected]

  return <PresetDashboard preset={selected} title={title} tabs={tabs} />
}

export default DashboardRouter
