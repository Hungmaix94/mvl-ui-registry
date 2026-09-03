import { describe, expect, it } from 'vitest'
import {
  buildPayload,
  DEFAULT_BROKER_CERTIFICATE_FORM_VALUES,
  type BrokerCertificateFormValues,
} from './broker-certificate-types'
import {
  BrokerCertificateStatus as CertStatus,
  BrokerCertificateType as CertType,
} from '@/constants/api-schema-aliases'

const base = (o: Partial<BrokerCertificateFormValues>): BrokerCertificateFormValues => ({
  ...DEFAULT_BROKER_CERTIFICATE_FORM_VALUES,
  ...o,
})

describe('buildPayload', () => {
  it('builds a normal collaborator certificate with dates', () => {
    const p = buildPayload(
      base({
        holder_collaborator: 145,
        cert_type: CertType.BROKER_LICENSE,
        certificate_number: 'BDS-2026-009001',
        issued_date: new Date(2026, 5, 1),
        effective_date: new Date(2026, 6, 1),
      })
    )
    expect(p.holder_collaborator).toBe(145)
    expect(p.certificate_number).toBe('BDS-2026-009001')
    expect(p.issued_date).toBe('2026-06-01')
    expect(p.effective_date).toBe('2026-07-01')
    expect(p.expiry_date).toBeUndefined() // blank → backend auto-fills +5y
    expect(p.status).toBeUndefined()
  })

  it('builds a pending record with no certificate data', () => {
    const p = buildPayload(
      base({
        holder_collaborator: 1,
        is_pending: true,
        expected_issue_date: new Date(2026, 8, 1),
        notes: 'Thi đỗ 05/2026',
      })
    )
    expect(p.status).toBe(CertStatus.PENDING_ISSUANCE)
    expect(p.expected_issue_date).toBe('2026-09-01')
    expect(p.certificate_number).toBeUndefined()
    expect(p.notes).toBe('Thi đỗ 05/2026')
  })

  it('omits empty optional strings', () => {
    const p = buildPayload(
      base({
        holder_collaborator: 1,
        cert_type: CertType.TRAINING_CERT,
        certificate_number: '',
        issuer: '',
      })
    )
    expect(p.certificate_number).toBeUndefined()
    expect(p.issuer).toBeUndefined()
    expect(p.notes).toBeUndefined()
  })

  it('attaches the file token to a normal certificate when a scan was picked', () => {
    const p = buildPayload(
      base({ holder_collaborator: 1, cert_type: CertType.BROKER_LICENSE }),
      'token-cert-1'
    )
    expect(p.files).toEqual({ attachment: 'token-cert-1' })
  })

  it('omits the files field when no scan was picked', () => {
    const p = buildPayload(base({ holder_collaborator: 1, cert_type: CertType.BROKER_LICENSE }))
    expect(p.files).toBeUndefined()
  })

  it('never sends a file field on a pending record even if a token is passed', () => {
    const p = buildPayload(base({ holder_collaborator: 1, is_pending: true }), 'token-cert-1')
    expect(p.status).toBe(CertStatus.PENDING_ISSUANCE)
    expect(p.files).toBeUndefined()
  })
})
