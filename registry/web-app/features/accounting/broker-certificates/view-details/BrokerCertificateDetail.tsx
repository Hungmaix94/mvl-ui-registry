import React from 'react'
import { Chip } from '@/components/ui'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { type BrokerCertificate } from '@/features/accounting/broker-certificates/services/broker-certificate-service'
import {
  CERT_STATUS_META,
  CERT_TYPE_LABEL,
  collaboratorNameOf,
} from '@/features/accounting/broker-certificates/types/broker-certificate-types'

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
      <p className="typo-body-base-medium text-content-dark-3 w-[200px] shrink-0">{label}</p>
      <div className="typo-body-lg-regular text-content-dark-1 flex-1">{value || '-'}</div>
    </div>
    {!isLast && <div className="bg-border-1 h-px w-full" />}
  </>
)

const BrokerCertificateDetail = ({ certificate }: { certificate: BrokerCertificate }) => {
  const statusMeta = CERT_STATUS_META[certificate.status ?? '']
  const isPending = certificate.status === 'PENDING_ISSUANCE'
  return (
    <div className="flex flex-col">
      <InfoRow label="Cộng tác viên" value={collaboratorNameOf(certificate)} />
      <InfoRow
        label="Loại chứng chỉ"
        value={
          certificate.cert_type
            ? CERT_TYPE_LABEL[certificate.cert_type] || certificate.cert_type
            : '—'
        }
      />
      <InfoRow
        label="Mã số"
        value={certificate.certificate_number ? <code>{certificate.certificate_number}</code> : '—'}
      />
      <InfoRow label="Đơn vị cấp" value={certificate.issuer || '—'} />
      <InfoRow label="Ngày cấp" value={formatDate(certificate.issued_date)} />
      <InfoRow label="Bắt đầu hiệu lực" value={formatDate(certificate.effective_date)} />
      <InfoRow label="Ngày hết hạn" value={formatDate(certificate.expiry_date)} />
      {isPending && (
        <InfoRow label="Ngày dự kiến cấp" value={formatDate(certificate.expected_issue_date)} />
      )}
      <InfoRow
        label="Tình trạng"
        value={
          statusMeta ? (
            <Chip variant={statusMeta.variant} label={statusMeta.label} size="small" />
          ) : (
            '-'
          )
        }
      />
      {certificate.status === 'REVOKED' && (
        <>
          <InfoRow label="Thời điểm thu hồi" value={formatDate(certificate.revoked_at)} />
          <InfoRow label="Lý do thu hồi" value={certificate.revoked_reason || '—'} />
        </>
      )}
      <InfoRow label="Ghi chú" value={certificate.notes || '—'} />
      {!isPending && (
        <div className="w-full pt-4">
          <p className="typo-body-base-medium text-content-dark-3 pb-3">Tài liệu đính kèm</p>
          <AttachmentSection
            attachments={certificate.attachment ? [certificate.attachment] : []}
            isRequired={false}
          />
        </div>
      )}
    </div>
  )
}

export default BrokerCertificateDetail
