import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Button, TextField, RadioGroup, FileUpload, RichText } from '@/components/ui'
import type { Investor } from '@/services/realestate-service.ts'
import {
  investorFormSchema,
  InvestorFormValues,
} from '@/features/investor/_shares/types/investor-form-types.ts'
import FormController from '@/components/ui/form/FormController.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { handleApiError } from '@/utils/error-utils.ts'
import { cn } from '@/utils'

type InvestorFormProps = {
  initialData?: Investor
  onSubmit: (values: InvestorFormValues) => Promise<void> | void
  onCancel: () => void
  isSubmitting?: boolean
  isEdit?: boolean
  formClassname?: string
}

export const InvestorForm = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit = false,
  formClassname,
}: InvestorFormProps) => {
  const form = useForm<InvestorFormValues>({
    // `established_date` dùng `z.preprocess` (luật DatePicker ↔ Zod), nên kiểu INPUT của schema
    // là `unknown` còn `z.infer` (OUTPUT) là `string`. RHF gõ form theo OUTPUT, `zodResolver`
    // gõ theo INPUT ⇒ lệch. Khai tường minh đúng một chỗ thay vì nới kiểu của cả form.
    resolver: zodResolver(investorFormSchema) as Resolver<InvestorFormValues>,
    defaultValues: initialData
      ? {
          name: initialData.name,
          contact_person: initialData.contact_person || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          address: initialData.address || '',
          tax_code: initialData.tax_code || '',
          established_date: initialData.established_date || '',
          note: initialData.note || undefined,
          is_active: initialData.is_active ?? true,
          attachment_tokens: [],
          attachment_keep_ids: initialData.attachments?.map((a) => a.id) ?? [],
        }
      : {
          name: '',
          contact_person: undefined,
          phone: undefined,
          email: undefined,
          address: '',
          tax_code: '',
          established_date: '',
          note: undefined,
          is_active: true,
          attachment_tokens: [],
          attachment_keep_ids: [],
        },
  })
  const { register, control, setValue, setError, handleSubmit: formHandleSubmit } = form

  const is_active = useWatch({ control, name: 'is_active' })
  const established_date = useWatch({ control, name: 'established_date' })

  const submitButtonText = useMemo(() => (initialData ? 'Lưu' : 'Tạo mới'), [initialData])

  const handleSubmit = async (values: InvestorFormValues) => {
    try {
      await onSubmit(values)
    } catch (error) {
      handleApiError(error, setError, {
        'files.attachments': 'attachment_tokens',
      })
    }
  }

  return (
    <form
      onSubmit={formHandleSubmit(handleSubmit)}
      className={cn('my-5 space-y-8 px-10', formClassname)}
    >
      <Flex direction="column" gap={'20px'} className="w-full py-4">
        <Flex direction="column" gap="4">
          {isEdit && initialData?.code && (
            <TextField
              label="Mã chủ đầu tư"
              value={initialData.code}
              required
              placeholder="Mã chủ đầu tư"
              name="code"
              type="text"
              disabled
            />
          )}

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên chủ đầu tư',
                required: true,
                placeholder: 'Nhập tên chủ đầu tư',
                autoFocus: true,
                name: 'name',
                type: 'text',
                disabled: isSubmitting,
                className: 'flex-1',
                maxLength: 250,
                showCharacterCount: true,
              }}
            />
            <FormController
              register={register}
              name="contact_person"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Người liên hệ',
                placeholder: 'Nhập người liên hệ',
                name: 'contact_person',
                type: 'text',
                disabled: isSubmitting,
                maxLength: 250,
                showCharacterCount: true,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="phone"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Số điện thoại',
                placeholder: 'Nhập số điện thoại',
                name: 'phone',
                type: 'tel',
                disabled: isSubmitting,
                maxLength: 20,
                showCharacterCount: true,
              }}
            />
            <FormController
              register={register}
              name="email"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Email',
                placeholder: 'Nhập email',
                name: 'email',
                type: 'email',
                disabled: isSubmitting,
                maxLength: 250,
                showCharacterCount: true,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="address"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Địa chỉ',
                required: true,
                placeholder: 'Nhập địa chỉ',
                disabled: isSubmitting,
              }}
            />

            <FormController
              register={register}
              name="tax_code"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Mã số thuế',
                required: true,
                placeholder: 'Nhập mã số thuế',
                name: 'tax_code',
                type: 'text',
                disabled: isSubmitting,
                maxLength: 20,
                showCharacterCount: true,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="established_date"
              control={control}
              Field={DatePicker}
              fieldProps={{
                // "Ngày sinh nhật" chỉ ở màn CĐT — sàn vẫn gọi "Ngày thành lập" (`ExchangeForm`).
                // Cùng một cột `established_date`; quyết định nghiệp vụ của user 26/08/2026.
                // Thông báo lỗi zod đi kèm cũng nói "sinh nhật" (`investor-form-types.ts`), và BE
                // tách msgid riêng cho CĐT (PR #3442) để `gettext` trả về đúng chữ đó. Đổi nhãn
                // ở đây mà quên hai chỗ kia là trường mang hai tên trên cùng một form.
                label: 'Ngày sinh nhật',
                required: true,
                allowManualInput: true,
                clearable: true,
                placeholder: 'DD/MM/YYYY',
                // 86eyr4pd6: xám hết ngày sau hôm nay. Đây là lớp NHẮC, không phải lớp chặn —
                // `allowManualInput` vẫn cho gõ tay, nên thứ thật sự chặn là refine trong
                // `investor-form-types.ts`. Giữ cả hai: lịch để người dùng khỏi chọn nhầm,
                // zod để không lọt.
                disabledDays: { after: new Date() },
                disabled: isSubmitting,
                value: parseDateFromApi(established_date),
                onChange: (val: string | null | undefined) =>
                  setValue('established_date', formatDateToApi(val ?? undefined), {
                    shouldValidate: true,
                    shouldDirty: true,
                  }),
              }}
            />
          </div>

          <FormController
            register={register}
            name="is_active"
            control={control}
            Field={RadioGroup}
            fieldProps={{
              label: 'Trạng thái hoạt động',
              id: 'is_active',
              disabled: isSubmitting,
              options: [
                { label: 'Hoạt động', value: 'true' },
                { label: 'Ngừng hoạt động', value: 'false' },
              ],
              value: String(is_active),
              onChange: (value: string) =>
                setValue('is_active', value === 'true', { shouldDirty: true }),
            }}
          />

          <FormController
            register={register}
            name="note"
            control={control}
            Field={RichText}
            fieldProps={{
              label: 'Ghi chú',
              placeholder: 'Nhập ghi chú',
              disabled: isSubmitting,
              rows: 3,
            }}
          />

          <FormController
            register={register}
            name="attachment_tokens"
            control={control}
            Field={FileUpload}
            fieldProps={{
              label: 'File đính kèm',
              required: false,
              multiple: true,
              purpose: 'investor_attachment',
              existingFiles: isEdit ? (initialData?.attachments ?? []) : [],
              onKeptExistingIdsChange: (ids: number[]) =>
                setValue('attachment_keep_ids', ids, { shouldDirty: true }),
              disabled: isSubmitting,
              hiddenDescription: true,
            }}
          />
        </Flex>
      </Flex>
      <Flex gap="3" mt="4" justify="end">
        <Button variant={'secondary'} type="button" onClick={onCancel} className={'w-[150px]'}>
          Huỷ
        </Button>
        <Button
          variant={'primary'}
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
          className={'w-[150px]'}
        >
          {submitButtonText}
        </Button>
      </Flex>
    </form>
  )
}
