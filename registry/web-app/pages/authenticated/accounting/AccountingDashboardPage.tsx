import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v5M8 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconReceipt() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6l-4-5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 1v5h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconCoins() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5" fill="white" />
      <path d="M6.5 4.5v4M5 6.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M1 14c0-2.761 2.239-5 5-5s5 2.239 5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M15 14c0-2.2-1.343-4-3-4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 6h8M4 8h8M4 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="8" width="2.5" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect
        x="6.75"
        y="5"
        width="2.5"
        height="9"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="10.5"
        y="2"
        width="2.5"
        height="12"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

function NavItem({
  label,
  code,
  icon,
  active,
  onClick,
}: {
  label: string
  code: string
  icon: React.ReactNode
  active?: boolean
  onClick?: () => void
}) {
  if (!active) {
    return (
      <div className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 opacity-40">
        <span className="text-gray-400">{icon}</span>
        <span className="flex-1 text-sm text-gray-400">{label}</span>
        <span className="text-xs text-gray-300">{code}</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-blue-50 hover:text-blue-700"
    >
      <span className="text-gray-500">{icon}</span>
      <span className="flex-1 text-sm text-gray-800">{label}</span>
      <span className="text-xs text-gray-400">{code}</span>
    </button>
  )
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <span className="text-gray-600">{icon}</span>
        <span className="text-sm font-semibold tracking-wide text-gray-700 uppercase">{title}</span>
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-3">{children}</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AccountingDashboardPage = () => {
  const navigate = useNavigate()

  return (
    <div className="bg-surface-primary-default flex flex-1 flex-col gap-6 overflow-auto p-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-700">
        <span className="mt-0.5 shrink-0">
          <IconInfo />
        </span>
        <span>
          Click vào sidebar bên trái để xem từng màn hình. Mỗi đối tượng gồm List + Form + Detail.
          Các mục chưa triển khai được hiển thị mờ.
        </span>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-5">
        {/* ĐỐI TÁC */}
        <CategoryCard title="Đối tác" icon={<IconUsers />}>
          <NavItem label="Cộng tác viên" code="20.1" icon={<IconDoc />} />
          <NavItem label="Hợp đồng CTV" code="20.2" icon={<IconDoc />} />
          <NavItem label="Tài khoản ngân hàng" code="20.3" icon={<IconDoc />} />
        </CategoryCard>

        {/* GIAO DỊCH */}
        <CategoryCard title="Giao dịch" icon={<IconReceipt />}>
          <NavItem
            label="Phiếu thu"
            code="20.4"
            icon={<IconReceipt />}
            active
            onClick={() => navigate(APP_PATH.RECEIPT_VOUCHER)}
          />
          <NavItem label="Phiếu chi" code="20.5" icon={<IconDoc />} />
          <NavItem label="Hóa đơn bán ra" code="20.6" icon={<IconDoc />} />
          <NavItem label="Hóa đơn đầu vào F2" code="20.7" icon={<IconDoc />} />
          <NavItem
            label="DS Giao dịch"
            code="20.8"
            icon={<IconList />}
            active
            onClick={() => navigate(APP_PATH.DEAL_PERIOD_ALLOCATION)}
          />
        </CategoryCard>

        {/* HOA HỒNG */}
        <CategoryCard title="Hoa hồng" icon={<IconCoins />}>
          <NavItem label="HH theo tháng Sale" code="20.10" icon={<IconDoc />} />
          <NavItem label="HH theo tháng F2" code="20.11" icon={<IconDoc />} />
          <NavItem label="HH theo tháng CTV" code="20.12" icon={<IconDoc />} />
          <NavItem label="HH theo doanh thu" code="20.13" icon={<IconDoc />} />
          <NavItem label="Quy định HH KPI" code="20.14" icon={<IconDoc />} />
          <NavItem label="Tạm giữ HH Sale" code="20.15" icon={<IconDoc />} />
          <NavItem
            label="Tổng kết HH"
            code="20.16"
            icon={<IconList />}
            active
            onClick={() => navigate(APP_PATH.EMPLOYEE_PAYOUT_BATCH)}
          />
        </CategoryCard>

        {/* BÁO CÁO */}
        <CategoryCard title="Báo cáo" icon={<IconChart />}>
          <NavItem label="Hoàn ứng / Tạm ứng" code="20.19" icon={<IconChart />} />
          <NavItem label="HH theo người nhận" code="20.20" icon={<IconChart />} />
          <NavItem label="Công nợ CĐT" code="20.21" icon={<IconChart />} />
          <NavItem label="Công nợ F2" code="20.22" icon={<IconChart />} />
          <NavItem label="Thanh toán HH F2/Sàn" code="20.23" icon={<IconChart />} />
        </CategoryCard>
      </div>
    </div>
  )
}

export default AccountingDashboardPage
