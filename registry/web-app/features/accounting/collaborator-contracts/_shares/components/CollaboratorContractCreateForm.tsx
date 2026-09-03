import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Table } from '@radix-ui/themes'
import { z } from 'zod'

import { Select, TextField, TextArea, CurrencyInput, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import { IconPlus, IconTrash } from '@/assets/icons'

import { useDealSelect } from '@/hooks/useDealSelect'
import CollaboratorSelectWithCreate from '@/features/accounting/collaborators/_shares/components/CollaboratorSelectWithCreate.tsx'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { CtvLineType } from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'
import { useCreateCollaboratorContract } from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { formatDateToApi } from '@/utils/date-utils'
import {
  collectSplitCreateFailureMessages,
  collectValidationMessages,
  firstSplitCreateFailureReason,
} from '@/features/accounting/collaborator-contracts/_shares/utils/collaborator-contract-create-errors'

/** Lỗi validate hiện đầy đủ inline dưới từng ô; toast chỉ để kéo mắt người dùng tới đó. */
const MAX_VALIDATION_TOASTS = 3

const decimalValue = z.union([z.string(), z.number()]).nullish()

// `z.coerce.number()` chạy `Number(undefined)` → `NaN` TRƯỚC khi zod kiểm kiểu, nên ô bỏ trống
// phát ra lỗi `invalid_type` (received nan) chứ KHÔNG phải `required_error` — thiếu
// `invalid_type_error` là người dùng nhận message mặc định tiếng Anh "Expected number, received nan".
const splitRowSchema = z.object({
  dc_sale: z.coerce.number({
    required_error: 'Vui lòng chọn căn',
    invalid_type_error: 'Vui lòng chọn căn',
  }),
  collaborator: z.coerce.number({
    required_error: 'Vui lòng chọn người nhận',
    invalid_type_error: 'Vui lòng chọn người nhận',
  }),
  // `superRefine` chứ không phải chuỗi `.refine()`: chuỗi refine đều chạy hết nên một ô trống
  // đẻ ra cả ba message cùng lúc. Ở đây mỗi ô hỏng chỉ nói đúng một câu.
  pct_commission: z.union([z.string(), z.number()]).superRefine((val, ctx) => {
    const raw = typeof val === 'number' ? String(val) : (val ?? '').trim()
    if (raw === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vui lòng nhập % hoa hồng' })
      return
    }
    const num = Number(raw.replace(/,/g, ''))
    if (Number.isNaN(num)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '% hoa hồng phải là số' })
      return
    }
    if (num < 0 || num > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '% hoa hồng phải nằm trong khoảng 0 đến 100',
      })
    }
  }),
  fixed_amount: decimalValue,
})

const collaboratorContractCreateSchema = z
  .object({
    collaborator: z.any().optional().nullable(),
    contract_amount: decimalValue,
    contract_number: z.string().nullish(),
    signed_date: z.string().nullish(),
    pct_line_bonus: decimalValue,
    amt_supplementary_fee: decimalValue,
    pct_supplementary_fee: decimalValue,
    ctv_line_type: z.nativeEnum(CtvLineType).nullish(),
    note: z.string().nullish(),
    splits: z.array(splitRowSchema).min(1, 'Vui lòng thêm ít nhất một dòng chia'),
  })
  .superRefine((data, ctx) => {
    if (
      data.contract_amount !== null &&
      data.contract_amount !== undefined &&
      data.contract_amount !== ''
    ) {
      const totalAmount =
        typeof data.contract_amount === 'number'
          ? data.contract_amount
          : Number(String(data.contract_amount).replace(/,/g, ''))

      if (!Number.isNaN(totalAmount)) {
        const sumSplits = data.splits.reduce((acc, split) => {
          if (
            split.fixed_amount !== null &&
            split.fixed_amount !== undefined &&
            split.fixed_amount !== ''
          ) {
            const amt =
              typeof split.fixed_amount === 'number'
                ? split.fixed_amount
                : Number(String(split.fixed_amount).replace(/,/g, ''))
            return acc + (Number.isNaN(amt) ? 0 : amt)
          }
          return acc
        }, 0)

        if (sumSplits !== totalAmount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['contract_amount'],
            message: `Tổng tiền các dòng chia (${sumSplits.toLocaleString('vi-VN')} đ) phải bằng số tiền hợp đồng (${totalAmount.toLocaleString('vi-VN')} đ)`,
          })
        }
      }
    }
  })

export type CollaboratorContractCreateValues = z.infer<typeof collaboratorContractCreateSchema>

export type CollaboratorContractCreateFormRef = {
  /**
   * Resolve = tạo xong. Reject = form dừng lại, và LÝ DO ĐÃ ĐƯỢC BÁO cho người dùng bằng toast
   * (validate ở đây, lỗi API trong `onSubmit`). Caller vẫn phải `catch` — bỏ trống là promise rơi
   * thành unhandled rejection và người dùng thấy "bấm không lên gì".
   */
  submitForm: () => Promise<void>
}

type CollaboratorContractCreateFormProps = {
  onSuccess: () => void
}

const toApiDecimal = (value: string | number | null | undefined): string | null => {
  if (value === '' || value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (Number.isNaN(num)) return null
  return String(num)
}

/**
 * Ô trong bảng chia là control TRẦN (`Controller` + `Select`/`input`), không đi qua
 * `FormController` nên không có chỗ nào in lỗi ra. Thiếu component này thì mọi lỗi của dòng chia
 * đều vô hình — và với form trống thì TOÀN BỘ lỗi đều nằm ở đó, nên màn hình không đổi một pixel
 * (ClickUp 86eypf62k).
 */
function SplitCellError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null
  return (
    <span role="alert" className={cn('text-danger typo-body-sm block px-3 pb-2', className)}>
      {message}
    </span>
  )
}

/** Tiêu đề nhóm trường trong dialog: chia form dài thành các khối đọc được, có vạch ngăn nhẹ. */
function FormSectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <h3 className="text-content-dark-1 typo-body-md-bold whitespace-nowrap">{children}</h3>
      <span className="bg-border-1 h-px flex-1" />
    </div>
  )
}

const CollaboratorContractCreateForm = forwardRef<
  CollaboratorContractCreateFormRef,
  CollaboratorContractCreateFormProps
>(({ onSuccess }, ref) => {
  const [fileToken, setFileToken] = useState<string>('')
  const inFlightSubmitRef = useRef<Promise<void> | null>(null)
  const createMutation = useCreateCollaboratorContract()
  const invalidateQueries = useInvalidateQueries()

  const { loadDealOptions, loadInitialDealOptions } = useDealSelect()

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.CTV_LINE_TYPE_CHOICES],
  })

  const lineTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.CTV_LINE_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const ctvLineTypeOptions = useMemo(() => {
    return Object.values(CtvLineType).map((value) => ({
      value,
      label: lineTypeLabels?.[value] ?? value,
    }))
  }, [lineTypeLabels])

  const form = useForm<CollaboratorContractCreateValues>({
    resolver: zodResolver(collaboratorContractCreateSchema),
    mode: 'onTouched',
    defaultValues: {
      collaborator: undefined,
      contract_amount: '',
      contract_number: '',
      signed_date: '',
      pct_line_bonus: '',
      amt_supplementary_fee: '',
      pct_supplementary_fee: '',
      ctv_line_type: undefined,
      note: '',
      splits: [
        {
          dc_sale: undefined,
          collaborator: undefined,
          pct_commission: '',
          fixed_amount: '',
        },
      ],
    },
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'splits',
  })

  const mainCollaborator = watch('collaborator')

  const handleAddSplitRow = useCallback(() => {
    append({
      dc_sale: undefined as any,
      collaborator: mainCollaborator ? Number(mainCollaborator) : (undefined as any),
      pct_commission: '',
      fixed_amount: '',
    })
  }, [append, mainCollaborator])

  const handleFileChange = useCallback((token: string) => {
    setFileToken(token)
  }, [])

  const getSplitError = useCallback(
    (index: number, field: 'dc_sale' | 'collaborator' | 'pct_commission'): string | undefined => {
      const message = errors.splits?.[index]?.[field]?.message
      return typeof message === 'string' ? message : undefined
    },
    [errors.splits]
  )

  const onSubmit = useCallback(
    async (data: CollaboratorContractCreateValues) => {
      // Mỗi dòng chia gọi một request POST riêng (một collaborator-contract/dòng),
      // không phải một request duy nhất mang mảng lồng — nên lỗi trả về (vd trùng
      // collaborator+deal) không mang theo chỉ số dòng và không khớp field nào trong
      // form. Dùng Promise.allSettled + biết trước index của từng request để toast rõ
      // dòng nào lỗi, thay vì Promise.all cũ chỉ báo lỗi request đầu tiên fail và im
      // lặng bỏ qua các dòng khác (ClickUp 86eyc1z4v).
      const requests = data.splits.map((split) => {
        const payload: any = {
          deal: split.dc_sale, // Map to deal because split.dc_sale contains the Deal ID
          collaborator: split.collaborator,
          pct_commission: toApiDecimal(split.pct_commission) || '0',
        }

        if (data.contract_number) {
          payload.contract_number = data.contract_number
        }
        if (data.signed_date) {
          payload.signed_date = formatDateToApi(data.signed_date)
        }
        if (split.fixed_amount) {
          payload.fixed_amount = toApiDecimal(split.fixed_amount)
        }
        if (data.pct_line_bonus) {
          payload.pct_line_bonus = toApiDecimal(data.pct_line_bonus)
        }
        if (data.amt_supplementary_fee) {
          payload.amt_supplementary_fee = toApiDecimal(data.amt_supplementary_fee)
        }
        if (data.pct_supplementary_fee) {
          payload.pct_supplementary_fee = toApiDecimal(data.pct_supplementary_fee)
        }
        if (data.ctv_line_type) {
          payload.ctv_line_type = data.ctv_line_type
        }
        if (data.note) {
          payload.note = data.note
        }
        if (fileToken) {
          payload.files = { attachment: fileToken }
        }

        return createMutation.mutateAsync(payload)
      })

      const settled = await Promise.allSettled(requests)
      const failureMessages = collectSplitCreateFailureMessages(settled)

      if (failureMessages.length > 0) {
        failureMessages.forEach((message) => toastService.error(message))
        throw firstSplitCreateFailureReason(settled)
      }

      await invalidateQueries.invalidateByPrefix('sales/collaborator-contracts')
      toastService.success('Tạo hợp đồng Cộng tác viên thành công')
      onSuccess()
    },
    [fileToken, createMutation, invalidateQueries, onSuccess]
  )

  useImperativeHandle(
    ref,
    () => ({
      submitForm: () => {
        // Mỗi dòng chia là một POST riêng, nên hai cú click lọt qua = 2N hợp đồng. Cờ `useState`
        // không chặn được (nút chỉ disabled sau khi React commit — xem conventions.md); ref đổi
        // ngay trong cùng tick nên cú click thứ hai gặp ngay chốt này.
        //
        // Trả lại ĐÚNG promise đang chạy chứ không phải một `Promise.resolve()` mới: `AppDialog`
        // đóng dialog khi promise resolve, nên trả về "đã xong" trong lúc request còn đang bay là
        // đóng dialog sớm và người dùng mất dữ liệu nếu request đó hỏng.
        if (inFlightSubmitRef.current) return inFlightSubmitRef.current

        const run = new Promise<void>((resolve, reject) => {
          handleSubmit(
            async (data) => {
              try {
                await onSubmit(data)
                resolve()
              } catch (err) {
                reject(err)
              }
            },
            (validationErrors) => {
              // Không có bước này thì form dừng im lặng: không request nào rời trình duyệt và
              // không có chữ nào hiện ra (ClickUp 86eypf62k).
              const messages = collectValidationMessages(validationErrors)
              const shown = messages.slice(0, MAX_VALIDATION_TOASTS)
              if (shown.length === 0) {
                toastService.error('Vui lòng kiểm tra lại thông tin đã nhập.')
              } else {
                shown.forEach((message) => toastService.error(message))
                if (messages.length > shown.length) {
                  toastService.error(
                    `… và ${messages.length - shown.length} lỗi khác trong biểu mẫu.`
                  )
                }
              }
              reject({ isValidationError: true, errors: validationErrors })
            }
          )()
        }).finally(() => {
          inFlightSubmitRef.current = null
        })

        inFlightSubmitRef.current = run
        return run
      },
    }),
    [handleSubmit, onSubmit]
  )

  return (
    <Form
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      loading={isSubmitting}
      className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto"
    >
      {/* Thông tin hợp đồng */}
      <section className="flex flex-col gap-3">
        <FormSectionTitle>Thông tin hợp đồng</FormSectionTitle>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
          <FormController
            register={register}
            name="collaborator"
            control={control}
            fieldProps={{
              label: 'Cộng tác viên (CTV)',
              placeholder: 'Chọn cộng tác viên chính',
              searchPlaceholder: 'Tìm theo mã, họ tên hoặc CCCD...',
              clearable: true,
              required: false,
            }}
            Field={CollaboratorSelectWithCreate}
          />

          <FormController
            register={register}
            name="contract_amount"
            control={control}
            fieldProps={{
              label: 'Số tiền hợp đồng (VND)',
              placeholder: 'Nhập số tiền hợp đồng',
            }}
            Field={CurrencyInput}
          />

          <FormController
            register={register}
            name="contract_number"
            control={control}
            fieldProps={{
              label: 'Số hợp đồng',
              placeholder: 'Nhập số hợp đồng',
            }}
            Field={TextField}
          />

          <FormController
            register={register}
            name="signed_date"
            control={control}
            fieldProps={{
              label: 'Ngày ký',
              placeholder: 'Chọn ngày ký',
              allowManualInput: true,
              clearable: true,
            }}
            Field={DatePicker}
          />
        </div>
      </section>

      {/* Thưởng line & phí bổ sung */}
      <section className="flex flex-col gap-3">
        <FormSectionTitle>Thưởng line &amp; phí bổ sung</FormSectionTitle>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
          <FormController
            register={register}
            name="pct_line_bonus"
            control={control}
            fieldProps={{
              label: 'Tỷ lệ Line owner bonus (%)',
              placeholder: 'Nhập tỷ lệ thưởng line owner (%)',
            }}
            Field={TextField}
          />

          <FormController
            register={register}
            name="ctv_line_type"
            control={control}
            fieldProps={{
              label: 'Loại line owner bonus',
              placeholder: 'Chọn loại line',
              options: ctvLineTypeOptions,
              clearable: true,
            }}
            Field={Select}
          />

          <FormController
            register={register}
            name="amt_supplementary_fee"
            control={control}
            fieldProps={{
              label: 'Phí bổ sung (VND)',
              placeholder: 'Nhập phí bổ sung',
            }}
            Field={CurrencyInput}
          />

          <FormController
            register={register}
            name="pct_supplementary_fee"
            control={control}
            fieldProps={{
              label: '% Phí bổ sung',
              placeholder: 'Nhập % phí bổ sung',
            }}
            Field={TextField}
          />
        </div>
      </section>

      {/* Dynamic Splits Section */}
      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <FormSectionTitle className="min-w-0 flex-1">Chia theo từng căn/người</FormSectionTitle>
          {/* Icon phải đi qua prop `leftIcon`: để trong `children` thì icon + chữ cùng nằm trong
              span co giãn của Button và nhãn bị xuống dòng khi hàng chật. */}
          <Button
            type="button"
            variant="secondary-border"
            size="small"
            onClick={handleAddSplitRow}
            leftIcon={<IconPlus className="h-4 w-4" />}
            className="shrink-0"
            childrenClassName="whitespace-nowrap"
          >
            Thêm dòng
          </Button>
        </div>
        {/* Bảng 6 cột không co vừa mọi bề rộng dialog: đặt bề rộng tối thiểu rồi cho cuộn ngang,
            thay vì để trình duyệt bóp cột khiến nhãn xuống dòng từng chữ. `min-w-0` là bắt buộc —
            không có nó, flex item nở theo `min-w` của bảng và bảng bị CẮT thay vì cuộn được. */}
        <div className="border-border-1 w-full min-w-0 overflow-x-auto rounded-lg border">
          <Table.Root className="w-full min-w-[760px]">
            <Table.Header className="bg-background-2">
              <Table.Row className="[&>*]:whitespace-nowrap">
                <Table.RowHeaderCell className="w-[48px] text-center">STT</Table.RowHeaderCell>
                <Table.ColumnHeaderCell className="w-[28%]">Căn (Giao dịch)</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="w-[28%]">
                  Người nhận (CTV)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="w-[104px] text-right">
                  % Hoa hồng
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="w-[168px] text-right">
                  Số tiền cố định (VND)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className="w-[72px] text-center">
                  Hành động
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {fields.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={6} className="text-content-dark-4 py-8 text-center">
                    Chưa có dòng phân bổ nào. Nhấn "Thêm dòng" để bắt đầu.
                  </Table.Cell>
                </Table.Row>
              )}
              {fields.map((fieldItem, index) => (
                <Table.Row key={fieldItem.id} className="hover:bg-background-2 transition-colors">
                  <Table.Cell className="text-content-dark-3 text-center align-middle">
                    {index + 1}
                  </Table.Cell>

                  {/* Căn (Deal) select */}
                  <Table.Cell className="!p-0 align-top">
                    <Controller
                      name={`splits.${index}.dc_sale`}
                      control={control}
                      render={({ field: lineField }) => (
                        <Select
                          loadOptions={loadDealOptions}
                          loadInitialOptions={loadInitialDealOptions}
                          enableSearch
                          clearable
                          value={lineField.value ?? null}
                          onChange={(next) => {
                            const raw = Array.isArray(next) ? next[0] : next
                            lineField.onChange(raw ? Number(raw) : null)
                          }}
                          placeholder="Chọn căn (Deal)"
                          className="w-full !rounded-none !border-transparent !bg-transparent"
                        />
                      )}
                    />
                    <SplitCellError message={getSplitError(index, 'dc_sale')} />
                  </Table.Cell>

                  {/* Người nhận (Collaborator) select */}
                  <Table.Cell className="!p-0 align-top">
                    <Controller
                      name={`splits.${index}.collaborator`}
                      control={control}
                      render={({ field: lineField }) => (
                        <CollaboratorSelectWithCreate
                          value={lineField.value ?? null}
                          onChange={lineField.onChange}
                          placeholder="Chọn người nhận"
                          className="w-full !rounded-none !border-transparent !bg-transparent"
                        />
                      )}
                    />
                    <SplitCellError message={getSplitError(index, 'collaborator')} />
                  </Table.Cell>

                  {/* % Hoa hồng input */}
                  <Table.Cell className="!p-0 align-top">
                    {/* Bọc flex-col: ô nhập giữ `h-full` thì nó ăn trọn chiều cao hàng (hàng cao
                        lên khi các cột khác có lỗi) và đẩy câu lỗi tràn hẳn ra ngoài ô. `flex-1`
                        cho ô nhập nở phần còn lại, chừa đúng chỗ cho lỗi bên dưới. */}
                    <div className="flex h-full flex-col">
                      <Controller
                        name={`splits.${index}.pct_commission`}
                        control={control}
                        render={({ field: lineField }) => (
                          <input
                            type="text"
                            inputMode="decimal"
                            // Ô nhập trần trong bảng: không có <label>, nhãn cột chỉ là gợi ý thị
                            // giác nên phải tự khai báo tên cho trình đọc màn hình.
                            aria-label={`% hoa hồng dòng ${index + 1}`}
                            aria-invalid={getSplitError(index, 'pct_commission') ? true : undefined}
                            value={lineField.value ?? ''}
                            onChange={(e) => lineField.onChange(e.target.value)}
                            placeholder="Nhập %"
                            className="text-content-dark-1 placeholder:text-content-dark-4 min-h-[44px] w-full flex-1 border-none bg-transparent px-3 py-0 text-right tabular-nums outline-none focus:ring-0"
                          />
                        )}
                      />
                      {/* Cột số căn phải ⇒ lỗi cũng căn phải, không để header và nội dung lệch nhau. */}
                      <SplitCellError
                        message={getSplitError(index, 'pct_commission')}
                        className="text-right"
                      />
                    </div>
                  </Table.Cell>

                  {/* Số tiền cố định input */}
                  <Table.Cell className="!p-0 align-top">
                    <Controller
                      name={`splits.${index}.fixed_amount`}
                      control={control}
                      render={({ field: lineField }) => (
                        <CurrencyInput
                          value={lineField.value ?? ''}
                          onChange={lineField.onChange}
                          placeholder="Nhập số tiền"
                          className="h-full min-h-[44px] w-full !rounded-none !border-transparent !bg-transparent !px-3 text-right"
                        />
                      )}
                    />
                  </Table.Cell>

                  {/* Actions */}
                  <Table.Cell className="text-center align-middle">
                    <Button
                      type="button"
                      variant="text"
                      onClick={() => remove(index)}
                      aria-label={`Xoá dòng ${index + 1}`}
                      className="text-action-primary-red-default hover:bg-action-primary-red-default/10 h-8 w-8 !p-0"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
        {errors.splits?.message && (
          <span className="text-danger typo-body-sm">{errors.splits.message}</span>
        )}
      </section>

      {/* Ghi chú & tệp đính kèm — mỗi thứ một hàng riêng, chiếm trọn bề ngang */}
      <section className="flex flex-col gap-4">
        <FormSectionTitle>Ghi chú &amp; tệp đính kèm</FormSectionTitle>

        <FormController
          register={register}
          name="note"
          control={control}
          fieldProps={{
            label: 'Ghi chú',
            placeholder: 'Nhập ghi chú',
            rows: 3,
          }}
          Field={TextArea}
        />

        {/* `FileUpload` tự render tiêu đề "Tài liệu đính kèm" nên không thêm label riêng nữa. */}
        <FileUpload
          onChange={handleFileChange}
          className="w-full"
          required={false}
          hiddenDescription
        />
      </section>
    </Form>
  )
})

CollaboratorContractCreateForm.displayName = 'CollaboratorContractCreateForm'

export default CollaboratorContractCreateForm
