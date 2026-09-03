import { type ReactNode } from 'react'
import { IconBank, IconCreditcard, IconEnvelope, IconMappinline, IconPhone } from '@/assets/icons'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Chip } from '@/components/ui'
import CollaboratorContractsTable from '@/features/accounting/collaborators/_shares/components/CollaboratorContractsTable.tsx'
import type { Collaborator } from '@/features/accounting/collaborators/services/collaborator-service.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { cn } from '@/utils'

/** Certificate badge on the collaborator profile — mirrors CollaboratorBrokerCertStatus (BRD §2.5). */
const BROKER_CERT_STATUS_META: Record<string, { label: string; variant: ColoredValueVariant }> = {
  CERTIFIED: { label: 'Đã có chứng chỉ', variant: ColoredValueVariant.GREEN },
  PENDING: { label: 'Chờ', variant: ColoredValueVariant.YELLOW },
  MISSING: { label: 'Chưa có', variant: ColoredValueVariant.RED },
}

type CollaboratorDetailProps = {
  collaborator: Collaborator
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

function SectionCard({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('w-full rounded-xl border border-gray-200 bg-white', className)}>
      {title && (
        <p className="typo-body-lg-semibold text-content-dark-1 border-b border-gray-100 px-5 py-4">
          {title}
        </p>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function ContactItem({
  icon,
  label,
  value,
  href,
  mono,
}: {
  icon: ReactNode
  label: string
  value?: string | null
  href?: string
  mono?: boolean
}) {
  const hasValue = !!value
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="bg-surface-1 text-content-dark-3 flex size-9 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-content-dark-3 text-xs">{label}</p>
        {hasValue && href ? (
          <a
            href={href}
            className="typo-body-base-medium text-action-primary-default break-words hover:underline"
          >
            {value}
          </a>
        ) : (
          <p
            className={cn(
              'typo-body-base-medium text-content-dark-1 break-words',
              mono && 'font-mono'
            )}
          >
            {hasValue ? value : '—'}
          </p>
        )}
      </div>
    </div>
  )
}

function BankAccountCard({ collaborator }: { collaborator: Collaborator }) {
  const hasBankInfo = !!(
    collaborator.bank_name ||
    collaborator.bank_account ||
    collaborator.bank_branch
  )

  if (!hasBankInfo) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
        <IconBank size={28} className="text-content-dark-3" />
        <p className="text-content-dark-3 text-sm">Chưa có thông tin tài khoản</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <p className="typo-body-base-semibold leading-snug break-words">
          {collaborator.bank_name || '—'}
        </p>
        <IconBank size={24} className="shrink-0 opacity-70" />
      </div>
      <p className="font-mono text-lg tracking-[0.18em] break-all">
        {collaborator.bank_account || '••••'}
      </p>
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-white/60">Chủ tài khoản</p>
        <p className="text-sm font-medium uppercase">{collaborator.name}</p>
      </div>
      {collaborator.bank_branch && (
        <p className="text-xs text-white/60">Chi nhánh: {collaborator.bank_branch}</p>
      )}
    </div>
  )
}

export default function CollaboratorDetail({ collaborator }: CollaboratorDetailProps) {
  return (
    <div className="grid w-full grid-cols-1 items-start gap-4 px-7 py-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <SectionCard>
          <div className="flex items-center gap-4">
            <div className="bg-data-red-disabled flex size-14 shrink-0 items-center justify-center rounded-full">
              <span className="typo-body-xl-semibold text-data-red-default">
                {getInitials(collaborator.name)}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="typo-body-xl-semibold text-content-dark-1 break-words">
                  {collaborator.name}
                </p>
                <Chip
                  variant={
                    collaborator.is_active ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY
                  }
                  label={collaborator.is_active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                  showDot
                />
                {(() => {
                  const meta = BROKER_CERT_STATUS_META[collaborator.broker_cert_status ?? '']
                  return meta ? (
                    <Chip variant={meta.variant} label={`Chứng chỉ: ${meta.label}`} size="small" />
                  ) : null
                })()}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                  {collaborator.code}
                </code>
                <span className="text-content-dark-3 text-xs">
                  Tạo ngày {formatDate(collaborator.created_at)} · Cập nhật{' '}
                  {formatDate(collaborator.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Thông tin liên hệ">
          <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            <ContactItem
              icon={<IconPhone size={18} />}
              label="Số điện thoại"
              value={collaborator.phone}
              href={collaborator.phone ? `tel:${collaborator.phone}` : undefined}
            />
            <ContactItem
              icon={<IconEnvelope size={18} />}
              label="Email"
              value={collaborator.email}
              href={collaborator.email ? `mailto:${collaborator.email}` : undefined}
            />
            <ContactItem
              icon={<IconCreditcard size={18} />}
              label="CMND/CCCD"
              value={collaborator.id_number}
              mono
            />
            <ContactItem
              icon={<IconMappinline size={18} />}
              label="Địa chỉ"
              value={collaborator.address}
            />
          </div>
        </SectionCard>

        <CollaboratorContractsTable collaboratorId={collaborator.id} />
      </div>

      <div className="flex flex-col gap-4">
        <SectionCard title="Tài khoản ngân hàng">
          <BankAccountCard collaborator={collaborator} />
        </SectionCard>

        <SectionCard title="Ghi chú">
          {collaborator.note ? (
            <p className="typo-body-base-regular text-content-dark-1 break-words whitespace-pre-line">
              {collaborator.note}
            </p>
          ) : (
            <p className="text-content-dark-3 text-sm">Chưa có ghi chú</p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
