import { useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { Select, TextField } from '@/components/ui'
import { extractErrorMessage } from '@/utils/error-utils'
import useBankOptions from '@/hooks/useBankOptions'
import type { components } from '@/api/schema'
import type { PayoutBatchLinePatch } from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'

type EmployeeCommissionPayoutBatchLine = components['schemas']['EmployeeCommissionPayoutBatchLine']

export type PayoutLineBankTarget = Pick<
  EmployeeCommissionPayoutBatchLine,
  'id' | 'payee_name_snapshot' | 'payee_account_snapshot' | 'payee_bank_name_snapshot'
>

/**
 * Characters allowed in an account number, mirroring the BE `RegexField`
 * (`^[A-Za-z0-9][A-Za-z0-9 .\-]*$`). Account numbers are alphanumeric (hand-typed ones sometimes
 * carry spaces / dots / dashes); everything else is stripped as you type. This also keeps a leading
 * `=` `+` `-` `@` out of the value, which would otherwise land in the UNC Excel handed to the bank
 * as a live formula.
 */
const ACCOUNT_ALLOWED_CHARS = /[^A-Za-z0-9 .-]/g

/**
 * Blast radius of one save, spelled out for the accountant. Exported so the test asserts the exact
 * string the user reads rather than a paraphrase that could drift away from the BE behaviour.
 */
export const PROPAGATION_NOTE =
  'Thay đổi này cũng cập nhật hồ sơ ngân hàng của người nhận và các đợt chi chưa chốt khác của họ.'

export function sanitizeAccountNumber(raw: string): string {
  return raw.replace(ACCOUNT_ALLOWED_CHARS, '').replace(/^[\s.-]+/, '')
}

type Props = {
  /** The line being corrected. The parent mounts this component only while a row is open. */
  line: PayoutLineBankTarget
  onClose: () => void
  /** Commits the patch. Rejects when the BE refuses the edit; the dialog then stays open. */
  onSave: (lineId: number, patch: PayoutBatchLinePatch) => Promise<void>
}

/**
 * "Sửa STK / ngân hàng" dialog for one payout batch line (CR STT13). Both values are stored on the
 * line as snapshots, not foreign keys — the account is free text (charset-restricted), the bank is
 * picked from the bank master so the exported UNC file carries a canonical name.
 *
 * ⚠️ Saving reaches further than this one line (86eykeg1c): the BE also writes the correction back
 * to the payee's own profile and onto their lines in every batch that is not PAID / CANCELLED, so
 * a later "Tính lại" no longer reverts it. That is invisible from the two fields alone, hence
 * `PROPAGATION_NOTE` below — the accountant has to know the blast radius before pressing Lưu.
 *
 * Only the fields the accountant actually changed are sent: the BE 400s on an empty body, and a
 * bank-only edit must never touch the account (and vice versa).
 *
 * Mounted only while a row is being edited, so opening state is always seeded fresh from that row
 * and the bank master is not fetched on every detail-page view.
 */
export function EditPayoutLineBankDialog({ line, onClose, onSave }: Props) {
  const serverAccount = line.payee_account_snapshot ?? ''
  const serverBank = line.payee_bank_name_snapshot ?? ''

  const [account, setAccount] = useState(serverAccount)
  const [bankName, setBankName] = useState(serverBank)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()

  // Legacy rows may hold a bank name that is not in the master list — keep it selectable so the
  // field does not silently render empty.
  const { bankOptions, isLoadingBanks } = useBankOptions(serverBank)

  const nextAccount = account.trim()
  // The BE regex demands an alphanumeric first character, so a blank account is a 400 with a
  // regex-shaped message. Catch it here instead, where we can say what is actually wrong.
  const isAccountCleared = !nextAccount && !!serverAccount
  const hasChanges = nextAccount !== serverAccount || bankName !== serverBank
  const canSave = hasChanges && !isAccountCleared

  const handleConfirm = async () => {
    if (!canSave) return
    const patch: PayoutBatchLinePatch = {}
    if (nextAccount !== serverAccount) patch.payee_account_snapshot = nextAccount
    if (bankName !== serverBank) patch.payee_bank_name_snapshot = bankName

    setIsSaving(true)
    setError(undefined)
    try {
      await onSave(line.id, patch)
      onClose()
    } catch (err) {
      // Surface the BE's own reason (e.g. "batch is closed", a rejected account charset) on the
      // form: a toast disappears before the accountant can act on it, and the typed value would be
      // lost with it. Rethrow — `AppDialog` closes itself whenever `onConfirm` resolves, so
      // swallowing the error here would dismiss the message we just set.
      setError(extractErrorMessage(err, 'Không lưu được. Vui lòng thử lại.'))
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppDialog
      variant="custom"
      size="md"
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Sửa số tài khoản và ngân hàng"
      titleDescription={line.payee_name_snapshot ?? undefined}
      loading={isSaving}
      error={error}
      disableConfirm={!canSave}
      confirmText="Lưu"
      cancelText="Huỷ"
      isHideCancelButton={false}
      onCancel={onClose}
      onConfirm={handleConfirm}
      content={
        <div className="flex flex-col gap-4">
          <TextField
            label="Số tài khoản"
            placeholder="Nhập số tài khoản"
            value={account}
            maxLength={100}
            disabled={isSaving}
            error={isAccountCleared ? 'Số tài khoản không được để trống.' : undefined}
            onChange={(value) => {
              setAccount(sanitizeAccountNumber(value))
              setError(undefined)
            }}
          />
          <Select
            label="Ngân hàng"
            options={bankOptions}
            isLoading={isLoadingBanks}
            value={bankName || null}
            onChange={(next) => {
              setBankName(typeof next === 'string' ? next : '')
              setError(undefined)
            }}
            disabled={isSaving}
            enableSearch
            searchPlaceholder="Tìm ngân hàng"
            placeholder="Chọn ngân hàng"
          />
          <p className="text-content-dark-3 text-xs">{PROPAGATION_NOTE}</p>
        </div>
      }
    />
  )
}
