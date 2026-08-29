import React from 'react';
import { Sparkles, MapPin, Eye } from 'lucide-react';

export interface MasterPlan3DProps {
  title: string;
  projectName: string;
  viewerType?: 'kuula_iframe' | 'photo_sphere_viewer';
  kuulaUrl?: string;
  panoramaImageUrl?: string;
  floorPlanImageUrl?: string;
  mapLocationUrl?: string;
  enable360?: boolean;
  enableFloorplan?: boolean;
  enableMap?: boolean;
}

export const MasterPlan3D: React.FC<MasterPlan3DProps> = ({
  title,
  projectName,
  kuulaUrl,
  panoramaImageUrl,
  floorPlanImageUrl,
  mapLocationUrl,
  enable360 = true,
  enableFloorplan = true,
  enableMap = true,
}) => {
  const [activeTab, setActiveTab] = React.useState<'360' | 'floorplan' | 'map'>('360');

  return (
    <section className="py-12 bg-slate-950 px-4 sm:px-6 text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
            <p className="text-xs text-slate-400 mt-1">{projectName}</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {enable360 && (
              <button
                type="button"
                onClick={() => setActiveTab('360')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === '360'
                    ? 'bg-[#B32B2F] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles size={14} />
                <span>Tổng quan 360°</span>
              </button>
            )}
            {enableFloorplan && (
              <button
                type="button"
                onClick={() => setActiveTab('floorplan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'floorplan'
                    ? 'bg-[#B32B2F] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye size={14} />
                <span>Mặt bằng phân lô</span>
              </button>
            )}
            {enableMap && (
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-[#B32B2F] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapPin size={14} />
                <span>Vị trí bản đồ</span>
              </button>
            )}
          </div>
        </div>

        {/* Viewport */}
        <div className="aspect-video w-full rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden relative flex items-center justify-center">
          {activeTab === '360' && (
            kuulaUrl && kuulaUrl.startsWith('http') ? (
              <iframe src={kuulaUrl} title="360 Viewer" className="w-full h-full border-0" allowFullScreen />
            ) : panoramaImageUrl ? (
              <img src={panoramaImageUrl} alt="360 Panorama" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400">Trình phát thực tế ảo Sa bàn 3D</span>
            )
          )}

          {activeTab === 'floorplan' && (
            floorPlanImageUrl ? (
              <img src={floorPlanImageUrl} alt="Sơ đồ mặt bằng" className="w-full h-full object-contain p-4" />
            ) : (
              <span className="text-xs text-slate-400">Chưa có sơ đồ mặt bằng</span>
            )
          )}

          {activeTab === 'map' && (
            mapLocationUrl && mapLocationUrl.startsWith('http') ? (
              <iframe src={mapLocationUrl} title="Map Location" className="w-full h-full border-0" />
            ) : (
              <span className="text-xs text-slate-400">Chưa có liên kết bản đồ vị trí</span>
            )
          )}
        </div>
      </div>
    </section>
  );
};

export const MasterPlan3DConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề khối' },
    projectName: { type: 'text' as const, label: 'Tên dự án' },
    viewerType: {
      type: 'select' as const,
      label: 'Chế độ xem 360',
      options: [
        { label: 'Kuula 360 Virtual Tour (Embed Iframe)', value: 'kuula_iframe' },
        { label: 'React Photo Sphere Viewer (WebGL Panorama)', value: 'photo_sphere_viewer' },
      ],
    },
    kuulaUrl: { type: 'text' as const, label: 'Link Kuula Iframe' },
    panoramaImageUrl: { type: 'text' as const, label: 'URL Ảnh 360 Panorama' },
    floorPlanImageUrl: { type: 'text' as const, label: 'URL Ảnh Sơ đồ mặt bằng' },
    mapLocationUrl: { type: 'text' as const, label: 'URL Google Maps' },
    enable360: {
      type: 'radio' as const,
      label: 'Bật Tab Tổng quan 360',
      options: [
        { label: 'Bật', value: true },
        { label: 'Tắt', value: false },
      ],
    },
    enableFloorplan: {
      type: 'radio' as const,
      label: 'Bật Tab Mặt bằng',
      options: [
        { label: 'Bật', value: true },
        { label: 'Tắt', value: false },
      ],
    },
    enableMap: {
      type: 'radio' as const,
      label: 'Bật Tab Vị trí bản đồ',
      options: [
        { label: 'Bật', value: true },
        { label: 'Tắt', value: false },
      ],
    },
  },
  defaultProps: {
    title: 'TỔNG MẶT BẰNG',
    projectName: 'Đô Thị Biển Nha Trang',
    viewerType: 'kuula_iframe',
    kuulaUrl: 'https://kuula.co/share/hSptt/collection/7HZBD?logo=-1&info=1&fs=1&vr=1&zoom=1&thumbs=1',
    panoramaImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2400&q=90',
    floorPlanImageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=80',
    mapLocationUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3898.7!2d109.196!3d12.238!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDE0JzE2LjgiTiAxMDnCsDExJzQ1LjYiRQ!5e0!3m2!1svi!2s!4v1',
    enable360: true,
    enableFloorplan: true,
    enableMap: true,
  },
  render: MasterPlan3D,
};
