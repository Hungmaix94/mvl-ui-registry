import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Flex } from '@radix-ui/themes'

import { Button, TextField, RadioGroup, FileUpload, RichText } from '@/components/ui'
import type { Exchange } from '@/services/realestate-service.ts'
import {
  exchangeFormSchema,
  ExchangeFormValues,
} from '@/features/exchange/_shares/types/exchange-form-types.ts'
import FormController from '@/components/ui/form/FormController.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { handleApiError } from '@/utils/error-utils.ts'
import { cn } from '@/utils'

type ExchangeFormProps = {
  initialData?: Exchange
  onSubmit: (values: ExchangeFormValues) => Promise<void> | void
  onCancel: () => void
  isSubmitting?: boolean
  isEdit?: boolean
  formClassname?: string
}

export const ExchangeForm = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit = false,
  formClassname,
}: ExchangeFormProps) => {
  const form = useForm<ExchangeFormValues>({
    // `established_date` dùng `z.preprocess` (luật DatePicker ↔ Zod), nên kiểu INPUT của schema
    // là `unknown` còn `z.infer` (OUTPUT) là `string`. RHF gõ form theo OUTPUT, `zodResolver`
    // gõ theo INPUT ⇒ lệch. Khai tường minh đúng một chỗ thay vì nới kiểu của cả form.
    resolver: zodResolver(exchangeFormSchema) as Resolver<ExchangeFormValues>,
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
        },
  })
  const { register, control, setValue, setError, handleSubmit: formHandleSubmit } = form

  const is_active = useWatch({ control, name: 'is_active' })
  const established_date = useWatch({ control, name: 'established_date' })

  const submitButtonText = useMemo(() => (initialData ? 'Lưu' : 'Tạo mới'), [initialData])

  const handleSubmit = async (values: ExchangeFormValues) => {
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
      className={cn('my-[20px] space-y-8 px-10', formClassname)}
    >
      <Flex direction="column" gap={'20px'} className="w-full py-4">
        <Flex direction="column" gap="4">
          {isEdit && initialData?.code && (
            <TextField
              label="Mã sàn"
              value={initialData.code}
              required
              placeholder="Mã sàn"
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
                label: 'Tên sàn',
                required: true,
                placeholder: 'Nhập tên sàn',
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
                label: 'Ngày thành lập',
                required: true,
                allowManualInput: true,
                clearable: true,
                placeholder: 'DD/MM/YYYY',
                // 86eyr4pd6: xám hết ngày sau hôm nay. Đây là lớp NHẮC, không phải lớp chặn —
                // `allowManualInput` vẫn cho gõ tay, nên thứ thật sự chặn là refine trong
                // `exchange-form-types.ts`. Giữ cả hai: lịch để người dùng khỏi chọn nhầm,
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
              purpose: 'exchange_attachment',
              existingFiles: initialData?.attachments || [],
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
