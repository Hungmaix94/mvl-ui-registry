import { TIcon } from '@/types/common.ts'

function IconList({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.5 12.75C20.3284 12.75 21 13.4216 21 14.25V18C21 18.8284 20.3284 19.5 19.5 19.5H4.5C3.67157 19.5 3 18.8284 3 18V14.25C3 13.4216 3.67157 12.75 4.5 12.75H19.5ZM4.5 18H19.5V14.25H4.5V18ZM19.5 4.5C20.3284 4.5 21 5.17157 21 6V9.75C21 10.5784 20.3284 11.25 19.5 11.25H4.5C3.67157 11.25 3 10.5784 3 9.75V6C3 5.17157 3.67157 4.5 4.5 4.5H19.5ZM4.5 9.75H19.5V6H4.5V9.75Z" />
    </svg>
  )
}

export { IconList }
