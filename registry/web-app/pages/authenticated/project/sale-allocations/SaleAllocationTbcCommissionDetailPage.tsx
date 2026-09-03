import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui/page-title'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Flex } from '@radix-ui/themes'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  useSalesAllocationTbc,
  useSalesAllocation,
  useDeleteSalesAllocationTbc,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import { useCommissionWorkspaceSACore } from '@/services/realestate-service'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND, formatPercent } from '@/utils'
import toastService from '@/services/toast-service'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'
import { queryClient } from '@/api'

export default function SaleAllocationTbcCommissionDetailPage() {
  const { saId, id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { displayConfirm } = useDialog()
  const ability = useAbility()

  const { data: salesAllocation } = useSalesAllocation(saId ?? '')

  const {
    data: record,
    isLoading,
    error,
  } = useSalesAllocationTbc(saId as string, 'tbc-commissions', id as string)

  // Editability/deletability are workspace-period concerns, not fields on the
  // bare retrieve record — mirror the history table by matching this record's
  // period in the commission workspace.
  const { data: workspace } = useCommissionWorkspaceSACore(Number(saId))
  const period = useMemo(
    () => workspace?.periods?.find((p) => p.record?.id === Number(id)),
    [workspace, id]
  )
  const canEdit = ability.can('update', 'project') && (period?.can_edit ?? false)
  const canDelete = ability.can('destroy', 'project') && (period?.can_delete ?? false)
  const canViewHistory = ability.can('histories', 'project')

  const { mutateAsync: deletePeriod } = useDeleteSalesAllocationTbc(
    saId as string,
    'tbc-commissions'
  )

  const handleBack = () => {
    // Return to the screen the user came from (PI "Phí và Thưởng" tab or SA TBC
    // tab) via the `from` route state set by the navigating table. Fall back to
    // the SA detail TBC tab when opened directly (no history state).
    const from = (location.state as { from?: string } | null)?.from
    if (from) {
      navigate(from)
      return
    }
    navigate(`${APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string)}?tab=tbc`)
  }

  const handleEdit = () => {
    navigate(
      APP_PATH.PROJECT_SA_TBC_COMMISSION_EDIT.replace(':saId', saId as string).replace(
        ':id',
        id as string
      )
    )
  }

  const handleDelete = () => {
    displayConfirm({
      title: 'Xóa cấu hình',
      description: 'Bạn có chắc chắn muốn xóa cấu hình này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deletePeriod(id as string)
          toastService.success('Đã xóa cấu hình!')
          queryClient.invalidateQueries({ queryKey: ['commission-workspace'] })
          handleBack()
        } catch (error) {
          toastService.error('Có lỗi xảy ra khi xóa')
        }
      },
    })
  }

  const handleShowHistory = () => {
    navigate(APP_PATH.PROJECT_SALE_ALLOCATIONS_HISTORY.replace(':id', saId as string))
  }

  const isError = !!error
  const isNotFound = isError && (error as any)?.response?.status === 404

  return (
    <>
      <PageTitle
        title="Chi tiết cấu hình Phí và thưởng"
        enableBackButton
        breadcrumb={[
          { label: 'Quản lý thông tin bán hàng', href: APP_PATH.PROJECT_SALE_ALLOCATIONS },
          {
            label: salesAllocation?.name || 'Chi tiết thông tin bán hàng',
            href: APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string),
          },
          {
            label: 'Phí và thưởng',
            href:
              APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string) + '?tab=tbc',
          },
          {
            label: 'Chi tiết Phí và thưởng',
            isCurrentPage: true,
          },
        ]}
        handleBackButton={handleBack}
        handleEdit={canEdit ? handleEdit : undefined}
        handleDelete={canDelete ? handleDelete : undefined}
        handleShowHistory={canViewHistory ? handleShowHistory : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isError={isError}
        isNotFound={isNotFound}
        // Trang gọi HAI lượt GET-by-id để render: `useSalesAllocationTbc(saId,'tbc-commissions',id)`
        // → `GET /realestate/sales-allocations/{sa_pk}/tbc-commissions/{id}/` → `sa_tbc.retrieve`
        // (chính bản ghi), và `useSalesAllocation(saId)` → `sales_allocation.retrieve` (breadcrumb).
        // KHÔNG lấy `project.retrieve` của route: subject cắt ở dấu chấm CUỐI nên `project` là một
        // subject khác hẳn (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={
          ability.can('retrieve', 'sa_tbc') && ability.can('retrieve', 'sales_allocation')
        }
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          {!isLoading && record && <TbcCommissionDetailView record={record} />}
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

// Thứ tự khớp form tạo/sửa (SaleAllocationTbcCommissionForm) để người dùng đối
// chiếu được 1-1 giữa màn nhập và màn xem.
const commissionCategories = [
  { key: 'agency_fee', label: 'Phí đại lý' },
  { key: 'investor_bonus', label: 'Phí đại lý tăng thêm' },
  { key: 'shared_bonus', label: 'Thưởng đại lý' },
  { key: 'sale_commission', label: 'HH nhân viên bán hàng' },
  { key: 'investor_bonus_to_sale', label: 'Thưởng cho sale' },
  // Chỉ có `amt_staff_incentive` — không có `pct_` lẫn cờ VAT.
  { key: 'staff_incentive', label: 'Thưởng MV' },
  { key: 'revenue', label: 'Tỉ lệ doanh thu' },
  { key: 'kpi_revenue_slk', label: 'Doanh thu KPI Sàn liên kết' },
] as const

const VAT_AWARE_CATEGORIES = new Set<string>(['agency_fee', 'investor_bonus', 'shared_bonus'])

function formatCommissionValue(
  pct: any,
  amt: any,
  includeVat?: boolean | null,
  isVatAware?: boolean
): string {
  const parts: string[] = []
  if (pct != null && pct !== '') parts.push(formatPercent(pct))
  if (amt != null && amt !== '') parts.push(`${formatCurrencyVND(Number(amt))} VNĐ`)
  if (parts.length === 0) return '-'
  const vatLabel =
    isVatAware && (pct != null || amt != null)
      ? includeVat === true
        ? ' (VAT)'
        : ' (Không VAT)'
      : ''
  return parts.join(' / ') + vatLabel
}

function TbcCommissionDetailView({ record }: { record: any }) {
  if (!record) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Thông tin thời gian */}
      <div className="bg-surface-primary-default flex flex-col">
        <h3 className="text-content-dark-1 mb-2 text-lg font-semibold">Thông tin thời gian</h3>
        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
          <div className="divide-border-1 flex flex-col divide-y">
            <DisplayFieldRow
              label="Ngày bắt đầu hiệu lực"
              value={record.effective_from ? formatDate(record.effective_from) : '-'}
            />
          </div>
          <div className="divide-border-1 flex flex-col divide-y">
            <DisplayFieldRow
              label="Ngày kết thúc hiệu lực"
              value={record.effective_to ? formatDate(record.effective_to) : '-'}
            />
          </div>
        </div>
      </div>

      {/* Cấu hình Phí và Thưởng */}
      <div className="bg-surface-primary-default flex flex-col">
        <h3 className="text-content-dark-1 mb-2 text-lg font-semibold">Cấu hình Phí và Thưởng</h3>
        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
          <div className="divide-border-1 flex flex-col divide-y">
            {commissionCategories
              .filter((_, i) => i % 2 === 0)
              .map((cat) => (
                <DisplayFieldRow
                  key={cat.key}
                  label={cat.label}
                  value={formatCommissionValue(
                    record[`pct_${cat.key}`],
                    record[`amt_${cat.key}`],
                    record[`is_${cat.key}_include_vat`],
                    VAT_AWARE_CATEGORIES.has(cat.key)
                  )}
                />
              ))}
          </div>
          <div className="divide-border-1 flex flex-col divide-y">
            {commissionCategories
              .filter((_, i) => i % 2 === 1)
              .map((cat) => (
                <DisplayFieldRow
                  key={cat.key}
                  label={cat.label}
                  value={formatCommissionValue(
                    record[`pct_${cat.key}`],
                    record[`amt_${cat.key}`],
                    record[`is_${cat.key}_include_vat`],
                    VAT_AWARE_CATEGORIES.has(cat.key)
                  )}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Ghi chú */}
      <div className="bg-surface-primary-default flex flex-col">
        <div className="divide-border-1 flex flex-col divide-y">
          <DisplayFieldRow label="Ghi chú" value={record.note || '-'} />
        </div>
      </div>

      {/* Tài liệu đính kèm */}
      <div className="bg-surface-primary-default flex flex-col">
        <AttachmentSection attachments={record.attachments || []} isRequired={false} />
      </div>
    </div>
  )
}
