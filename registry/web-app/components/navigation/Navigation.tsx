import { NavigationMenu } from 'radix-ui'
import { Fragment, ReactNode } from 'react'
import { cn } from '@/utils'

type TNavigation = {
  title?: string
  trigger: ReactNode
  content: ReactNode
}

export const Navigation = ({ items }: { items: Array<TNavigation> }) => {
  return (
    <>
      <NavigationMenu.Root className={'relative z-10 flex flex-1 justify-end'}>
        <NavigationMenu.List className={'flex items-center gap-3'}>
          {items.map((item, idx) => (
            <Fragment key={idx}>
              <NavigationMenu.Item>
                <NavigationMenu.Trigger
                  className={cn(
                    'flex items-center justify-between gap-3',
                    'group leading-none outline-none select-none'
                  )}
                >
                  {item.trigger}
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="bg-data-light-grey-default absolute top-0 w-fit">
                  {item.content}
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            </Fragment>
          ))}
          <NavigationMenu.Indicator
            className={cn(
              'top-full z-10',
              'h-2.5',
              'flex items-end justify-center',
              'overflow-hidden',
              'transition-[width,transform_250ms_ease]',
              'data-[state=hidden]:animate-fadeOut',
              'data-[state=visible]:animate-fadeIn'
            )}
          >
            <div className="relative top-[70%] size-2.5 rotate-45 rounded-tl-sm bg-white" />
          </NavigationMenu.Indicator>
        </NavigationMenu.List>

        <div className="absolute top-full flex w-full justify-end perspective-[2000px]">
          <NavigationMenu.Viewport
            className={cn(
              'relative',
              'mt-2.5',
              'h-[var(--radix-navigation-menu-viewport-height)] w-full',
              'origin-[top_center] overflow-hidden',
              'border-border-1 rounded-md border-[1px] bg-white',
              'transition-[width,_height] duration-300',
              'data-[state=closed]:animate-scaleOut',
              'data-[state=open]:animate-scaleIn',
              'sm:w-[var(--radix-navigation-menu-viewport-width)]'
            )}
          />
        </div>
      </NavigationMenu.Root>
    </>
  )
}
