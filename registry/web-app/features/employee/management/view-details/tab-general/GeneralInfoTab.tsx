import BasicInfo from '@/features/employee/management/view-details/tab-general/BasicInfo.tsx'
import EmergencyContact from '@/features/employee/management/view-details/tab-general/EmergencyContact.tsx'
import { Employee } from '@/services'
import PersonalInfo from '@/features/employee/management/view-details/tab-general/PersonalInfo.tsx'
import BankAccount from '@/features/employee/management/view-details/tab-general/bank-account/BankAccount.tsx'
import CitizenIdAttachment from '@/features/employee/management/view-details/tab-general/CitizenIdAttachment.tsx'
import ProfileAttachmentsSection from '@/features/hrm/_shares/ProfileAttachmentsSection.tsx'
import DocumentSubmissionSection from '@/features/employee/management/view-details/tab-general/document-submission/DocumentSubmissionSection.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

const GeneralInfoTab = ({ employee }: { employee: Employee }) => {
  // Handle case when employee is not provided
  if (!employee) {
    return (
      <div className="flex flex-col gap-9">
        <div className="flex h-64 items-center justify-center">
          <p className="text-content-dark-2">Không có dữ liệu nhân viên</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-9 pb-10">
      {/* Section 1: Thông tin nhân sự */}
      <BasicInfo employee={employee} formatDate={formatDate} />

      <SeparatorHorizontal />

      {/* Section 2: Thông tin cá nhân */}
      <PersonalInfo employee={employee} formatDate={formatDate} />

      <SeparatorHorizontal />

      {/* Section 3: CMND/CCCD + tệp đính kèm */}
      <CitizenIdAttachment employee={employee} />
      <ProfileAttachmentsSection attachments={employee.attachments} />

      <SeparatorHorizontal />

      {/* Section 4: Hồ sơ nhân sự (7 loại giấy tờ onboarding) */}
      <DocumentSubmissionSection employee={employee} />

      <SeparatorHorizontal />

      {/* Section 5: Thông tin liên hệ khẩn cấp */}
      <EmergencyContact employee={employee} />

      <SeparatorHorizontal />

      {/* Section 6: Tài khoản ngân hàng */}
      <BankAccount employee={employee} />
    </div>
  )
}

export default GeneralInfoTab
