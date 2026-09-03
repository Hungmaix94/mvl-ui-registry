import { useCallback, useMemo } from 'react'

import { Button, PageTitle } from '@/components/ui'
import { IconInfo } from '@/assets/icons'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import SupportDeptCommissionRateForm from '@/features/accounting/support-dept-commission-rates/_shares/components/SupportDeptCommissionRateForm'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import {
  useDeleteSupportDeptCommissionRate,
  useSupportDeptCommissionRates,
  type SupportDeptCommissionRateConfig,
} from '@/features/accounting/support-dept-commission-rates/services/support-dept-commission-rate-service'
import {
  SOURCE_KIND_LABEL,
  SUPPORT_DEPT_COMMISSION_RATE_SUBJECT as SUBJECT,
} from '@/features/accounting/support-dept-commission-rates/types/support-dept-commission-rate-types'

export default function SupportDeptCommissionRateListPage() {
  const ability = useAbility()
  const { displayCustom, displayClose, displayConfirm } = useDialog()

  const canList = ability.can('list', SUBJECT)
  const canManage =
    ability.can('create', SUBJECT) &&
    ability.can('update', SUBJECT) &&
    ability.can('destroy', SUBJECT)

  const { data, isLoading, refetch } = useSupportDeptCommissionRates(undefined, {
    enabled: canList,
  })
  const rows = useMemo(() => data?.results ?? [], [data])
  const usedDepartmentIds = useMemo(() => rows.map((r) => r.department), [rows])
  const deleteMutation = useDeleteSupportDeptCommissionRate()

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/support-dept-commission-rate-configs/export/',
    'ty-le-hh-phong-ho-tro.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog({})
  }, [openExportDialog])

  const sourceLabel = (kind: string) =>
    SOURCE_KIND_LABEL[kind as keyof typeof SOURCE_KIND_LABEL] ?? kind

  const openForm = useCallback(
    (existing?: SupportDeptCommissionRateConfig) => {
      displayCustom({
        title: existing ? 'Sửa định mức hoa hồng' : 'Thêm định mức hoa hồng',
        size: 'md',
        hideFooter: true,
        content: (
          <SupportDeptCommissionRateForm
            existing={existing}
            usedDepartmentIds={usedDepartmentIds}
            onSaved={refetch}
            onClose={displayClose}
          />
        ),
      })
    },
    [displayCustom, displayClose, usedDepartmentIds, refetch]
  )

  const handleDelete = useCallback(
    (row: SupportDeptCommissionRateConfig) => {
      displayConfirm({
        title: 'Xoá định mức',
        content: `Xoá định mức hoa hồng cho phòng "${row.department_name}"?`,
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync(row.id)
            toastService.success('Đã xoá định mức')
            await refetch()
          } catch (err) {
            handleApiError(err)
          }
        },
      })
    },
    [displayConfirm, deleteMutation, refetch]
  )

  if (!canList) return null

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Định mức hoa hồng phòng hỗ trợ"
        handleCreateNew={canManage ? () => openForm() : undefined}
        titleCreateNew="Thêm định mức"
        handleExportBtnFull={canList ? handleExport : undefined}
        titleExportBtnIcon="Xuất Excel"
        topSlot={
          <div className="flex items-start gap-2.5 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3.5 text-[#92400E]">
            <IconInfo size={16} className="mt-0.5 shrink-0" />
            <div className="text-sm leading-relaxed">
              <span className="font-semibold">Cách áp dụng:</span> Mỗi phòng được cấu hình sẽ nhận
              hoa hồng = định mức × tổng tiền thu về của các căn đã duyệt chi (PBTV) trong kỳ. Phòng
              chưa có dòng cấu hình sẽ không phát sinh hoa hồng phòng hỗ trợ.
            </div>
          </div>
        }
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-10 pt-4 pb-6">
        {isLoading ? (
          <span className="text-content-dark-3">Đang tải...</span>
        ) : rows.length === 0 ? (
          <div className="border-border-1 rounded-lg border border-dashed bg-white py-8 text-center">
            <span className="typo-body-base-regular text-content-dark-3">
              Chưa có định mức hoa hồng cho phòng nào.
            </span>
          </div>
        ) : (
          <div className="border-border-1 overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-left">
              <thead className="bg-neutral-5 text-content-dark-3 typo-body-sm-semibold">
                <tr>
                  <th className="px-4 py-2">Phòng ban</th>
                  <th className="px-4 py-2">Loại nguồn</th>
                  <th className="px-4 py-2 text-right">Định mức (%)</th>
                  <th className="px-4 py-2">Kích hoạt</th>
                  {canManage && <th className="px-4 py-2 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="typo-body-base-regular text-content-dark-1">
                {rows.map((row) => (
                  <tr key={row.id} className="border-border-1 border-t">
                    <td className="px-4 py-2">{row.department_name}</td>
                    <td className="px-4 py-2">{sourceLabel(row.source_kind ?? '')}</td>
                    <td className="px-4 py-2 text-right">{row.rate}</td>
                    <td className="px-4 py-2">{row.is_active ? 'Có' : 'Không'}</td>
                    {canManage && (
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="text" onClick={() => openForm(row)}>
                            Sửa
                          </Button>
                          <Button type="button" variant="text" onClick={() => handleDelete(row)}>
                            Xoá
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
