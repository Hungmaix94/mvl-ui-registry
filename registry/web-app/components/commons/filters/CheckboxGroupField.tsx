import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/utils'

export type CheckboxGroupOption = {
  value: string
  label: string
}

type Props = {
  /**
   * Tiêu đề vùng dữ liệu — BẮT BUỘC, và phải gọi đúng tên cột trên bảng mà nhóm này lọc theo.
   * `Checkbox` không tự render tiêu đề (prop `label` của nó là chữ nằm ngang hàng ô tick), nên
   * thả một nhóm ô tick trần vào lưới lọc là người dùng không biết nó lọc theo cột nào.
   */
  label: string
  options: CheckboxGroupOption[]
  value?: string[] | null
  onChange?: (next: string[]) => void
  className?: string
}

/**
 * Nhóm ô tick cho một bộ lọc nhận NHIỀU giá trị.
 *
 * Dùng thay `Select multiple` khi số lựa chọn ít và cố định (trạng thái, giai đoạn duyệt):
 * mọi lựa chọn hiện sẵn nên người dùng thấy ngay còn gì chưa tick, không phải mở popover ra dò.
 *
 * Thứ tự mảng phát ra luôn bám **thứ tự `options`**, không bám thứ tự người dùng bấm — nhờ vậy
 * cùng một tập lựa chọn luôn sinh ra cùng một URL, link chia sẻ không đổi chỉ vì tick khác thứ tự.
 */
export default function CheckboxGroupField({ label, options, value, onChange, className }: Props) {
  const selected = useMemo(() => new Set(value ?? []), [value])

  const toggle = (optionValue: string) => {
    const next = new Set(selected)
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    onChange?.(options.map((o) => o.value).filter((v) => next.has(v)))
  }

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {/*
        `<span>` chứ KHÔNG `<label>`: mỗi `Checkbox` đã tự gắn `<label htmlFor>` của nó, thêm một
        `<label>` bọc ngoài nữa là trình đọc màn hình đọc lặp tên control.
      */}
      <span className="typo-body-base-semibold text-neutral-90">{label}</span>
      {/*
        Chảy ngang rồi TỰ xuống dòng, không dùng lưới cột cố định: nhãn ở đây dài ngắn rất lệch
        ("Mới" cạnh "Chờ Trưởng phòng TKKD duyệt"), nên cột cứng thì cột hẹp bị cắt chữ còn cột
        rộng thừa cả mảng trắng. Wrap tự nhiên bám đúng độ dài thật của từng nhãn.
      */}
      <div role="group" aria-label={label} className="flex flex-wrap gap-x-6 gap-y-3">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            id={`${label}-${option.value}`}
            label={option.label}
            checked={selected.has(option.value)}
            onCheckedChange={() => toggle(option.value)}
          />
        ))}
      </div>
    </div>
  )
}
