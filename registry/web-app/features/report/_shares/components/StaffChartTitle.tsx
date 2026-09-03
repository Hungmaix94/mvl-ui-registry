import { Flex, Text } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { IconDownloadsimple } from '@/assets/icons'

const StaffChartTitle = ({
  title,
  subTitle,
  subTitleTooltip,
  handleDownload,
}: {
  title: string
  subTitle?: string
  subTitleTooltip?: string
  handleDownload?: () => void
}) => {
  return (
    <>
      <Flex justify={'between'} className={'w-full'}>
        <Flex direction={'column'} gap={'2'}>
          <Text className={'typo-body-xl-semibold text-content-dark-1'}>{title}</Text>
          {subTitle && (
            <Text
              className={'typo-body-base-medium text-content-dark-2'}
              title={subTitleTooltip ?? subTitle}
            >
              {subTitle}
            </Text>
          )}
        </Flex>

        {handleDownload && (
          <Button
            variant={'secondary-border'}
            iconOnly
            leftIcon={<IconDownloadsimple />}
            onClick={handleDownload}
            className={'border-border-1 text-content-dark-3 size-[32px]'}
          />
        )}
      </Flex>
    </>
  )
}

export default StaffChartTitle
