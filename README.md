# 🎨 @mvl/ui-registry — MaiVietLand Design System & Shadcn UI Custom Registry

[![Shadcn UI](https://img.shields.io/badge/Shadcn_UI-Compatible-black.svg)](https://ui.shadcn.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License: Private](https://img.shields.io/badge/License-MaiVietLand_Internal-red.svg)]()

> **Single Source of Truth (SSOT)** phân phối các thành phần giao diện (Atomic UI Components, Form Controls, Dynamic Zone StreamField Blocks, Page Builder Block Components, Project Presets) cho toàn bộ hệ sinh thái Web của MaiVietLand (`erp-repo/web`, `app-sale`, `open-cms`, `CRM`, `Landing Pages`).

---

## 🚀 Tính Năng Cốt Lõi

1. **Chuẩn Hóa Design Tokens MVL:**
   - Màu nhận diện thương hiệu MaiVietLand: `#B32B2F` (Action Primary Red), `#870B0B` (Hover Red).
   - Typography: Font `Outfit` (Heading/Brand) & `Inter` (UI/Body).
   - Tương thích Tailwind CSS v4 và chuẩn Accessible ARIA listbox/dialogs.

2. **Khối Nội Dung Độc Lập cho Visual Page Builder (Puck & StreamField Blocks):**
   - Đóng gói sẵn 12 khối giao diện Bất động sản chuẩn nhận diện thương hiệu Mai Việt Land trong `registry/blocks/`.
   - Mỗi block export độc lập: **Component JSX**, **Fields Config** (panel thuộc tính kéo thả), và **Types definition**.

3. **Cơ Chế Phân Phối Presets Theo Dự Án (Project-Level Presets):**
   - Cung cấp sẵn các tập hợp khối component tối ưu theo từng loại hình dự án:
     - 🏢 **Căn hộ cao tầng (`APARTMENT_PRESET`)**: 9 khối (Mặt bằng layout, VR 360 Matterport, Tiện ích 5 sao, Bảng giá & Chiết khấu...).
     - 🏞️ **Đất nền & Biệt thự (`VILLA_LAND_PRESET`)**: 8 khối (Sa bàn 3D phân lô tổng mặt bằng, Video tiến độ, Vị trí...).
     - 🎟️ **Sự kiện mở bán (`EVENT_PRESET`)**: 6 khối (Banner đếm ngược, Video, Bảng giá, Form đăng ký...).
   - Helper `createProjectPuckConfig()` tự động lọc và phân nhóm danh mục (Categories) trực quan trên thanh kéo thả.

4. **Tương Thích 100% Shadcn UI CLI & Git Package:**
   - Hỗ trợ cài đặt nguyên gói qua Git SSH (`@mvl/ui-registry`) hoặc cài từng component độc lập qua lệnh `npx shadcn@latest add ...`.

---

## 📦 Danh Mục Thành Phần (Registry Catalog)

### 1. Atomic UI & Controls (`registry/ui/`)
- `button`: Nút bấm hành động chuẩn MVL Design Tokens.
- `badge`: Huy hiệu trạng thái và nhãn phân loại.
- `input` / `textarea`: Ô nhập liệu văn bản có nhãn, lỗi và gợi ý.
- `select` / `custom-select`: Dropdown lựa chọn tùy biến hỗ trợ icon, search và clearable.
- `modal` / `confirm-modal`: Hộp thoại Popup và xác nhận hành động nguy hiểm.
- `data-table`: Bảng dữ liệu chuẩn hóa với generic typing và phân trang.
- `rich-text-editor`: Trình soạn thảo WYSIWYG đa chế độ.
- `dynamic-zone-builder`: Bộ dựng trang theo khối với Drag and Drop và tích hợp Thư viện Media.

### 2. Page Builder Block Components (`registry/blocks/`)
| Tên Block | Tên Component | Mục đích sử dụng |
|---|---|---|
| `hero-banner-block` | `HeroBanner` | Banner tiêu đề chính, slogan, huy hiệu và nút CTA kép |
| `amenities-grid-block` | `AmenitiesGrid` | Lưới tiện ích nội khu/ngoại khu 5 sao (2, 3 hoặc 4 cột) |
| `floor-plans-block` | `FloorPlans` | Mặt bằng layout căn hộ mẫu (1PN, 2PN, 3PN) kèm diện tích & giá |
| `pricing-table-block` | `PricingTable` | Bảng tiến độ thanh toán từng đợt & chính sách chiết khấu |
| `contact-lead-form-block` | `ContactLeadForm` | Form đăng ký nhận bảng giá & hotline tư vấn 24/7 |
| `faq-accordion-block` | `FAQAccordion` | Khối câu hỏi thường gặp về pháp lý và bàn giao |
| `property-gallery-block` | `PropertyGallery` | Thư viện hình ảnh phối cảnh và tiến độ thực tế |
| `location-map-block` | `LocationMap` | Bản đồ vị trí kết nối giao thông và liên kết vùng |
| `vr-tour-3d-block` | `VRTour3D` | Nhúng trải nghiệm nhà mẫu thực tế ảo 360 độ Matterport |
| `video-section-block` | `VideoSection` | Video giới thiệu toàn cảnh dự án YouTube/Flycam |
| `footer-section-block` | `FooterSection` | Chân trang thông tin chủ đầu tư, bản quyền và hotline |
| `master-plan-3d-block` | `MasterPlan3D` | Sa bàn phân lô 3D tổng mặt bằng & VR 360 |

---

## 🛠️ Hướng Dẫn Sử Dụng Trong Dự Án

### Cài đặt package qua Git SSH:
Khai báo trong `package.json` của dự án (`open-cms`, `app-sale`, `erp-repo/web`):
```json
{
  "dependencies": {
    "@mvl/ui-registry": "git+ssh://git@github.com:maivietland/mvl-ui-registry.git#main"
  }
}
```

### Cách 1: Sử dụng trong Visual Page Builder (Puck)
```tsx
import { Puck } from '@measured/puck';
import {
  createProjectPuckConfig,
  APARTMENT_PRESET,
  VILLA_LAND_PRESET,
  EVENT_PRESET,
} from '@mvl/ui-registry';

// Khởi tạo Puck config tối ưu cho dự án Căn hộ cao tầng
const puckConfig = createProjectPuckConfig({
  allowedBlocks: APARTMENT_PRESET,
});

export function ProjectLandingEditor({ data, onSave }) {
  return (
    <Puck
      config={puckConfig}
      data={data}
      onPublish={onSave}
    />
  );
}
```

### Cách 2: Sử dụng các khối Block độc lập trong Frontend Web/Mobile
```tsx
import { HeroBanner, AmenitiesGrid, FloorPlans, FooterSection } from '@mvl/ui-registry';

export function ProjectDetailPage() {
  return (
    <div>
      <HeroBanner
        title="Vinhomes Grand Park — The Beverly Solari"
        subtitle="Sống trọn vẹn chất Mỹ giữa lòng đại đô thị thông minh."
        ctaText="Đăng Ký Báo Giá"
        ctaLink="#dang-ky"
      />
      <AmenitiesGrid
        title="Tiện Ích 5 Sao"
        columns={3}
        amenities={[
          { icon: '🏊‍♂️', name: 'Hồ bơi vô cực', desc: 'Quy mô 1000m² đạt chuẩn Olympic' }
        ]}
      />
      <FooterSection
        companyName="CÔNG TY CỔ PHẦN ĐỊA ỐC MAI VIỆT LAND"
        hotline="1900 1234"
      />
    </div>
  );
}
```

---

## 🏗️ Lệnh Vận Hành Registry

```bash
cd mvl-ui-registry
npm install

# 1. Biên dịch toàn bộ mã nguồn registry/ sang các file JSON schemas trong public/r/
npm run build:registry

# 2. Typecheck và kiểm tra tính toàn vẹn
npm run build

# 3. Khởi chạy dev server phục vụ endpoint registry nội bộ
npm run dev     # Khởi chạy tại http://localhost:3008
```

---

## 🏛️ Cấu Trúc Thư Mục

```
mvl-ui-registry/
├── registry/
│   ├── blocks/                 # 12 Khối nội dung độc lập cho Page Builder & Landing
│   │   ├── HeroBanner.tsx
│   │   ├── AmenitiesGrid.tsx
│   │   ├── FloorPlans.tsx
│   │   ├── PricingTable.tsx
│   │   ├── ContactLeadForm.tsx
│   │   ├── FAQAccordion.tsx
│   │   ├── PropertyGallery.tsx
│   │   ├── LocationMap.tsx
│   │   ├── VRTour3D.tsx
│   │   ├── VideoSection.tsx
│   │   ├── FooterSection.tsx
│   │   ├── MasterPlan3D.tsx
│   │   └── index.ts
│   ├── presets/                # Cấu hình Presets & Dynamic Config Resolver theo loại dự án
│   │   └── projectPresets.ts
│   ├── hooks/                  # Custom Hooks (useClickOutside, useDebounce)
│   ├── lib/                    # Utils (cn, formatters)
│   ├── ui/                     # Atomic UI Components (Button, Select, DataTable, Modal...)
│   └── index.ts                # Package entry point
├── public/
│   └── r/                      # JSON Schemas phục vụ Shadcn CLI (25 components)
├── scripts/
│   └── build-registry.ts       # Script biên dịch registry manifest tự động
├── registry.json               # Manifest định nghĩa các component
└── package.json
```
