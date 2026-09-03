import { forwardRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Select } from '@/components/ui'
import type { SelectProps, SelectOption } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'
import OrgCascadeField, { useOrgCascadeSync } from '@/components/commons/filters/OrgCascadeField'
import CheckboxGroupField from '@/components/commons/filters/CheckboxGroupField'
import { useFilterFormHandle, type FilterFormHandle } from '@/hooks/useFilterFormHandle'
import { usePositionSelect } from '@/hooks/usePositionSelect'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  MGMT_COMM_SUMMARY_EMPTY_FILTERS,
  type MgmtCommSummaryFilterFormData,
} from '@/features/report/accounting/management-commission-summary/mgmt-comm-summary-filters'

export type MgmtCommSummaryFilterRef = FilterFormHandle<MgmtCommSummaryFilterFormData>

type Props = {
  initialValues?: MgmtCommSummaryFilterFormData
}

/**
 * Dialog bộ lọc của màn "20.14 HHQL bảng Tổng" (CR ClickUp 86eyqgf5k).
 *
 * Bộ trục bám theo màn "HH theo tháng — Quản lý" mà CR yêu cầu làm tương tự, vì hai màn đọc
 * cùng model `MonthlyBeneficiaryCommissionSummary`. Khác một chỗ có chủ ý: **không** có ô
 * "Nhân viên thụ hưởng" — ô tìm kiếm trên toolbar đã tra theo mã NV và họ tên, nên một Select
 * chọn đúng một người là ô thứ hai làm cùng việc, đặt cạnh nhau chỉ khiến người dùng phải đoán
 * nên dùng cái nào.
 *
 * Không có `useEffect` đồng bộ lại `initialValues`: trang remount cả form bằng
 * `key={filterDialogOpenKey}` mỗi lần mở dialog, nên `defaultValues` luôn tươi
 * (`conventions.md` › Quy tắc Bộ lọc Trang Báo cáo).
 */
export const MgmtCommSummaryFilter = forwardRef<MgmtCommSummaryFilterRef, Props>(
  ({ initialValues }, ref) => {
    const form = useForm<MgmtCommSummaryFilterFormData>({
      defaultValues: { ...MGMT_COMM_SUMMARY_EMPTY_FILTERS, ...initialValues },
    })

    // `formKey` để remount cascade tổ chức — nó giữ state nội bộ nên `reset()` của RHF không
    // xoá được; `hasCleared` để lần remount sau khi bấm "Xoá bộ lọc" không nạp lại giá trị vừa xoá.
    const { formKey, hasCleared } = useFilterFormHandle(ref, {
      reset: form.reset,
      getValues: form.getValues,
      emptyValues: MGMT_COMM_SUMMARY_EMPTY_FILTERS,
    })

    const handleOrgChange = useOrgCascadeSync(form.getValues, form.setValue)

    const { loadPositionOptions, loadInitialPositionOptions } = usePositionSelect()

    // Nhãn trạng thái lấy từ BE qua `useAppConstant`, không tự chế map: bảng này hiện cột
    // "Trạng thái" bằng `MonthlySummaryStatusBadge` cũng đọc cùng nguồn, nên hai chỗ không thể
    // gọi khác tên nhau.
    const { keysMapOptions } = useAppConstant({
      module: 'accounting',
      keys: [APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES],
    })
    const statusOptions = useMemo(
      () =>
        keysMapOptions.get(
          APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES
        ) ?? [],
      [keysMapOptions]
    )

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
        {/* Chi nhánh → Khối → Phòng ban: dùng cascade dùng chung, không dựng 3 Select rời. */}
        <OrgCascadeField
          formKey={formKey}
          initialValues={orgInitialValues}
          onChange={handleOrgChange}
        />

        {/* Tên field tra thẳng về cột "Chức vụ" đang hiện trên bảng. */}
        <FormController<MgmtCommSummaryFilterFormData, SelectProps<SelectOption>>
          register={form.register}
          control={form.control}
          name="position"
          Field={Select}
          fieldProps={{
            label: 'Chức vụ',
            placeholder: 'Tất cả chức vụ',
            loadOptions: loadPositionOptions,
            loadInitialOptions: loadInitialPositionOptions,
            enableSearch: true,
            clearable: true,
          }}
        />

        {/*
          Trạng thái là bộ lọc NHIỀU giá trị ⇒ nhóm ô tick, không phải Select. Bốn lựa chọn ít
          và cố định nên bày sẵn hết ra màn: người dùng thấy ngay còn gì chưa tick mà không phải
          mở popover ra dò. Nhóm chiếm TRỌN một hàng để ô tick chảy ngang rồi mới xuống dòng —
          nhét vào nửa lưới thì chúng xếp dọc thành một cột chữ cao lêu nghêu.
        */}
        <FormController
          register={form.register}
          control={form.control}
          name="status__in"
          Field={CheckboxGroupField}
          fieldProps={{ label: 'Trạng thái', options: statusOptions }}
        />
      </div>
    )
  }
)

MgmtCommSummaryFilter.displayName = 'MgmtCommSummaryFilter'

export default MgmtCommSummaryFilter
