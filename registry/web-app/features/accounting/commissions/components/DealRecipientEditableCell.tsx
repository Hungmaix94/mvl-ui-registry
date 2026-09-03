import { useEffect, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Button, TextField } from '@/components/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { IconPen } from '@/assets/icons/design/IconPen'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog'
import { getEmployeeService } from '@/features/employee/services/employee-service'
import { cn } from '@/utils'
import type { components } from '@/api/schema'

type OriginalBeneficiaryRef = components['schemas']['_OriginalBeneficiaryRef']

type Props = {
  dealCode?: string | null
  recipientEmployee: OriginalBeneficiaryRef | null
  recipientEmail: string
  disabled?: boolean
  onConfirm: (next: { recipientEmployeeId: number | null; recipientEmail: string }) => void
}

// CR STT31 / ClickUp 86eyexcqr — per-deal commission-statement recipient override, editable inline
// in the "Các deal đã chốt" table (Sale role only). Mirrors PctOrAmountEditableCell's shape:
// popover holds draft state, parent owns the actual mutation via onConfirm.
const DealRecipientEditableCell = ({
  dealCode,
  recipientEmployee,
  recipientEmail,
  disabled,
  onConfirm,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [draftEmployeeId, setDraftEmployeeId] = useState<number | null>(
    recipientEmployee?.id ?? null
  )
  const [draftEmail, setDraftEmail] = useState(recipientEmail)
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraftEmployeeId(recipientEmployee?.id ?? null)
    setDraftEmail(recipientEmail)
  }, [open, recipientEmployee, recipientEmail])

  const handleEmployeeChange = async (employeeId: number | null) => {
    setDraftEmployeeId(employeeId)
    if (!employeeId) return
    // Auto-fill the company email of the newly picked employee as a starting default —
    // the accountant can still edit it by hand right after (e.g. resigned employee case).
    setIsLoadingEmail(true)
    try {
      const employee = await getEmployeeService().getEmployee(employeeId)
      if (employee?.email) setDraftEmail(employee.email)
    } catch {
      // Keep whatever email was already drafted; accountant can type it manually.
    } finally {
      setIsLoadingEmail(false)
    }
  }

  const handleCancel = () => setOpen(false)

  const handleConfirm = () => {
    onConfirm({ recipientEmployeeId: draftEmployeeId, recipientEmail: draftEmail })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Flex align="center" justify="between" gap="1.5" className="w-full">
        {/* `min-w-0` là thứ làm `truncate` hoạt động: mặc định flex item có `min-width: auto`
            nên nó nở theo nội dung thay vì cắt, và tên dài bị ngắt xuống dòng giữa chừng. */}
        <span
          className="text-content-dark-1 min-w-0 truncate text-[13px] font-medium"
          title={recipientEmployee?.name || ''}
        >
          {recipientEmployee?.name || '—'}
        </span>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'text-content-dark-3 hover:text-action-primary-red-default inline-flex flex-shrink-0 cursor-pointer items-center justify-center rounded p-0.5 transition-colors',
              disabled && 'hover:text-content-dark-3 cursor-not-allowed opacity-50'
            )}
            title="Sửa người nhận mail"
            aria-label="Sửa người nhận mail"
          >
            <IconPen size={14} />
          </button>
        </PopoverTrigger>
      </Flex>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="bg-content-light-1 border-border-1 w-96"
      >
        <Flex direction="column" gap="3">
          <span className="typo-body-base-semibold text-content-dark-1">
            Người nhận mail đối chiếu{dealCode ? ` — ${dealCode}` : ''}
          </span>

          <EmployeeSelectWithDialog
            label="Nhân viên nhận mail"
            value={draftEmployeeId}
            onChange={(value) => handleEmployeeChange(value ? Number(value) : null)}
          />

          <TextField
            label="Email"
            value={draftEmail}
            onChange={setDraftEmail}
            placeholder="ten@mvl.vn"
            disabled={isLoadingEmail}
          />

          <Flex justify="end" gap="2">
            <Button variant="secondary-border" size="small" type="button" onClick={handleCancel}>
              Huỷ
            </Button>
            <Button variant="primary" size="small" type="button" onClick={handleConfirm}>
              Xác nhận
            </Button>
          </Flex>
        </Flex>
      </PopoverContent>
    </Popover>
  )
}

export default DealRecipientEditableCell
