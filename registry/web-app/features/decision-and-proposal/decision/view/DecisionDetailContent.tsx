import { type Decision } from '@/features/decision-and-proposal/services/decision-service'
import { cn } from '@/utils'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { Flex, Separator, Text } from '@radix-ui/themes'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo } from 'react'

type DecisionDetailContentProps = {
  decision: Decision
}

const DecisionDetailContent = ({ decision }: DecisionDetailContentProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS],
  })

  const getSigningStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS)
      ? keysMap.get(APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS) || {}
      : {}
  }, [keysMap])

  const renderRichText = (htmlContent: string | null | undefined) => {
    if (!htmlContent) return '-'

    return (
      <div
        className="prose prose-sm max-w-none [&_li]:leading-6 [&_p]:mb-2 [&_p]:leading-6 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    )
  }

  const InfoRow = ({
    label,
    value,
    isRichText = false,
    isLast = false,
  }: {
    label: string
    value: string | null | undefined | React.ReactNode
    isRichText?: boolean
    isLast?: boolean
  }) => (
    <>
      <div
        className={cn(
          'flex w-full items-center gap-5 py-4',
          !isLast && 'border-border-1 border-b-[1px] border-solid'
        )}
      >
        <Text className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
          {label}
        </Text>
        <div className="flex-1">
          {isRichText ? (
            renderRichText(typeof value === 'string' ? value : undefined)
          ) : (
            <Text className="typo-body-lg-regular text-content-dark-1 break-all">
              {value || '-'}
            </Text>
          )}
        </div>
      </div>
    </>
  )

  const signingStatusDisplay = decision.colored_signing_status ? (
    <Chip
      label={
        getSigningStatusMapping[decision.colored_signing_status.value || ''] ||
        decision.colored_signing_status.value ||
        '-'
      }
      variant={(decision.colored_signing_status.variant as any) || ColoredValueVariant.GREY}
      size="small"
    />
  ) : (
    '-'
  )

  return (
    <div className={cn('flex w-full flex-col items-start gap-5 pt-4')}>
      <p className="typo-h6 text-content-dark-1">Thông tin quyết định</p>

      <Flex direction={'column'} gap={'4'} className={'w-full'}>
        <InfoRow label="Số quyết định" value={decision.decision_number} />
        <InfoRow label="Tên quyết định" value={decision.name} />
        <InfoRow
          label="Ngày ký"
          value={decision.signing_date ? formatDate(decision.signing_date, DATE_FORMAT) : '-'}
        />
        <InfoRow
          label="Ngày hiệu lực"
          value={decision.effective_date ? formatDate(decision.effective_date, DATE_FORMAT) : '-'}
        />
        <InfoRow
          label="Người ký"
          value={decision.signer ? `${decision.signer.code} - ${decision.signer.fullname}` : '-'}
        />
        <InfoRow label="Trạng thái" value={signingStatusDisplay} />
        <InfoRow
          label="Ngày tạo"
          value={decision.created_at ? formatDate(decision.created_at) : '-'}
        />
        <InfoRow
          label="Ngày cập nhật cuối cùng"
          value={decision.updated_at ? formatDate(decision.updated_at) : '-'}
        />
        <InfoRow label="Lý do" value={decision.reason} isRichText />
        <InfoRow label="Nội dung quyết định" value={decision.content} isRichText />
        <InfoRow label="Ghi chú" value={decision.note} isRichText isLast />
      </Flex>

      <Separator orientation={'horizontal'} className={'!w-full'} />

      {/* Attachment Section */}
      <div className={'w-full pb-6'}>
        <AttachmentSection
          attachments={
            decision.attachments
              ? decision.attachments.map((file) => ({
                  id: file.id,
                  file_name: file.file_name,
                  file_path: file.file_path,
                  size: file.size,
                  download_url: file.download_url,
                }))
              : []
          }
          isRequired={true}
        />
      </div>
    </div>
  )
}

export default DecisionDetailContent
