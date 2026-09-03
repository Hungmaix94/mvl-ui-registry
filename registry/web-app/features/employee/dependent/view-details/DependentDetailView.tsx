import { useCallback, useMemo } from 'react'

import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { type EmployeeDependent } from '@/features/employee/services/employee-dependent-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { cn } from '@/utils'
import { formatDate } from '@/utils/date-utils.ts'

type DependentDetailViewProps = {
  dependent: EmployeeDependent
}

const DependentDetailView = ({ dependent }: DependentDetailViewProps) => {
  // Fetch relationship type constants - using the same constant key as EmployeeRelationship
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE],
  })

  const relationshipTypeMap = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE) || {},
    [keysMap]
  )

  const formatRelationship = useCallback(
    (type: string | undefined) => {
      if (!type) return '-'
      return relationshipTypeMap[type] || type
    },
    [relationshipTypeMap]
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
    <div className={cn('flex w-full flex-col items-start gap-9 px-10 py-7')}>
      {/* Section 1: Thông tin chung */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</p>

        <div className="flex w-full flex-col items-start">
          <InfoRow label="Mã nhân viên" value={dependent.employee?.code} />
          <InfoRow label="Tên nhân viên" value={dependent.employee?.fullname} isLast />
        </div>
      </div>

      <div className="h-px w-full">
        <div className="bg-border-1 h-px w-full"></div>
      </div>

      {/* Section 2: Thông tin Người phụ thuộc */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin Người phụ thuộc</p>

        <div className="flex w-full flex-col items-start">
          <InfoRow label="Tên người phụ thuộc" value={dependent.dependent_name} />
          <InfoRow label="Mối quan hệ" value={formatRelationship(dependent.relationship)} />
          <InfoRow label="Ngày sinh" value={formatDate(dependent.date_of_birth)} />
          <InfoRow label="Số CMND/CCCD/Giấy khai sinh" value={dependent.citizen_id} />
          <InfoRow label="Mã số thuế" value={dependent.tax_code} />
          <InfoRow label="Ngày hiệu lực" value={formatDate(dependent.effective_date)} />
          <InfoRow label="Ghi chú" value={dependent.note} />
          <InfoRow label="Ngày tạo" value={formatDate(dependent.created_at)} />
          <InfoRow
            label="Ngày cập nhật cuối cùng"
            value={formatDate(dependent.updated_at)}
            isLast
          />
        </div>
      </div>

      <div className="h-px w-full">
        <div className="bg-border-1 h-px w-full"></div>
      </div>

      {/* Attachment Section */}
      <div className={'pb-6'}>
        <AttachmentSection
          attachments={dependent.attachment ? [dependent.attachment] : []}
          isRequired={false}
        />
      </div>
    </div>
  )
}

export default DependentDetailView
