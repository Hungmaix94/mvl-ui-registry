import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization'

/**
 * Bộ lọc đơn vị của báo cáo 21.10 (CR 86eyj435u) — gom Chi nhánh → Khối → Phòng ban vào dialog.
 *
 * Ô "Tìm người nhận" (`q`) CỐ Ý nằm ngoài, trên toolbar của `PageTitle`: nó là tìm kiếm tức thời
 * theo từng ký tự, nhét vào dialog thì mỗi lần gõ lại phải mở dialog rồi bấm "Áp dụng".
 *
 * Tên trường trùng query param của API để trang chép thẳng sang URL.
 */
export type IncomeByRecipientFilterFormData = {
  branch?: number | null
  block?: number | null
  department?: number | null
}

export type IncomeByRecipientFilterRef = {
  getValues: () => IncomeByRecipientFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: IncomeByRecipientFilterFormData
  isOpen: boolean
}

const DEFAULT_FORM_VALUES: IncomeByRecipientFilterFormData = {
  branch: null,
  block: null,
  department: null,
}

/** Cascade dùng `0` cho "chưa chọn"; URL thì muốn param biến mất hẳn. */
const toFilterId = (value?: number | null) => ((value ?? 0) > 0 ? (value as number) : null)

export const IncomeByRecipientFilter = forwardRef<IncomeByRecipientFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    // Bump-to-remount key: cascade tự giữ state chọn của nó, `reset` của RHF không xoá được —
    // chỉ remount mới xoá.
    const [formKey, setFormKey] = useState(0)
    // Bật ngay sau "Xoá bộ lọc" để cascade không seed lại từ `initialValues` (vẫn là URL cũ,
    // vì URL chỉ đổi khi bấm "Áp dụng").
    const [shouldClearCascade, setShouldClearCascade] = useState(false)

    const { reset, getValues, setValue } = useForm<IncomeByRecipientFilterFormData>({
      defaultValues: { ...DEFAULT_FORM_VALUES, ...initialValues },
    })

    useEffect(() => {
      if (!isOpen) return
      reset({ ...DEFAULT_FORM_VALUES, ...initialValues })
      setShouldClearCascade(false)
      setFormKey((k) => k + 1)
    }, [isOpen, initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => getValues(),
        clearForm: () => {
          reset(DEFAULT_FORM_VALUES)
          setShouldClearCascade(true)
          setFormKey((k) => k + 1)
        },
      }),
      [reset, getValues]
    )

    // Cascade phát cả 3 cấp một lượt (`0` = cấp vừa bị xoá khi đổi cấp cha) — chép đủ cả ba,
    // thiếu một cấp là URL giữ lại cặp lệch (vd chi nhánh A + phòng ban của chi nhánh B).
    const handleCascadeChange = useCallback(
      (data: CascadeSelectFormData) => {
        setValue('branch', toFilterId(data.branch_id))
        setValue('block', toFilterId(data.block_id))
        setValue('department', toFilterId(data.department_id))
      },
      [setValue]
    )

    // Cascade hydrate từ id dạng chuỗi — trả lại lựa chọn hiện tại trên URL khi mở lại dialog.
    const cascadeInitialValues = useMemo(() => {
      if (shouldClearCascade) return undefined
      return {
        branch: initialValues?.branch ? String(initialValues.branch) : undefined,
        block: initialValues?.block ? String(initialValues.block) : undefined,
        department: initialValues?.department ? String(initialValues.department) : undefined,
      }
    }, [initialValues, shouldClearCascade])

    return (
      <CascadeSelectGroupOrganization
        key={formKey}
        initialValues={cascadeInitialValues}
        onFormChange={handleCascadeChange}
        showEmployee={false}
        showPosition={false}
        skipValidation
        layout="vertical"
        className="w-full gap-4"
      />
    )
  }
)

IncomeByRecipientFilter.displayName = 'IncomeByRecipientFilter'

export default IncomeByRecipientFilter
