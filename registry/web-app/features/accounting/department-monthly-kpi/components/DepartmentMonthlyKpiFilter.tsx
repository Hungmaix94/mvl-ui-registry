import {
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
  useCallback,
  useId,
  type ReactNode,
} from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select, TextField, CurrencyInput, Checkbox } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import {
  departmentMonthlyKpiFilterSchema,
  type DepartmentMonthlyKpiFilterValues,
} from '../schemas/department-monthly-kpi-schemas'
import {
  POOL_STATUS_OPTIONS,
  SPLIT_STATUS_OPTIONS,
} from '../constants/department-monthly-kpi-status'

export type DepartmentMonthlyKpiFilterRef = {
  clearForm: () => void
  getValues: () => DepartmentMonthlyKpiFilterValues
}

type DepartmentMonthlyKpiFilterProps = {
  initialValues?: Partial<DepartmentMonthlyKpiFilterValues>
  /** Màn pool hoa hồng phòng có `status` + `split_status` thật; màn Hoa hồng theo doanh thu thì không. */
  showStatus?: boolean
  /** Cờ doanh số / đã tính toán — chỉ có ở màn Hoa hồng theo doanh thu (`CommissionByRevenuePage`). */
  showKpiFlags?: boolean
}

const DEFAULT_FORM_VALUES: DepartmentMonthlyKpiFilterValues = {
  branch: null,
  block: null,
  department: null,
  status: null,
  split_status: null,
  has_revenue: null,
  is_computed: null,
  only_departments_with_employees: false,
  only_departments_with_deals: false,
  completion_pct_min: null,
  completion_pct_max: null,
  leader_pct_min: null,
  leader_pct_max: null,
  leader_amount_min: null,
  leader_amount_max: null,
  director_pct_min: null,
  director_pct_max: null,
  director_amount_min: null,
  director_amount_max: null,
  ceo_pct_min: null,
  ceo_pct_max: null,
  ceo_amount_min: null,
  ceo_amount_max: null,
}

/**
 * The three manager commission groups, each filterable by percentage and by amount.
 *
 * Bug 86eyr1vam: đây là HOA HỒNG quản lý, không phải thưởng — `manager_splits[].amount` được BE
 * phát thành `CommissionPayable`. Nhãn hiển thị vốn đã đúng, chỉ tên biến và chú thích còn gọi là
 * "bonus" nên người đọc sau dễ mang chữ "Thưởng" quay lại.
 */
const COMMISSION_RANGES = [
  { title: 'HH Quản lý Trưởng phòng', pct: 'leader_pct', amount: 'leader_amount' },
  { title: 'HH Quản lý Giám đốc', pct: 'director_pct', amount: 'director_amount' },
  { title: 'HH Quản lý Tổng giám đốc', pct: 'ceo_pct', amount: 'ceo_amount' },
] as const

/**
 * Where a range's label sits in the hierarchy.
 *
 * `field` — the range IS the filter, standing beside "Doanh số" and friends, so it carries the
 * same label style those controls draw for themselves.
 * `sub` — the range is one half of a filter that `FilterGroup` already named ("HH Quản lý Giám đốc"
 * → "Tỷ lệ" / "Thành tiền"), so it steps down a level instead of competing with that name.
 */
type RangeLabelLevel = 'field' | 'sub'

const RANGE_LABEL_CLASS: Record<RangeLabelLevel, string> = {
  field: 'typo-body-base-semibold text-neutral-90',
  sub: 'typo-body-sm-medium text-content-dark-2',
}

/**
 * A named block of related controls.
 *
 * The dialog carries 21 conditions; without grouping, the three manager bonuses read as six
 * interchangeable range fields and the two list-scope checkboxes read as orphans floating
 * between dropdowns. One titled surface per concept restores the shape of the form — and
 * `role="group"` + `aria-labelledby` means a screen reader announces "HH Quản lý Giám đốc" when
 * entering the block rather than a bare "Từ".
 */
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    // Không khung, không nền: khi tiêu đề nhóm đã dùng đúng style nhãn field, cái khung chỉ
    // nói lại một lần nữa điều mà nhãn + thụt hàng đã nói rồi, và biến bốn nhóm thành bốn hộp
    // xếp chồng trong một hộp thoại. Khoảng cách dọc lo phần tách nhóm.
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-2">
      {/* Cùng style với nhãn do TextField/Select tự vẽ (`FieldLabel`): với người dùng, "HH Quản
          lý Giám đốc" là MỘT bộ lọc ngang hàng "Doanh số" — còn "Tỷ lệ" / "Thành tiền" bên trong
          chỉ là hai đầu của nó, nên chúng mới là cấp nhỏ hơn. */}
      <span id={headingId} className="typo-body-base-semibold text-neutral-90">
        {title}
      </span>
      {children}
    </div>
  )
}

const HAS_REVENUE_OPTIONS = [
  { label: 'Có doanh số', value: 'true' },
  { label: 'Chưa có doanh số', value: 'false' },
]

const IS_COMPUTED_OPTIONS = [
  { label: 'Đã tính toán', value: 'true' },
  { label: 'Chưa tính toán', value: 'false' },
]

const DepartmentMonthlyKpiFilter = forwardRef<
  DepartmentMonthlyKpiFilterRef,
  DepartmentMonthlyKpiFilterProps
>(({ initialValues, showStatus = true, showKpiFlags = false }, ref) => {
  const [formKey, setFormKey] = useState(0)
  // When true, the cascade seeds no initialValues (used right after "Xoá bộ lọc" so it
  // doesn't re-populate from stale URL params on the next render).
  const [shouldClearCascade, setShouldClearCascade] = useState(false)

  // `AppDialog` dựng trên Radix Dialog không `forceMount`, nên khối này bị unmount lúc đóng
  // và mount lại lúc mở — `defaultValues` tự seed từ URL mỗi lần mở. KHÔNG thêm effect
  // `reset()` theo `initialValues`: identity của nó đổi giữa chừng sẽ xoá lựa chọn user đang
  // gõ dở, đúng lỗi đã phải sửa ở bộ lọc báo cáo tạm ứng 21.3.
  const { register, control, reset, getValues, setValue, handleSubmit } =
    useForm<DepartmentMonthlyKpiFilterValues>({
      resolver: zodResolver(departmentMonthlyKpiFilterSchema),
      defaultValues: {
        ...DEFAULT_FORM_VALUES,
        ...initialValues,
      },
    })

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(DEFAULT_FORM_VALUES)
        setShouldClearCascade(true)
        setFormKey((k) => k + 1)
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  // Cascade emits `*_id` numbers (0 = unselected). Map them into our `branch`/`block`/`department`
  // form fields (which mirror the API query-param names).
  const handleCascadeChange = useCallback(
    (data: CascadeSelectFormData) => {
      setValue('branch', (data.branch_id ?? 0) > 0 ? data.branch_id : null, { shouldDirty: true })
      setValue('block', (data.block_id ?? 0) > 0 ? data.block_id : null, { shouldDirty: true })
      setValue('department', (data.department_id ?? 0) > 0 ? data.department_id : null, {
        shouldDirty: true,
      })
    },
    [setValue]
  )

  // Cascade `initialValues` are string IDs; feed the current URL selection back in on reopen.
  const cascadeInitialValues = useMemo(() => {
    if (shouldClearCascade) return undefined
    return {
      branch: initialValues?.branch ? String(initialValues.branch) : undefined,
      block: initialValues?.block ? String(initialValues.block) : undefined,
      department: initialValues?.department ? String(initialValues.department) : undefined,
    }
  }, [initialValues, shouldClearCascade])

  /**
   * One numeric range, rendered as a single labelled row: `Tỷ lệ  [Từ] – [Đến]`.
   *
   * "Từ" / "Đến" are placeholders rather than field labels on purpose. Labelling both ends of
   * seven ranges stacks fourteen near-identical captions down the dialog and buries the only
   * words that differ — which column the range belongs to. The unit lives in the field suffix
   * (`%` / `VND`), so the row label stays short.
   *
   * Percentages go through a plain number field (decimals matter — a rule can pay 2,5%), while
   * money uses `CurrencyInput` so the thousand separators match how the amounts read in the
   * table the user is filtering.
   *
   * `groupTitle` chỉ phục vụ tên khả truy cập. Nhãn nhìn thấy được nằm ở `<span>` bên dưới nên
   * không vào tên của ô input, và đơn vị thì ở `suffix` trang trí — thiếu nó, bốn ô trong nhóm
   * "HH Quản lý Giám đốc" đều xưng "Từ"/"Đến" y hệt nhau với trình đọc màn hình.
   */
  const renderRange = (
    title: string,
    base: string,
    kind: 'pct' | 'money',
    level: RangeLabelLevel = 'field',
    groupTitle?: string
  ) => {
    const Field = kind === 'pct' ? TextField : CurrencyInput
    const unit = kind === 'pct' ? '%' : 'VND'
    const fullTitle = groupTitle ? `${groupTitle} – ${title}` : title
    const boundProps = (placeholder: string) => ({
      placeholder,
      'aria-label': `${fullTitle} – ${placeholder} (${unit})`,
      ...(kind === 'pct'
        ? // Không cho gõ số âm: cả bảy khoảng đều là tỷ lệ hoặc tiền hoa hồng, "Đến -5" chỉ tạo ra
          // một danh sách rỗng vĩnh viễn mà không nói vì sao.
          { type: 'number', suffix: '%', allowNegative: false }
        : // KHÔNG `hideZero`: `CurrencyInput` vẽ ô rỗng khi giá trị là 0 trong khi form vẫn giữ
          // '0' và request vẫn gửi đi — người dùng mở dialog ra tìm bộ lọc đang chặn danh sách
          // thì thấy mọi ô đều trống, bấm Áp dụng lại ghi nguyên con 0 đó trở lại URL.
          { allowNegative: false }),
    })

    return (
      <div className="flex flex-col gap-2">
        <span className={RANGE_LABEL_CLASS[level]}>{title}</span>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <FormController
            key={`${base}_min-${formKey}`}
            register={register}
            name={`${base}_min` as keyof DepartmentMonthlyKpiFilterValues}
            control={control}
            Field={Field}
            fieldProps={boundProps('Từ')}
          />
          <span aria-hidden="true" className="text-content-dark-3 select-none">
            –
          </span>
          <FormController
            key={`${base}_max-${formKey}`}
            register={register}
            name={`${base}_max` as keyof DepartmentMonthlyKpiFilterValues}
            control={control}
            Field={Field}
            fieldProps={boundProps('Đến')}
          />
        </div>
      </div>
    )
  }

  return (
    <Form loading={false} onSubmit={() => {}} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={cascadeInitialValues}
          onFormChange={handleCascadeChange}
          showEmployee={false}
          showPosition={false}
          skipValidation={true}
          className="gap-4"
        />
        {showStatus && (
          <>
            <FormController
              key={`status-${formKey}`}
              register={register}
              name="status"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái duyệt',
                options: POOL_STATUS_OPTIONS,
                placeholder: 'Tất cả',
                isClearable: true,
              }}
            />
            <FormController
              key={`split-status-${formKey}`}
              register={register}
              name="split_status"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái chia',
                options: SPLIT_STATUS_OPTIONS,
                placeholder: 'Tất cả',
                isClearable: true,
              }}
            />
          </>
        )}
        {showKpiFlags && (
          <>
            {/* Ba bộ lọc cấp phòng trên một hàng. Cột thứ ba rộng hơn vì nó chứa hai ô cộng
                dấu nối, không phải một control đơn như hai cột trước. */}
            <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-5">
              <FormController
                key={`has-revenue-${formKey}`}
                register={register}
                name="has_revenue"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Doanh số',
                  options: HAS_REVENUE_OPTIONS,
                  placeholder: 'Tất cả',
                  isClearable: true,
                }}
              />
              <FormController
                key={`is-computed-${formKey}`}
                register={register}
                name="is_computed"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Tình trạng tính toán',
                  options: IS_COMPUTED_OPTIONS,
                  placeholder: 'Tất cả',
                  isClearable: true,
                }}
              />
              {renderRange('Tỷ lệ hoàn thành', 'completion_pct', 'pct')}
            </div>

            {/* Cả hai đều là opt-in: không tích thì danh sách vẫn đủ mọi phòng như trước.
                Nhãn bỏ đuôi "khỏi danh sách" vì tiêu đề nhóm đã nói điều đó — nhờ vậy mỗi
                nhãn gọn trong một dòng ở nửa bề ngang. */}
            <FilterGroup title="Phạm vi danh sách">
              <div className="grid grid-cols-2 gap-4">
                <FormController
                  key={`with-employees-${formKey}`}
                  register={register}
                  name="only_departments_with_employees"
                  control={control}
                  Field={Checkbox}
                  fieldProps={{ label: 'Bỏ phòng không có nhân viên' }}
                />
                <FormController
                  key={`with-deals-${formKey}`}
                  register={register}
                  name="only_departments_with_deals"
                  control={control}
                  Field={Checkbox}
                  fieldProps={{ label: 'Bỏ phòng không có giao dịch' }}
                />
              </div>
            </FilterGroup>

            {/* Tỷ lệ và thành tiền của cùng một vai đứng cạnh nhau: chúng là hai cách hỏi về
                một khoản hoa hồng, và xếp chồng làm mỗi nhóm cao gấp đôi trong một hộp thoại
                vốn đã phải cuộn. */}
            {COMMISSION_RANGES.map(({ title, pct, amount }) => (
              <FilterGroup key={pct} title={title}>
                {/* 1/3 : 2/3 — một tỷ lệ chỉ có 1-3 chữ số, còn tiền hoa hồng lên tới hàng
                    trăm triệu; chia đôi đều là cho ô ngắn thừa chỗ và ô dài thiếu chỗ. */}
                <div className="grid grid-cols-[1fr_2fr] gap-5">
                  {renderRange('Tỷ lệ', pct, 'pct', 'sub', title)}
                  {renderRange('Thành tiền', amount, 'money', 'sub', title)}
                </div>
              </FilterGroup>
            ))}
          </>
        )}
      </Flex>
    </Form>
  )
})

DepartmentMonthlyKpiFilter.displayName = 'DepartmentMonthlyKpiFilter'

export default DepartmentMonthlyKpiFilter
