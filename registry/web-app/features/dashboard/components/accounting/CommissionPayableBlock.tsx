import type { ComponentType } from 'react'
import { LoadingWrapper } from '@/components'
import { IconUser, IconUsergear, IconUsersthree } from '@/assets/icons'
import { useAccountantDashboardCommissionPayable } from '@/features/accounting/accountant-dashboard/services/accountant-dashboard-service'
import { formatCurrencyVND } from '@/utils/common'

type GroupKey = 'management' | 'sale' | 'collaborator'

type GroupConfig = {
  key: GroupKey
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}

const GROUPS: GroupConfig[] = [
  { key: 'management', label: 'Quản lý', icon: IconUsergear },
  { key: 'sale', label: 'Sale', icon: IconUser },
  { key: 'collaborator', label: 'Cộng tác viên', icon: IconUsersthree },
]

function CommissionPayableBlock() {
  const { data, isLoading } = useAccountantDashboardCommissionPayable()

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="typo-body-large-semibold text-content-dark-1">
          Hoa hồng phải trả {data ? `tháng ${data.month}/${data.year}` : 'tháng này'}
        </h2>
        {data && (
          <span className="text-content-dark-3 text-sm">
            Tổng: {formatCurrencyVND(data.total)} VND
          </span>
        )}
      </div>

      <LoadingWrapper isLoading={isLoading} containerHeight={300}>
        <div className="flex flex-1 flex-col gap-3">
          {GROUPS.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-1 flex-col justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <span className="bg-red-10 flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon size={22} className="text-red-70" />
                </span>
                <span className="typo-body-base-semibold text-content-dark-1">{label}</span>
              </div>

              <div className="flex items-end justify-between gap-2">
                <span className="text-content-dark-3 text-sm">Tổng cộng:</span>
                <span className="text-content-dark-1 text-2xl font-bold">
                  {formatCurrencyVND(Number(data?.[key]) || 0)}{' '}
                  <span className="text-content-dark-3 text-sm font-semibold">VND</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </LoadingWrapper>
    </div>
  )
}

export default CommissionPayableBlock
