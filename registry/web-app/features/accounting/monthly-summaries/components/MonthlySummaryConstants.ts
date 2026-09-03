export enum SourceRole {
  SALE = 'SALE',
  MGMT = 'MGMT',
  F2 = 'F2',
  PROMO = 'PROMO',
  SLK = 'SLK',
  HHQL = 'HHQL',
  BACKOFFICE = 'BACKOFFICE',
  BONUS = 'BONUS',
  PROJECT_DIRECTOR = 'PROJECT_DIRECTOR',
  // Khấu trừ hoa hồng để thưởng cho người khác + khấu trừ vĩnh viễn (tiền ở lại công ty).
  // Role riêng theo từng rổ nguồn để đợt chi (wave) suy được từ nguồn tiền.
  TRANSFER_OUT_HHQL = 'TRANSFER_OUT_HHQL',
  TRANSFER_IN_HHQL = 'TRANSFER_IN_HHQL',
  DEDUCTION_HHQL = 'DEDUCTION_HHQL',
}

export enum MonthlyStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
}

export enum BeneficiaryType {
  EMPLOYEE = 'EMPLOYEE',
  COLLABORATOR = 'COLLABORATOR',
  EXCHANGE = 'EXCHANGE',
}

export const ROLE_COLORS: Record<string, string> = {
  [SourceRole.SALE]: 'bg-emerald-500',
  [SourceRole.MGMT]: 'bg-sky-500',
  [SourceRole.F2]: 'bg-purple-500',
  [SourceRole.PROMO]: 'bg-indigo-500',
  [SourceRole.SLK]: 'bg-cyan-500',
  [SourceRole.HHQL]: 'bg-teal-500',
  [SourceRole.BACKOFFICE]: 'bg-orange-500',
  [SourceRole.BONUS]: 'bg-rose-500',
  [SourceRole.PROJECT_DIRECTOR]: 'bg-sky-500',
  [SourceRole.TRANSFER_OUT_HHQL]: 'bg-rose-600',
}

export const ROLE_BORDER_COLORS: Record<string, string> = {
  [SourceRole.SALE]: 'border-emerald-500',
  [SourceRole.MGMT]: 'border-sky-500',
  [SourceRole.F2]: 'border-purple-500',
  [SourceRole.PROMO]: 'border-indigo-500',
  [SourceRole.SLK]: 'border-cyan-500',
  [SourceRole.HHQL]: 'border-teal-500',
  [SourceRole.BACKOFFICE]: 'border-orange-500',
  [SourceRole.BONUS]: 'border-rose-500',
  [SourceRole.PROJECT_DIRECTOR]: 'border-sky-500',
  [SourceRole.TRANSFER_OUT_HHQL]: 'border-rose-600',
}

export const ROLE_LABELS: Record<string, string> = {
  [SourceRole.SALE]: 'HH bán hàng cá nhân',
  [SourceRole.MGMT]: 'Thưởng HH quản lý',
  [SourceRole.F2]: 'HH theo tháng — F2',
  [SourceRole.PROMO]: 'HH Đầu tư, Xúc tiến & PT Dự án',
  [SourceRole.SLK]: 'HH Sàn liên kết',
  [SourceRole.HHQL]: 'HHQL / KPI phòng ban',
  [SourceRole.BACKOFFICE]: 'HH Backoffice',
  [SourceRole.BONUS]: 'Thưởng',
  [SourceRole.PROJECT_DIRECTOR]: 'HH GĐ dự án',
  [SourceRole.TRANSFER_OUT_HHQL]: 'Khấu trừ HHQL để thưởng cho người khác',
  [SourceRole.TRANSFER_IN_HHQL]: 'Thưởng từ khấu trừ HHQL của người khác',
  [SourceRole.DEDUCTION_HHQL]: 'Khấu trừ HHQL',
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  [SourceRole.SALE]: 'Cộng tổng tất cả deal đã thu tiền có Sale này tham gia closing',
  [SourceRole.MGMT]: 'Tổng nhóm B (HH Quản lý bổ sung) trên các deal có vai trò QL',
  [SourceRole.F2]: 'Hoa hồng F2',
  [SourceRole.PROMO]: 'Hoa hồng Đầu tư, Xúc tiến & Phát triển Dự án',
  [SourceRole.SLK]: 'Hoa hồng Sàn liên kết',
  [SourceRole.HHQL]: 'Hoa hồng quản lý KPI phòng ban',
  [SourceRole.BACKOFFICE]: 'Hoa hồng hỗ trợ văn phòng/backoffice',
  [SourceRole.BONUS]: 'Tổng thưởng thực chi trong kỳ',
  [SourceRole.PROJECT_DIRECTOR]: 'Hoa hồng Giám đốc dự án (chi/đòi lại lũy kế)',
}

export interface CompositionLine {
  key: string
  label: string
  amount: number
  link?: string
}
