import { type EmployeeCertificate } from '@/features/employee/services/employee-certificate-service'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'

type EmployeeCertificateDetailProps = {
  certificate: EmployeeCertificate
}

const EmployeeCertificateDetail = ({ certificate }: EmployeeCertificateDetailProps) => {
  const InfoRow = ({
    label,
    value,
    isLast = false,
  }: {
    label: string
    value: string | React.ReactNode | null | undefined
    isLast?: boolean
  }) => (
    <>
      <div className="flex w-full items-center gap-5 py-4">
        <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">{label}</p>
        <div className="flex-1">
          {typeof value === 'string' ? (
            <p className="typo-body-lg-regular text-content-dark-1">{value || '-'}</p>
          ) : (
            <div className="typo-body-lg-regular text-content-dark-1">{value || '-'}</div>
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

  // Get employee info
  const employeeCode =
    typeof certificate.employee === 'object' && certificate.employee?.code
      ? certificate.employee.code
      : '-'
  const employeeName =
    typeof certificate.employee === 'object' && certificate.employee?.fullname
      ? certificate.employee.fullname
      : '-'

  // A "phiếu chờ cấp" record has no issue/effective/expiry date yet — only an expected issue date.
  const isPending = certificate.is_pending_issuance

  // Format status badge
  const statusBadge = certificate.colored_status ? (
    <Chip
      label={certificate.status_display}
      variant={certificate.colored_status.variant || ColoredValueVariant.GREY}
      size="small"
    />
  ) : (
    certificate.status_display || '-'
  )

  return (
    <div className="flex w-full flex-col items-start gap-9">
      {/* Section 1: Thông tin nhân viên */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin nhân viên</p>
        <div className="flex w-full flex-col items-start">
          <InfoRow label="Mã nhân viên" value={employeeCode} />
          <InfoRow label="Tên nhân viên" value={employeeName} isLast />
        </div>
      </div>

      {/* Section 2: Thông tin bằng cấp, chứng chỉ */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin bằng cấp, chứng chỉ</p>
        <div className="flex w-full flex-col items-start">
          <InfoRow label="Loại bằng cấp, chứng chỉ" value={certificate.certificate_type_display} />
          {!isPending && <InfoRow label="Số bằng cấp" value={certificate.certificate_code} />}
          <InfoRow label="Tiêu đề" value={certificate.certificate_name} />
          <InfoRow label="Tổ chức cấp" value={certificate.issuing_organization} />
          {isPending ? (
            <InfoRow label="Ngày dự kiến cấp" value={formatDate(certificate.expected_issue_date)} />
          ) : (
            <>
              <InfoRow label="Ngày cấp" value={formatDate(certificate.issue_date)} />
              <InfoRow label="Ngày hiệu lực" value={formatDate(certificate.effective_date)} />
              <InfoRow label="Ngày hết hiệu lực" value={formatDate(certificate.expiry_date)} />
            </>
          )}
          <InfoRow label="Trạng thái" value={statusBadge} />
          <InfoRow label="Chuyên ngành đào tạo" value={certificate.training_specialization} />
          <InfoRow label="Văn bằng tốt nghiệp" value={certificate.graduation_diploma} />
          {/*
            CR STT53. Ép sang chuỗi có chủ đích: InfoRow render `value || '-'`, nên số 0 —
            một số thứ tự hợp lệ — sẽ bị nuốt thành '-' nếu truyền thẳng number.
          */}
          <InfoRow
            label="Số thứ tự thực tế"
            value={
              certificate.actual_sequence_number != null
                ? String(certificate.actual_sequence_number)
                : ''
            }
          />
          <InfoRow label="Ghi chú" value={certificate.notes} />
          <InfoRow label="Ngày tạo" value={formatDate(certificate.created_at)} />
          <InfoRow
            label="Ngày cập nhật cuối cùng"
            value={formatDate(certificate.updated_at)}
            isLast
          />
        </div>
      </div>

      {/* Separator */}
      <div className="h-px w-full">
        <div className="bg-border-1 h-px w-full"></div>
      </div>

      {/* Section 3: Tài liệu đính kèm */}
      <div className="w-full">
        <AttachmentSection
          attachments={certificate.attachment ? [certificate.attachment] : []}
          isRequired={false}
        />
      </div>
    </div>
  )
}

export default EmployeeCertificateDetail
