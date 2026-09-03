import { IconBookmarksimple } from '@/assets/icons'
import { Button } from '@/components/ui'
import BookmarkSimpleSvg from '@/features/project/_shares/components/BookmarkSimple.svg'
import { cn } from '@/utils'

type GridItemImportantButtonProps = {
  isImportant: boolean
  onToggle: (value: boolean) => void
}

export default function GridItemImportantButton({
  isImportant,
  onToggle,
}: GridItemImportantButtonProps) {
  if (isImportant) {
    return (
      <>
        <Button
          variant={'text'}
          iconOnly
          size={'large'}
          title="Ấn vào để: Bỏ đánh dấu quan trọng"
          onClick={(e) => {
            e.stopPropagation()
            onToggle(false)
          }}
          className={cn(
            'absolute top-0 left-1',
            'size-fit min-w-fit p-0',
            'opacity-100 transition-all duration-300 hover:opacity-90'
          )}
        >
          <img src={BookmarkSimpleSvg} alt="Đã đánh dấu quan trọng" className={cn('h-5')} />
        </Button>
      </>
    )
  }
  return (
    <>
      <Button
        variant={'text'}
        iconOnly
        size={'large'}
        onClick={(e) => {
          e.stopPropagation()
          onToggle(true)
        }}
        title="Ấn vào để: Đánh dấu quan trọng"
        className={cn(
          'absolute -top-1 left-1',
          'size-fit min-w-fit p-0',
          'opacity-0 transition-all group-hover:opacity-100 hover:opacity-80'
        )}
      >
        <IconBookmarksimple size={24} color="var(--color-action-primary-red-default)" />
      </Button>
    </>
  )
}
