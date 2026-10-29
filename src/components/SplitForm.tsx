import { Plus, Trash2, Info } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import type { RecipientRow, FormValidation } from '@/hooks/useSplitForm'
import { formatUSDC } from '@/lib/utils'

interface SplitFormProps {
  amount: string
  setAmount: (v: string) => void
  recipients: RecipientRow[]
  recipientAmounts: bigint[]
  addRecipient: () => void
  removeRecipient: (id: string) => void
  updateRecipient: (id: string, field: 'address' | 'percent', value: string) => void
  validation: FormValidation
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

export function SplitForm({
  amount,
  setAmount,
  recipients,
  recipientAmounts,
  addRecipient,
  removeRecipient,
  updateRecipient,
  validation,
}: SplitFormProps) {
  return (
    <div className="space-y-4">
      {/* Amount Input */}
      <div className="rounded-2xl p-4" style={glass.card}>
        <div className="flex items-center gap-2 mb-3">
          <TokenUSDC variant="branded" size={18} />
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--subtle)' }}>
            Total USDC Amount
          </span>
        </div>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, '')
            if (v === '' || /^\d*\.?\d{0,6}$/.test(v)) setAmount(v)
          }}
          placeholder="0.00"
          className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:opacity-20"
          style={{ color: 'var(--ink)' }}
        />
        {validation.amountError && (
          <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{validation.amountError}</p>
        )}
      </div>

      {/* Recipients */}
      <div className="rounded-2xl p-4 space-y-3" style={glass.card}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--subtle)' }}>
            Recipients
          </span>
          <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
            {recipients.length} / 50
          </span>
        </div>

        {recipients.map((row, idx) => {
          const paidAmount = recipientAmounts[idx]
          return (
            <div key={row.id} className="rounded-xl p-3 space-y-2" style={glass.inner}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium w-5 tabular-nums shrink-0" style={{ color: 'var(--subtle)' }}>
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={row.address}
                  onChange={(e) => updateRecipient(row.id, 'address', e.target.value)}
                  placeholder="0x wallet address"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-30 mono truncate"
                  style={{ color: 'var(--ink-2)' }}
                  spellCheck={false}
                  autoComplete="off"
                />
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(row.id)}
                    className="shrink-0 rounded-lg p-1 transition-colors hover:opacity-70"
                    style={{ color: 'var(--subtle)' }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 pl-7">
                <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={glass.inner}>
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={row.percent}
                    onChange={(e) => updateRecipient(row.id, 'percent', e.target.value)}
                    placeholder="0.00"
                    className="w-16 bg-transparent text-sm font-semibold tabular-nums outline-none text-right placeholder:opacity-30"
                    style={{ color: 'var(--accent)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--subtle)' }}>%</span>
                </div>
                {paidAmount !== undefined && paidAmount > 0n && (
                  <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                    = {formatUSDC(paidAmount)} USDC
                  </span>
                )}
              </div>

              {validation.recipientErrors[row.id] && (
                <p className="pl-7 text-xs" style={{ color: 'var(--danger)' }}>
                  {validation.recipientErrors[row.id]}
                </p>
              )}
            </div>
          )
        })}

        {validation.totalBpError && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(232,109,122,0.08)', border: '1px solid rgba(232,109,122,0.2)' }}>
            <Info className="size-3.5 mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
            <p className="text-xs" style={{ color: 'var(--danger)' }}>{validation.totalBpError}</p>
          </div>
        )}

        {recipients.length < 50 && (
          <button
            type="button"
            onClick={addRecipient}
            className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70 mt-1"
            style={{ color: 'var(--accent)' }}
          >
            <Plus className="size-3.5" />
            Add recipient
          </button>
        )}
      </div>
    </div>
  )
}
