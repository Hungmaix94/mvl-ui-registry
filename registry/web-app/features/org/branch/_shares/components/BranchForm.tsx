import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState, useEffect, useMemo } from 'react'
import {
  branchCreateSchema,
  type BranchCreateFormData,
} from '@/features/org/branch/_shares/schemas/branch-create-schema.ts'
import {
  branchEditSchema,
  type BranchEditFormData,
} from '@/features/org/branch/_shares/schemas/branch-edit-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, TextArea, TextField, Text, Select } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import {
  useCreateBranch,
  useUpdateBranch,
  type Branch,
} from '@/features/org/services/branch-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import { useProvinceSelect } from '@/hooks/useProvinceSelect.ts'
import { useAdministrativeUnitSelect } from '@/hooks/useAdministrativeUnitSelect.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import BranchCsvMultiRowField from '@/features/org/branch/_shares/components/BranchCsvMultiRowField.tsx'
import {
  parseLeadershipCsv,
  parseHrContactCsv,
  serializeLeadershipCsv,
  serializeHrContactCsv,
  LEADERSHIP_CSV_HEADER,
  HR_CONTACT_CSV_HEADER,
  type LeadershipCsvRow,
  type HrContactCsvRow,
} from '@/features/org/branch/_shares/utils/branchLeadershipHrCsv.ts'

interface BranchFormProps {
  initialData?: Branch
  onSuccess?: () => void
  onCancel?: () => void
}

type BranchFormData = BranchCreateFormData | BranchEditFormData

const BranchForm = ({ initialData, onSuccess, onCancel }: BranchFormProps) => {
  const isEdit = !!initialData
  const createBranchMutation = useCreateBranch()
  const updateBranchMutation = useUpdateBranch()

  const mutation = isEdit ? updateBranchMutation : createBranchMutation
  const schema = isEdit ? branchEditSchema : branchCreateSchema

  // Track selected province ID for administrative units loading
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(
    initialData?.province?.id || null
  )

  const [leadershipRows, setLeadershipRows] = useState<LeadershipCsvRow[]>(() =>
    parseLeadershipCsv(initialData?.leadership_info_csv)
  )

  const [hrContactRows, setHrContactRows] = useState<HrContactCsvRow[]>(() =>
    parseHrContactCsv(initialData?.hr_contact_info_csv)
  )

  const [leadershipError, setLeadershipError] = useState<string | null>(null)
  const [hrContactError, setHrContactError] = useState<string | null>(null)

  // Use province select hook for load on scrolling
  const { loadProvinceOptions, loadInitialProvinceOptions } = useProvinceSelect({
    pageSize: PAGE_SIZE,
  })

  // Use administrative unit select hook for load on scrolling
  const { loadAdministrativeUnitOptions, loadInitialAdministrativeUnitOptions } =
    useAdministrativeUnitSelect({
      parentProvince: selectedProvinceId,
      pageSize: PAGE_SIZE,
    })

  const directorSelectAdditionalParams = useMemo(
    () => ({ position__is_leadership: true }) as Record<string, any>,
    []
  )

  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'id',
    pageSize: PAGE_SIZE,
    additionalParams: directorSelectAdditionalParams,
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    setError,
  } = useForm<BranchFormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          address: initialData.address,
          administrative_unit_id: initialData.administrative_unit?.id || (undefined as any),
          province_id: initialData.province?.id || (undefined as any),
          phone: initialData.phone || '',
          email: initialData.email || '',
          director_id: initialData.director?.id ?? null,
          description: initialData.description || '',
          leadership_info_csv: initialData.leadership_info_csv || '',
          hr_contact_info_csv: initialData.hr_contact_info_csv || '',
        }
      : {
          name: '',
          address: '',
          administrative_unit_id: undefined as any,
          province_id: undefined as any,
          phone: '',
          email: '',
          director_id: null,
          description: '',
          leadership_info_csv: '',
          hr_contact_info_csv: '',
        },
    shouldFocusError: true,
  })

  // Watch province field changes
  const watchedProvince = watch('province_id')

  // Set initial province value (for edit mode)
  useEffect(() => {
    if (isEdit && initialData?.province?.id) {
      setValue('province_id', initialData.province.id)
    }
  }, [isEdit, initialData?.province?.id, setValue])

  // Set ward value only when province matches initial data (for edit mode)
  useEffect(() => {
    if (
      isEdit &&
      selectedProvinceId === initialData?.province?.id &&
      initialData?.administrative_unit?.id
    ) {
      setValue('administrative_unit_id', initialData.administrative_unit.id)
    }
  }, [
    isEdit,
    initialData?.administrative_unit?.id,
    initialData?.province?.id,
    selectedProvinceId,
    setValue,
  ])

  // Update selected province ID when province field changes
  useEffect(() => {
    const provinceId = watchedProvince ? Number(watchedProvince) : null
    if (provinceId !== selectedProvinceId) {
      setSelectedProvinceId(provinceId)
      // Reset ward field when province changes (except when it's the initial province in edit mode)
      if (!isEdit || provinceId !== initialData?.province?.id) {
        setValue('administrative_unit_id', null as unknown as any)
      }
    }
  }, [watchedProvince, selectedProvinceId, setValue, isEdit, initialData?.province?.id])

  // Auto-scroll to first error field when validation fails
  useScrollToError(errors)

  const onSubmit = useCallback(
    async (data: BranchFormData) => {
      try {
        setLeadershipError(null)
        setHrContactError(null)

        const trimmedLeadershipRows = leadershipRows.map((row) => ({
          position: row.position.trim(),
          fullName: row.fullName.trim(),
        }))

        const nonEmptyLeadershipRows = trimmedLeadershipRows.filter(
          (row) => row.position !== '' || row.fullName !== ''
        )

        const hasLeadershipRowWithMissingField = nonEmptyLeadershipRows.some(
          (row) => row.position === '' || row.fullName === ''
        )

        if (hasLeadershipRowWithMissingField) {
          setLeadershipError('Vui lòng nhập đầy đủ Vị trí và Họ và tên cho mỗi dòng.')
          return
        }

        const trimmedHrRows = hrContactRows.map((row) => ({
          businessLine: row.businessLine.trim(),
          fullName: row.fullName.trim(),
          phone: row.phone.trim(),
          email: row.email.trim(),
        }))

        const nonEmptyHrRows = trimmedHrRows.filter(
          (row) => row.businessLine || row.fullName || row.phone || row.email
        )

        const hasHrRowWithMissingField = nonEmptyHrRows.some(
          (row) => !row.businessLine || !row.fullName || !row.phone || !row.email
        )

        if (hasHrRowWithMissingField) {
          setHrContactError(
            'Vui lòng nhập đầy đủ Nghiệp vụ, Họ và tên, Số điện thoại và Email cho mỗi dòng.'
          )
          return
        }

        const leadershipCsv = serializeLeadershipCsv(nonEmptyLeadershipRows)
        const hrContactCsv = serializeHrContactCsv(nonEmptyHrRows)

        const apiData = {
          name: data.name,
          code: isEdit ? (data as BranchEditFormData).code : '',
          address: data.address,
          phone: data.phone,
          email: data.email,
          director_id: data.director_id ? Number(data.director_id) : null,
          province_id: data.province_id as any,
          administrative_unit_id: data.administrative_unit_id as any,
          description: data.description,
          leadership_info_csv: leadershipCsv ?? LEADERSHIP_CSV_HEADER,
          hr_contact_info_csv: hrContactCsv ?? HR_CONTACT_CSV_HEADER,
        }

        if (isEdit) {
          await updateBranchMutation.mutateAsync({ id: initialData!.id, data: apiData })
          toastService.success('Cập nhật chi nhánh thành công')
        } else {
          await createBranchMutation.mutateAsync(apiData)
          toastService.success('Tạo chi nhánh thành công')
        }
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [
      isEdit,
      createBranchMutation,
      updateBranchMutation,
      initialData,
      onSuccess,
      setError,
      leadershipRows,
      hrContactRows,
    ]
  )

  return (
    <Form
      key={`branch-form-${initialData?.id || 'create'}`}
      loading={mutation.isPending}
      onSubmit={onSubmit}
      handleSubmit={handleSubmit}
    >
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Section: Thông tin chi nhánh */}
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chi nhánh</Text>

        {/* Fields */}
        <Flex direction="column" gap={isEdit ? '4' : '2'}>
          {/* Row 1: Tên chi nhánh (+ Mã chi nhánh in edit mode) */}
          {isEdit ? (
            <Flex gap="5" className="w-full">
              <Flex direction="column" gap="2" className="flex-1">
                <FormController
                  register={register}
                  name="name"
                  control={control}
                  Field={TextField}
                  fieldProps={{
                    label: 'Tên chi nhánh',
                    required: true,
                    placeholder: 'Nhập tên chi nhánh',
                    name: 'name',
                    type: 'text',
                    error: errors.name?.message,
                    disabled: mutation.isPending,
                  }}
                />
              </Flex>
              <Flex direction="column" gap="2" className="flex-1">
                <FormController
                  register={register}
                  name="code"
                  control={control}
                  Field={TextField}
                  fieldProps={{
                    label: 'Mã chi nhánh',
                    required: true,
                    placeholder: 'Mã chi nhánh',
                    name: 'code',
                    type: 'text',
                    error: (errors as any).code?.message,
                    disabled: true, // Readonly field
                  }}
                />
              </Flex>
            </Flex>
          ) : (
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên chi nhánh',
                required: true,
                placeholder: 'Nhập tên chi nhánh',
                autoFocus: true,
                name: 'name',
                type: 'text',
                error: errors.name?.message,
                disabled: mutation.isPending,
              }}
            />
          )}

          {/* Row 2: Địa chỉ đường phố */}
          <Flex direction="column" gap="2">
            <FormController
              register={register}
              name="address"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Địa chỉ đường phố',
                required: true,
                placeholder: isEdit ? 'Nhập địa chỉ đường phố' : 'Nhập thông tin địa chỉ đường phố',
                name: 'address',
                type: 'text',
                error: errors.address?.message,
                disabled: mutation.isPending,
              }}
            />
          </Flex>

          {/* Row 3: Tỉnh + Phường/Xã */}
          <Flex gap="5">
            <Flex direction="column" gap="2" className="flex-1">
              <FormController
                register={register}
                name="province_id"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Tỉnh',
                  required: true,
                  placeholder: 'Nhập/chọn tỉnh',
                  loadOptions: loadProvinceOptions,
                  loadInitialOptions: loadInitialProvinceOptions,
                  pageSize: PAGE_SIZE,
                  searchPlaceholder: 'Tìm kiếm tỉnh...',
                  enableSearch: true,
                  triggerVariant: 'count' as const,
                  disabled: mutation.isPending,
                }}
              />
            </Flex>
            <Flex direction="column" gap="2" className="flex-1">
              <FormController
                register={register}
                name="administrative_unit_id"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Phường/Xã',
                  required: true,
                  placeholder: 'Nhập/chọn phường/xã',
                  loadOptions: loadAdministrativeUnitOptions,
                  loadInitialOptions: loadInitialAdministrativeUnitOptions,
                  pageSize: PAGE_SIZE,
                  searchPlaceholder: 'Tìm kiếm phường/xã...',
                  enableSearch: true,
                  triggerVariant: 'count' as const,
                  disabled: !selectedProvinceId || mutation.isPending,
                }}
              />
            </Flex>
            <Flex direction="column" gap="2" className="flex-1">
              <FormController
                register={register}
                name="director_id"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Giám đốc chi nhánh',
                  required: false,
                  placeholder: 'Nhập/chọn giám đốc chi nhánh',
                  loadOptions: loadEmployeeOptions,
                  loadInitialOptions: loadInitialEmployeeOptions,
                  pageSize: PAGE_SIZE,
                  searchPlaceholder: 'Tìm kiếm giám đốc...',
                  enableSearch: true,
                  triggerVariant: 'count' as const,
                  disabled: mutation.isPending,
                }}
              />
            </Flex>
          </Flex>

          {/* Row 4: Số điện thoại + Email */}
          <Flex gap="5">
            <Flex direction="column" gap="2" className="flex-1">
              <FormController
                register={register}
                name="phone"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số điện thoại liên hệ',
                  required: false,
                  placeholder: 'Nhập số điện thoại',
                  name: 'phone',
                  type: 'text',
                  error: errors.phone?.message,
                  disabled: mutation.isPending,
                }}
              />
              <Text className="typo-body-sm text-content-dark-3">
                Có thể điền nhiều số điện thoại. Các số điện thoại cách nhau bởi dấu gạch ngang (-).
              </Text>
            </Flex>
            <Flex direction="column" gap="2" className="flex-1">
              <FormController
                register={register}
                name="email"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Email',
                  required: false,
                  placeholder: 'Nhập email',
                  name: 'email',
                  type: 'email',
                  error: errors.email?.message,
                  disabled: mutation.isPending,
                }}
              />
            </Flex>
          </Flex>

          {/* Row 5: Mô tả */}
          <Flex direction="column" gap="2">
            <FormController
              register={register}
              name="description"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Mô tả',
                required: false,
                placeholder: 'Nhập mô tả về chi nhánh',
                name: 'description',
                rows: 4,
                error: errors.description?.message,
                disabled: mutation.isPending,
              }}
            />
          </Flex>

          {/* Row 6: Thông tin lãnh đạo */}
          <BranchCsvMultiRowField<LeadershipCsvRow>
            title="Thông tin lãnh đạo"
            description="Nhập danh sách lãnh đạo chi nhánh, thông tin này sẽ được sử dụng ở mail hội nhập"
            gridTemplateColsClass="grid-cols-[2fr_2fr_40px]"
            columns={[
              {
                key: 'position',
                header: 'Vị trí',
                placeholder: 'Nhập vị trí',
              },
              {
                key: 'fullName',
                header: 'Họ và tên',
                placeholder: 'Nhập họ và tên',
              },
            ]}
            rows={leadershipRows}
            onChange={setLeadershipRows}
            isDisabled={mutation.isPending}
            errorMessage={leadershipError || undefined}
          />

          {/* Row 7: Thông tin liên lạc */}
          <BranchCsvMultiRowField<HrContactCsvRow>
            title="Thông tin liên lạc"
            description="Thông tin liên hệ HR của chi nhánh, thông tin này sẽ được sử dụng ở mail hội nhập"
            gridTemplateColsClass="grid-cols-[2fr_2fr_2fr_2fr_40px]"
            columns={[
              {
                key: 'businessLine',
                header: 'Nghiệp vụ',
                placeholder: 'Nhập nghiệp vụ',
              },
              {
                key: 'fullName',
                header: 'Họ và tên',
                placeholder: 'Nhập họ và tên',
              },
              {
                key: 'phone',
                header: 'Số điện thoại',
                placeholder: 'Nhập số điện thoại',
              },
              {
                key: 'email',
                header: 'Email',
                placeholder: 'Nhập email',
              },
            ]}
            rows={hrContactRows}
            onChange={setHrContactRows}
            isDisabled={mutation.isPending}
            errorMessage={hrContactError || undefined}
          />
        </Flex>

        {/* Action Buttons */}
        <Flex gap={isEdit ? '4' : '2'} justify="end" className={isEdit ? 'pt-4' : ''}>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={mutation.isPending}
            className={'w-[150px]'}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
            loading={mutation.isPending}
            className={'w-[150px]'}
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default BranchForm
