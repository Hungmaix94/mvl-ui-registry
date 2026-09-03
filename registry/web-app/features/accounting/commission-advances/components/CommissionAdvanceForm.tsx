import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useForm, FormProvider, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { Button, Select, TextArea } from '@/components/ui'
import { IconPlus, IconTrash } from '@/assets/icons'
import { Table } from '@radix-ui/themes'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import {
  advanceCapForShare,
  isEmployeeShare,
  commissionAdvanceFormSchema,
  type CommissionAdvanceFormValues,
  DEFAULT_COMMISSION_ADVANCE_FORM_VALUES,
} from '@/features/accounting/commission-advances/types/commission-advance-types'
import {
  DEFAULT_TAX_ESTIMATE_RATE,
  TAX_ESTIMATE_RATE_OPTIONS,
  estimateNetAfterTax,
  findShareForRecipient,
} from '@/features/accounting/commission-advances/utils/commission-advance-tax-estimate'
import {
  useCreateCommissionAdvance,
  usePartialUpdateCommissionAdvance,
  useCommissionAdvance,
} from '@/features/accounting/commission-advances/services/commission-advance-service'
import {
  getDealService,
  useDealCommissionShares,
  useDealWorkspace,
} from '@/features/sales/deals/services/deal-service'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useDealSelect } from '@/hooks/useDealSelect'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { formatCurrencyVND } from '@/utils/common'

type Props = {
  id?: number
  onSuccess?: () => void
}

export default function CommissionAdvanceForm({ id, onSuccess }: Props) {
  const navigate = useNavigate()
  const isEdit = !!id

  // ── Select helpers ────────────────────────────────────────────────────────
  const { loadInitialEmployeeOptions } = useEmployeeSelect({ valueType: 'id' })

  // ── Mutations & Fetch ─────────────────────────────────────────────────────
  const createMutation = useCreateCommissionAdvance()
  const partialUpdateMutation = usePartialUpdateCommissionAdvance()

  const { data: record, isLoading: isLoadingRecord } = useCommissionAdvance(id!, {
    enabled: isEdit,
  })

  // ── Form setup ────────────────────────────────────────────────────────────
  const form = useForm<CommissionAdvanceFormValues>({
    resolver: zodResolver(commissionAdvanceFormSchema),
    mode: 'onTouched',
    defaultValues: DEFAULT_COMMISSION_ADVANCE_FORM_VALUES,
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'recipient_lines',
  })

  const selectedProjectId = watch('project')
  const selectedDealId = watch('deal')

  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadDealOptions, loadInitialDealOptions } = useDealSelect({
    projectId: selectedProjectId || undefined,
  })

  const prevProjectIdRef = useRef<number | null | undefined>(undefined)

  useEffect(() => {
    if (selectedProjectId !== prevProjectIdRef.current) {
      if (prevProjectIdRef.current !== undefined) {
        form.setValue('deal', undefined as any)
      }
      prevProjectIdRef.current = selectedProjectId
    }
  }, [selectedProjectId, form])
  const recipientLinesValue = useWatch({ control, name: 'recipient_lines' }) || []
  const totalRequested = useMemo(() => {
    return recipientLinesValue.reduce((sum, line) => sum + Number(line?.requested_amount || 0), 0)
  }, [recipientLinesValue])

  const { data: splitShares, isFetching: isFetchingShares } = useDealCommissionShares(
    selectedDealId,
    'split',
    {
      enabled: !!selectedDealId,
    }
  )

  const totalMaxAdvance = useMemo(() => {
    return recipientLinesValue.reduce((sum, line) => {
      const matchedShare = findShareForRecipient(splitShares?.commission_shares, line)
      const lineMax =
        line?.max_net_amount ??
        (matchedShare
          ? advanceCapForShare(
              Number(matchedShare.calculated_amount || 0),
              !!line.recipient_employee
            )
          : 0)
      return sum + Number(lineMax || 0)
    }, 0)
  }, [recipientLinesValue, splitShares])

  const dealEmployeeOptions = useMemo(() => {
    if (!selectedDealId || !splitShares?.commission_shares) return []
    return splitShares.commission_shares
      .filter((r) => isEmployeeShare(r))
      .map((r) => ({
        label: `${r.employee?.code || ''} - ${r.employee?.fullname?.trim() || ''}`,
        value: String(r.employee?.id || ''),
      }))
  }, [selectedDealId, splitShares])

  const { data: dealWorkspace } = useDealWorkspace(selectedDealId, {
    enabled: !!selectedDealId,
  })

  // Auto-fill parent project when deal (Mã căn) is selected
  useEffect(() => {
    if (!selectedDealId || !dealWorkspace?.overview?.project?.id) return
    const projId = dealWorkspace.overview.project.id
    if (form.getValues('project') !== projId) {
      prevProjectIdRef.current = projId
      form.setValue('project', projId)
      loadInitialProjectOptions([projId])
    }
  }, [selectedDealId, dealWorkspace, form, loadInitialProjectOptions])

  // Khi đổi Mã căn -> reset danh sách người thụ hưởng về mảng rỗng để load danh sách mới
  const prevDealIdRef = useRef<number | null | undefined>(undefined)
  useEffect(() => {
    if (isEdit) return
    if (selectedDealId !== prevDealIdRef.current) {
      if (prevDealIdRef.current !== undefined) {
        const current = form.getValues('recipient_lines') || []
        if (current.length > 0) {
          form.setValue('recipient_lines', [])
        }
      }
      prevDealIdRef.current = selectedDealId
    }
  }, [isEdit, selectedDealId, form])

  // v3 (18.8, E10→E11) — chọn deal là prefill danh sách thụ hưởng từ bảng chia
  // per-party: nhân viên → recipient_employee, CTV/người-nhận-hộ (is_customer_cut)
  // → recipient_collaborator; trần từng dòng mirror cap BE (Q3): nhân viên = 100%
  // share, CTV = 90% share, tối đa 100M/dòng. Chỉ prefill khi kế toán chưa nhập gì.
  useEffect(() => {
    if (isEdit || !selectedDealId || isFetchingShares) return
    const recipients = splitShares?.commission_shares
    if (!recipients?.length) return
    const current = form.getValues('recipient_lines') || []
    const untouched =
      current.length === 0 ||
      (current.length === 1 &&
        !current[0]?.recipient_employee &&
        !current[0]?.recipient_collaborator &&
        !current[0]?.requested_amount)
    if (!untouched) return

    const lines = recipients
      .filter((r) => isEmployeeShare(r))
      .map((r) => {
        const gross = Number(r.calculated_amount || 0)
        return {
          recipient_employee: r.employee?.id ?? null,
          recipient_collaborator: null,
          recipient_label: undefined,
          tax_estimate_rate: 10,
          max_net_amount: advanceCapForShare(gross, true),
          requested_amount: 0,
        }
      })
      .filter((line) => line.recipient_employee)
    if (lines.length > 0) {
      form.setValue('recipient_lines', lines)
    }
  }, [isEdit, selectedDealId, splitShares, form, isFetchingShares])

  // Map initial values when record is loaded in Edit mode
  useEffect(() => {
    if (record) {
      const mappedRecipientLines =
        record.recipient_lines && record.recipient_lines.length > 0
          ? record.recipient_lines.map((line) => ({
              recipient_employee: line.recipient_employee ?? null,
              recipient_collaborator: line.recipient_collaborator ?? null,
              requested_amount: Number(line.requested_amount || 0),
            }))
          : record.requester_employee
            ? [
                {
                  recipient_employee: record.requester_employee ?? null,
                  recipient_collaborator: null,
                  requested_amount: Number(record.requested_amount || 0),
                },
              ]
            : []

      reset({
        deal: record.deal || undefined,
        request_reason: record.request_reason || '',
        commission_period:
          record.period_month && record.period_year
            ? `${String(record.period_month).padStart(2, '0')}/${record.period_year}`
            : '',
        tax_estimate_rate: (record as any).tax_estimate_rate ?? 10,
        recipient_lines: mappedRecipientLines,
      })
    }
  }, [record, reset])

  // Populate async select initial options for Edit mode
  const initialValuesLoader = useCallback(async () => {
    if (!record) return
    const promises = []

    const employeeIds: number[] = []
    if (record.recipient_lines && record.recipient_lines.length > 0) {
      record.recipient_lines.forEach((line) => {
        if (line.recipient_employee) {
          employeeIds.push(line.recipient_employee)
        }
      })
    } else if (record.requester_employee) {
      employeeIds.push(record.requester_employee)
    }

    const uniqueEmployeeIds = Array.from(new Set(employeeIds))
    if (uniqueEmployeeIds.length > 0) {
      promises.push(loadInitialEmployeeOptions(uniqueEmployeeIds))
    }
    if (record.deal) {
      promises.push(loadInitialDealOptions([record.deal]))
      try {
        const deal = await getDealService().getDealWorkspace(record.deal)
        const projId = deal.overview?.project?.id
        if (projId) {
          form.setValue('project', projId)
          prevProjectIdRef.current = projId
          promises.push(loadInitialProjectOptions([projId]))
        }
      } catch (e) {
        console.error('Error loading initial project', e)
      }
    }
    await Promise.all(promises)
  }, [record, loadInitialEmployeeOptions, loadInitialDealOptions, loadInitialProjectOptions, form])

  useEffect(() => {
    if (record) {
      initialValuesLoader()
    }
  }, [record, initialValuesLoader])

  // Generate commission period options (last 6 months and next 2 months)
  const periodOptions = useMemo(() => {
    const options = []
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    for (let i = -6; i <= 2; i++) {
      let m = currentMonth + i
      let y = currentYear
      if (m <= 0) {
        m += 12
        y -= 1
      } else if (m > 12) {
        m -= 12
        y += 1
      }
      const val = `${String(m).padStart(2, '0')}/${y}`
      options.push({
        value: val,
        label: `Tháng ${m}/${y}`,
      })
    }
    return options
  }, [])

  const onSubmit = useCallback(
    async (values: CommissionAdvanceFormValues) => {
      try {
        const totalRequested = values.recipient_lines.reduce(
          (sum, line) => sum + (line.requested_amount || 0),
          0
        )

        // Validate unique recipient (nhân viên hoặc CTV)
        const recipientKeys = values.recipient_lines.map((line) =>
          line.recipient_employee
            ? `emp_${line.recipient_employee}`
            : `col_${line.recipient_collaborator}`
        )
        if (new Set(recipientKeys).size !== recipientKeys.length) {
          toastService.error('Không được chọn trùng người thụ hưởng')
          return
        }
        const [monthStr, yearStr] = values.commission_period.split('/')
        const month = Number(monthStr)
        const year = Number(yearStr)

        const payload = {
          // requester = nhân viên đầu tiên trong danh sách (dòng CTV không làm requester)
          requester_employee:
            values.recipient_lines.find((line) => line.recipient_employee)?.recipient_employee ??
            null,
          deal: values.deal || null,
          requested_amount: String(totalRequested),
          request_reason: values.request_reason || '',
          period_month: month,
          period_year: year,
          recipient_lines: values.recipient_lines.map((line) => ({
            recipient_employee: line.recipient_employee ?? null,
            recipient_collaborator: line.recipient_collaborator ?? null,
            requested_amount: String(line.requested_amount),
          })),
        }

        if (isEdit && id) {
          // Rework edit (only reachable while the advance is REJECTED): PATCH, and send only the
          // fields the backend still accepts. `deal` / `requester_employee` / `period_*` identify
          // WHICH advance this is and are read-only on update — sending them is silently ignored
          // at best, and used to be the hole that let a PATCH repoint an advance to another deal.
          await partialUpdateMutation.mutateAsync({
            id,
            data: {
              requested_amount: payload.requested_amount,
              request_reason: payload.request_reason,
              recipient_lines: payload.recipient_lines,
            },
          })
          toastService.success('Cập nhật đề xuất tạm ứng thành công')
          if (onSuccess) {
            onSuccess()
          } else {
            navigate(APP_PATH.COMMISSION_ADVANCE_DETAIL.replace(':id', id.toString()))
          }
        } else {
          const res = await createMutation.mutateAsync(payload)
          toastService.success('Tạo đề xuất tạm ứng thành công')
          if (onSuccess) {
            onSuccess()
          } else {
            const newId = res?.id
            if (newId) {
              navigate(APP_PATH.COMMISSION_ADVANCE_DETAIL.replace(':id', newId.toString()))
            } else {
              navigate(APP_PATH.COMMISSION_ADVANCE)
            }
          }
        }
      } catch (err) {
        toastService.error(handleApiError(err))
      }
    },
    [isEdit, id, createMutation, partialUpdateMutation, navigate, onSuccess, setError]
  )

  const isLoading = isEdit && isLoadingRecord

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">Đang tải thông tin đề xuất...</div>
    )
  }

  return (
    <FormProvider {...form}>
      <Form<CommissionAdvanceFormValues>
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        loading={isSubmitting}
        className="flex flex-col gap-6"
      >
        {/* SECTION 1: THÔNG TIN GIAO DỊCH */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin giao dịch</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Dự án */}
            <FormController
              register={register}
              control={control}
              name="project"
              Field={Select}
              fieldProps={{
                label: 'Dự án',
                placeholder: 'Chọn dự án',
                loadOptions: loadProjectOptions,
                loadInitialOptions: loadInitialProjectOptions,
                enableSearch: true,
              }}
            />

            {/* Mã căn */}
            <FormController
              register={register}
              control={control}
              name="deal"
              Field={Select}
              fieldProps={{
                id: 'deal',
                label: 'Mã căn',
                placeholder: 'Chọn mã căn',
                loadOptions: loadDealOptions,
                loadInitialOptions: loadInitialDealOptions,
                enableSearch: true,
                required: true,
              }}
            />

            {/* Kỳ kế toán */}
            <FormController
              register={register}
              control={control}
              name="commission_period"
              Field={Select}
              fieldProps={{
                label: 'Kỳ kế toán',
                placeholder: 'Chọn kỳ kế toán',
                options: periodOptions,
                required: true,
              }}
            />
          </div>
        </div>

        <SeparatorHorizontal />

        {/* SECTION 2: DANH SÁCH NHÂN VIÊN THỤ HƯỞNG */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="typo-body-xl-semibold text-content-dark-1">
              Nhân viên thụ hưởng & Số tiền tạm ứng
            </h2>
            <p className="text-content-dark-3 text-xs">
              Thuế suất tạm tính chỉ dùng để ước tính thực nhận sau thuế của người thụ hưởng. Thuế
              TNCN thực tế được tính lại khi tổng kết hoa hồng tháng, và số đã tạm ứng được trừ vào
              thu nhập sau thuế của kỳ tổng kết.
            </p>
          </div>

          <div className="border-border-1 overflow-x-auto rounded-md border">
            <Table.Root>
              <Table.Header>
                <Table.Row className="bg-neutral-30">
                  <Table.ColumnHeaderCell className="border-border-1 w-[50px] border-r px-3 py-3 text-center">
                    <span className="typo-body-base-medium text-[#4B4B4B]">#</span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 min-w-[220px] border-r px-3 py-3">
                    <span className="typo-body-base-medium text-[#4B4B4B]">
                      Nhân viên thụ hưởng
                    </span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 min-w-[140px] border-r px-3 py-3">
                    <span className="typo-body-base-medium text-[#4B4B4B]">Thuế suất tạm tính</span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 min-w-[160px] border-r px-3 py-3 text-right">
                    <span className="typo-body-base-medium text-[#4B4B4B]">
                      Ước tính thực nhận (VNĐ)
                    </span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 min-w-[160px] border-r px-3 py-3 text-right">
                    <span className="typo-body-base-medium text-[#4B4B4B]">
                      Số tiền tối đa (VNĐ)
                    </span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 min-w-[160px] border-r px-3 py-3 text-right">
                    <span className="typo-body-base-medium text-[#4B4B4B]">
                      Số tiền tạm ứng (VNĐ)
                    </span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="w-[60px] px-3 py-3 text-center" />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {fields.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={7} className="py-8 text-center text-gray-400">
                      Chưa có nhân viên thụ hưởng nào. Nhấn "Thêm nhân viên thụ hưởng" để bắt đầu.
                    </Table.Cell>
                  </Table.Row>
                )}
                {fields.map((fieldItem, index) => {
                  const currentLine = recipientLinesValue[index]
                  const matchedShare = findShareForRecipient(
                    splitShares?.commission_shares,
                    currentLine
                  )
                  const taxRate = Number(
                    currentLine?.tax_estimate_rate ?? DEFAULT_TAX_ESTIMATE_RATE
                  )
                  const grossShare = Number(matchedShare?.calculated_amount || 0)
                  // Trần tạm ứng theo rule BE — KHÔNG phụ thuộc thuế suất tạm tính.
                  const effectiveMaxNet = matchedShare
                    ? advanceCapForShare(grossShare, !!currentLine?.recipient_employee)
                    : currentLine?.max_net_amount
                  // Ước tính thực nhận sau thuế của share (tham khảo, thuế thật tính cuối kỳ).
                  // Cùng hàm với dialog kế toán duyệt để hai màn không bao giờ ra số khác nhau.
                  const estimatedNet = matchedShare
                    ? estimateNetAfterTax(grossShare, taxRate)
                    : undefined

                  return (
                    <Table.Row key={fieldItem.id} className="hover:bg-neutral-10">
                      {/* STT */}
                      <Table.Cell className="border-border-1 w-[50px] border-r px-3 py-2 text-center align-middle">
                        <span className="typo-body-sm-medium text-content-dark-3">{index + 1}</span>
                      </Table.Cell>

                      {/* Người thụ hưởng */}
                      <Table.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                        {currentLine?.recipient_collaborator ? (
                          <div className="flex min-h-[44px] flex-col justify-center px-3">
                            <span className="typo-body-sm-medium text-content-dark-1">
                              {currentLine?.recipient_label ||
                                `CTV #${currentLine?.recipient_collaborator}`}
                            </span>
                            <span className="text-content-dark-3 text-xs">CTV / người-nhận-hộ</span>
                          </div>
                        ) : (
                          <Controller
                            name={`recipient_lines.${index}.recipient_employee`}
                            control={control}
                            render={({ field: lineField, fieldState }) => (
                              <Select
                                disabled={!selectedDealId}
                                placeholder={
                                  selectedDealId
                                    ? 'Chọn nhân viên'
                                    : 'Vui lòng chọn giao dịch trước'
                                }
                                options={selectedDealId ? dealEmployeeOptions : []}
                                loadInitialOptions={loadInitialEmployeeOptions}
                                enableSearch
                                clearable
                                value={lineField.value ?? null}
                                onChange={(next) => {
                                  const raw = Array.isArray(next) ? next[0] : next
                                  const empId = raw ? Number(raw) : null
                                  lineField.onChange(empId)
                                  if (empId && splitShares?.commission_shares) {
                                    const share = splitShares.commission_shares.find(
                                      (s) => s.employee?.id === empId && isEmployeeShare(s)
                                    )
                                    if (share) {
                                      const gross = Number(share.calculated_amount || 0)
                                      const newMaxNet = advanceCapForShare(gross, true)
                                      form.setValue(
                                        `recipient_lines.${index}.max_net_amount`,
                                        newMaxNet
                                      )
                                      const curReq =
                                        form.getValues(
                                          `recipient_lines.${index}.requested_amount`
                                        ) || 0
                                      if (curReq > newMaxNet) {
                                        form.setValue(
                                          `recipient_lines.${index}.requested_amount`,
                                          newMaxNet
                                        )
                                      }
                                    } else {
                                      form.setValue(
                                        `recipient_lines.${index}.max_net_amount`,
                                        undefined
                                      )
                                    }
                                  } else {
                                    form.setValue(
                                      `recipient_lines.${index}.max_net_amount`,
                                      undefined
                                    )
                                  }
                                }}
                                error={fieldState.error?.message}
                                className="h-full min-h-[44px] w-full !rounded-none !border-transparent !bg-transparent outline-none ring-inset hover:ring-1 focus:ring-1 focus:ring-neutral-100"
                                wrapperClassName="h-full w-full !gap-0"
                              />
                            )}
                          />
                        )}
                      </Table.Cell>

                      {/* Thuế suất tạm tính (%) — chỉ để ước tính thực nhận, không đổi trần */}
                      <Table.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                        <Controller
                          name={`recipient_lines.${index}.tax_estimate_rate`}
                          control={control}
                          render={({ field: taxField }) => (
                            <Select
                              placeholder="Chọn thuế suất"
                              options={TAX_ESTIMATE_RATE_OPTIONS}
                              value={
                                taxField.value !== undefined && taxField.value !== null
                                  ? String(taxField.value)
                                  : String(DEFAULT_TAX_ESTIMATE_RATE)
                              }
                              onChange={(next) => {
                                const raw = Array.isArray(next) ? next[0] : next
                                taxField.onChange(
                                  raw !== null && raw !== undefined
                                    ? Number(raw)
                                    : DEFAULT_TAX_ESTIMATE_RATE
                                )
                              }}
                              className="h-full min-h-[44px] w-full !rounded-none !border-transparent !bg-transparent outline-none ring-inset hover:ring-1 focus:ring-1 focus:ring-neutral-100"
                              wrapperClassName="h-full w-full !gap-0"
                            />
                          )}
                        />
                      </Table.Cell>

                      {/* Ước tính thực nhận sau thuế (tham khảo) */}
                      <Table.Cell className="border-border-1 border-r bg-white px-3 py-3 text-right align-middle">
                        <span className="typo-body-sm-medium text-content-dark-3">
                          {estimatedNet !== undefined ? formatCurrencyVND(estimatedNet) : '—'}
                        </span>
                      </Table.Cell>

                      {/* Số tiền tối đa (VNĐ) */}
                      <Table.Cell className="border-border-1 border-r bg-white px-3 py-3 text-right align-middle">
                        <span className="typo-body-sm-medium text-content-dark-1">
                          {effectiveMaxNet !== undefined && effectiveMaxNet !== null
                            ? formatCurrencyVND(effectiveMaxNet)
                            : '—'}
                        </span>
                      </Table.Cell>

                      {/* Requested amount */}
                      <Table.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                        <Controller
                          name={`recipient_lines.${index}.requested_amount`}
                          control={control}
                          render={({ field: lineField, fieldState }) => (
                            <div className="flex h-full w-full flex-col justify-between">
                              <FullCellNumberInput
                                className="h-full min-h-[44px] w-full border-none bg-transparent px-3 text-right ring-0 outline-none focus:ring-0"
                                suffix="VNĐ"
                                value={(lineField.value as number) ?? 0}
                                min={0}
                                max={
                                  effectiveMaxNet !== undefined && effectiveMaxNet !== null
                                    ? effectiveMaxNet
                                    : undefined
                                }
                                isHideSuffix
                                isError={!!fieldState.error}
                                onChange={(e) => {
                                  const rawVal =
                                    e.target.value === ''
                                      ? 0
                                      : Number(e.target.value.replace(/\D/g, ''))
                                  const cappedVal =
                                    effectiveMaxNet !== undefined &&
                                    effectiveMaxNet !== null &&
                                    effectiveMaxNet >= 0
                                      ? Math.min(rawVal, effectiveMaxNet)
                                      : rawVal

                                  lineField.onChange(cappedVal)
                                  if (effectiveMaxNet !== undefined && effectiveMaxNet !== null) {
                                    form.setValue(
                                      `recipient_lines.${index}.max_net_amount`,
                                      effectiveMaxNet
                                    )
                                  }
                                }}
                                variant="editable"
                              />
                              {fieldState.error?.message && (
                                <span className="px-3 pb-1 text-right text-xs font-medium text-red-500">
                                  {fieldState.error.message}
                                </span>
                              )}
                            </div>
                          )}
                        />
                      </Table.Cell>

                      {/* Delete action button */}
                      <Table.Cell className="w-[60px] px-3 py-2 text-center align-middle">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-data-red-default hover:text-data-red-hover mx-auto flex items-center justify-center transition-colors"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  )
                })}

                {/* Summary footer */}
                {fields.length > 0 && (
                  <Table.Row className="bg-neutral-30">
                    <Table.Cell
                      colSpan={4}
                      className="border-border-1 border-r px-3 py-2 text-right"
                    >
                      <span className="typo-body-base-semibold text-content-dark-1">Tổng cộng</span>
                    </Table.Cell>
                    <Table.Cell className="border-border-1 border-r px-3 py-2 text-right">
                      <span className="typo-body-base-semibold text-content-dark-1">
                        {totalMaxAdvance > 0 ? `${formatCurrencyVND(totalMaxAdvance)} ₫` : '—'}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="border-border-1 border-r px-3 py-2 text-right">
                      <span className="typo-body-base-semibold text-content-dark-1">
                        {formatCurrencyVND(totalRequested)} ₫
                      </span>
                    </Table.Cell>
                    <Table.Cell />
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>

            <div className="border-border-1 border-t bg-white p-3">
              <button
                type="button"
                onClick={() =>
                  append({
                    recipient_employee: null,
                    recipient_collaborator: null,
                    tax_estimate_rate: 10,
                    requested_amount: 0,
                  })
                }
                className="border-action-primary-blue-default bg-neutral-10 text-action-primary-blue-default hover:bg-neutral-20 hover:text-action-primary-blue-hover flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2.5 text-sm font-medium transition-colors"
              >
                <IconPlus className="h-4 w-4" />
                Thêm nhân viên thụ hưởng
              </button>
            </div>
          </div>

          {form.formState.errors.recipient_lines &&
            !Array.isArray(form.formState.errors.recipient_lines) && (
              <span className="text-sm font-medium text-red-500">
                {(form.formState.errors.recipient_lines as any).message}
              </span>
            )}
        </div>

        <SeparatorHorizontal />

        {/* SECTION 2: LÝ DO & PHÊ DUYỆT */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4">
            {/* Lý do / Ghi chú */}
            <FormController
              register={register}
              control={control}
              name="request_reason"
              Field={TextArea}
              fieldProps={{
                label: 'Lý do yêu cầu',
                placeholder: 'Nhập lý do tạm ứng...',
                rows: 4,
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(APP_PATH.COMMISSION_ADVANCE)}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            Lưu
          </Button>
        </div>
      </Form>
    </FormProvider>
  )
}
