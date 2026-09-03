import { Flex, Grid, Text } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import { ExternalLinkIcon } from 'lucide-react'

type CheckinDetailDialogContentProps = {
  location: string
  time: string
  date?: string
  imageUrl: string
  latitude: string | null
  longitude: string | null
  reason?: string | null
}

const CheckinDetailDialogContent = ({
  location,
  time,
  date,
  imageUrl,
  latitude,
  longitude,
  reason,
}: CheckinDetailDialogContentProps) => {
  const hasReason = reason != null && reason.trim() !== ''
  const hasCoords = latitude != null && longitude != null
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${latitude},${longitude}` : null

  return (
    <div className="flex flex-col gap-5">
      <Flex gap="3" direction="column">
        <Flex gap="4" align="center" className="flex-wrap">
          <Flex gap="2" align="center" className="w-full basis-full">
            <Text className="typo-body-base-medium text-content-dark-2 shrink-0">Vị trí:</Text>
            {mapsUrl ? (
              <Button
                variant="link"
                size="small"
                className={cn(
                  'typo-body-base-medium h-auto p-0 text-left',
                  'text-action-primary-red-default no-underline',
                  'hover:text-action-primary-red-default hover:no-underline'
                )}
                onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
                title={location}
                rightIcon={<ExternalLinkIcon size={'16'} />}
              >
                {location}
              </Button>
            ) : (
              <Text className="typo-body-base-medium text-content-dark-1" title={location}>
                {location}
              </Text>
            )}
          </Flex>

          <Grid columns={'2'} className={'w-full'}>
            <Flex gap="2" align="center">
              <Text className="typo-body-base-medium text-content-dark-2">Ngày chấm công:</Text>
              <Text className="typo-body-base-medium text-content-dark-1">{date || '-'}</Text>
            </Flex>
            <Flex gap="2" align="center">
              <Text className="typo-body-base-medium text-content-dark-2">Giờ chấm công:</Text>
              <Text className="typo-body-base-medium text-content-dark-1" title={time}>
                {time || '-'}
              </Text>
            </Flex>
          </Grid>

          {hasReason && (
            <Flex gap="2" align="start" className="w-full basis-full">
              <Text className="typo-body-base-medium text-content-dark-2 shrink-0">Lý do:</Text>
              <Text
                className="typo-body-base-medium text-content-dark-1"
                title={reason ?? undefined}
              >
                {reason}
              </Text>
            </Flex>
          )}
        </Flex>
      </Flex>

      {(hasCoords || imageUrl) && (
        <div
          className={
            hasCoords && imageUrl
              ? 'grid grid-cols-2 items-center gap-3 px-3 py-0'
              : 'flex justify-center px-3 py-0'
          }
        >
          {hasCoords && (
            <iframe
              loading="lazy"
              className="h-[423px] w-full rounded object-cover"
              src={`https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
            />
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Ảnh chấm công"
              className="h-[423px] w-auto rounded object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}
    </div>
  )
}

export default CheckinDetailDialogContent
