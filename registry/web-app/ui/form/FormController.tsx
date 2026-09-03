import { Control, Controller, FieldValues, Path, UseFormRegister, useWatch } from 'react-hook-form'
import { ElementType } from 'react'

type Props<FormType extends FieldValues, FieldProps> = {
  register: UseFormRegister<FormType>
  name: Path<FormType>
  control: Control<FormType, any, any>
  Field: ElementType
  fieldProps?: FieldProps
  wrapperClassName?: string
}

function FormController<FormType extends FieldValues, FieldProps>({
  name,
  control,
  Field,
  fieldProps,
  wrapperClassName,
}: Props<FormType, FieldProps>) {
  /**
   * Giá trị hiển thị lấy từ đây, ĐỪNG dùng `field.value` của `Controller` (nó được đè bên dưới).
   *
   * `useController` dựng `field.value` bằng
   * `useWatch(defaultValue = get(_formValues, name, get(_defaultValues, name)))`, và cái default ấy
   * được CHỤP Ở LẦN RENDER ĐẦU. Hàm `get` của RHF trả về default **mỗi khi giá trị là `undefined`**
   * ⇒ field bị xoá trắng lại nhận về GIÁ TRỊ BAN ĐẦU, ở màn Sửa là dữ liệu từ server. Người dùng
   * thấy "xoá không được"; form state thì đã rỗng, tức thứ đang hiện và thứ sắp gửi đi là hai giá
   * trị khác nhau. Đã thành bug thật ở ô "Số tiền thanh toán" (ClickUp 86eyqrt6r). Ba component
   * dùng chung bắn `undefined` khi rỗng: `CurrencyInput`, `date-time-picker`, `MonthPicker`.
   *
   * ĐỪNG chữa ở phía component bằng cách bắn `null`/`''` thay `undefined`: `z.coerce` biến cả hai
   * thành 0 và cho qua `.min(0)` ⇒ ô bắt buộc âm thầm lưu 0 thay vì chặn.
   *
   * `exact: true` khớp đúng cách `useController` tự đăng ký (`react-hook-form@7.63` dựng
   * `useWatch({ control, name, defaultValue, exact: true })`), nên lượt này báo đúng vào những nhịp
   * mà `Controller` cũng re-render — không thêm nhịp render nào. Field lồng trong mảng vẫn nhận
   * được lượt ghi đè cả mảng cha (`setValue('rows', …)`); có test khoá.
   *
   * Không truyền `defaultValue`: `_getWatch` khi form CHƯA mount và `defaultValue` là `undefined`
   * thì đọc `_defaultValues`, y hệt `field.value` ở lần render đầu, nên không có nháy giá trị.
   */
  const liveValue = useWatch({ control, name, exact: true })

  return (
    <div data-field-name={name} className={wrapperClassName}>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => {
          // `value` đè `field.value` (xem docblock trên). `fieldProps` vẫn đứng CUỐI để call site
          // đè được khi thật sự cần — thứ tự đó là hợp đồng, có test khoá.
          return (
            <Field {...field} value={liveValue} error={fieldState.error?.message} {...fieldProps} />
          )
        }}
      />
    </div>
  )
}

export default FormController
