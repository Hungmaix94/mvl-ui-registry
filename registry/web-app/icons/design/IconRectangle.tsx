import { TIcon } from '@/types/common.ts'

function IconRectangle({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M20.251 3.75C21.0792 3.75026 21.751 4.42174 21.751 5.25V18.75C21.751 19.5783 21.0792 20.2497 20.251 20.25H3.75098C2.92255 20.25 2.25 19.5784 2.25 18.75V5.25C2.25 4.42157 2.92255 3.75 3.75098 3.75H20.251ZM3.75098 18.75H20.251V5.25H3.75098V18.75Z" />
    </svg>
  )
}

export { IconRectangle }
