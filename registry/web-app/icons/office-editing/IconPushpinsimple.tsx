import { TIcon } from '@/types/common.ts'

function IconPushpinsimple({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M18 3C18.4142 3 18.75 3.33579 18.75 3.75C18.75 4.16421 18.4142 4.5 18 4.5H17.3936L19.3789 15.75H20.25C20.6642 15.75 21 16.0858 21 16.5C21 16.9142 20.6642 17.25 20.25 17.25H12.75V22.5C12.75 22.9142 12.4142 23.25 12 23.25C11.5858 23.25 11.25 22.9142 11.25 22.5V17.25H3.75C3.33579 17.25 3 16.9142 3 16.5C3 16.0858 3.33579 15.75 3.75 15.75H4.62109L6.60645 4.5H6C5.58579 4.5 5.25 4.16421 5.25 3.75C5.25 3.33579 5.58579 3 6 3H18ZM8.12891 4.5L6.14355 15.75H17.8564L15.8711 4.5H8.12891Z" />
    </svg>
  )
}

export { IconPushpinsimple }
