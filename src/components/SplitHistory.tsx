import { ExternalLink, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { useState } from 'react'
import type { SplitRecord } from '@/hooks/useSplitHistory'
import { formatAddress, formatUSDC } from '@/lib/utils'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { ARC_MAINNET_ID } from '@/config'

interface SplitHistoryProps {
  records: SplitRecord[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

const glass = {
  card: {
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
  } as React.CSSProperties,
  inner: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
  } as React.CSSProperties,
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return 'Unknown time'
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HistoryRow({ record }: { record: SplitRecord }) {
  const [expanded, setExpanded] = useState(false)
  const explorerUrl = buildTxExplorerUrl(ARC_MAINNET_ID, record.txHash)

  return (
    <div className="rounded-xl overflow-hidden" style={glass.inner}>
      <button
        className="w-full flex items-center gap-3 px-3 py-3 text-left transition-opacity hover:opacity-80"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
              {record.formattedTotal} USDC
            </span>
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>
              to {record.recipientCount.toString()} recipient{record.recipientCount !== 1n ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="size-3" style={{ color: 'var(--subtle)' }} />
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>
              {formatTimestamp(record.timestamp)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            <ExternalLink className="size-3.5" />
          </a>
          {expanded ? (
            <ChevronUp className="size-4" style={{ color: 'var(--subtle)' }} />
          ) : (
            <ChevronDown className="size-4" style={{ color: 'var(--subtle)' }} />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="pt-2">
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Sender: <span className="mono" style={{ color: 'var(--muted)' }}>{formatAddress(record.sender)}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
              Tx: <span className="mono" style={{ color: 'var(--muted)' }}>{formatAddress(record.txHash)}</span>
            </p>
          </div>
          {record.recipients.length > 0 && (
            <div className="space-y-1">
              {record.recipients.map((r) => (
                <div key={r.recipient} className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="mono text-xs flex-1 truncate" style={{ color: 'var(--muted)' }}>
                    {formatAddress(r.recipient)}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--ink-2)' }}>
                    {formatUSDC(r.amount)} USDC
                  </span>
                  <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                    ({(Number(r.basisPoints) / 100).toFixed(2)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SplitHistory({ records, loading, error, onRefresh }: SplitHistoryProps) {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={glass.card}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--subtle)' }}>
          Recent Splits
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ color: 'var(--accent)' }}
        >
          <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="text-xs text-center py-4" style={{ color: 'var(--subtle)' }}>
          Loading history…
        </div>
      )}

      {error && !loading && (
        <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      {!loading && !error && records.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--subtle)' }}>
          No splits found in the last 5,000 blocks.
        </p>
      )}

      {!loading && records.map((r) => <HistoryRow key={r.splitId + r.txHash} record={r} />)}
    </div>
  )
}
