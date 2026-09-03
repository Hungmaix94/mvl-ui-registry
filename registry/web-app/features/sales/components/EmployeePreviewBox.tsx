import React from 'react'
import { Link } from 'react-router-dom'
import { DisplayField } from '@/components/commons/DisplayField'
import { ColoredValueVariant } from '@/api/schema'
import { APP_PATH } from '@/routes'
import { Chip } from '@/components/ui'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'
import { IconEye } from '@/assets/icons'

type EmployeePreviewBoxData = {
  id?: number | null
  code?: string | null
  fullname?: string | null
  department?: { name?: string | null } | null
  position?: { name?: string | null } | null
  phone?: string | null
  email?: string | null
}

type EmployeePreviewBoxProps = {
  employeeData: EmployeePreviewBoxData
  title?: string
  subtitle?: string
  attachments?: any[]
}

export const EmployeePreviewBox: React.FC<EmployeePreviewBoxProps> = ({
  employeeData,
  title = 'Thông tin nhân sự',
  subtitle,
  attachments = [],
}) => {
  if (!employeeData || (!employeeData.id && !employeeData.code)) return null

  const fullName = employeeData.fullname || '-'

  return (
    <div className="border-border-1 bg-surface-primary-default flex flex-col gap-6 overflow-hidden rounded-xl border p-5">
      {/* Header Info */}
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-start justify-between">
          <span className="typo-body-sm-semibold text-content-dark-3 pointer-events-none uppercase">
            {employeeData.code || '-'}
          </span>
          {title && (
            <Chip
              label={title}
              variant={ColoredValueVariant.RED}
              type="outlined"
              size="small"
              className="pointer-events-none ml-2 shrink-0"
            />
          )}
        </div>
        {employeeData.id ? (
          <div className="mt-1 flex items-center gap-2">
            <h4 className="typo-body-xl-semibold text-content-dark-1">{fullName}</h4>
            <Link
              to={APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', employeeData.id.toString())}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-primary text-gray-400 transition-colors"
              title="Xem chi tiết nhân sự"
            >
              <IconEye size={18} />
            </Link>
          </div>
        ) : (
          <h4 className="typo-body-xl-semibold text-content-dark-1 pointer-events-none mt-1">
            {fullName}
          </h4>
        )}
        <span className="typo-body-sm-regular text-content-dark-3 pointer-events-none">
          {employeeData.department?.name || '-'}
        </span>
      </div>

      {/* Body Grid */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-6">
        <DisplayField label="Chức vụ" value={employeeData.position?.name || '-'} />
        <DisplayField label="Số điện thoại" value={employeeData.phone || '-'} />
        <DisplayField label="Email" value={employeeData.email || '-'} />
        {subtitle && <DisplayField label="Thời gian áp dụng" value={subtitle} />}
      </div>

      {attachments && attachments.length > 0 && (
        <div className="border-border-1 mt-2 border-t pt-4">
          <AttachmentSection attachments={attachments} isRequired={false} />
        </div>
      )}
    </div>
  )
}
