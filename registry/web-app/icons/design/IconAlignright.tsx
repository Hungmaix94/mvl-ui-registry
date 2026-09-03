import { TIcon } from '@/types/common.ts'

function IconAlignright({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M20.251 2.99902C20.665 2.99929 21.001 3.33595 21.001 3.75V20.25C21.0007 20.6638 20.6648 20.9997 20.251 21C19.8369 21 19.5012 20.664 19.501 20.25V3.75C19.501 3.33579 19.8368 2.99902 20.251 2.99902ZM16.5 12.75C17.3284 12.75 18 13.4216 18 14.25V18C18 18.8284 17.3284 19.5 16.5 19.5H3.75C2.92157 19.5 2.25 18.8284 2.25 18V14.25C2.25 13.4216 2.92157 12.75 3.75 12.75H16.5ZM3.75 18H16.5V14.25H3.75V18ZM16.5 4.5C17.3284 4.5 18 5.17157 18 6V9.75C18 10.5784 17.3284 11.25 16.5 11.25H7.5C6.67157 11.25 6 10.5784 6 9.75V6C6 5.17157 6.67157 4.5 7.5 4.5H16.5ZM7.5 9.75H16.5V6H7.5V9.75Z" />
    </svg>
  )
}

export { IconAlignright }
