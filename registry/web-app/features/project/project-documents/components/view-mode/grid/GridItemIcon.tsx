import { IconDownloadsimple } from '@/assets/icons'
import { cn } from '@/utils'
import DocumentIconTypeFile from '@/features/project/_shares/components/DocumentIconTypeFile.svg'
import DocumentIconTypeFolder from '@/features/project/_shares/components/DocumentIconTypeFolder.svg'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { Button } from '@/components/ui'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

type GridItemIconProps = {
  item: RealestateLibraryFileRead
}

type ItemWithUrls = RealestateLibraryFileRead & {
  download_url?: string
  view_url?: string
}

function getFileUrl(item: RealestateLibraryFileRead): string | null {
  const withUrls = item as ItemWithUrls
  const url = withUrls.download_url ?? withUrls.view_url
  return typeof url === 'string' && url.trim() ? url : null
}

export default function GridItemIcon({ item }: GridItemIconProps) {
  const isFolder = item.node_type === ElibraryNodeType.folder

  return (
    <div className={cn('relative', 'flex items-center justify-center', 'mb-1')}>
      {isFolder ? (
        <img src={DocumentIconTypeFolder} alt="Thư mục" className="h-16 w-full" />
      ) : (
        <img src={DocumentIconTypeFile} alt="Tệp" className="h-16 w-full" />
      )}
      {!isFolder && (
        <>
          <Button
            variant={'text'}
            iconOnly
            title="Tải xuống"
            size={'small'}
            onClick={(e) => {
              e.stopPropagation()
              const url = getFileUrl(item)
              if (url) {
                window.open(url, '_blank', 'noopener,noreferrer')
              }
            }}
            className={cn(
              'absolute',
              'top-1/2 left-1/2 -translate-1/2',
              'opacity-0 transition-opacity group-hover:opacity-100',
              'p-0'
            )}
          >
            <IconDownloadsimple
              size={14}
              className={cn(
                'text-content-dark-3 bg-transparent',
                'hover:text-content-dark-1 transition-all duration-500 hover:scale-150'
              )}
            />
          </Button>
        </>
      )}
    </div>
  )
}
