import { z } from 'zod'
import { validateVietnamesePhone } from '@/utils/validation-utils'
import { formatDateToApi } from '@/utils/date-utils'

export const investorFormSchema = z.object({
  name: z.string().min(1, 'Tên chủ đầu tư là bắt buộc'),
  contact_person: z.string().optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => validateVietnamesePhone(val || '') === true, {
      message: 'Số điện thoại không hợp lệ',
    }),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  address: z.string({ required_error: 'Địa chỉ là bắt buộc' }).min(1, 'Địa chỉ là bắt buộc'),
  tax_code: z.string({ required_error: 'Mã số thuế là bắt buộc' }).min(1, 'Mã số thuế là bắt buộc'),
  // CR STT27 (86eykqg66): Ngày thành lập bắt buộc khi tạo mới VÀ khi chỉnh sửa.
  // BE bắt buộc ở create + PUT; màn Sửa gọi PATCH nên chính zod này là thứ chặn ở bước chỉnh sửa.
  //
  // `z.preprocess` + `formatDateToApi` theo luật DatePicker ↔ Zod ở patterns.md: `DatePicker.onChange`
  // trả 'DD/MM/YYYY', còn API nhận 'yyyy-MM-dd'. Chuẩn hoá ở ĐÂY chứ không chỉ ở `onChange` của form,
  // để mọi đường ghi vào field (reset, defaultValues của bản ghi cũ, nhập tay) đều ra cùng một dạng.
  //
  // 86eyr4pd6: và không được ở TƯƠNG LAI. Chặn ở zod chứ không chỉ ở lịch, vì DatePicker của hai
  // form này bật `allowManualInput` — người dùng gõ tay '31/12/2030' thì lịch không cản được.
  // So sánh CHUỖI hợp lệ ở đây: `z.preprocess` phía trên đã chuẩn hoá về 'yyyy-MM-dd', mà dạng đó
  // sắp theo từ điển trùng khớp thứ tự thời gian — nên không cần dựng Date để so.
  // Ranh giới là HÔM NAY và nó PHẢI qua được (`<=`, không phải `<`): công ty thành lập sáng nay
  // là hợp lệ. Đổi thành `<` là khoá mất một ngày hợp lệ mà không ai báo lỗi.
  //
  // Chữ "sinh nhật" chứ không phải "thành lập": màn CĐT gọi cột `established_date` là "Ngày sinh
  // nhật" (quyết định nghiệp vụ 26/08/2026), còn hai màn sàn giữ "Ngày thành lập" — xem
  // `exchange-form-types.ts`. Cùng MỘT cột dữ liệu, khác cách gọi. Thông báo lỗi phải nói cùng
  // thứ tiếng với nhãn ngay phía trên nó, nếu không một trường mang hai tên trên cùng một form.
  // Backend tách msgid tương ứng ở PR #3442. Đừng gộp hai chuỗi này lại.
  established_date: z.preprocess(
    (val) => (val != null && val !== '' ? formatDateToApi(val as Date | string) : val),
    z
      .string({ required_error: 'Vui lòng chọn ngày sinh nhật' })
      .min(1, 'Vui lòng chọn ngày sinh nhật')
      .refine((val) => val <= formatDateToApi(new Date()), {
        message: 'Ngày sinh nhật không được ở tương lai',
      })
  ),
  note: z.string().optional(),
  is_active: z.boolean(),
  attachment_tokens: z.array(z.string()),
  attachment_keep_ids: z.array(z.number()),
})

export type InvestorFormValues = z.infer<typeof investorFormSchema>
