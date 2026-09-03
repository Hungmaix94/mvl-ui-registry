import { Flex, Separator } from '@radix-ui/themes'
import { Chip, Grid } from '@/components/ui'
import { formatCurrencyVND } from '@/utils/common'
import { format, parse } from 'date-fns'
import { type PenaltyTicket } from '@/features/payroll/services/penalty-ticket-service'
import { getStatusVariant } from '../_shares/utils/penalty-ticket-colors.ts'
import { DetailRow } from '@/components/index.ts'
import { formatDate } from '@/utils/date-utils.ts'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { useCallback, useMemo } from 'react'
import { PatchedPenaltyTicketUpdateRequestViolation_type } from '@/api/schema.ts'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'
import usePenaltyTicketOptions from '../_shares/hooks/usePenaltyTicketOptions.ts'

export default function PenaltyTicketDetail({ ticket }: { ticket: PenaltyTicket }) {
  const monthText = (() => {
    try {
      return format(parse(ticket.month, 'MM/yyyy', new Date()), 'MM/yyyy')
    } catch {
      return ticket.month
    }
  })()

  const createdAt = formatDate(new Date(ticket.created_at))
  const updatedAt = formatDate(new Date(ticket.updated_at))
  const rawAttachments = (ticket as any).attachments
  const attachments = (
    Array.isArray(rawAttachments) ? rawAttachments : rawAttachments ? [rawAttachments] : []
  ).filter((item: any) => item && typeof item === 'object')

  const { statusOptions, violationTypeOptions } = usePenaltyTicketOptions()

  const statusLabelMap = useMemo(
    () => new Map(statusOptions.map((o) => [o.value, o.label])),
    [statusOptions]
  )
  const violationLabelMap = useMemo(
    () => new Map(violationTypeOptions.map((o) => [o.value, o.label])),
    [violationTypeOptions]
  )

  const getStatusLabel = useCallback(
    (status?: PenaltyTicketStatus) => (status ? statusLabelMap.get(status) || status : '-'),
    [statusLabelMap]
  )
  const getViolationTypeLabel = useCallback(
    (type?: PatchedPenaltyTicketUpdateRequestViolation_type) =>
      type ? violationLabelMap.get(type) || type : '-',
    [violationLabelMap]
  )

  return (
    <Flex direction="column" gap="4" className="w-full px-10 py-8">
      <p className="text-content-dark-1 typo-body-xl-semibold">Thông tin nhân viên</p>
      <Grid cols={2} gap="5">
        <Flex direction="column" gap="2" className="pr-6">
          <DetailRow label="Mã nhân viên" value={ticket.employee.code} />
          <DetailRow label="Họ và tên" value={ticket.employee.fullname} />
          <DetailRow label="Chức vụ" value={ticket.position.name} />
        </Flex>
        <Flex direction="column" gap="2" className="pl-6">
          <DetailRow label="Chi nhánh" value={ticket.branch.name} />
          <DetailRow label="Khối" value={ticket.block.name} />
          <DetailRow label="Phòng ban" value={ticket.department.name} />
        </Flex>
      </Grid>

      <Separator orientation="horizontal" className="my-5 !w-full" />

      <p className="text-content-dark-1 typo-body-xl-semibold">Thông tin phiếu phạt</p>
      <Grid cols={2} gap="5">
        <Flex direction="column" gap="2" className="pr-6">
          <DetailRow label="Mã phiếu" value={ticket.code} />
          <DetailRow label="Kỳ Lương" value={monthText} />
          <DetailRow label="Loại vi phạm" value={getViolationTypeLabel(ticket.violation_type)} />
          <DetailRow label="Số lần vi phạm" value={ticket.violation_count} />
          <DetailRow label="Số tiền" value={formatCurrencyVND(ticket.amount)} />
        </Flex>
        <Flex direction="column" gap="2" className="pl-6">
          <DetailRow
            label="Trạng thái"
            value={
              <Chip
                label={getStatusLabel(ticket.status)}
                variant={getStatusVariant(ticket.status)}
                size="small"
              />
            }
          />
          <DetailRow label="Ngày nộp phạt" value={formatDate(ticket.payment_date)} />
          <DetailRow label="Ghi chú" value={ticket.note} />
          <DetailRow label="Ngày tạo" value={createdAt} />
          <DetailRow label="Ngày cập nhật cuối cùng" value={updatedAt} />
        </Flex>
      </Grid>

      <Separator orientation="horizontal" className="my-5 !w-full" />

      <AttachmentSection attachments={attachments} isRequired={false} />
    </Flex>
  )
}
