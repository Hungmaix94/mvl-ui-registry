import { z } from 'zod'

export const attendanceGeolocationSchema = z.object({
  name: z.string().min(1, 'Tên định vị là bắt buộc'),
  project_id: z.number({ required_error: 'Dự án là bắt buộc' }),
  address: z.string().min(1, 'Vị trí là bắt buộc'),
  latlong: z.string(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius_m: z.coerce.number().min(1, 'Bán kính phải lớn hơn 0'),
  notes: z.string().optional(),
})
