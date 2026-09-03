import { useCallback } from 'react'
import { FormProvider, type Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { z } from 'zod'

import { Button, Select, TextArea } from '@/components/ui'
import { CurrencyInput } from '@/components/ui/currency-input/CurrencyInput'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { DATE_FORMAT } from '@/constants/date-format'
import ReconDocumentTotalCheckView from '@/features/sales/_shared/reconciliation/ReconDocumentTotalCheckView'
import {
  DocTotalBasis,
  DOC_TOTAL_BASIS_OPTIONS,
  DOC_TOTAL_BASIS_REQUIRED_MESSAGE,
  docTotalFormValues,
  sheetDocumentTotalCheck,
} from '@/features/sales/_shared/reconciliation/recon-document-total-check'
import type { InvestorReconciliationSheetWithItems } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'
import useAppConstant from '@/hooks/useAppConstant'
import { formatDate } from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils'

export type EditReconMetaValues = {
  reconciliation_date: string
  note: string
  /** Tổng ghi trên bảng kê của CĐT. `null` = không khai ⇒ BE không chạy đối chiếu tổng. */
  doc_total_amount: number | null
  /** Gốc so sánh của con số trên; BẮT BUỘC khi `doc_total_amount` có giá trị. */
  doc_total_basis: DocTotalBasis | null
}

const editReconMetaSchema = z
  .object({
    reconciliation_date: z
      .string({ required_error: 'Vui lòng chọn ngày đối chiếu' })
      .min(1, 'Vui lòng chọn ngày đối chiếu'),
    note: z
      .string()
      .nullish()
      .transform((v) => v ?? ''),
    // Chuỗi rỗng (ô vừa bị xoá) phải về `null`, KHÔNG được coerce thành 0 — 0 nghĩa là "CĐT ghi tổng
    // bằng 0" và phiếu sẽ lệch đúng bằng cả tổng của nó.
    doc_total_amount: z
      .union([z.number(), z.nan(), z.literal(''), z.null(), z.undefined()])
      .transform((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)),
    doc_total_basis: z.nativeEnum(DocTotalBasis).nullish().default(null),
  })
  .superRefine((data, ctx) => {
    if (data.doc_total_amount !== null && !data.doc_total_basis) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['doc_total_basis'],
        message: DOC_TOTAL_BASIS_REQUIRED_MESSAGE,
      })
    }
  })

type EditInvestorReconciliationMetaV2Props = {
  record: InvestorReconciliationSheetWithItems
  onSubmit: (values: EditReconMetaValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

/** Ô "label : value" chỉ-đọc — dùng cho các field khoá khi sửa (Dự án / Chủ đầu tư / Loại nguồn). */
function ReadOnlyMetaField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <span className="typo-body-base-semibold text-content-dark-2">{label}</span>
      <span className="typo-body-base-regular text-content-dark-1 flex min-h-[40px] items-center break-words">
        {value || '—'}
      </span>
    </div>
  )
}

/**
 * Sửa "Thông tin chung của phiếu" TẠI CHỖ trên màn Chi tiết 2.0 (không có route edit riêng). Layout khớp
 * view read-only (`ReconSheetMetaView`): hàng 1 Ngày đối chiếu (sửa) · Dự án · Chủ đầu tư (khoá), Loại
 * nguồn (khoá), Ghi chú (sửa). CHỈ Ngày đối chiếu + Ghi chú cho sửa — Dự án/Chủ đầu tư/Loại nguồn khoá
 * vì đổi chúng sẽ làm lệch toàn bộ căn đã thêm (muốn đổi → xoá phiếu, tạo lại). Payload meta-only do màn
 * cha build từ `record` + 2 field này (căn quản lý riêng qua dialog/lines).
 */
const EditInvestorReconciliationMetaV2 = ({
  record,
  onSubmit,
  onCancel,
  isSubmitting,
}: EditInvestorReconciliationMetaV2Props) => {
  const form = useForm<EditReconMetaValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    resolver: zodResolver(editReconMetaSchema) as unknown as Resolver<EditReconMetaValues>,
    defaultValues: {
      reconciliation_date: record.reconciliation_date
        ? formatDate(record.reconciliation_date, DATE_FORMAT)
        : '',
      note: record.note ?? '',
      ...docTotalFormValues(record),
    },
  })
  const { register, control, handleSubmit, setError } = form

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES],
  })
  const sourceLabel =
    (
      keysMap.get(APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES) as
        | Record<string, string>
        | undefined
    )?.[record.source_type] ?? record.source_type

  // Kết quả BE đã tính cho con số đã LƯU — hiện cạnh ô nhập để kế toán thấy ngay phiếu lệch bao nhiêu.
  const documentTotalCheck = sheetDocumentTotalCheck(record)

  const projectName = record.project_detail?.name ?? ''
  const investorName = record.investor_detail?.name ?? ''
  const sourceExchangeName = record.source_exchange_detail?.name ?? ''

  const onValid = useCallback(
    async (values: EditReconMetaValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onValid)} className="bg-background-1 rounded-md">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-content-dark-1 text-lg font-semibold">Thông tin chung của phiếu</h3>
          <Flex gap="3" align="center" className="shrink-0">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Cập nhật thông tin chung
            </Button>
          </Flex>
        </div>

        {/* Hàng 1: Ngày đối chiếu (sửa) · Dự án · Chủ đầu tư (khoá) — khớp lưới view read-only */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormController
            register={register}
            control={control}
            name="reconciliation_date"
            Field={DatePicker}
            wrapperClassName="h-fit"
            fieldProps={{
              label: 'Ngày đối chiếu',
              required: true,
              allowManualInput: true,
              disabled: isSubmitting,
            }}
          />
          <ReadOnlyMetaField label="Dự án" value={projectName} />
          <ReadOnlyMetaField label="Chủ đầu tư" value={investorName} />
          <ReadOnlyMetaField label="Loại nguồn" value={sourceLabel} />
          {sourceExchangeName && (
            <ReadOnlyMetaField label="Nguồn hàng" value={sourceExchangeName} />
          )}
        </div>

        {/* Tổng theo chứng từ CĐT — con số kế toán gõ từ bảng kê của CĐT để hệ thống tự kiểm tra. Bỏ
            trống là hợp lệ (không chạy kiểm tra); có số thì BẮT BUỘC chọn gốc so sánh. */}
        <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormController
            register={register}
            control={control}
            name="doc_total_amount"
            Field={CurrencyInput}
            fieldProps={{
              label: 'Tổng theo chứng từ CĐT',
              placeholder: 'Bỏ trống nếu không đối chiếu tổng',
              suffix: 'đ',
              disabled: isSubmitting,
            }}
          />
          <FormController
            register={register}
            control={control}
            name="doc_total_basis"
            Field={Select}
            fieldProps={{
              label: 'Gốc so sánh',
              placeholder: 'Chọn gốc so sánh',
              options: DOC_TOTAL_BASIS_OPTIONS,
              disabled: isSubmitting,
            }}
          />
          <div className="flex w-full flex-col gap-2">
            <span className="typo-body-base-semibold text-content-dark-2">Kết quả đối chiếu</span>
            <ReconDocumentTotalCheckView check={documentTotalCheck} />
          </div>
        </div>

        {/* Ghi chú phiếu (sửa) */}
        <div className="mt-4 grid grid-cols-1">
          <FormController
            register={register}
            control={control}
            name="note"
            Field={TextArea}
            fieldProps={{
              label: 'Ghi chú phiếu',
              placeholder: 'Ghi chú chung cho cả phiếu...',
              disabled: isSubmitting,
            }}
          />
        </div>
      </form>
    </FormProvider>
  )
}

export default EditInvestorReconciliationMetaV2
