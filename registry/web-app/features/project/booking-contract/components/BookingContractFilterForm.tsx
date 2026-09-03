import {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { FieldValues, useForm, Controller } from 'react-hook-form'
import { Select } from '@/components/ui'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import CheckboxGroupField from '@/components/commons/filters/CheckboxGroupField'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useCustomerSelect } from '@/hooks/useCustomerSelect'

import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import type { DateRange } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { BOOKING_APPROVAL_STATUS_OPTIONS } from '../types/booking-contract-types'

export type BookingContractFilterFormData = {
  /**
   * KHÔNG có ô nào trong dialog cho trường này — ô "Tìm kiếm" đã bị bỏ 24/08/2026 vì nó **trùng
   * hoàn toàn** với ô tìm kiếm ngoài toolbar: cả hai ghi cùng một param `search`, và
   * `handleApplyFilter` còn gọi `setSearchInput(formData.search)` để đồng bộ ngược lại. Đo trên
   * dev: gõ vào ô trong dialog thì ô ngoài toolbar tự đổi theo.
   *
   * Vẫn giữ trong form data để "Xoá bộ lọc" xoá luôn ô tìm kiếm ngoài — bỏ hẳn key thì bấm Xoá
   * bộ lọc mà từ khoá cũ vẫn còn nguyên trên toolbar.
   */
  search?: string
  project?: number
  investor?: number
  /**
   * Lọc theo **id** khách hàng, không phải theo chuỗi tên — học theo màn Hợp đồng cọc (24/08/2026).
   *
   * Trước đó màn này có ô "Tên khách hàng" gõ tay (`customer_name`). Bỏ vì nó trùng đường với ô tìm
   * kiếm ngoài toolbar: `search_fields` của BE đã phủ đủ mọi nguồn tên (kể cả tên doanh nghiệp, sau
   * BE PR #3369), nên gõ tên thì dùng ô ngoài. Ô này để chọn **đúng một** khách, không phải so khớp
   * chuỗi — tránh cảnh gõ "Công ty" ra một nắm khách khác nhau.
   */
  customer?: number
  /** Chọn nhiều: `pending_approval | booked | refunded | converted_deposit | transferred` */
  booking_status__in?: string[]
  approval_status__in?: string[]
  booking_date_from?: string // ISO date YYYY-MM-DD
  booking_date_to?: string // ISO date YYYY-MM-DD
}

export type BookingContractFilterFormRef = {
  clearForm: () => void
  getValues: () => BookingContractFilterFormData
}

interface BookingContractFilterProps {
  initialValues?: FieldValues
  isOpen?: boolean
}

/**
 * Mọi ô của dialog phải có mặt ở đây. Thiếu một key thì `reset()` giữ nguyên giá trị cũ của ô đó
 * và "Xoá bộ lọc" hoá ra xoá không hết — đúng cái bẫy đã ghi ở `DepositContractFilter`.
 */
const EMPTY_FORM_VALUES: BookingContractFilterFormData = {
  search: '',
  project: undefined,
  investor: undefined,
  customer: undefined,
  booking_status__in: [],
  approval_status__in: [],
  booking_date_from: undefined,
  booking_date_to: undefined,
}

/** Helper: ISO string → Date */
const isoToDate = (iso?: string): Date | undefined => {
  if (!iso) return undefined
  try {
    return parseISO(iso)
  } catch {
    return undefined
  }
}

/** Helper: Date → YYYY-MM-DD */
const dateToIso = (d?: Date): string | undefined => {
  if (!d) return undefined
  try {
    return format(d, 'yyyy-MM-dd')
  } catch {
    return undefined
  }
}

const BookingContractFilterForm = forwardRef<
  BookingContractFilterFormRef,
  BookingContractFilterProps
>(({ initialValues, isOpen }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const prevIsOpenRef = useRef(false)

  // Hook dùng chung thay cho ~90 dòng tự parse phân trang trước đây. Quan trọng hơn: chúng kèm
  // `loadInitialOptions`, thứ mà bản cũ KHÔNG có — mở link `?project=196` thì ô Dự án phải hiện
  // đúng tên dự án, không phải để trống dù bộ lọc đang chạy.
  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({ valueType: 'id' })
  const { loadCustomerOptions, loadInitialCustomerOptions } = useCustomerSelect()

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.BOOKING.BOOKING_STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.BOOKING.APPROVAL_STATUS_CHOICES,
    ],
  })

  /** `CheckboxGroupField` cần `value` là chuỗi; hằng của app có thể trả number nên ép một lần ở đây. */
  const toCheckboxOptions = useCallback(
    (options: { value: string | number; label: string }[]) =>
      options.map((o) => ({ value: String(o.value), label: o.label })),
    []
  )

  const bookingStatusOptions = useMemo(
    () =>
      toCheckboxOptions(
        keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING.BOOKING_STATUS_CHOICES) || []
      ),
    [keysMapOptions, toCheckboxOptions]
  )

  const approvalStatusOptions = useMemo(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING.APPROVAL_STATUS_CHOICES) || []
    return toCheckboxOptions(options.length > 0 ? options : BOOKING_APPROVAL_STATUS_OPTIONS)
  }, [keysMapOptions, toCheckboxOptions])

  const { register, control, handleSubmit, reset, getValues, setValue, watch } =
    useForm<BookingContractFilterFormData>({
      defaultValues: { ...EMPTY_FORM_VALUES, ...initialValues },
    })

  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current
    prevIsOpenRef.current = !!isOpen
    if (justOpened && initialValues) {
      reset({ ...EMPTY_FORM_VALUES, ...initialValues })
      setFormKey((k) => k + 1)
    }
  }, [isOpen, initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setFormKey((k) => k + 1)
        reset({ ...EMPTY_FORM_VALUES })
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  const onSubmit = () => {}

  const bookingDateFrom = watch('booking_date_from')
  const bookingDateTo = watch('booking_date_to')

  // Derive current date range for picker reactively
  const dateRangeValue: DateRange | undefined = useMemo(() => {
    const from = isoToDate(bookingDateFrom)
    const to = isoToDate(bookingDateTo)
    if (!from && !to) return undefined
    return { from, to }
  }, [bookingDateFrom, bookingDateTo])

  return (
    <Form key={formKey} handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={false}>
      <div className="flex w-full flex-col gap-5">
        {/*
          Khoảng ngày đứng đầu và chiếm trọn hàng — chốt 24/08/2026. Nhét vào nửa lưới thì chuỗi
          `DD/MM/YYYY - DD/MM/YYYY` xuống dòng và ô đó cao hơn ô bên cạnh, cả hàng bị lệch.
        */}
        <Controller
          control={control}
          name="booking_date_from"
          render={() => (
            <DateRangePicker
              label="Ngày đặt chỗ"
              className="w-full"
              value={dateRangeValue}
              onChange={(range: DateRange | undefined | null) => {
                setValue('booking_date_from', dateToIso(range?.from))
                setValue('booking_date_to', dateToIso(range?.to))
              }}
              disableFutureDates={true}
              showQuickSelect={true}
            />
          )}
        />

        {/* Dự án và Nhà đầu tư đứng cạnh nhau: chọn dự án gần như luôn kéo theo việc ngó nhà đầu tư. */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormController
            register={register}
            name="project"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Dự án',
              placeholder: 'Chọn dự án',
              loadOptions: loadProjectOptions,
              loadInitialOptions: loadInitialProjectOptions,
              enableSearch: true,
              searchPlaceholder: 'Tìm dự án',
            }}
          />
          <FormController
            register={register}
            name="investor"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Nhà đầu tư',
              placeholder: 'Chọn nhà đầu tư',
              loadOptions: loadInvestorOptions,
              loadInitialOptions: loadInitialInvestorOptions,
              enableSearch: true,
              searchPlaceholder: 'Tìm nhà đầu tư',
            }}
          />
        </div>

        {/*
          Khách hàng chiếm trọn hàng: nhãn của nó là `<CMND/MST> - <tên>` nên dài hơn hẳn mọi ô
          khác, để nửa lưới là bị cắt đúng phần tên — thứ người dùng cần đọc.
        */}
        <FormController
          register={register}
          name="customer"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Khách hàng',
            placeholder: 'Chọn khách hàng',
            loadOptions: loadCustomerOptions,
            loadInitialOptions: loadInitialCustomerOptions,
            enableSearch: true,
            searchPlaceholder: 'Tìm khách hàng',
          }}
        />

        {/*
          Mỗi nhóm trạng thái chiếm TRỌN một hàng. Xếp hai nhóm cạnh nhau thì mỗi bên chỉ còn nửa
          bề ngang, ô tick buộc phải xếp dọc thành hai cột chữ cao lêu nghêu — vừa xấu vừa bắt mắt
          quét dọc hai lần. Full-width thì các lựa chọn chảy ngang, hết chỗ mới xuống dòng.
        */}
        <FormController
          register={register}
          name="booking_status__in"
          control={control}
          Field={CheckboxGroupField}
          fieldProps={{ label: 'Trạng thái', options: bookingStatusOptions }}
        />
        <FormController
          register={register}
          name="approval_status__in"
          control={control}
          Field={CheckboxGroupField}
          fieldProps={{ label: 'Trạng thái phê duyệt', options: approvalStatusOptions }}
        />
      </div>
    </Form>
  )
})

BookingContractFilterForm.displayName = 'BookingContractFilterForm'

export default BookingContractFilterForm
