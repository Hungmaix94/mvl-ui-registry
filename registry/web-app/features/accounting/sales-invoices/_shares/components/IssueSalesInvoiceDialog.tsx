import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import AppDialog from '@/components/dialog/AppDialog'
import { CurrencyInput, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { extractErrorMessage } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { useIssueSalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'

/**
 * Ô nhập số hóa đơn đỏ THỰC TẾ lúc phát hành.
 *
 * Bốn ô được prefill từ số hệ thống tính. Kế toán cầm tờ hóa đơn đỏ, thấy lệch thì sửa ngay
 * tại đây; BE tự tìm chênh lệch và ghi vào MỘT dòng "Chênh lệch làm tròn" — không dòng căn
 * nào bị nắn, vì hoa hồng cắt từ chính các dòng đó.
 *
 * Tiền hàng và tiền thuế là HAI ô riêng, không phải một ô "tổng gồm VAT": phiếu TVVL-IRS0019
 * lệch (+1 tiền hàng, −1 thuế) trong khi tổng đúng bằng 0 — gộp lại thì cả hai sai vẫn sống
 * sót mà tổng trông sạch. BE từ chối nếu chỉ gửi một trong hai.
 *
 * Chênh lệch vượt mức làm tròn giải thích được → BE trả 400 kèm hai trục dạng SỐ; dialog hiện
 * đúng con số đó và để kế toán quyết, thay vì chặn họ.
 */

export interface IssueSalesInvoiceTarget {
  id: number
  external_invoice_no?: string | null
  invoice_date?: string | null
  /** Tiền hàng hệ thống tính (chưa VAT). */
  total_amount?: string | null
  vat_amount?: string | null
}

interface IssueFormValues {
  external_invoice_no: string
  invoice_date: string
  actual_net_amount: number | undefined
  actual_vat_amount: number | undefined
}

interface RoundingGap {
  netGap: string
  vatGap: string
  limit: string
  detail: string
}

const GAP_CODE = 'rounding_gap_exceeds_limit'

/** BE ném lỗi ở vài hình dạng khác nhau tùy tầng — dò cả ba thay vì đoán một. */
export function extractRoundingGap(error: unknown): RoundingGap | null {
  const candidates = [(error as any)?.error, (error as any)?.server, error as any].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate?.code === GAP_CODE) {
      return {
        netGap: String(candidate.net_gap ?? ''),
        vatGap: String(candidate.vat_gap ?? ''),
        limit: String(candidate.limit ?? ''),
        detail: String(candidate.detail ?? ''),
      }
    }
  }
  return null
}

const toAmount = (raw: string | null | undefined): number | undefined => {
  if (raw === null || raw === undefined || raw === '') return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: IssueSalesInvoiceTarget | null | undefined
  onIssued?: () => void
}

const IssueSalesInvoiceDialog = ({ open, onOpenChange, invoice, onIssued }: Props) => {
  const issueMutation = useIssueSalesInvoice()
  const [gap, setGap] = useState<RoundingGap | null>(null)

  const form = useForm<IssueFormValues>({
    defaultValues: {
      external_invoice_no: '',
      invoice_date: '',
      actual_net_amount: undefined,
      actual_vat_amount: undefined,
    },
  })

  useEffect(() => {
    if (!open || !invoice) return
    // Prefill = số hệ thống tính. Kế toán chỉ phải gõ lại ô nào lệch với tờ hóa đơn.
    form.reset({
      external_invoice_no: invoice.external_invoice_no || '',
      invoice_date: invoice.invoice_date || '',
      actual_net_amount: toAmount(invoice.total_amount),
      actual_vat_amount: toAmount(invoice.vat_amount),
    })
    setGap(null)
  }, [open, invoice, form])

  // Hai ô tiền phải đi cùng nhau, nên chỉ cộng khi CẢ HAI có số; thiếu một thì hiện "—"
  // thay vì cộng nhầm ô trống thành 0 và bày ra một tổng trông như thật.
  const watchedNet = form.watch('actual_net_amount')
  const watchedVat = form.watch('actual_vat_amount')
  const totalWithVat =
    watchedNet === undefined || watchedVat === undefined
      ? null
      : Number(watchedNet) + Number(watchedVat)

  // Cảnh báo đã hiện thuộc về ĐÚNG cặp số đã sinh ra nó. Sửa số xong phải hỏi lại từ đầu:
  // không reset thì lần bấm thứ hai gửi `acknowledge_large_gap` cho một cặp số hoàn toàn khác
  // — kế toán thấy cảnh báo 50tr, sửa nhầm thành 5tr (vẫn sai), bấm tiếp và nó đi thẳng vào
  // hoá đơn không cảnh báo lần nào nữa. Cổng chỉ được bắn một lần cho mỗi lần mở dialog.
  useEffect(() => {
    setGap(null)
  }, [watchedNet, watchedVat])

  const submit = async (acknowledgeLargeGap: boolean) => {
    if (!invoice) return
    const values = form.getValues()

    if (!values.external_invoice_no) {
      form.setError('external_invoice_no', { message: 'Vui lòng nhập số hóa đơn đỏ thực tế!' })
      throw { isValidationError: true }
    }
    // Hai ô tiền đi cùng nhau — chặn ở đây để người dùng thấy lỗi ngay tại ô, thay vì
    // đợi BE trả 400 với thông báo chung.
    const hasNet = values.actual_net_amount !== undefined
    const hasVat = values.actual_vat_amount !== undefined
    if (hasNet !== hasVat) {
      form.setError(hasNet ? 'actual_vat_amount' : 'actual_net_amount', {
        message: 'Nhập tiền hàng và tiền thuế cùng lúc, hoặc bỏ trống cả hai.',
      })
      throw { isValidationError: true }
    }

    try {
      await issueMutation.mutateAsync({
        id: invoice.id,
        data: {
          external_invoice_no: values.external_invoice_no,
          ...(values.invoice_date ? { invoice_date: values.invoice_date } : {}),
          ...(hasNet
            ? {
                actual_net_amount: String(values.actual_net_amount),
                actual_vat_amount: String(values.actual_vat_amount),
              }
            : {}),
          // BE khai field này BẮT BUỘC — gửi tường minh `false` ở lần phát hành đầu, `true` chỉ
          // sau khi kế toán xác nhận khoảng lệch làm tròn.
          acknowledge_large_gap: acknowledgeLargeGap,
        },
      })
      toastService.success('Phát hành hóa đơn thành công!')
      setGap(null)
      onOpenChange(false)
      onIssued?.()
    } catch (err) {
      const rounding = extractRoundingGap(err)
      if (rounding && !acknowledgeLargeGap) {
        // Không phải lỗi để chặn — là câu hỏi cho kế toán. Giữ dialog mở kèm con số.
        setGap(rounding)
        throw { isValidationError: true }
      }
      toastService.error(extractErrorMessage(err))
      throw { isApiError: true }
    }
  }

  return (
    <AppDialog
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      open={open}
      onOpenChange={onOpenChange}
      title="Phát hành hóa đơn"
      content={
        <div className="flex min-w-[440px] flex-col gap-4 py-4">
          <p className="text-sm text-gray-500">
            Nhập theo đúng tờ hóa đơn đỏ. Các ô đang điền sẵn số hệ thống tính — chỉ sửa ô nào lệch.
            Chênh lệch sẽ được ghi thành một dòng &quot;Chênh lệch làm tròn&quot; trên hóa đơn, từng
            căn giữ nguyên số của nó.
          </p>
          <FormProvider {...form}>
            <FormController
              control={form.control}
              register={form.register}
              name="external_invoice_no"
              Field={TextField}
              fieldProps={{
                label: 'Số hóa đơn thực tế',
                placeholder: 'Nhập số hóa đơn...',
                required: true,
              }}
            />
            <FormController
              control={form.control}
              register={form.register}
              name="invoice_date"
              Field={DatePicker}
              fieldProps={{
                label: 'Ngày hóa đơn',
                allowManualInput: true,
                clearable: true,
                placeholder: 'DD/MM/YYYY',
                value: parseDateFromApi(form.watch('invoice_date')),
                onChange: (val: string | null | undefined) =>
                  form.setValue('invoice_date', formatDateToApi(val ?? undefined) ?? '', {
                    shouldDirty: true,
                  }),
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormController
                control={form.control}
                register={form.register}
                name="actual_net_amount"
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Tiền hàng thực tế (chưa VAT)',
                  placeholder: '0',
                  suffix: 'đ',
                  // Hoá đơn điều chỉnh giảm mang số ÂM cả hai trục. Không bật thì kế toán
                  // xoá ô để gõ lại là mất dấu trừ vĩnh viễn, và gửi lên BE một con số
                  // ngược dấu trông vẫn hợp lệ.
                  allowNegative: true,
                }}
              />
              <FormController
                control={form.control}
                register={form.register}
                name="actual_vat_amount"
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Tiền VAT thực tế',
                  placeholder: '0',
                  suffix: 'đ',
                  allowNegative: true,
                }}
              />
            </div>
            {/* Chỉ để soi với dòng cuối tờ hóa đơn. CHỈ ĐỌC, và cố ý không phải ô nhập: hai ô
                trên mới là thứ gửi lên BE, thêm ô thứ ba nhập được thì có hai nguồn cho cùng
                một con số và chúng sẽ lệch nhau. */}
            <div className="flex items-baseline justify-between rounded-md bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-600">Tổng thanh toán (gồm VAT)</span>
              <span
                className="text-sm font-medium text-gray-900"
                data-testid="issue-total-with-vat"
              >
                {totalWithVat === null ? '—' : `${formatCurrencyVND(totalWithVat)}đ`}
              </span>
            </div>
          </FormProvider>

          {gap && (
            <div
              className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm"
              data-testid="rounding-gap-warning"
            >
              <span className="font-medium text-amber-900">
                Chênh lệch vượt mức làm tròn giải thích được
              </span>
              <span className="text-amber-900">
                Tiền hàng lệch {formatCurrencyVND(Number(gap.netGap))}đ, tiền VAT lệch{' '}
                {formatCurrencyVND(Number(gap.vatGap))}đ — vượt mức{' '}
                {formatCurrencyVND(Number(gap.limit))}đ mà làm tròn có thể giải thích.
              </span>
              {/* Nói ra mức đó ở đâu ra: một con số trần trụi thì người đọc không quyết định
                  được. Không viết cứng trần mỗi căn vào đây — nó là hằng số cấu hình bên BE
                  (ROUNDING_GAP_MAX_DONG_PER_UNIT), lặp lại ở FE là hai nguồn cho một con số. */}
              <span className="text-amber-800">
                Mức này bằng số căn trên hóa đơn nhân với trần làm tròn cho mỗi căn, vì khe hở là do
                chính các căn làm tròn mà ra. Vượt xa nó thường là chọn sai cờ VAT ở một căn, hoặc
                thiếu căn trong phiếu đối chiếu — kiểm lại trước khi lưu. Vẫn muốn phát hành thì bấm
                lại nút xác nhận.
              </span>
            </div>
          )}
        </div>
      }
      onConfirm={() => submit(gap !== null)}
      confirmText={gap ? 'Vẫn phát hành' : 'Xác nhận phát hành'}
    />
  )
}

export default IssueSalesInvoiceDialog
