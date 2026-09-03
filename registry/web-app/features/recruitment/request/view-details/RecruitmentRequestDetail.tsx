import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'
import { Text, Chip } from '@/components/ui'
import { type RecruitmentRequest } from '@/features/recruitment/services/recruitment-request-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'

type RecruitmentRequestDetailProps = {
  request: RecruitmentRequest
}

const RecruitmentRequestDetail = ({ request }: RecruitmentRequestDetailProps) => {
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
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE, APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS],
  })

  const recruitmentTypeMap = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE) as Record<string, string>) || {}
      : {}
  }, [keysMap])
  const recruitmentStatusMap = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS) as Record<string, string>) || {}
      : {}
  }, [keysMap])

  const jobDesc = request.job_description
    ? `${request.job_description.code ?? ''} - ${request.job_description.title}`.trim()
    : '-'

  const recruitmentPosition = request.job_description?.title ?? '-'
  const branch = request.branch?.name ?? '-'
  const block = request.block?.name ?? '-'
  const department = request.department?.name ?? '-'

  const proposedSalary = request.proposed_salary ?? '-'
  const positions = request.number_of_positions ?? '-'
  const proposer = request.proposer?.fullname ?? '-'

  const coloredRecruitmentType = request.colored_recruitment_type
  const coloredStatus = request.colored_status

  const recruitmentTypeDisplay =
    recruitmentTypeMap[coloredRecruitmentType.value] || coloredRecruitmentType?.value || '-'
  const recruitmentStatusDisplay =
    recruitmentStatusMap[coloredStatus.value] || coloredStatus?.value || '-'

  const jobRequirement = request.job_description ? `${request.job_description.requirement}` : '-'
  const jobBenefits = request.job_description ? `${request.job_description.benefit}` : '-'
  const requestCreatedAt = formatDateToApi(new Date(request.created_at))
  const requestUpdatedAt = formatDateToApi(new Date(request.updated_at))

  return (
    <Flex direction="column" gap="5" px="7" className="py-6">
      <Text className="typo-body-xl-semibold text-content-dark-1">
        Thông tin đề nghị tuyển dụng
      </Text>

      <Flex direction="column" className="bg-background-1">
        <InfoRow label="Mã đề nghị" value={request.code ?? '-'} />
        <InfoRow label="Tên đề nghị" value={request.name ?? '-'} />
        <InfoRow label="Mô tả công việc" value={jobDesc} />
        <InfoRow label="Vị trí tuyển dụng" value={recruitmentPosition} />
        <InfoRow label="Chi nhánh" value={branch} />
        <InfoRow label="Khối" value={block} />
        <InfoRow label="Phòng ban" value={department} />

        <Flex
          direction="row"
          gap="5"
          align="center"
          py="4"
          className="border-border-1 border-b last:border-b-0"
        >
          <Text className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
            Loại tuyển dụng
          </Text>
          <div className="flex-1">
            {coloredRecruitmentType?.value ? (
              <Chip
                label={recruitmentTypeDisplay}
                variant={coloredRecruitmentType.variant as any}
                size="small"
              />
            ) : (
              <Text className="typo-body-lg-regular text-content-dark-1">-</Text>
            )}
          </div>
        </Flex>

        <Flex
          direction="row"
          gap="5"
          align="center"
          py="4"
          className="border-border-1 border-b last:border-b-0"
        >
          <Text className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">
            Trạng thái
          </Text>
          <div className="flex-1">
            {coloredStatus?.value ? (
              <Chip
                label={recruitmentStatusDisplay}
                variant={coloredStatus.variant as any}
                size="small"
              />
            ) : (
              <Text className="typo-body-lg-regular text-content-dark-1">-</Text>
            )}
          </div>
        </Flex>

        <InfoRow label="Người đề xuất" value={proposer} />
        <InfoRow
          label="Mức lương"
          value={proposedSalary && proposedSalary !== '-' ? `${proposedSalary}` : '-'}
        />
        <InfoRow label="Số lượng" value={String(positions)} />
        <InfoRow label="Yêu cầu" value={jobRequirement} isRichText />
        <InfoRow label="Quyền lợi" value={jobBenefits} isRichText />
        <InfoRow label="Ngày tạo" value={requestCreatedAt} />
        <InfoRow label="Ngày cập nhật cuối cùng" value={requestUpdatedAt} isLast />
      </Flex>
    </Flex>
  )
}

export default RecruitmentRequestDetail
