import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'

import { Select } from '@/components/ui'
import type { SelectProps } from '@/components/ui/select'
import FormController from '@/components/ui/form/FormController'

/**
 * Bộ lọc org cho mục ② (Hoa hồng quản lý KPI/HHQL) ở màn chi tiết bảng kê Quản lý.
 * CR ClickUp 86ey9mytk.
 *
 * Lọc theo **org SINH RA KPI** (`kpi_branch`/`kpi_block`/`kpi_department` của từng dòng), không
 * phải org của người hưởng. Một quản lý ăn HHQL từ mọi phòng mình phụ trách, nên câu hỏi ở đây là
 * "trong phiếu này, phần nào đến từ phòng X" — khác hẳn bộ lọc ngoài màn danh sách vốn trả lời
 * "cho tôi xem phiếu của người thuộc phòng X".
 *
 * Lựa chọn KHÔNG lấy từ danh mục tổ chức toàn công ty mà rút từ chính các dòng của phiếu này
 * (xem `buildHhqlOrgOptions`). Một quản lý chỉ phụ trách vài phòng; bày ra hàng trăm phòng thì
 * gần như lựa chọn nào cũng ra 0 dòng, và người dùng phải mò. Rút từ phiếu thì chọn gì cũng có
 * dữ liệu, và nhìn danh sách là biết ngay phiếu gồm những phòng nào.
 */

export type HhqlOrgFilterFormData = {
  branch?: (string | number)[]
  block?: (string | number)[]
  department?: (string | number)[]
}

export type HhqlOrgFilterRef = {
  getValues: () => HhqlOrgFilterFormData
  clearForm: () => void
}

/**
 * `branchId`/`blockId` là org cha, mang theo để 3 ô thu hẹp lẫn nhau mà không phải gọi thêm API.
 * `null` nghĩa là dòng nguồn không có org cha đó (dữ liệu khuyết) — khi đó KHÔNG lọc bỏ, vì ẩn
 * một lựa chọn có thật còn tệ hơn hiện thừa một lựa chọn.
 */
export type OrgOption = {
  label: string
  value: number
  branchId?: number | null
  blockId?: number | null
}

export type HhqlOrgOptions = {
  branches: OrgOption[]
  blocks: OrgOption[]
  departments: OrgOption[]
}

type Props = {
  initialValues?: HhqlOrgFilterFormData
  isOpen: boolean
  options: HhqlOrgOptions
}

const EMPTY: HhqlOrgFilterFormData = { branch: [], block: [], department: [] }

const toIdSet = (values?: (string | number)[]) => new Set((values ?? []).map(Number))

export const KpiHhqlOrgFilter = forwardRef<HhqlOrgFilterRef, Props>(
  ({ initialValues, isOpen, options }, ref) => {
    const form = useForm<HhqlOrgFilterFormData>({ defaultValues: initialValues ?? EMPTY })
    const { control, register, reset, getValues, watch, setValue } = form

    useEffect(() => {
      if (isOpen) form.reset(initialValues ?? EMPTY)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => getValues(),
      clearForm: () => reset(EMPTY),
    }))

    const chosenBranches = watch('branch')
    const chosenBlocks = watch('block')

    // Ba ô thu hẹp lẫn nhau. Không phải để cho đẹp: chọn "chi nhánh Đà Nẵng" rồi vẫn thấy phòng
    // của Hà Nội trong ô dưới thì người dùng chọn xong ra 0 dòng mà không hiểu tại sao.
    const blockOptions = useMemo(() => {
      const branchIds = toIdSet(chosenBranches)
      if (branchIds.size === 0) return options.blocks
      return options.blocks.filter((o) => o.branchId == null || branchIds.has(o.branchId))
    }, [chosenBranches, options.blocks])

    const departmentOptions = useMemo(() => {
      const branchIds = toIdSet(chosenBranches)
      const blockIds = toIdSet(chosenBlocks)
      return options.departments.filter(
        (o) =>
          (branchIds.size === 0 || o.branchId == null || branchIds.has(o.branchId)) &&
          (blockIds.size === 0 || o.blockId == null || blockIds.has(o.blockId))
      )
    }, [chosenBranches, chosenBlocks, options.departments])

    // Thu hẹp xong phải dọn giá trị đã chọn nay không còn hợp lệ, nếu không bộ lọc gửi lên một id
    // mà ô của nó không còn hiển thị — chip trên thanh trạng thái nói một đằng, kết quả một nẻo.
    useEffect(() => {
      const valid = new Set(blockOptions.map((o) => o.value))
      const current = (getValues('block') ?? []).map(Number)
      const kept = current.filter((id) => valid.has(id))
      if (kept.length !== current.length) setValue('block', kept, { shouldDirty: true })
    }, [blockOptions, getValues, setValue])

    useEffect(() => {
      const valid = new Set(departmentOptions.map((o) => o.value))
      const current = (getValues('department') ?? []).map(Number)
      const kept = current.filter((id) => valid.has(id))
      if (kept.length !== current.length) setValue('department', kept, { shouldDirty: true })
    }, [departmentOptions, getValues, setValue])

    return (
      <FormProvider {...form}>
        <Grid columns="1" gap="4" className="w-full">
          <FormController<HhqlOrgFilterFormData, SelectProps<OrgOption>>
            register={register}
            control={control}
            name="branch"
            Field={Select}
            fieldProps={{
              label: 'Chi nhánh',
              placeholder: 'Tất cả chi nhánh',
              multiple: true,
              options: options.branches,
            }}
          />
          <FormController<HhqlOrgFilterFormData, SelectProps<OrgOption>>
            register={register}
            control={control}
            name="block"
            Field={Select}
            fieldProps={{
              label: 'Khối',
              placeholder: 'Tất cả khối',
              multiple: true,
              options: blockOptions,
            }}
          />
          <FormController<HhqlOrgFilterFormData, SelectProps<OrgOption>>
            register={register}
            control={control}
            name="department"
            Field={Select}
            fieldProps={{
              label: 'Phòng KD',
              placeholder: 'Tất cả phòng',
              multiple: true,
              options: departmentOptions,
            }}
          />
        </Grid>
      </FormProvider>
    )
  }
)

KpiHhqlOrgFilter.displayName = 'KpiHhqlOrgFilter'

export default KpiHhqlOrgFilter
