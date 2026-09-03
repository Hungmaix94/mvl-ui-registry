import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex, Grid } from '@radix-ui/themes'

import { Select } from '@/components/ui'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import CheckboxGroupField from '@/components/commons/filters/CheckboxGroupField.tsx'
import {
  PARTNER_ACTIVE_OPTIONS,
  PARTNER_ESTABLISHED_DAY_OPTIONS,
  type PartnerFilterFormValues,
} from '@/components/commons/filters/partner-filter-params.ts'

export type PartnerFilterFormRef = {
  clearForm: () => void
  getValues: () => PartnerFilterFormValues
}

type PartnerFilterFormProps = {
  initialValues?: PartnerFilterFormValues
  isOpen?: boolean
  /**
   * Tiêu đề vùng ngày — PHẢI trùng chữ đang hiện ở cột tương ứng của bảng màn đó.
   *
   * Cùng một cột `established_date` nhưng mỗi màn gọi một tên: màn CĐT gọi "Ngày sinh nhật",
   * hai màn sàn gọi "Ngày thành lập". Đây là quyết định nghiệp vụ của user (26/08/2026), không
   * phải chỗ để tự thống nhất lại cho gọn.
   */
  dateLabel?: string
}

const Schema = z.object({
  is_active: z.array(z.string()).optional(),
  established_month: z.date().optional(),
  established_day: z.string().optional(),
})

const EMPTY_VALUES: PartnerFilterFormValues = {
  is_active: [],
  established_month: undefined,
  established_day: undefined,
}

/**
 * Dialog "Bộ lọc" dùng chung cho Quản lý chủ đầu tư, Quản lý sàn liên kết và Quản lý nguồn sàn.
 *
 * Ba màn có cùng bộ trường lọc nên dùng chung một form; xem `partner-filter-params.ts` cho hợp
 * đồng URL. Nếu về sau một màn cần thêm trường riêng (ví dụ lọc sàn vừa F0 vừa F2), hãy thêm
 * prop bật/tắt trường đó thay vì fork cả file.
 *
 * Trạng thái là nhóm ô tick chứ không phải `Select`: chỉ có hai lựa chọn cố định, người dùng cần
 * nhìn thấy cả hai để so trước khi quyết, và popover của `Select` nuốt mất cú click kế tiếp vào
 * nút "Áp dụng".
 */
const PartnerFilterForm = forwardRef<PartnerFilterFormRef, PartnerFilterFormProps>(
  ({ initialValues, isOpen, dateLabel = 'Ngày thành lập' }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const prevIsOpenRef = useRef(false)

    const { control, register, reset, getValues, setValue, handleSubmit } =
      useForm<PartnerFilterFormValues>({
        resolver: zodResolver(Schema) as any,
        defaultValues: {
          is_active: initialValues?.is_active ?? [],
          established_month: initialValues?.established_month,
          established_day: initialValues?.established_day,
        },
      })

    // Mỗi lần mở lại dialog phải nạp lại điều kiện đang áp trên URL — người dùng có thể đã bấm
    // "Xoá bộ lọc" ở màn trống hoặc điều hướng từ dashboard sang trong lúc dialog đóng.
    // `formKey` bump theo để `<Controller>` remount, nếu không chúng vẽ lại từ default lúc mount.
    useEffect(() => {
      const justOpened = isOpen && !prevIsOpenRef.current
      prevIsOpenRef.current = !!isOpen
      if (justOpened) {
        reset({
          is_active: initialValues?.is_active ?? [],
          established_month: initialValues?.established_month,
          established_day: initialValues?.established_day,
        })
        setFormKey((key) => key + 1)
      }
    }, [isOpen, initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setFormKey((key) => key + 1)
          reset(EMPTY_VALUES)
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    const onSubmit = (_data: PartnerFilterFormValues) => {
      // Việc áp bộ lọc do trang sở hữu (đọc qua ref rồi ghi vào URL).
    }

    return (
      <Form key={formKey} handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={false}>
        <Flex direction="column" gap="5">
          {/*
            Ngày và Tháng là MỘT tiêu chí, nên đứng chung dưới một tiêu đề thay vì thành hai
            vùng rời. Tách ra thì người dùng đọc "Ngày" và "Tháng" như hai bộ lọc độc lập và
            không đoán được rằng bỏ trống Ngày nghĩa là cả tháng.
          */}
          <div className="flex w-full flex-col gap-2">
            <span className="typo-body-base-semibold text-neutral-90">{dateLabel}</span>
            <Grid columns="2" gap="3" width="100%">
              <FormController
                key={`established_day_${formKey}`}
                register={register}
                name="established_day"
                control={control}
                Field={Select}
                fieldProps={{
                  placeholder: 'Ngày',
                  options: PARTNER_ESTABLISHED_DAY_OPTIONS,
                  clearable: true,
                }}
              />
              {/*
                `MonthPicker` với `showYear={false}` — đúng ô mà bộ lọc "Tháng sinh nhật" ở màn
                Nhân sự đang dùng, vì đây là cùng một phép lọc: tháng bất kể năm.
                `key` phải bump theo `formKey`, nếu không "Xoá bộ lọc" xong `<Controller>` vẽ lại
                từ default lúc mount và giá trị vừa gỡ quay về.
              */}
              <FormController
                key={`established_month_${formKey}`}
                register={register}
                name="established_month"
                control={control}
                Field={MonthPicker}
                fieldProps={{
                  placeholder: 'Tháng',
                  showYear: false,
                  onChange: (date: Date | undefined) => {
                    setValue('established_month', date, {
                      shouldDirty: true,
                      shouldValidate: false,
                    })
                  },
                }}
              />
            </Grid>
            {/*
              Bỏ trống ô Ngày mang nghĩa RIÊNG (cả tháng), không phải "chưa chọn gì" — nên phải
              nói ra. Thiếu dòng này người dùng tưởng bộ lọc chưa hoàn chỉnh.
            */}
            <span className="typo-body-sm-regular text-content-dark-3">
              Bỏ trống ô Ngày để lọc cả tháng. Bỏ trống ô Tháng để lọc ngày đó ở mọi tháng.
            </span>
          </div>
          {/*
            "Hoạt động" đứng CUỐI: `MonthPicker` mở popover đè xuống dưới, để nó ở đáy thì
            lưới tháng che mất nút "Áp dụng" của dialog.
          */}
          <FormController
            register={register}
            name="is_active"
            control={control}
            Field={CheckboxGroupField}
            fieldProps={{
              label: 'Hoạt động',
              options: PARTNER_ACTIVE_OPTIONS,
            }}
          />
        </Flex>
      </Form>
    )
  }
)

PartnerFilterForm.displayName = 'PartnerFilterForm'

export default PartnerFilterForm
