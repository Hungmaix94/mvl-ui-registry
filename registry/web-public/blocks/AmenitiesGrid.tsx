import React from 'react';

export interface AmenityItem {
  icon: string;
  name: string;
  desc: string;
}

export interface AmenitiesGridProps {
  title: string;
  subtitle?: string;
  columns?: number;
  amenities: AmenityItem[];
}

export const AmenitiesGrid: React.FC<AmenitiesGridProps> = ({
  title,
  subtitle,
  columns = 3,
  amenities = [],
}) => {
  return (
    <section className="bg-slate-50 py-16 px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs md:text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${columns || 3} gap-5`}>
          {amenities.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-all space-y-2"
            >
              <div className="text-3xl">{item.icon}</div>
              <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const AmenitiesGridConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả' },
    columns: {
      type: 'select' as const,
      label: 'Số cột hiển thị',
      options: [
        { label: '2 Cột', value: 2 },
        { label: '3 Cột', value: 3 },
        { label: '4 Cột', value: 4 },
      ],
    },
    amenities: {
      type: 'array' as const,
      label: 'Danh sách tiện ích',
      arrayFields: {
        icon: { type: 'text' as const, label: 'Icon' },
        name: { type: 'text' as const, label: 'Tên tiện ích' },
        desc: { type: 'text' as const, label: 'Mô tả chi tiết' },
      },
    },
  },
  defaultProps: {
    title: 'Hệ Sinh Thái Tiện Ích Đẳng Cấp 5 Sao',
    subtitle: 'Trải nghiệm không gian sống nghỉ dưỡng tiện nghi mỗi ngày ngay thềm nhà.',
    columns: 3,
    amenities: [
      { icon: '🏊‍♂️', name: 'Hồ bơi vô cực điện phân muối', desc: 'Quy mô 1000m² đạt chuẩn Olympic với quầy bar nước.' },
      { icon: '🌳', name: 'Công viên cây xanh 36ha', desc: 'Lá phổi xanh điều hòa không khí và đường dạo bộ ven sông.' },
      { icon: '🏋️‍♂️', name: 'Phòng Gym & Yoga Panorama', desc: 'Trang thiết bị chuẩn Technogym nhập khẩu Châu Âu.' },
      { icon: '🛍️', name: 'TTTM Vincom Mega Mall', desc: 'Tổ hợp mua sắm, ẩm thực và rạp chiếu phim giải trí đỉnh cao.' },
      { icon: '🏫', name: 'Hệ thống trường Vinschool', desc: 'Giáo dục quốc tế liên cấp từ mầm non đến THPT.' },
      { icon: '🏥', name: 'Bệnh viện Vinmec 5 sao', desc: 'Chăm sóc sức khỏe toàn diện 24/7 với đội ngũ y bác sĩ đầu ngành.' },
    ],
  },
  render: AmenitiesGrid,
};
