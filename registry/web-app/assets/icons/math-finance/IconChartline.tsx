import { TIcon } from '@/types/common.ts'

function IconChartline({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M3 3.75C3.41421 3.75 3.75 4.08579 3.75 4.5V13.3467L8.50586 9.18555C8.77257 8.95218 9.16668 8.93776 9.4502 9.15039L14.9629 13.2852L20.5059 8.43555C20.8175 8.16283 21.2917 8.19426 21.5645 8.50586C21.8372 8.81754 21.8057 9.29167 21.4941 9.56445L15.4941 14.8145C15.2274 15.0478 14.8333 15.0622 14.5498 14.8496L9.03613 10.7139L3.75 15.3398V18.75H21C21.4142 18.75 21.75 19.0858 21.75 19.5C21.75 19.9142 21.4142 20.25 21 20.25H3C2.58579 20.25 2.25 19.9142 2.25 19.5V4.5C2.25 4.08579 2.58579 3.75 3 3.75Z" />
    </svg>
  )
}

export { IconChartline }
