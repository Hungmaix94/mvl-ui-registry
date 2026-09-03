import { useState } from 'react'

import { Checkbox } from '@/components/ui'

export type PromotionConfigCreatePromptProps = {
  /** Called whenever the "don't show again" checkbox toggles. */
  onToggleDontShowAgain: (value: boolean) => void
}

/**
 * Body of the "project has no promotion-commission config yet" confirm dialog.
 * Owns the "don't show again" checkbox state and reports it upward via callback.
 */
export const PromotionConfigCreatePrompt = ({
  onToggleDontShowAgain,
}: PromotionConfigCreatePromptProps) => {
  const [checked, setChecked] = useState(false)

  return (
    <div className="text-content-dark-2 flex flex-col gap-4">
      <p className="typo-body-base-regular">
        Dự án này chưa có cấu hình hoa hồng xúc tiến. Bạn có muốn tạo mới cấu hình cho dự án này
        không?
      </p>
      <label className="flex w-fit cursor-pointer items-center gap-2">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => {
            const next = value === true
            setChecked(next)
            onToggleDontShowAgain(next)
          }}
        />
        <span className="typo-body-sm-regular text-content-dark-3">
          Không hiển thị lại thông báo này
        </span>
      </label>
    </div>
  )
}

export default PromotionConfigCreatePrompt
