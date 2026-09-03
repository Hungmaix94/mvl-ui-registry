import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Text } from '@radix-ui/themes'
import { Button, PageTitle, Select } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import {
  useEmployeePayoutBatch,
  useConfirmEmployeePayoutBatch,
  useExportEmployeePayoutBatch,
  usePostEmployeePayoutBatch,
  useRecalculateEmployeePayoutBatch,
  useDeleteEmployeePayoutBatch,
} from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'
import { useBankAccounts } from '@/features/accounting/bank-accounts/services/bank-account-service'
import { EmployeePayoutBatchStatusBadge } from '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchStatusBadge'
import { EmployeePayoutBatchDetailLines } from '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchDetailLines'
import { formatPayoutWave } from '@/features/accounting/employee-payout-batches/constants'
import AppDialog from '@/components/dialog/AppDialog'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { EmployeePayoutBatchStatus as EmployeeCommissionPayoutBatchStatus } from '@/constants/api-schema-aliases'

const EmployeePayoutBatchDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const queryClient = useQueryClient()
  const ability = useAbility()
  const navigate = useNavigate()

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null)
  const [voucherDate, setVoucherDate] = useState<Date>(new Date())

  const { data: record, isLoading, error } = useEmployeePayoutBatch(id, { enabled: !!id })
  const { mutateAsync: confirmBatch, isPending: isConfirming } = useConfirmEmployeePayoutBatch()
  const { mutateAsync: exportBankFile, isPending: isExporting } = useExportEmployeePayoutBatch()
  const { mutateAsync: postBatch, isPending: isPosting } = usePostEmployeePayoutBatch()
  const { mutateAsync: recalculateBatch, isPending: isRecalculating } =
    useRecalculateEmployeePayoutBatch()
  const { mutateAsync: deleteBatch, isPending: isDeleting } = useDeleteEmployeePayoutBatch()

  const { data: bankAccountsResponse } = useBankAccounts({ page_size: 50 })
  const bankAccounts = bankAccountsResponse?.results ?? []
  const bankAccountOptions = useMemo(() => {
    return bankAccounts.map((acc) => ({
      value: acc.id,
      label: `${acc.bank_name} - ${acc.account_number} (${acc.account_holder})`,
    }))
  }, [bankAccounts])

  const handleRecalculate = useCallback(async () => {
    try {
      if (!record) return
      await recalculateBatch(id)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.DETAIL(id),
      })
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'employee-payout-batches'],
      })
      toastService.success('Tính lại đợt chi thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [recalculateBatch, id, record, queryClient])

  const handleConfirm = useCallback(async () => {
    try {
      if (!record) return
      const payload = {
        year: record.year,
        month: record.month,
        batch_date: record.batch_date,
        bank_file_attachment: record.bank_file_attachment,
      }
      await confirmBatch({ id, data: payload })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.DETAIL(id),
      })
      toastService.success('Xác nhận đợt chi thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [confirmBatch, id, record, queryClient])

  const handleExportBankFile = useCallback(async () => {
    try {
      await exportBankFile(id)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.DETAIL(id),
      })
      toastService.success('Xuất file ngân hàng thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }, [exportBankFile, id, queryClient])

  const handleOpenPostDialog = useCallback(() => {
    setSelectedBankAccountId(null)
    setVoucherDate(new Date())
    setIsPostDialogOpen(true)
  }, [])

  const handleConfirmPost = useCallback(async () => {
    try {
      const payload = {
        from_bank_account: selectedBankAccountId || undefined,
        voucher_date: formatDateToApi(voucherDate) || undefined,
      }
      await postBatch({ id, data: payload })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.EMPLOYEE_PAYOUT_BATCHES.DETAIL(id),
      })
      toastService.success('Chi tiền thành công')
      setIsPostDialogOpen(false)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      throw err
    }
  }, [postBatch, id, selectedBankAccountId, voucherDate, queryClient])

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteBatch(id)
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'employee-payout-batches'],
      })
      toastService.success(`Xóa đợt chi ${record?.code} thành công`)
      setIsDeleteDialogOpen(false)
      navigate(APP_PATH.EMPLOYEE_PAYOUT_BATCH)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      throw err
    }
  }, [deleteBatch, id, record?.code, queryClient, navigate])

  const isDraft = record?.status === EmployeeCommissionPayoutBatchStatus.DRAFT
  const isConfirmed = record?.status === EmployeeCommissionPayoutBatchStatus.CONFIRMED
  const isSentToBank = record?.status === EmployeeCommissionPayoutBatchStatus.SENT_TO_BANK
  const isCancelled = record?.status === EmployeeCommissionPayoutBatchStatus.CANCELLED

  const renderCustomActions = () => {
    if (!record) return undefined

    return (
      <div className="flex gap-2">
        {ability.can('destroy', 'employeepayoutbatch') && (isDraft || isCancelled) && (
          <Button
            className="bg-action-primary-red-default hover:bg-action-primary-red-hover text-white"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isDeleting || isConfirming || isRecalculating}
            loading={isDeleting}
          >
            Xóa đợt chi
          </Button>
        )}
        {isDraft && (
          <>
            <Button
              variant="secondary"
              onClick={handleRecalculate}
              disabled={isRecalculating || isConfirming || isDeleting}
              loading={isRecalculating}
            >
              Tính lại
            </Button>
            {ability.can('confirm', 'employeepayoutbatch') && (
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isConfirming || isRecalculating || isDeleting}
                loading={isConfirming}
              >
                Xác nhận
              </Button>
            )}
          </>
        )}
        {isConfirmed && (
          <>
            {ability.can('export_bank_file', 'employeepayoutbatch') && (
              <Button
                variant="secondary"
                onClick={handleExportBankFile}
                disabled={isExporting}
                loading={isExporting}
              >
                Xuất file ngân hàng
              </Button>
            )}
            {ability.can('post_batch', 'employeepayoutbatch') && (
              <Button variant="primary" onClick={handleOpenPostDialog} disabled={isPosting}>
                Chi tiền
              </Button>
            )}
          </>
        )}
        {isSentToBank && (
          <>
            {ability.can('export_bank_file', 'employeepayoutbatch') && (
              <Button
                variant="secondary"
                onClick={handleExportBankFile}
                disabled={isExporting}
                loading={isExporting}
              >
                Xuất lại file ngân hàng
              </Button>
            )}
            {ability.can('post_batch', 'employeepayoutbatch') && (
              <Button variant="primary" onClick={handleOpenPostDialog} disabled={isPosting}>
                Chi tiền
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <PageTitle
        idLabel={record?.code ?? '-'}
        title={`Đợt chi ${record?.code ?? ''}`}
        enableBackButton
        customActions={renderCustomActions()}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'employeepayoutbatch')}
      >
        {record && (
          <div className="flex flex-col gap-6 px-7 py-6">
            <div className="border-border-1 rounded-lg border bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4 gap-y-4 lg:grid-cols-6">
                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Mã đợt chi
                  </Text>
                  <Text size="2" weight="medium">
                    {record.code}
                  </Text>
                </div>

                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Kỳ tháng
                  </Text>
                  <Text size="2" weight="medium">
                    {String(record.month).padStart(2, '0')}/{record.year}
                  </Text>
                </div>

                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Đợt chi
                  </Text>
                  <Text size="2" weight="medium">
                    {formatPayoutWave(record.wave)}
                  </Text>
                </div>

                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Trạng thái
                  </Text>
                  <div>
                    <EmployeePayoutBatchStatusBadge
                      status={record.status as EmployeeCommissionPayoutBatchStatus}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Ngày tạo đợt
                  </Text>
                  <Text size="2" weight="medium">
                    {record.batch_date ? formatDate(record.batch_date) : '-'}
                  </Text>
                </div>

                <div className="flex flex-col gap-1">
                  <Text size="1" className="text-content-dark-4 text-[10px] font-bold uppercase">
                    Tổng tiền
                  </Text>
                  <Text size="2" weight="bold" className="text-brand-primary-default">
                    {record.total_amount ? formatCurrencyVND(Number(record.total_amount)) : '-'}
                  </Text>
                </div>
              </div>
            </div>

            <EmployeePayoutBatchDetailLines record={record} />
          </div>
        )}
      </DetailPageWrapper>

      <AppDialog
        variant="custom"
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
        title="Xác nhận chi tiền (Post Batch)"
        isHideCancelButton={false}
        content={
          <div className="flex flex-col gap-4 pt-4">
            <div className="typo-body-sm-regular text-content-dark-2">
              Bạn có chắc chắn muốn thực hiện chi tiền cho đợt chi này không? Thao tác này sẽ sinh
              các phiếu chi (Payment Voucher) và ghi nhận nhật ký kế toán.
            </div>

            <Select
              name="bankAccountId"
              label="Tài khoản chi"
              placeholder="Chọn tài khoản ngân hàng (bỏ trống để chi tiền mặt)"
              value={selectedBankAccountId || ''}
              onChange={(val) => setSelectedBankAccountId(val ? Number(val) : null)}
              options={bankAccountOptions}
              clearable
            />

            <DatePicker
              label="Ngày chứng từ (Voucher Date)"
              placeholder="DD/MM/YYYY"
              value={voucherDate}
              onChange={(date) =>
                setVoucherDate(typeof date === 'string' ? new Date(date) : date || new Date())
              }
            />
          </div>
        }
        onCancel={() => setIsPostDialogOpen(false)}
        onConfirm={handleConfirmPost}
        confirmText="Xác nhận"
        cancelText="Hủy"
      />

      <AppDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xác nhận xóa đợt chi"
        variant="alert"
        confirmText="Xóa"
        loading={isDeleting}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        content={
          // `AppAlertDialog` bọc content trong div trần, không padding cũng không căn giữa, nên
          // content phải tự bù `px-6 text-center` cho khớp tiêu đề và cụm nút.
          <p className="text-content-dark-2 px-6 text-center text-sm">
            Bạn có chắc chắn muốn xóa đợt chi{' '}
            <strong className="text-content-dark-1 font-semibold">{record?.code}</strong> không?
            Hành động này không thể hoàn tác.
          </p>
        }
      />
    </>
  )
}

export default EmployeePayoutBatchDetailPage
