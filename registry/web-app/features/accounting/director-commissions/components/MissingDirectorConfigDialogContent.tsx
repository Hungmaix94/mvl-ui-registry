import { Flex } from '@radix-ui/themes'

import { Button } from '@/components/ui'
import { IconLink } from '@/assets/icons'

export type MissingDirectorConfigDialogContentProps = {
  /** Project display label, e.g. "MVL01 - Dự án A". */
  projectLabel: string
  /** Close the dialog without doing anything. */
  onClose: () => void
  /** Open the project's staff-commission-rate config tab (in a new browser tab). */
  onOpenConfig: () => void
}

/**
 * Shown when creating a director-commission period fails with 409 because the project has no
 * project-director commission-rate config yet. Offers to open the project's commission-config
 * tab to set up the director rate first.
 */
export const MissingDirectorConfigDialogContent = ({
  projectLabel,
  onClose,
  onOpenConfig,
}: MissingDirectorConfigDialogContentProps) => {
  return (
    <div className="flex flex-col gap-6">
      <p className="typo-body-base-regular text-content-dark-2">
        Dự án <b className="text-content-dark-1">{projectLabel}</b> chưa có định mức hoa hồng Giám
        đốc dự án. Vui lòng cấu hình mức hoa hồng cho Giám đốc dự án này trước khi thêm vào kỳ.
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

export default MissingDirectorConfigDialogContent
