import type { components } from '@/api/schema'

type CompanyBankAccount = components['schemas']['CompanyBankAccount']

interface BankAccountCellProps {
  /** Bank account detail object returned by the API (e.g. from_bank_account_detail) */
  account?: CompanyBankAccount | null
  /** Raw bank account id used as fallback when the detail object is absent */
  fallbackId?: number | null
}

/**
 * Renders a company bank account inside a table cell: bank name, account number and holder.
 * Falls back to the raw id (then an em dash) when the detail object is not provided.
 */
const BankAccountCell = ({ account, fallbackId }: BankAccountCellProps) => {
  if (!account) {
    if (fallbackId) {
      return <code className="text-xs font-medium text-gray-700">{fallbackId}</code>
    }
    return <span className="text-gray-400">—</span>
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-gray-800">{account.bank_name}</span>
      {account.account_number && (
        <code className="text-xs font-medium text-gray-600">{account.account_number}</code>
      )}
      {account.account_holder && (
        <span className="text-xs font-medium text-gray-500">{account.account_holder}</span>
      )}
    </div>
  )
}

export default BankAccountCell
