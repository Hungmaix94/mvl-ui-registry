import { TIcon } from '@/types/common.ts'

function IconPlaceholder({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.5 3C20.3284 3 21 3.67157 21 4.5V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V4.5C3 3.67157 3.67157 3 4.5 3H19.5ZM4.5 19.5H18.4395L4.5 5.56055V19.5ZM19.5 18.4395V4.5H5.56055L19.5 18.4395Z" />
    </svg>
  )
}

export { IconPlaceholder }
