import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Controller,
  FormProvider,
  type Resolver,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'
import { Check } from 'lucide-react'

import { Button, Select, TextArea } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { Separator } from '@/components/ui/separator'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  createEmptyInvestorReconciliationSheetItem,
  hasInvestorReconciliationDetailUserData,
  investorReconciliationSheetCreateSchema,
  type InvestorReconciliationSheetCreateItemValues,
  type InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { mapSheetToFormValues } from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-adapter'
import type { InvestorReconciliationSheetWithItems } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'
import { useReconDealSelect } from '@/features/sales/_shared/reconciliation/useReconDealSelect'
import { ReconModeProvider } from '@/features/sales/_shared/reconciliation/ReconModeContext'
import useAppConstant from '@/hooks/useAppConstant'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useSourceExchangeSelect } from '@/hooks/useSourceExchangeSelect'
import { useScrollToError } from '@/hooks/useScrollToError'
import { useProject } from '@/services/realestate-service'
import toastService from '@/services/toast-service'
import { extractErrorMessage, handleApiError } from '@/utils/error-utils'
import { CTVReconciliationPeriod_type } from '@/api/schema'
import { ReconciliationSourceType } from '@/constants/api-schema-aliases'
import InvestorReconciliationFormTable from './InvestorReconciliationFormTable'
import InvestorReconciliationSheetTotal from './InvestorReconciliationSheetTotal'
import ReconSheetMetaView from '@/features/sales/_shared/reconciliation/ReconSheetMetaView'
import ReconImportExcelButton from '@/features/sales/_shared/reconciliation/ReconImportExcelButton'
import ReconAddCanMenu from '@/features/sales/_shared/reconciliation/ReconAddCanMenu'
import { reconDirtyKey } from '@/features/sales/_shared/reconciliation/recon-computed-display'
import type { ReconServerComputed } from '@/features/sales/_shared/reconciliation/useReconLineDerived'
import type { ReconCheck } from '@/features/sales/_shared/reconciliation/recon-server-check'
import { useReconKind } from '@/features/sales/_shared/reconciliation/ReconKindContext'
import { buildReconHistoryQuery } from '@/features/sales/_shared/reconciliation/recon-history-source'
import { summarizeReconHistory } from '@/features/sales/_shared/reconciliation/recon-history-summary'
import { useReconDeductionConfirm } from '@/features/sales/_shared/reconciliation/useReconDeductionConfirm'
// TODO(BE Excel import): bật lại khi BE cung cấp template import chính thức.
// import InvestorReconciliationImportDialog from './InvestorReconciliationImportDialog'

type InvestorReconciliationCreateFormProps = {
  /** `create` / `edit` → editable; `view` → read-only detail (reuses the same card tree). */
  mode?: 'create' | 'edit' | 'view'
  initialData?: InvestorReconciliationSheetWithItems
  /** Required for create/edit; unused in view (no submit button is rendered). */
  onSubmit?: (values: InvestorReconciliationSheetCreateValues) => Promise<void>
  /**
   * Per-căn save via the nested /lines/ endpoint (sheet-first true per-line). POST when
   * `lineId` is null (new căn) / PATCH otherwise; resolves the (new) lineId. When provided,
   * each line card shows a "Lưu căn" action and the saved/dirty badge.
   */
  onSaveLine?: (
    item: InvestorReconciliationSheetCreateItemValues,
    lineId: number | null
  ) => Promise<number | null>
  /** Per-căn delete via /lines/ (called before removing a persisted card). */
  onDeleteLine?: (lineId: number) => Promise<void>
  /** Seed the card list from /lines/ rows (edit). Overrides the sheet-derived items. */
  initialItems?: InvestorReconciliationSheetCreateItemValues[]
  /** Seed the lineId map (product_inventory_id → lineId) from /lines/ rows. */
  lineIdByProductId?: Record<number, number>
  /** BE-computed totals per căn (product_inventory_id → computed). Saved cards show these. */
  serverComputedByProductId?: Record<number, ReconServerComputed>
  /** BE recon_check per căn (product_inventory_id → comparison). Drives Khớp/Lệch issues. */
  reconCheckByProductId?: Record<number, ReconCheck>
  /** Required for create/edit; unused in view (back is handled by PageTitle). */
  onCancel?: () => void
  isSubmitting?: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

/** Per-line save state derived for the card badge / button. */
export type ReconLineSaveState = 'new' | 'dirty' | 'saved' | 'saving'

type InvestorReconciliationMetaFieldName = 'project_id' | 'source_type'

type PendingMetaChange = {
  fieldName: InvestorReconciliationMetaFieldName
  nextValue: string | number | undefined
}

const SourceType = ReconciliationSourceType

/**
 * Ô "label : info" read-only cho các field bị khoá/dẫn xuất (Dự án / Chủ đầu tư / Loại nguồn / Nguồn
 * hàng khi chỉnh sửa) — thay cho controller disabled để giao diện gọn, không trông như đang sửa được.
 */
function MetaInfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <span className="typo-body-base-semibold text-neutral-90">{label}</span>
      <span className="typo-body-base-regular text-content-dark-1 flex min-h-[38px] items-center break-words">
        {value || '—'}
      </span>
    </div>
  )
}

const InvestorReconciliationForm = ({
  mode = 'create',
  initialData,
  onSubmit,
  onSaveLine,
  onDeleteLine,
  initialItems,
  lineIdByProductId,
  serverComputedByProductId,
  reconCheckByProductId,
  onCancel,
  isSubmitting,
  scrollContainerRef,
}: InvestorReconciliationCreateFormProps) => {
  const isEditMode = mode === 'edit'
  const isView = mode === 'view'
  const isCreate = mode === 'create'
  /** Dự án / loại nguồn / nguồn hàng chỉ chọn lúc tạo phiếu — không đổi khi chỉnh sửa. */
  const isSheetMetaLocked = isEditMode
  const excludeInvestorSheetId = initialData?.id ?? null
  // Both edit and view hydrate the form from a saved sheet (mapSheetToFormValues handles draft
  // `items` AND finalized `reconciliations`); view then renders everything read-only.
  const shouldHydrate = isEditMode || isView

  // Per-line edit: items are loaded from /lines/ (initialItems) by a dedicated effect below,
  // not from the sheet's draft_items/reconciliations — start empty to avoid a stale flash.
  const usePerLine = !!onSaveLine

  const defaultValues = useMemo(() => {
    if (shouldHydrate && initialData) {
      const mapped = mapSheetToFormValues(initialData)
      return usePerLine ? { ...mapped, items: [] } : mapped
    }
    return {
      source_type: SourceType.direct,
      reconciliation_date: '',
      note: '',
      // Start with NO blank căn — the user adds the first one via "+ Thêm căn". An empty list
      // shows the empty-state placeholder instead of an unselected record #1.
      items: [],
    }
  }, [shouldHydrate, initialData, usePerLine])

  const form = useForm<InvestorReconciliationSheetCreateValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    resolver: zodResolver(
      investorReconciliationSheetCreateSchema
    ) as unknown as Resolver<InvestorReconciliationSheetCreateValues>,
    defaultValues,
  })

  const { register, control, handleSubmit, setValue, setError, formState } = form

  // RHF chỉ áp `defaultValues` lúc mount. Sau khi lưu, detail/edit refetch (useApiMutation
  // invalidateQueries kéo bản mới) ⇒ `initialData` đổi nhưng form KHÔNG tự nạp lại, nên bảng cấu hình
  // (vd "% TT đợt này" cột CĐT đề nghị) vẫn hiển thị số cũ. Reset form theo bản mới khi version
  // (id + updated_at) đổi — chỉ ở chế độ hydrate (edit/view), không đụng tới luồng tạo mới.
  const hydratedVersionRef = useRef<string | null>(null)
  useEffect(() => {
    // Per-line edit hydrates items from /lines/ in the dedicated effect below.
    if (!shouldHydrate || !initialData || usePerLine) return
    const version = `${initialData.id}:${initialData.updated_at ?? ''}`
    if (hydratedVersionRef.current === version) return
    hydratedVersionRef.current = version
    form.reset(mapSheetToFormValues(initialData))
  }, [shouldHydrate, initialData, usePerLine, form])

  const scrollToFirstError = useScrollToError(formState.errors)

  // "Cập nhật thông tin chung" chỉ bật khi field meta thực sự đổi so với bản đã tải (baseline do
  // form.reset đặt lúc hydrate). Edit chỉ sửa được Ngày đối chiếu / Ghi chú (các field còn lại khoá);
  // dirtyFields của items KHÔNG tính vào đây (căn lưu riêng qua /lines/).
  const { dirtyFields } = formState
  const isMetaDirty = Boolean(
    dirtyFields.reconciliation_date ||
      dirtyFields.note ||
      dirtyFields.project_id ||
      dirtyFields.source_type ||
      dirtyFields.source_exchange_id
  )

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items',
  })

  const projectId = Number(useWatch({ control, name: 'project_id' }) || 0)
  const sourceType = useWatch({ control, name: 'source_type' }) as
    | ReconciliationSourceType
    | undefined
  const sourceExchangeId = Number(useWatch({ control, name: 'source_exchange_id' }) || 0)
  const watchedItems = useWatch({ control, name: 'items' }) || []
  const isF0Source = sourceType === SourceType.F0

  // ── Per-căn save via /lines/ (sheet-first true per-line) ───────────────────
  // Each căn is its own IR row: "Lưu căn" → POST (new) / PATCH (existing) via
  // onSaveLine; xóa căn → DELETE via onDeleteLine. lineId tracked by
  // product_inventory_id; per-căn saved snapshot drives new / dirty / saved.
  const [lineIdByPid, setLineIdByPid] = useState<Record<number, number>>(
    () => lineIdByProductId ?? {}
  )
  const [savedItemByPid, setSavedItemByPid] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      (initialItems ?? []).flatMap((it) => {
        const pid = Number(it.product_inventory_id)
        return pid > 0 ? ([[pid, reconDirtyKey(it)]] as const) : []
      })
    )
  )
  const [savingPid, setSavingPid] = useState<number | null>(null)

  // Per-line edit: once /lines/ rows (initialItems) load, hydrate the field array + maps ONCE
  // per sheet. Seeded items are all "saved"; per-căn save/delete keeps the maps current after.
  const perLineHydratedRef = useRef<number | null>(null)
  useEffect(() => {
    if (!usePerLine || !initialData || initialItems === undefined) return
    if (perLineHydratedRef.current === initialData.id) return
    perLineHydratedRef.current = initialData.id
    form.reset({ ...mapSheetToFormValues(initialData), items: initialItems })
    setLineIdByPid(lineIdByProductId ?? {})
    setSavedItemByPid(
      Object.fromEntries(
        initialItems.flatMap((it) => {
          const pid = Number(it.product_inventory_id)
          return pid > 0 ? ([[pid, reconDirtyKey(it)]] as const) : []
        })
      )
    )
  }, [usePerLine, initialData, initialItems, lineIdByProductId, form])

  const handleRemoveLine = useCallback(
    async (index: number) => {
      const item = form.getValues().items?.[index]
      const pid = Number(item?.product_inventory_id)
      const lineId = pid > 0 ? lineIdByPid[pid] : undefined
      if (lineId && onDeleteLine) {
        try {
          await onDeleteLine(lineId)
        } catch (error) {
          toastService.error(extractErrorMessage(error))
          return
        }
        setLineIdByPid((m) => {
          const next = { ...m }
          delete next[pid]
          return next
        })
        setSavedItemByPid((s) => {
          const next = { ...s }
          delete next[pid]
          return next
        })
      }
      remove(index)
    },
    [form, lineIdByPid, onDeleteLine, remove]
  )

  const getLineSaveState = useCallback(
    (index: number): ReconLineSaveState => {
      const item = watchedItems[index]
      const pid = Number(item?.product_inventory_id)
      if (pid > 0 && savingPid === pid) return 'saving'
      const saved = pid > 0 ? savedItemByPid[pid] : undefined
      if (saved == null) return 'new'
      return saved === reconDirtyKey(item) ? 'saved' : 'dirty'
    },
    [savingPid, savedItemByPid, watchedItems]
  )

  // "Chủ đầu tư" is read-only, derived from the selected project's investor (the request has no
  // investor_id). BE-PENDING: add `investor_id` to InvestorReconciliationSheetRequest to persist it.
  const { data: projectDetail } = useProject(projectId)
  const investorName = projectDetail?.investor?.name ?? ''
  // CĐT (chủ đầu tư) of the selected project — used to scope the deal dropdown from the sheet's
  // general info, alongside the project. (getDeals supports `investor`; it has no source_exchange filter.)
  const investorId = Number(projectDetail?.investor?.id || 0)

  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadSourceExchangeOptions, loadInitialSourceExchangeOptions } = useSourceExchangeSelect({
    project: projectId > 0 ? projectId : undefined,
  })

  // Deal-based mã-căn dropdown + deal cache, lifted here (was in FormTable) so mọi line card dùng
  // CHUNG một deal cache — `getSelectedDeal` cấp `dealId`/giá cho MV reference (commission-config)
  // mà không nhân đôi fetch.
  const { getLoadDealOptionsByRow, loadInitialDealOptions, getSelectedDeal } = useReconDealSelect({
    projectId,
    investorId,
  })

  // Dialog "Xác nhận giảm trừ kỳ này" — AppDialog alert CỤC BỘ (KHÔNG dùng global dialog store:
  // store 1-config sẽ phá form/dialog đang hiển thị). Render node của nó cạnh AppDialog meta bên dưới.
  const { confirmDeduction, deductionConfirmDialog } = useReconDeductionConfirm()
  const queryClient = useQueryClient()
  // Form CĐT nằm ngoài ReconKindProvider ⇒ fallback preset investor (đúng endpoint lịch sử CĐT).
  const { kind } = useReconKind()

  const handleSaveLine = useCallback(
    async (index: number) => {
      if (!onSaveLine) return
      const valid = await form.trigger()
      if (!valid) {
        scrollToFirstError()
        return
      }
      const item = form.getValues().items?.[index]
      const pid = Number(item?.product_inventory_id)
      if (!item || !(pid > 0)) return

      // Căn có "Giảm trừ khác" > 0 ⇒ hỏi xác nhận (kỳ này + lũy kế các kỳ đã duyệt) trước khi lưu.
      // Lũy kế lấy từ query lịch sử ĐÃ fetch bởi line card (cùng buildReconHistoryQuery ⇒ cache hit).
      const feeDeduction = Number(item.fee_deduction) || 0
      if (feeDeduction > 0) {
        const deal = getSelectedDeal(pid)
        let prior = { total: 0, toSale: 0 }
        if (deal && deal.dealId > 0) {
          try {
            const history = await queryClient.fetchQuery(buildReconHistoryQuery(kind, deal.dealId))
            const summary = summarizeReconHistory(history?.results ?? [], excludeInvestorSheetId)
            prior = {
              total: summary.confirmedFeeDeductionTotal,
              toSale: summary.confirmedFeeDeductionToSaleTotal,
            }
          } catch {
            // Lịch sử lỗi mạng ⇒ vẫn hỏi xác nhận với lũy kế 0, không chặn lưu căn.
          }
        }
        const confirmed = await confirmDeduction({
          unitLabel: deal?.productUnitNumber || deal?.productCode || deal?.dealCode || `#${pid}`,
          feeDeduction,
          feeDeductionToSale: item.fee_deduction_to_sale_amount ?? null,
          prior,
        })
        if (!confirmed) return
      }

      setSavingPid(pid)
      try {
        const newLineId = await onSaveLine(item, lineIdByPid[pid] ?? null)
        if (newLineId) setLineIdByPid((m) => ({ ...m, [pid]: newLineId }))
        setSavedItemByPid((s) => ({ ...s, [pid]: reconDirtyKey(item) }))
        toastService.success('Đã lưu căn')
      } catch (error) {
        // Map BE validation errors to fields where possible; falls back to a toast otherwise.
        handleApiError(error, setError)
      } finally {
        setSavingPid(null)
      }
    },
    [
      onSaveLine,
      form,
      scrollToFirstError,
      lineIdByPid,
      setError,
      getSelectedDeal,
      queryClient,
      kind,
      excludeInvestorSheetId,
      confirmDeduction,
    ]
  )

  const [isMetaChangeConfirmOpen, setIsMetaChangeConfirmOpen] = useState(false)
  const [pendingMetaChange, setPendingMetaChange] = useState<PendingMetaChange | null>(null)
  // TODO(BE Excel import): bật lại khi BE cung cấp template import chính thức.
  // const [isImportOpen, setIsImportOpen] = useState(false)

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES],
  })
  const sourceTypeOptions =
    keysMapOptions.get(APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES) ??
    []

  // Nhãn hiển thị cho các field khoá ở chế độ chỉnh sửa (label:info) — lấy từ sheet detail / option.
  const projectLabel = initialData?.project_detail?.name ?? projectDetail?.name ?? ''
  const sourceTypeLabel =
    sourceTypeOptions.find((opt) => String(opt.value) === String(sourceType ?? ''))?.label ??
    sourceType ??
    ''
  const sourceExchangeLabel = initialData?.source_exchange_detail?.name ?? ''

  const isSourceTypeEnabled = Boolean(projectId)
  const isMetaEnabled = Boolean(projectId && sourceType && (!isF0Source || sourceExchangeId > 0))
  const hasDetailUserData = useMemo(
    () => hasInvestorReconciliationDetailUserData(watchedItems),
    [watchedItems]
  )

  // Count only căn that already have a deal selected (product_inventory_id > 0). A freshly-added but
  // unselected card is NOT counted in the "(N căn)" label.
  const selectedCanCount = useMemo(
    () => watchedItems.filter((it) => Number(it?.product_inventory_id) > 0).length,
    [watchedItems]
  )

  const resetItems = useCallback(() => {
    // Clear to an empty list (no blank record) when project/source changes invalidate the căn.
    replace([])
  }, [replace])

  const applyMetaChange = useCallback(
    (fieldName: InvestorReconciliationMetaFieldName, nextValue: string | number | undefined) => {
      const resetDependentOptions = { shouldValidate: false, shouldDirty: true } as const

      if (fieldName === 'project_id') {
        setValue('project_id', nextValue as never, resetDependentOptions)
        setValue('source_exchange_id', undefined as never, resetDependentOptions)
        resetItems()
        return
      }

      if (fieldName === 'source_type') {
        setValue('source_type', nextValue as never, resetDependentOptions)
        setValue('source_exchange_id', undefined as never, resetDependentOptions)
        resetItems()
      }
    },
    [resetItems, setValue]
  )

  const handleMetaFieldChange = useCallback(
    (fieldName: InvestorReconciliationMetaFieldName, rawValue: string | number | null) => {
      const nextValue =
        rawValue === null || rawValue === undefined || rawValue === ''
          ? undefined
          : fieldName === 'source_type'
            ? String(rawValue)
            : Number(rawValue)

      if (!hasDetailUserData) {
        applyMetaChange(fieldName, nextValue)
        return
      }

      setPendingMetaChange({ fieldName, nextValue })
      setIsMetaChangeConfirmOpen(true)
    },
    [applyMetaChange, hasDetailUserData]
  )

  const handleCancelMetaChange = useCallback(() => {
    setPendingMetaChange(null)
    setIsMetaChangeConfirmOpen(false)
  }, [])

  const handleConfirmMetaChange = useCallback(() => {
    if (!pendingMetaChange) {
      setIsMetaChangeConfirmOpen(false)
      return
    }

    applyMetaChange(pendingMetaChange.fieldName, pendingMetaChange.nextValue)
    setPendingMetaChange(null)
    setIsMetaChangeConfirmOpen(false)
  }, [applyMetaChange, pendingMetaChange])

  const handleAddRow = useCallback(
    (periodType?: CTVReconciliationPeriod_type) => {
      const base = createEmptyInvestorReconciliationSheetItem()
      append(periodType ? { ...base, period_type: periodType } : base)
    },
    [append]
  )

  // TODO(BE Excel import): bật lại khi BE cung cấp template import chính thức.
  // const handleImportRows = useCallback(
  //   (imported: InvestorReconciliationSheetCreateItemValues[]) => {
  //     if (!imported.length) return
  //     // Replace the list when it only holds untouched blank rows; otherwise append the imported căn.
  //     const hasMeaningfulRow = watchedItems.some((it) => Number(it?.product_inventory_id) > 0)
  //     if (hasMeaningfulRow) {
  //       append(imported)
  //     } else {
  //       replace(imported)
  //     }
  //   },
  //   [append, replace, watchedItems]
  // )

  const onValid = useCallback(
    async (values: InvestorReconciliationSheetCreateValues) => {
      if (!onSubmit) return
      try {
        await onSubmit(values)
      } catch (error) {
        // Form owns API error handling: map field-level errors via setError, toast the rest.
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  // Edit: "Cập nhật thông tin chung" — chỉ validate field meta (không validate căn), rồi update sheet
  // metadata-only qua onSubmit. Lỗi BE map vào field qua handleApiError.
  const handleUpdateMeta = useCallback(async () => {
    if (!onSubmit) return
    const valid = await form.trigger([
      'project_id',
      'source_type',
      'source_exchange_id',
      'reconciliation_date',
    ])
    if (!valid) {
      scrollToFirstError()
      return
    }
    try {
      await onSubmit(form.getValues())
    } catch (error) {
      handleApiError(error, setError)
    }
  }, [onSubmit, form, scrollToFirstError, setError])

  const handleInvalid = useCallback(() => {
    scrollToFirstError()
  }, [scrollToFirstError])

  return (
    <ReconModeProvider mode={mode}>
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onValid, handleInvalid)} className="space-y-6 px-7 py-4 pb-16">
          {isView && initialData && <ReconSheetMetaView data={initialData} />}

          {!isView && (
            <div className="bg-background-1 rounded-md">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-content-dark-1 text-lg font-semibold">
                  Thông tin chung của phiếu
                </h3>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleUpdateMeta}
                    disabled={isSubmitting || !isMetaDirty}
                    title={
                      isMetaDirty
                        ? 'Cập nhật thông tin chung của phiếu\n(không liên quan tới "Chi tiết các căn trong phiếu")'
                        : 'Chưa có thay đổi thông tin chung để cập nhật'
                    }
                    className="typo-body-sm-medium border-content-dark-2 text-content-dark-1 hover:bg-background-2 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cập nhật thông tin chung
                  </button>
                )}
              </div>
              {/* Layout (lg, 3 cột): Ngày đối chiếu · Dự án · Chủ đầu tư ở hàng 1; Loại nguồn ·
                  Nguồn hàng (F0-only) ở hàng 2; Ghi chú phiếu độc lập full-width ở hàng cuối. */}
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <FormController
                  register={register}
                  control={control}
                  name="reconciliation_date"
                  Field={DatePicker}
                  wrapperClassName="h-fit"
                  fieldProps={{
                    label: 'Ngày đối chiếu',
                    required: true,
                    allowManualInput: true,
                    disabled: isSubmitting || !isMetaEnabled,
                  }}
                />

                <div className="h-fit">
                  {isSheetMetaLocked ? (
                    <MetaInfoField label="Dự án" value={projectLabel} />
                  ) : (
                    <Controller
                      control={control}
                      name="project_id"
                      render={({ field, fieldState }) => (
                        <Select
                          label="Dự án"
                          placeholder="Chọn dự án"
                          loadOptions={loadProjectOptions}
                          loadInitialOptions={loadInitialProjectOptions}
                          enableSearch
                          required
                          disabled={isSubmitting || isSheetMetaLocked}
                          // Pass null (not undefined) when empty: undefined flips Select to uncontrolled
                          // (useControllableState) → stale internal label needs a 2nd "clear" click.
                          value={field.value ?? null}
                          onChange={(value) =>
                            handleMetaFieldChange('project_id', value as string | number | null)
                          }
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  )}
                </div>

                <div className="h-fit">
                  <MetaInfoField label="Chủ đầu tư" value={investorName} />
                </div>

                <div className="h-fit">
                  {isSheetMetaLocked ? (
                    <MetaInfoField label="Loại nguồn" value={sourceTypeLabel} />
                  ) : (
                    <Controller
                      control={control}
                      name="source_type"
                      render={({ field, fieldState }) => (
                        <Select
                          label="Loại nguồn"
                          placeholder="Chọn loại nguồn"
                          options={sourceTypeOptions}
                          disabled={!isSourceTypeEnabled || !!isSubmitting || isSheetMetaLocked}
                          value={field.value ?? null}
                          onChange={(value) =>
                            handleMetaFieldChange('source_type', value as string | number | null)
                          }
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  )}
                </div>

                {isF0Source && (
                  <div className="h-fit">
                    {isSheetMetaLocked ? (
                      <MetaInfoField label="Nguồn hàng" value={sourceExchangeLabel} />
                    ) : (
                      <Controller
                        control={control}
                        name="source_exchange_id"
                        render={({ field, fieldState }) => (
                          <Select
                            label="Nguồn hàng"
                            placeholder="Chọn nguồn hàng"
                            loadOptions={loadSourceExchangeOptions}
                            loadInitialOptions={loadInitialSourceExchangeOptions}
                            enableSearch
                            required
                            disabled={!isSourceTypeEnabled || !!isSubmitting || isSheetMetaLocked}
                            value={field.value ?? null}
                            onChange={(value) =>
                              field.onChange(
                                value === null || value === undefined || value === ''
                                  ? undefined
                                  : Number(value)
                              )
                            }
                            error={fieldState.error?.message}
                          />
                        )}
                      />
                    )}
                  </div>
                )}

                <FormController
                  register={register}
                  control={control}
                  name="note"
                  Field={TextArea}
                  wrapperClassName="sm:col-span-2 lg:col-span-3"
                  fieldProps={{
                    label: 'Ghi chú phiếu',
                    placeholder: 'Ghi chú chung cho cả phiếu...',
                    disabled: isSubmitting || !isMetaEnabled,
                  }}
                />
              </div>
            </div>
          )}

          {!isCreate && (
            <>
              <Separator />

              <div className="bg-background-1 rounded-md">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-content-dark-1 text-lg font-semibold">
                    Chi tiết các căn trong phiếu ({selectedCanCount} căn)
                  </h3>
                  {!isView && (
                    <Flex align="center" gap="2">
                      <ReconImportExcelButton />
                      <ReconAddCanMenu
                        disabled={isSubmitting || !isMetaEnabled}
                        onAddRow={handleAddRow}
                      />
                    </Flex>
                  )}
                </div>
                {/* Không có thanh tổng hợp FE-aggregate (MV dự kiến / lũy kế / chênh lệch) — số tổng
                    NET/VAT phiếu lấy thẳng từ BE ở "Tổng kết phiếu" (InvestorReconciliationSheetTotal). */}
                <InvestorReconciliationFormTable
                  fields={fields}
                  watchedItems={watchedItems}
                  getLoadDealOptionsByRow={getLoadDealOptionsByRow}
                  loadInitialDealOptions={loadInitialDealOptions}
                  getSelectedDeal={getSelectedDeal}
                  isSubmitting={isSubmitting}
                  isMetaEnabled={isMetaEnabled}
                  remove={usePerLine ? handleRemoveLine : remove}
                  onSaveLine={usePerLine ? handleSaveLine : undefined}
                  getLineSaveState={usePerLine ? getLineSaveState : undefined}
                  serverComputedByProductId={serverComputedByProductId}
                  reconCheckByProductId={reconCheckByProductId}
                  scrollContainerRef={scrollContainerRef}
                  excludeInvestorSheetId={excludeInvestorSheetId}
                />
              </div>

              {/* Tổng kết phiếu (BE) — chỉ hiện khi đã có ≥1 căn được BE tính. Số lấy từ sheet detail. */}
              {initialData && (initialData.reconciliations?.length ?? 0) > 0 && (
                <>
                  <Separator orientation={'horizontal'} className={'!w-full'} />
                  <InvestorReconciliationSheetTotal sheet={initialData} />
                </>
              )}
            </>
          )}

          {isCreate && (
            <>
              <Separator orientation={'horizontal'} className={'!w-full'} />

              <Flex gap="3" justify="end" className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button type="submit" loading={isSubmitting} leftIcon={<Check size={16} />}>
                  Tạo phiếu nháp & Thêm căn đối chiếu
                </Button>
              </Flex>
            </>
          )}
        </form>

        <AppDialog
          variant="alert"
          open={isMetaChangeConfirmOpen}
          onOpenChange={(open) => {
            setIsMetaChangeConfirmOpen(open)
            if (!open) {
              setPendingMetaChange(null)
            }
          }}
          title="Xác nhận thay đổi thông tin"
          titleDescription="Việc thay đổi thông tin này sẽ xoá toàn bộ thông tin trong bảng chi tiết đối chiếu ở dưới"
          confirmText="Xác nhận"
          cancelText="Huỷ"
          onConfirm={handleConfirmMetaChange}
          onCancel={handleCancelMetaChange}
          content={null}
        />
        {/* Xác nhận giảm trừ trước khi lưu căn có "Giảm trừ khác" > 0 (local AppDialog). */}
        {deductionConfirmDialog}
        {/* TODO(BE Excel import): bật lại khi BE cung cấp template import chính thức.
      <InvestorReconciliationImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        projectId={projectId}
        sourceType={sourceType}
        sourceExchangeId={sourceExchangeId > 0 ? sourceExchangeId : undefined}
        onImport={handleImportRows}
      /> */}
      </FormProvider>
    </ReconModeProvider>
  )
}

export default InvestorReconciliationForm
