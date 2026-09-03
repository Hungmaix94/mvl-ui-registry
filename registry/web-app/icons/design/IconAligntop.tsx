import { TIcon } from '@/types/common.ts'

function IconAligntop({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M9.75 6C10.5784 6 11.25 6.67157 11.25 7.5V20.25C11.25 21.0784 10.5784 21.75 9.75 21.75H6C5.17157 21.75 4.5 21.0784 4.5 20.25V7.5C4.5 6.67157 5.17157 6 6 6H9.75ZM6 20.25H9.75V7.5H6V20.25ZM18 6C18.8284 6 19.5 6.67157 19.5 7.5V16.5C19.5 17.3284 18.8284 18 18 18H14.25C13.4216 18 12.75 17.3284 12.75 16.5V7.5C12.75 6.67157 13.4216 6 14.25 6H18ZM14.25 16.5H18V7.5H14.25V16.5ZM20.251 2.99902C20.665 2.99929 21.001 3.33595 21.001 3.75C21.0007 4.16383 20.6648 4.49974 20.251 4.5H3.75098C3.33693 4.5 3.00026 4.16399 3 3.75C3 3.33579 3.33676 2.99902 3.75098 2.99902H20.251Z" />
    </svg>
  )
}

export { IconAligntop }
