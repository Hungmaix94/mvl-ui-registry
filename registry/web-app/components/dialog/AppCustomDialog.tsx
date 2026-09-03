import { ReactNode } from 'react'
import { AppDialogBaseProps } from '@/components/dialog/AppDialog.tsx'
import { cn } from '@/utils'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { Button } from '@/components/ui'
import { FormCaption } from '@/components/ui/form'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal.tsx'
import { Flex } from '@radix-ui/themes'
import AppCloseDialogButton from '@/components/dialog/AppCloseDialogButton.tsx'

export interface AppCustomDialogConfig extends AppDialogBaseProps {
  variant: 'custom'
  leftFooterContent?: ReactNode
  footerFlexJustify?: 'start' | 'center' | 'end' | 'between'
  isHideCancelButton: boolean
}

const AppCustomDialog = (props: AppCustomDialogConfig) => {
  const { isHideCancelButton = true, disableBackdropClose } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <Flex justify={'between'} gap={'0'} width={'100%'} className={'px-6 pt-5 pb-4'}>
          <Flex flexGrow={'1'} direction={'column'} justify={'center'} align={'start'} gap={'2'}>
            {props.title && (
              <DialogTitle className={cn('typo-h6 text-content-dark-1')}>{props.title}</DialogTitle>
            )}
            {props.titleDescription && (
              <DialogDescription className={cn('typo-body-lg-regular text-content-dark-2')}>
                {props.titleDescription}
              </DialogDescription>
            )}
          </Flex>
          {disableBackdropClose ? <>&nbsp;</> : <AppCloseDialogButton />}
        </Flex>
      </DialogHeader>

      <Flex
        direction={'column'}
        justify={'between'}
        gap={'2'}
        className={cn('px-6', props.dialogContentClassName)}
      >
        <SeparatorHorizontal />
        <Flex flexGrow={'1'} direction={'column'} className={cn('p-6', props.dialogFormClassName)}>
          {props.content}
          {/* Error Display */}
          {props.error && <FormCaption error={props.error} />}
        </Flex>
        <SeparatorHorizontal />
      </Flex>

      <DialogFooter className="px-6 py-4">
        <Flex gap={'0'} align={'center'} width={'100%'}>
          <Flex flexGrow={props.leftFooterContent ? '1' : '0'}>
            {props.leftFooterContent || <>&nbsp;</>}
          </Flex>
          <Flex
            direction={{ initial: 'column-reverse', sm: 'row' }}
            gap={{ initial: '2', sm: '2' }}
            className={!props.leftFooterContent ? 'ml-auto' : ''}
          >
            {!isHideCancelButton ? (
              <Button
                variant="secondary"
                onClick={props.onCancel}
                disabled={props.loading}
                size={'small'}
                className={cn('mt-2 sm:mt-0', 'min-w-[150px] whitespace-nowrap')}
              >
                {props.cancelText || 'Huỷ'}
              </Button>
            ) : (
              <>&nbsp;</>
            )}

            <Button
              variant="primary"
              onClick={props.onConfirm}
              disabled={props.loading || props.disableConfirm}
              size={'small'}
              loading={props.loading}
              className={cn('min-w-[150px] whitespace-nowrap')}
            >
              {props.confirmText || 'Xác nhận'}
            </Button>
          </Flex>
        </Flex>
      </DialogFooter>
    </div>
  )
}

export default AppCustomDialog
