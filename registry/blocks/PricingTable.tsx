import React from 'react';

export interface PricingPhase {
  phase: string;
  timing: string;
  percent: string;
  note: string;
}

export interface PricingTableProps {
  title: string;
  subtitle?: string;
  discountText?: string;
  phases: PricingPhase[];
}

export const PricingTable: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  discountText,
  phases = [],
}) => {
  return (
    <section className="bg-slate-50 py-16 px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs md:text-sm text-slate-500">{subtitle}</p>}
          {discountText && (
            <div className="inline-block bg-rose-50 border border-rose-200 text-[#B32B2F] px-4 py-1.5 rounded-full text-xs font-bold mt-2">
              {discountText}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="p-3.5">Đợt</th>
                <th className="p-3.5">Thời hạn thanh toán</th>
                <th className="p-3.5 text-center">Tỷ lệ</th>
                <th className="p-3.5">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {phases.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-[#B32B2F]">{row.phase}</td>
                  <td className="p-3.5 font-medium">{row.timing}</td>
                  <td className="p-3.5 text-center font-black text-sm">{row.percent}</td>
                  <td className="p-3.5 text-slate-500">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export const PricingTableConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả' },
    discountText: { type: 'text' as const, label: 'Ưu đãi nổi bật' },
    phases: {
      type: 'array' as const,
      label: 'Các đợt thanh toán',
      arrayFields: {
        phase: { type: 'text' as const, label: 'Đợt' },
        timing: { type: 'text' as const, label: 'Thời hạn' },
        percent: { type: 'text' as const, label: 'Tỷ lệ %' },
        note: { type: 'text' as const, label: 'Ghi chú' },
      },
    },
  },
  defaultProps: {
    title: 'Tiến Độ Thanh Toán & Chính Sách Bán Hàng',
    subtitle: 'Chính sách tài chính linh hoạt giúp khách hàng dễ dàng sở hữu căn hộ mơ ước.',
    discountText: '🔥 Chiết khấu thanh toán sớm lên tới 12% + Quà tặng nội thất 150 triệu',
    phases: [
      { phase: 'Đợt 1', timing: 'Ký HĐMB (Sau 7 ngày cọc)', percent: '15%', note: 'Bao gồm tiền đặt cọc ban đầu' },
      { phase: 'Đợt 2', timing: 'Sau 60 ngày kể từ Đợt 1', percent: '10%', note: 'Thanh toán theo tiến độ xây dựng' },
      { phase: 'Đợt 3', timing: 'Sau 120 ngày kể từ Đợt 1', percent: '10%', note: 'Hoàn thành cất nóc dự án' },
      { phase: 'Đợt 4', timing: 'Nhận bàn giao nhà', percent: '45%', note: 'Ngân hàng hỗ trợ vay 70% 0% lãi suất' },
      { phase: 'Đợt 5', timing: 'Nhận sổ hồng (GCNQSDĐ)', percent: '5%', note: 'Bàn giao giấy chứng nhận sở hữu' },
    ],
  },
  render: PricingTable,
};
