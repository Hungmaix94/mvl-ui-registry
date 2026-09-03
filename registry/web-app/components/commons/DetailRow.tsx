import { Flex } from '@radix-ui/themes'
import { Text } from '@/components/ui'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils'

type DetailRowProps = {
  label: string
  value: string | ReactNode | null | undefined
  type?: 'link'
  link?: string
  isDisplayInlineRow?: boolean
  labelClassName?: string
  className?: string
  hideBottomBorder?: boolean
}

const DetailRow = ({
  label,
  value,
  type,
  link,
  isDisplayInlineRow = true,
  labelClassName,
  className,
  hideBottomBorder,
}: DetailRowProps) => {
  const displayValue = value || '-'
  const isStringValue = typeof displayValue === 'string'

  return (
    <>
      <Flex
        direction={isDisplayInlineRow ? 'row' : 'column'}
        gap="5"
        align={isStringValue ? 'center' : 'start'}
        py="4"
        className={cn(!hideBottomBorder && 'border-border-1 border-b last:border-b-0', className)}
      >
        <Text
          className={cn(
            'typo-body-base-medium text-content-dark-3 min-w-[170px] shrink-0',
            labelClassName
          )}
        >
          {label}
        </Text>
        {type === 'link' && displayValue && displayValue !== '-' ? (
          <>
            <Link to={link || ''} className="text-action-primary-default hover:underline">
              {displayValue}
            </Link>
          </>
        ) : isStringValue ? (
          <Text
            className={cn(
              'flex-1',
              'typo-body-lg-regular',
              'text-content-dark-1',
              'text-left',
              'text-wrap break-all whitespace-normal'
            )}
          >
            {displayValue}
          </Text>
        ) : (
          <div className="typo-body-lg-regular text-content-dark-1 flex-1 text-left">
            {displayValue}
          </div>
        )}
      </Flex>
    </>
  )
}

export default DetailRow
