import { Button } from '@/components/ui'
import { formatCurrencyVND } from '@/utils/common'
import { useSidebar } from '@/components/ui/sidebar/sidebar'
import { cn } from '@/utils'
import { IconCheck } from '@/assets/icons/system-devices'

interface WizardFooterProps {
  currentStep: number
  totalSteps?: number
  totalAllocated?: number
  totalAmount?: number
  isSubmitting?: boolean
  onCancel: () => void
  onBack: () => void
  onNext: () => void
}

export function WizardFooter({
  currentStep,
  totalSteps = 2,
  totalAllocated = 0,
  totalAmount = 0,
  isSubmitting = false,
  onCancel,
  onBack,
  onNext,
}: WizardFooterProps) {
  const isLastStep = currentStep >= totalSteps
  const { state: sidebarState } = useSidebar()

  return (
    <div
      className={cn(
        'border-border-1 fixed bottom-0 z-50 flex flex-row items-center justify-end gap-3 border-t bg-white px-8 py-4 transition-all duration-300',
        sidebarState === 'expanded'
          ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
          : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
      )}
    >
      {/* Step info */}
      <div className="flex-1 text-sm text-gray-500">
        Bước{' '}
        <b className="font-semibold text-gray-900">
          {currentStep}/{totalSteps}
        </b>
        {currentStep >= 2 && (
          <>
            {' '}
            · Đã phân bổ{' '}
            <b className="font-semibold text-gray-900">
              {formatCurrencyVND(totalAllocated)} ₫
            </b> / <b className="font-semibold text-gray-900">{formatCurrencyVND(totalAmount)} ₫</b>
          </>
        )}
      </div>

      {/* Actions */}
      <Button
        key="cancel-btn"
        type="button"
        variant="secondary-border"
        onClick={onCancel}
        className="min-w-[96px]"
      >
        Huỷ
      </Button>

      {currentStep > 1 && (
        <Button
          key="back-btn"
          type="button"
          variant="secondary-border"
          onClick={onBack}
          className="min-w-[96px]"
        >
          ← Quay lại
        </Button>
      )}

      {!isLastStep ? (
        <Button
          key="next-btn"
          type="button"
          variant="primary"
          onClick={onNext}
          className="min-w-[120px]"
        >
          Tiếp tục →
        </Button>
      ) : (
        <Button
          key="submit-btn"
          type="submit"
          variant="primary"
          loading={isSubmitting}
          leftIcon={<IconCheck className="h-3.5 w-3.5" />}
          className="min-w-[140px]"
        >
          Lưu phiếu thu
        </Button>
      )}
    </div>
  )
}
