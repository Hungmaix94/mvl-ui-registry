import { TIcon } from '@/types/common.ts'

function IconAligncenterhorizontal({
  size = 24,
  color = 'currentColor',
  title = '',
  ...props
}: TIcon) {
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
      <path d="M12 2.24902C12.4142 2.24902 12.75 2.58579 12.75 3V4.5H17.25C18.0784 4.5 18.75 5.17157 18.75 6V9.75C18.75 10.5784 18.0784 11.25 17.25 11.25H12.75V12.75H19.5C20.3284 12.75 21 13.4216 21 14.25V18C21 18.8284 20.3284 19.5 19.5 19.5H12.75V21C12.7497 21.414 12.4141 21.75 12 21.75C11.5859 21.75 11.2503 21.414 11.25 21V19.5H4.5C3.67157 19.5 3 18.8284 3 18V14.25C3 13.4216 3.67157 12.75 4.5 12.75H11.25V11.25H6.75C5.92157 11.25 5.25 10.5784 5.25 9.75V6C5.25 5.17157 5.92157 4.5 6.75 4.5H11.25V3C11.25 2.58579 11.5858 2.24902 12 2.24902ZM4.5 18H19.5V14.25H4.5V18ZM6.75 9.75H17.25V6H6.75V9.75Z" />
    </svg>
  )
}

export { IconAligncenterhorizontal }
