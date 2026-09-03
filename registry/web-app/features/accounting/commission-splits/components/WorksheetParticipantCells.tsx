import type { ReactNode } from 'react'

import { EmployeeProfileLink } from '@/components/commons'
import { APP_PATH } from '@/routes'
import { formatPct } from '@/utils/common'

import {
  buildWorksheetSellers,
  formatParticipantRef,
  type ParticipantRef,
  type WorksheetParticipantSource,
  type WorksheetSellerEntry,
} from '../utils/worksheet-participants'

/**
 * Cụm cột đồng bán của bảng worksheet kỳ, sau CR `86eyj75hg`: **đúng MỘT** cột "Danh sách sale"
 * gộp cả ba loại người bán (sale MV · sàn F2 · CTV), và cụm tổ chức của mỗi người nằm **inline
 * ngay trong ô của người đó**.
 *
 * Trước CR này là ba cột song song, mỗi cột một loại. Kế toán bác thiết kế đó: biểu mẫu của họ có
 * đúng một cột người bán.
 *
 * Bản đầu của CR dựng Khối/Phòng ban thành hai cột dọc đứng cạnh cột gộp. User bác tiếp (20/08):
 * hai cột đó bơm bảng rộng thêm mà mỗi ô chỉ chứa một mẩu chữ, và với dòng nhiều người bán thì
 * đọc ngang phải bắc cầu qua ba cột mới ghép đúng người với phòng ban. Đưa vào trong ô là mỗi
 * người thành một cụm đọc khép kín — không còn gì phải căn dòng, nên toàn bộ cơ chế "khối ẩn đo
 * chiều cao" của bản trước đã bị xoá cùng hai cột đó.
 *
 * Khung entry: `tỷ lệ · MÃ` (mã là link) → `tên` → nhãn phân loại → cụm tổ chức
 * (`Chi nhánh` → `Khối` → `Phòng ban`, đúng thứ tự cấp bậc).
 */

/** `content-dark-2` (#4b4b4b) chứ không phải `-3` (#8c8c8c): ở 11px, #8c8c8c chỉ đạt tương phản
 *  ~3:1 trên nền trắng, dưới ngưỡng đọc được. */
const DETAIL_TEXT = 'text-content-dark-2 text-[11px] leading-snug'

const EMPTY = <span className="text-content-dark-3 text-xs">—</span>

/**
 * Nhãn PHÂN LOẠI (nguồn F2 / loại tuyến CTV) — tag xám trung tính, cố ý KHÔNG dùng `Chip` màu:
 * mọi chip có màu trong bảng này đều mang nghĩa trạng thái (Đã nhận đủ / Tạm ngưng…), tô màu ở
 * đây là người đọc hiểu nhầm thành trạng thái của dòng.
 */
function ClassifierTag({ children }: { children: ReactNode }) {
  // Bọc `div` chứ không để `span` chạy nối tiếp sau tên: nhãn phân loại là một tầng thông tin
  // khác, đứng riêng một dòng NGAY DƯỚI "mã - tên" thì mắt tách được hai tầng ngay.
  return (
    <div className="mt-1">
      <span className="bg-background-3 text-content-dark-2 inline-block rounded px-1.5 py-px text-[10px] leading-4 font-medium">
        {children}
      </span>
    </div>
  )
}

/**
 * Dòng chi tiết trỏ tới MỘT NHÂN VIÊN khác (chủ tuyến CTV, giám đốc mang sàn F2 về) — `mã - tên`
 * là link mở hồ sơ ở tab mới. `EmployeeProfileLink` tự gate `employee.retrieve` và tự
 * `stopPropagation`, nên không quyền thì rơi về text thường chứ không dẫn vào trang 403, và click
 * không kích hoạt navigate của cả dòng bảng.
 */
function EmployeeDetailLine({ label, employee }: { label: string; employee: ParticipantRef }) {
  return (
    <div className={DETAIL_TEXT}>
      {label}:{' '}
      <EmployeeProfileLink employeeId={employee.id}>
        {formatParticipantRef(employee)}
      </EmployeeProfileLink>
    </div>
  )
}

/**
 * Một dòng `nhãn: giá trị` của cụm tổ chức.
 *
 * Giá trị rỗng thì bỏ HẲN dòng, không in "Khối: —": entry này xếp chồng tối đa ba dòng org, mà
 * gạch ngang chiếm đúng một dòng như dữ liệu thật ⇒ dòng nào cũng đủ ba tầng nhưng hai tầng vô
 * nghĩa, mắt phải đọc mới biết là rỗng. Bỏ dòng thì thiếu nhìn ra ngay.
 */
function OrgLine({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className={`${DETAIL_TEXT} mt-0.5`}>
      {label}: {value}
    </div>
  )
}

/**
 * Cụm tổ chức của MỘT người bán — inline trong ô của chính người đó (CR `86eyj75hg`, sửa 20/08).
 *
 * Thứ tự `Chi nhánh → Khối → Phòng ban` là thứ tự cấp bậc trong cây tổ chức MVL (xem
 * `ParticipantOrg`), không phải thứ tự CR liệt kê — đọc từ rộng tới hẹp thì ba dòng này thành một
 * đường đi, đảo lại là ba mẩu rời.
 *
 * Sàn F2 chỉ có MỘT dòng và **không mang nhãn**: sàn nằm ngoài cây tổ chức MVL nên cả Khối lẫn
 * Phòng ban đều đọc `F2_ORG_LABEL` (xem docstring của hằng đó). In hai dòng chữ giống hệt nhau là
 * rác; mà gộp lại thành `Khối / Phòng ban: Sàn F2` cũng vô lý — nó tự nhận sàn có khối và phòng
 * ban, đúng cái điều không tồn tại. Để trần `Sàn F2` là nói đúng thứ nó là: phân loại đơn vị của
 * dòng này. Sàn cũng không có chi nhánh (BE trả null) nên đây là toàn bộ cụm org của dòng F2.
 */
function SellerOrgLines({ entry }: { entry: WorksheetSellerEntry }) {
  if (entry.kind === 'f2') {
    if (!entry.blockLabel) return null
    return <div className={`${DETAIL_TEXT} mt-0.5`}>{entry.blockLabel}</div>
  }

  return (
    <>
      <OrgLine label="Chi nhánh" value={entry.branch?.name ?? ''} />
      <OrgLine label="Khối" value={entry.blockLabel} />
      <OrgLine label="Phòng ban" value={entry.departmentLabel} />
    </>
  )
}

/** MÃ dạng link tới trang chi tiết — chỉ dựng link khi có quyền, không thì text thường để người
 *  dùng vẫn đọc được mã mà không bị dẫn vào trang 403. */
function CodeLink({ code, href, canView }: { code: string; href?: string; canView: boolean }) {
  if (!canView || !href) return <span className="break-all text-neutral-700">{code}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      // `action-primary-red-default` chứ KHÔNG phải `brand-primary-default`: token sau không có
      // trong tailwind-colors.css nên Tailwind bỏ qua và link ra màu đen.
      className="text-action-primary-red-default break-all hover:underline"
    >
      {code}
    </a>
  )
}

/** Đệm dọc của MỘT entry — tách các co-seller ra khỏi nhau mà không đội thêm khoảng trắng ở mép
 *  trên/dưới của ô. */
const ENTRY_PAD = 'py-1.5 first:pt-0 last:pb-0'

/**
 * Nội dung của MỘT co-seller (KHÔNG kèm đệm — `ENTRY_PAD` do người gọi đặt), xếp theo tầng:
 *
 * ```
 * 40% · EX000001940      ← tỷ lệ tham gia, chấm giữa dòng, rồi MÃ (link)
 * Sàn Tuấn Anh 66        ← TÊN xuống dòng riêng
 * [Nguồn sàn liên kết]   ← nhãn phân loại + chi tiết theo loại
 * Sàn F2                 ← cụm tổ chức (xem `SellerOrgLines`)
 * ```
 *
 * Tỷ lệ đứng TRƯỚC mã và dính vào mã bằng dấu `·`. Bản đầu neo tỷ lệ ở mép PHẢI ô: bảng này không
 * kẻ vách dọc giữa các cột nên mép phải là ranh giới vô hình — con số dán sát nội dung cột kế bên
 * và bị quy nhầm cho cột đó. Đặt trước + dấu chấm nối là buộc con số vào đúng chủ của nó ngay
 * trong một cụm đọc, không phải suy từ vị trí. Tooltip còn gọi thẳng tên chính chủ.
 */
function ParticipantBody({
  code,
  name,
  pct,
  children,
}: {
  /** Mã (đã bọc link nếu có quyền) — tầng trên. */
  code: ReactNode
  /** Tên hiển thị — tầng dưới, chuỗi thuần để tooltip của tỷ lệ dùng lại được. */
  name: string
  pct: string | null
  children?: ReactNode
}) {
  const hasPct = pct != null && pct !== ''
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        {hasPct && (
          <>
            <span
              className="text-content-dark-1 text-xs font-semibold tabular-nums"
              title={`${name || 'Bên đồng bán này'} — tỷ lệ tham gia ${formatPct(pct, 2)} trên hợp đồng cọc (tổng các bên đồng bán = 100%)`}
            >
              {formatPct(pct, 2)}
            </span>
            {/* Thuần trang trí — `aria-hidden` để trình đọc màn hình không đọc "dấu chấm giữa"
                xen giữa mọi tỷ lệ và mọi mã, trên mọi dòng của bảng. */}
            <span aria-hidden="true" className="text-content-dark-3 text-xs">
              ·
            </span>
          </>
        )}
        {code}
      </div>
      {/* FK bị xoá (SET_NULL) có thể còn mã mà mất tên — bỏ hẳn dòng, không in ô trống. */}
      {name && <div className="text-content-dark-1 mt-0.5 text-xs break-words">{name}</div>}
      {children}
    </>
  )
}

/** Đường kẻ tóc giữa các entry — mỗi co-seller là một khối tách bạch, không dính thành một khối chữ. */
function EntryList({ children }: { children: ReactNode }) {
  return <div className="divide-border-1 flex flex-col divide-y">{children}</div>
}

type ListProps = {
  row?: WorksheetParticipantSource | null
  /** Quyền `retrieve` trên sàn F2 — tính 1 lần ở bảng cha, không tính lại mỗi ô. */
  canViewExchange: boolean
  /** Quyền `retrieve` trên CTV. */
  canViewCollaborator: boolean
}

/** `id`/`code` là dữ liệu SỐNG (null/"" khi FK bị SET_NULL xoá) còn `name` là snapshot — nên mã
 *  rỗng vẫn phải in được cái gì đó, và không được dựng link tới id không tồn tại. */
function partyCode(party?: { code: string } | null): string {
  return party?.code || '—'
}

/**
 * ⚠️ **Ở bảng header nhiều tầng, `meta.width` KHÔNG đổi bề rộng cột** — đừng sửa hằng này rồi
 * tưởng cột rộng ra.
 *
 * `useTable` có quy đổi `meta.width` → `size` (`getWidthInPixels`), nhưng nó `columns.map(...)`
 * **phẳng**, không đệ quy xuống `column.columns`. Hai bảng worksheet có header 3 tầng nên mọi
 * `meta.width` khai ở tier1/lá không bao giờ đi qua chỗ quy đổi đó, và cột lá giữ nguyên `size`
 * mặc định 150 của TanStack. Đo trên trình duyệt 20/08: cả 51 cột dữ liệu đều đúng 150px, kể cả
 * cột khai `w-[220px]`/`w-[240px]` từ trước.
 *
 * Đòn bẩy thật cho bảng nhiều tầng là khai thẳng `size` trên chính cột lá — `TableHeader` và
 * `TableRow` đặt `width`/`minWidth`/`maxWidth` từ `header.getSize()` / `cell.column.getSize()`.
 *
 * Giữ hằng chuỗi này vì hai bảng vẫn khai `meta.width` ở khắp nơi và bỏ đi là một diff to vô ích;
 * muốn cột rộng ra thì sửa `SELLER_COLUMN_SIZE` bên dưới.
 */
export const SELLER_COLUMN_WIDTH = 'w-[220px]'

/**
 * Bề rộng THẬT của cột "Danh sách sale", tính bằng px, khai vào `size` của cột lá ở **cả hai** màn.
 *
 * 260 chứ không phải 150 mặc định: đây là cột chữ nặng nhất bảng — mỗi người bán chiếm tới 6 dòng
 * (tỷ lệ+mã · tên · nhãn phân loại · chi nhánh · khối · phòng ban), mà tên khối/phòng ban thật thì
 * dài ("Phòng Kinh Doanh 79_QN", "Sàn Liên Kết & Cộng Tác Viên"). Ở 150px mấy chuỗi đó vỡ thành ba
 * dòng và một dòng có 2 người bán cao gần gấp đôi phần bảng còn lại.
 *
 * Đừng nới thêm nữa để "cho thoáng": bảng đã rộng 4600px, mỗi px thêm vào đây là kế toán phải kéo
 * ngang thêm một nhịp mới tới được cụm tiền.
 */
export const SELLER_COLUMN_SIZE = 260

/**
 * Mã của một dòng đồng bán, đã bọc link đúng route theo loại — nhân viên MV mở hồ sơ nhân viên,
 * sàn F2 mở trang sàn, CTV mở trang CTV.
 *
 * `EmployeeProfileLink` tự gate `employee.retrieve` nên nhánh MV không nhận cờ quyền từ ngoài;
 * hai loại còn lại chưa có component dùng chung tương đương nên gate bằng cờ bảng cha đã tính.
 */
function SellerCode({
  entry,
  canViewExchange,
  canViewCollaborator,
}: {
  entry: WorksheetSellerEntry
  canViewExchange: boolean
  canViewCollaborator: boolean
}) {
  const code = partyCode(entry.party)
  const id = entry.party?.id

  if (entry.kind === 'mv') {
    // Không có id (FK bị SET_NULL) thì KHÔNG dựng link tới id không tồn tại — `canView={false}`
    // cho ra đúng nhánh text thường của `CodeLink`, khỏi lặp lại cái `span` ấy ở đây.
    if (!id) return <CodeLink code={code} canView={false} />
    return <EmployeeProfileLink employeeId={id}>{code}</EmployeeProfileLink>
  }

  const isF2 = entry.kind === 'f2'
  const pathPattern = isF2 ? APP_PATH.EXCHANGE_MANAGEMENT_DETAIL : APP_PATH.COLLABORATOR_DETAIL

  return (
    <CodeLink
      code={code}
      href={id ? pathPattern.replace(':id', String(id)) : undefined}
      canView={isF2 ? canViewExchange : canViewCollaborator}
    />
  )
}

/** Nội dung một entry của cột gộp. */
function SellerEntryBody({
  entry,
  canViewExchange,
  canViewCollaborator,
}: {
  entry: WorksheetSellerEntry
  canViewExchange: boolean
  canViewCollaborator: boolean
}) {
  return (
    <ParticipantBody
      pct={entry.pct}
      name={entry.party?.name ?? ''}
      code={
        <SellerCode
          entry={entry}
          canViewExchange={canViewExchange}
          canViewCollaborator={canViewCollaborator}
        />
      }
    >
      {entry.classifierLabel && <ClassifierTag>{entry.classifierLabel}</ClassifierTag>}
      {entry.relatedEmployee && (
        <EmployeeDetailLine
          label={entry.relatedEmployee.label}
          employee={entry.relatedEmployee.employee}
        />
      )}
      <SellerOrgLines entry={entry} />
    </ParticipantBody>
  )
}

/**
 * Cột "Danh sách sale" đã gộp (CR `86eyj75hg`) — sale MV, sàn F2 và CTV nằm chung một cột, mỗi
 * người một entry kèm tỷ lệ tham gia, theo đúng biểu mẫu kế toán.
 *
 * Thứ tự entry do `buildWorksheetSellers` quyết định (sale MV → sàn F2 → CTV, đúng thứ tự ba cột
 * cũ đứng cạnh nhau) — không chỗ nào trong file này được sắp xếp/lọc lại danh sách, kế toán đọc
 * dọc cột này phải gặp đúng trình tự quen thuộc.
 */
export function SellerList({ row, canViewExchange, canViewCollaborator }: ListProps) {
  const entries = buildWorksheetSellers(row)
  if (entries.length === 0) return EMPTY

  return (
    <EntryList>
      {entries.map((entry, idx) => (
        <div key={idx} className={ENTRY_PAD}>
          <SellerEntryBody
            entry={entry}
            canViewExchange={canViewExchange}
            canViewCollaborator={canViewCollaborator}
          />
        </div>
      ))}
    </EntryList>
  )
}
