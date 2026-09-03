import { TIcon } from '@/types/common.ts'

function IconAlignleft({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M3.75 2.99902C4.16399 2.99929 4.5 3.33595 4.5 3.75V20.25C4.49974 20.6638 4.16383 20.9997 3.75 21C3.33595 21 2.99929 20.664 2.99902 20.25V3.75C2.99902 3.33579 3.33579 2.99902 3.75 2.99902ZM20.25 12.75C21.0784 12.75 21.75 13.4216 21.75 14.25V18C21.75 18.8284 21.0784 19.5 20.25 19.5H7.5C6.67157 19.5 6 18.8284 6 18V14.25C6 13.4216 6.67157 12.75 7.5 12.75H20.25ZM7.5 18H20.25V14.25H7.5V18ZM16.5 4.5C17.3284 4.5 18 5.17157 18 6V9.75C18 10.5784 17.3284 11.25 16.5 11.25H7.5C6.67157 11.25 6 10.5784 6 9.75V6C6 5.17157 6.67157 4.5 7.5 4.5H16.5ZM7.5 9.75H16.5V6H7.5V9.75Z" />
    </svg>
  )
}

export { IconAlignleft }
