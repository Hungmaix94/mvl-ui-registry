import { TIcon } from '@/types/common.ts'

function IconRadical({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M21.75 6C22.1642 6 22.4999 6.33584 22.5 6.75V9C22.5 9.41421 22.1642 9.75 21.75 9.75C21.3358 9.74994 21 9.41417 21 9V7.5H11.7695L7.45215 19.0137C7.34229 19.3062 7.06252 19.5 6.75 19.5C6.43753 19.5 6.15769 19.3062 6.04785 19.0137L1.54785 7.01367C1.40256 6.626 1.59879 6.19342 1.98633 6.04785C2.37401 5.90247 2.80654 6.0988 2.95215 6.48633L6.75 16.6133L10.5479 6.48633L10.5967 6.38184C10.728 6.14862 10.9765 6.00004 11.25 6H21.75Z" />
    </svg>
  )
}

export { IconRadical }
