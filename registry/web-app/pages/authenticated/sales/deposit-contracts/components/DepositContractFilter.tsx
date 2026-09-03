import { forwardRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import FormController from '@/components/ui/form/FormController'
import OrgCascadeField, { useOrgCascadeSync } from '@/components/commons/filters/OrgCascadeField'
import CheckboxGroupField from '@/components/commons/filters/CheckboxGroupField'
import { useFilterFormHandle, type FilterFormHandle } from '@/hooks/useFilterFormHandle'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useCustomerSelect } from '@/hooks/useCustomerSelect'
import { type DepositContractFilterFormData } from '@/features/sales/deposit-contracts/utils/deposit-contract-filter-params'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export type { DepositContractFilterFormData }

export type DepositContractFilterRef = FilterFormHandle<DepositContractFilterFormData>

type Props = {
  initialValues?: DepositContractFilterFormData
}

/**
 * Giá trị "rỗng" của form. Phải liệt kê **đủ mọi field**: `reset()` chỉ ghi đè những key có
 * mặt ở đây, key thiếu sẽ giữ nguyên giá trị cũ và "Xoá bộ lọc" hoá ra xoá không hết.
 */
const EMPTY_FORM_VALUES: DepositContractFilterFormData = {
  search: '',
  status__in: [],
  approval_status__in: [],
  project: null,
  investor: null,
  customer: null,
  branch: undefined,
  block: undefined,
  department: undefined,
  contractDateRange: null,
  transactionSheetDateRange: null,
}

export const DepositContractFilter = forwardRef<DepositContractFilterRef, Props>(
  ({ initialValues }, ref) => {
    const form = useForm<DepositContractFilterFormData>({
      defaultValues: { ...EMPTY_FORM_VALUES, ...initialValues },
    })

    // `formKey` để remount cascade tổ chức — nó giữ state nội bộ nên `reset()` của RHF không xoá
    // được; `hasCleared` để lần remount sau khi bấm "Xoá bộ lọc" không nạp lại chính giá trị vừa xoá.
    const { formKey, hasCleared } = useFilterFormHandle(ref, {
      reset: form.reset,
      getValues: form.getValues,
      emptyValues: EMPTY_FORM_VALUES,
    })

    const handleOrgChange = useOrgCascadeSync(form.getValues, form.setValue)

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [
        APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES,
        APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES,
      ],
    })

    const statusOptions = useMemo(
      () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES) ?? [],
      [keysMapOptions]
    )

    const approvalStatusOptions = useMemo(
      () =>
        keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES) ?? [],
      [keysMapOptions]
    )

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({
      valueType: 'id',
    })
    const { loadCustomerOptions, loadInitialCustomerOptions } = useCustomerSelect()

    const orgInitialValues = useMemo(
      () =>
        hasCleared
          ? undefined
          : {
              branch: initialValues?.branch,
              block: initialValues?.block,
              department: initialValues?.department,
            },
      [hasCleared, initialValues?.branch, initialValues?.block, initialValues?.department]
    )

    return (
      <div className="flex w-full flex-col gap-5">
        {/*
          Khoảng ngày đứng đầu và chiếm trọn hàng — chốt 2026-08-17. Nhét vào nửa lưới thì chuỗi
          `DD/MM/YYYY - DD/MM/YYYY` xuống dòng và ô đó cao hơn ô bên cạnh, cả hàng bị lệch.
        */}
        <FormController
          register={form.register}
          name="contractDateRange"
          control={form.control}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Ngày hợp đồng',
            className: 'w-full',
            showQuickSelect: true,
          }}
        />

        <FormController
          register={form.register}
          name="transactionSheetDateRange"
          control={form.control}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Ngày làm phiếu TTGD',
            className: 'w-full',
            showQuickSelect: true,
          }}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormController
            register={form.register}
            name="project"
            control={form.control}
            Field={Select}
            fieldProps={{
              label: 'Dự án',
              placeholder: 'Chọn dự án',
              loadOptions: loadProjectOptions,
              loadInitialOptions: loadInitialProjectOptions,
              enableSearch: true,
            }}
          />
          <FormController
            register={form.register}
            name="investor"
            control={form.control}
            Field={Select}
            fieldProps={{
              label: 'Chủ đầu tư',
              placeholder: 'Chọn chủ đầu tư',
              loadOptions: loadInvestorOptions,
              loadInitialOptions: loadInitialInvestorOptions,
              enableSearch: true,
            }}
          />
        </div>

        {/*
          Khách hàng chiếm trọn hàng: nhãn của nó là `<CMND/MST> - <tên>` nên dài hơn hẳn mọi ô
          khác, để nửa lưới là bị cắt đúng phần tên — thứ người dùng cần đọc.
        */}
        <FormController
          register={form.register}
          name="customer"
          control={form.control}
          Field={Select}
          fieldProps={{
            label: 'Khách hàng',
            placeholder: 'Chọn khách hàng',
            loadOptions: loadCustomerOptions,
            loadInitialOptions: loadInitialCustomerOptions,
            enableSearch: true,
          }}
        />

        {/* Chi nhánh → Khối → Phòng ban: dùng cascade dùng chung, không dựng 3 Select rời. */}
        <OrgCascadeField
          formKey={formKey}
          initialValues={orgInitialValues}
          onChange={handleOrgChange}
        />

        {/*
          Mỗi nhóm trạng thái chiếm TRỌN một hàng. Xếp hai nhóm cạnh nhau thì mỗi bên chỉ còn
          nửa bề ngang, ô tick buộc phải xếp dọc thành hai cột chữ cao lêu nghêu — vừa xấu vừa
          bắt mắt quét dọc hai lần. Full-width thì các lựa chọn chảy ngang, hết chỗ mới xuống dòng.
        */}
        <FormController
          register={form.register}
          name="status__in"
          control={form.control}
          Field={CheckboxGroupField}
          fieldProps={{ label: 'Trạng thái', options: statusOptions }}
        />
        <FormController
          register={form.register}
          name="approval_status__in"
          control={form.control}
          Field={CheckboxGroupField}
          fieldProps={{ label: 'Trạng thái phê duyệt', options: approvalStatusOptions }}
        />
      </div>
    )
  }
)

DepositContractFilter.displayName = 'DepositContractFilter'
export default DepositContractFilter
