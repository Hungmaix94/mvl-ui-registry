import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { AccountingPeriodStatus, ColoredValueVariant } from '@/api/schema'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { DisplayField } from '@/components/commons/DisplayField.tsx'
import AppDialog from '@/components/dialog/AppDialog'
import { Button, Chip, PageTitle, TextArea } from '@/components/ui'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { QUERY_KEYS } from '@/constants'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import {
  useAccountingPeriod,
  useHardCloseAccountingPeriod,
  useReopenAccountingPeriod,
  useSoftCloseAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import { formatDate } from '@/utils/date-utils'
import { extractErrorMessage, isNotFoundError } from '@/utils/error-utils.ts'

export default function AccountingPeriodDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const periodId = id ? parseInt(id, 10) : 0
  const ability = useAbility()
  const queryClient = useQueryClient()
  const { displayConfirm } = useDialog()

  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.ACCOUNTING_PERIOD_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.ACCOUNTING_PERIOD_STATUS_CHOICES
  ) as Record<string, string> | null

  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [reopenError, setReopenError] = useState('')

  const { data: period, isLoading, error } = useAccountingPeriod(periodId)
  const softCloseMutation = useSoftCloseAccountingPeriod()
  const hardCloseMutation = useHardCloseAccountingPeriod()
  const reopenMutation = useReopenAccountingPeriod()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !period
  }, [isLoading, error, period])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = useCallback(() => {
    if (period) {
      navigate(APP_PATH.ACCOUNTING_PERIOD_EDIT.replace(':id', String(period.id)))
    }
  }, [navigate, period])

  const handleShowHistory = useCallback(() => {
    if (id) {
      navigate(APP_PATH.ACCOUNTING_PERIOD_HISTORY.replace(':id', id.toString()))
    }
  }, [navigate, id])

  const handleSoftClose = useCallback(() => {
    if (!period) return

    displayConfirm({
      title: 'Tạm đóng kỳ kế toán',
      content: (
        <div className="text-content-dark-2">
          Bạn có chắc chắn muốn <strong>tạm đóng</strong> kỳ kế toán Tháng {period.month}/
          {period.year} không?
          <br />
          Thao tác này sẽ tạm thời khóa các giao dịch thuộc kỳ này.
        </div>
      ),
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await softCloseMutation.mutateAsync({
            id: periodId,
            data: { year: period.year, month: period.month },
          })
          toastService.success('Tạm đóng kỳ kế toán thành công')
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.DETAIL(periodId),
          })
        } catch {
          // Handled by query client
        }
      },
    })
  }, [period, periodId, displayConfirm, softCloseMutation, queryClient])

  const handleHardClose = useCallback(() => {
    if (!period) return

    displayConfirm({
      title: 'Khóa sổ kỳ kế toán',
      content: (
        <div className="text-content-dark-2">
          Bạn có chắc chắn muốn <strong>khóa sổ (đóng cứng)</strong> kỳ kế toán Tháng {period.month}
          /{period.year} không?
          <br />
          Sau khi khóa sổ, kỳ kế toán sẽ không thể tự do chỉnh sửa và các giao dịch sẽ bị khóa vĩnh
          viễn trừ khi được mở lại.
        </div>
      ),
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      confirmButtonClassName:
        'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
      onConfirm: async () => {
        try {
          await hardCloseMutation.mutateAsync({
            id: periodId,
            data: { year: period.year, month: period.month },
          })
          toastService.success('Khóa sổ kỳ kế toán thành công')
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.DETAIL(periodId),
          })
        } catch {
          // Handled by query client
        }
      },
    })
  }, [period, periodId, displayConfirm, hardCloseMutation, queryClient])

  const handleOpenReopenDialog = useCallback(() => {
    setReopenReason('')
    setReopenError('')
    setIsReopenDialogOpen(true)
  }, [])

  const handleConfirmReopen = async () => {
    if (!reopenReason.trim()) {
      setReopenError('Lý do mở lại là bắt buộc')
      throw new Error('Lý do mở lại là bắt buộc')
    }
    try {
      await reopenMutation.mutateAsync({
        id: periodId,
        data: { reason: reopenReason },
      })
      toastService.success('Mở lại kỳ kế toán thành công')
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.ACCOUNTING_PERIODS.DETAIL(periodId),
      })
      setIsReopenDialogOpen(false)
    } catch (err: unknown) {
      setReopenError(extractErrorMessage(err, 'Có lỗi xảy ra khi mở lại kỳ'))
      throw err
    }
  }

  const status = period?.status
  const isOpen = status === AccountingPeriodStatus.OPEN
  const isSoftClosed = status === AccountingPeriodStatus.SOFT_CLOSED
  const isHardClosed = status === AccountingPeriodStatus.HARD_CLOSED

  let statusVariant = ColoredValueVariant.GREY
  const statusLabel = statusLabels?.[status ?? ''] ?? status ?? '-'
  if (status === AccountingPeriodStatus.OPEN) {
    statusVariant = ColoredValueVariant.GREEN
  } else if (status === AccountingPeriodStatus.SOFT_CLOSED) {
    statusVariant = ColoredValueVariant.ORANGE
  } else if (status === AccountingPeriodStatus.HARD_CLOSED) {
    statusVariant = ColoredValueVariant.RED
  }

  const customActions = period && (
    <div className="flex justify-end gap-2">
      {ability.can('histories', 'accountingperiod') && (
        <Button type="button" variant="secondary" onClick={handleShowHistory}>
          Lịch sử
        </Button>
      )}
      {ability.can('update', 'accountingperiod') && (
        <>
          {isOpen && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSoftClose}
              loading={softCloseMutation.isPending}
              disabled={softCloseMutation.isPending}
            >
              Tạm đóng
            </Button>
          )}
          {(isOpen || isSoftClosed) && (
            <Button
              type="button"
              variant="primary"
              onClick={handleHardClose}
              loading={hardCloseMutation.isPending}
              disabled={hardCloseMutation.isPending}
            >
              Khóa sổ
            </Button>
          )}
          {(isSoftClosed || isHardClosed) && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenReopenDialog}
              loading={reopenMutation.isPending}
              disabled={reopenMutation.isPending}
            >
              Mở lại
            </Button>
          )}
        </>
      )}
    </div>
  )

  const breadcrumbs = [
    { label: 'Kế toán', href: '/accounting/dashboard' },
    { label: 'Cấu hình' },
    { label: 'Kỳ kế toán', href: APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT },
    { label: period ? `Tháng ${period.month}/${period.year}` : 'Chi tiết', isCurrentPage: true },
  ]

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={period ? `Kỳ kế toán Tháng ${period.month}/${period.year}` : 'Chi tiết kỳ kế toán'}
        enableBackButton
        breadcrumb={breadcrumbs}
        handleEdit={
          ability.can('update', 'accountingperiod') && !isHardClosed ? handleEdit : undefined
        }
        customActions={customActions}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'accountingperiod')}
      >
        {period && (
          <div className="flex flex-col gap-5 px-10 py-4">
            {/* Section 1: Thông tin chung */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">
                Thông tin kỳ kế toán
              </span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <DisplayField label="Năm" value={String(period.year)} />
                  <DisplayField label="Tháng" value={`Tháng ${period.month}`} />
                  <DisplayField
                    label="Trạng thái"
                    value={<Chip variant={statusVariant} label={statusLabel} size="small" />}
                  />
                  <DisplayField
                    label="Khóa áp dụng lúc"
                    value={
                      period.locks_apply_at
                        ? formatDate(period.locks_apply_at, 'dd/MM/yyyy HH:mm')
                        : '—'
                    }
                  />
                </div>
              </div>
            </div>

            <SeparatorHorizontal />

            {/* Section 2: Thông tin đóng/mở */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">Lịch sử trạng thái</span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <DisplayField
                    label="Tạm đóng lúc"
                    value={
                      period.soft_closed_at
                        ? formatDate(period.soft_closed_at, 'dd/MM/yyyy HH:mm')
                        : '—'
                    }
                  />
                  <DisplayField
                    label="Khóa sổ lúc"
                    value={
                      period.hard_closed_at
                        ? formatDate(period.hard_closed_at, 'dd/MM/yyyy HH:mm')
                        : '—'
                    }
                  />
                  <DisplayField
                    label="Người đóng/thay đổi"
                    value={period.closed_by ? `Kế toán viên #${period.closed_by}` : '—'}
                  />
                </div>
                {period.reopen_reason && (
                  <div className="mt-6">
                    <DisplayField label="Lý do mở lại kỳ gần nhất" value={period.reopen_reason} />
                  </div>
                )}
              </div>
            </div>

            <SeparatorHorizontal />

            {/* Section 3: Metadata */}
            <div className="flex flex-col gap-5">
              <span className="typo-body-xl-semibold text-content-dark-1">Thời gian hệ thống</span>
              <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <DisplayField
                    label="Ngày tạo"
                    value={formatDate(period.created_at, 'dd/MM/yyyy HH:mm')}
                  />
                  <DisplayField
                    label="Ngày cập nhật"
                    value={formatDate(period.updated_at, 'dd/MM/yyyy HH:mm')}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailPageWrapper>

      <AppDialog
        variant="custom"
        open={isReopenDialogOpen}
        onOpenChange={setIsReopenDialogOpen}
        title="Mở lại kỳ kế toán"
        isHideCancelButton={false}
        content={
          <div className="flex flex-col gap-3 pt-4">
            <span className="typo-body-base-semibold text-content-dark-3">
              Lý do mở lại <span className="text-action-primary-red-default">*</span>
            </span>
            <TextArea
              placeholder="Vui lòng nhập lý do mở lại kỳ kế toán này..."
              value={reopenReason}
              onChange={(val) => {
                setReopenReason(val)
                if (val.trim()) setReopenError('')
              }}
              rows={4}
              maxCharacters={1000}
            />
            {reopenError && (
              <span className="typo-body-sm-medium text-action-primary-red-default">
                {reopenError}
              </span>
            )}
          </div>
        }
        onCancel={() => setIsReopenDialogOpen(false)}
        onConfirm={handleConfirmReopen}
        confirmText="Xác nhận"
        cancelText="Hủy"
      />
    </div>
  )
}
