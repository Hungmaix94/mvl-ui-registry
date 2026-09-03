import { useCallback, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Text } from '@radix-ui/themes'
import AppDialog from '@/components/dialog/AppDialog'
import { Button, PageTitle, TextField } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { ReferenceCode } from '@/components/commons/ReferenceCode'
import { dealLabel } from '@/features/accounting/_shares/utils/invoice-line-deal'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { FormProvider, useForm } from 'react-hook-form'
import FormController from '@/components/ui/form/FormController'
import {
  useSalesInvoice,
  useVoidSalesInvoice,
  useAdjustSalesInvoice,
  SalesInvoiceAdjustRequest,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { SalesInvoiceStatusBadge } from '@/features/accounting/sales-invoices/components/SalesInvoiceStatusBadge'
import IssueSalesInvoiceDialog from '@/features/accounting/sales-invoices/_shares/components/IssueSalesInvoiceDialog'
import { useAllAccountingPeriods } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { IconCheck, IconX, IconPencilsimple } from '@/assets/icons'
import { SalesInvoiceStatus as SalesInvoiceStatus } from '@/constants/api-schema-aliases'

function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="text-sm font-medium text-gray-800">{children}</div>
    </div>
  )
}

const SalesInvoiceDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const ability = useAbility()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: record, isLoading, error } = useSalesInvoice(id, { enabled: !!id })

  // Fetch all accounting periods
  const { data: periods, isLoading: isLoadingPeriods } = useAllAccountingPeriods()
  const periodData = periods?.find((p) => p.id === record?.accounting_period)

  const voidMutation = useVoidSalesInvoice()
  const adjustMutation = useAdjustSalesInvoice()
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false)
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)

  const voidForm = useForm<{ void_reason: string }>({ defaultValues: { void_reason: '' } })
  const adjustForm = useForm<{ external_invoice_no: string; total_amount: string }>({
    defaultValues: { external_invoice_no: '', total_amount: '' },
  })

  const isDraft = record?.status === SalesInvoiceStatus.DRAFT
  const isIssued = record?.status === SalesInvoiceStatus.ISSUED

  const attachmentsList = record?.attachments || []

  const handleEdit = useCallback(() => {
    navigate(APP_PATH.SALES_INVOICE_EDIT.replace(':id', String(id)))
  }, [navigate, id])

  const handleShowHistory = useCallback(() => {
    navigate(APP_PATH.SALES_INVOICE_HISTORY.replace(':id', String(id)))
  }, [navigate, id])

  const handleIssue = useCallback(() => {
    setIsIssueDialogOpen(true)
  }, [record])

  const handleVoid = useCallback(() => {
    voidForm.reset({ void_reason: '' })
    setIsVoidDialogOpen(true)
  }, [])

  const handleAdjust = useCallback(() => {
    adjustForm.reset({
      external_invoice_no: '',
      total_amount: String(record?.total_amount || ''),
    })
    setIsAdjustDialogOpen(true)
  }, [record])

  const onConfirmVoid = async () => {
    if (!record) return
    const values = voidForm.getValues()
    if (!values.void_reason) {
      voidForm.setError('void_reason', { message: 'Vui lòng nhập lý do hủy hóa đơn!' })
      throw { isValidationError: true }
    }

    try {
      await voidMutation.mutateAsync({
        id: record.id,
        data: {
          reason: values.void_reason,
        },
      })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTING.SALES_INVOICES.DETAIL(id) })
      toastService.success('Hủy hóa đơn thành công!')
      setIsVoidDialogOpen(false)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      throw { isApiError: true }
    }
  }

  const onConfirmAdjust = async () => {
    if (!record) return
    const values = adjustForm.getValues()
    let hasError = false
    if (!values.external_invoice_no) {
      adjustForm.setError('external_invoice_no', { message: 'Vui lòng nhập số hóa đơn mới!' })
      hasError = true
    }
    if (!values.total_amount) {
      adjustForm.setError('total_amount', { message: 'Vui lòng nhập tổng số tiền điều chỉnh!' })
      hasError = true
    }
    if (hasError) {
      throw { isValidationError: true }
    }

    try {
      await adjustMutation.mutateAsync({
        id: record.id,
        data: {
          invoice_date: record.invoice_date,
          total_amount: values.total_amount,
        } as SalesInvoiceAdjustRequest,
      })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTING.SALES_INVOICES.DETAIL(id) })
      toastService.success('Điều chỉnh hóa đơn thành công!')
      setIsAdjustDialogOpen(false)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      throw { isApiError: true }
    }
  }

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        idLabel={record?.code ?? '-'}
        title={`Hóa đơn bán ra ${record?.code ?? ''}`}
        enableBackButton
        handleEdit={ability.can('update', 'salesinvoice') && isDraft ? handleEdit : undefined}
        btnEditVariant="secondary"
        handleShowHistory={ability.can('histories', 'salesinvoice') ? handleShowHistory : undefined}
        customActions={
          <div className="flex gap-2">
            {ability.can('update', 'salesinvoice') && isDraft && (
              <Button variant="primary" onClick={handleIssue} leftIcon={<IconCheck size={16} />}>
                Phát hành HĐ
              </Button>
            )}
            {ability.can('update', 'salesinvoice') && isIssued && (
              <Button
                variant="primary"
                onClick={handleAdjust}
                leftIcon={<IconPencilsimple size={16} />}
              >
                Điều chỉnh HĐ
              </Button>
            )}
            {ability.can('destroy', 'salesinvoice') && (isDraft || isIssued) && (
              <Button
                variant="secondary-border"
                onClick={handleVoid}
                leftIcon={<IconX size={16} />}
              >
                Hủy hóa đơn
              </Button>
            )}
          </div>
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'salesinvoice')}
      >
        {record && (
          <div className="grid flex-grow grid-cols-[2fr_1fr] gap-5 overflow-y-auto px-7 pt-4 pb-6">
            {/* ── Left side: main details ── */}
            <div className="flex flex-col gap-5">
              <div className="border-border-1 bg-surface-primary-default rounded-xl border">
                <div className="border-border-1 border-b border-gray-100 px-6 py-3">
                  <Text size="2" weight="medium" className="text-gray-700">
                    Thông tin hóa đơn
                  </Text>
                </div>
                <div className="grid grid-cols-2 gap-x-8 px-6 pt-1 pb-4">
                  <div className="border-border-1 divide-y divide-gray-50">
                    <KVRow label="Mã hóa đơn">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                        {record.code}
                      </code>
                    </KVRow>
                    <KVRow label="Số hóa đơn thực tế">
                      {record.external_invoice_no || (
                        <span className="text-gray-400">Chưa phát hành</span>
                      )}
                    </KVRow>
                    <KVRow label="Ngày hóa đơn">
                      {record.invoice_date ? formatDate(record.invoice_date) : '—'}
                    </KVRow>
                    <KVRow label="Khách hàng / Billed party">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-normal text-gray-800">
                          {record.billed_party_type === 'INVESTOR' ? (
                            <Link
                              to={APP_PATH.INVESTOR_MANAGEMENT_DETAIL.replace(
                                ':id',
                                String(record.investor)
                              )}
                              className="text-brand-primary hover:underline"
                            >
                              {record.customer_name || '—'}
                            </Link>
                          ) : record.billed_party_type === 'CUSTOMER' && record.billed_party_id ? (
                            <Link
                              to={APP_PATH.CUSTOMER_MANAGER_DETAIL.replace(
                                ':id',
                                String(record.billed_party_id)
                              )}
                              className="text-brand-primary hover:underline"
                              target="_blank"
                            >
                              {record.customer_name || '—'}
                            </Link>
                          ) : (
                            record.customer_name || '—'
                          )}
                        </span>
                        {record.customer_tax_code && (
                          <span className="text-xs text-gray-500">
                            MST: {record.customer_tax_code}
                          </span>
                        )}
                        {record.customer_address && (
                          <span className="text-xs text-gray-500">
                            ĐC: {record.customer_address}
                          </span>
                        )}
                      </div>
                    </KVRow>
                  </div>
                  <div className="border-border-1 divide-y divide-gray-50">
                    <KVRow label="Trạng thái">
                      <SalesInvoiceStatusBadge status={record.status} />
                    </KVRow>
                    <KVRow label="Thuế suất VAT">
                      {record.vat_rates !== undefined &&
                      record.vat_rates !== null &&
                      String(record.vat_rates).trim() !== ''
                        ? `${record.vat_rates}%`
                        : '0%'}
                    </KVRow>
                    <KVRow label="Kỳ kế toán">
                      {isLoadingPeriods ? (
                        <span className="text-gray-400">Đang tải...</span>
                      ) : periodData ? (
                        `Tháng ${periodData.month}/${periodData.year}`
                      ) : record.accounting_period ? (
                        `Kỳ #${record.accounting_period}`
                      ) : (
                        '—'
                      )}
                    </KVRow>
                    <KVRow label="Kỳ hoa hồng">
                      {record.commission_period_month && record.commission_period_year
                        ? `${String(record.commission_period_month).padStart(2, '0')}/${record.commission_period_year}`
                        : '—'}
                    </KVRow>
                    {/*
                      In MÃ phiếu (IRS…) chứ không phải "#<id>", giống cột "Đối chiếu" ở màn danh
                      sách và giống file Excel xuất ra — kế toán tra cứu bằng mã, còn id chỉ là khoá
                      nội bộ không tra được ở đâu khác. Link vẫn đi theo id vì route chi tiết nhận
                      id. Rơi về "#<id>" khi BE chưa trả mã, để link không mất nhãn.
                    */}
                    <KVRow label="Bảng đối chiếu Chủ đầu tư">
                      <ReferenceCode
                        code={
                          record.investor_reconciliation_sheet_code ||
                          (record.investor_reconciliation_sheet
                            ? `#${record.investor_reconciliation_sheet}`
                            : null)
                        }
                        fallback="—"
                        linkTo={
                          record.investor_reconciliation_sheet
                            ? APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(
                                ':id',
                                String(record.investor_reconciliation_sheet)
                              )
                            : undefined
                        }
                      />
                    </KVRow>
                    {/*
                      Dự án ở cấp hoá đơn (CR 86eyp4xak). BE lấy qua chính phiếu đối chiếu ngay
                      trên, nên đặt liền kề. Bảng dòng hoá đơn phía dưới đã có cột "Dự án" riêng
                      theo từng dòng — ô này là mức hoá đơn, khớp cột "Dự án" ở màn danh sách.
                      Link đi cùng chỗ với ô dự án của bảng dòng để hai nơi không lệch nhau.
                    */}
                    <KVRow label="Dự án">
                      {record.project_name ? (
                        ability.can('retrieve', 'project') ? (
                          <Link
                            to={`${APP_PATH.PROJECT_SALE_ALLOCATIONS}?search=${encodeURIComponent(record.project_name)}`}
                            className="text-brand-primary text-xs font-medium hover:underline"
                          >
                            {record.project_name}
                          </Link>
                        ) : (
                          record.project_name
                        )
                      ) : (
                        '—'
                      )}
                    </KVRow>
                    {record.notes && <KVRow label="Ghi chú">{record.notes}</KVRow>}
                    {record.issued_at && (
                      <KVRow label="Ngày phát hành">{formatDate(record.issued_at)}</KVRow>
                    )}
                  </div>
                </div>
              </div>

              {/* Tệp đính kèm hóa đơn */}
              <div className="border-border-1 bg-surface-primary-default rounded-xl border">
                <div className="border-border-1 border-b border-gray-100 px-6 py-3">
                  <Text size="2" weight="medium" className="text-gray-700">
                    Tài liệu đính kèm hóa đơn
                  </Text>
                </div>
                <div className="px-6 py-4">
                  {attachmentsList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {attachmentsList.map((file, index) => (
                        <a
                          key={index}
                          href={file.view_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="border-border-1 bg-surface-primary-default flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-gray-50"
                          title={file.file_name || 'Tải file đính kèm'}
                        >
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-content-dark-1 truncate text-sm font-medium">
                              {file.file_name}
                            </span>
                          </div>
                          <span className="text-action-primary-red-default shrink-0 text-xs font-medium">
                            Xem tài liệu
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Chưa có tệp đính kèm nào.</span>
                  )}
                </div>
              </div>

              {/* Invoice Lines Details */}
              <div className="border-border-1 bg-surface-primary-default rounded-xl border">
                <div className="border-border-1 border-b border-gray-100 px-6 py-3">
                  <Text size="2" weight="medium" className="text-gray-700">
                    Chi tiết dòng hóa đơn (Lines)
                  </Text>
                </div>
                <div className="px-6 py-4">
                  <table className="border-border-1 w-full border-collapse border border-gray-200 text-left text-sm">
                    <thead>
                      <tr className="border-border-1 border-b border-gray-200 bg-gray-50">
                        <th className="p-3 font-semibold text-gray-700">Mã giao dịch / Deal</th>
                        <th className="p-3 font-semibold text-gray-700">Dự án</th>
                        <th className="p-3 font-semibold text-gray-700">Mã căn</th>
                        <th className="p-3 text-right font-semibold text-gray-700">
                          Tổng cộng (VND)
                        </th>
                        <th className="p-3 text-right font-semibold text-gray-700">
                          Đã thanh toán (VND)
                        </th>
                        <th className="p-3 text-right font-semibold text-gray-700">
                          Đã thanh toán - NET (VND)
                        </th>
                        <th className="p-3 text-right font-semibold text-gray-700">
                          Chờ phân bổ (VND)
                        </th>
                        <th className="p-3 text-right font-semibold text-gray-700">
                          Còn lại (VND)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="border-border-1 divide-y divide-gray-200">
                      {record.lines?.length ? (
                        record.lines.map((line) => (
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-800">
                              {/*
                                In MÃ giao dịch (HD06…) chứ không phải "#<id>" — id là khoá nội bộ,
                                không tra được ở đâu khác, trong khi bảng "Chứng từ liên kết MVL"
                                ngay dưới cùng màn này vốn đã in mã. Bỏ luôn chữ "Giao dịch" vì tiêu
                                đề cột đã là "Giao dịch / Deal". Link vẫn đi theo id (route nhận id);
                                lùi về "#<id>" khi BE chưa trả mã, để link không mất nhãn.
                              */}
                              {line.deal ? (
                                <Link
                                  to={APP_PATH.DEAL_DETAIL.replace(':id', String(line.deal))}
                                  className="text-brand-primary hover:underline"
                                >
                                  {dealLabel(line)}
                                </Link>
                              ) : (
                                'N/A'
                              )}
                              {line.description && (
                                <p className="mt-0.5 text-xs font-normal text-gray-400">
                                  {line.description}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-gray-800">
                              {line.project_name ? (
                                ability.can('retrieve', 'project') ? (
                                  <Link
                                    to={`${APP_PATH.PROJECT_SALE_ALLOCATIONS}?search=${encodeURIComponent(line.project_name)}`}
                                    className="text-brand-primary hover:underline"
                                  >
                                    {line.project_name}
                                  </Link>
                                ) : (
                                  line.project_name
                                )
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-3 text-gray-800">
                              {line.product_inventory ? (
                                ability.can('retrieve', 'product_inventory') ? (
                                  <Link
                                    to={APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(
                                      ':id',
                                      String(line.product_inventory)
                                    )}
                                    className="text-brand-primary hover:underline"
                                  >
                                    {line.unit_number || '—'}
                                  </Link>
                                ) : (
                                  line.unit_number || '—'
                                )
                              ) : (
                                line.unit_number || '—'
                              )}
                            </td>
                            <td className="p-3 text-right text-gray-900">
                              {line.line_total
                                ? formatCurrencyVND(
                                    Number(line.line_total_with_vat) > 0
                                      ? Number(line.line_total_with_vat)
                                      : Number(line.line_total) + Number(line.vat_amount || 0)
                                  )
                                : '0'}
                            </td>
                            <td className="p-3 text-right font-semibold text-green-700">
                              {line.paid_amount ? formatCurrencyVND(Number(line.paid_amount)) : '0'}
                            </td>
                            <td
                              className="p-3 text-right font-semibold text-green-800"
                              title="Tiền đã thu quy về chưa VAT — căn cứ chia hoa hồng"
                            >
                              {line.paid_amount_net
                                ? formatCurrencyVND(Number(line.paid_amount_net))
                                : '0'}
                            </td>
                            <td className="p-3 text-right font-semibold text-orange-600">
                              {line.reserved_amount
                                ? formatCurrencyVND(Number(line.reserved_amount))
                                : '0'}
                            </td>
                            <td className="p-3 text-right font-semibold text-red-600">
                              {line.remaining ? formatCurrencyVND(Number(line.remaining)) : '0'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-gray-400">
                            Không có dòng hóa đơn nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Right side: Summaries + logs ── */}
            <div className="flex flex-col gap-4">
              {/* Tiền hàng (Chưa VAT) */}
              <div className="border-border-1 border-data-blue-default/20 bg-data-blue-default/10 rounded-xl border px-6 py-5">
                <div className="text-data-blue-default text-[10px] font-bold tracking-widest uppercase">
                  Tiền hàng (Chưa VAT)
                </div>
                <div className="text-data-blue-default mt-2 text-3xl font-bold">
                  {record.total_amount ? formatCurrencyVND(Number(record.total_amount)) : '—'}
                </div>
                <div className="text-data-blue-default/80 mt-0.5 text-xs font-medium">VND</div>
              </div>

              {/* Tiền thuế VAT (X%) */}
              <div className="border-border-1 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-5">
                <div className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                  Tiền thuế VAT (
                  {record.vat_rates !== undefined &&
                  record.vat_rates !== null &&
                  String(record.vat_rates).trim() !== ''
                    ? record.vat_rates
                    : 0}
                  %)
                </div>
                <div className="mt-2 text-3xl font-bold text-neutral-700">
                  {record.vat_amount ? formatCurrencyVND(Number(record.vat_amount)) : '—'}
                </div>
                <div className="mt-0.5 text-xs font-medium text-neutral-500">VND</div>
              </div>

              {/* Tổng thanh toán (Gồm VAT) */}
              <div className="border-border-1 border-data-purple-default/20 bg-data-purple-default/10 rounded-xl border px-6 py-5">
                <div className="text-data-purple-default text-[10px] font-bold tracking-widest uppercase">
                  Tổng thanh toán (Gồm VAT)
                </div>
                <div className="text-data-purple-default mt-2 text-3xl font-bold">
                  {record.total_amount_with_vat
                    ? formatCurrencyVND(Number(record.total_amount_with_vat))
                    : '—'}
                </div>
                <div className="text-data-purple-default/80 mt-0.5 text-xs font-medium">VND</div>
              </div>

              {/* Đã thu tiền */}
              <div className="border-border-1 border-data-green-default/20 bg-data-green-default/10 rounded-xl border px-6 py-5">
                <div className="text-data-green-default text-[10px] font-bold tracking-widest uppercase">
                  Đã thu tiền
                </div>
                <div className="text-data-green-default mt-2 text-3xl font-bold">
                  {record.paid_amount ? formatCurrencyVND(Number(record.paid_amount)) : '—'}
                </div>
                <div className="text-data-green-default/80 mt-0.5 text-xs font-medium">VND</div>
              </div>

              {/* Đã trích quỹ liên quan — CHỈ LÀ THÔNG TIN: hoá đơn nay xuất đủ mặt, việc đối trừ
                  nằm ở ô "Thu từ quỹ tạm ứng" trên phiếu thu. */}
              <div className="border-border-1 border-data-orange-default/20 bg-data-orange-default/10 rounded-xl border px-6 py-5">
                <div className="text-data-orange-default text-[10px] font-bold tracking-widest uppercase">
                  Đã trích quỹ (đối trừ ở phiếu thu)
                </div>
                <div className="text-data-orange-default mt-2 text-3xl font-bold">
                  {record.prepaid_advance_amount
                    ? formatCurrencyVND(Number(record.prepaid_advance_amount))
                    : '—'}
                </div>
                <div className="text-data-orange-default/80 mt-0.5 text-xs font-medium">VND</div>
              </div>

              {/* Còn phải thu */}
              <div className="border-border-1 border-data-blue-default/20 bg-data-blue-default/10 rounded-xl border px-6 py-5">
                <div className="text-data-blue-default text-[10px] font-bold tracking-widest uppercase">
                  Còn phải thu
                </div>
                <div className="text-data-blue-default mt-2 text-3xl font-bold">
                  {formatCurrencyVND(
                    Number(record?.amount_to_collect ?? record?.remaining_amount ?? 0)
                  )}
                </div>
                <div className="text-data-blue-default/80 mt-0.5 text-xs font-medium">VND</div>
              </div>

              <div className="border-border-1 bg-surface-primary-default rounded-xl border">
                <div className="border-border-1 border-b border-gray-100 px-5 py-3">
                  <Text size="2" weight="medium" className="text-gray-700">
                    Lịch sử trạng thái
                  </Text>
                </div>
                <div className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex gap-3 text-xs">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                    <div>
                      <span className="font-normal text-gray-800">
                        {formatDate(record.created_at, 'dd/MM/yyyy HH:mm')}
                      </span>
                      <span className="text-gray-500"> — Tạo hóa đơn (Bản nháp)</span>
                    </div>
                  </div>
                  {record.issued_at && (
                    <div className="flex gap-3 text-xs">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <div>
                        <span className="font-normal text-gray-800">
                          {formatDate(record.issued_at, 'dd/MM/yyyy HH:mm')}
                        </span>
                        <span className="text-gray-500"> — Phát hành hóa đơn thực tế</span>
                      </div>
                    </div>
                  )}
                  {record.status === SalesInvoiceStatus.CANCELLED && (
                    <div className="flex gap-3 text-xs">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      <div>
                        <span className="text-gray-500">Đã hủy hóa đơn</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailPageWrapper>

      {/* ── Action Dialogs ── */}
      <IssueSalesInvoiceDialog
        open={isIssueDialogOpen}
        onOpenChange={setIsIssueDialogOpen}
        invoice={record}
        onIssued={() =>
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.ACCOUNTING.SALES_INVOICES.DETAIL(id),
          })
        }
      />

      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsVoidDialogOpen(false)}
        open={isVoidDialogOpen}
        onOpenChange={setIsVoidDialogOpen}
        title="Hủy hóa đơn"
        content={
          <div className="flex min-w-[400px] flex-col gap-4 py-4">
            <p className="text-sm text-gray-500">Vui lòng nhập lý do hủy hóa đơn này:</p>
            <FormProvider {...voidForm}>
              <FormController
                control={voidForm.control}
                register={voidForm.register}
                name="void_reason"
                Field={TextField}
                fieldProps={{
                  label: 'Lý do hủy',
                  placeholder: 'Nhập lý do hủy hóa đơn...',
                  required: true,
                }}
              />
            </FormProvider>
          </div>
        }
        onConfirm={onConfirmVoid}
        confirmText="Hủy hóa đơn"
      />

      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsAdjustDialogOpen(false)}
        open={isAdjustDialogOpen}
        onOpenChange={setIsAdjustDialogOpen}
        title="Hóa đơn điều chỉnh"
        content={
          <div className="flex min-w-[400px] flex-col gap-4 py-4">
            <p className="text-sm text-gray-500">
              Vui lòng nhập thông tin hóa đơn đỏ mới và tổng giá trị điều chỉnh thay thế:
            </p>
            <FormProvider {...adjustForm}>
              <div className="flex flex-col gap-4">
                <FormController
                  control={adjustForm.control}
                  register={adjustForm.register}
                  name="external_invoice_no"
                  Field={TextField}
                  fieldProps={{
                    label: 'Số hóa đơn mới',
                    placeholder: 'Nhập số hóa đơn đỏ...',
                    required: true,
                  }}
                />
                <FormController
                  control={adjustForm.control}
                  register={adjustForm.register}
                  name="total_amount"
                  Field={TextField}
                  fieldProps={{
                    label: 'Giá trị điều chỉnh (VND)',
                    type: 'number',
                    placeholder: 'Nhập tổng số tiền điều chỉnh...',
                    required: true,
                  }}
                />
              </div>
            </FormProvider>
          </div>
        }
        onConfirm={onConfirmAdjust}
        confirmText="Lập hóa đơn điều chỉnh"
      />
    </div>
  )
}

export default SalesInvoiceDetailPage
