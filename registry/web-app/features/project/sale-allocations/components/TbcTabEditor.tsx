import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import { formatDateToApi } from '@/utils/date-utils'
import { useForm, FormProvider } from 'react-hook-form'
import { Flex, Text } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { IconPencil, IconX, IconCheck } from '@/assets/icons'
import {
  TbcResourceType,
  useSalesAllocationTbcList,
  useCreateSalesAllocationTbc,
  useUpdateSalesAllocationTbc,
  useDeleteSalesAllocationTbc,
} from '../services/sales-allocation-service'
import { useQueryClient } from '@tanstack/react-query'
import { useAbility } from '@/lib/ability'
import { toast } from 'react-toastify'

type TbcTabEditorProps = {
  saId: string | number
  title?: string
  initialIsEditing?: boolean
  forceReadOnly?: boolean
  items: {
    name: string
    resource: TbcResourceType
    children: (isReadOnly: boolean) => React.ReactNode
    filterBy?: Record<string, any>
    extraPayload?: Record<string, any>
    normalizeItem?: (item: any) => any
  }[]
}

const TbcResourceManager = forwardRef(
  (
    { saId, name, resource, isEditing, children, filterBy, extraPayload, normalizeItem }: any,
    ref
  ) => {
    const { data = [], refetch } = useSalesAllocationTbcList(saId, resource)
    let rawItems = Array.isArray(data) ? data : data?.results || []
    if (filterBy) {
      rawItems = rawItems.filter((item: any) => {
        return Object.keys(filterBy).every((key) => item[key] === filterBy[key])
      })
    }

    if (normalizeItem) {
      rawItems = rawItems.map(normalizeItem)
    }

    const { mutateAsync: createTbc } = useCreateSalesAllocationTbc(saId, resource)
    const { mutateAsync: updateTbc } = useUpdateSalesAllocationTbc(saId, resource)
    const { mutateAsync: deleteTbc } = useDeleteSalesAllocationTbc(saId, resource)

    // Isolated form: not affected by parent form's `values: sa` reset
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

        const deletedIds = currentRaw
          .filter((c: any) => !formItems.some((f: any) => f.id === c.id))
          .map((c: any) => c.id)

        for (const id of deletedIds) {
          await deleteTbc(id)
        }

        for (const fItem of formItems) {
          const payload = { ...extraPayload, ...fItem }

          // payload is passed unchanged natively to the backend

          if (payload.effective_from) {
            payload.effective_from = formatDateToApi(new Date(payload.effective_from))
          }
          if (payload.effective_to) {
            payload.effective_to = formatDateToApi(new Date(payload.effective_to))
          }

          if (payload.id) {
            await updateTbc({ id: payload.id, data: payload })
          } else {
            await createTbc(payload)
          }
        }

        await refetch()
      },
    }))

    return <FormProvider {...localForm}>{children}</FormProvider>
  }
)

export const TbcTabEditor: React.FC<TbcTabEditorProps> = ({
  saId,
  title,
  items,
  initialIsEditing = false,
  forceReadOnly = false,
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
          queryKey: ['realestate', 'sales-allocations', saId, item.resource],
        })
      }

      setIsEditing(false)
      toast.success('Cập nhật thay đổi thành công')
    } catch (e) {
      console.error(e)
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // The useEffects in TbcResourceManager will automatically reset the form values when isEditing becomes false
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
          saId={saId}
          name={item.name}
          resource={item.resource}
          isEditing={isEditing}
          filterBy={item.filterBy}
          extraPayload={item.extraPayload}
          normalizeItem={item.normalizeItem}
          ref={(el: any) => (resourceRefs.current[idx] = el)}
        >
          {item.children(isReadOnly)}
        </TbcResourceManager>
      ))}
    </Flex>
  )
}
