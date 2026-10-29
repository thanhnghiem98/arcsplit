import { Loader2, CheckCircle2, ExternalLink, RotateCcw, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import type { SplitStep } from '@/hooks/useArcSplit'
import { ARC_MAINNET_ID } from '@/config'
import { formatUSDC, formatAddress } from '@/lib/utils'
import { buildTxExplorerUrl } from '@/onchain-facts'

interface SplitActionsProps {
  isValid: boolean
  step: SplitStep
  errorMessage: string | null
  approveTxHash?: `0x${string}`
  splitTxHash?: `0x${string}`
  isApproveConfirming: boolean
  isApproveSuccess: boolean
  isSplitConfirming: boolean
  isSplitSuccess: boolean
  allowance: bigint | undefined
  parsedAmount: bigint
  needsApproval: (amount: bigint) => boolean
  isContractDeployed: boolean
  onApprove: () => void
  onSplit: () => void
  onReset: () => void
  usdcBalance: bigint | undefined
}

const glass = {
  card: {
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
  } as React.CSSProperties,
}

export function SplitActions({
  isValid,
  step,
  errorMessage,
  approveTxHash,
  splitTxHash,
  isApproveConfirming,
  isApproveSuccess,
  isSplitConfirming,
  isSplitSuccess,
  allowance: _allowance,
  parsedAmount,
  needsApproval,
  isContractDeployed,
  onApprove,
  onSplit,
  onReset,
  usdcBalance,
}: SplitActionsProps) {
  const { isConnected, chainId } = useAccount()
  const isWrongChain = isConnected && chainId !== ARC_MAINNET_ID

  // Not deployed yet
  if (!isContractDeployed) {
    return (
      <div className="rounded-2xl p-4 text-center" style={glass.card}>
        <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          Contract not yet deployed. Set <span className="mono text-xs">VITE_ARCSPLIT_ADDRESS</span> in <span className="mono text-xs">.env</span> after deploying to Arc Mainnet.
        </p>
      </div>
    )
  }

  // Success state
  if (isSplitSuccess && splitTxHash) {
    const explorerUrl = buildTxExplorerUrl(ARC_MAINNET_ID, splitTxHash)
    return (
      <div className="rounded-2xl p-5 space-y-4" style={glass.card}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full" style={{ background: 'rgba(141,216,159,0.12)' }}>
            <CheckCircle2 className="size-5" style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--success)' }}>Split complete</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>All recipients have been paid.</p>
          </div>
        </div>

        <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Transaction</p>
          <p className="mono text-xs truncate" style={{ color: 'var(--muted)' }}>{splitTxHash}</p>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium mt-1 transition-opacity hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            View on Arc Explorer <ExternalLink className="size-3" />
          </a>
        </div>

        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--ink-2)' }}
        >
          <RotateCcw className="size-4" />
          New split
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={glass.card}>
      {/* Balance hint */}
      {isConnected && !isWrongChain && usdcBalance !== undefined && (
        <p className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
          Your USDC balance: <span style={{ color: 'var(--ink-2)' }}>{formatUSDC(usdcBalance)}</span>
        </p>
      )}

      {/* Error */}
      {(step === 'error' || errorMessage) && (
        <div className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(232,109,122,0.1)', border: '1px solid rgba(232,109,122,0.25)' }}>
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
          <p className="text-xs" style={{ color: 'var(--danger)' }}>{errorMessage}</p>
        </div>
      )}

      {/* Approve tx pending */}
      {approveTxHash && isApproveConfirming && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <Loader2 className="size-3.5 animate-spin" />
          <span>Confirming approval… </span>
          <a href={buildTxExplorerUrl(ARC_MAINNET_ID, approveTxHash)} target="_blank" rel="noopener noreferrer" className="underline">
            {formatAddress(approveTxHash)}
          </a>
        </div>
      )}

      {/* Approval step */}
      {!isSplitSuccess && isValid && !isWrongChain && parsedAmount > 0n && needsApproval(parsedAmount) && !isApproveSuccess && (
        <Step number={1} label="Approve USDC" done={false} active={true}>
          <p className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
            Allow ArcSplit to spend {formatUSDC(parsedAmount)} USDC on your behalf.
          </p>
          <button
            disabled={step === 'approving' || step === 'approve_confirming' || isApproveConfirming}
            onClick={onApprove}
            className="w-full rounded-2xl py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            {step === 'approving' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Confirm in wallet…
              </span>
            ) : step === 'approve_confirming' || isApproveConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Confirming approval…
              </span>
            ) : (
              'Approve USDC'
            )}
          </button>
        </Step>
      )}

      {/* Split step */}
      {!isSplitSuccess && isValid && !isWrongChain && parsedAmount > 0n && (isApproveSuccess || !needsApproval(parsedAmount)) && (
        <Step number={needsApproval(parsedAmount) ? 2 : 1} label="Send Split" done={false} active={true}>
          <p className="text-xs mb-2" style={{ color: 'var(--subtle)' }}>
            Distribute {formatUSDC(parsedAmount)} USDC atomically to all recipients.
          </p>
          <button
            disabled={step === 'splitting' || step === 'split_confirming' || isSplitConfirming}
            onClick={onSplit}
            className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            {step === 'splitting' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Confirm in wallet…
              </span>
            ) : step === 'split_confirming' || isSplitConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Confirming split…
              </span>
            ) : (
              'Send Split'
            )}
          </button>
        </Step>
      )}

      {/* Not connected */}
      {!isConnected && (
        <ConnectKitButton.Custom>
          {({ show }) => (
            <button
              onClick={show}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}
            >
              Connect Wallet
            </button>
          )}
        </ConnectKitButton.Custom>
      )}

      {/* Valid but waiting */}
      {isConnected && !isWrongChain && isValid && parsedAmount === 0n && (
        <button disabled className="w-full rounded-2xl py-3.5 text-sm font-semibold opacity-40 cursor-not-allowed"
          style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
          Enter an amount
        </button>
      )}

      {/* Form not valid */}
      {isConnected && !isWrongChain && !isValid && parsedAmount > 0n && (
        <button disabled className="w-full rounded-2xl py-3.5 text-sm font-semibold opacity-40 cursor-not-allowed"
          style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
          Complete the form
        </button>
      )}
    </div>
  )
}

function Step({ number, label, done, active, children }: { number: number; label: string; done: boolean; active: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex size-5 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: done ? 'rgba(141,216,159,0.2)' : active ? 'rgba(172,198,233,0.2)' : 'rgba(255,255,255,0.07)', color: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--subtle)' }}>
          {number}
        </div>
        <span className="text-xs font-semibold" style={{ color: done ? 'var(--success)' : active ? 'var(--ink-2)' : 'var(--subtle)' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}
