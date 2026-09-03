import { type ComponentType } from 'react'

import {
  IconCheck,
  IconCheckcircle,
  IconHourglass,
  IconInfo,
  IconWarningcircle,
} from '@/assets/icons'

import { FeeSupportRequestDocument_status } from '../constants/fee-support-request-constants'

type Props = {
  status: FeeSupportRequestDocument_status
  /** Ghi chú kế toán yêu cầu bổ sung (documents_review_note) — hiện khi needs_supplement. */
  reviewNote?: string | null
  /** Đã có ≥1 tài liệu — để đánh dấu bước "Nộp hồ sơ" hoàn tất. */
  hasAttachments: boolean
}

type StepState = 'done' | 'active' | 'warning' | 'upcoming'

const STEP_LABELS = ['Nộp hồ sơ', 'Kế toán duyệt', 'Hoàn tất'] as const

const CIRCLE_CLASS: Record<StepState, string> = {
  done: 'bg-data-green-default text-white',
  active: 'bg-data-blue-default text-white',
  warning: 'bg-data-orange-default text-white',
  upcoming: 'bg-neutral-30 text-content-dark-3',
}

/**
 * Suy ra trạng thái 3 bước (Bổ sung hồ sơ → Kế toán duyệt → Hoàn tất) từ
 * document_status của tuyến kế toán duyệt thủ tục. needs_supplement = kế toán
 * trả lại nên bước 1 cảnh báo; awaiting_docs = đã/đang nộp, chờ kế toán.
 */
function getStepStates(
  status: FeeSupportRequestDocument_status,
  hasAttachments: boolean
): StepState[] {
  switch (status) {
    case FeeSupportRequestDocument_status.docs_approved:
      return ['done', 'done', 'done']
    case FeeSupportRequestDocument_status.needs_supplement:
      return ['warning', 'upcoming', 'upcoming']
    case FeeSupportRequestDocument_status.awaiting_docs:
      return hasAttachments ? ['done', 'active', 'upcoming'] : ['active', 'upcoming', 'upcoming']
    default:
      return ['upcoming', 'upcoming', 'upcoming']
  }
}

function Stepper({ states }: { states: StepState[] }) {
  return (
    <div className="flex items-start">
      {states.map((state, i) => (
        <div key={i} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            <div
              className={`h-0.5 flex-1 ${
                i === 0
                  ? 'invisible'
                  : states[i - 1] === 'done'
                    ? 'bg-data-green-default'
                    : 'bg-neutral-30'
              }`}
            />
            <div
              className={`typo-body-sm-semibold flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${CIRCLE_CLASS[state]}`}
            >
              {state === 'done' ? (
                <IconCheck size={16} className="text-white" />
              ) : state === 'warning' ? (
                <IconWarningcircle size={16} className="text-white" />
              ) : (
                i + 1
              )}
            </div>
            <div
              className={`h-0.5 flex-1 ${
                i === states.length - 1
                  ? 'invisible'
                  : state === 'done'
                    ? 'bg-data-green-default'
                    : 'bg-neutral-30'
              }`}
            />
          </div>
          <span
            className={`typo-body-sm-regular mt-1.5 text-center ${
              state === 'upcoming' ? 'text-content-dark-3' : 'text-content-dark-1'
            }`}
          >
            {STEP_LABELS[i]}
          </span>
        </div>
      ))}
    </div>
  )
}

type CalloutConfig = {
  Icon: ComponentType<{ size?: number; className?: string }>
  bg: string
  border: string
  text: string
  title: string
  description: string
}

function getCallout(
  status: FeeSupportRequestDocument_status,
  reviewNote?: string | null
): CalloutConfig {
  switch (status) {
    case FeeSupportRequestDocument_status.docs_approved:
      return {
        Icon: IconCheckcircle,
        bg: 'bg-data-green-disabled',
        border: 'border-data-green-default',
        text: 'text-data-green-default',
        title: 'Hồ sơ đã duyệt',
        description:
          'Khoản cắt khách đã chuyển sang người-nhận-hộ; hoa hồng căn được giải ngân theo tiến độ. Trạng thái này đã khóa.',
      }
    case FeeSupportRequestDocument_status.needs_supplement:
      return {
        Icon: IconWarningcircle,
        bg: 'bg-data-orange-disabled',
        border: 'border-data-orange-default',
        text: 'text-data-orange-default',
        title: 'Cần bổ sung hồ sơ',
        description: reviewNote
          ? `Kế toán yêu cầu: ${reviewNote}`
          : 'Kế toán yêu cầu bổ sung hồ sơ. Vui lòng cập nhật tài liệu rồi gửi lại.',
      }
    case FeeSupportRequestDocument_status.awaiting_docs:
      return {
        Icon: IconHourglass,
        bg: 'bg-data-blue-disabled',
        border: 'border-data-blue-default',
        text: 'text-data-blue-default',
        title: 'Chờ kế toán duyệt hồ sơ',
        description:
          'Sale bổ sung hồ sơ cắt khách và người-nhận-hộ. Kế toán sẽ duyệt khi hợp đồng cọc đã duyệt và phiếu đã được phê duyệt.',
      }
    default:
      return {
        Icon: IconInfo,
        bg: 'bg-neutral-20',
        border: 'border-border-1',
        text: 'text-content-dark-2',
        title: 'Không cần hồ sơ',
        description: 'Yêu cầu này không cần duyệt thêm hồ sơ.',
      }
  }
}

/**
 * Khối trực quan cho tuyến hồ sơ (kế toán duyệt thủ tục): thanh tiến trình 3 bước
 * + callout màu theo document_status (icon + nhãn + việc-cần-làm). Nhãn/màu là
 * cục bộ tới khi BE seed app-constant `FeeSupportRequest_DocumentStatus`.
 */
export function FeeSupportDocumentStatusHero({ status, reviewNote, hasAttachments }: Props) {
  const isNotRequired = status === FeeSupportRequestDocument_status.not_required
  const callout = getCallout(status, reviewNote)
  const CalloutIcon = callout.Icon

  return (
    <div className="flex flex-col gap-4">
      {!isNotRequired && (
        <div className="px-2 pt-1">
          <Stepper states={getStepStates(status, hasAttachments)} />
        </div>
      )}
      <div
        className={`flex items-start gap-3 rounded-xl border border-solid px-4 py-3 ${callout.border} ${callout.bg}`}
      >
        <CalloutIcon size={20} className={`mt-0.5 shrink-0 ${callout.text}`} />
        <div className="flex flex-col gap-0.5">
          <span className={`typo-body-base-semibold ${callout.text}`}>{callout.title}</span>
          <span className="typo-body-sm-regular text-content-dark-2">{callout.description}</span>
        </div>
      </div>
    </div>
  )
}

export default FeeSupportDocumentStatusHero
