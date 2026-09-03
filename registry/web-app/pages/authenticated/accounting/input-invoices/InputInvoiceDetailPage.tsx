import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Text } from '@radix-ui/themes'
import { Button, PageTitle, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import AppDialog from '@/components/dialog/AppDialog'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { ReferenceCode } from '@/components/commons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import toastService from '@/services/toast-service'
import { extractErrorMessage, handleApiError } from '@/utils/error-utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormProvider, useForm, Controller } from 'react-hook-form'
import {
  refreshInputInvoiceQueries,
  useInputInvoice,
  useVerifyInputInvoice,
  useMarkReceivedInputInvoice,
  useRejectInputInvoice,
  useReopenInputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'
import { useAllAccountingPeriods } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { useSalesInvoices } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { useReceiptVouchers } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import { InputInvoiceStatusBadge } from '@/features/accounting/input-invoices/components/InputInvoiceStatusBadge'
import { InputInvoiceCounterpartyType } from '@/features/accounting/input-invoices/types/input-invoice-types'
import { inputInvoiceProjectName } from '@/features/accounting/input-invoices/utils/input-invoice-project'
import { IconCheck, IconX, IconArrowcounterclockwise, IconPlus } from '@/assets/icons'
import CreatePaymentVoucherDialog from '@/features/accounting/input-invoices/components/CreatePaymentVoucherDialog'
import { canCreatePaymentVoucherForInvoice } from '@/features/accounting/input-invoices/utils/input-invoice-payment'
import { dealLabel } from '@/features/accounting/_shares/utils/invoice-line-deal'
import { InputInvoiceStatus as InputInvoiceStatus } from '@/constants/api-schema-aliases'

function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="text-sm font-medium text-gray-800">{children}</div>
    </div>
  )
}

const markReceivedSchema = z.object({
  external_invoice_no: z.string().trim().min(1, 'Vui lòng nhập số hóa đơn thực tế!'),
  invoice_date: z.string().trim().min(1, 'Vui lòng chọn ngày hóa đơn!'),
  received_date: z.string().trim().min(1, 'Vui lòng chọn ngày nhận hóa đơn!'),
  attachment_file: z.string().trim().optional(),
})

const verifySchema = z.object({
  external_invoice_no: z.string().trim().min(1, 'Vui lòng nhập số hóa đơn thực tế!'),
})

const rejectSchema = z.object({
  reason: z.string().trim().min(1, 'Vui lòng nhập lý do từ chối!'),
})

const InputInvoiceDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const ability = useAbility()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Fetch detail record
  const { data: record, isLoading, error } = useInputInvoice(id, { enabled: !!id })

  // Fetch all accounting periods
  const { data: periods, isLoading: isLoadingPeriods } = useAllAccountingPeriods()
  const periodData = periods?.find((p) => p.id === record?.accounting_period)

  // Fetch linked MVL documents
  const linkedDealIds = useMemo(() => {
    if (!record?.lines) return []
    return record.lines.map((line: any) => line.deal).filter(Boolean) as number[]
  }, [record?.lines])

  const { data: salesInvoicesData } = useSalesInvoices(
    { deal__in: linkedDealIds.join(',') } as any,
    { enabled: linkedDealIds.length > 0 }
  )

  const { data: receiptVouchersData } = useReceiptVouchers(
    { deal__in: linkedDealIds.join(',') } as any,
    { enabled: linkedDealIds.length > 0 }
  )

  const linkedDocuments = useMemo(() => {
    const docs: any[] = []

    if (salesInvoicesData?.results) {
      salesInvoicesData.results.forEach((inv: any) => {
        docs.push({
          id: inv.id,
          code: inv.code,
          type: 'Hóa đơn đầu ra',
          external_invoice_no: inv.external_invoice_no,
          date: inv.invoice_date,
          amount: Number(inv.total_amount_with_vat || inv.total_amount || 0),
          status: inv.status,
          link: APP_PATH.SALES_INVOICE_DETAIL.replace(':id', String(inv.id)),
        })
      })
    }

    if (receiptVouchersData?.results) {
      receiptVouchersData.results.forEach((rv: any) => {
        docs.push({
          id: rv.id,
          code: rv.code,
          type: 'Phiếu thu',
          external_invoice_no: null,
          date: rv.receipt_date || rv.created_at,
          amount: Number(rv.amount || 0),
          status: rv.status,
          link: APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(':id', String(rv.id)),
        })
      })
    }

    return docs
  }, [salesInvoicesData, receiptVouchersData])

  // Change logs / histories are navigated to on separate page

  // Action mutations
  const verifyMutation = useVerifyInputInvoice()
  const markReceivedMutation = useMarkReceivedInputInvoice()
  const rejectMutation = useRejectInputInvoice()
  const reopenMutation = useReopenInputInvoice()

  // Dialog open states
  const [isMarkReceivedOpen, setIsMarkReceivedOpen] = useState(false)
  const [isVerifyOpen, setIsVerifyOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [isReopenOpen, setIsReopenOpen] = useState(false)
  const [isCreateVoucherOpen, setIsCreateVoucherOpen] = useState(false)

  // Forms
  const markReceivedForm = useForm<{
    external_invoice_no: string
    invoice_date: string
    received_date: string
    attachment_file?: string
  }>({
    resolver: zodResolver(markReceivedSchema),
    defaultValues: {
      external_invoice_no: '',
      invoice_date: '',
      received_date: new Date().toISOString().split('T')[0],
      attachment_file: '',
    },
  })

  const rejectForm = useForm<{ reason: string }>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      reason: '',
    },
  })

  // Extract variables defensively
  const status = record?.status
  const externalInvoiceNo = record?.external_invoice_no
  const invoiceDate = record?.invoice_date
  const totalAmount = Number(record?.total_amount || 0)
  const expectedAmount = Number(record?.expected_amount || 0)

  // Check state transitions
  const isPending = status === InputInvoiceStatus.PENDING
  const isVerified = status === InputInvoiceStatus.VERIFIED
  const isVoided = status === InputInvoiceStatus.VOIDED
  const isRejected = status === InputInvoiceStatus.REJECTED
  const isReceived = status === InputInvoiceStatus.RECEIVED || (isPending && !!externalInvoiceNo)
  const isWaitingReceive = status === InputInvoiceStatus.DRAFT || (isPending && !externalInvoiceNo)
  const isEditable =
    status === InputInvoiceStatus.DRAFT ||
    status === InputInvoiceStatus.PENDING ||
    status === InputInvoiceStatus.RECEIVED
  // CR STT10 — "Tạo phiếu chi" only makes sense on a verified F2 invoice that still owes money.
  // A draft voucher already holding this invoice does NOT hide the button: business asked to keep
  // it visible and explain the clash in the dialog instead.
  const canCreatePaymentVoucher = canCreatePaymentVoucherForInvoice(record ?? null)

  // Action triggers
  const handleMarkReceived = useCallback(() => {
    markReceivedForm.reset({
      external_invoice_no: externalInvoiceNo || '',
      invoice_date: invoiceDate || '',
      received_date: new Date().toISOString().split('T')[0],
      attachment_file: '',
    })
    setIsMarkReceivedOpen(true)
  }, [externalInvoiceNo, invoiceDate])

  const handleVerify = useCallback(() => {
    setIsVerifyOpen(true)
  }, [])

  const handleReject = useCallback(() => {
    rejectForm.reset({ reason: '' })
    setIsRejectOpen(true)
  }, [])

  const handleReopen = useCallback(() => {
    setIsReopenOpen(true)
  }, [])

  const handleEdit = useCallback(() => {
    navigate(APP_PATH.INPUT_INVOICE_EDIT.replace(':id', String(id)))
  }, [navigate, id])

  const handleShowHistory = useCallback(() => {
    navigate(APP_PATH.INPUT_INVOICE_HISTORY.replace(':id', String(id)))
  }, [navigate, id])

  const hasOpenedRef = useRef(false)

  useEffect(() => {
    if (!record || hasOpenedRef.current) return
    // Mở dialog theo đúng action người dùng đã bấm ở DS, không suy ra từ
    // cờ trạng thái dẫn xuất (isReceived/isWaitingReceive) vốn chưa ổn định
    // ngay khi record vừa load → tránh race im lặng (bug 86exuvbwu).
    const action = searchParams.get('action')
    if (action === 'receive') {
      handleMarkReceived()
      hasOpenedRef.current = true
    } else if (action === 'verify') {
      setIsVerifyOpen(true)
      hasOpenedRef.current = true
    }
  }, [record, searchParams, handleMarkReceived])

  // Confirm Mark Received
  const onConfirmMarkReceived = async () => {
    if (!record) return
    const isValid = await markReceivedForm.trigger()
    if (!isValid) {
      throw { isValidationError: true }
    }
    const values = markReceivedForm.getValues()

    try {
      await markReceivedMutation.mutateAsync({
        id: record.id,
        data: {
          external_invoice_no: values.external_invoice_no.trim(),
          invoice_date: values.invoice_date,
          received_date: values.received_date,
          attachment_file: values.attachment_file,
        },
      })
      await refreshInputInvoiceQueries(queryClient)
      toastService.success('Đã xác nhận nhận hóa đơn đầu vào!')
      setIsMarkReceivedOpen(false)
    } catch (err) {
      handleApiError(err, markReceivedForm.setError, {
        external_invoice_no: 'external_invoice_no',
        invoice_date: 'invoice_date',
        received_date: 'received_date',
        attachment_file: 'attachment_file',
      })
      throw { isValidationError: true }
    }
  }

  const verifyForm = useForm<{ external_invoice_no: string }>({
    resolver: zodResolver(verifySchema),
    defaultValues: { external_invoice_no: '' },
  })

  useEffect(() => {
    if (isVerifyOpen && record) {
      verifyForm.reset({
        external_invoice_no: record.external_invoice_no || '',
      })
    }
  }, [isVerifyOpen, record, verifyForm])

  // Confirm Verification
  const onConfirmVerify = async () => {
    if (!record) return
    const isValid = await verifyForm.trigger()
    if (!isValid) {
      throw { isValidationError: true }
    }
    const values = verifyForm.getValues()

    try {
      await verifyMutation.mutateAsync({
        id: record.id,
        data: {
          external_invoice_no: values.external_invoice_no.trim(),
        },
      })
      await refreshInputInvoiceQueries(queryClient)
      toastService.success('Xác nhận hóa đơn thành công!')
      setIsVerifyOpen(false)
    } catch (err) {
      handleApiError(err, verifyForm.setError, {
        external_invoice_no: 'external_invoice_no',
      })
      throw { isValidationError: true }
    }
  }

  // Confirm Rejection
  const onConfirmReject = async () => {
    if (!record) return
    const isValid = await rejectForm.trigger()
    if (!isValid) {
      throw { isValidationError: true }
    }
    const values = rejectForm.getValues()

    try {
      await rejectMutation.mutateAsync({
        id: record.id,
        reason: values.reason,
      })
      await refreshInputInvoiceQueries(queryClient)
      toastService.success('Đã từ chối hóa đơn thành công!')
      setIsRejectOpen(false)
    } catch (err) {
      handleApiError(err, rejectForm.setError, {
        reason: 'reason',
      })
      throw { isValidationError: true }
    }
  }

  // Confirm Reopen
  const onConfirmReopen = async () => {
    if (!record) return
    try {
      await reopenMutation.mutateAsync(record.id)
      await refreshInputInvoiceQueries(queryClient)
      toastService.success('Đã mở lại hóa đơn đầu vào!')
      setIsReopenOpen(false)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      throw { isValidationError: true }
    }
  }

  // Handle display of attachment defensively
  const attachment = record?.attachment_file || record?.attachment
  const attachmentsList = Array.isArray(attachment) ? attachment : attachment ? [attachment] : []

  return (
    <>
      <PageTitle
        idLabel={record?.code ?? '-'}
        title={`Hóa đơn đầu vào ${record?.code ?? ''}`}
        enableBackButton
        handleEdit={ability.can('update', 'inputinvoice') && isEditable ? handleEdit : undefined}
        btnEditVariant="secondary"
        handleShowHistory={ability.can('histories', 'inputinvoice') ? handleShowHistory : undefined}
        customActions={
          <div className="flex gap-2">
            {ability.can('create_payment_voucher', 'inputinvoice') && canCreatePaymentVoucher && (
              <Button
                variant="primary"
                onClick={() => setIsCreateVoucherOpen(true)}
                leftIcon={<IconPlus size={16} />}
              >
                Tạo phiếu chi
              </Button>
            )}
            {ability.can('mark_received', 'inputinvoice') && isWaitingReceive && (
              <Button
                variant="primary"
                onClick={handleMarkReceived}
                leftIcon={<IconCheck size={16} />}
              >
                Nhận hóa đơn
              </Button>
            )}
            {ability.can('verify', 'inputinvoice') && isReceived && (
              <Button variant="primary" onClick={handleVerify} leftIcon={<IconCheck size={16} />}>
                Xác nhận
              </Button>
            )}
            {ability.can('reject', 'inputinvoice') && (isWaitingReceive || isReceived) && (
              <Button
                variant="secondary-border"
                onClick={handleReject}
                leftIcon={<IconX size={16} />}
              >
                Từ chối
              </Button>
            )}
            {ability.can('reopen', 'inputinvoice') && isRejected && (
              <Button
                variant="secondary-border"
                onClick={handleReopen}
                leftIcon={<IconArrowcounterclockwise size={16} />}
              >
                Mở lại
              </Button>
            )}
          </div>
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'inputinvoice')}
      >
        {record && (
          <div className="grid grid-cols-[2fr_1fr] gap-5 px-7 py-6">
            {/* ── Left Side: Main Detail Sections ── */}
            <div className="flex flex-col gap-5">
              {/* Metadata Info */}
              <div className="border-border-1 bg-surface-primary-default rounded-xl border">
                <div className="border-border-1 border-b border-gray-100 px-6 py-3">
                  <Text size="2" weight="medium" className="text-gray-700">
                    Thông tin hóa đơn
                  </Text>
                </div>
                <div className="grid grid-cols-2 gap-x-8 px-6 pt-1 pb-4">
                  <div className="border-border-1 divide-y divide-gray-50">
                    <KVRow label="Mã hóa đơn đầu vào">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                        {record.code}
                      </code>
                    </KVRow>
                    <KVRow label="Số hóa đơn đỏ (Thực tế)">
                      {externalInvoiceNo || (
                        <span className="text-gray-400">Chưa nhận hóa đơn</span>
                      )}
                    </KVRow>
                    <KVRow label="Ngày hóa đơn">
                      {record.invoice_date ? formatDate(record.invoice_date) : '—'}
                    </KVRow>
                    <KVRow label="Đối tác / Sàn liên kết">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-normal text-gray-800">
                          {record.counterparty_type === InputInvoiceCounterpartyType.EXCHANGE ? (
                            record.exchange ? (
                              <Link
                                to={APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(
                                  ':id',
                                  String(record.exchange)
                                )}
                                className="text-brand-primary hover:underline"
                              >
                                {record.exchange_detail?.name ||
                                  record.exchange_detail?.code ||
                                  `Sàn #${record.exchange}`}
                              </Link>
                            ) : (
                              record.exchange_detail?.name || record.exchange_detail?.code || '—'
                            )
                          ) : record.counterparty_type ===
                            InputInvoiceCounterpartyType.COLLABORATOR ? (
                            record.collaborator ? (
                              <Link
                                to={APP_PATH.COLLABORATOR_DETAIL.replace(
                                  ':id',
                                  String(record.collaborator)
                                )}
                                className="text-brand-primary hover:underline"
                              >
                                {record.collaborator_detail?.name ||
                                  `Cộng tác viên #${record.collaborator}`}
                              </Link>
                            ) : (
                              record.collaborator_detail?.name || '—'
                            )
                          ) : record.counterparty_type === InputInvoiceCounterpartyType.EMPLOYEE ? (
                            'Nhân sự nội bộ'
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>
                    </KVRow>
                  </div>
                  <div className="border-border-1 divide-y divide-gray-50">
                    <KVRow label="Trạng thái">
                      <InputInvoiceStatusBadge status={record.status} />
                    </KVRow>
                    <KVRow label="Thuế suất VAT">
                      {record.vat_rates ? `${record.vat_rates}%` : '—'}
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
                    <KVRow
                      label={
                        record.counterparty_type === 'COLLABORATOR'
                          ? 'Bảng đối chiếu CTV'
                          : record.counterparty_type === 'SUPPLIER'
                            ? 'Bảng đối chiếu Chủ đầu tư'
                            : 'Bảng đối chiếu F2'
                      }
                    >
                      {record.f2_reconciliation_sheet
                        ? (() => {
                            const reconId = record.f2_reconciliation_sheet
                            // In MÃ phiếu (FRS/IRS…) chứ không phải "#<id>" — khớp cột "Đối chiếu"
                            // ở màn danh sách và file Excel xuất ra. Lùi về "#<id>" khi BE chưa trả
                            // mã, để link không mất nhãn.
                            const reconLabel = record.f2_reconciliation_sheet_code || `#${reconId}`
                            const type = record.counterparty_type
                            let link = ''
                            if (type === 'COLLABORATOR') {
                              link = APP_PATH.CTV_RECONCILIATION_DETAIL.replace(
                                ':id',
                                String(reconId)
                              )
                            } else if (type === 'SUPPLIER') {
                              link = APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(
                                ':id',
                                String(reconId)
                              )
                            } else {
                              link = APP_PATH.F2_RECONCILIATION_DETAIL.replace(
                                ':id',
                                String(reconId)
                              )
                            }
                            return (
                              <Link
                                to={link}
                                className="text-brand-primary text-xs font-medium hover:underline"
                              >
                                {reconLabel}
                              </Link>
                            )
                          })()
                        : '—'}
                    </KVRow>
                    {/*
                      Dự án ở cấp hoá đơn. BE đọc theo PHIẾU đối chiếu ngay trên trước, rồi mới
                      lùi về dòng đầu tiên có dự án — nên đặt liền kề nguồn của nó. Bảng sản
                      phẩm phía dưới vốn đã có cột "Dự án" theo TỪNG DÒNG; ô này là mức cả hoá
                      đơn và khớp với cột "Dự án" ở màn danh sách.
                    */}
                    <KVRow label="Dự án">
                      {(() => {
                        const name = inputInvoiceProjectName(record)
                        if (!name) return '—'
                        return ability.can('retrieve', 'project') ? (
                          <Link
                            to={`${APP_PATH.PROJECT_SALE_ALLOCATIONS}?search=${encodeURIComponent(name)}`}
                            className="text-brand-primary text-xs font-medium hover:underline"
                          >
                            {name}
                          </Link>
                        ) : (
                          name
                        )
                      })()}
                    </KVRow>
                    {record.notes && <KVRow label="Ghi chú">{record.notes}</KVRow>}
                    {record.verified_at && (
                      <KVRow label="Ngày xác thực">{formatDate(record.verified_at)}</KVRow>
                    )}
                  </div>
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
                        <th className="p-3 font-semibold text-gray-700">Giao dịch / Deal</th>
                        <th className="p-3 font-semibold text-gray-700">Dự án</th>
                        <th className="p-3 font-semibold text-gray-700">Mã căn</th>
                        <th className="p-3 text-right font-semibold text-gray-700">
                          Tổng cộng (VND)
                        </th>
                        <th className="p-3 text-right font-semibold text-gray-700">
                          Đã thanh toán (VND)
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
                              {/* Mã giao dịch (HD06…), không phải id — khớp bảng "Chứng từ liên kết
                                  MVL" ngay dưới cùng màn. Lùi về "#<id>" khi BE chưa trả mã. */}
                              <ReferenceCode
                                code={dealLabel(line)}
                                fallback="N/A"
                                linkTo={
                                  line.deal
                                    ? APP_PATH.DEAL_DETAIL.replace(':id', String(line.deal))
                                    : undefined
                                }
                              />
                              {line.description && (
                                <p className="mt-0.5 text-xs font-normal text-gray-400">
                                  {line.description}
                                </p>
                              )}
                            </td>
                            {/* Cùng link với ô "Dự án" ở khối trên, để một trang không hiện cùng
                                một tên dự án hai lần mà chỉ một chỗ bấm được. */}
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
                            <td className="p-3 text-gray-800">{line.unit_number || '—'}</td>
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
                            <td className="p-3 text-right font-semibold text-orange-600">
                              {line.reserved_amount
                                ? formatCurrencyVND(Number(line.reserved_amount))
                                : '0'}
                              {/* A held amount with no visible holder is a dead end for the
                                  accountant — name the voucher so they can go cancel it. */}
                              {(line.holding_vouchers ?? []).length > 0 && (
                                <div className="mt-1 flex flex-col items-end gap-0.5">
                                  {(line.holding_vouchers ?? []).map((v) => (
                                    <Link
                                      key={v.id}
                                      to={APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(
                                        ':id',
                                        String(v.id)
                                      )}
                                      className="text-xs font-normal text-orange-700 underline"
                                    >
                                      {v.code} ({v.status === 'DRAFT' ? 'nháp' : 'đã hạch toán'})
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right font-semibold text-red-600">
                              {line.remaining ? formatCurrencyVND(Number(line.remaining)) : '0'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-gray-400">
                            Không có dòng hóa đơn nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tệp đính kèm hóa đơn */}
              <div className="border-border-1 bg-surface-primary-default rounded-xl border">
                <div className="border-border-1 border-b border-gray-100 px-6 py-3">
                  <Text size="2" weight="medium" className="text-gray-700">
                    Tài liệu đính kèm hóa đơn (VAT Red Bill)
                  </Text>
                </div>
                <div className="px-6 py-4">
                  {attachmentsList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {attachmentsList.map((file, index) => (
                        <a
                          key={file.id || index}
                          href={file.view_url || file.download_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="border-border-1 bg-surface-primary-default flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-gray-50"
                          title={file.file_name || 'Tải file đính kèm'}
                        >
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-content-dark-1 truncate text-sm font-medium">
                              {file.file_name || 'Tài liệu hóa đơn đính kèm'}
                            </span>
                            {file.size ? (
                              <span className="text-content-dark-3 mt-1 text-xs">
                                {Math.round((file.size || 0) / 1024)} KB
                              </span>
                            ) : null}
                          </div>
                          <span className="text-action-primary-red-default shrink-0 text-xs font-medium">
                            Xem tài liệu
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      Chưa có tệp đính kèm nào. Vui lòng nhận hóa đơn để tải tệp VAT đỏ lên!
                    </span>
                  )}
                </div>
              </div>

              {/* Chứng từ liên kết MVL */}
              <div className="border-border-1 bg-surface-primary-default rounded-xl border">
                <div className="border-border-1 border-b border-gray-100 px-6 py-3">
                  <Text size="2" weight="medium" className="text-gray-700">
                    Chứng từ liên kết MVL (Hóa đơn đầu ra & Phiếu thu)
                  </Text>
                </div>
                <div className="px-6 py-4">
                  {linkedDocuments.length > 0 ? (
                    <table className="border-border-1 w-full border-collapse border border-gray-200 text-left text-sm">
                      <thead>
                        <tr className="border-border-1 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 uppercase">
                          <th className="p-3">Mã chứng từ</th>
                          <th className="p-3">Loại chứng từ</th>
                          <th className="p-3">Số hóa đơn</th>
                          <th className="p-3">Ngày lập/thu</th>
                          <th className="p-3 text-right">Tổng tiền</th>
                          <th className="p-3 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {linkedDocuments.map((doc: any) => (
                          <tr key={`${doc.type}-${doc.id}`} className="hover:bg-gray-50">
                            <td className="p-3 font-medium">
                              <Link
                                to={doc.link}
                                className="text-brand-primary font-semibold hover:underline"
                              >
                                {doc.code}
                              </Link>
                            </td>
                            <td className="p-3 text-gray-600">{doc.type}</td>
                            <td className="p-3 text-gray-600">{doc.external_invoice_no || '—'}</td>
                            <td className="p-3 text-gray-600">
                              {doc.date ? formatDate(doc.date) : '—'}
                            </td>
                            <td className="p-3 text-right font-semibold text-gray-900">
                              {formatCurrencyVND(doc.amount)}
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-neutral-30 rounded-full px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
                                {doc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span className="text-sm text-gray-400">
                      Không tìm thấy hóa đơn đầu ra hoặc phiếu thu nào liên kết với các deal trong
                      hóa đơn này.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right Side: Summaries and Deviations ── */}
            <div className="flex flex-col gap-4">
              {/* Pre-VAT Amount */}
              <div className="border-border-1 border-data-blue-default/20 bg-data-blue-default/10 rounded-xl border px-6 py-5">
                <div className="text-data-blue-default text-[10px] font-bold tracking-widest uppercase">
                  Tiền hàng (Chưa VAT)
                </div>
                <div className="text-data-blue-default mt-2 text-3xl font-bold">
                  {totalAmount ? formatCurrencyVND(totalAmount) : '—'}
                </div>
                <div className="text-data-blue-default/80 mt-0.5 text-xs font-medium">VND</div>
              </div>

              {/* VAT Amount */}
              <div className="border-border-1 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-5">
                <div className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                  Tiền thuế VAT ({record.vat_rates ?? 0}%)
                </div>
                <div className="mt-2 text-2xl font-bold text-neutral-700">
                  {record.vat_amount ? formatCurrencyVND(Number(record.vat_amount)) : '—'}
                </div>
                <div className="mt-0.5 text-xs font-medium text-neutral-500">VND</div>
              </div>

              {/* Total Amount with VAT */}
              <div className="border-border-1 border-data-green-default/20 bg-data-green-default/10 rounded-xl border px-6 py-5">
                <div className="text-data-green-default text-[10px] font-bold tracking-widest uppercase">
                  Tổng thanh toán (Gồm VAT)
                </div>
                <div className="text-data-green-default mt-2 text-3xl font-bold">
                  {record.total_amount_with_vat
                    ? formatCurrencyVND(Number(record.total_amount_with_vat))
                    : '—'}
                </div>
                <div className="text-data-green-default/80 mt-0.5 text-xs font-medium">VND</div>
              </div>

              {/* Expected Match Amount */}
              <div className="border-border-1 border-data-purple-default/20 bg-data-purple-default/10 rounded-xl border px-6 py-5">
                <div className="text-data-purple-default text-[10px] font-bold tracking-widest uppercase">
                  Tổng tiền đối chiếu dự kiến
                </div>
                <div className="text-data-purple-default mt-2 text-3xl font-bold">
                  {expectedAmount ? formatCurrencyVND(expectedAmount) : '—'}
                </div>
                <div className="text-data-purple-default/80 mt-0.5 text-xs font-medium">VND</div>
              </div>

              {/* Simple State Transition Logs */}
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
                      <span className="text-gray-500"> — Tạo hóa đơn đầu vào</span>
                    </div>
                  </div>

                  {externalInvoiceNo && (
                    <div className="flex gap-3 text-xs">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                      <div>
                        <span className="font-normal text-gray-800">
                          {record.invoice_date ? formatDate(record.invoice_date) : ''}
                        </span>
                        <span className="text-gray-500">
                          {' '}
                          — Đã nhận hóa đơn thực tế (Số: {externalInvoiceNo})
                        </span>
                      </div>
                    </div>
                  )}

                  {isVerified && record.verified_at && (
                    <div className="flex gap-3 text-xs">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <div>
                        <span className="font-normal text-gray-800">
                          {formatDate(record.verified_at, 'dd/MM/yyyy HH:mm')}
                        </span>
                        <span className="text-gray-500"> — Xác nhận hóa đơn thành công</span>
                      </div>
                    </div>
                  )}

                  {isVoided && (
                    <div className="flex gap-3 text-xs">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      <div>
                        <span className="text-gray-500">Hóa đơn đã bị từ chối / hủy bỏ</span>
                        {record.notes && (
                          <p className="mt-0.5 text-gray-400 italic">Lý do: {record.notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailPageWrapper>

      {/* ── Dialog 1: Nhận hóa đơn đầu vào ── */}
      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsMarkReceivedOpen(false)}
        open={isMarkReceivedOpen}
        onOpenChange={setIsMarkReceivedOpen}
        title="Nhận hóa đơn đầu vào"
        content={
          <div className="flex min-w-[450px] flex-col gap-4 py-4">
            <p className="text-sm text-gray-500">
              Nhập đầy đủ thông tin hóa đơn đỏ VAT thực tế nhận được để cập nhật trạng thái đối
              chiếu số liệu:
            </p>
            <FormProvider {...markReceivedForm}>
              <div className="flex flex-col gap-4">
                <FormController
                  control={markReceivedForm.control}
                  register={markReceivedForm.register}
                  name="external_invoice_no"
                  Field={TextField}
                  fieldProps={{
                    label: 'Số hóa đơn thực tế',
                    placeholder: 'Nhập số hóa đơn...',
                    required: true,
                  }}
                />
                <FormController
                  control={markReceivedForm.control}
                  register={markReceivedForm.register}
                  name="invoice_date"
                  Field={TextField}
                  fieldProps={{
                    label: 'Ngày hóa đơn',
                    type: 'date',
                    required: true,
                  }}
                />
                <FormController
                  control={markReceivedForm.control}
                  register={markReceivedForm.register}
                  name="received_date"
                  Field={TextField}
                  fieldProps={{
                    label: 'Ngày nhận hóa đơn',
                    type: 'date',
                    required: true,
                  }}
                />
                <div className="mt-2 flex flex-col gap-1.5">
                  <Controller
                    control={markReceivedForm.control}
                    name="attachment_file"
                    render={({ field, fieldState }) => (
                      <FileUpload
                        label="Tệp đính kèm hóa đơn (VAT đỏ)"
                        value={field.value}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                        multiple={false}
                        purpose="accounting_input_invoice"
                      />
                    )}
                  />
                </div>
              </div>
            </FormProvider>
          </div>
        }
        onConfirm={onConfirmMarkReceived}
        confirmText="Xác nhận nhận hóa đơn"
      />

      {/* ── Dialog 2: Xác nhận hóa đơn đầu vào ── */}
      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsVerifyOpen(false)}
        open={isVerifyOpen}
        onOpenChange={setIsVerifyOpen}
        title="Xác nhận hóa đơn đầu vào"
        content={
          <div className="flex min-w-[400px] flex-col gap-4 py-4">
            <p className="text-sm text-gray-700">
              Bạn có chắc chắn muốn xác nhận hóa đơn đầu vào này không? Hành động này sẽ chuyển
              trạng thái của hóa đơn sang <strong className="text-blue-600">ĐÃ XÁC NHẬN</strong> và
              chuẩn bị cho các đợt thanh toán tiếp theo.
            </p>
            <FormProvider {...verifyForm}>
              <FormController
                control={verifyForm.control}
                register={verifyForm.register}
                name="external_invoice_no"
                Field={TextField}
                fieldProps={{
                  label: 'Số hóa đơn thực tế',
                  placeholder: 'Nhập số hóa đơn...',
                  required: true,
                }}
              />
            </FormProvider>
          </div>
        }
        onConfirm={onConfirmVerify}
        confirmText="Xác nhận đồng ý"
      />

      {/* ── Dialog 3: Từ chối hóa đơn ── */}
      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsRejectOpen(false)}
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Từ chối hóa đơn đầu vào"
        content={
          <div className="flex min-w-[400px] flex-col gap-4 py-4">
            <p className="text-sm text-gray-500">
              Vui lòng cung cấp lý do từ chối nhận hoặc xác nhận hóa đơn đầu vào này:
            </p>
            <FormProvider {...rejectForm}>
              <FormController
                control={rejectForm.control}
                register={rejectForm.register}
                name="reason"
                Field={TextField}
                fieldProps={{
                  label: 'Lý do từ chối',
                  placeholder: 'Nhập lý do chi tiết...',
                  required: true,
                }}
              />
            </FormProvider>
          </div>
        }
        onConfirm={onConfirmReject}
        confirmText="Từ chối hóa đơn"
      />

      {/* ── Dialog 4: Mở lại hóa đơn ── */}
      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsReopenOpen(false)}
        open={isReopenOpen}
        onOpenChange={setIsReopenOpen}
        title="Mở lại hóa đơn đầu vào"
        content={
          <div className="py-4">
            <p className="text-sm text-gray-700">
              Bạn có chắc chắn muốn mở lại hóa đơn đầu vào này không? Trạng thái sẽ được khôi phục
              về <strong className="text-orange-600">Bản nháp (DRAFT)</strong> để thực hiện lại các
              chỉnh sửa và đối chiếu.
            </p>
          </div>
        }
        onConfirm={onConfirmReopen}
        confirmText="Mở lại hóa đơn"
      />

      {/* ── Dialog 5: Tạo phiếu chi từ hóa đơn (CR STT10) ── */}
      <CreatePaymentVoucherDialog
        invoice={record ?? null}
        open={isCreateVoucherOpen}
        onOpenChange={setIsCreateVoucherOpen}
      />
    </>
  )
}

export default InputInvoiceDetailPage
