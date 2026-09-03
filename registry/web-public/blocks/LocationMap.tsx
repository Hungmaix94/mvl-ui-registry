import React from 'react';
import { MapPin } from 'lucide-react';

export interface LocationMapProps {
  title: string;
  subtitle?: string;
  address: string;
  mapEmbedUrl?: string;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  title,
  subtitle,
  address,
  mapEmbedUrl,
}) => {
  return (
    <section className="bg-white py-16 px-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6 text-center">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-800">
          <MapPin size={14} className="text-[#B32B2F]" />
          <span>{address}</span>
        </div>
        <div className="aspect-16/9 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
          {mapEmbedUrl && mapEmbedUrl.startsWith('http') ? (
            <iframe
              src={mapEmbedUrl}
              title={title}
              className="w-full h-full border-0"
              loading="lazy"
            />
          ) : (
            <span className="text-xs text-slate-400">Bản đồ kết nối vệ tinh & liên kết vùng 3D</span>
          )}
        </div>
      </div>
    </section>
  );
};

export const LocationMapConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả' },
    address: { type: 'text' as const, label: 'Địa chỉ' },
    mapEmbedUrl: { type: 'text' as const, label: 'Embed URL Google Maps' },
  },
  defaultProps: {
    title: 'Vị Trí Vàng Tâm Điểm Kết Nối',
    subtitle: 'Tọa lạc tại mặt tiền đại lộ, kết nối nhanh chóng đến trung tâm tài chính và tiện ích xung quanh.',
    address: 'Mặt tiền Nguyễn Xiển, Phường Long Thạnh Mỹ, TP. Thủ Đức, TP. Hồ Chí Minh',
    mapEmbedUrl: 'https://maps.google.com',
  },
  render: LocationMap,
};
