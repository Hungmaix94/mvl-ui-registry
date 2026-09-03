import { cn } from '@/utils'
import Button from '../button/Button'
import {
  IconCaretdown,
  IconExport,
  IconFadershorizontal,
  IconFilepdf,
  IconFunnel,
  IconListplus,
  IconMagnifyingglass,
  IconPlus,
  IconTable,
} from '@/assets/icons'
import { TextField } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { Popover } from 'radix-ui'
import AmountBadge from '@/components/ui/badge/amount-badge.tsx'

export type PageTitleToolbarProps = {
  handleSearch?: (e: any) => void
  searchPlaceholder?: string
  searchClassName?: string
  searchValue?: string

  handleFilter?: (e: any) => void
  filterBadgeCount?: number

  handleConfigTableColumn?: (e: any) => void
  titleConfigTableColumn?: string

  handleExportBtnFull?: (e: any) => void
  titleExportBtnIcon?: string

  handleImportBtnFull?: (e: any) => void
  handleImportPdf?: (e: any) => void
  handleImportExcel?: (e: any) => void

  handleCreateNew?: (e: any) => void
  titleCreateNew?: string

  /** Custom content on the right; when set, replaces default action buttons (Export, Import, Create) */
  rightContent?: React.ReactNode
  /** Custom content on the left, rendered next to Search and Filter buttons */
  leftContent?: React.ReactNode
}

function PageTitleToolbar({
  handleSearch,
  searchPlaceholder,
  searchClassName,
  searchValue,
  handleFilter,
  filterBadgeCount,
  handleConfigTableColumn,
  titleConfigTableColumn,
  handleExportBtnFull,
  titleExportBtnIcon,
  handleImportBtnFull,
  handleImportPdf,
  handleImportExcel,
  handleCreateNew,
  titleCreateNew,
  rightContent,
  leftContent,
}: PageTitleToolbarProps) {
  return (
    <Flex
      width={'100%'}
      justify={'between'}
      align={{ md: 'start', lg: 'center' }}
      py={'0'}
      className="flex-col gap-3 lg:flex-row lg:gap-0"
    >
      {/* Search and Filter */}
      <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
        {leftContent}

        {handleSearch && (
          <TextField
            prefix={<IconMagnifyingglass size={16} />}
            placeholder={searchPlaceholder || 'Tìm kiếm'}
            value={searchValue}
            onChange={handleSearch}
            // `min-w-[200px]` là sàn co, đặt trước `searchClassName` để call site vẫn đè được
            // `width` (tailwind-merge chỉ gộp cùng thuộc tính, `min-width` là thuộc tính khác).
            // Ô input bên trong mang `min-w-0`, nên cả hộp tìm kiếm mất cái sàn ngầm mà kích
            // thước nội tại của input vẫn dựng cho nó; hàng này `md:flex-nowrap` và hai nút bên
            // cạnh đều `text-nowrap`, nghĩa là ô tìm kiếm là item duy nhất co được và sẽ nuốt
            // trọn phần tràn — co dần về mỗi cái kính lúp. 200px thấp hơn sàn ngầm cũ (~215px)
            // nên không màn nào chật hơn trước.
            className={cn('min-w-[200px]', searchClassName)}
          />
        )}

        {handleFilter && (
          <Button
            variant="secondary"
            leftIcon={
              <IconFunnel
                size={14}
                className={cn(
                  filterBadgeCount && filterBadgeCount > 0 && 'text-action-primary-red-default'
                )}
              />
            }
            rightIcon={
              filterBadgeCount && filterBadgeCount > 0 ? (
                <AmountBadge amount={filterBadgeCount} />
              ) : (
                <IconCaretdown size={14} />
              )
            }
            className={cn(
              'text-nowrap',
              'bg-data-light-grey-default',
              'hover:bg-data-light-grey-hover',
              'text-content-dark-3',
              'typo-body-sm-medium',
              'hover:text-content-dark-1',
              'border-border-1 border',
              'h-10',
              filterBadgeCount &&
                filterBadgeCount > 0 &&
                'bg-action-primary-red-activated border-action-primary-red-default text-action-primary-red-default hover:text-action-primary-red-default'
            )}
            childrenClassName={cn(
              'typo-body-sm-medium',
              filterBadgeCount && filterBadgeCount > 0 && 'text-data-red-default'
            )}
            onClick={handleFilter}
          >
            Bộ lọc
          </Button>
        )}

        {handleConfigTableColumn && (
          <Button
            variant={'secondary'}
            size={'large'}
            iconOnly
            leftIcon={<IconFadershorizontal size={14} />}
            title={titleConfigTableColumn || 'Ấn để chỉnh sửa cột trong bảng'}
            onClick={handleConfigTableColumn}
            className={'bg-data-light-grey-hover'}
          />
        )}
      </div>

      {/* Action Buttons or custom right content */}
      <div className="flex items-center gap-2">
        {rightContent != null ? (
          rightContent
        ) : (
          <>
            {handleExportBtnFull && (
              <Button
                variant={'secondary'}
                size={'small'}
                leftIcon={<IconExport />}
                onClick={handleExportBtnFull}
                className={'bg-data-light-grey-hover'}
                title={titleExportBtnIcon || 'Xuất file'}
              >
                Xuất file
              </Button>
            )}
            {handleImportBtnFull && (
              <Popover.Root>
                <Popover.Trigger>
                  <Button
                    variant={'secondary'}
                    size={'small'}
                    leftIcon={<IconListplus />}
                    onClick={handleImportBtnFull}
                    className={'bg-data-light-grey-hover'}
                    title={'Nhập file'}
                  >
                    Nhập file
                  </Button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    className={cn(
                      'w-fit',
                      'rounded bg-white',
                      'will-change-[transform,opacity]',
                      'data-[state=open]:data-[side=bottom]:animate-slideUpAndFade',
                      'data-[state=open]:data-[side=left]:animate-slideRightAndFade',
                      'data-[state=open]:data-[side=right]:animate-slideLeftAndFade',
                      'data-[state=open]:data-[side=top]:animate-slideDownAndFade'
                    )}
                    sideOffset={5}
                  >
                    <Flex direction={'column'} gap={'0'}>
                      {handleImportPdf && (
                        <Button
                          leftIcon={<IconFilepdf />}
                          onClick={handleImportPdf}
                          size={'small'}
                          variant={'secondary'}
                          className={'bg-transparent'}
                          title={'Nhập PDF'}
                        >
                          PDF
                        </Button>
                      )}

                      {handleImportExcel && (
                        <Button
                          leftIcon={<IconTable />}
                          onClick={handleImportExcel}
                          size={'small'}
                          variant={'secondary'}
                          className={'bg-transparent'}
                          title={'Nhập Excel'}
                        >
                          Excel
                        </Button>
                      )}
                    </Flex>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
            {handleCreateNew && (
              <Button
                variant={'primary'}
                size={'small'}
                leftIcon={<IconPlus />}
                onClick={handleCreateNew}
                className={'typo-body-sm-medium'}
                title={titleCreateNew || 'Tạo mới'}
              >
                {titleCreateNew || 'Tạo mới'}
              </Button>
            )}
          </>
        )}
      </div>
    </Flex>
  )
}

PageTitleToolbar.displayName = 'PageTitleToolbar'

export default PageTitleToolbar
