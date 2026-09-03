import { TIcon } from '@/types/common.ts'

function IconNumberone({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M11.959 2.37598C12.189 2.22267 12.4847 2.20852 12.7285 2.33887C12.9723 2.46941 13.125 2.72347 13.125 3V21C13.1249 21.4141 12.7891 21.75 12.375 21.75C11.9608 21.75 11.6251 21.4141 11.625 21V4.40039L8.29102 6.62305C7.9465 6.85256 7.48077 6.75929 7.25098 6.41504C7.02136 6.07046 7.11457 5.60477 7.45898 5.375L11.959 2.37598Z" />
    </svg>
  )
}

export { IconNumberone }
