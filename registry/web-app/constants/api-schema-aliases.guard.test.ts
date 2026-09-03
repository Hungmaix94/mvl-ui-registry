/**
 * Guard: enum `Paths*` chỉ được lấy qua `src/constants/api-schema-aliases.ts`.
 *
 * `openapi-typescript --dedupe-enums` gộp các enum trùng shape rồi đặt tên theo path nào "thắng"
 * tại thời điểm generate. Path thắng đổi giữa các lần `yarn api:generate` ⇒ tên enum đổi ⇒ vỡ
 * compile ở MỌI file đang import tên cũ, kể cả file không dính dáng gì tới feature đang làm.
 * Đó chính là vòng lặp "mỗi lần sync schema lại tốn công revert thứ không liên quan".
 *
 * Lớp alias hấp thụ cú đổi tên đó vào MỘT dòng. Nhưng nó chỉ có tác dụng khi KHÔNG ai đi vòng:
 * đợt kiểm 2026-08-13 cho thấy 14/82 enum đã có alias sẵn mà vẫn bị import trực tiếp ở chỗ khác,
 * nên lớp alias khi ấy gần như vô hiệu.
 *
 * Vì sao là test chứ không chỉ là ESLint rule: `eslint.config.js` đang ép `files` của mọi config
 * về `app/**` — thư mục KHÔNG tồn tại trong repo này — nên `yarn lint` chạy 0 file và exit 0.
 * Chừng nào chưa sửa chỗ đó, ESLint rule không canh được gì; test này thì chạy thật.
 * Xem docs/ai/reference.md § "yarn lint hiện KHÔNG lint file nào".
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Hai file duy nhất được phép nhắc tên generated: bản thân schema và chính lớp alias. */
const ALLOWED = ['api/schema.ts', 'constants/api-schema-aliases.ts']

/**
 * Repo dùng SONG SONG hai specifier. Bỏ sót một dạng là guard thủng gần một nửa codebase —
 * đúng lỗi mà vòng quét đầu của đợt 2026-08-13 đã mắc.
 */
const SCHEMA_SPECIFIERS = ['@/api/schema', '@/api/schema.ts']

/** Bắt cả `import {...} from` lẫn `export {...} from` — dạng re-export cấp feature cũng phải đi qua alias. */
const IMPORT_OR_REEXPORT = /(?:import|export)\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+'([^']+)'/g

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collectSourceFiles(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

function importedNames(specifierList: string): string[] {
  return specifierList
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) =>
      s
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]!
        .trim()
    )
}

describe('guard: enum Paths* phải đi qua lớp alias', () => {
  const files = collectSourceFiles(SRC).filter(
    (f) => !ALLOWED.includes(relative(SRC, f).split(sep).join('/'))
  )

  it('không file nào import/re-export tên `Paths*` thẳng từ @/api/schema', () => {
    const offenders: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (!SCHEMA_SPECIFIERS.some((spec) => source.includes(`'${spec}'`))) continue

      for (const match of source.matchAll(IMPORT_OR_REEXPORT)) {
        const [, specifiers, module] = match
        if (!SCHEMA_SPECIFIERS.includes(module!)) continue
        for (const name of importedNames(specifiers!)) {
          if (!name.startsWith('Paths')) continue
          offenders.push(`${relative(SRC, file).split(sep).join('/')} → ${name}`)
        }
      }
    }

    expect(
      offenders,
      `Enum \`Paths*\` đổi tên mỗi lần \`yarn api:generate\`. Thêm một dòng alias vào ` +
        `src/constants/api-schema-aliases.ts rồi import từ '@/constants/api-schema-aliases':\n` +
        offenders.map((o) => `  - ${o}`).join('\n')
    ).toEqual([])
  })

  it('mỗi alias trỏ tới đúng một tên generated, không trùng tên cục bộ', () => {
    const aliasFile = readFileSync(join(SRC, 'constants/api-schema-aliases.ts'), 'utf8')
    const localNames = [
      ...aliasFile.matchAll(/^\s*[A-Za-z0-9_]+\s+as\s+([A-Za-z0-9_]+),\s*$/gm),
    ].map((m) => m[1]!)

    const duplicated = localNames.filter((name, i) => localNames.indexOf(name) !== i)

    expect(duplicated, `Tên alias bị khai trùng: ${duplicated.join(', ')}`).toEqual([])
    expect(localNames.length).toBeGreaterThan(0)
  })
})
