import { TbcSource } from '@/features/project/sale-allocations/types/product'
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import { formatDateToApi } from '@/utils/date-utils'
import { useForm, FormProvider } from 'react-hook-form'
import { Flex, Text } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { IconPencil, IconX, IconCheck } from '@/assets/icons'
import {
  PiTbcResourceType,
  useCreateProductInventoryTbc,
  useUpdateProductInventoryTbc,
  useDeleteProductInventoryTbc,
} from '../../services/product-inventory-tbc-service'
import { useQueryClient } from '@tanstack/react-query'
import { useAbility } from '@/lib/ability'
import { toast } from 'react-toastify'

type PiTbcTabEditorProps = {
  piId: string | number
  tbcSource: 'sa' | 'pi' // indicates if currently inheriting from SA or custom PI
  title?: string
  initialIsEditing?: boolean
  forceReadOnly?: boolean
  items: {
    name: string
    resource: PiTbcResourceType
    children: (isReadOnly: boolean) => React.ReactNode
    filterBy?: Record<string, any>
    extraPayload?: Record<string, any>
    normalizeItem?: (item: any) => any
    initialData?: any[]
  }[]
  onSaveSuccess?: () => void
}

const TbcResourceManager = forwardRef(
  (
    {
      piId,
      name,
      resource,
      isEditing,
      children,
      filterBy,
      extraPayload,
      normalizeItem,
      tbcSource,
      initialData = [],
    }: any,
    ref
  ) => {
    let rawItems = Array.isArray(initialData) ? initialData : initialData?.results || []
    if (filterBy) {
      rawItems = rawItems.filter((item: any) => {
        return Object.keys(filterBy).every((key) => item[key] === filterBy[key])
      })
    }

    if (normalizeItem) {
      rawItems = rawItems.map(normalizeItem)
    }

    const { mutateAsync: createTbc } = useCreateProductInventoryTbc(piId, resource)
    const { mutateAsync: updateTbc } = useUpdateProductInventoryTbc(piId, resource)
    const { mutateAsync: deleteTbc } = useDeleteProductInventoryTbc(piId, resource)

    // Isolated form
    const localForm = useForm<{ [key: string]: any[] }>({
      defaultValues: { [name]: [] },
    })

    // Sync rawItems → localForm when NOT editing (data loaded/refreshed)
    useEffect(() => {
      if (!isEditing) {
        localForm.reset({ [name]: rawItems })
      }
    }, [rawItems, isEditing])

    useImperativeHandle(ref, () => ({
      save: async () => {
        const currentRaw: any[] = rawItems
        const formItems: any[] = localForm.getValues(name) || []

        // If currently inheriting from SA, any save action counts as a CREATE for the PI to override SA.
        // We do not delete SA records from the PI endpoint natively.
        // The backend `create` endpoint for PI TBC with the whole list will establish the PI's custom mapping.
        // Wait! The user implementation plan specified:
        // "Khi tbc_source = sa: Mọi cấu hình đang được kế thừa. Nếu user bấm Save, chúng ta gửi lệnh CREATE"

        const isInherited = tbcSource === TbcSource.SA

        if (isInherited) {
          // Create all form items as new records for this PI
          for (const fItem of formItems) {
            const payload = { ...extraPayload, ...fItem }
            // Remove ID so it creates a new record for PI
            delete payload.id

            if (payload.effective_from) {
              payload.effective_from = formatDateToApi(new Date(payload.effective_from))
            }
            if (payload.effective_to) {
              payload.effective_to = formatDateToApi(new Date(payload.effective_to))
            }
            await createTbc(payload)
          }
        } else {
          // Normal UPDATE/CREATE/DELETE
          const deletedIds = currentRaw
            .filter((c: any) => !formItems.some((f: any) => f.id === c.id))
            .map((c: any) => c.id)

          for (const id of deletedIds) {
            await deleteTbc(id)
          }

          for (const fItem of formItems) {
            const payload = { ...extraPayload, ...fItem }

            if (payload.effective_from) {
              payload.effective_from = formatDateToApi(new Date(payload.effective_from))
            }
            if (payload.effective_to) {
              payload.effective_to = formatDateToApi(new Date(payload.effective_to))
            }

            if (payload.id && !payload.isNew) {
              await updateTbc({ id: payload.id, data: payload })
            } else {
              delete payload.id // ensure new items don't send fake ids
              await createTbc(payload)
            }
          }
        }
      },
    }))

    return <FormProvider {...localForm}>{children}</FormProvider>
  }
)

export const PiTbcTabEditor: React.FC<PiTbcTabEditorProps> = ({
  piId,
  tbcSource,
  title,
  items,
  initialIsEditing = false,
  forceReadOnly = false,
  onSaveSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const ability = useAbility()

  const queryClient = useQueryClient()
  const resourceRefs = useRef<any[]>([])

  useEffect(() => {
    if (initialIsEditing && !isEditing) {
      const timer = setTimeout(() => {
        setIsEditing(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [initialIsEditing])

  const handleSave = async () => {
    setIsProcessing(true)
    try {
      // Execute the save method sequentially on all resource managers securely
      for (const ref of resourceRefs.current) {
        if (ref) await ref.save()
      }

      // Invalidate the queries for these resources
      for (const item of items) {
        await queryClient.invalidateQueries({
          queryKey: ['realestate', 'product-inventories', piId, item.resource],
        })
      }

      // Invalidate the context query to update tbc_source globally
      await queryClient.invalidateQueries({
        queryKey: ['realestate', 'product-inventories', piId, 'tbc-context'],
      })

      setIsEditing(false)
      toast.success('Cập nhật thay đổi thành công')
      if (onSaveSuccess) onSaveSuccess()
    } catch (e) {
      console.error(e)
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const canUpdate = !forceReadOnly && ability.can('update', 'project')
  const isReadOnly = !isEditing || !canUpdate

  return (
    <Flex direction="column" gap="5">
      <Flex justify={title ? 'between' : 'end'} align="center">
        {title && <Text className="typo-body-xl-semibold text-content-dark-1">{title}</Text>}
        {canUpdate && (
          <Flex gap="3">
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="text-content-dark-3 hover:text-content-dark-1"
                  leftIcon={<IconX />}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={isProcessing}
                  leftIcon={<IconCheck />}
                >
                  Lưu
                </Button>
              </>
            ) : (
              <Button
                variant="secondary-border"
                onClick={() => setIsEditing(true)}
                leftIcon={<IconPencil />}
              >
                Chỉnh sửa
              </Button>
            )}
          </Flex>
        )}
      </Flex>

      {items.map((item, idx) => (
        <TbcResourceManager
          key={idx}
          piId={piId}
          tbcSource={tbcSource}
          name={item.name}
          resource={item.resource}
          isEditing={isEditing}
          filterBy={item.filterBy}
          extraPayload={item.extraPayload}
          normalizeItem={item.normalizeItem}
          initialData={item.initialData}
          ref={(el: any) => (resourceRefs.current[idx] = el)}
        >
          {item.children(isReadOnly)}
        </TbcResourceManager>
      ))}
    </Flex>
  )
}
