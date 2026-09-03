import { Chip } from '@/components/ui'
import { formatDate } from '@/utils/date-utils'
import { ColoredValueVariant } from '@/api/schema'
import { useDealPeriodAllocationHistories } from '../services/deal-period-allocation-service'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { DealPeriodAllocationStatus as DealPeriodAllocationStatus } from '@/constants/api-schema-aliases'

const STATUS_VARIANTS: Record<DealPeriodAllocationStatus | string, ColoredValueVariant> = {
  [DealPeriodAllocationStatus.DRAFT]: ColoredValueVariant.GREY,
  [DealPeriodAllocationStatus.APPROVED]: ColoredValueVariant.GREEN,
  [DealPeriodAllocationStatus.LOCKED]: ColoredValueVariant.BLUE,
  [DealPeriodAllocationStatus.VOIDED]: ColoredValueVariant.RED,
}

interface DealPeriodAllocationHistoryTabProps {
  id: number
}

export const DealPeriodAllocationHistoryTab = ({ id }: DealPeriodAllocationHistoryTabProps) => {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.DEAL_PERIOD_ALLOCATION_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.DEAL_PERIOD_ALLOCATION_STATUS_CHOICES
  ) as Record<string, string> | null

  const { data: historiesData, isLoading } = useDealPeriodAllocationHistories(
    id,
    {},
    { enabled: !!id }
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="typo-body-xl-semibold text-content-dark-1">Lịch sử cập nhật trạng thái</p>
        <p className="text-content-dark-3 mt-1 text-xs">
          Theo dõi toàn bộ lịch sử tác động, thay đổi trạng thái và người thao tác trên dòng phân bổ
          này.
        </p>
      </div>

      <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="border-border-1 border-t-data-blue-default h-8 w-8 animate-spin rounded-full border-4" />
            <span className="text-content-dark-3 text-sm font-medium">Đang tải lịch sử...</span>
          </div>
        ) : historiesData?.results && historiesData.results.length > 0 ? (
          <div className="border-border-1 relative ml-3 space-y-8 border-l pl-6">
            {historiesData.results.map((log: any, idx: number) => {
              const getStatusLabel = (statusVal: string) => {
                let lbl = statusLabels?.[statusVal] ?? statusVal
                if (statusVal === DealPeriodAllocationStatus.DRAFT && lbl === 'Bản nháp') {
                  lbl = 'Nháp'
                }
                return lbl
              }
              const fromLabel = getStatusLabel(log.from_status)
              const toLabel = getStatusLabel(log.to_status)
              const toVariant = STATUS_VARIANTS[log.to_status] ?? ColoredValueVariant.GREY

              return (
                <div key={log.id || idx} className="group relative">
                  {/* Dot */}
                  <div className="border-background-1 bg-data-blue-default absolute top-1.5 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 shadow-sm transition-all group-hover:scale-125" />

                  <div className="border-border-1 bg-background-1 hover:border-border-2 flex flex-col gap-1 rounded-xl border p-4 transition-all duration-200 hover:shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-content-dark-3 text-sm font-medium">Trạng thái:</span>
                        <span className="text-content-dark-3 text-sm font-semibold">
                          {fromLabel}
                        </span>
                        <span className="text-content-dark-3 text-sm font-medium">→</span>
                        <Chip label={toLabel} variant={toVariant} size="small" />
                        <span className="text-content-dark-1 ml-2 text-sm font-semibold">
                          {log.actor_name ||
                            log.actor_detail?.fullname ||
                            log.username ||
                            log.full_name ||
                            'Hệ thống'}
                        </span>
                        {log.actor_code && (
                          <span className="text-content-dark-3 text-xs font-medium">
                            ({log.actor_code})
                          </span>
                        )}
                      </div>
                      <span className="text-content-dark-3 text-xs">
                        {log.created_at ? formatDate(log.created_at, 'dd/MM/yyyy HH:mm:ss') : '—'}
                      </span>
                    </div>

                    {log.reason && (
                      <div className="border-border-1 bg-background-2 text-content-dark-2 mt-2 rounded-lg border p-2.5 text-sm">
                        <span className="text-content-dark-3 mb-1 block text-xs font-semibold tracking-wider uppercase">
                          Lý do
                        </span>
                        <span className="text-content-dark-2 font-medium break-all">
                          {log.reason}
                        </span>
                      </div>
                    )}

                    {log.extra && Object.keys(log.extra).length > 0 && (
                      <div className="text-content-dark-3 mt-1 text-xs">
                        Chi tiết:{' '}
                        <code className="bg-neutral-30 rounded px-1 py-0.5">
                          {JSON.stringify(log.extra)}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="border-border-1 bg-background-2 rounded-xl border border-dashed p-10 text-center">
            <span className="text-4xl">⏳</span>
            <p className="text-content-dark-3 mt-3 text-sm font-semibold">
              Chưa có lịch sử cập nhật nào được ghi nhận cho dòng phân bổ này
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
