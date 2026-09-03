import { Button } from '@/components/ui'
import { IconFile } from '@/assets/icons/office-editing'

const IMPORT_DISABLED_TITLE = 'Tính năng nhập Excel sẽ được bật khi BE cung cấp template.'

/**
 * "Nhập Excel" trigger — ALWAYS disabled (Đợt 1 shell).
 *
 * Replaces the previously commented-out Import Excel wiring in {@link InvestorReconciliationForm}.
 * The real import dialog ({@link InvestorReconciliationImportDialog}) stays parked until BE ships a
 * template, so this button intentionally has no onClick: it only signals the upcoming capability.
 */
function ReconImportExcelButton() {
  return (
    <Button
      type="button"
      variant="secondary-border"
      size="small"
      disabled
      leftIcon={<IconFile size={18} />}
      title={IMPORT_DISABLED_TITLE}
      aria-label={IMPORT_DISABLED_TITLE}
    >
      Nhập Excel
    </Button>
  )
}

export default ReconImportExcelButton
