import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import type { DateRange } from 'react-day-picker'
import FormController from '@/components/ui/form/FormController.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { Select } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select/Select'
import { useBranchSelect } from '@/hooks/useBranchSelect.ts'
import { useBlockSelect } from '@/hooks/useBlockSelect.ts'
import { PAGE_SIZE } from '@/constants/table'
import { useAbility } from '@/lib/ability'
import { useAdminDashboardRevenueTrend } from '@/features/sales/admin-dashboard/services/admin-dashboard-service'
import { formatDateToApi, formatPeriodLabel, getCurrentPeriodLabel } from '@/utils/date-utils.ts'
import {
  SALES_ADMIN_DASHBOARD_ACTIONS,
  SALES_ADMIN_DASHBOARD_SUBJECT,
  TIME_GROUP_OPTIONS,
} from './sales-admin-dashboard-constants'
import {
  DashboardOrgActivity as OrgActivity,
  DashboardPerformanceGroup as TimeGroup,
  DashboardPerformanceGroupOrg as OrgGroup,
} from '@/constants/api-schema-aliases'

export const ORG_GROUP_OPTIONS = [
  { value: OrgGroup.branch, label: 'Chi nhánh' },
  { value: OrgGroup.block, label: 'Khối' },
  { value: OrgGroup.department, label: 'Phòng ban' },
]

/**
 * Đơn vị "không phát sinh giao dịch" KHÔNG suy ra được ở phía web: báo cáo dựng từ bảng
 * phân bổ doanh thu nên đơn vị không có giao dịch là **vắng mặt**, không phải dòng số 0 —
 * web không có cách nào biết đơn vị nào đang thiếu. Vì vậy đây là tham số gửi lên server.
 */
export const ORG_ACTIVITY_OPTIONS = [
  { value: OrgActivity.with_deals, label: 'Có' },
  { value: OrgActivity.without_deals, label: 'Không' },
  { value: OrgActivity.all, label: 'Tất cả' },
]

/**
 * Nhãn dài của cùng ba giá trị, dành cho PHỤ ĐỀ biểu đồ.
 *
 * Không dùng lại nhãn của `Select`: trong dialog, ô đã có tiêu đề "Đơn vị phát sinh giao
 * dịch" ngay trên nên đọc "Không" là đủ nghĩa. Phụ đề thì không có tiêu đề nào bên cạnh —
 * nó là một chuỗi nối bằng dấu `·`, mà "Tháng 8/2026 · Không · Phòng ban" thì không nói
 * được là không cái gì.
 */
export const ORG_ACTIVITY_SUBTITLE_LABELS: Record<OrgActivity, string> = {
  [OrgActivity.with_deals]: 'Đơn vị có phát sinh giao dịch',
  [OrgActivity.without_deals]: 'Đơn vị không phát sinh giao dịch',
  [OrgActivity.all]: 'Tất cả đơn vị',
}

export type PerformanceByOrgFilterFormValues = {
  groupOrg: OrgGroup
  timeGroup: TimeGroup
  dateRange?: DateRange | null
  /**
   * Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP với `dateRange`, cộng thêm (AND), không ghi đè
   * và không bị `period` ghi đè (period chỉ thu hẹp `dateRange`/from-to như dưới).
   */
  transactionSheetDateRange?: DateRange | null
  /**
   * Một nhãn kỳ nguyên văn của API (`2026-06` / `2026-W23` / `2025`), rỗng = tất cả kỳ.
   * Không lưu cặp from/to đã quy đổi ở đây: đổi "Nhóm theo thời gian" thì cặp đó thành vô
   * nghĩa mà nhìn vào form không thấy sai chỗ nào.
   */
  period?: string
  /** Nhiều chi nhánh cùng lúc. Mảng rỗng = không lọc (tất cả chi nhánh). */
  branches?: number[]
  /** Tên chi nhánh đã chọn, cùng thứ tự với `branches` — để phụ đề khỏi phải gọi lại API. */
  branchNames?: string[]
  /** Nhiều khối cùng lúc. Mảng rỗng = không lọc. */
  blocks?: number[]
  blockNames?: string[]
  /** Đơn vị có / không phát sinh giao dịch / tất cả. Mặc định: có phát sinh (như trước đây). */
  orgActivity: OrgActivity
}

/**
 * Cách nhóm là tham số BẮT BUỘC của endpoint, không phải bộ lọc tuỳ chọn — nên
 * "Xoá bộ lọc" đưa nó về đúng hai giá trị này chứ không bỏ trống, và badge đếm
 * cũng chỉ đếm khi người dùng đã đổi khác mặc định.
 *
 * Là HÀM chứ không phải hằng số vì `period` mặc định là kỳ đang diễn ra: một hằng số tính
 * lúc import sẽ đứng yên ở tháng cũ trên một tab mở qua đêm mùng 1.
 */
export const getDefaultPerformanceFilterValues = (): PerformanceByOrgFilterFormValues => ({
  groupOrg: OrgGroup.department,
  timeGroup: TimeGroup.month,
  orgActivity: OrgActivity.with_deals,
  dateRange: null,
  transactionSheetDateRange: null,
  period: getCurrentPeriodLabel(TimeGroup.month),
  branches: [],
  branchNames: [],
  blocks: [],
  blockNames: [],
})

/**
 * Tầng RHF + `Select` làm việc bằng id dạng CHUỖI, còn API và phần còn lại của màn dùng SỐ.
 *
 * Không phải chuyện thẩm mỹ: `Select` nhận diện option đã chọn bằng cách so `option.value`
 * (luôn là chuỗi) với mảng giá trị hiện tại. Nhét số vào đó là không cái nào khớp — mở lại
 * dialog thấy chi nhánh đã chọn hiện ra như CHƯA chọn, bấm lần nữa thì nó *thêm* vào thành
 * `[7, '7']` chứ không bỏ chọn. Quy đổi gọn ở hai đầu: vào form thì `String`, ra khỏi form
 * thì `Number`.
 */
type PerformanceRhfValues = Omit<PerformanceByOrgFilterFormValues, 'branches' | 'blocks'> & {
  branches?: string[]
  blocks?: string[]
}

const toSelectIds = (ids?: (number | string)[]) => (ids ?? []).map(String)

const fromSelectIds = (ids?: (string | number)[]) =>
  (ids ?? []).map(Number).filter((id) => Number.isFinite(id))

const getDefaultRhfValues = (
  initialValues?: Partial<PerformanceByOrgFilterFormValues>
): PerformanceRhfValues => ({
  ...getDefaultPerformanceFilterValues(),
  ...initialValues,
  branches: toSelectIds(initialValues?.branches),
  blocks: toSelectIds(initialValues?.blocks),
})

export type PerformanceByOrgFilterFormRef = {
  clearForm: () => void
  getValues: () => PerformanceByOrgFilterFormValues
}

type PerformanceByOrgFilterFormProps = {
  initialValues?: Partial<PerformanceByOrgFilterFormValues>
}

const PerformanceByOrgFilterForm = forwardRef<
  PerformanceByOrgFilterFormRef,
  PerformanceByOrgFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)

  const { register, control, reset, getValues, setValue } = useForm<PerformanceRhfValues>({
    defaultValues: getDefaultRhfValues(initialValues),
  })

  /**
   * Nhớ tên theo id đã từng thấy. `Select` ở chế độ `multiple` chỉ báo về ĐÚNG option vừa bấm
   * chứ không báo cả danh sách đang chọn — không nhớ lại thì bỏ chọn một chi nhánh là mất tên
   * của những cái còn lại và phụ đề tụt xuống "3 chi nhánh" vô danh.
   */
  const branchNameByIdRef = useRef(new Map<number, string>())
  const blockNameByIdRef = useRef(new Map<number, string>())

  useEffect(() => {
    const remember = (
      map: Map<number, string>,
      ids: number[] | undefined,
      names: string[] | undefined
    ) => {
      ;(ids ?? []).forEach((id, index) => {
        const name = names?.[index]
        if (name) map.set(id, name)
      })
    }
    remember(branchNameByIdRef.current, initialValues?.branches, initialValues?.branchNames)
    remember(blockNameByIdRef.current, initialValues?.blocks, initialValues?.blockNames)

    reset(getDefaultRhfValues(initialValues))
    setFormKey((k) => k + 1)
  }, [initialValues, reset])

  const timeGroup = useWatch({ control, name: 'timeGroup' })
  const dateRange = useWatch({ control, name: 'dateRange' })
  const period = useWatch({ control, name: 'period' })
  const branches = useWatch({ control, name: 'branches' })

  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()

  /**
   * Danh sách khối thu hẹp theo chi nhánh đang chọn — nhưng CHỈ khi chọn đúng một chi nhánh:
   * `/api/hrm/blocks/dropdown/` có `branch` số ít, không có `branch__in`. Chọn từ hai chi
   * nhánh trở lên thì liệt kê hết khối, và BE vẫn giao hai bộ lọc lại nên kết quả không sai —
   * chỉ là danh sách rộng hơn mức cần.
   */
  const { loadBlockOptions, loadInitialBlockOptions } = useBlockSelect({
    additionalParams: () => (branches?.length === 1 ? { branch: Number(branches[0]) } : {}),
  })

  const handleBranchChange = useCallback(
    (option: SelectOption | null) => {
      if (option && typeof option.label === 'string') {
        branchNameByIdRef.current.set(Number(option.value), option.label)
      }
      /**
       * Đụng vào chi nhánh là xoá khối đã chọn (quy ước "đổi cha thì reset con"). Giữ lại thì
       * người dùng dễ để lại một khối thuộc chi nhánh khác, mà BE GIAO hai bộ lọc ⇒ biểu đồ
       * rỗng và trên màn hình không có gì nói vì sao.
       */
      setValue('blocks', [])
      setValue('blockNames', [])
    },
    [setValue]
  )

  const handleBlockChange = useCallback((option: SelectOption | null) => {
    if (!option || typeof option.label !== 'string') return
    blockNameByIdRef.current.set(Number(option.value), option.label)
  }, [])

  /**
   * Danh sách kỳ lấy từ `revenue-trend` chứ không phải từ `performance`: hai endpoint dùng
   * chung một cách chia kỳ, nhưng `performance` bị phân trang (10 dòng/trang) nên đọc kỳ từ
   * nó chỉ ra được các kỳ có mặt trên trang đang xem. `revenue-trend` trả thẳng toàn bộ mốc.
   */
  const trendParams = useMemo(() => {
    const params: { group: TimeGroup; from?: string; to?: string } = { group: timeGroup }
    if (dateRange?.from) params.from = formatDateToApi(dateRange.from) || undefined
    if (dateRange?.to) params.to = formatDateToApi(dateRange.to) || undefined
    return params
  }, [timeGroup, dateRange])

  /**
   * Danh sách kỳ đến từ endpoint `revenue-trend`, mà endpoint đó có quyền RIÊNG
   * (`sales.admindashboard.revenue_trend`) — khác quyền `performance` đang gate cả khối này.
   * Vai có `performance` nhưng không có `revenue_trend` là tổ hợp CÓ THẬT.
   *
   * Không chặn ở đây thì query ăn 403, `useApiQuery` lại không toast lỗi ⇒ hỏng im lặng:
   * ô "Kỳ" rỗng và bị khoá, còn `period` thì kẹt ở kỳ mặc định vì nhánh dọn kỳ cũ bên dưới
   * `return` sớm khi danh sách rỗng. Người dùng bị khoá cứng vào kỳ hiện tại, không có cách
   * nào thoát và không có gì trên màn hình nói vì sao.
   */
  const ability = useAbility()
  const canViewPeriodOptions = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.REVENUE_TREND,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )

  const { data: trendData } = useAdminDashboardRevenueTrend(trendParams, {
    enabled: canViewPeriodOptions,
  })

  const periodOptions = useMemo(
    () =>
      (trendData?.points ?? []).map((point) => ({
        value: point.label,
        label: formatPeriodLabel(point.label),
      })),
    [trendData?.points]
  )

  /**
   * Kỳ đã chọn phải luôn nằm trong danh sách hiện hành. Đổi "Nhóm theo thời gian" từ tháng
   * sang năm mà vẫn giữ `2026-06`, hoặc thu hẹp khoảng ngày ra ngoài kỳ đó, thì biểu đồ lọc
   * theo một kỳ không còn tồn tại trên giao diện — nhìn vào chỉ thấy "không có dữ liệu".
   *
   * Rơi về KỲ HIỆN TẠI của cách nhóm mới chứ không về trắng, cho khớp mặc định của màn:
   * đổi "Theo tháng" sang "Theo năm" thì đi thẳng tới năm nay. Kỳ hiện tại mà cũng không có
   * trong danh sách (khoảng ngày người dùng chọn nằm hẳn trong quá khứ) thì mới về trắng.
   *
   * Chỉ dọn khi danh sách đã về (rỗng = đang tải), không thì mỗi lần mở dialog là mất kỳ.
   */
  useEffect(() => {
    if (!period) return

    /**
     * Không có quyền đọc danh sách kỳ ⇒ không bao giờ xác nhận được kỳ đang chọn có thật
     * hay không, và cũng không đổi sang kỳ khác được. Đưa về "tất cả kỳ" để người dùng ít
     * nhất còn thấy trọn dữ liệu, thay vì bị khoá vào một kỳ mà không hiểu vì sao.
     */
    if (!canViewPeriodOptions) {
      setValue('period', '')
      return
    }

    if (periodOptions.length === 0) return
    if (periodOptions.some((option) => option.value === period)) return

    const currentPeriod = getCurrentPeriodLabel(timeGroup)
    const hasCurrent = periodOptions.some((option) => option.value === currentPeriod)
    setValue('period', hasCurrent ? currentPeriod : '')
  }, [period, periodOptions, timeGroup, setValue, canViewPeriodOptions])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(getDefaultRhfValues())
        setFormKey((k) => k + 1)
      },
      getValues: (): PerformanceByOrgFilterFormValues => {
        const values = getValues()
        const branchIds = fromSelectIds(values.branches)
        const blockIds = fromSelectIds(values.blocks)
        return {
          ...values,
          branches: branchIds,
          branchNames: branchIds.map((id) => branchNameByIdRef.current.get(id) ?? ''),
          blocks: blockIds,
          blockNames: blockIds.map((id) => blockNameByIdRef.current.get(id) ?? ''),
        }
      },
    }),
    [reset, getValues]
  )

  /**
   * Lưới 2 cột × 4 dòng — `Grid` xếp theo HÀNG, nên thứ tự khai báo bên dưới chính là thứ
   * tự đọc và cũng là thứ tự Tab:
   *
   *   1. Thời gian (ngày cọc)  |  Ngày làm phiếu TTGD
   *   2. Nhóm theo thời gian   |  Kỳ
   *   3. Chi nhánh             |  Khối
   *   4. Nhóm theo tổ chức     |  Đơn vị phát sinh giao dịch
   *
   * Mỗi dòng là một CẶP cùng chủ đề, và trong cặp nào có phụ thuộc thì ô đầu vào đứng bên
   * trái: kỳ được cắt theo cách nhóm thời gian, khối được cắt theo chi nhánh. Dòng 1 là ngoại
   * lệ có chủ ý — hai căn cứ ngày ĐỘC LẬP, cộng thêm (AND) chứ không cái nào cắt cái nào.
   *
   * Đừng chèn ô mới vào giữa: chèn một ô là mọi ô sau nó nhảy sang cột kia và bốn cặp trên
   * vỡ hết. Thêm ô thì thêm theo CẶP ở cuối, hoặc sắp lại cả lưới.
   */
  return (
    <Grid columns="2" gap="4" width="100%">
      <FormController
        key={`dateRange-${formKey}`}
        register={register}
        name="dateRange"
        control={control}
        Field={DateRangePicker}
        fieldProps={{
          // Nói rõ lọc theo ngày NÀO. Ô này và ô TTGD ngay dưới đều là khoảng ngày, nên
          // một cái tên chung chung như "Khoảng thời gian" không trả lời được câu người dùng
          // đang hỏi: cái nào theo ngày cọc, cái nào theo ngày làm phiếu. Cùng chữ với màn
          // Tổng quan bán hàng (`SalesOverviewFilterForm`) để bốn màn đọc như một.
          label: 'Thời gian (tính theo ngày cọc)',
          showQuickSelect: true,
        }}
      />
      <FormController
        key={`transactionSheetDateRange-${formKey}`}
        register={register}
        name="transactionSheetDateRange"
        control={control}
        Field={DateRangePicker}
        fieldProps={{
          label: 'Ngày làm phiếu TTGD',
          showQuickSelect: true,
        }}
      />
      <FormController
        key={`timeGroup-${formKey}`}
        register={register}
        name="timeGroup"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Nhóm theo thời gian',
          options: TIME_GROUP_OPTIONS,
          // Tham số bắt buộc của endpoint: `Select` mặc định cho xoá trắng, mà xoá
          // trắng ở đây là gửi group rỗng lên API. Dùng "Xoá bộ lọc" để về mặc định.
          clearable: false,
        }}
      />
      {/* Đặt SAU hai ô trên vì danh sách kỳ được cắt theo khoảng ngày và theo cách nhóm thời
          gian. Đây là bộ lọc tuỳ chọn thật nên để `clearable` mặc định: xoá trắng = tất cả kỳ. */}
      <FormController
        key={`period-${formKey}`}
        register={register}
        name="period"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Kỳ',
          options: periodOptions,
          // Ba trạng thái, ba câu khác nhau: thiếu quyền KHÔNG được nói thành "không có kỳ
          // nào" — đó là nói sai nguyên nhân và người dùng sẽ đi sửa nhầm chỗ (khoảng ngày).
          placeholder: !canViewPeriodOptions
            ? 'Không có quyền xem danh sách kỳ'
            : periodOptions.length
              ? 'Tất cả kỳ'
              : 'Không có kỳ nào trong khoảng đã chọn',
          disabled: !canViewPeriodOptions || periodOptions.length === 0,
        }}
      />
      <FormController
        key={`branches-${formKey}`}
        register={register}
        name="branches"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Chi nhánh',
          placeholder: 'Tất cả chi nhánh',
          loadOptions: loadBranchOptions,
          loadInitialOptions: loadInitialBranchOptions,
          pageSize: PAGE_SIZE,
          enableSearch: true,
          searchPlaceholder: 'Tìm kiếm chi nhánh...',
          multiple: true,
          onChangeOption: handleBranchChange,
          triggerVariant: 'chips' as const,
          maxChips: 3,
          className: 'w-full',
        }}
      />
      <FormController
        // `formKey` không đủ: danh sách khối đổi theo chi nhánh, nên phải dựng lại `Select`
        // khi chi nhánh đổi, không thì nó giữ nguyên trang option đã tải của chi nhánh cũ.
        key={`blocks-${formKey}-${(branches ?? []).join(',')}`}
        register={register}
        name="blocks"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Khối',
          placeholder: branches?.length === 1 ? 'Tất cả khối của chi nhánh' : 'Tất cả khối',
          loadOptions: loadBlockOptions,
          loadInitialOptions: loadInitialBlockOptions,
          pageSize: PAGE_SIZE,
          enableSearch: true,
          searchPlaceholder: 'Tìm kiếm khối...',
          multiple: true,
          onChangeOption: handleBlockChange,
          triggerVariant: 'chips' as const,
          maxChips: 3,
          className: 'w-full',
        }}
      />
      <FormController
        key={`groupOrg-${formKey}`}
        register={register}
        name="groupOrg"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Nhóm theo tổ chức',
          options: ORG_GROUP_OPTIONS,
          clearable: false, // cùng lý do với "Nhóm theo thời gian" ở trên
        }}
      />
      <FormController
        key={`orgActivity-${formKey}`}
        register={register}
        name="orgActivity"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Đơn vị phát sinh giao dịch',
          options: ORG_ACTIVITY_OPTIONS,
          // Bỏ trống ô này không có nghĩa gì: server luôn phải biết lấy tập đơn vị nào,
          // nên "Xoá bộ lọc" đưa về "có phát sinh giao dịch" chứ không để rỗng.
          clearable: false,
        }}
      />
    </Grid>
  )
})

PerformanceByOrgFilterForm.displayName = 'PerformanceByOrgFilterForm'

export default PerformanceByOrgFilterForm
