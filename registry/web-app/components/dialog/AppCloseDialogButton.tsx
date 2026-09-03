import { Button } from '@/components/ui'
import { IconX } from '@/assets/icons'
import { cn } from '@/utils'
import { DialogClose } from '@/components/ui/dialog.tsx'

const AppCloseDialogButton = () => {
  return (
    <>
      <DialogClose asChild>
        <Button
          variant={'secondary'}
          iconOnly
          leftIcon={<IconX size={20} />}
          className={cn(
            'bg-background-1',
            'text-content-dark-2',
            '!size-8 !min-w-fit',
            'p-2',
            'rounded-sm',
            'opacity-70 transition-opacity hover:opacity-100',
            'disabled:pointer-events-none',
            'ring-offset-background',
            'focus:ring-ring focus:border-none focus:outline-none',
            'focus-visible:border-none focus-visible:outline-none'
          )}
        />
      </DialogClose>
    </>
  )
}

export default AppCloseDialogButton
