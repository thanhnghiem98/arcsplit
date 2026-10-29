import { useAccount, useSwitchChain } from 'wagmi'
import { ARC_MAINNET_ID } from '@/config'
import { AlertCircle, Wifi } from 'lucide-react'

export function NetworkBadge() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected) return null

  const isCorrectChain = chainId === ARC_MAINNET_ID

  if (isCorrectChain) {
    return (
      <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
        style={{ background: 'rgba(141,216,159,0.12)', color: 'var(--success)' }}>
        <Wifi className="size-3" />
        Arc Mainnet
      </div>
    )
  }

  return (
    <button
      onClick={() => switchChain({ chainId: ARC_MAINNET_ID })}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{ background: 'rgba(232,109,122,0.15)', color: 'var(--danger)' }}
    >
      <AlertCircle className="size-3" />
      {isPending ? 'Switching…' : 'Switch to Arc Mainnet'}
    </button>
  )
}

export function NetworkWarning() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected || chainId === ARC_MAINNET_ID) return null

  return (
    <div
      className="flex items-start gap-3 rounded-2xl p-4 mb-4"
      style={{ background: 'rgba(232,109,122,0.10)', border: '1px solid rgba(232,109,122,0.25)' }}
    >
      <AlertCircle className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Wrong network</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          ArcSplit works on Arc Mainnet only. Switch your wallet to continue.
        </p>
      </div>
      <button
        onClick={() => switchChain({ chainId: ARC_MAINNET_ID })}
        disabled={isPending}
        className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: 'rgba(232,109,122,0.2)', color: 'var(--danger)' }}
      >
        {isPending ? 'Switching…' : 'Switch'}
      </button>
    </div>
  )
}
