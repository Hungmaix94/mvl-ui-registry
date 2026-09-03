import { describe, expect, it } from 'vitest'

import {
  DOC_TOTAL_BASIS_LABEL,
  DocTotalBasis,
  docTotalFormValues,
  isDocTotalBasisMissing,
  sheetDocumentTotalCheck,
  toDocTotalAmount,
  toDocTotalPayload,
} from './recon-document-total-check'

describe('DOC_TOTAL_BASIS_LABEL', () => {
  it('phủ hết mọi giá trị của enum BE (thêm gốc mới ⇒ tsc + test cùng đỏ)', () => {
    expect(Object.keys(DOC_TOTAL_BASIS_LABEL).sort()).toEqual(Object.values(DocTotalBasis).sort())
  })
})

describe('toDocTotalAmount', () => {
  it('bỏ trống là null, KHÔNG phải 0', () => {
    expect(toDocTotalAmount('')).toBeNull()
    expect(toDocTotalAmount(null)).toBeNull()
    expect(toDocTotalAmount(undefined)).toBeNull()
  })

  it('giữ số 0 khi kế toán thật sự gõ 0', () => {
    expect(toDocTotalAmount(0)).toBe(0)
    expect(toDocTotalAmount('0')).toBe(0)
  })

  it('đọc chuỗi decimal của BE', () => {
    expect(toDocTotalAmount('2349453648.00')).toBe(2_349_453_648)
  })
})

describe('docTotalFormValues', () => {
  it('hydrate từ phiếu đã lưu', () => {
    expect(
      docTotalFormValues({ doc_total_amount: '1000', doc_total_basis: DocTotalBasis.gross })
    ).toEqual({ doc_total_amount: 1000, doc_total_basis: DocTotalBasis.gross })
  })

  it('phiếu chưa khai ⇒ hai ô trống', () => {
    expect(docTotalFormValues({})).toEqual({ doc_total_amount: null, doc_total_basis: null })
    expect(docTotalFormValues(null)).toEqual({ doc_total_amount: null, doc_total_basis: null })
  })
})

describe('toDocTotalPayload', () => {
  it('gửi cả hai field khi có khai', () => {
    expect(
      toDocTotalPayload({ doc_total_amount: 1000, doc_total_basis: DocTotalBasis.net })
    ).toEqual({ doc_total_amount: '1000', doc_total_basis: DocTotalBasis.net })
  })

  it('bỏ trống ⇒ amount = null để xoá, và BỎ HẲN basis (schema không cho basis nhận null)', () => {
    const payload = toDocTotalPayload({
      doc_total_amount: null,
      doc_total_basis: DocTotalBasis.gross,
    })

    expect(payload).toEqual({ doc_total_amount: null })
    expect('doc_total_basis' in payload).toBe(false)
  })

  it('có số mà thiếu gốc (Zod đã chặn) ⇒ không bịa gốc, để BE 400', () => {
    const payload = toDocTotalPayload({ doc_total_amount: 1000, doc_total_basis: null })

    expect(payload).toEqual({ doc_total_amount: '1000' })
  })

  it('gõ 0 vẫn là một con số đã khai', () => {
    expect(toDocTotalPayload({ doc_total_amount: 0, doc_total_basis: DocTotalBasis.net })).toEqual({
      doc_total_amount: '0',
      doc_total_basis: DocTotalBasis.net,
    })
  })
})

describe('isDocTotalBasisMissing', () => {
  it('có số mà chưa chọn gốc ⇒ thiếu', () => {
    expect(isDocTotalBasisMissing({ doc_total_amount: 1000, doc_total_basis: null })).toBe(true)
  })

  it('có số và có gốc ⇒ đủ', () => {
    expect(
      isDocTotalBasisMissing({ doc_total_amount: 1000, doc_total_basis: DocTotalBasis.net })
    ).toBe(false)
  })

  it('bỏ trống cả hai ⇒ hợp lệ (không chạy kiểm tra)', () => {
    expect(isDocTotalBasisMissing({ doc_total_amount: null, doc_total_basis: null })).toBe(false)
  })
})

describe('sheetDocumentTotalCheck', () => {
  it('null khi phiếu không khai tổng nào', () => {
    expect(sheetDocumentTotalCheck({ document_total_check: null })).toBeNull()
    expect(sheetDocumentTotalCheck(undefined)).toBeNull()
  })

  it('chuẩn hoá đủ 6 field về số', () => {
    expect(
      sheetDocumentTotalCheck({
        document_total_check: {
          basis: DocTotalBasis.gross,
          document_total: '2349453649',
          sheet_total: '2349453648',
          difference: '1',
          tolerance: '3',
          within_tolerance: true,
        },
      })
    ).toEqual({
      basis: DocTotalBasis.gross,
      documentTotal: 2_349_453_649,
      sheetTotal: 2_349_453_648,
      difference: 1,
      tolerance: 3,
      withinTolerance: true,
    })
  })

  it('giữ chênh lệch ÂM (chứng từ khai ÍT hơn phiếu)', () => {
    const check = sheetDocumentTotalCheck({
      document_total_check: {
        basis: DocTotalBasis.net,
        document_total: '100',
        sheet_total: '105',
        difference: '-5',
        tolerance: '2',
        within_tolerance: false,
      },
    })

    expect(check?.difference).toBe(-5)
    expect(check?.withinTolerance).toBe(false)
  })

  it('within_tolerance thiếu ⇒ coi là KHÔNG trong ngưỡng (không tự khoan dung)', () => {
    const check = sheetDocumentTotalCheck({
      document_total_check: { difference: '9', tolerance: '1' },
    })

    expect(check?.withinTolerance).toBe(false)
    expect(check?.basis).toBeNull()
  })
})
