import { ReactNode } from 'react'
import { cn } from '@/utils'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

const RecordDetail = ({
  label,
  content,
  labelClassName = 'w-[168px]',
  wrapperClassName = '',
  contentClassName = '',
  isShowSeparator = true,
  isRichText = false,
}: {
  label: string
  content: string | ReactNode
  wrapperClassName?: string
  labelClassName?: string
  contentClassName?: string
  isShowSeparator?: boolean
  isRichText?: boolean
}) => {
  return (
    <>
      <div className={cn('flex h-fit items-center gap-4 py-4', wrapperClassName)}>
        <p className={cn('typo-body-base-medium text-content-dark-3 text-nowrap', labelClassName)}>
          {label}
        </p>
        {isRichText ? (
          <div
            className="prose prose-sm max-w-none whitespace-pre-wrap [&_li]:leading-6 [&_p]:mb-2 [&_p]:leading-6 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1"
            dangerouslySetInnerHTML={{ __html: content as string }}
          />
        ) : (
          <p
            className={cn(
              'typo-body-lg-regular text-content-dark-1 flex-1',
              'text-left',
              'text-wrap whitespace-normal',
              contentClassName
            )}
          >
            {content}
          </p>
        )}
      </div>

      {isShowSeparator && <SeparatorHorizontal />}
    </>
  )
}

export default RecordDetail
