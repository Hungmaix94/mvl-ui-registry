import AppDialog from '@/components/dialog/AppDialog.tsx'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import { APP_PATH } from '@/routes'
import type { CheckDuplicateResponse } from '@/features/recruitment/services/recruitment-candidate-service'
import {
  extractDuplicateCandidateFromCheckDuplicate,
  extractDuplicateEmployeeFromCheckDuplicate,
  type DuplicateMatchPersonFields,
} from '@/features/recruitment/candidate/_shares/utils/recruitment-candidate-duplicate.ts'
import { formatDate } from '@/utils/date-utils.ts'

type RecruitmentDuplicateMatchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: 'employee' | 'candidate'
  response: CheckDuplicateResponse
  canViewEmployeeDetail: boolean
  canViewCandidateDetail: boolean
}

function maskField(value: string | undefined, canViewDetail: boolean): string {
  if (value == null || String(value).trim() === '') return '-'
  return canViewDetail ? String(value) : '*****'
}

function buildAbsoluteUrl(path: string): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${window.location.origin}${base}${p}`
}

function DetailLine({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div
      className={cn(
        'border-border-1 flex flex-col gap-1 border-b py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5',
        'last:border-b-0'
      )}
    >
      <p className="typo-body-base-medium text-content-dark-3 shrink-0 sm:w-[168px]">{label}</p>
      <p className="typo-body-lg-regular text-content-dark-1 min-w-0 flex-1 truncate" title={title}>
        {value}
      </p>
    </div>
  )
}

function fieldsToRows(
  d: DuplicateMatchPersonFields,
  canViewDetail: boolean
): { label: string; value: string; title: string }[] {
  const rows: { label: string; value: string; title: string }[] = [
    {
      label: 'Mã',
      value: maskField(d.code ?? undefined, canViewDetail),
      title: maskField(d.code ?? undefined, canViewDetail),
    },
    {
      label: 'Họ tên',
      value: maskField(d.fullname ?? undefined, canViewDetail),
      title: maskField(d.fullname ?? undefined, canViewDetail),
    },
    {
      label: 'Số CMND/CCCD',
      value: maskField(d.citizen_id ?? undefined, canViewDetail),
      title: maskField(d.citizen_id ?? undefined, canViewDetail),
    },
    {
      label: 'Số điện thoại',
      value: maskField(d.phone ?? undefined, canViewDetail),
      title: maskField(d.phone ?? undefined, canViewDetail),
    },
    {
      label: 'Email',
      value: maskField(d.email ?? undefined, canViewDetail),
      title: maskField(d.email ?? undefined, canViewDetail),
    },
    {
      label: 'Ngày sinh',
      value: maskField(formatDate(d.dateOfBirth) ?? undefined, canViewDetail),
      title: maskField(formatDate(d.dateOfBirth) ?? undefined, canViewDetail),
    },
    {
      label: 'Chi nhánh',
      value: maskField(d.branchName ?? undefined, canViewDetail),
      title: maskField(d.branchName ?? undefined, canViewDetail),
    },
    {
      label: 'Phòng ban',
      value: maskField(d.departmentName ?? undefined, canViewDetail),
      title: maskField(d.departmentName ?? undefined, canViewDetail),
    },
    {
      label: 'Chức vụ / Vị trí',
      value: maskField(d.positionName ?? undefined, canViewDetail),
      title: maskField(d.positionName ?? undefined, canViewDetail),
    },
  ]
  return rows
}

export default function RecruitmentDuplicateMatchDialog({
  open,
  onOpenChange,
  kind,
  response,
  canViewEmployeeDetail,
  canViewCandidateDetail,
}: RecruitmentDuplicateMatchDialogProps) {
  const isEmployee = kind === 'employee'
  const display = isEmployee
    ? extractDuplicateEmployeeFromCheckDuplicate(response)
    : extractDuplicateCandidateFromCheckDuplicate(response)

  const canViewDetail = isEmployee ? canViewEmployeeDetail : canViewCandidateDetail
  const canOpenDetailLink = isEmployee
    ? canViewEmployeeDetail && display.id != null
    : canViewCandidateDetail && display.id != null

  const detailPath = isEmployee
    ? APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(display.id))
    : APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', String(display.id))

  const detailHref = canOpenDetailLink ? buildAbsoluteUrl(detailPath) : null

  const title = isEmployee ? 'Trùng với nhân viên đang làm việc' : 'Trùng với ứng viên đã có'

  const rows = fieldsToRows(display, canViewDetail)

  return (
    <AppDialog
      variant="custom"
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      dialogContentClassName="max-h-[90vh] px-0"
      dialogFormClassName="min-h-0 overflow-y-auto py-0"
      content={
        <div className="flex flex-col gap-2">
          {!canViewDetail && (
            <p className="typo-body-sm-regular text-content-dark-3 border-border-1 bg-data-light-grey-default rounded-md border border-solid px-3 py-2">
              Bạn không có quyền xem chi tiết {isEmployee ? 'nhân viên' : 'ứng viên'} — nội dung
              hiển thị dạng *****
            </p>
          )}

          {rows.map((row) => (
            <DetailLine key={row.label} label={row.label} value={row.value} title={row.title} />
          ))}
        </div>
      }
      isHideCancelButton
      onCancel={() => onOpenChange(false)}
      confirmText="Đóng"
      onConfirm={() => {}}
      leftFooterContent={
        detailHref != null ? (
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={() => window.open(detailHref, '_blank', 'noopener,noreferrer')}
          >
            {isEmployee ? 'Mở chi tiết nhân viên (tab mới)' : 'Mở chi tiết ứng viên (tab mới)'}
          </Button>
        ) : undefined
      }
      footerFlexJustify="between"
    />
  )
}
