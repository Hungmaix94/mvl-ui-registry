import React from 'react';
import { PhoneCall } from 'lucide-react';

export interface ContactLeadFormProps {
  title: string;
  subtitle?: string;
  btnText?: string;
  hotline?: string;
}

export const ContactLeadForm: React.FC<ContactLeadFormProps> = ({
  title,
  subtitle,
  btnText = 'Gửi Thông Tin Nhận Báo Giá',
  hotline,
}) => {
  return (
    <section className="bg-slate-900 text-white py-16 px-6 font-sans" id="dang-ky">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-black">{title}</h2>
          {subtitle && <p className="text-xs text-slate-300">{subtitle}</p>}
        </div>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-3 bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Họ và tên của bạn *"
              className="rounded-xl border border-white/30 bg-white/20 px-3.5 py-2.5 text-xs text-white placeholder-white/60 focus:outline-hidden focus:ring-2 focus:ring-[#B32B2F]"
            />
            <input
              type="tel"
              placeholder="Số điện thoại Zalo *"
              className="rounded-xl border border-white/30 bg-white/20 px-3.5 py-2.5 text-xs text-white placeholder-white/60 focus:outline-hidden focus:ring-2 focus:ring-[#B32B2F]"
            />
          </div>
          <input
            type="email"
            placeholder="Địa chỉ Email nhận tài liệu"
            className="w-full rounded-xl border border-white/30 bg-white/20 px-3.5 py-2.5 text-xs text-white placeholder-white/60 focus:outline-hidden focus:ring-2 focus:ring-[#B32B2F]"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-[#B32B2F] hover:bg-[#870B0B] py-3 text-sm font-bold text-white shadow-lg transition-all cursor-pointer"
          >
            {btnText}
          </button>
        </form>
        {hotline && (
          <div className="text-xs text-slate-300 flex items-center justify-center gap-2">
            <PhoneCall size={14} className="text-amber-400" />
            <span>
              Hotline 24/7: <strong className="text-white">{hotline}</strong>
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export const ContactLeadFormConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề Form' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả' },
    btnText: { type: 'text' as const, label: 'Nút gửi' },
    hotline: { type: 'text' as const, label: 'Hotline tư vấn' },
  },
  defaultProps: {
    title: 'Đăng Ký Nhận Bảng Giá & Ưu Đãi Độc Quyền',
    subtitle: 'Chuyên viên tư vấn Mai Việt Land sẽ liên hệ cung cấp thông tin quỹ căn ngoại giao trong 5 phút.',
    btnText: 'Gửi Thông Tin Nhận Báo Giá',
    hotline: '1900 6868 - 0988 888 888',
  },
  render: ContactLeadForm,
};
