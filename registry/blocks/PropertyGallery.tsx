import React from 'react';

export interface GalleryImageItem {
  url: string;
  caption?: string;
}

export interface PropertyGalleryProps {
  title: string;
  subtitle?: string;
  images: GalleryImageItem[];
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({
  title,
  subtitle,
  images = [],
}) => {
  return (
    <section className="bg-slate-50 py-16 px-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs md:text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="group relative aspect-4/3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs"
            >
              <img
                src={img.url}
                alt={img.caption || title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-xs font-semibold">
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const PropertyGalleryConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả' },
    images: {
      type: 'array' as const,
      label: 'Danh sách hình ảnh',
      arrayFields: {
        url: { type: 'text' as const, label: 'URL Ảnh' },
        caption: { type: 'text' as const, label: 'Chú thích' },
      },
    },
  },
  defaultProps: {
    title: 'Thư Viện Hình Ảnh Phối Cảnh & Thực Tế',
    subtitle: 'Chiêm ngưỡng kiến trúc kiệt tác và không gian sống đỉnh cao.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
        caption: 'Phối cảnh tòa tháp về đêm',
      },
      {
        url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
        caption: 'Phòng khách Panorama kính tràn',
      },
      {
        url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
        caption: 'Hồ bơi vô cực trên tầng thượng',
      },
    ],
  },
  render: PropertyGallery,
};
