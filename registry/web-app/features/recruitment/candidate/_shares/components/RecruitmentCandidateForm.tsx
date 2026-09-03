import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Control, Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, CurrencyInput, RadioGroup, Select, TextArea, TextField } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import {
  type CheckDuplicateInputRequest,
  type CheckDuplicateResponse,
  type PatchedRecruitmentCandidateRequest,
  type RecruitmentCandidate,
  type RecruitmentCandidateRequest,
  useCreateRecruitmentCandidate,
  useUpdateRecruitmentCandidate,
  usePartialUpdateRecruitmentCandidate,
  useCheckRecruitmentCandidateDuplicateQuiet,
} from '@/features/recruitment/services/recruitment-candidate-service'
import { useRecruitmentRequest } from '@/features/recruitment/services/recruitment-request-service'
import {
  type RecruitmentCandidateFormData,
  getRecruitmentCandidateSchema,
} from '@/features/recruitment/candidate/_shares/schemas'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { extractErrorMessage, handleApiError } from '@/utils/error-utils.ts'
import toastService from '@/services/toast-service.tsx'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { PAGE_SIZE } from '@/constants/table.ts'
import { useRecruitmentRequestSelect } from '@/hooks/useRecruitmentRequestSelect.ts'
import { useRecruitmentSourceSelect } from '@/hooks/useRecruitmentSourceSelect.ts'
import { useRecruitmentChannelSelect } from '@/hooks/useRecruitmentChannelSelect.ts'
import { Flex } from '@radix-ui/themes'
import { cn, createOptions } from '@/utils'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parseCurrencyVND } from '@/utils/common.ts'
import { useDialog } from '@/hooks/useDialog.ts'
import { useNationalities } from '@/services/common-service'
import { useProvinces, type Province } from '@/services/province-service'
import { getEthnicitySelectOptions } from '@/utils/ethnicity-options'
import { resolvePlaceOfBirthToOptionValue } from '@/utils/place-of-birth-utils'
import ReferrerFormField from '@/features/recruitment/candidate/_shares/components/referrer/ReferrerFormField.tsx'
import ContactPersonFormField from '@/features/recruitment/candidate/_shares/components/contact-person/ContactPersonFormField.tsx'
import ReturnFromEmployeeDialog from '@/features/recruitment/candidate/_shares/components/ReturnFromEmployeeDialog.tsx'
import RecruitmentDuplicateMatchDialog from '@/features/recruitment/candidate/_shares/components/RecruitmentDuplicateMatchDialog.tsx'
import RecruitmentCandidateAvatarUpload from '@/features/recruitment/candidate/_shares/components/RecruitmentCandidateAvatarUpload.tsx'
import { useAbility } from '@/lib/ability.ts'
import {
  mapCheckDuplicateResponse,
  isDuplicateCaseBlockingSubmit,
  parseIsReturnCandidate,
  buildReturnEmployeePreviewFromCheckDuplicate,
} from '@/features/recruitment/candidate/_shares/utils/recruitment-candidate-duplicate.ts'
import { CheckDuplicateResponseStatus } from '@/api/schema.ts'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { ContractNet_percentage } from '@/api/schema.ts'
import {
  CMND_IMAGE_ACCEPT,
  MAX_PROFILE_ATTACHMENTS,
  PROFILE_ATTACHMENTS_ACCEPT,
  PRESIGN_PURPOSE_RECRUITMENT_CANDIDATE_ATTACHMENTS,
} from '@/features/hrm/_shares/file-upload-constraints.ts'
import {
  buildProfileAttachmentsWriteParts,
  initialProfileAttachmentFieldValue,
} from '@/features/hrm/_shares/profile-attachments-payload.ts'
import {
  buildCitizenIdFilesWriteParts,
  initialCitizenIdFilesFieldValue,
  MAX_CITIZEN_ID_FILES,
} from '@/features/hrm/_shares/citizen-id-files-payload.ts'
import {
  RecruitmentCandidateStatus,
  EmployeeGender,
  EmployeeMaritalStatus,
} from '@/constants/api-schema-aliases'

const NET_PERCENTAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: String(ContractNet_percentage.Value100), label: '100%' },
  { value: String(ContractNet_percentage.Value85), label: '85%' },
]

type NetPercentageRadioGroupProps = {
  id: string
  label: string
  disabled: boolean
  options: Array<{ value: string; label: string }>
  value?: ContractNet_percentage | null
  onChange?: (value: ContractNet_percentage) => void
  error?: string
  required?: boolean
}

function NetPercentageRadioGroup({
  value,
  onChange,
  options,
  ...props
}: NetPercentageRadioGroupProps) {
  const stringValue = value != null ? String(value) : undefined
  return (
    <RadioGroup
      {...props}
      value={stringValue}
      onChange={(next) => {
        if (next === '' || next == null) return
        const parsed = Number(next)
        if (
          !Number.isFinite(parsed) ||
          (parsed !== ContractNet_percentage.Value100 && parsed !== ContractNet_percentage.Value85)
        )
          return
        onChange?.(parsed as ContractNet_percentage)
      }}
      options={options}
    />
  )
}

const RECRUITMENT_CANDIDATE_MAX_FILE_SIZE = 20 * 1024 * 1024

function parseSalaryStringToOptionalNumber(value: string | null | undefined): number | undefined {
  if (value == null || String(value).trim() === '') return undefined
  const n = parseCurrencyVND(String(value))
  return Number.isFinite(n) ? n : undefined
}

type BaseProps = {
  onSuccess?: () => void
  onCancel?: () => void
}

type CreateModeProps = BaseProps & {
  mode: 'create'
  candidate?: never
}

type EditModeProps = BaseProps & {
  mode: 'edit'
  candidate: RecruitmentCandidate
}

type RecruitmentCandidateFormProps = CreateModeProps | EditModeProps

type RecruitmentCandidateWithRelations = RecruitmentCandidate & {
  referrer?: {
    id?: number | null
    code?: string | null
    fullname?: string | null
    department?: { name?: string | null } | null
  } | null
  contact_person?: {
    id?: number | null
    code?: string | null
    fullname?: string | null
    department?: { name?: string | null } | null
  } | null
  nationality?: { id?: number | null } | null
  citizen_id_files?: Array<{
    id?: number | null
  }> | null
  referrer_id?: number | null
  contact_person_id?: number | null
  nationality_id?: number | null
}

export default function RecruitmentCandidateForm({
  mode,
  candidate,
  onSuccess,
  onCancel,
}: RecruitmentCandidateFormProps) {
  const navigate = useNavigate()
  const createMutation = useCreateRecruitmentCandidate()
  const updateMutation = useUpdateRecruitmentCandidate()
  const partialUpdateMutation = usePartialUpdateRecruitmentCandidate()
  const invalidateQueries = useInvalidateQueries()
  const dialog = useDialog()
  const citizenIdFileTokensRef = useRef<string[]>([])
  const avatarTokenRef = useRef<string | undefined>(undefined)
  const previousStatusRef = useRef<RecruitmentCandidateStatus | null>(null)
  const isFirstStatusTransitionEffect = useRef(true)

  const mutation = mode === 'create' ? createMutation : updateMutation

  const isReturnCandidate =
    mode === 'edit' && candidate ? parseIsReturnCandidate(candidate.is_return_candidate) : false

  const schema = useMemo(
    () => getRecruitmentCandidateSchema(mode, { isReturnCandidate }),
    [mode, isReturnCandidate]
  )

  const form = useForm<RecruitmentCandidateFormData, any, RecruitmentCandidateFormData>({
    resolver: zodResolver(schema) as any,
    mode: 'onTouched',
    defaultValues: {
      submitted_date: new Date(),
      status: RecruitmentCandidateStatus.CONTACTED,
      employee_type: null,
      years_of_experience: undefined,
      onboard_date: null,
      note: '',
      referrer_id: null,
      referrer_display: null,
      contact_person_id: null,
      contact_person_display: null,
      date_of_birth: mode === 'create' ? undefined : new Date(),
      gender: EmployeeGender.MALE,
      place_of_birth: '',
      citizen_id_issued_date: mode === 'create' ? undefined : new Date(),
      citizen_id_issued_place: '',
      emergency_contact_phone: '',
      citizen_id_files_ids: [],
      profile_attachments: [],
      nationality_id: undefined,
      ethnicity: '',
      religion: '',
      marital_status: EmployeeMaritalStatus.SINGLE,
      tax_code: '',
      residential_address: '',
      permanent_address: '',
      policy_start_date: null,
      policy_end_date: null,
      base_salary: undefined,
      base_salary_percentage: ContractNet_percentage.Value100,
      keep_seniority: null,
      branch_id: undefined,
      block_id: undefined,
      department_id: undefined,
      job_title: '',
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { isSubmitting, errors },
  } = form

  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false)
  const [duplicateSubmitBlocked, setDuplicateSubmitBlocked] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnEmployeeId, setReturnEmployeeId] = useState<number | null>(null)
  const [returnPreview, setReturnPreview] = useState<ReturnType<
    typeof buildReturnEmployeePreviewFromCheckDuplicate
  > | null>(null)
  const skipReturnDialogCloseBlockRef = useRef(false)

  const isEmployeeCreated = mode === 'edit' && candidate?.is_employee_created === true

  const ability = useAbility()
  const canViewEmployeeDetail = ability.can('retrieve', 'employee')
  const canViewCandidateDetail = ability.can('retrieve', 'recruitment_candidate')

  const [duplicateMatchOpen, setDuplicateMatchOpen] = useState(false)
  const [duplicateMatchState, setDuplicateMatchState] = useState<{
    kind: 'employee' | 'candidate'
    response: CheckDuplicateResponse
  } | null>(null)

  const checkDuplicateQuiet = useCheckRecruitmentCandidateDuplicateQuiet()

  // Watch for recruitment request changes
  const watchRecruitmentRequestId = watch('recruitment_request_id')
  const watchStatus = watch('status')
  const watchJobTitle = watch('job_title')
  const watchBaseSalaryPct = watch('base_salary_percentage')
  const watchPhone = watch('phone')
  const watchCitizenId = watch('citizen_id')

  useEffect(() => {
    setDuplicateSubmitBlocked(false)
  }, [watchPhone, watchCitizenId])

  const runDuplicateCheck = useCallback(
    async (field: 'phone' | 'citizen_id') => {
      const phone = getValues('phone') ?? ''
      const citizenId = getValues('citizen_id') ?? ''
      if (field === 'phone' && phone.length !== 10) {
        return
      }
      if (field === 'citizen_id' && citizenId.length < 9) return

      setIsDuplicateChecking(true)
      setDuplicateSubmitBlocked(false)
      clearErrors('phone')
      clearErrors('citizen_id')

      try {
        const body: CheckDuplicateInputRequest = {
          phone: field === 'phone' ? phone : '',
          citizen_id: field === 'citizen_id' ? citizenId : '',
          exclude_candidate_id: mode === 'edit' ? (candidate?.id ?? null) : null,
        }
        const checkResponse = await checkDuplicateQuiet.mutateAsync(body)
        if (checkResponse == null) return
        const parsed = mapCheckDuplicateResponse(checkResponse)

        if (parsed.case === CheckDuplicateResponseStatus.no_match) {
          return
        }

        if (isDuplicateCaseBlockingSubmit(parsed.case)) {
          setDuplicateSubmitBlocked(true)
          const msg =
            parsed.message ??
            (parsed.case === CheckDuplicateResponseStatus.candidate_match
              ? 'Thông tin trùng với ứng viên đã có. Vui lòng đổi số điện thoại hoặc CMND/CCCD.'
              : 'Đã tồn tại nhân viên đang làm việc với thông tin này.')
          setDuplicateMatchState({
            kind:
              parsed.case === CheckDuplicateResponseStatus.candidate_match
                ? 'candidate'
                : 'employee',
            response: parsed.response,
          })
          setDuplicateMatchOpen(true)
          setError(field, { type: 'duplicate', message: msg })
          return
        }

        if (
          parsed.case === CheckDuplicateResponseStatus.resigned_employee_match &&
          parsed.employeeId != null
        ) {
          setDuplicateSubmitBlocked(true)
          dialog.displayConfirm({
            title: 'Nhân viên đã nghỉ việc',
            content: (
              <span className="typo-body-base-regular text-content-dark-1">
                {parsed.message ??
                  'Đã tồn tại nhân viên đã nghỉ việc với thông tin này. Bạn có muốn tạo hồ sơ nhân viên quay lại làm việc không?'}
              </span>
            ),
            confirmText: 'Tiếp tục',
            cancelText: 'Hủy',
            onConfirm: () => {
              setReturnEmployeeId(parsed.employeeId!)
              setReturnPreview(buildReturnEmployeePreviewFromCheckDuplicate(parsed.response))
              setReturnDialogOpen(true)
            },
            onCancel: () => {
              setDuplicateSubmitBlocked(true)
              setError(field, {
                type: 'duplicate',
                message: 'Vui lòng đổi số điện thoại hoặc CMND/CCCD.',
              })
            },
          })
        }
      } catch (error: unknown) {
        toastService.error(extractErrorMessage(error, 'Không kiểm tra được trùng lặp'))
      } finally {
        setIsDuplicateChecking(false)
      }
    },
    [getValues, clearErrors, mode, candidate, checkDuplicateQuiet, setError, dialog]
  )

  // For edit mode, determine which recruitment request ID to load
  const requestIdToLoad =
    mode === 'edit'
      ? watchRecruitmentRequestId && watchRecruitmentRequestId > 0
        ? watchRecruitmentRequestId
        : candidate?.recruitment_request?.id || 0
      : watchRecruitmentRequestId || 0

  // Fetch recruitment request details when ID changes
  const { data: recruitmentRequest } = useRecruitmentRequest(requestIdToLoad)

  // Dropdown: load on scroll + search (Đề nghị tuyển dụng)
  const { loadRecruitmentRequestOptions, loadInitialRecruitmentRequestOptions } =
    useRecruitmentRequestSelect({ pageSize: PAGE_SIZE })

  // Dropdown: load on scroll + search (Nguồn/Kênh tuyển dụng)
  const { loadRecruitmentSourceOptions, loadInitialRecruitmentSourceOptions } =
    useRecruitmentSourceSelect({ pageSize: PAGE_SIZE, excludeCodes: ['RETURN'] })

  const { loadRecruitmentChannelOptions, loadInitialRecruitmentChannelOptions } =
    useRecruitmentChannelSelect({ pageSize: PAGE_SIZE })

  const { data: nationalitiesResponse } = useNationalities()
  const nationalityOptions = useMemo(
    () => createOptions(nationalitiesResponse || []),
    [nationalitiesResponse]
  )
  const { data: provincesResponse, isLoading: provincesLoading } = useProvinces({
    // level: ProvinceLevel.province,
  })
  const provinceOptions = useMemo(() => {
    const list: Province[] = Array.isArray(provincesResponse)
      ? provincesResponse
      : ((provincesResponse as { results?: Province[] } | undefined)?.results ?? [])
    return list.map((p) => ({ label: p.name, value: p.name }))
  }, [provincesResponse])
  const ethnicityOptions = useMemo(() => getEthnicitySelectOptions(), [])

  // Resolve place_of_birth to option value when saved value differs (e.g. "Hà Nội" -> "Thành phố Hà Nội")
  const watchedPlaceOfBirth = watch('place_of_birth')
  useEffect(() => {
    if (provinceOptions.length === 0) return
    const saved =
      watchedPlaceOfBirth != null && watchedPlaceOfBirth !== ''
        ? String(watchedPlaceOfBirth).trim()
        : undefined
    if (!saved) return
    const optionValues = provinceOptions.map((o) => String(o.value))
    if (optionValues.includes(saved)) return
    const resolved = resolvePlaceOfBirthToOptionValue(saved, optionValues)
    if (resolved) setValue('place_of_birth', resolved, { shouldDirty: false })
  }, [provinceOptions, watchedPlaceOfBirth, setValue])

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS,
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES,
      APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.YEARS_OF_EXPERIENCE,
      APP_CONSTANT_KEY.EMPLOYEE.GENDER,
      APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS,
    ],
  })

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.STATUS) || []
      : []
  }, [keysMapOptions])

  const yearsOfExperienceOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.YEARS_OF_EXPERIENCE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.YEARS_OF_EXPERIENCE) || []
      : []
  }, [keysMapOptions])
  const employeeTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES)
      ? keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.CANDIDATE.EMPLOYEE_TYPE_CHOICES) || []
      : []
  }, [keysMapOptions])
  useEffect(() => {
    console.log(keysMapOptions)
  }, [keysMapOptions])

  const genderOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.GENDER) || [],
    [keysMapOptions]
  )
  const maritalStatusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS) || [],
    [keysMapOptions]
  )

  // Populate form with candidate data in edit mode
  useEffect(() => {
    if (mode === 'edit' && candidate && statusOptions.length > 0) {
      const extendedCandidate = candidate as RecruitmentCandidateWithRelations
      const contactPerson = extendedCandidate.contact_person ?? null
      const isReturn = parseIsReturnCandidate(candidate.is_return_candidate)
      const baseSalaryPct =
        candidate.base_salary_percentage == null || candidate.base_salary_percentage === ''
          ? undefined
          : isNaN(Number(candidate.base_salary_percentage))
            ? undefined
            : Number(candidate.base_salary_percentage)
      form.reset({
        name: candidate.name || '',
        citizen_id: candidate.citizen_id || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        recruitment_request_id: isReturn
          ? (candidate.recruitment_request?.id ?? undefined)
          : candidate.recruitment_request?.id || 0,
        recruitment_source_id: isReturn
          ? (candidate.recruitment_source?.id ?? undefined)
          : candidate.recruitment_source?.id || 0,
        recruitment_channel_id: isReturn
          ? (candidate.recruitment_channel?.id ?? undefined)
          : candidate.recruitment_channel?.id || 0,
        employee_type: candidate.employee_type ?? null,
        years_of_experience: candidate.years_of_experience || undefined,
        submitted_date: candidate.submitted_date ? new Date(candidate.submitted_date) : new Date(),
        status: (candidate.colored_status?.value as any) || RecruitmentCandidateStatus.CONTACTED,
        onboard_date: candidate.onboard_date ? new Date(candidate.onboard_date) : null,
        note: candidate.note || '',
        referrer_id: extendedCandidate.referrer?.id ?? extendedCandidate.referrer_id ?? null,
        referrer_display: extendedCandidate.referrer
          ? {
              code: extendedCandidate.referrer?.code ?? '',
              fullname: extendedCandidate.referrer?.fullname ?? '',
              department_name: extendedCandidate.referrer?.department?.name ?? '',
            }
          : null,
        contact_person_id: contactPerson?.id ?? extendedCandidate.contact_person_id ?? null,
        contact_person_display: contactPerson
          ? {
              code: contactPerson?.code ?? '',
              fullname: contactPerson?.fullname ?? '',
              department_name: contactPerson?.department?.name ?? '',
            }
          : null,
        date_of_birth: candidate.date_of_birth ? new Date(candidate.date_of_birth) : new Date(),
        gender: candidate.gender ?? EmployeeGender.MALE,
        place_of_birth: candidate.place_of_birth ?? '',
        citizen_id_issued_date: candidate.citizen_id_issued_date
          ? new Date(candidate.citizen_id_issued_date)
          : new Date(),
        citizen_id_issued_place: candidate.citizen_id_issued_place ?? '',
        emergency_contact_phone: candidate.emergency_contact_phone ?? '',
        citizen_id_files_ids: initialCitizenIdFilesFieldValue(candidate.citizen_id_files),
        profile_attachments: initialProfileAttachmentFieldValue(candidate.attachments),
        nationality_id:
          extendedCandidate.nationality?.id ?? extendedCandidate.nationality_id ?? undefined,
        ethnicity: candidate.ethnicity ?? '',
        religion: candidate.religion ?? '',
        marital_status: candidate.marital_status ?? null,
        tax_code: candidate.tax_code ?? '',
        residential_address: candidate.residential_address ?? '',
        permanent_address: candidate.permanent_address ?? '',
        policy_start_date: candidate.policy_start_date
          ? new Date(candidate.policy_start_date)
          : null,
        policy_end_date: candidate.policy_end_date ? new Date(candidate.policy_end_date) : null,
        base_salary: parseSalaryStringToOptionalNumber(candidate.base_salary),
        base_salary_percentage: baseSalaryPct,
        branch_id: candidate.branch?.id ?? undefined,
        block_id: candidate.block?.id ?? undefined,
        department_id: candidate.department?.id ?? undefined,
        keep_seniority:
          candidate.keep_seniority === true
            ? 'yes'
            : candidate.keep_seniority === false
              ? 'no'
              : null,
        job_title: candidate.job_title ?? '',
      })
    }
  }, [mode, candidate, statusOptions, form])

  useEffect(() => {
    const hired = RecruitmentCandidateStatus.HIRED
    if (isFirstStatusTransitionEffect.current) {
      isFirstStatusTransitionEffect.current = false
      previousStatusRef.current = watchStatus
      return
    }
    if (previousStatusRef.current === hired && watchStatus !== hired) {
      setValue('employee_type', null)
      setValue('policy_start_date', null)
      setValue('policy_end_date', null)
      setValue('base_salary', undefined)
      setValue('base_salary_percentage', undefined)
      setValue('job_title', '')
    }
    previousStatusRef.current = watchStatus
  }, [watchStatus, setValue])

  useEffect(() => {
    const hired = RecruitmentCandidateStatus.HIRED
    if (watchStatus !== hired) return

    const titleFromPosition = recruitmentRequest?.job_description?.title?.trim()
    if (!titleFromPosition) return

    const currentJobTitle = (watchJobTitle || '').trim()
    if (currentJobTitle === '') {
      setValue('job_title', titleFromPosition, { shouldDirty: true, shouldValidate: true })
    }

    if (!watchBaseSalaryPct) {
      setValue('base_salary_percentage', ContractNet_percentage.Value100, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [watchStatus, watchJobTitle, recruitmentRequest?.job_description?.title, setValue])

  /** PATCH body for return candidates: không gửi recruitment_request / source / channel (BE giữ nguyên). */
  const buildReturnCandidatePatchPayload = useCallback(
    (
      data: RecruitmentCandidateFormData,
      forceSave: boolean
    ): PatchedRecruitmentCandidateRequest => {
      const isHired = data.status === RecruitmentCandidateStatus.HIRED
      const baseSalaryNum = data.base_salary
      const baseSalaryPercentageNum = data.base_salary_percentage
      return {
        name: data.name,
        citizen_id: data.citizen_id || '',
        email: data.email,
        phone: data.phone,
        branch_id: data.branch_id ?? null,
        block_id: data.block_id ?? null,
        department_id: data.department_id ?? null,
        employee_type: isHired ? (data.employee_type ?? null) : null,
        years_of_experience: data.years_of_experience,
        submitted_date: formatDateToApi(data.submitted_date),
        status: data.status,
        note: data.note || '',
        onboard_date: isHired && data.onboard_date ? formatDateToApi(data.onboard_date) : null,
        force_save: forceSave,
        contact_person_id: data.contact_person_id ?? null,
        referrer_id: data.referrer_id ?? null,
        date_of_birth: formatDateToApi(data.date_of_birth),
        gender: data.gender,
        place_of_birth: data.place_of_birth || '',
        citizen_id_issued_date: formatDateToApi(data.citizen_id_issued_date),
        citizen_id_issued_place: data.citizen_id_issued_place || undefined,
        emergency_contact_phone: data.emergency_contact_phone || null,
        nationality_id: data.nationality_id ?? null,
        ethnicity: data.ethnicity || null,
        religion: data.religion || null,
        marital_status: data.marital_status ?? null,
        tax_code: data.tax_code || null,
        residential_address: data.residential_address || null,
        permanent_address: data.permanent_address || null,
        policy_start_date:
          isHired && data.policy_start_date ? formatDateToApi(data.policy_start_date) : null,
        policy_end_date:
          isHired && data.policy_end_date ? formatDateToApi(data.policy_end_date) : null,
        base_salary:
          isHired && baseSalaryNum != null && !Number.isNaN(baseSalaryNum)
            ? String(baseSalaryNum)
            : null,
        base_salary_percentage:
          isHired && baseSalaryPercentageNum != null && !Number.isNaN(baseSalaryPercentageNum)
            ? String(baseSalaryPercentageNum)
            : null,
        keep_seniority:
          data.keep_seniority === 'yes' ? true : data.keep_seniority === 'no' ? false : null,
        job_title: isHired ? data.job_title?.trim() || undefined : undefined,
      }
    },
    []
  )

  const buildFinalPatchPayload = useCallback(
    (
      data: RecruitmentCandidateFormData,
      basePatch: PatchedRecruitmentCandidateRequest
    ): PatchedRecruitmentCandidateRequest => {
      const avatarToken = avatarTokenRef.current
      const attParts = buildProfileAttachmentsWriteParts(
        data.profile_attachments,
        true,
        candidate?.attachments?.map((a) => a.id)
      )
      const cmndParts = buildCitizenIdFilesWriteParts(
        data.citizen_id_files_ids,
        true,
        candidate?.citizen_id_files?.map((f) => f.id)
      )

      const filesMerged: NonNullable<PatchedRecruitmentCandidateRequest['files']> = {
        ...(cmndParts.files?.citizen_id_files?.length
          ? { citizen_id_files: cmndParts.files.citizen_id_files }
          : {}),
        ...(avatarToken ? { avatar: avatarToken } : {}),
        ...(attParts.files?.attachments?.length ? { attachments: attParts.files.attachments } : {}),
      }

      const existingFilesMerged: NonNullable<PatchedRecruitmentCandidateRequest['existing_files']> =
        {}
      if (cmndParts.existing_files) {
        existingFilesMerged.citizen_id_files = cmndParts.existing_files.citizen_id_files
      }
      if (attParts.existing_files) {
        existingFilesMerged.attachments = attParts.existing_files.attachments
      }

      return {
        ...basePatch,
        ...(Object.keys(filesMerged).length > 0 ? { files: filesMerged } : {}),
        ...(Object.keys(existingFilesMerged).length > 0
          ? { existing_files: existingFilesMerged }
          : {}),
      }
    },
    [candidate]
  )

  // Helper function to build payload (full PUT — không dùng cho ứng viên quay lại; họ dùng PATCH)
  const buildPayload = useCallback(
    (
      data: RecruitmentCandidateFormData,
      forceSave: boolean = false
    ): RecruitmentCandidateRequest => {
      const isHired = data.status === RecruitmentCandidateStatus.HIRED
      const baseSalaryNum = data.base_salary
      const baseSalaryPercentageNum = data.base_salary_percentage

      return {
        name: data.name,
        citizen_id: data.citizen_id || '',
        email: data.email,
        phone: data.phone,
        recruitment_request_id: data.recruitment_request_id ?? 0,
        recruitment_source_id: data.recruitment_source_id ?? 0,
        recruitment_channel_id: data.recruitment_channel_id ?? 0,
        employee_type: isHired ? (data.employee_type ?? null) : null,
        years_of_experience: data.years_of_experience,
        submitted_date: formatDateToApi(data.submitted_date),
        status: data.status,
        note: data.note || '',
        onboard_date: isHired && data.onboard_date ? formatDateToApi(data.onboard_date) : null,
        force_save: forceSave,
        contact_person_id: data.contact_person_id ?? null,
        referrer_id: data.referrer_id ?? null,
        date_of_birth: formatDateToApi(data.date_of_birth),
        gender: data.gender,
        place_of_birth: data.place_of_birth || '',
        citizen_id_issued_date: formatDateToApi(data.citizen_id_issued_date),
        citizen_id_issued_place: data.citizen_id_issued_place || undefined,
        emergency_contact_phone: data.emergency_contact_phone || null,
        nationality_id: data.nationality_id ?? null,
        ethnicity: data.ethnicity || null,
        religion: data.religion || null,
        marital_status: data.marital_status ?? null,
        tax_code: data.tax_code || null,
        residential_address: data.residential_address || null,
        permanent_address: data.permanent_address || null,
        policy_start_date:
          isHired && data.policy_start_date ? formatDateToApi(data.policy_start_date) : null,
        policy_end_date:
          isHired && data.policy_end_date ? formatDateToApi(data.policy_end_date) : null,
        base_salary:
          isHired && baseSalaryNum != null && !Number.isNaN(baseSalaryNum)
            ? String(baseSalaryNum)
            : null,
        base_salary_percentage:
          isHired && baseSalaryPercentageNum != null && !Number.isNaN(baseSalaryPercentageNum)
            ? String(baseSalaryPercentageNum)
            : null,
        keep_seniority:
          data.keep_seniority === 'yes' ? true : data.keep_seniority === 'no' ? false : null,
        job_title: isHired ? data.job_title?.trim() || undefined : undefined,
      }
    },
    []
  )

  // Build final request with files.citizen_id_files (tokens) support; used by onSubmit and submitWithForceSave
  const buildFinalRequestPayload = useCallback(
    (
      data: RecruitmentCandidateFormData,
      basePayload: RecruitmentCandidateRequest
    ): RecruitmentCandidateRequest => {
      const avatarToken = avatarTokenRef.current

      const attParts = buildProfileAttachmentsWriteParts(
        data.profile_attachments,
        mode === 'edit',
        mode === 'edit' ? candidate?.attachments?.map((a) => a.id) : undefined
      )

      // For create mode, merge any leftover ref tokens (uploaded but not yet reflected in form value)
      const formValue = data.citizen_id_files_ids
      const fallbackTokens =
        mode === 'create' ? citizenIdFileTokensRef.current.filter((t) => t !== '') : []
      const mergedFormValue: (string | number)[] | undefined = (() => {
        const base = Array.isArray(formValue) ? [...formValue] : []
        const baseTokens = base.filter((v): v is string => typeof v === 'string' && v !== '')
        const missing = fallbackTokens.filter((t) => !baseTokens.includes(t))
        return [...base, ...missing]
      })()

      const cmndParts = buildCitizenIdFilesWriteParts(
        mergedFormValue,
        mode === 'edit',
        mode === 'edit' ? candidate?.citizen_id_files?.map((f) => f.id) : undefined
      )

      const filesMerged: NonNullable<RecruitmentCandidateRequest['files']> = {
        ...(cmndParts.files?.citizen_id_files?.length
          ? { citizen_id_files: cmndParts.files.citizen_id_files }
          : {}),
        ...(avatarToken ? { avatar: avatarToken } : {}),
        ...(attParts.files?.attachments?.length ? { attachments: attParts.files.attachments } : {}),
      }

      const existingFilesMerged: NonNullable<RecruitmentCandidateRequest['existing_files']> = {}
      if (cmndParts.existing_files) {
        existingFilesMerged.citizen_id_files = cmndParts.existing_files.citizen_id_files
      }
      if (attParts.existing_files) {
        existingFilesMerged.attachments = attParts.existing_files.attachments
      }

      return {
        ...basePayload,
        ...(cmndParts.citizen_id_files_ids
          ? { citizen_id_files_ids: cmndParts.citizen_id_files_ids }
          : {}),
        ...(Object.keys(filesMerged).length > 0 ? { files: filesMerged } : {}),
        ...(mode === 'edit' && Object.keys(existingFilesMerged).length > 0
          ? { existing_files: existingFilesMerged }
          : {}),
      }
    },
    [mode, candidate]
  )

  // Helper function to submit with force_save
  const submitWithForceSave = useCallback(
    async (data: RecruitmentCandidateFormData) => {
      if (mode === 'edit' && candidate && parseIsReturnCandidate(candidate.is_return_candidate)) {
        const patch = buildFinalPatchPayload(data, buildReturnCandidatePatchPayload(data, true))
        await partialUpdateMutation.mutateAsync({
          id: candidate.id,
          data: patch,
        })

        toastService.success('Cập nhật ứng viên thành công')
        await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')

        navigate(APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', candidate.id.toString()))
        return
      }

      const basePayload = buildPayload(data, true)
      const payload = buildFinalRequestPayload(data, basePayload)

      if (mode === 'create') {
        const response = await createMutation.mutateAsync(payload)

        toastService.success('Tạo ứng viên mới thành công!')
        await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')

        if (onSuccess) {
          onSuccess()
        } else {
          navigate(APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', String(response.id)))
        }
      } else {
        await updateMutation.mutateAsync({
          id: candidate!.id,
          data: payload,
        })

        toastService.success('Cập nhật ứng viên thành công')
        await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')

        navigate(APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', candidate!.id.toString()))
      }
    },
    [
      buildPayload,
      buildFinalRequestPayload,
      buildFinalPatchPayload,
      buildReturnCandidatePatchPayload,
      mode,
      candidate,
      createMutation,
      updateMutation,
      partialUpdateMutation,
      invalidateQueries,
      navigate,
      onSuccess,
    ]
  )

  // Helper function to handle phone conflict error
  const handlePhoneConflict = useCallback(
    (data: RecruitmentCandidateFormData, errorDetail: string) => {
      dialog.displayConfirm({
        title: 'Số điện thoại đã tồn tại',
        content: (
          <>
            <Flex direction={'column'}>
              <span>{errorDetail}</span>
              <span>Bạn có muốn tiếp tục tạo ứng viên với số điện thoại này không?</span>
            </Flex>
          </>
        ),
        confirmText: 'Tiếp tục',
        cancelText: 'Hủy',
        onConfirm: async () => {
          try {
            await submitWithForceSave(data)
          } catch (error: any) {
            console.error('Error force saving candidate:', error)
            const err = error as any
            const errorObj = err?.error || err?.server
            if (errorObj?.errors && Array.isArray(errorObj.errors)) {
              const referrerError = errorObj.errors.find((e: any) => e.attr === 'referrer_id')
              if (referrerError) toastService.error(referrerError.detail)
              const contactPersonError = errorObj.errors.find(
                (e: any) => e.attr === 'contact_person_id'
              )
              if (contactPersonError) toastService.error(contactPersonError.detail)
            }
            handleApiError(error, setError)
          }
        },
        onCancel: () => {
          // Set error on phone field first
          setError('phone', {
            type: 'phone_conflict',
            message: errorDetail,
          })

          // Scroll and focus phone field
          setTimeout(() => {
            // Try to find phone field by data-field-name first
            let phoneField = document.querySelector('[data-field-name="phone"]')

            if (!phoneField) {
              // Fallback: try to find phone input by name
              phoneField = document.querySelector('[name="phone"]')
            }

            if (phoneField) {
              phoneField.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              })

              setTimeout(() => {
                // Find the actual input element to focus
                const input = phoneField?.querySelector('input') as HTMLInputElement
                if (input) {
                  input.focus()
                } else if (phoneField instanceof HTMLElement) {
                  phoneField.focus()
                }
              }, 300)
            }
          }, 100)
        },
      })
    },
    [dialog, submitWithForceSave, setError]
  )

  const onSubmit = useCallback(
    async (data: RecruitmentCandidateFormData) => {
      if (duplicateSubmitBlocked) {
        toastService.error(
          'Vui lòng xử lý trùng thông tin (SĐT/CMND) hoặc hoàn tất luồng nhân viên quay lại trước khi lưu.'
        )
        return
      }
      try {
        if (mode === 'edit' && candidate && parseIsReturnCandidate(candidate.is_return_candidate)) {
          const patch = buildFinalPatchPayload(data, buildReturnCandidatePatchPayload(data, false))
          await partialUpdateMutation.mutateAsync({
            id: candidate.id,
            data: patch,
          })

          toastService.success('Cập nhật ứng viên thành công')
          await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')

          navigate(APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', candidate.id.toString()))
          return
        }

        const basePayload = buildPayload(data, false)
        const payload = buildFinalRequestPayload(data, basePayload)
        if (mode === 'create') {
          const response = await createMutation.mutateAsync(payload)

          toastService.success('Tạo ứng viên mới thành công!')
          await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')

          if (onSuccess) {
            onSuccess()
          } else {
            navigate(APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', String(response.id)))
          }
        } else {
          await updateMutation.mutateAsync({
            id: candidate!.id,
            data: payload,
          })

          toastService.success('Cập nhật ứng viên thành công')
          await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')

          navigate(APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', candidate!.id.toString()))
        }
      } catch (error: unknown) {
        console.error('Error submitting recruitment candidate:', error)

        // Check for special errors - need to extract error object
        const err = error as any
        const errorObj = err?.error || err?.server

        if (errorObj?.errors && Array.isArray(errorObj.errors)) {
          const phoneConflictError = errorObj.errors.find((e: any) => e.code === 'phone_conflict')

          if (phoneConflictError) {
            handlePhoneConflict(data, phoneConflictError.detail)
            return
          }

          // Show toasts for referrer_id and contact_person_id errors
          const referrerError = errorObj.errors.find((e: any) => e.attr === 'referrer_id')
          if (referrerError) {
            toastService.error(referrerError.detail)
          }

          const contactPersonError = errorObj.errors.find(
            (e: any) => e.attr === 'contact_person_id'
          )
          if (contactPersonError) {
            toastService.error(contactPersonError.detail)
          }
        }

        // Handle other errors (this will also set the form errors and scroll to the fields)
        handleApiError(error, setError)
      }
    },
    [
      buildPayload,
      buildFinalRequestPayload,
      buildFinalPatchPayload,
      buildReturnCandidatePatchPayload,
      mode,
      candidate,
      createMutation,
      updateMutation,
      partialUpdateMutation,
      invalidateQueries,
      navigate,
      onSuccess,
      setError,
      handlePhoneConflict,
      duplicateSubmitBlocked,
    ]
  )

  return (
    <>
      <Form
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        loading={isSubmitting || isDuplicateChecking}
      >
        <div className="relative">
          {isDuplicateChecking && (
            <FullScreenLoading className="absolute inset-0 z-10 h-auto min-h-[120px] rounded-md" />
          )}
          <Flex
            direction="column"
            gap="5"
            className={cn(
              'w-full px-10 py-4',
              isDuplicateChecking && 'pointer-events-none opacity-80'
            )}
          >
            <div className="space-y-6">
              {/* Code field - Only in edit mode */}
              {mode === 'edit' && candidate && (
                <TextField
                  label="Mã ứng viên"
                  value={candidate.code || ''}
                  disabled
                  maxLength={10}
                  showCharacterCount
                />
              )}

              {/* Candidate Name */}
              <FormController
                register={register}
                name="name"
                control={control as unknown as Control<RecruitmentCandidateFormData>}
                Field={TextField}
                fieldProps={{
                  label: 'Tên ứng viên',
                  required: true,
                  placeholder: 'Nhập họ tên ứng viên',
                  maxLength: 100,
                  showCharacterCount: true,
                }}
              />

              {/* CCCD, Email, Phone, Recruitment Request and Position  */}
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                <FormController
                  register={register}
                  name="date_of_birth"
                  control={control}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày sinh',
                    required: true,
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                    fromYear: 1926,
                  }}
                />
                <FormController
                  register={register}
                  name="place_of_birth"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={Select}
                  fieldProps={{
                    label: 'Nơi sinh',
                    required: true,
                    placeholder: provincesLoading ? 'Đang tải...' : 'Nhập/chọn nơi sinh',
                    options: provinceOptions,
                    enableSearch: true,
                    searchPlaceholder: 'Tìm kiếm tỉnh/thành phố...',
                    disabled: provincesLoading,
                    loading: provincesLoading,
                  }}
                />
                <FormController
                  register={register}
                  name="gender"
                  control={control}
                  Field={RadioGroup}
                  fieldProps={{
                    label: 'Giới tính',
                    required: true,
                    options: genderOptions,
                    orientation: 'horizontal',
                    className: 'items-start',
                  }}
                />

                <FormController
                  register={register}
                  name="phone"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Số điện thoại',
                    required: true,
                    placeholder: 'Nhập số điện thoại',
                    prefix: <span>+84</span>,
                    maxLength: 10,
                    showCharacterCount: true,
                    type: 'tel',
                    onBlur: () => {
                      void runDuplicateCheck('phone')
                    },
                  }}
                />
                <FormController
                  register={register}
                  name="email"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Email cá nhân',
                    required: true,
                    placeholder: 'Nhập email',
                    maxLength: 100,
                    showCharacterCount: true,
                  }}
                />
                <FormController
                  register={register}
                  name="marital_status"
                  control={control}
                  Field={Select}
                  fieldProps={{
                    label: 'Tình trạng hôn nhân',
                    placeholder: 'Chọn tình trạng hôn nhân',
                    options: maritalStatusOptions,
                    clearable: false,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
                <FormController
                  register={register}
                  name="citizen_id"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Số CMND/CCCD',
                    required: true,
                    placeholder: 'Nhập số CMND/CCCD',
                    maxLength: 12,
                    showCharacterCount: true,
                    onBlur: () => {
                      void runDuplicateCheck('citizen_id')
                    },
                  }}
                />
                <FormController
                  register={register}
                  name="tax_code"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Mã số thuế',
                    placeholder: 'Nhập mã số thuế',
                    maxLength: 50,
                  }}
                />
                <FormController
                  register={register}
                  name="citizen_id_issued_date"
                  control={control}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày cấp CMND/CCCD',
                    required: true,
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                  }}
                />
                <FormController
                  register={register}
                  name="citizen_id_issued_place"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Nơi cấp',
                    required: true,
                    placeholder: 'Nhập nơi cấp',
                    maxLength: 255,
                    showCharacterCount: true,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                <FormController
                  register={register}
                  name="residential_address"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Địa chỉ cư trú',
                    placeholder: 'Nhập địa chỉ cư trú',
                    maxCharacters: 500,
                    rows: 2,
                  }}
                />
                <FormController
                  register={register}
                  name="permanent_address"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Địa chỉ thường trú',
                    placeholder: 'Nhập địa chỉ thường trú',
                    maxCharacters: 500,
                    rows: 2,
                  }}
                />
                <FormController
                  register={register}
                  name="emergency_contact_phone"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Số điện thoại người thân liên hệ khi có sự cố',
                    placeholder: 'Nhập số điện thoại',
                    type: 'tel',
                    prefix: '+84',
                    maxLength: 10,
                    showCharacterCount: true,
                  }}
                />

                <FormController
                  register={register}
                  name="nationality_id"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={Select}
                  fieldProps={{
                    label: 'Quốc tịch',
                    placeholder: 'Chọn quốc tịch',
                    options: nationalityOptions,
                    searchable: true,
                  }}
                />
                <FormController
                  register={register}
                  name="religion"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={TextField}
                  fieldProps={{
                    label: 'Tôn giáo',
                    placeholder: 'Nhập tôn giáo',
                    maxLength: 100,
                    showCharacterCount: true,
                  }}
                />
                <FormController
                  register={register}
                  name="ethnicity"
                  control={control as unknown as Control<RecruitmentCandidateFormData>}
                  Field={Select}
                  fieldProps={{
                    label: 'Dân tộc',
                    placeholder: 'Nhập/chọn dân tộc',
                    options: ethnicityOptions,
                    enableSearch: true,
                    searchPlaceholder: 'Tìm kiếm dân tộc...',
                  }}
                />
              </div>

              <fieldset
                disabled={isReturnCandidate}
                className="flex min-w-0 flex-col gap-5 border-0 p-0"
              >
                <legend className="sr-only">
                  Thông tin tuyển dụng — không chỉnh sửa khi ứng viên quay lại làm việc
                </legend>
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                  <FormController
                    register={register}
                    name="recruitment_request_id"
                    control={control as unknown as Control<RecruitmentCandidateFormData>}
                    Field={Select}
                    fieldProps={{
                      label: 'Đề nghị tuyển dụng',
                      required: true,
                      placeholder: 'Nhập/chọn đề nghị tuyển dụng',
                      loadOptions: loadRecruitmentRequestOptions,
                      loadInitialOptions: loadInitialRecruitmentRequestOptions,
                      pageSize: PAGE_SIZE,
                      enableSearch: true,
                      searchPlaceholder: 'Tìm kiếm đề nghị tuyển dụng...',
                      disabled: isReturnCandidate,
                    }}
                    wrapperClassName={'col-span-1 md:col-span-2'}
                  />

                  <TextField
                    label="Vị trí ứng tuyển"
                    required
                    readOnly
                    disabled
                    value={recruitmentRequest?.job_description?.title || ''}
                    placeholder="Tự động điền từ đề nghị tuyển dụng"
                    className={'col-span-2 md:col-span-1'}
                  />
                </div>

                {/* Branch, Block, Department Row */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <TextField
                    label="Chi nhánh"
                    disabled
                    value={
                      recruitmentRequest?.branch?.name ||
                      (mode === 'edit' && candidate?.branch?.name) ||
                      ''
                    }
                    placeholder="Tự động điền từ đề nghị tuyển dụng"
                  />

                  <TextField
                    label="Khối"
                    disabled
                    value={
                      recruitmentRequest?.block?.name ||
                      (mode === 'edit' && candidate?.block?.name) ||
                      ''
                    }
                    placeholder="Tự động điền từ đề nghị tuyển dụng"
                  />

                  <TextField
                    label="Phòng ban"
                    disabled
                    value={
                      recruitmentRequest?.department?.name ||
                      (mode === 'edit' && candidate?.department?.name) ||
                      ''
                    }
                    placeholder="Tự động điền từ đề nghị tuyển dụng"
                  />
                </div>

                {/* Recruitment Source and Channel */}
                <div className="grid grid-cols-2 gap-5">
                  <FormController
                    register={register}
                    name="recruitment_source_id"
                    control={control as unknown as Control<RecruitmentCandidateFormData>}
                    Field={Select}
                    fieldProps={{
                      label: 'Nguồn tuyển dụng',
                      required: true,
                      placeholder: 'Chọn nguồn tuyển dụng',
                      loadOptions: loadRecruitmentSourceOptions,
                      loadInitialOptions: loadInitialRecruitmentSourceOptions,
                      pageSize: PAGE_SIZE,
                      enableSearch: true,
                      searchPlaceholder: 'Tìm kiếm nguồn tuyển dụng...',
                      disabled: isReturnCandidate,
                    }}
                  />

                  <FormController
                    register={register}
                    name="recruitment_channel_id"
                    control={control as unknown as Control<RecruitmentCandidateFormData>}
                    Field={Select}
                    fieldProps={{
                      label: 'Kênh tuyển dụng',
                      required: true,
                      placeholder: 'Chọn kênh tuyển dụng',
                      loadOptions: loadRecruitmentChannelOptions,
                      loadInitialOptions: loadInitialRecruitmentChannelOptions,
                      pageSize: PAGE_SIZE,
                      enableSearch: true,
                      searchPlaceholder: 'Tìm kiếm kênh tuyển dụng...',
                      disabled: isReturnCandidate,
                    }}
                  />
                </div>
              </fieldset>

              {/* Years of Experience and Application Date */}
              <div className="grid grid-cols-2 gap-5">
                <FormController
                  register={register}
                  name="submitted_date"
                  control={control}
                  Field={DatePicker}
                  fieldProps={{
                    label: 'Ngày nộp đơn',
                    required: true,
                    placeholder: 'DD/MM/YYYY',
                    allowManualInput: true,
                  }}
                />
                {/* Onboard Date - Conditional */}
                {watchStatus === RecruitmentCandidateStatus.HIRED && (
                  <FormController
                    register={register}
                    name="onboard_date"
                    control={control}
                    Field={DatePicker}
                    fieldProps={{
                      label: 'Thời gian nhận việc',
                      required: true,
                      placeholder: 'DD/MM/YYYY',
                    }}
                  />
                )}
              </div>

              <FormController
                register={register}
                name="status"
                control={control}
                Field={RadioGroup}
                fieldProps={{
                  id: 'status',
                  label: 'Trạng thái',
                  required: true,
                  options: statusOptions,
                  disabled: false,
                  className: 'gap-4',
                }}
              />

              {watchStatus === RecruitmentCandidateStatus.HIRED && (
                <div className="border-border-1 flex flex-col gap-5 rounded-md border border-solid p-4">
                  <h3 className="typo-body-xl-semibold text-content-dark-1">Đề xuất chính sách</h3>
                  <div
                    className={cn('grid gap-5', isReturnCandidate ? 'grid-cols-3' : 'grid-cols-2')}
                  >
                    <FormController
                      register={register}
                      name="employee_type"
                      control={control}
                      Field={Select}
                      fieldProps={{
                        label: 'Loại nhân viên',
                        placeholder: 'Chọn loại nhân viên',
                        options: employeeTypeOptions,
                        clearable: true,
                      }}
                    />
                    <FormController
                      register={register}
                      name="job_title"
                      control={control}
                      Field={TextField}
                      fieldProps={{
                        label: 'Chức vụ',
                        placeholder: 'Nhập chức vụ',
                        required: true,
                      }}
                    />
                    {isReturnCandidate && (
                      <>
                        <FormController
                          register={register}
                          name="keep_seniority"
                          control={control}
                          Field={RadioGroup}
                          fieldProps={{
                            id: 'keep_seniority',
                            label: 'Nối thâm niên',
                            options: [
                              { label: 'Có', value: 'yes' },
                              { label: 'Không', value: 'no' },
                            ],
                            disabled: isEmployeeCreated,
                          }}
                        />
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormController
                      register={register}
                      name="policy_start_date"
                      control={control}
                      Field={DatePicker}
                      fieldProps={{
                        label: 'Ngày bắt đầu trạng thái',
                        placeholder: 'DD/MM/YYYY',
                        allowManualInput: true,
                      }}
                    />
                    <FormController
                      register={register}
                      name="policy_end_date"
                      control={control}
                      Field={DatePicker}
                      fieldProps={{
                        label: 'Ngày kết thúc trạng thái',
                        placeholder: 'DD/MM/YYYY',
                        allowManualInput: true,
                      }}
                    />
                  </div>
                  {isReturnCandidate && (
                    <CascadeSelectGroupOrganization
                      showEmployee={false}
                      showPosition={false}
                      showBlock
                      showDepartment
                      branchRequired
                      blockRequired
                      departmentRequired
                      skipValidation
                      formErrors={errors}
                      initialValues={{
                        branch: candidate?.branch?.id ? String(candidate.branch.id) : undefined,
                        block: candidate?.block?.id ? String(candidate.block.id) : undefined,
                        department: candidate?.department?.id
                          ? String(candidate.department.id)
                          : undefined,
                      }}
                      onFormChange={(org) => {
                        setValue('branch_id', org.branch_id ?? 0, {
                          shouldDirty: true,
                          shouldValidate: false,
                        })
                        setValue('block_id', org.block_id ?? 0, {
                          shouldDirty: true,
                          shouldValidate: false,
                        })
                        setValue('department_id', org.department_id ?? 0, {
                          shouldDirty: true,
                          shouldValidate: false,
                        })
                      }}
                    />
                  )}
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormController
                      register={register}
                      name="base_salary"
                      control={control as unknown as Control<RecruitmentCandidateFormData>}
                      Field={CurrencyInput}
                      fieldProps={{
                        label: 'Mức lương cơ bản',
                        placeholder: 'Nhập mức lương cơ bản',
                      }}
                    />
                    <FormController
                      register={register}
                      name="base_salary_percentage"
                      control={control as unknown as Control<RecruitmentCandidateFormData>}
                      Field={NetPercentageRadioGroup}
                      fieldProps={{
                        label: 'Phầm trăm lương thực nhận trong thời gian thử việc',
                        id: 'candidate-base-salary-percentage',
                        disabled: false,
                        options: NET_PERCENTAGE_OPTIONS,
                      }}
                    />
                  </div>
                </div>
              )}

              <FormController
                register={register}
                name="years_of_experience"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Số năm kinh nghiệm',
                  required: true,
                  placeholder: 'Chọn số năm kinh nghiệm',
                  options: yearsOfExperienceOptions,
                }}
              />

              {/* Notes */}
              <FormController
                register={register}
                name="note"
                control={control}
                Field={TextArea}
                fieldProps={{
                  label: 'Ghi chú',
                  placeholder: 'Nhập ghi chú',
                  maxCharacters: 500,
                  rows: 4,
                }}
              />

              <div className={'grid grid-cols-12 gap-2'}>
                <div className="col-span-9 grid grid-cols-1 gap-5">
                  <Controller
                    name="citizen_id_files_ids"
                    control={control}
                    render={({ field, fieldState }) => {
                      const valueArray = Array.isArray(field.value)
                        ? (field.value as (string | number)[])
                        : []
                      const tokens = valueArray.filter(
                        (v): v is string => typeof v === 'string' && v !== ''
                      )
                      return (
                        <FileUpload
                          multiple
                          maxFiles={MAX_CITIZEN_ID_FILES}
                          multiTrackExistingIds
                          accept={[...CMND_IMAGE_ACCEPT]}
                          existingFiles={
                            mode === 'edit' && candidate?.citizen_id_files?.length
                              ? candidate.citizen_id_files
                              : undefined
                          }
                          value={tokens}
                          onChange={(newTokens: string | string[]) => {
                            const current = (getValues('citizen_id_files_ids') ?? []) as (
                              | string
                              | number
                            )[]
                            const keptIds = current.filter(
                              (v): v is number => typeof v === 'number' && Number.isFinite(v)
                            )
                            const tokensArr = Array.isArray(newTokens)
                              ? newTokens
                              : typeof newTokens === 'string' && newTokens !== ''
                                ? [newTokens]
                                : []
                            citizenIdFileTokensRef.current = tokensArr
                            // Cap tại MAX_CITIZEN_ID_FILES để chống race condition
                            // (existingFiles có thể đến sau khi user đã upload, làm form value vượt quá maxFiles).
                            field.onChange(
                              [...keptIds, ...tokensArr].slice(0, MAX_CITIZEN_ID_FILES)
                            )
                          }}
                          onKeptExistingIdsChange={(newKeptIds: number[]) => {
                            const current = (getValues('citizen_id_files_ids') ?? []) as (
                              | string
                              | number
                            )[]
                            const tokensFromForm = current.filter(
                              (v): v is string => typeof v === 'string' && v !== ''
                            )
                            field.onChange(
                              [...newKeptIds, ...tokensFromForm].slice(0, MAX_CITIZEN_ID_FILES)
                            )
                          }}
                          error={fieldState.error?.message}
                          label="Ảnh CMND/CCCD"
                          required={false}
                          largeImagePreview
                          maxSize={RECRUITMENT_CANDIDATE_MAX_FILE_SIZE}
                          purpose="recruitment_candidate.citizen_id_file"
                        />
                      )
                    }}
                  />
                </div>

                {/* Avatar upload */}
                <Flex
                  direction="column"
                  justify="start"
                  align="center"
                  gap="1"
                  className="col-span-3 w-full"
                >
                  <RecruitmentCandidateAvatarUpload
                    avatarUrl={
                      mode === 'edit'
                        ? (candidate as RecruitmentCandidate & { avatar?: { view_url?: string } })
                            ?.avatar?.view_url
                        : undefined
                    }
                    onTokenReady={(token) => {
                      avatarTokenRef.current = token
                    }}
                  />
                </Flex>
              </div>

              <div className="mt-6 flex max-w-full flex-col gap-3">
                <p className="typo-body-base-semibold text-content-dark-1">Tệp đính kèm</p>
                <p className="typo-body-sm-regular text-content-dark-3">
                  Tối đa {MAX_PROFILE_ATTACHMENTS} tệp (PDF, Word, Excel, CSV, ảnh JPG/PNG).
                </p>
                <Controller
                  name="profile_attachments"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FileUpload
                      hiddenLabel
                      required={false}
                      multiple
                      maxFiles={MAX_PROFILE_ATTACHMENTS}
                      multiTrackExistingIds
                      existingFiles={
                        mode === 'edit' && candidate?.attachments?.length
                          ? candidate.attachments
                          : undefined
                      }
                      value={field.value as (string | number)[] | undefined}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      accept={[...PROFILE_ATTACHMENTS_ACCEPT]}
                      purpose={PRESIGN_PURPOSE_RECRUITMENT_CANDIDATE_ATTACHMENTS}
                      hiddenDescription
                      maxSize={RECRUITMENT_CANDIDATE_MAX_FILE_SIZE}
                    />
                  )}
                />
              </div>
            </div>

            {/* Người giới thiệu - form-only, gửi khi Lưu */}
            <div className="border-border-1 border-t pt-6">
              <ReferrerFormField
                referrerId={watch('referrer_id') ?? null}
                referrerDisplay={watch('referrer_display') ?? null}
                onReferrerChange={(id, display) => {
                  form.setValue('referrer_id', id, { shouldDirty: true })
                  form.setValue('referrer_display', display, { shouldDirty: true })
                }}
              />
            </div>

            {/* Người liên hệ - form-only, gửi khi Lưu */}
            <div className="border-border-1 border-t pt-6">
              <ContactPersonFormField
                contactPersonId={watch('contact_person_id') ?? null}
                contactPersonDisplay={watch('contact_person_display') ?? null}
                onContactPersonChange={(id, display) => {
                  form.setValue('contact_person_id', id, { shouldDirty: true })
                  form.setValue('contact_person_display', display, { shouldDirty: true })
                }}
              />
            </div>

            {/* Action Buttons */}
            <Flex gap="4" align="center" justify="end" width="100%" mt="8">
              <Button
                type="button"
                variant="secondary"
                size="large"
                onClick={onCancel}
                disabled={mutation.isPending || isDuplicateChecking}
                className="w-[150px]"
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={mutation.isPending || isSubmitting || isDuplicateChecking}
                loading={isSubmitting || mutation.isPending || isDuplicateChecking}
                className="bg-action-primary-red-default hover:bg-action-primary-red-hover w-[150px] text-white"
              >
                Lưu
              </Button>
            </Flex>
          </Flex>
        </div>
      </Form>
      {duplicateMatchState != null && (
        <RecruitmentDuplicateMatchDialog
          open={duplicateMatchOpen}
          onOpenChange={(open) => {
            setDuplicateMatchOpen(open)
            if (!open) {
              setDuplicateMatchState(null)
            }
          }}
          kind={duplicateMatchState.kind}
          response={duplicateMatchState.response}
          canViewEmployeeDetail={canViewEmployeeDetail}
          canViewCandidateDetail={canViewCandidateDetail}
        />
      )}
      {returnEmployeeId != null && (
        <ReturnFromEmployeeDialog
          open={returnDialogOpen}
          onOpenChange={(open) => {
            setReturnDialogOpen(open)
            if (!open) {
              setReturnEmployeeId(null)
              setReturnPreview(null)
              if (!skipReturnDialogCloseBlockRef.current) {
                setDuplicateSubmitBlocked(true)
              }
              skipReturnDialogCloseBlockRef.current = false
            }
          }}
          employeeId={returnEmployeeId}
          preview={returnPreview ?? undefined}
          employeeTypeOptions={employeeTypeOptions}
          onSuccess={(candidateId) => {
            skipReturnDialogCloseBlockRef.current = true
            setDuplicateSubmitBlocked(false)
            setReturnEmployeeId(null)
            setReturnPreview(null)
            navigate(APP_PATH.RECRUITMENT_CANDIDATE_DETAIL.replace(':id', String(candidateId)))
          }}
        />
      )}
    </>
  )
}
