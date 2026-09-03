import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Button, PageTitle, Chip } from '@/components/ui'
import { IconPencilsimple, IconCheck } from '@/assets/icons'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { QUERY_KEYS } from '@/constants'
import {
  useKpiAssignment,
  useConfirmKpiAssignment,
  useKpiAssignmentHistories,
} from '@/features/accounting/kpi-assignments/services/kpi-assignment-service'
import { ColoredValueVariant } from '@/api/schema'
import React from 'react'
import { KpiAssignmentStatus } from '@/constants/api-schema-aliases'

const CommMgrKPIDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const { data: assignment, isLoading, error } = useKpiAssignment(Number(id))
  const { mutateAsync: confirmKpi, isPending: isConfirming } = useConfirmKpiAssignment()
  const { data: historiesResponse, isLoading: isHistoriesLoading } = useKpiAssignmentHistories(
    Number(id),
    undefined,
    { enabled: !!id }
  )
  const auditLogs = historiesResponse?.results ?? []

  if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
  if (error || !assignment)
    return <div className="p-8 text-center text-red-500">Không tìm thấy thông tin KPI.</div>

  const handleConfirm = async () => {
    setIsConfirmOpen(false)
    try {
      await confirmKpi(Number(id))
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.KPI_ASSIGNMENTS.DETAIL(Number(id)),
      })
      toastService.success('Xác nhận chỉ tiêu KPI thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const roleLabel =
    assignment.role === 'TPKD'
      ? 'Trưởng phòng kinh doanh'
      : assignment.role === 'GDDA'
        ? 'Giám đốc dự án'
        : assignment.role

  const statusLabel =
    assignment.status === KpiAssignmentStatus.PENDING
      ? 'Đang chờ'
      : assignment.status === KpiAssignmentStatus.CONFIRMED
        ? 'Đã xác nhận'
        : assignment.status === KpiAssignmentStatus.PAID
          ? 'Đã chi'
          : assignment.status

  const statusVariant =
    assignment.status === KpiAssignmentStatus.PAID
      ? ColoredValueVariant.GREEN
      : assignment.status === KpiAssignmentStatus.CONFIRMED
        ? ColoredValueVariant.BLUE
        : ColoredValueVariant.GREY

  return (
    <>
      <AppDialog
        variant="alert"
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleConfirm}
        title="Xác nhận chỉ tiêu KPI"
        titleDescription="Sau khi xác nhận, bạn sẽ không thể chỉnh sửa thông tin này. Bạn có muốn tiếp tục?"
        confirmText="Xác nhận"
        content={null}
        loading={isConfirming}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
        <PageTitle
          title={`Chi tiết HH Quản lý KPI: Nhân viên ${assignment.employee} · Kỳ ${assignment.month}/${assignment.year}`}
          enableBackButton
          handleBackButton={() => navigate(-1)}
          handleShowHistory={() =>
            document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })
          }
          titleShowHistory="Xem lịch sử thao tác"
          customActions={
            <div className="flex gap-2">
              {assignment.status === KpiAssignmentStatus.PENDING && (
                <Button
                  size="small"
                  leftIcon={<IconCheck />}
                  onClick={() => setIsConfirmOpen(true)}
                  loading={isConfirming}
                >
                  Xác nhận
                </Button>
              )}
              <Button size="small" variant="secondary" leftIcon={<IconPencilsimple />}>
                Chỉnh sửa
              </Button>
            </div>
          }
        />

        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="border-b border-neutral-100 bg-neutral-50 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-data-green-default text-[10px] font-bold tracking-widest uppercase">
                        Hoa hồng KPI (Thực nhận)
                      </div>
                      <div className="text-data-green-default mt-2 flex items-baseline gap-1 text-4xl font-extrabold">
                        {formatCurrencyVND(Number(assignment.commission_amount || 0))}
                        <span className="text-lg font-medium text-gray-400">₫</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Chip label={statusLabel || 'Không rõ'} variant={statusVariant} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-6">
                  <div className="mb-1 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                    Diễn giải tính toán
                  </div>
                  <BreakdownItem
                    label="Chỉ tiêu (Target DT)"
                    value={Number(assignment.target_amount || 0)}
                  />
                  <BreakdownItem
                    label="Thực đạt (Actual DT)"
                    value={Number(assignment.actual_amount || 0)}
                  />
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <span className="text-sm text-gray-600">Mức độ hoàn thành</span>
                    <span className="font-bold text-blue-600">
                      {formatNumber(assignment.completion_pct || 0, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      %
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-gray-600">Tier áp dụng</span>
                    <span className="font-bold text-gray-900">
                      {assignment.applied_tier || '—'}
                    </span>
                  </div>
                  <div className="my-1 h-px bg-gray-100" />
                  <BreakdownItem
                    label="Tổng HH ghi nhận"
                    value={Number(assignment.commission_amount || 0)}
                    bold
                  />
                  {/* Fake aggregator UI for now since API lacks them */}
                  <BreakdownItem label="Trừ hoàn ứng" value={0} color="text-orange-600" />
                  <BreakdownItem label="Thuế TNCN" value={0} color="text-red-600" />
                  <div className="mt-4 flex items-center justify-between border-t-2 border-gray-900 pt-4 text-lg font-bold">
                    <span>= THỰC NHẬN</span>
                    <span className="text-data-green-default">
                      {formatCurrencyVND(Number(assignment.commission_amount || 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                  Danh sách giao dịch đóng góp (Contributions)
                </div>
                <div className="py-8 text-center text-gray-500 italic">
                  Chưa có dữ liệu giao dịch đóng góp cho kỳ này.
                </div>
              </div>
            </div>

            {/* General Info */}
            <div className="flex flex-col gap-6">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                  Thông tin quản lý
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  <InfoRow label="Nhân sự" value={`Nhân viên ${assignment.employee}`} isCode />
                  <InfoRow
                    label="Chức danh"
                    valueNode={
                      <Chip label={roleLabel || 'Không rõ'} variant={ColoredValueVariant.BLUE} />
                    }
                  />
                  <InfoRow label="Kỳ lương" value={`${assignment.month}/${assignment.year}`} />
                  {assignment.note && (
                    <div className="mt-2 border-t border-gray-100 pt-3">
                      <div className="mb-1 text-gray-400">Ghi chú:</div>
                      <div className="text-gray-700">{assignment.note}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lịch sử thao tác */}
          <div
            id="history-section"
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Lịch sử thao tác
            </div>
            {isHistoriesLoading ? (
              <div className="animate-pulse text-xs text-neutral-400">Đang tải lịch sử...</div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="flex flex-col gap-2 text-xs text-neutral-600">
                {auditLogs.map((log: any) => (
                  <div key={log.log_id} className="flex items-start gap-4">
                    <span className="w-28 font-mono text-[11px] text-neutral-400">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}
                    </span>
                    <div className="text-neutral-700">
                      • <span className="font-semibold text-neutral-800">{log.action}</span> trên{' '}
                      <span className="font-medium">
                        {log.object_repr || log.object_type || 'Chỉ tiêu KPI'}
                      </span>
                      {log.full_name || log.username ? (
                        <span className="text-neutral-400"> · {log.full_name || log.username}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-neutral-400">Chưa ghi nhận lịch sử thao tác nào.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const BreakdownItem = ({
  label,
  value,
  color = 'text-gray-900',
  bold,
}: {
  label: string
  value: number
  color?: string
  bold?: boolean
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className={`${bold ? 'text-sm font-bold' : 'text-sm text-gray-600'}`}>{label}</span>
    <span className={`${bold ? 'text-base font-bold' : 'text-sm font-semibold'} ${color}`}>
      {formatCurrencyVND(value)}
    </span>
  </div>
)

const InfoRow = ({
  label,
  value,
  valueNode,
  isCode,
}: {
  label: string
  value?: string
  valueNode?: React.ReactNode
  isCode?: boolean
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-gray-400">{label}</span>
    <div className="text-right">
      {valueNode ? (
        valueNode
      ) : isCode ? (
        <code className="rounded bg-gray-100 px-1">{value}</code>
      ) : (
        <span className="font-medium text-gray-700">{value}</span>
      )}
    </div>
  </div>
)

export default CommMgrKPIDetail
