import { TIcon } from '@/types/common.ts'

function IconColumns({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M9.75 3C10.5784 3 11.25 3.67157 11.25 4.5V19.5C11.25 20.3284 10.5784 21 9.75 21H6C5.17157 21 4.5 20.3284 4.5 19.5V4.5C4.5 3.67157 5.17157 3 6 3H9.75ZM18 3C18.8284 3 19.5 3.67157 19.5 4.5V19.5C19.5 20.3284 18.8284 21 18 21H14.25C13.4216 21 12.75 20.3284 12.75 19.5V4.5C12.75 3.67157 13.4216 3 14.25 3H18ZM6 19.5H9.75V4.5H6V19.5ZM14.25 19.5H18V4.5H14.25V19.5Z" />
    </svg>
  )
}

export { IconColumns }
