import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex, Grid } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { CurrencyInput, RichText, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import { getContractService } from '@/features/contract/services/contract-service'
import { PAGE_SIZE } from '@/constants/table.ts'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { format } from 'date-fns'
import type { ContractAppendix } from '@/features/contract/services/contract-appendix-service'
import type { SelectOption } from '@/components/ui/select/Select.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

export type ContractAppendixFormRef = {
  getValues: () => ContractAppendixFormValues
  handleSubmit: (
    onSubmit: (data: ContractAppendixFormValues) => void | Promise<void>
  ) => () => Promise<void>
  setError: (
    name: keyof ContractAppendixFormValues,
    error: { type?: string; message: string }
  ) => void
}

export type ContractAppendixFormValues = z.infer<typeof Schema>

type ContractAppendixFormProps = {
  mode: 'create' | 'edit'
  initialData?: ContractAppendix
  formRef?: React.RefObject<ContractAppendixFormRef>
}

const Schema = z.object({
  employee_id: z.number().min(1, 'Vui lòng chọn nhân viên'),
  parent_contract_id: z.number().min(1, 'Vui lòng chọn số hợp đồng tham chiếu'),
  sign_date: z.string().min(1, 'Vui lòng chọn ngày ký'),
  effective_date: z.string().min(1, 'Vui lòng chọn ngày hiệu lực'),
  expiration_date: z.string().nullable().optional(),
  base_salary: z.number().optional(),
  kpi_salary: z.number().optional(),
  lunch_allowance: z.number().nullable().optional(),
  phone_allowance: z.number().nullable().optional(),
  other_allowance: z.number().nullable().optional(),
  content: z.string().min(1, 'Vui lòng nhập nội dung thay đổi'),
  note: z.string().nullable().optional(),
})

const ContractAppendixForm = forwardRef<ContractAppendixFormRef, ContractAppendixFormProps>(
  ({ mode, initialData }, ref) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
      initialData?.employee?.id || null
    )
    const [selectedContractId, setSelectedContractId] = useState<number | null>(
      initialData?.parent_contract?.id || null
    )
    const [contractAppendixNumber, setContractAppendixNumber] = useState<string | null>(
      initialData?.contract_number || null
    )

    const { control, handleSubmit, watch, setValue, register, formState, setError } =
      useForm<ContractAppendixFormValues>({
        resolver: zodResolver(Schema),
        defaultValues: {
          employee_id: initialData?.employee?.id || undefined,
          parent_contract_id: initialData?.parent_contract?.id || undefined,
          sign_date: initialData?.sign_date
            ? format(new Date(initialData.sign_date), DATE_FORMAT)
            : '',
          effective_date: initialData?.effective_date
            ? format(new Date(initialData.effective_date), DATE_FORMAT)
            : '',
          expiration_date: initialData?.expiration_date
            ? format(new Date(initialData.expiration_date), DATE_FORMAT)
            : null,
          base_salary: initialData?.base_salary ? parseFloat(initialData.base_salary) : undefined,
          kpi_salary: initialData?.kpi_salary ? parseFloat(initialData.kpi_salary) : undefined,
          lunch_allowance: initialData?.lunch_allowance
            ? parseFloat(initialData.lunch_allowance)
            : null,
          phone_allowance: initialData?.phone_allowance
            ? parseFloat(initialData.phone_allowance)
            : null,
          other_allowance: initialData?.other_allowance
            ? parseFloat(initialData.other_allowance)
            : null,
          content: initialData?.content || '',
          note: initialData?.note || null,
        },
      })

    // Store selected contract data (will be loaded when contract is selected)
    const [selectedContractData, setSelectedContractData] = useState<{
      contract_number?: string | null
    } | null>(null)

    // Update contract appendix number when contract is selected
    useEffect(() => {
      if (mode === 'edit' && initialData?.contract_number) {
        setContractAppendixNumber(initialData.contract_number)
      } else if (mode === 'create' && selectedContractData?.contract_number) {
        // Generate appendix number from parent contract number
        // Format: PLHD/... (from parent contract number like HD/...)
        const parentNumber = selectedContractData.contract_number
        if (parentNumber) {
          // Replace HD/ with PLHD/ or add PL prefix
          const appendixNumber = parentNumber
            .replace(/^HD\//, 'PLHD/')
            .replace(/^([^\/]+)\//, 'PL$1/')
          setContractAppendixNumber(appendixNumber)
        } else {
          setContractAppendixNumber(null)
        }
      } else if (mode === 'create' && !selectedContractData) {
        setContractAppendixNumber(null)
      }
    }, [selectedContractData, initialData, mode])

    // Load contract options
    const loadContractOptions = useCallback(
      async (params: { query: string; page: number; pageSize: number }) => {
        if (!selectedEmployeeId) {
          return { items: [], hasNextPage: false }
        }

        try {
          const response = await getContractService().getContracts({
            employee: selectedEmployeeId ?? 0,
            search: params.query || undefined,
            page: params.page,
            page_size: params.pageSize,
          })

          const items: SelectOption[] =
            response.results?.map((contract) => ({
              value: contract.id,
              label: contract.contract_number || contract.code || `Hợp đồng #${contract.id}`,
            })) || []

          return {
            items,
            hasNextPage: !!response.next,
            nextPage: response.next ? params.page + 1 : undefined,
          }
        } catch (error) {
          return { items: [], hasNextPage: false }
        }
      },
      [selectedEmployeeId]
    )

    const loadInitialContractOptions = useCallback(
      async (values: (string | number)[]) => {
        if (!selectedEmployeeId || values.length === 0) return []

        try {
          const response = await getContractService().getContracts({
            employee: selectedEmployeeId ?? 0,
            page_size: 100,
          })

          const contracts =
            response.results?.filter((contract) => values.includes(contract.id)) || []

          // Store selected contract data for auto-filling contract_number
          if (contracts.length > 0 && selectedContractId) {
            const contract = contracts.find((c) => c.id === selectedContractId)
            if (contract) {
              setSelectedContractData({
                contract_number: contract.contract_number,
              })
            }
          }

          return contracts.map((contract) => ({
            value: contract.id,
            label: contract.contract_number || contract.code || `Hợp đồng #${contract.id}`,
          }))
        } catch (error) {
          return []
        }
      },
      [selectedEmployeeId, selectedContractId]
    )

    // Handle employee selection change
    const handleEmployeeChange = useCallback(
      (employeeId: number | null) => {
        setSelectedEmployeeId(employeeId)
        if (employeeId) {
          setValue('employee_id', employeeId)
        } else {
          setValue('employee_id', undefined as any)
        }

        // Clear contract selection when employee changes
        if (employeeId !== selectedEmployeeId) {
          setSelectedContractId(null)
          setValue('parent_contract_id', undefined as any)
          setContractAppendixNumber(null)
        }
      },
      [setValue, selectedEmployeeId]
    )

    // Handle contract selection change
    const handleContractChange = useCallback(
      (contractId: string | number | null) => {
        const id = contractId ? Number(contractId) : null
        setSelectedContractId(id)
        if (id) {
          setValue('parent_contract_id', id)
          // Load contract detail to get contract_number
          getContractService()
            .getContract(id)
            .then((contract) => {
              setSelectedContractData({
                contract_number: contract.contract_number,
              })
            })
            .catch(() => {
              // Silently fail
              setSelectedContractData(null)
            })
        } else {
          setValue('parent_contract_id', undefined as any)
          setSelectedContractData(null)
          setContractAppendixNumber(null)
        }
      },
      [setValue]
    )

    const onSubmit = useCallback(async () => {
      // Form submission is handled by parent component
      // This is just for validation
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => watch(),
        handleSubmit: (onSubmitFn: (data: ContractAppendixFormValues) => void | Promise<void>) =>
          handleSubmit(onSubmitFn),
        setError,
      }),
      [watch, handleSubmit, setError]
    )

    return (
      <Form onSubmit={onSubmit} handleSubmit={handleSubmit} loading={false}>
        <Flex direction="column" className="w-full gap-9">
          {/* Thông tin nhân viên */}
          <Flex direction="column" gap="5">
            <p className="typo-body-xl-semibold text-content-dark-1">Thông tin nhân viên</p>

            <Flex direction="column" gap="5">
              <EmployeeSelectWithDialog
                value={selectedEmployeeId}
                onChange={handleEmployeeChange}
                error={formState.errors.employee_id?.message}
                required
                label="Nhân viên"
              />
            </Flex>
          </Flex>

          {/* Separator */}
          <SeparatorHorizontal />

          {/* Thông tin phụ lục hợp đồng */}
          <Flex direction="column" gap="5">
            <p className="typo-body-xl-semibold text-content-dark-1">Thông tin phụ lục hợp đồng</p>

            <Flex direction="column" gap="5">
              <Grid columns={mode === 'edit' ? '2' : '1'} gap="5">
                <FormController
                  name="parent_contract_id"
                  control={control}
                  register={register}
                  Field={Select}
                  fieldProps={{
                    label: 'Số hợp đồng tham chiếu',
                    required: true,
                    value: selectedContractId,
                    onChange: handleContractChange,
                    loadOptions: selectedEmployeeId ? loadContractOptions : undefined,
                    loadInitialOptions: selectedEmployeeId ? loadInitialContractOptions : undefined,
                    placeholder: selectedEmployeeId
                      ? 'Chọn số hợp đồng tham chiếu'
                      : 'Vui lòng chọn nhân viên trước',
                    searchPlaceholder: 'Tìm kiếm hợp đồng...',
                    enableSearch: !!selectedEmployeeId,
                    pageSize: PAGE_SIZE,
                    disabled: !selectedEmployeeId,
                    error: formState.errors.parent_contract_id?.message,
                  }}
                />

                {mode === 'edit' && (
                  <>
                    <TextField
                      label="Số phụ lục hợp đồng"
                      required
                      value={contractAppendixNumber || ''}
                      disabled
                      showCharacterCount
                      maxLength={50}
                    />
                  </>
                )}
              </Grid>

              <Grid columns="3" gap="5">
                <FormController
                  name="sign_date"
                  control={control}
                  register={register}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày ký',
                    required: true,
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                    error: formState.errors.sign_date?.message,
                  }}
                />

                <FormController
                  name="effective_date"
                  control={control}
                  register={register}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày hiệu lực',
                    required: true,
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                    error: formState.errors.effective_date?.message,
                  }}
                />

                <FormController
                  name="expiration_date"
                  control={control}
                  register={register}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày hết hiệu lực',
                    required: false,
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                    clearable: true,
                    error: formState.errors.expiration_date?.message,
                  }}
                />
              </Grid>

              <Grid columns="2" gap="5">
                <FormController
                  name="base_salary"
                  control={control}
                  register={register}
                  Field={CurrencyInput}
                  fieldProps={{
                    label: 'Mức lương cơ bản',
                    required: false,
                    placeholder: 'Nhập mức lương cơ bản',
                  }}
                />

                <FormController
                  name="kpi_salary"
                  control={control}
                  register={register}
                  Field={CurrencyInput}
                  fieldProps={{
                    label: 'Mức lương KPI',
                    required: false,
                    placeholder: 'Nhập mức lương KPI',
                  }}
                />
              </Grid>

              <Grid columns="3" gap="5">
                <FormController
                  name="lunch_allowance"
                  control={control}
                  register={register}
                  Field={CurrencyInput}
                  fieldProps={{
                    label: 'Phụ cấp ăn trưa',
                    required: false,
                    placeholder: 'Nhập phụ cấp ăn trưa',
                  }}
                />

                <FormController
                  name="phone_allowance"
                  control={control}
                  register={register}
                  Field={CurrencyInput}
                  fieldProps={{
                    label: 'Phụ cấp điện thoại',
                    required: false,
                    placeholder: 'Nhập phụ cấp điện thoại',
                  }}
                />

                <FormController
                  name="other_allowance"
                  control={control}
                  register={register}
                  Field={CurrencyInput}
                  fieldProps={{
                    label: 'Phụ cấp khác',
                    required: false,
                    placeholder: 'Nhập phụ cấp khác',
                  }}
                />
              </Grid>

              <FormController
                name="content"
                control={control}
                register={register}
                Field={RichText}
                fieldProps={{
                  label: 'Nội dung thay đổi',
                  required: true,
                  placeholder: 'Nhập nội dung thay đổi',
                  maxCharacters: 500,
                  error: formState.errors.content?.message,
                }}
              />

              <FormController
                name="note"
                control={control}
                register={register}
                Field={TextArea}
                fieldProps={{
                  label: 'Ghi chú',
                  required: false,
                  placeholder: 'Nhập ghi chú',
                  maxCharacters: 500,
                }}
              />
            </Flex>
          </Flex>
        </Flex>
      </Form>
    )
  }
)

ContractAppendixForm.displayName = 'ContractAppendixForm'

export default ContractAppendixForm
