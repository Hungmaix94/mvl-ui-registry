import { AppDialogBaseProps } from '@/components/dialog/AppDialog.tsx'
import { cn } from '@/utils'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { FormCaption } from '@/components/ui/form'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal.tsx'
import AppCloseDialogButton from '@/components/dialog/AppCloseDialogButton.tsx'

export interface AppFilterDialogProps extends AppDialogBaseProps {
  variant: 'filter'
  clearFilterText?: string
  onClearFilter: () => void
}

const AppFilterDialog = (props: AppFilterDialogProps) => {
  return (
    <>
      {/* Header */}
      <DialogHeader>
        <Flex justify={'between'} gap={'0'} width={'100%'} className={'px-6 pt-5 pb-4'}>
          <Flex flexGrow={'1'} direction={'column'} justify={'center'} align={'start'} gap={'2'}>
            <DialogTitle className={cn('typo-h6 text-content-dark-1')}>
              {props.title || 'Bộ lọc'}
            </DialogTitle>
            {props.titleDescription && (
              <DialogDescription className={cn('typo-body-lg-regular text-content-dark-2')}>
                {props.titleDescription}
              </DialogDescription>
            )}
          </Flex>
          <AppCloseDialogButton />
        </Flex>
      </DialogHeader>

      <Flex direction={'column'} justify={'between'} gap={'2'} className="overflow-hidden">
        <SeparatorHorizontal />
        <Flex
          flexGrow={'1'}
          direction={'column'}
          className={cn('min-h-0 overflow-y-auto p-6', props.dialogContentClassName)}
        >
          {props.content}
          {/* Error Display */}
          {props.error && <FormCaption error={props.error} />}
        </Flex>
        <SeparatorHorizontal />
      </Flex>

      <DialogFooter>
        <Flex justify={'between'} width={'100%'} className={'px-6 py-4'}>
          <Button variant={'text'} disabled={props.loading} onClick={props.onClearFilter}>
            {props.clearFilterText || 'Xoá bộ lọc'}
          </Button>

          <Button
            variant="primary"
            onClick={props.onConfirm}
            disabled={props.loading || props.disableConfirm}
            size={'small'}
            loading={props.loading}
            className={cn('min-w-[150px] whitespace-nowrap')}
          >
            {props.confirmText || 'Áp dụng'}
          </Button>
        </Flex>
      </DialogFooter>
    </>
  )
}

export default AppFilterDialog
