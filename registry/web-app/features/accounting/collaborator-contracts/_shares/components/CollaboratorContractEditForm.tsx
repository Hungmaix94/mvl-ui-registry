import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, isValid } from 'date-fns'
import { Flex } from '@radix-ui/themes'

import { IconFiletext, IconPercent, IconUsers } from '@/assets/icons'
import { Button, CurrencyInput, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import DetailRow from '@/components/commons/DetailRow'
import { FullScreenLoading } from '@/components/Loading.tsx'

import { useAbility } from '@/lib/ability.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { formatCurrencyVND, formatPercent } from '@/utils/common'

import {
  useCollaboratorContract,
  usePartialUpdateCollaboratorContract,
  type PatchedCollaboratorContractRequest,
} from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service'
import ContractSectionCard from '@/features/accounting/collaborator-contracts/_shares/components/ContractSectionCard'
import ContractStatusChip from '@/features/accounting/collaborator-contracts/_shares/components/ContractStatusChip'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

import {
  collaboratorContractEditSchema,
  type CollaboratorContractEditValues,
  ContractStatus,
  CtvLineType,
  canEditStatus,
  canEditAttachment,
  canEditCommission,
} from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'

type CollaboratorContractEditFormProps = {
  contractId: number
}

// Payload may carry a `files` map alongside the patch fields (multipart upload
// token). Typed explicitly to avoid an `as` cast.
type ContractPatchPayload = PatchedCollaboratorContractRequest & {
  files?: Record<string, string>
}

const formatDateValue = (value?: string | null): string => {
  if (!value) return '-'
  try {
    const d = parseISO(value)
    if (!isValid(d)) return '-'
    return format(d, DATE_FORMAT)
  } catch {
    return '-'
  }
}

const amountValue = (value?: string | null): string =>
  value && Number(value) ? `${formatCurrencyVND(value)} đ` : '-'

// `pct_commission` (và các tỷ lệ cùng nhóm) là numeric(14,10) — trần 3 chữ số thập phân mặc
// định của `formatPercent` sẽ cắt mất phần thập phân thật.
const percentValue = (value?: string | null): string =>
  value && Number(value) ? formatPercent(value, false, 10) : '-'

/** Normalises a percent/amount input value into an API decimal string. */
const toApiDecimal = (value: string | number | null | undefined): string | null => {
  if (value === '' || value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (Number.isNaN(num)) return null
  return String(num)
}

const CollaboratorContractEditForm = ({ contractId }: CollaboratorContractEditFormProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { data: contract, isLoading } = useCollaboratorContract(contractId)
  const partialUpdate = usePartialUpdateCollaboratorContract()
  const invalidateQueries = useInvalidateQueries()
  const { displayConfirm, setLoading } = useDialog()
  const [fileToken, setFileToken] = useState<string>('')

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.CTV_LINE_TYPE_CHOICES,
    ],
  })
  const statusLabels = keysMap.get(APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.STATUS_CHOICES) as
    | Record<string, string>
    | undefined
  const lineTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.SALES.COLLABORATOR_CONTRACT.CTV_LINE_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const ctvLineTypeOptions = useMemo(() => {
    return Object.values(CtvLineType).map((value) => ({
      value,
      label: lineTypeLabels?.[value] ?? value,
    }))
  }, [lineTypeLabels])

  const form = useForm<CollaboratorContractEditValues>({
    resolver: zodResolver(collaboratorContractEditSchema),
    mode: 'onTouched',
    defaultValues: {
      status: undefined,
      attachment: undefined,
      contract_number: '',
      signed_date: '',
      pct_commission: '',
      fixed_amount: '',
      pct_line_bonus: '',
      amt_supplementary_fee: '',
      pct_supplementary_fee: '',
      ctv_line_type: undefined,
      note: '',
    },
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, dirtyFields },
  } = form

  useEffect(() => {
    if (contract) {
      reset({
        status: contract.status,
        attachment: contract.attachment ?? undefined,
        contract_number: contract.contract_number ?? '',
        signed_date: contract.signed_date ?? '',
        pct_commission: contract.pct_commission ?? '',
        fixed_amount: contract.fixed_amount ?? '',
        pct_line_bonus: contract.pct_line_bonus ?? '',
        amt_supplementary_fee: contract.amt_supplementary_fee ?? '',
        pct_supplementary_fee: contract.pct_supplementary_fee ?? '',
        ctv_line_type: contract.ctv_line_type,
        note: contract.note ?? '',
      })
    }
  }, [contract, reset])

  const status = contract?.status
  // The PATCH endpoint requires `collaborator_contract.partial_update`; fall
  // back to `update` so users with either capability can edit.
  const hasEditPermission =
    ability.can('partial_update', 'collaborator_contract') ||
    ability.can('update', 'collaborator_contract')
  const commissionEditable = hasEditPermission && canEditCommission(status)
  const statusEditable = hasEditPermission && canEditStatus(status)
  const attachmentEditable = hasEditPermission && canEditAttachment(status)

  const statusOptions = useMemo(() => {
    if (statusEditable) {
      return [
        { value: ContractStatus.signed, label: statusLabels?.[ContractStatus.signed] ?? 'Đã ký' },
        {
          value: ContractStatus.cancelled,
          label: statusLabels?.[ContractStatus.cancelled] ?? 'Đã huỷ',
        },
      ]
    }
    if (status) {
      return [{ value: status, label: statusLabels?.[status] ?? status }]
    }
    return []
  }, [statusEditable, status, statusLabels])

  const handleFileChange = useCallback((token: string) => {
    setFileToken(token)
  }, [])

  const handleCancel = useCallback(() => {
    navigate(APP_PATH.COLLABORATOR_CONTRACT_DETAIL.replace(':id', String(contractId)))
  }, [navigate, contractId])

  const doSubmit = useCallback(
    async (payload: ContractPatchPayload) => {
      try {
        await partialUpdate.mutateAsync({ id: contractId, data: payload })
        await invalidateQueries.invalidateByPrefix('sales/collaborator-contracts')
        toastService.success('Cập nhật hợp đồng thành công')
        navigate(APP_PATH.COLLABORATOR_CONTRACT_DETAIL.replace(':id', String(contractId)))
      } catch (error) {
        handleApiError(error, form.setError)
      }
    },
    [contractId, partialUpdate, invalidateQueries, navigate, form]
  )

  const onSubmit = useCallback(
    async (data: CollaboratorContractEditValues) => {
      const payload: ContractPatchPayload = {}

      if (commissionEditable) {
        if (dirtyFields.contract_number) {
          payload.contract_number = data.contract_number ?? ''
        }
        if (dirtyFields.signed_date) {
          payload.signed_date = data.signed_date ? formatDateToApi(data.signed_date) : null
        }
        if (dirtyFields.pct_commission) {
          const value = toApiDecimal(data.pct_commission)
          if (value !== null) payload.pct_commission = value
        }
        if (dirtyFields.fixed_amount) {
          payload.fixed_amount = toApiDecimal(data.fixed_amount)
        }
        if (dirtyFields.pct_line_bonus) {
          payload.pct_line_bonus = toApiDecimal(data.pct_line_bonus)
        }
        if (dirtyFields.amt_supplementary_fee) {
          payload.amt_supplementary_fee = toApiDecimal(data.amt_supplementary_fee)
        }
        if (dirtyFields.pct_supplementary_fee) {
          payload.pct_supplementary_fee = toApiDecimal(data.pct_supplementary_fee)
        }
        if (dirtyFields.ctv_line_type && data.ctv_line_type) {
          payload.ctv_line_type = data.ctv_line_type
        }
        if (dirtyFields.note) {
          payload.note = data.note ?? ''
        }
      }

      if (statusEditable && data.status && data.status !== contract?.status) {
        payload.status = data.status
      }

      if (attachmentEditable && fileToken) {
        payload.files = { attachment: fileToken }
      }

      if (Object.keys(payload).length === 0) {
        toastService.info('Không có thay đổi để lưu')
        return
      }

      if (contract?.status === ContractStatus.signed) {
        displayConfirm({
          title: 'Xác nhận lưu thay đổi',
          content: (
            <div className="text-content-dark-2">
              Hợp đồng này đã được ban hành (ở trạng thái <b>Đã ký</b>). Việc chỉnh sửa các thông số
              hoa hồng/thưởng có thể ảnh hưởng đến các số liệu đối chiếu đã tính toán liên quan.
              <br />
              Bạn có chắc chắn muốn lưu các thay đổi này không?
            </div>
          ),
          confirmText: 'Lưu thay đổi',
          cancelText: 'Huỷ',
          size: 'xl',
          onConfirm: async () => {
            try {
              setLoading(true)
              await doSubmit(payload)
            } finally {
              setLoading(false)
            }
          },
        })
      } else {
        await doSubmit(payload)
      }
    },
    [
      commissionEditable,
      statusEditable,
      attachmentEditable,
      dirtyFields,
      contract?.status,
      fileToken,
      displayConfirm,
      setLoading,
      doSubmit,
    ]
  )

  if (isLoading) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="typo-body-base-regular text-content-dark-3">Không tìm thấy hợp đồng</p>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Quay lại
        </Button>
      </div>
    )
  }

  const collaboratorDetail = contract.collaborator_detail
  const employeeDetail = contract.ctv_line_employee_detail
  const departmentDetail = contract.ctv_line_department_detail

  const lockHint = !commissionEditable
    ? 'Hợp đồng đã khoá — chỉ chỉnh sửa được khi ở trạng thái Bản nháp.'
    : undefined

  return (
    <Form handleSubmit={handleSubmit} onSubmit={onSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="5" className="w-full">
        {/* Cộng tác viên (read-only — API does not allow changing the CTV) */}
        <ContractSectionCard
          title="Cộng tác viên"
          description="Không thể đổi cộng tác viên sau khi hợp đồng đã tạo"
          icon={<IconUsers className="h-5 w-5" />}
          accent="blue"
          action={<ContractStatusChip status={contract.status} size="large" />}
        >
          <DetailRow label="Mã HĐ" value={contract.code || '-'} />
          <DetailRow
            label="Cộng tác viên"
            value={
              collaboratorDetail
                ? `${collaboratorDetail.name || '-'}${
                    collaboratorDetail.code ? ` (${collaboratorDetail.code})` : ''
                  }`
                : '-'
            }
          />
          {commissionEditable ? (
            <div className="pt-3">
              <FormController
                register={register}
                name="signed_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày ký',
                  allowManualInput: true,
                  clearable: true,
                  placeholder: 'DD/MM/YYYY',
                  value: parseDateFromApi(watch('signed_date') ?? ''),
                  onChange: (val: string | null | undefined) =>
                    setValue('signed_date', formatDateToApi(val ?? undefined), {
                      shouldValidate: true,
                      shouldDirty: true,
                    }),
                }}
              />
            </div>
          ) : (
            <DetailRow
              label="Ngày ký"
              value={formatDateValue(contract.signed_date)}
              hideBottomBorder
            />
          )}
        </ContractSectionCard>

        {/* Hoa hồng & Thưởng */}
        <ContractSectionCard
          title="Hoa hồng & Thưởng"
          description={lockHint ?? 'Tỉ lệ hoa hồng và các khoản thưởng cho cộng tác viên'}
          icon={<IconPercent className="h-5 w-5" />}
          accent="emerald"
          bodyClassName="py-4"
        >
          {commissionEditable ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormController
                register={register}
                name="pct_commission"
                control={control}
                Field={TextField}
                fieldProps={{ label: '% Hoa hồng', placeholder: '0', suffix: '%' }}
              />
              <FormController
                register={register}
                name="fixed_amount"
                control={control}
                Field={CurrencyInput}
                fieldProps={{ label: 'Số tiền cố định', placeholder: '0' }}
              />
              <FormController
                register={register}
                name="pct_line_bonus"
                control={control}
                Field={TextField}
                fieldProps={{ label: '% Thưởng line', placeholder: '0', suffix: '%' }}
              />
              <FormController
                register={register}
                name="amt_supplementary_fee"
                control={control}
                Field={CurrencyInput}
                fieldProps={{ label: 'Phí tăng thêm', placeholder: '0' }}
              />
              <FormController
                register={register}
                name="pct_supplementary_fee"
                control={control}
                Field={TextField}
                fieldProps={{ label: '% Phí tăng thêm', placeholder: '0', suffix: '%' }}
              />
            </div>
          ) : (
            <>
              <DetailRow label="% Hoa hồng" value={percentValue(contract.pct_commission)} />
              <DetailRow label="Số tiền cố định" value={amountValue(contract.fixed_amount)} />
              <DetailRow label="% Thưởng line" value={percentValue(contract.pct_line_bonus)} />
              <DetailRow
                label="Phí tăng thêm"
                value={amountValue(contract.amt_supplementary_fee)}
              />
              <DetailRow
                label="% Phí tăng thêm"
                value={percentValue(contract.pct_supplementary_fee)}
                hideBottomBorder
              />
            </>
          )}
        </ContractSectionCard>

        {/* Tuyến CTV (Line) */}
        <ContractSectionCard
          title="Tuyến CTV (Line)"
          description={lockHint ?? 'Tuyến giới thiệu cộng tác viên'}
          icon={<IconUsers className="h-5 w-5" />}
          accent="violet"
          bodyClassName="py-4"
        >
          {commissionEditable ? (
            <FormController
              register={register}
              name="ctv_line_type"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại line',
                placeholder: 'Chọn loại line',
                options: ctvLineTypeOptions,
                isClearable: true,
              }}
            />
          ) : (
            <DetailRow
              label="Loại line"
              value={
                contract.ctv_line_type
                  ? (lineTypeLabels?.[contract.ctv_line_type] ?? contract.ctv_line_type)
                  : '-'
              }
            />
          )}
          <DetailRow
            label="Nhân viên line"
            value={
              employeeDetail?.fullname
                ? `${employeeDetail.fullname}${
                    employeeDetail.code ? ` (${employeeDetail.code})` : ''
                  }`
                : '-'
            }
          />
          <DetailRow label="Chức vụ" value={employeeDetail?.position?.name || '-'} />
          <DetailRow label="Chi nhánh" value={employeeDetail?.branch?.name || '-'} />
          <DetailRow label="Khối" value={employeeDetail?.block?.name || '-'} />
          <DetailRow
            label="Phòng ban line"
            value={departmentDetail?.name || employeeDetail?.department?.name || '-'}
            hideBottomBorder
          />
        </ContractSectionCard>

        {/* Thông tin & Cập nhật */}
        <ContractSectionCard
          title="Thông tin & Cập nhật"
          description="Số hợp đồng, trạng thái, ghi chú và tệp đính kèm"
          icon={<IconFiletext className="h-5 w-5" />}
          accent="slate"
          bodyClassName="py-4"
        >
          <div className="flex flex-col gap-4">
            {commissionEditable ? (
              <FormController
                register={register}
                name="contract_number"
                control={control}
                Field={TextField}
                fieldProps={{ label: 'Số HĐ', placeholder: 'Nhập số hợp đồng' }}
              />
            ) : (
              <DetailRow label="Số HĐ" value={contract.contract_number || '-'} hideBottomBorder />
            )}

            <FormController
              register={register}
              name="status"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái',
                options: statusOptions,
                disabled: !statusEditable,
                placeholder: 'Chọn trạng thái',
                hint: !statusEditable
                  ? 'Chỉ có thể đổi trạng thái khi đang ở Bản nháp.'
                  : 'Chuyển sang Đã ký hoặc Đã huỷ. Không thể quay lại Bản nháp.',
              }}
            />

            {commissionEditable ? (
              <FormController
                register={register}
                name="note"
                control={control}
                Field={TextArea}
                fieldProps={{ label: 'Ghi chú', placeholder: 'Nhập ghi chú', rows: 3 }}
              />
            ) : (
              <DetailRow label="Ghi chú" value={contract.note || '-'} hideBottomBorder />
            )}

            <FileUpload
              onChange={handleFileChange}
              className="w-full"
              existingFile={
                contract.attachment
                  ? ({ file_path: contract.attachment, file_name: 'Tệp đính kèm' } as any)
                  : undefined
              }
              disabled={!attachmentEditable}
              required={false}
              hiddenDescription
            />
          </div>
        </ContractSectionCard>

        {/* Action Buttons */}
        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || !hasEditPermission}
            className="w-[150px]"
          >
            Lưu
          </Button>
        </div>
      </Flex>
    </Form>
  )
}

export default CollaboratorContractEditForm
