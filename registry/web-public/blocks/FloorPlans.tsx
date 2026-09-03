import React from 'react';

export interface FloorPlanItem {
  name: string;
  area: string;
  bedrooms: string;
  price: string;
  image: string;
}

export interface FloorPlansProps {
  title: string;
  subtitle?: string;
  plans: FloorPlanItem[];
}

export const FloorPlans: React.FC<FloorPlansProps> = ({
  title,
  subtitle,
  plans = [],
}) => {
  return (
    <section className="bg-white py-16 px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs md:text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs space-y-4 p-4 hover:border-[#B32B2F] transition-all"
            >
              <div className="aspect-4/3 overflow-hidden rounded-lg bg-slate-100">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                <div className="mt-2 flex justify-between text-xs text-slate-500 border-y border-slate-100 py-2">
                  <span>
                    Diện tích: <strong className="text-slate-700">{p.area}</strong>
                  </span>
                  <span>{p.bedrooms}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-black text-[#B32B2F]">{p.price}</span>
                  <button type="button" className="text-xs font-bold text-[#B32B2F] hover:underline cursor-pointer">
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FloorPlansConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả' },
    plans: {
      type: 'array' as const,
      label: 'Danh sách mặt bằng',
      arrayFields: {
        name: { type: 'text' as const, label: 'Tên căn hộ' },
        area: { type: 'text' as const, label: 'Diện tích' },
        bedrooms: { type: 'text' as const, label: 'Số phòng ngủ' },
        price: { type: 'text' as const, label: 'Khoảng giá' },
        image: { type: 'text' as const, label: 'URL Ảnh mặt bằng' },
      },
    },
  },
  defaultProps: {
    title: 'Mặt Bằng Căn Hộ Điển Hình',
    subtitle: 'Thiết kế thông minh tối ưu diện tích đón ánh sáng tự nhiên và gió trời.',
    plans: [
      {
        name: 'Căn Hộ 1 Phòng Ngủ + 1',
        area: '48.5 m²',
        bedrooms: '1 PN + 1 Đa năng',
        price: 'Từ 2.4 Tỷ',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: 'Căn Hộ 2 Phòng Ngủ 2WC',
        area: '69.2 m²',
        bedrooms: '2 Phòng ngủ, 2 WC',
        price: 'Từ 3.6 Tỷ',
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: 'Căn Hộ 3 Phòng Ngủ Góc',
        area: '98.6 m²',
        bedrooms: '3 Phòng ngủ, 2 WC',
        price: 'Từ 5.2 Tỷ',
        image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },
  render: FloorPlans,
};
