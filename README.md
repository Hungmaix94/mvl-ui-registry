# @mvl/ui-registry — MaiVietLand Design System & Shadcn UI Custom Registry

> **Single Source of Truth (SSOT)** phân phối các thành phần giao diện (Atomic UI Components, Real Estate Blocks, Custom Hooks) cho toàn bộ hệ sinh thái Web của MaiVietLand (ERP Web, App Sale, CMS Admin, Landing Pages).

## 🚀 Tính năng nổi bật

1. **Chuẩn hóa Design Tokens MVL**: Màu thương hiệu `#B32B2F`, font Outfit/Inter, Tailwind CSS v4, Accessible ARIA standards.
2. **Tương thích 100% Shadcn UI**: Cài đặt trực tiếp vào bất kỳ project nào qua lệnh:
   ```bash
   npx shadcn@latest add http://localhost:3008/r/button.json
   # Hoặc cài đặt dynamic zone builder:
   npx shadcn@latest add http://localhost:3008/r/dynamic-zone-builder.json
   ```
3. **Danh mục Component phong phú**:
   - `button`, `badge`, `input`, `textarea`, `custom-select`, `data-table`, `modal`, `confirm-modal`
   - `rich-text-editor`, `dynamic-zone-builder` (Strapi/Wagtail StreamField builder)
   - Custom hooks: `useClickOutside`, `useDebounce`

## 🛠️ Lệnh vận hành

- `npm run build:registry`: Biên dịch toàn bộ mã nguồn `registry/` sang các file JSON schemas trong `public/r/`.
- `npm run dev`: Chạy server dev phục vụ endpoint registry.
