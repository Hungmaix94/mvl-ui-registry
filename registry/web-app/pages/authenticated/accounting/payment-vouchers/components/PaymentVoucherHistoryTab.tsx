import { Chip } from '@/components/ui'
import { formatDate } from '@/utils/date-utils'
import { ColoredValueVariant } from '@/api/schema'

const getActionLabel = (action: string | null) => {
  switch (action) {
    case 'CREATE':
      return 'Khởi tạo'
    case 'CHANGE':
      return 'Cập nhật'
    case 'DELETE':
      return 'Xoá'
    case 'POST':
      return 'Ghi sổ'
    case 'CANCEL':
      return 'Huỷ phiếu'
    default:
      return action || 'Không xác định'
  }
}

const getActionVariant = (action: string | null): ColoredValueVariant => {
  switch (action) {
    case 'CREATE':
      return ColoredValueVariant.BLUE
    case 'CHANGE':
      return ColoredValueVariant.YELLOW
    case 'DELETE':
      return ColoredValueVariant.RED
    case 'POST':
      return ColoredValueVariant.GREEN
    case 'CANCEL':
      return ColoredValueVariant.GREY
    default:
      return ColoredValueVariant.GREY
  }
}

interface PaymentVoucherHistoryTabProps {
  historiesData: any
  isLoadingHistories: boolean
}

export const PaymentVoucherHistoryTab = ({
  historiesData,
  isLoadingHistories,
}: PaymentVoucherHistoryTabProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="typo-body-xl-semibold text-content-dark-1">Cập nhật trạng thái</p>
        <p className="text-content-dark-3 mt-1 text-xs">
          Theo dõi toàn bộ lịch sử tác động, thay đổi trạng thái và người thao tác trên phiếu chi
          này.
        </p>
      </div>

      <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
        {isLoadingHistories ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="border-border-1 border-t-data-blue-default h-8 w-8 animate-spin rounded-full border-4" />
            <span className="text-content-dark-3 text-sm font-medium">Đang tải lịch sử...</span>
          </div>
        ) : historiesData?.results && historiesData.results.length > 0 ? (
          <div className="border-border-1 relative ml-3 space-y-8 border-l pl-6">
            {historiesData.results.map((log: any, idx: number) => (
              <div key={log.log_id || idx} className="group relative">
                {/* Dot */}
                <div className="border-background-1 bg-data-blue-default absolute top-1.5 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 shadow-sm transition-all group-hover:scale-125" />

                <div className="border-border-1 bg-background-1 hover:border-border-2 flex flex-col gap-1 rounded-xl border p-4 transition-all duration-200 hover:shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Chip
                        label={getActionLabel(log.action)}
                        variant={getActionVariant(log.action)}
                        size="small"
                      />
                      <span className="text-content-dark-1 text-sm font-semibold">
                        {log.full_name || log.username || 'Hệ thống'}
                      </span>
                      {log.employee_code && (
                        <span className="text-content-dark-3 text-xs font-medium">
                          ({log.employee_code})
                        </span>
                      )}
                    </div>
                    <span className="text-content-dark-3 text-xs">
                      {log.timestamp ? formatDate(log.timestamp, 'dd/MM/yyyy HH:mm:ss') : '—'}
                    </span>
                  </div>

                  {log.object_repr && (
                    <div className="border-border-1 bg-background-2 text-content-dark-2 mt-2 rounded-lg border p-2.5 text-sm">
                      <span className="text-content-dark-3 mb-1 block text-xs font-semibold tracking-wider uppercase">
                        Mô tả
                      </span>
                      <span className="text-content-dark-2 font-medium break-all">
                        {log.object_repr}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-border-1 bg-background-2 rounded-xl border border-dashed p-10 text-center">
            <span className="text-4xl">⏳</span>
            <p className="text-content-dark-3 mt-3 text-sm font-semibold">
              Chưa có lịch sử cập nhật nào được ghi nhận cho phiếu chi này
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
