import { cn } from '@/lib/utils.ts'
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { AppDialogVariant } from '@/types/app-dialog.types.ts'
import { AppDialogBaseProps } from '@/components/dialog/AppDialog.tsx'

export interface AppAlertDialogProps extends AppDialogBaseProps {
  variant: Extract<AppDialogVariant, 'alert'>
}

const AppAlertDialog = (props: AppAlertDialogProps) => {
  return (
    <>
      <div className={cn('flex-1', 'flex flex-col', 'min-h-0', 'overflow-y-auto')}>
        <DialogClose onClick={props.onCancel} />

        <DialogHeader className={cn('px-6 pt-20', 'text-center')}>
          <DialogTitle className={cn('typo-h4 text-content-dark-1')}>
            {props.title || ''}
          </DialogTitle>
          {props.titleDescription && (
            <DialogDescription className={cn('typo-body-lg-regular text-content-dark-2')}>
              {props.titleDescription}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="w-full">{props.content}</div>

        <DialogFooter className={cn('text-center', 'px-6 pb-20', 'mt-9')}>
          <Flex align={'center'} justify={'center'} gap={'4'}>
            <Button
              variant={'secondary'}
              onClick={props.onCancel}
              loading={props.loading}
              disabled={props.loading}
              size={'large'}
              className={cn('min-w-[150px] whitespace-nowrap')}
            >
              {props.cancelText || 'Huỷ'}
            </Button>
            <Button
              variant={'primary'}
              onClick={props.onConfirm}
              loading={props.loading}
              disabled={props.loading}
              size={'large'}
              className={cn('min-w-[150px] whitespace-nowrap')}
            >
              {props.confirmText || 'Xoá'}
            </Button>
          </Flex>
        </DialogFooter>
      </div>
    </>
  )
}

export default AppAlertDialog
