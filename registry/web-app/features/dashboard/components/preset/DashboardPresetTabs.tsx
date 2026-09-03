import { Tabs } from '@radix-ui/themes'

import {
  PRESET_TAB_LABEL,
  SWITCHABLE_PRESETS,
  type DashboardPreset,
} from '../../constants/dashboard-blocks'

export type DashboardPresetTabsProps = {
  value: DashboardPreset
  onChange: (preset: DashboardPreset) => void
}

/**
 * Chuyển bảng điều khiển bằng tab — CHỈ hiện với vai trò được phép đổi (hiện tại: CEO).
 *
 * Dùng tab thay dropdown vì mọi lựa chọn hiện ra cùng lúc: CEO thấy ngay có những bảng nào và đang
 * đứng ở đâu, không phải bấm mở ra mới biết. Bốn mục thừa sức vừa một hàng với nhãn rút gọn
 * (`PRESET_TAB_LABEL`), tiêu đề đầy đủ để dành cho `PageTitle`.
 *
 * `px-7` để thẳng hàng với `PageTitle` — quy ước bố cục trong AGENTS.md, đừng đổi thành px khác.
 */
const DashboardPresetTabs = ({ value, onChange }: DashboardPresetTabsProps) => (
  <Tabs.Root value={value} onValueChange={(next) => onChange(next as DashboardPreset)}>
    <Tabs.List
      size="2"
      className="border-border-1 flex gap-1 overflow-x-auto border-b px-7 pb-px"
      aria-label="Chọn bảng điều khiển"
    >
      {SWITCHABLE_PRESETS.map((preset) => (
        <Tabs.Trigger
          key={preset}
          value={preset}
          className="shrink-0 px-4 py-2 text-sm font-medium"
        >
          {PRESET_TAB_LABEL[preset]}
        </Tabs.Trigger>
      ))}
    </Tabs.List>
  </Tabs.Root>
)

export default DashboardPresetTabs
