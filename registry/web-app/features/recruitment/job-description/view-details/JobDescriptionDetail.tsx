import { type JobDescription } from '@/features/recruitment/services/job-description-service'
import { cn } from '@/utils'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { formatDate } from '@/utils/date-utils.ts'

type JobDescriptionInfoProps = {
  jobDescription: JobDescription
}

const JobDescriptionDetail = ({ jobDescription }: JobDescriptionInfoProps) => {
  const renderRichText = (htmlContent: string | null | undefined) => {
    if (!htmlContent) return '-'

    // Safely render HTML content from RichText editor
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
    value: string | null | undefined
    isRichText?: boolean
    isLast?: boolean
  }) => (
    <>
      <div className="flex w-full items-center gap-5 py-4">
        <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">{label}</p>
        <div className="flex-1">
          {isRichText ? (
            renderRichText(value)
          ) : (
            <p className="typo-body-lg-regular text-content-dark-1">{value || '-'}</p>
          )}
        </div>
      </div>

      {!isLast && (
        <div className="h-px w-full">
          <div className="bg-border-1 h-px w-full"></div>
        </div>
      )}
    </>
  )

  return (
    <div className={cn('flex w-full flex-col items-start gap-5 pt-4')}>
      <p className="typo-h6 text-content-dark-1">Thông tin mô tả công việc</p>

      <div className="flex w-full flex-col items-start">
        <InfoRow label="Mã JD" value={jobDescription.code} />
        <InfoRow label="Tiêu đề" value={jobDescription.title} />
        <InfoRow label="Vị trí tuyển dụng" value={jobDescription.position_title} />
        <InfoRow label="Mô tả công việc" value={jobDescription.responsibility} isRichText />
        <InfoRow label="Yêu cầu" value={jobDescription.requirement} isRichText />
        <InfoRow label="Tiêu chí ưu tiên" value={jobDescription.preferred_criteria} isRichText />
        <InfoRow label="Quyền lợi" value={jobDescription.benefit} isRichText />
        <InfoRow label="Mức lương đề xuất chung" value={jobDescription.proposed_salary} />
        <InfoRow label="Ghi chú" value={jobDescription.note} />
        <InfoRow label="Ngày tạo" value={formatDate(jobDescription.created_at)} />
        <InfoRow
          label="Ngày cập nhật cuối cùng"
          value={formatDate(jobDescription.updated_at)}
          isLast
        />
      </div>

      <div className="h-px w-full">
        <div className="bg-border-1 h-px w-full"></div>
      </div>

      {/* Attachment Section */}
      <div className={'pb-6'}>
        <AttachmentSection
          attachments={jobDescription.attachment ? [jobDescription.attachment] : []}
        />
      </div>
    </div>
  )
}

export default JobDescriptionDetail
