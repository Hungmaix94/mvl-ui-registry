import { Chip } from '@/components/ui'
import CitizenIdFileDisplay from '@/features/hrm/_shares/CitizenIdFileDisplay.tsx'
import ProfileAttachmentsSection from '@/features/hrm/_shares/ProfileAttachmentsSection.tsx'
import {
  type RecruitmentCandidate,
  useRecruitmentCandidatePolicyProposal,
} from '@/features/recruitment/services/recruitment-candidate-service'
import RecruitmentCandidateAvatarSection from '@/features/recruitment/candidate/view-details/RecruitmentCandidateAvatarSection.tsx'
import RecordDetail from '@/features/employee/management/_shares/components/RecordDetail.tsx'
import { ReactNode, useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useAbility } from '@/lib/ability.ts'
import { Box, Flex, Grid, Separator } from '@radix-ui/themes'
import { RecruitmentCandidateStatus } from '@/constants/api-schema-aliases'

const Section = ({ title, content }: { title: ReactNode; content: ReactNode }) => (
  <>
    <Flex direction={'column'} justify={'start'} gap={'2'}>
      {title}
      {content}
    </Flex>
  </>
)

const SectionTitle = ({ title }: { title: string }) => (
  <h2 className="typo-body-xl-semibold text-content-dark-1">{title}</h2>
)

const SectionContent = ({
  leftContent,
  rightContent,
}: {
  leftContent: ReactNode
  rightContent: ReactNode
}) => (
  <>
    <Grid columns={'2'} gap={'4'} width={'100%'}>
      <div className="flex flex-col items-start">{leftContent}</div>
      <div className="flex flex-col items-start">{rightContent}</div>
    </Grid>
  </>
)

interface RecruitmentCandidateDetailInfoProps {
  candidate: RecruitmentCandidate
}

export default function RecruitmentCandidateDetail({
  candidate,
}: RecruitmentCandidateDetailInfoProps) {
  const ability = useAbility()
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS,
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES,
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.YEARS_OF_EXPERIENCE,
      APP_CONSTANT_KEY.EMPLOYEE.GENDER,
      APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS,
    ],
  })

  const statusMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS) || {},
    [keysMap]
  )
  const yearsOfExperienceMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.YEARS_OF_EXPERIENCE) || {},
    [keysMap]
  )
  const employeeTypeMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES) || {},
    [keysMap]
  )
  const genderMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.GENDER) || {},
    [keysMap]
  )
  const maritalStatusMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS) || {},
    [keysMap]
  )

  const isHiredCandidate = candidate.colored_status?.value === RecruitmentCandidateStatus.HIRED

  const canPolicyProposal = ability.can('policy_proposal', 'recruitment_candidate')
  const { data: policyProposal } = useRecruitmentCandidatePolicyProposal(candidate.id, {
    enabled: isHiredCandidate && canPolicyProposal && !!candidate.id,
  })

  const employeeTypeLabel = useMemo(() => {
    const key = policyProposal?.employee_type ?? candidate.employee_type
    return key ? (employeeTypeMapping[key] ?? key) : '-'
  }, [policyProposal?.employee_type, candidate.employee_type, employeeTypeMapping])

  return (
    <div className="flex w-full flex-col gap-5 pt-6">
      <Section
        title={<SectionTitle title={'Thông tin ứng viên'} />}
        content={
          <SectionContent
            leftContent={
              <>
                <RecordDetail label="Mã ứng viên" content={candidate.code || '-'} />
                <RecordDetail label="Tên ứng viên" content={candidate.name || '-'} />
                <RecordDetail
                  label="Đề nghị tuyển dụng"
                  content={
                    candidate.recruitment_request?.code && candidate.recruitment_request?.name
                      ? `${candidate.recruitment_request.code}-${candidate.recruitment_request.name}`
                      : '-'
                  }
                />
                <RecordDetail
                  label="Vị trí ứng tuyển"
                  content={candidate.recruitment_request?.name || '-'}
                />
                <RecordDetail label="Chi nhánh" content={candidate.branch?.name || '-'} />
                <RecordDetail label="Khối" content={candidate.block?.name || '-'} />
                <RecordDetail label="Phòng ban" content={candidate.department?.name || '-'} />
                <RecordDetail
                  label="Nguồn tuyển dụng"
                  content={candidate.recruitment_source?.name || '-'}
                />
                <RecordDetail
                  label="Kênh tuyển dụng"
                  content={candidate.recruitment_channel?.name || '-'}
                />
                <RecordDetail
                  label="Ngày nộp đơn"
                  content={formatDate(candidate.submitted_date)}
                  isShowSeparator={false}
                />
              </>
            }
            rightContent={
              <>
                <Grid columns={'3'} width={'100%'} gap={'4'}>
                  <Box gridColumnStart={'1'} gridColumnEnd={'3'}>
                    <RecordDetail
                      label="Trạng thái"
                      content={
                        candidate.colored_status ? (
                          <Chip
                            label={
                              statusMapping[candidate.colored_status.value] ||
                              candidate.colored_status.value
                            }
                            variant={candidate.colored_status.variant}
                          />
                        ) : (
                          '-'
                        )
                      }
                    />
                    <RecordDetail
                      label="Thời gian nhận việc"
                      content={formatDate(candidate.onboard_date)}
                    />
                    <RecordDetail
                      label="Số năm kinh nghiệm"
                      content={
                        candidate.years_of_experience
                          ? (yearsOfExperienceMapping[candidate.years_of_experience] ??
                            candidate.years_of_experience)
                          : '-'
                      }
                    />
                    <RecordDetail
                      label="Đã chuyển thành NV"
                      content={
                        <Chip
                          label={
                            candidate.is_employee_created ? 'Đã được chuyển' : 'Chưa được chuyển'
                          }
                          variant={
                            candidate.is_employee_created
                              ? ColoredValueVariant.GREEN
                              : ColoredValueVariant.RED
                          }
                        />
                      }
                    />
                  </Box>
                  <Flex
                    gridColumn={'3'}
                    align={'center'}
                    justify={'center'}
                    direction={'column'}
                    gap={'2'}
                  >
                    <RecruitmentCandidateAvatarSection candidate={candidate} />
                  </Flex>
                </Grid>
                {candidate.is_return_candidate && (
                  <RecordDetail label="Ứng viên quay lại làm việc" content="Có (từ nhân viên cũ)" />
                )}
                <RecordDetail
                  label="Ghi chú"
                  content={candidate.note || '-'}
                  isShowSeparator={false}
                />
              </>
            }
          />
        }
      />

      {isHiredCandidate && (
        <>
          <Separator orientation={'horizontal'} className={'!w-full'} />

          <Section
            title={<SectionTitle title={'Đề xuất chính sách'} />}
            content={
              <>
                <SectionContent
                  leftContent={
                    <>
                      <RecordDetail label="Loại nhân viên" content={employeeTypeLabel} />
                      <RecordDetail
                        label="Mức lương cơ bản"
                        content={
                          (policyProposal?.base_salary ?? candidate.base_salary)?.trim() || '-'
                        }
                      />
                      <RecordDetail
                        label="Phầm trăm lương thực nhận trong thời gian thử việc"
                        content={(() => {
                          const v =
                            policyProposal?.base_salary_percentage ??
                            candidate.base_salary_percentage
                          const s = v != null ? String(v).trim() : ''
                          if (!s) return '-'
                          return `${s}%`
                        })()}
                        labelClassName={'text-wrap'}
                      />
                      <RecordDetail
                        label="Chi nhánh mới"
                        content={policyProposal?.branch?.name || '-'}
                      />
                      <RecordDetail label="Khối mới" content={policyProposal?.block?.name || '-'} />
                      <RecordDetail
                        label="Phòng ban mới"
                        content={policyProposal?.department?.name || '-'}
                        isShowSeparator={!!policyProposal?.job_title?.trim()}
                      />
                      {policyProposal?.job_title?.trim() && (
                        <RecordDetail
                          label="Chức danh"
                          content={policyProposal.job_title}
                          isShowSeparator={false}
                        />
                      )}
                    </>
                  }
                  rightContent={
                    <>
                      {policyProposal && (
                        <RecordDetail
                          label="Nối thâm niên"
                          content={
                            typeof policyProposal.keep_seniority === 'boolean'
                              ? policyProposal.keep_seniority
                                ? 'Có'
                                : 'Không'
                              : '-'
                          }
                        />
                      )}
                      <RecordDetail
                        label="Ngày bắt đầu trạng thái"
                        content={formatDate(
                          policyProposal?.policy_start_date ?? candidate.policy_start_date
                        )}
                      />
                      <RecordDetail
                        label="Ngày kết thúc trạng thái"
                        content={formatDate(
                          policyProposal?.policy_end_date ?? candidate.policy_end_date
                        )}
                      />
                      {policyProposal && (
                        <>
                          <RecordDetail
                            label="Chi nhánh cũ"
                            content={policyProposal.old_branch?.name || '-'}
                          />
                          <RecordDetail
                            label="Khối cũ"
                            content={policyProposal.old_block?.name || '-'}
                          />
                          <RecordDetail
                            label="Phòng ban cũ"
                            content={policyProposal.old_department?.name || '-'}
                          />
                          {policyProposal.note?.trim() && (
                            <RecordDetail
                              label="Ghi chú đề xuất"
                              content={policyProposal.note}
                              isShowSeparator={false}
                            />
                          )}
                        </>
                      )}
                    </>
                  }
                />
              </>
            }
          />
        </>
      )}

      <Separator orientation={'horizontal'} className={'!w-full'} />

      <Section
        title={<SectionTitle title={'Thông tin cá nhân'} />}
        content={
          <>
            <SectionContent
              leftContent={
                <>
                  <RecordDetail label="Số điện thoại" content={candidate.phone || '-'} />
                  <RecordDetail label="Email cá nhân" content={candidate.email || '-'} />
                  <RecordDetail label="Ngày sinh" content={formatDate(candidate.date_of_birth)} />
                  <RecordDetail
                    label="SĐT liên hệ khẩn cấp"
                    content={candidate.emergency_contact_phone || '-'}
                  />
                  <RecordDetail
                    label="Giới tính"
                    content={
                      candidate.gender ? (genderMapping[candidate.gender] ?? candidate.gender) : '-'
                    }
                  />
                  <RecordDetail
                    label="Tình trạng hôn nhân"
                    content={
                      candidate.marital_status
                        ? (maritalStatusMapping[candidate.marital_status] ??
                          candidate.marital_status)
                        : '-'
                    }
                  />
                  <RecordDetail
                    label="Địa chỉ thường trú"
                    content={candidate.permanent_address ?? '-'}
                    isShowSeparator={false}
                  />
                </>
              }
              rightContent={
                <>
                  <RecordDetail label="Mã số thuế" content={candidate.tax_code ?? '-'} />
                  <RecordDetail label="Số CMND/CCCD" content={candidate.citizen_id || '-'} />
                  <RecordDetail
                    label="Ngày cấp CMND/CCCD"
                    content={formatDate(candidate.citizen_id_issued_date)}
                  />
                  <RecordDetail
                    label="Nơi cấp"
                    content={candidate.citizen_id_issued_place || '-'}
                  />
                  <RecordDetail label="Quốc tịch" content={candidate.nationality?.name ?? '-'} />
                  <RecordDetail label="Dân tộc" content={candidate.ethnicity ?? '-'} />
                  <RecordDetail label="Tôn giáo" content={candidate.religion ?? '-'} />
                  <RecordDetail label="Nơi sinh" content={candidate.place_of_birth || '-'} />
                  <RecordDetail
                    label="Địa chỉ cư trú"
                    content={candidate.residential_address ?? '-'}
                    isShowSeparator={false}
                  />
                </>
              }
            />
          </>
        }
      />

      <Separator orientation={'horizontal'} className={'!w-full'} />

      <CitizenIdFileDisplay files={candidate.citizen_id_files} />

      <ProfileAttachmentsSection attachments={candidate.attachments} />
    </div>
  )
}
