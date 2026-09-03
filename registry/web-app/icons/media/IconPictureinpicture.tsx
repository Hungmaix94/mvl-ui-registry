import { TIcon } from '@/types/common.ts'

function IconPictureinpicture({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M20.25 4.5C21.0784 4.5 21.75 5.17157 21.75 6V18C21.75 18.8284 21.0784 19.5 20.25 19.5H3.75C2.92157 19.5 2.25 18.8284 2.25 18V6C2.25 5.17157 2.92157 4.5 3.75 4.5H20.25ZM13.5 12.75V18H20.25V12.75H13.5ZM3.75 18H12V12.75C12 12.3522 12.1581 11.9708 12.4395 11.6895C12.7208 11.4081 13.1022 11.25 13.5 11.25H20.25V6H3.75V18Z" />
    </svg>
  )
}

export { IconPictureinpicture }
