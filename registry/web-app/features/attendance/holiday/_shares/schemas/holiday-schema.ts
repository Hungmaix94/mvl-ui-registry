import { z } from 'zod'
import { isAfter, startOfDay } from 'date-fns'
import { HolidayFunding_mode } from '@/api/schema.ts'

export const holidaySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Tên ngày lễ là bắt buộc')
      .max(250, 'Tên ngày lễ không được vượt quá 250 ký tự'),
    start_date: z.date({ required_error: 'Khoảng thời gian là bắt buộc' }),
    end_date: z.date({ required_error: 'Khoảng thời gian là bắt buộc' }),
    notes: z.string().max(500, 'Ghi chú không được vượt quá 500 ký tự').optional(),
    funding_mode: z.nativeEnum(HolidayFunding_mode, {
      required_error: 'Hình thức chi trả là bắt buộc',
    }),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        const start = startOfDay(data.start_date)
        const end = startOfDay(data.end_date)
        return !isAfter(start, end)
      }
      return true
    },
    {
      message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
      path: ['end_date'],
    }
  )

export type HolidayFormData = z.infer<typeof holidaySchema>
