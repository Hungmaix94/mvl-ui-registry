import { type EmployeeRelationship } from '@/features/employee/services/employee-relationship-service'
import { cn } from '@/utils'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { useMemo, useCallback } from 'react'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'

type RelationDetailViewProps = {
  relation: EmployeeRelationship
}

const RelationDetailView = ({ relation }: RelationDetailViewProps) => {
  // Fetch relation type constants
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE],
  })

  const relationTypeMap = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE) || {},
    [keysMap]
  )

  const formatRelationType = useCallback(
    (type: string | undefined) => {
      if (!type) return '-'
      return relationTypeMap[type] || type
    },
    [relationTypeMap]
  )

  const InfoRow = ({
    label,
    value,
    isLast = false,
  }: {
    label: string
    value: string | null | undefined
    isLast?: boolean
  }) => (
    <>
      <div className="flex w-full items-center gap-5 py-4">
        <p className="typo-body-base-medium text-content-dark-3 w-[168px] shrink-0">{label}</p>
        <div className="flex-1">
          <p className="typo-body-lg-regular text-content-dark-1">{value || '-'}</p>
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
    <div className={cn('flex w-full flex-col items-start gap-9 px-10 py-0')}>
      {/* Section 1: Thông tin chung */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</p>

        <div className="flex w-full flex-col items-start">
          <InfoRow label="Mã nhân viên" value={relation.employee_code} />
          <InfoRow label="Tên nhân viên" value={relation.employee_name} isLast />
        </div>
      </div>

      <div className="h-px w-full">
        <div className="bg-border-1 h-px w-full"></div>
      </div>

      {/* Section 2: Thông tin Quan hệ nhân thân */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin Quan hệ nhân thân</p>

        <div className="flex w-full flex-col items-start">
          <InfoRow label="Tên người thân" value={relation.relative_name} />
          <InfoRow label="Mối quan hệ" value={formatRelationType(relation.relation_type)} />
          <InfoRow label="Ngày sinh" value={formatDate(relation.date_of_birth)} />
          <InfoRow label="Số CMND/CCCD/Giấy khai sinh" value={relation.citizen_id} />
          <InfoRow label="Nghề nghiệp" value={relation.occupation} />
          <InfoRow label="Mã số thuế" value={relation.tax_code} />
          <InfoRow label="Số điện thoại" value={relation.phone} />
          <InfoRow label="Địa chỉ" value={relation.address} />
          <InfoRow label="Ghi chú" value={relation.note} />
          <InfoRow label="Ngày tạo" value={formatDate(relation.created_at)} />
          <InfoRow label="Ngày cập nhật cuối cùng" value={formatDate(relation.updated_at)} isLast />
        </div>
      </div>

      <div className="h-px w-full">
        <div className="bg-border-1 h-px w-full"></div>
      </div>

      {/* Attachment Section */}
      <div className={'pb-6'}>
        <AttachmentSection
          attachments={relation.attachment ? [relation.attachment] : []}
          isRequired={false}
        />
      </div>
    </div>
  )
}

export default RelationDetailView
