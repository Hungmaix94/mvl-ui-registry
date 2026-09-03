/**
 * Track nào bị `set-period-progress` ghi đè mà kế toán KHÔNG hề yêu cầu.
 *
 * Các xô thưởng không có dial đầu vào theo nghĩa thông thường: chúng chạy theo % đối chiếu
 * của kỳ, và BE trả `None` = catch-up (chứ không phải "bỏ qua") cho chúng, nên MỌI lượt lưu
 * dial đều làm tiền thưởng dịch chuyển. Trên ws176, lưu dial phí F2 làm thưởng F2 nhảy
 * 509.423 → 1.018.846; hạ dial trở lại 10% không kéo nó xuống, vì thưởng chưa bao giờ đi
 * theo dial đó — và màn hình không hề nói gì, nên kế toán chỉ thấy "số không giảm lại".
 */

export type DialSideEffect = {
  track: string
  before: number
  after: number
  reason: string
}

const TRACK_LABEL: Record<string, string> = {
  fee: 'Phí hoa hồng',
  f2: 'Phí hoa hồng F2',
  bonus: 'Thưởng sale',
  bonus_f2: 'Thưởng F2',
  mv_bonus: 'Thưởng MV',
}

export const dialTrackLabel = (track: string) => TRACK_LABEL[track] || track

/** Đọc `side_effects` khỏi response của set-period-progress; payload BE cũ chưa có thì rỗng. */
export function readDialSideEffects(response: unknown): DialSideEffect[] {
  const raw = (response as { side_effects?: unknown } | null | undefined)?.side_effects
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      const e = entry as Record<string, unknown>
      return {
        track: String(e.track ?? ''),
        before: Number(e.before ?? 0),
        after: Number(e.after ?? 0),
        reason: String(e.reason ?? ''),
      }
    })
    .filter((e) => e.track !== '' && e.before !== e.after)
}
