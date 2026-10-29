import { ArrowRight } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import type { RecipientRow } from '@/hooks/useSplitForm'
import { formatAddress, formatUSDC } from '@/lib/utils'

interface SplitSummaryProps {
  amount: string
  parsedAmount: bigint
  recipients: RecipientRow[]
  recipientAmounts: bigint[]
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

export function SplitSummary({ amount, parsedAmount, recipients, recipientAmounts }: SplitSummaryProps) {
  return (
    <div className="rounded-2xl p-4" style={glass.card}>
      <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--subtle)' }}>
        Distribution Summary
      </span>

      {/* Total */}
      <div className="mt-3 flex items-center gap-2">
        <TokenUSDC variant="branded" size={20} />
        <span className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
          {amount || '0.00'}
        </span>
        <span className="text-sm" style={{ color: 'var(--subtle)' }}>USDC</span>
      </div>

      {parsedAmount > 0n && recipients.length > 0 && (
        <div className="mt-4 space-y-2">
          {recipients.map((row, idx) => {
            const paid = recipientAmounts[idx]
            const addr = row.address.trim()
            if (!addr || !row.percent) return null
            return (
              <div key={row.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={glass.inner}>
                <ArrowRight className="size-3 shrink-0" style={{ color: 'var(--subtle)' }} />
                <span className="mono text-xs flex-1 truncate" style={{ color: 'var(--muted)' }}>
                  {addr.length > 10 ? formatAddress(addr) : addr}
                </span>
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                  {row.percent}%
                </span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>
                  {paid !== undefined && paid > 0n ? formatUSDC(paid) : '—'} USDC
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs" style={{ color: 'var(--subtle)' }}>
          {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} · Atomic distribution on Arc Mainnet
        </p>
      </div>
    </div>
  )
}
