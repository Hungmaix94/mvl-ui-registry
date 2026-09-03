import { TIcon } from '@/types/common.ts'

function IconWifinone({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M12 17.8125C12.5178 17.8125 12.9375 18.2322 12.9375 18.75C12.9375 19.2678 12.5178 19.6875 12 19.6875C11.4822 19.6875 11.0625 19.2678 11.0625 18.75C11.0625 18.2322 11.4822 17.8125 12 17.8125Z" />
    </svg>
  )
}

export { IconWifinone }
