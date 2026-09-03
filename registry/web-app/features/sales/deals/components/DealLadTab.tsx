import { FC, useState, useMemo } from 'react'
import { Flex } from '@radix-ui/themes'
import { Link } from 'react-router-dom'
import { useDealCommissionConfigList, useDealWorkspace } from '../services/deal-service'
import { formatCurrencyVND, formatPercent, formatNumber } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { getLadEventTitle, buildLadDetailPath } from '../utils/lad-event'
import LadDetailModal from './LadDetailModal'
import CurrentTbcConfigCard, {
  type CurrentTbcConfigCardPeriod,
} from '@/features/project/sale-allocations/components/tbc/CurrentTbcConfigCard'

interface DealLadTabProps {
  dealId: number
}

type TrackType = 'all' | 'mv' | 'cdt' | 'both'

interface KindMeta {
  label: string
  tone: string
}

const KIND_METAS: Record<string, KindMeta> = {
  creation: { label: 'Áp dụng mới', tone: 'grey' },
  bulk_retro: { label: 'Hồi tố', tone: 'orange' },
  reconciliation: { label: 'Đối chiếu', tone: 'green' },
  manual: { label: 'Sửa đổi', tone: 'yellow' },
}

interface TrackMeta {
  label: string
  tone: string
}

const TRACK_METAS: Record<string, TrackMeta> = {
  mv: { label: 'MV nội bộ', tone: 'red' },
  cdt: { label: 'CĐT đã xác nhận', tone: 'green' },
  both: { label: 'Áp cả 2 phía', tone: 'grey' },
}

export const DealLadTab: FC<DealLadTabProps> = ({ dealId }) => {
  const [filter, setFilter] = useState<TrackType>('all')
  const [openLadId, setOpenLadId] = useState<number | null>(null)

  const { data: configEnvelope, isLoading, error } = useDealCommissionConfigList(dealId)
  const { data: workspace } = useDealWorkspace(dealId)

  // Unwrap the API response envelopes which are nested inside a `{ success: true, data: ... }` wrapper
  const envelope = useMemo(() => {
    if (!configEnvelope) return null
    const rawData = (configEnvelope as any)?.data
    if (rawData) {
      if (Array.isArray(rawData)) {
        return rawData[0] || null
      }
      return rawData
    }
    if (Array.isArray(configEnvelope)) {
      return configEnvelope[0] || null
    }
    return configEnvelope as any
  }, [configEnvelope])

  const currentConfig = envelope?.current

  const configList = useMemo(() => {
    return envelope?.history || []
  }, [envelope])

  // Map each config item to its preceding rate value to calculate deltas
  const configDeltas = useMemo(() => {
    const sortedAsc = [...configList].sort(
      (a: any, b: any) => (a.version_number || 0) - (b.version_number || 0)
    )
    const deltas: Record<number, { fee_from: number | null; fee_to: number; delta_pct: number }> =
      {}

    for (let i = 0; i < sortedAsc.length; i++) {
      const currentVal = parseFloat(sortedAsc[i].pct_agency_fee || '0')
      const prevVal = i > 0 ? parseFloat(sortedAsc[i - 1].pct_agency_fee || '0') : null
      deltas[sortedAsc[i].id] = {
        fee_from: prevVal,
        fee_to: currentVal,
        delta_pct: prevVal !== null ? currentVal - prevVal : 0,
      }
    }
    return deltas
  }, [configList])

  // Categorize based on source
  const getTrack = (source: string): Exclude<TrackType, 'all'> => {
    if (source === 'creation') return 'both'
    if (source === 'reconciliation') return 'cdt'
    return 'mv'
  }

  // Filter list
  const filteredConfigs = useMemo(() => {
    return configList.filter((c: any) => {
      if (filter === 'all') return true
      return getTrack(c.source) === filter
    })
  }, [configList, filter])

  // Count summaries
  const mvCount = configList.filter((c: any) => getTrack(c.source) === 'mv').length
  const cdtCount = configList.filter((c: any) => getTrack(c.source) === 'cdt').length
  const initCount = configList.filter((c: any) => getTrack(c.source) === 'both').length

  const cardCurrent: CurrentTbcConfigCardPeriod | null = useMemo(() => {
    if (!currentConfig) return null
    return {
      __version: currentConfig.version_number ? `v${currentConfig.version_number}` : 'v1',
      record: currentConfig,
    }
  }, [currentConfig])

  // Calculate pricing summaries
  const dealPrice = parseFloat(
    workspace?.pricing?.fee_calculation_price || workspace?.pricing?.listed_price || '0'
  )

  // Chronological sorting as defined in pretty mockup
  const parseLadDate = (s: string) => {
    if (!s) return new Date(0)
    return new Date(s)
  }
  const eventsAsc = useMemo(() => {
    return [...filteredConfigs].sort(
      (a: any, b: any) =>
        parseLadDate(a.created_at).getTime() - parseLadDate(b.created_at).getTime()
    )
  }, [filteredConfigs])

  if (isLoading) {
    return (
      <Flex align="center" justify="center" className="h-40">
        <span className="text-content-dark-3 text-sm">Đang tải cấu hình...</span>
      </Flex>
    )
  }

  if (error) {
    return (
      <Flex align="center" justify="center" className="h-40">
        <span className="text-data-red-default text-sm">Có lỗi xảy ra khi tải cấu hình.</span>
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="4">
      <CurrentTbcConfigCard current={cardCurrent} />

      {/* SECTION A: Adjustment Version Timeline */}
      <section className="m4-art" style={{ marginBottom: 16 }}>
        <div className="m4-card-head">
          <span className="num-tag">A</span>
          <div>
            <h4>Lô áp dụng cấu hình — đã áp dụng vào GD này</h4>
            <div className="sub">
              {configList.length} LAD — mv-track {mvCount}, cdt-track {cdtCount}, khởi tạo{' '}
              {initCount}
            </div>
          </div>
          <div className="actions">
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${filter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setFilter('all')}
              >
                Tất cả ({configList.length})
              </button>
              <button
                className={`btn btn-sm ${filter === 'mv' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setFilter('mv')}
              >
                MV nội bộ ({mvCount})
              </button>
              <button
                className={`btn btn-sm ${filter === 'cdt' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setFilter('cdt')}
              >
                CĐT ({cdtCount})
              </button>
              <button
                className={`btn btn-sm ${filter === 'both' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setFilter('both')}
              >
                Init ({initCount})
              </button>
            </div>
          </div>
        </div>

        {/* Timeline list container */}
        <div style={{ padding: '20px 24px', background: '#fff' }}>
          <div style={{ position: 'relative', paddingLeft: 34 }}>
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: 8,
                bottom: 8,
                width: 2,
                background: 'var(--color-border-1)',
              }}
            />

            {eventsAsc.map((c: any, i: number) => {
              const track = getTrack(c.source)
              const km = KIND_METAS[c.source] || { label: c.source, tone: 'grey' }
              const tm = TRACK_METAS[track]
              const deltaData = configDeltas[c.id] || { fee_from: null, fee_to: 0, delta_pct: 0 }
              const isPending = track === 'mv'
              const eventTitle = getLadEventTitle(c)
              const ladPath = buildLadDetailPath(c)
              // Khi lô chưa có tên, tiêu đề đã mượn chính lý do — đừng lặp lại nó ở cuối thẻ.
              const reasonText = c.reason?.trim()
              const showReason = !!reasonText && reasonText !== eventTitle
              const dotColor = isPending
                ? 'var(--color-data-orange-hover)'
                : track === 'both'
                  ? 'var(--color-data-blue-default)'
                  : 'var(--color-data-green-default)'

              return (
                <div
                  key={c.id}
                  style={{
                    position: 'relative',
                    marginBottom: i === eventsAsc.length - 1 ? 0 : 20,
                  }}
                >
                  {/* Outer timeline ring dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -30,
                      top: 6,
                      width: 18,
                      height: 18,
                      borderRadius: 99,
                      background: '#fff',
                      border: `3px solid ${dotColor}`,
                    }}
                  />
                  {/* Detail event card */}
                  <div
                    style={{
                      border: `1px solid ${
                        isPending ? 'var(--color-data-orange-focus)' : 'var(--color-border-1)'
                      }`,
                      borderLeft: `3px solid ${dotColor}`,
                      borderRadius: 4,
                      padding: '14px 18px',
                      background: isPending ? '#fffaf2' : '#fff',
                      cursor: 'pointer',
                    }}
                    onClick={() => setOpenLadId(c.id)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <code className="m4-code">{c.batch_code || `LAD #${c.version_number}`}</code>
                      <span className={`m4-pill m4-pill-${km.tone}`}>
                        <span className="dot" />
                        {km.label}
                      </span>
                      <span className={`m4-pill m4-pill-${tm.tone}`}>{tm.label}</span>
                      <div style={{ flex: 1 }} />
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--color-content-dark-3)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {formatDate(c.created_at, 'dd/MM/yyyy • HH:mm')}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--color-content-dark-1)',
                        marginBottom: 6,
                        lineHeight: 1.4,
                      }}
                    >
                      {eventTitle}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        marginBottom: 8,
                        fontSize: 13,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span className="m4-num">
                        <span
                          style={{
                            color: 'var(--color-content-dark-3)',
                            textDecoration: deltaData.fee_from != null ? 'line-through' : 'none',
                          }}
                        >
                          {deltaData.fee_from != null ? formatPercent(deltaData.fee_from) : '—'}
                        </span>
                        <span style={{ margin: '0 6px', color: 'var(--color-content-dark-4)' }}>
                          →
                        </span>
                        <b>{formatPercent(deltaData.fee_to)}</b>
                      </span>
                      <span
                        style={{
                          background: isPending
                            ? 'var(--color-data-orange-disabled)'
                            : 'var(--color-data-green-disabled)',
                          color: isPending
                            ? 'var(--color-data-orange-hover)'
                            : 'var(--color-data-green-default)',
                          padding: '2px 10px',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                        className="m4-num"
                      >
                        {deltaData.delta_pct >= 0 ? '+' : ''}
                        {formatNumber(deltaData.delta_pct, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        % / {formatCurrencyVND(Math.round((dealPrice * deltaData.delta_pct) / 100))}{' '}
                        VND
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-content-dark-3)',
                        marginBottom: 6,
                        display: 'flex',
                        gap: 14,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        Nguồn:{' '}
                        {ladPath ? (
                          <Link
                            to={ladPath}
                            // Thẻ cha mở modal khi click — chặn nổi bọt để link đi thẳng sang màn LAD.
                            onClick={(e) => e.stopPropagation()}
                            className="text-action-primary-red-default hover:underline"
                            title="Mở chi tiết lô áp dụng"
                          >
                            <code className="m4-code">{c.batch_code || c.source}</code>
                          </Link>
                        ) : (
                          <code className="m4-code">{c.batch_code || c.source}</code>
                        )}
                      </span>
                      <span>
                        Scope: <b style={{ color: 'var(--color-content-dark-2)' }}>1 Giao dịch</b>
                      </span>
                      <span>
                        Apply: <b style={{ color: 'var(--color-content-dark-2)' }}>Hệ thống</b>
                      </span>
                    </div>
                    {showReason && (
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--color-content-dark-2)',
                          lineHeight: 1.6,
                          marginTop: 8,
                        }}
                      >
                        <span style={{ color: 'var(--color-content-dark-3)' }}>Lý do: </span>
                        {reasonText}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="m4-foot">
          <span>
            Đang xem{' '}
            <b>
              {filteredConfigs.length} / {configList.length}
            </b>
          </span>
          <span style={{ marginLeft: 'auto' }}>Click mỗi thẻ LAD để xem snapshot đầy đủ</span>
        </div>
      </section>

      {/* Modal detail overlay */}
      {openLadId && (
        <LadDetailModal
          ladId={openLadId}
          onClose={() => setOpenLadId(null)}
          dealId={dealId}
          configList={configList}
          dealPrice={dealPrice}
        />
      )}
    </Flex>
  )
}

export default DealLadTab
