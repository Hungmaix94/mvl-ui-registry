import { useMemo } from 'react'
import { Button, Chip } from '@/components/ui'
import { IconPencil } from '@/assets/icons'
import { ColoredValueVariant } from '@/api/schema.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { useAbility } from '@/lib/ability.ts'
import type { Employee } from '@/features/employee/services/employee-service'
import type { ColoredValue } from '@/types/hrm-types'
import {
  DOCUMENT_TYPE_ORDER,
  EMPLOYEE_DOCUMENT_PERMISSIONS,
} from '@/features/employee/management/view-details/tab-general/document-submission/document-submission.constant.ts'
import { useDocumentSubmissionEdit } from '@/features/employee/management/view-details/tab-general/document-submission/hooks/useDocumentSubmissionEdit.tsx'

type DocumentSubmissionSectionProps = {
  employee: Employee
}

const DocumentSubmissionSection = ({ employee }: DocumentSubmissionSectionProps) => {
  const ability = useAbility()
  const { openEditDocumentSubmissionDialog } = useDocumentSubmissionEdit()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.EMPLOYEE_DOCUMENT_SUBMISSION_DOCUMENT_TYPE_CHOICES,
      APP_CONSTANT_KEY.HRM.DOCUMENT_SUBMISSION_STATUS,
    ],
  })

  const documentTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.HRM.EMPLOYEE_DOCUMENT_SUBMISSION_DOCUMENT_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const statusLabels = keysMap.get(APP_CONSTANT_KEY.HRM.DOCUMENT_SUBMISSION_STATUS) as
    | Record<string, string>
    | undefined

  // Map document_type -> is_submitted for O(1) lookup
  const submittedMap = useMemo(
    () =>
      new Map(
        (employee.document_submissions ?? []).map((doc) => [doc.document_type, doc.is_submitted])
      ),
    [employee.document_submissions]
  )

  const coloredStatus = employee.colored_document_submission_status as ColoredValue | undefined
  const statusValue = coloredStatus?.value
  const statusLabel = statusValue ? (statusLabels?.[statusValue] ?? statusValue) : undefined

  const canEdit = ability.can(EMPLOYEE_DOCUMENT_PERMISSIONS.UPDATE, 'employee')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-content-dark-primary text-lg font-semibold">Hồ sơ nhân sự</h2>
          {statusLabel && (
            <Chip
              label={statusLabel}
              variant={coloredStatus?.variant ?? ColoredValueVariant.GREY}
              size="small"
            />
          )}
        </div>
        {canEdit && (
          <Button
            variant="secondary"
            className="bg-neutral-30 h-9 w-9 p-2.5"
            onClick={() => openEditDocumentSubmissionDialog(employee)}
            title="Chỉnh sửa hồ sơ nhân sự"
          >
            <IconPencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {DOCUMENT_TYPE_ORDER.map((documentType) => {
          const isSubmitted = submittedMap.get(documentType) ?? false
          const label = documentTypeLabels?.[documentType] ?? documentType
          return (
            <div
              key={documentType}
              className="border-border-1 flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <span className="text-content-dark-1 text-sm break-words" title={label}>
                {label}
              </span>
              <Chip
                label={isSubmitted ? 'Đã nộp' : 'Chưa nộp'}
                variant={isSubmitted ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
                size="small"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DocumentSubmissionSection
