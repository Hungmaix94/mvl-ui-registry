import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/utils'
import Button from '../../../ui/button/Button.tsx'
import VisibilityRow from '../../../ui/table/column-config/VisibilityRow.tsx'
import { useState, useCallback, useEffect } from 'react'
import { IconX } from '../../../icons'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ColumnConfig } from '@/types/table'

type TableColumnConfigProps = {
  isShowConfigColumn: boolean
  setIsShowConfigColumn: (state: boolean) => void
  columns: ColumnConfig[]
  onApply: (columns: ColumnConfig[]) => void
  onReset: () => void
}

type SortableVisibilityRowProps = {
  column: ColumnConfig
  onToggle: (columnId: string, checked: boolean) => void
  isDragging: boolean
}

const SortableVisibilityRow = ({ column, onToggle, isDragging }: SortableVisibilityRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-colors duration-200',
        (isDragging || isSortableDragging) && 'bg-red-10 opacity-50'
      )}
    >
      <VisibilityRow
        {...attributes}
        {...listeners}
        text={column.label}
        checked={column.visible}
        onToggle={(checked) => onToggle(column.id, checked)}
      />
    </div>
  )
}

const TableColumnConfig = ({
  isShowConfigColumn,
  setIsShowConfigColumn,
  columns: initialColumns,
  onApply,
  onReset,
}: TableColumnConfigProps) => {
  const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Configure sensors for better drag behavior
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  )

  // Update columns when prop changes
  useEffect(() => {
    setColumns(initialColumns)
  }, [initialColumns])

  const handleToggleColumn = useCallback((columnId: string, checked: boolean) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, visible: checked } : col))
    )
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    setColumns((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      // Prevent invalid drops
      if (oldIndex === -1 || newIndex === -1) {
        setActiveId(null)
        return items
      }

      const newItems = [...items]
      const [removed] = newItems.splice(oldIndex, 1)
      newItems.splice(newIndex, 0, removed)

      // Update order based on new positions
      return newItems.map((item, index) => ({
        ...item,
        order: index,
      }))
    })

    setActiveId(null)
  }

  const handleApply = () => {
    onApply(columns)
    setIsShowConfigColumn(false)
  }

  const handleResetClick = () => {
    onReset()
  }

  return (
    <>
      <Dialog.Root open={isShowConfigColumn} onOpenChange={setIsShowConfigColumn} modal={true}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              'DialogOverlay',
              'fixed inset-0 z-40',
              'text-content-dark-1',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'bg-content-dark-1 opacity-[8%]'
            )}
          />

          <Dialog.Content
            className={cn(
              'DialogContent',
              'fixed top-0 right-0 z-50',
              'flex flex-col',
              'w-[330px]',
              'h-[100vh]',
              'bg-content-light-1 border-border-1 border shadow-lg',
              'duration-200',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full'
            )}
            onEscapeKeyDown={() => setIsShowConfigColumn(false)}
            onInteractOutside={() => setIsShowConfigColumn(false)}
          >
            <Dialog.Title className="sr-only">Cấu hình cột bảng</Dialog.Title>
            <Dialog.Description className="sr-only">
              Dialog để cấu hình hiển thị các cột trong bảng
            </Dialog.Description>

            {/* Header */}
            <div className="border-border-1 flex items-center justify-between border-b px-[18px] py-[16px]">
              <h2 className="text-content-dark-1 text-base leading-[1.5] font-semibold">
                Tuỳ chỉnh cột
              </h2>
              <Dialog.Close asChild>
                <Button
                  iconOnly
                  leftIcon={<IconX />}
                  variant={'secondary'}
                  className={cn(
                    'bg-transparent',
                    'text-content-dark-2',
                    'p-[9px]',
                    'focus:border-none focus:outline-none focus-visible:border-none focus-visible:outline-none'
                  )}
                />
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="bg-background-3 flex-1 overflow-x-hidden overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columns.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col">
                    {columns.map((column) => (
                      <SortableVisibilityRow
                        key={column.id}
                        column={column}
                        onToggle={handleToggleColumn}
                        isDragging={activeId === column.id}
                      />
                    ))}
                  </div>
                </SortableContext>

                {/* Drag Overlay for better visual feedback */}
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-red-10 rounded opacity-90 shadow-lg">
                      <VisibilityRow
                        text={columns.find((c) => c.id === activeId)?.label || ''}
                        checked={columns.find((c) => c.id === activeId)?.visible || false}
                        onToggle={() => {}}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            {/* Footer */}
            <div className="border-border-1 border-t p-[16px]">
              <div className="flex items-center justify-between">
                <Button
                  variant="text"
                  size="small"
                  onClick={handleResetClick}
                  className="px-[8px] py-[4px]"
                >
                  Đặt lại
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleApply}
                  className="w-[128px] px-[12px] py-[8px]"
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export default TableColumnConfig
