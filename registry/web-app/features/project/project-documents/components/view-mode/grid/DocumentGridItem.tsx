import { cn } from '@/utils'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import GridItemImportantButton from './GridItemImportantButton'
import GridItemOptionsButton from './GridItemOptionsButton'
import GridItemIcon from './GridItemIcon'
import GridItemTitle from './GridItemTitle'
import GridItemSubtitle from './GridItemSubtitle'
import { Flex } from '@radix-ui/themes'

export type ProjectDocumentGridItemProps = {
  item: RealestateLibraryFileRead
  isSelected: boolean
  isImportant: boolean
  isPendingDelete?: boolean
  isDragOverTarget?: boolean
  onSelect: (event: React.MouseEvent) => void
  onSelectKeyDown: (event: React.KeyboardEvent) => void
  onDoubleClick: () => void
  onContextMenu: (event: React.MouseEvent) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (event: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop: (event: React.DragEvent) => void
  onToggleImportant: (value: boolean) => void
  onOpenOptionsMenu: (event: React.MouseEvent) => void
}

export default function DocumentGridItem({
  item,
  isSelected,
  isImportant,
  isPendingDelete = false,
  isDragOverTarget = false,
  onSelect,
  onSelectKeyDown,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggleImportant,
  onOpenOptionsMenu,
}: ProjectDocumentGridItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      data-document-id={item.id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onKeyDown={onSelectKeyDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-document-item="true"
      className={cn(
        'relative',
        'group',
        'rounded-sm',
        'p-4',
        'bg-background-1',
        'text-left sm:h-[140px] sm:w-[120px]',
        'w-full',
        'flex flex-col justify-between',
        'transition-opacity duration-200',
        isPendingDelete && 'pointer-events-none opacity-40',
        isDragOverTarget
          ? 'border-action-primary-red-default bg-data-light-grey-hover ring-action-primary-red-default/30 border-[1px] ring-1'
          : isSelected
            ? 'bg-background-3 focus-visible:bg-background-3'
            : 'hover:bg-data-light-grey-hover focus-visible:bg-data-light-grey-focus focus-visible:outline-action-outline-default'
      )}
    >
      <GridItemImportantButton isImportant={isImportant} onToggle={onToggleImportant} />
      <GridItemOptionsButton onOpenOptionsMenu={onOpenOptionsMenu} />
      <GridItemIcon item={item} />
      <Flex direction={'column'} justify={'between'} align={'center'} className={'h-full'}>
        <GridItemTitle name={item.name} />
        <GridItemSubtitle item={item} />
      </Flex>
    </div>
  )
}
