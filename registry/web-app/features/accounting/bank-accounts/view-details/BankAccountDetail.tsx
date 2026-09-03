import React from 'react'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { type CompanyBankAccount } from '@/features/accounting/bank-accounts/services/bank-account-service'

type BankAccountDetailProps = {
  account: CompanyBankAccount
}

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
      <p className="typo-body-base-medium text-content-dark-3 w-[180px] shrink-0">{label}</p>
      <div className="flex-1">
        {typeof value === 'string' ? (
          <p className="typo-body-lg-regular text-content-dark-1">{value || '-'}</p>
        ) : (
          <div className="typo-body-lg-regular text-content-dark-1">{value || '-'}</div>
        )}
      </div>
    </div>

    {!isLast && (
      <div className="h-px w-full">
        <div className="bg-border-1 h-px w-full"></div>
      </div>
    )}
  </>
)

const BankAccountDetail = ({ account }: BankAccountDetailProps) => {
  const isActive = account.is_active !== false

  const codeNode = account.code ? <code>{account.code}</code> : '-'
  const accountNumberNode = account.account_number ? <code>{account.account_number}</code> : '-'

  const isDefaultNode = account.is_default ? (
    <Chip variant={ColoredValueVariant.BLUE} label="Mặc định" size="small" />
  ) : (
    <span className="typo-body-lg-regular text-content-dark-3">Không</span>
  )

  const statusNode = (
    <Chip
      variant={isActive ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY}
      label={isActive ? 'Đang hoạt động' : 'Đã đóng'}
      size="small"
    />
  )

  return (
    <div className="flex w-full flex-col items-start gap-9">
      {/* Section 1: Thông tin tài khoản */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thông tin tài khoản</p>
        <div className="flex w-full flex-col items-start">
          <InfoRow label="Mã TK" value={codeNode} />
          <InfoRow label="Chủ tài khoản" value={account.account_holder} />
          <InfoRow label="Tên ngân hàng" value={account.bank_name} />
          <InfoRow label="Số tài khoản" value={accountNumberNode} />
          <InfoRow label="Chi nhánh ngân hàng" value={account.bank_branch_name} />
          <InfoRow label="SWIFT code" value={account.bank_swift_code} />
          <InfoRow label="Tiền tệ" value={account.currency} isLast />
        </div>
      </div>

      {/* Section 2: Liên kết */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Liên kết</p>
        <div className="flex w-full flex-col items-start">
          <InfoRow label="Chi nhánh công ty" value={String(account.branch ?? '-')} isLast />
        </div>
      </div>

      {/* Section 3: Thiết lập */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Thiết lập</p>
        <div className="flex w-full flex-col items-start">
          <InfoRow label="Mặc định" value={isDefaultNode} />
          <InfoRow label="Trạng thái" value={statusNode} />
          <InfoRow label="Ngày tạo" value={formatDate(account.created_at)} />
          <InfoRow label="Ngày cập nhật" value={formatDate(account.updated_at)} isLast />
        </div>
      </div>

      {/* Section 4: Ghi chú */}
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-body-xl-semibold text-content-dark-1">Ghi chú</p>
        <div className="flex w-full flex-col items-start">
          <InfoRow label="Ghi chú" value={account.note} isLast />
        </div>
      </div>
    </div>
  )
}

export default BankAccountDetail
