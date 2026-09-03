import { useNavigate } from 'react-router-dom'
import { formatDate } from '@/utils/date-utils.ts'
import { formatCurrencyVND } from '@/utils/common'
import { APP_PATH } from '@/routes'
import { useCollaboratorContracts } from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service.ts'
import ContractStatusChip from '@/features/accounting/collaborator-contracts/_shares/components/ContractStatusChip.tsx'
import { Button } from '@/components/ui'
import { cn } from '@/utils'

type CollaboratorContractsTableProps = {
  collaboratorId: number
}

function formatPercent(value?: string | null): string {
  if (!value) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return `${num}%`
}

export default function CollaboratorContractsTable({
  collaboratorId,
}: CollaboratorContractsTableProps) {
  const navigate = useNavigate()

  const { data, isLoading } = useCollaboratorContracts(
    { collaborator: collaboratorId, page_size: 10 },
    { enabled: !!collaboratorId }
  )

  const contracts = data?.results ?? []
  const total = data?.count ?? 0

  const viewAllUrl = `${APP_PATH.COLLABORATOR_CONTRACT_MANAGEMENT}?collaborator=${collaboratorId}`

  return (
    <section className="w-full rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="typo-body-lg-semibold text-content-dark-1">Hợp đồng CTV</p>
          <span className="bg-surface-1 text-content-dark-2 rounded-full px-2 py-0.5 text-xs font-medium">
            {total}
          </span>
        </div>
        <Button
          variant={'link'}
          className={cn('text-action-primary-red-default hover:text-action-primary-red-hover')}
          onClick={() => navigate(viewAllUrl)}
        >
          Xem tất cả
        </Button>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <p className="text-content-dark-3 dot-loader text-sm">Đang tải</p>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
            <p className="typo-body-base-medium text-content-dark-2">Chưa có hợp đồng</p>
            <p className="text-content-dark-3 text-xs">
              Hợp đồng của cộng tác viên này sẽ hiển thị tại đây
            </p>
          </div>
        ) : (
          <div className="border-border-1 overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-surface-1 text-content-dark-2">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">Mã HĐ</th>
                  <th className="px-3 py-2.5 text-left font-medium">Ngày ký</th>
                  <th className="px-3 py-2.5 text-right font-medium">% HH</th>
                  <th className="px-3 py-2.5 text-right font-medium">Số tiền cố định</th>
                  <th className="px-3 py-2.5 text-left font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="border-border-1 cursor-pointer border-t transition-colors hover:bg-gray-50"
                    onClick={() =>
                      navigate(
                        APP_PATH.COLLABORATOR_CONTRACT_DETAIL.replace(':id', String(contract.id))
                      )
                    }
                  >
                    <td className="px-3 py-2.5">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800">
                        {contract.code}
                      </code>
                    </td>
                    <td className="px-3 py-2.5">
                      {contract.signed_date ? formatDate(contract.signed_date) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {formatPercent(contract.pct_commission)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {contract.fixed_amount ? formatCurrencyVND(contract.fixed_amount) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <ContractStatusChip status={contract.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
