import { useCallback, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Button, Text } from '@/components/ui'
import { useSidebar } from '@/components/ui/sidebar/sidebar'
import { cn } from '@/utils'
import { formatDate } from '@/utils/date-utils'
import toastService from '@/services/toast-service'
import { useSalesAllocation } from '@/features/project/sale-allocations/services/sales-allocation-service'

import { LAD_STEP_COUNT, LAD_WIZARD_STEPS, LadBatchStatus } from '../../constants/lad-constants'
import {
  useLadBatch,
  useLadLines,
  usePatchLadBatch,
} from '../../services/commission-adjustment-batch-service'
import { LadBatchStatusBadge } from '../LadBatchStatusBadge'
import { LadStep1Scope } from './LadStep1Scope'
import { LadStep2Config } from './LadStep2Config'
import { LadStep3Preview } from './LadStep3Preview'
import { LadStep4Reason } from './LadStep4Reason'

export interface LadWizardShellProps {
  saleAllocationId: number
  batchId: number
  step: number
  onSetStep: (step: number) => void
  onExitToList: () => void
  onApplied: (batchId: number) => void
}

interface StepMeta {
  eyebrow: string
  title: string
  subtitle: string
  next: string
}

const STEP_META: readonly StepMeta[] = [
  {
    eyebrow: 'BƯỚC 1 · PHẠM VI GIAO DỊCH',
    title: 'Phạm vi — các giao dịch lô sẽ tác động',
    subtitle:
      'Thêm / loại các giao dịch bị ảnh hưởng. Mỗi GD mang trạng thái Dự kiến hoặc Xác nhận. Phạm vi khoá khi lô được áp dụng.',
    next: 'Tiếp tục — cấu hình',
  },
  {
    eyebrow: 'BƯỚC 2 · CẤU HÌNH CĐT (VAT CÓ/KHÔNG) + F2 PER PARTNER',
    title: 'Cấu hình mới — sẽ snapshot khi lô được áp dụng',
    subtitle:
      'Cấu hình CĐT áp chung cho các GD. Cấu hình F2 nhập riêng cho từng đối tác xuất hiện trong phạm vi.',
    next: 'Tiếp tục — xem trước',
  },
  {
    eyebrow: 'BƯỚC 3 · XEM TRƯỚC TÁC ĐỘNG (PER GD)',
    title: 'Xem trước tác động — chưa áp dụng',
    subtitle:
      'Dry-run trên từng giao dịch. Khi áp dụng thành công, hệ thống sinh các Application Event tương ứng.',
    next: 'Tiếp tục — lý do & chứng từ',
  },
  {
    eyebrow: 'BƯỚC 4 · LÝ DO, CHỨNG TỪ & LƯU',
    title: 'Lý do, chứng từ — và lưu nháp',
    subtitle:
      'Hoàn tất bước này hệ thống lưu nháp và mở thẳng màn chi tiết. Tại đó bạn bấm Chuyển sang dự kiến khi sẵn sàng.',
    next: 'Lưu nháp & mở chi tiết',
  },
]

/**
 * Wizard host for creating/editing a draft LAD batch (4 steps: Phạm vi · Cấu hình · Tác động ·
 * Lý do & chứng từ). The final step saves the draft and opens the DETAIL view, which now owns the
 * submit/approve action (no separate review step). Steps 2 & 4 register a save handler the footer
 * invokes; the draft is persisted server-side, so every step reads/writes against `batchId`.
 */
export function LadWizardShell({
  saleAllocationId,
  batchId,
  step,
  onSetStep,
  onExitToList,
  onApplied,
}: LadWizardShellProps) {
  const { data: batch, isLoading: isLoadingBatch } = useLadBatch(batchId)
  const { data: linesData, isLoading: isLoadingLines } = useLadLines(batchId)
  const { data: sa } = useSalesAllocation(saleAllocationId)
  const patchBatch = usePatchLadBatch()

  const saCode = (sa as { code?: string } | undefined)?.code
  const lines = linesData?.results ?? []
  const isApplied = batch?.status === LadBatchStatus.applied
  const meta = STEP_META[step - 1] ?? STEP_META[0]

  // The active step (2/4) registers a save handler here; the footer flushes it before navigating.
  const saveRef = useRef<null | (() => Promise<boolean>)>(null)
  const registerSave = useCallback((fn: (() => Promise<boolean>) | null) => {
    saveRef.current = fn
  }, [])
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const { state: sidebarState, isMobile } = useSidebar()

  const markSaved = useCallback(() => setSavedAt(formatDate(new Date(), 'HH:mm')), [])

  const goToStep = useCallback(
    async (nextStep: number) => {
      onSetStep(nextStep)
      // Chỉ ghi last_modified_step khi giá trị thật sự đổi — tránh PATCH thừa khi nhảy vào đúng
      // bước hiện tại hoặc khi resume-hint đã đúng (step nằm trong URL nên không sợ mất khi reload).
      if (nextStep <= LAD_STEP_COUNT && batch?.last_modified_step !== nextStep) {
        try {
          await patchBatch.mutateAsync({ id: batchId, data: { last_modified_step: nextStep } })
          markSaved()
        } catch {
          // non-fatal: step is a resume hint only
        }
      }
    },
    [batchId, onSetStep, patchBatch, markSaved, batch?.last_modified_step]
  )

  const handleBack = useCallback(() => {
    if (step > 1) onSetStep(step - 1)
    else onExitToList()
  }, [step, onSetStep, onExitToList])

  const handleNext = useCallback(async () => {
    const ok = (await saveRef.current?.()) ?? true
    if (!ok) return
    if (step >= LAD_STEP_COUNT) {
      markSaved()
      onApplied(batchId)
      return
    }
    void goToStep(step + 1)
  }, [step, goToStep, onApplied, batchId, markSaved])

  if (isApplied) {
    // Applied batches are immutable — never editable through the wizard.
    toastService.error('Lô đã áp dụng — không thể chỉnh sửa.')
    onExitToList()
    return null
  }

  return (
    <>
      <Flex direction="column" gap="5" className="py-2 pb-24">
        {/* Bản nháp đã persist server-side nên thoát giữa chừng không mất dữ liệu */}
        <button
          type="button"
          onClick={onExitToList}
          className="text-content-dark-3 hover:text-content-dark-1 typo-body-base flex w-fit items-center gap-1"
        >
          ‹ Quay lại danh sách lô
        </button>

        {/* Header card */}
        <div className="border-border-1 rounded-xl border p-5">
          <Flex justify="between" align="start" gap="3" wrap="wrap">
            <div className="flex flex-col gap-1">
              <Text className="text-content-dark-3 typo-body-sm-regular">
                {saCode ? `${saCode} · ` : ''}Lô áp dụng cấu hình · Tạo lô mới ·{' '}
                {batch?.code ?? '—'}
              </Text>
              <Text className="text-content-dark-3 text-xs font-semibold">
                BƯỚC {step}/{LAD_STEP_COUNT}
                {step === LAD_STEP_COUNT ? ' · BƯỚC CUỐI' : ''}
              </Text>
              <Text className="typo-heading-h4 text-content-dark-1 font-semibold">
                {meta.title}
              </Text>
              <Text className="text-content-dark-3 typo-body-sm-regular max-w-3xl">
                {meta.subtitle}
              </Text>
            </div>
            {batch?.status && <LadBatchStatusBadge status={batch.status} />}
          </Flex>
        </div>

        {/* Stepper */}
        <Stepper currentStep={step} onJump={(s) => void goToStep(s)} />

        {/* Step content */}
        <div className="min-h-[200px]">
          {step === 1 && (
            <LadStep1Scope
              batchId={batchId}
              saleAllocationId={saleAllocationId}
              batch={batch}
              lines={lines}
              isLoadingLines={isLoadingLines || isLoadingBatch}
            />
          )}
          {step === 2 && (
            <LadStep2Config
              batchId={batchId}
              batch={batch}
              saleAllocationId={saleAllocationId}
              onRegisterSave={registerSave}
            />
          )}
          {step === 3 && <LadStep3Preview batchId={batchId} saleAllocationId={saleAllocationId} />}
          {step === 4 && (
            <LadStep4Reason batchId={batchId} batch={batch} onRegisterSave={registerSave} />
          )}
        </div>
      </Flex>

      <div
        className={cn(
          'border-border-1 bg-background-1 fixed bottom-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3 transition-all duration-300 sm:px-6 sm:py-4',
          // Mobile: sidebar là Sheet off-canvas → footer chiếm full-width (không lệch theo --sidebar-width,
          // tránh bị bóp thành dải hẹp khiến nút wrap dọc). Desktop: lệch theo bề rộng sidebar.
          isMobile
            ? 'left-0 w-full'
            : sidebarState === 'expanded'
              ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
              : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
        )}
      >
        {/* Hint autosave — ẩn ở màn bé để nhường chỗ cho 2 nút (thông tin phụ, không thiết yếu). */}
        <Text className="text-content-dark-3 typo-body-sm-regular hidden shrink-0 sm:block">
          {savedAt ? `✓ Đã lưu nháp ${savedAt} hôm nay` : 'Bản nháp tự động lưu'}
        </Text>
        <Flex align="center" gap="2" justify="end" className="ml-auto w-full shrink-0 sm:w-auto">
          <Button
            variant="secondary-border"
            onClick={handleBack}
            className="flex-1 whitespace-nowrap sm:flex-none"
          >
            ← {step > 1 ? 'Quay lại' : 'Huỷ'}
          </Button>
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={patchBatch.isPending}
            className="flex-1 whitespace-nowrap sm:flex-none"
          >
            {meta.next} {step < LAD_STEP_COUNT ? '›' : ''}
          </Button>
        </Flex>
      </div>
    </>
  )
}

interface StepperProps {
  currentStep: number
  onJump: (step: number) => void
}

function Stepper({ currentStep, onJump }: StepperProps) {
  return (
    <Flex align="center" gap="0" className="w-full">
      {LAD_WIZARD_STEPS.map((label, idx) => {
        const stepNum = idx + 1
        const active = currentStep === stepNum
        const done = currentStep > stepNum
        const isLast = idx === LAD_WIZARD_STEPS.length - 1
        return (
          <Flex key={label} align="center" className={isLast ? '' : 'flex-1'}>
            <button
              type="button"
              onClick={() => onJump(stepNum)}
              className="flex shrink-0 items-center gap-2"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-green-60 text-white'
                    : active
                      ? 'bg-action-primary-red-default text-white'
                      : 'border-border-1 text-content-dark-3 border'
                }`}
              >
                {done ? '✓' : stepNum}
              </span>
              <Text
                className={`typo-body-sm-medium ${
                  active || done ? 'text-content-dark-1' : 'text-content-dark-3'
                }`}
              >
                {label}
              </Text>
            </button>
            {!isLast && <span className="bg-border-1 mx-3 h-px flex-1" />}
          </Flex>
        )
      })}
    </Flex>
  )
}

export default LadWizardShell
