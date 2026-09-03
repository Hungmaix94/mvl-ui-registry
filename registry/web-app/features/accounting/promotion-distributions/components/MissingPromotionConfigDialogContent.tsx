import { Flex } from '@radix-ui/themes'

import { Button } from '@/components/ui'
import { IconLink } from '@/assets/icons'

export type MissingPromotionConfigDialogContentProps = {
  /** Project display label, e.g. "MVL01 - Dự án A". */
  projectLabel: string
  /** Close the dialog without doing anything. */
  onClose: () => void
  /** Open the project's commission-config tab (in a new browser tab) to create the config. */
  onOpenConfig: () => void
}

/**
 * Shown when creating a promotion distribution fails with 409 because the project has no
 * promotion-commission config yet. Offers to open the project's "Cấu hình HH" tab to set it up.
 */
export const MissingPromotionConfigDialogContent = ({
  projectLabel,
  onClose,
  onOpenConfig,
}: MissingPromotionConfigDialogContentProps) => {
  return (
    <div className="flex flex-col gap-6">
      <p className="typo-body-base-regular text-content-dark-2">
        Dự án <b className="text-content-dark-1">{projectLabel}</b> chưa có cấu hình hoa hồng. Vui
        lòng cấu hình hoa hồng cho dự án này trước khi thêm vào kỳ.
      </p>
      <Flex justify="end" gap="3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Đóng
        </Button>
        <Button type="button" onClick={onOpenConfig} rightIcon={<IconLink size={16} />}>
          Cấu hình ngay
        </Button>
      </Flex>
    </div>
  )
}

export default MissingPromotionConfigDialogContent
