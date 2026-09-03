import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Button, TextArea } from '@/components/ui'
import { useAbility } from '@/lib/ability'
import { useUserName } from '@/store/auth-store'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { handleApiError, isNotFoundError } from '@/utils/error-utils'
import {
  usePromotionCommissionConfig,
  useCreatePromotionCommissionConfig,
  useUpdatePromotionCommissionConfig,
} from '@/features/project/promotion-commission-config/services/promotion-commission-config-service'
import {
  buildConfigRequest,
  getInvalidContributionGroups,
  mapConfigToForm,
  promotionConfigFormSchema,
  type PromotionConfigFormValues,
} from '@/features/project/promotion-commission-config/types/promotion-commission-config-types'
import {
  PROMOTION_RECIPIENT_SUBJECT,
  getAutoCreateStorageKey,
} from '@/features/project/promotion-commission-config/constants/promotion-commission-config-constants'
import { PromotionCommissionConfigTable } from '@/features/project/promotion-commission-config/components/PromotionCommissionConfigTable'
import PromotionConfigCreatePrompt from '@/features/project/promotion-commission-config/components/PromotionConfigCreatePrompt'

/** Header-toolbar actions this tab lifts up to the page-level PageTitle (mirrors the overview tab). */
export type PromotionCommissionConfigTabSlots = {
  handleEdit?: () => void
}

export type PromotionCommissionConfigTabProps = {
  projectId: number
  /** Whether this tab is the active one. The config is only fetched / prompted when active. */
  active: boolean
  /** Lets the parent render the "Chỉnh sửa" button in the PageTitle header, like the overview tab. */
  setTabSlots?: (slots: PromotionCommissionConfigTabSlots | null) => void
}

export const PromotionCommissionConfigTab = ({
  projectId,
  active,
  setTabSlots,
}: PromotionCommissionConfigTabProps) => {
  const ability = useAbility()
  const username = useUserName()
  const { displayConfirm } = useDialog()
  const [searchParams] = useSearchParams()

  const canList = ability.can('list', PROMOTION_RECIPIENT_SUBJECT)
  // Editing = PUT replace-all of config + recipients → requires add/remove/update recipients.
  const canManage =
    ability.can('update', PROMOTION_RECIPIENT_SUBJECT) &&
    ability.can('create', PROMOTION_RECIPIENT_SUBJECT) &&
    ability.can('destroy', PROMOTION_RECIPIENT_SUBJECT)

  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = usePromotionCommissionConfig(projectId, { enabled: !!projectId && canList && active })

  const configNotFound = !isLoading && !!error && isNotFoundError(error)
  const hasConfig = !!config && !configNotFound

  const [isEditing, setIsEditing] = useState(false)

  const methods = useForm<PromotionConfigFormValues>({
    resolver: zodResolver(promotionConfigFormSchema),
    defaultValues: mapConfigToForm(null),
  })

  // Hydrate the form whenever the loaded config changes (but never clobber an active edit).
  const configKey = useMemo(() => JSON.stringify(config ?? null), [config])
  useEffect(() => {
    if (isEditing) return
    methods.reset(mapConfigToForm(config))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey])

  const updateMutation = useUpdatePromotionCommissionConfig()
  const createMutation = useCreatePromotionCommissionConfig()
  const isSaving = updateMutation.isPending || createMutation.isPending

  const handleStartEdit = useCallback(() => {
    if (!canManage) return
    setIsEditing(true)
  }, [canManage])

  // Lift the "Chỉnh sửa" action into the PageTitle header (same place as the overview tab). Only
  // when there's a config to edit and we're not already editing; the empty state owns its own
  // "Tạo mới" button, and editing surfaces Hủy/Lưu in the sticky footer instead.
  useEffect(() => {
    if (!setTabSlots) return
    const canShowEdit = canManage && hasConfig && !isEditing
    setTabSlots(canShowEdit ? { handleEdit: handleStartEdit } : null)
    return () => setTabSlots(null)
  }, [setTabSlots, canManage, hasConfig, isEditing, handleStartEdit])

  const handleCancel = () => {
    methods.reset(mapConfigToForm(config))
    setIsEditing(false)
  }

  const handleSave = methods.handleSubmit(async (values) => {
    if (!canManage) return

    // Client-side guard mirroring the backend rule: each pct_type with recipients must have
    // contribution_level summing to exactly 100. Block early so the user fixes the red rows.
    if (getInvalidContributionGroups(values).length > 0) {
      toastService.error(
        'Tổng mức độ đóng góp của mỗi loại hoa hồng phải bằng 100%. Vui lòng kiểm tra lại các dòng được đánh dấu đỏ.'
      )
      return
    }

    const data = buildConfigRequest(values)
    try {
      if (hasConfig) {
        await updateMutation.mutateAsync({ projectPk: projectId, data })
      } else {
        await createMutation.mutateAsync({ projectPk: projectId, data })
      }
      toastService.success('Đã lưu cấu hình hoa hồng')
      setIsEditing(false)
      await refetch()
    } catch (err) {
      // Server validation errors here are aggregate (attr=recipients) and the cell inputs have no
      // inline error slot — handleApiError toasts every error detail so the user always sees them.
      handleApiError(err)
    }
  })

  // On a missing config (404): either jump straight into the create form (if the user opted to
  // skip the prompt before, stored per-username), or ask via a confirm dialog. Only while active.
  const dontShowAgainRef = useRef(false)
  const promptHandledRef = useRef(false)
  useEffect(() => {
    if (!active || !configNotFound || !canManage || isEditing) return
    if (promptHandledRef.current) return
    promptHandledRef.current = true

    // `configAction=create` (e.g. opened from the promotion-distribution 409 flow) means the user
    // already knows there's no config — skip the prompt and open the create form directly.
    const forceCreate = searchParams.get('configAction') === 'create'
    const autoCreate =
      forceCreate ||
      (username ? localStorage.getItem(getAutoCreateStorageKey(username)) === 'true' : false)

    if (autoCreate) {
      setIsEditing(true)
      return
    }

    dontShowAgainRef.current = false
    displayConfirm({
      title: 'Dự án chưa có cấu hình hoa hồng',
      content: (
        <PromotionConfigCreatePrompt
          onToggleDontShowAgain={(value) => {
            dontShowAgainRef.current = value
          }}
        />
      ),
      confirmText: 'Tạo mới',
      cancelText: 'Để sau',
      onConfirm: () => {
        if (dontShowAgainRef.current && username) {
          localStorage.setItem(getAutoCreateStorageKey(username), 'true')
        }
        setIsEditing(true)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, configNotFound, canManage, isEditing])

  if (!canList) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-content-dark-3">Bạn không có quyền xem cấu hình hoa hồng.</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-content-dark-3">Đang tải...</span>
      </div>
    )
  }

  if (error && !configNotFound) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-data-red-default">Không tải được cấu hình hoa hồng.</span>
      </div>
    )
  }

  const showEmptyState = configNotFound && !isEditing

  return (
    <div className="flex flex-col gap-4 px-10">
      {showEmptyState ? (
        <div className="border-border-1 flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-white py-14">
          <p className="typo-body-base-regular text-content-dark-3">
            Dự án này chưa có cấu hình hoa hồng xúc tiến.
          </p>
          {canManage && (
            <Button type="button" onClick={handleStartEdit}>
              + Tạo mới cấu hình
            </Button>
          )}
        </div>
      ) : (
        <FormProvider {...methods}>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
            <PromotionCommissionConfigTable isEditing={isEditing} />

            {isEditing ? (
              <Controller
                control={methods.control}
                name="note"
                render={({ field }) => (
                  <TextArea
                    label="Ghi chú"
                    placeholder="Nhập ghi chú cho cấu hình hoa hồng (nếu có)"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    rows={3}
                  />
                )}
              />
            ) : (
              <div className="flex flex-col gap-1">
                <span className="typo-body-base-semibold text-neutral-90">Ghi chú</span>
                <p className="typo-body-base-regular text-content-dark-1 whitespace-pre-wrap">
                  {methods.watch('note')?.toString().trim() ? methods.watch('note') : '—'}
                </p>
              </div>
            )}
          </form>
        </FormProvider>
      )}

      {/* Hủy / Lưu pinned at the bottom of the page to match other edit pages' layout. */}
      {canManage && isEditing && (
        <Flex
          justify="end"
          gap="3"
          className="border-border-1 sticky bottom-0 z-10 mt-2 border-t bg-white py-4"
        >
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSaving}>
            Hủy
          </Button>
          <Button type="button" onClick={handleSave} loading={isSaving}>
            Lưu
          </Button>
        </Flex>
      )}
    </div>
  )
}

export default PromotionCommissionConfigTab
