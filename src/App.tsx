import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { isAddress } from 'viem'
import { toast } from 'sonner'

import { useSplitForm } from '@/hooks/useSplitForm'
import { useArcSplit } from '@/hooks/useArcSplit'
import { useSplitHistory } from '@/hooks/useSplitHistory'
import { percentToBp } from '@/lib/utils'
import { ARC_MAINNET_ID } from '@/config'

import { NetworkBadge, NetworkWarning } from '@/components/NetworkGuard'
import { SplitForm } from '@/components/SplitForm'
import { SplitSummary } from '@/components/SplitSummary'
import { SplitActions } from '@/components/SplitActions'
import { SplitHistory } from '@/components/SplitHistory'

export default function App() {
  const { isConnected, chainId } = useAccount()
  const isCorrectChain = !isConnected || chainId === ARC_MAINNET_ID

  const {
    amount,
    setAmount,
    recipients,
    addRecipient,
    removeRecipient,
    updateRecipient,
    validation,
    parsedAmount,
    recipientAmounts,
    reset: resetForm,
  } = useSplitForm()

  const {
    step,
    setStep,
    errorMessage,
    approveTxHash,
    splitTxHash,
    isApproveConfirming,
    isApproveSuccess,
    isSplitConfirming,
    isSplitSuccess,
    allowance,
    usdcBalance,
    approve,
    executeSplit,
    reset: resetSplit,
    needsApproval,
    refetchAllowance,
    isContractDeployed,
  } = useArcSplit()

  const { records, loading: historyLoading, error: historyError, refresh: refreshHistory } = useSplitHistory()

  // After approval confirmed, refetch allowance
  useEffect(() => {
    if (isApproveSuccess) {
      void refetchAllowance()
      setStep('split')
      toast.success('USDC approved. Ready to split.')
    }
  }, [isApproveSuccess, refetchAllowance, setStep])

  // After split confirmed, refresh history
  useEffect(() => {
    if (isSplitSuccess) {
      void refreshHistory()
      toast.success('Split complete. All recipients paid.')
    }
  }, [isSplitSuccess, refreshHistory])

  const handleReset = () => {
    resetForm()
    resetSplit()
  }

  const handleApprove = () => {
    if (!isConnected || !isCorrectChain || parsedAmount === 0n) return
    void approve(parsedAmount)
  }

  const handleSplit = () => {
    if (!isConnected || !isCorrectChain || !validation.isValid) return
    const rcpts = recipients
      .map((r) => r.address.trim() as `0x${string}`)
      .filter((a): a is `0x${string}` => isAddress(a))
    const bps = recipients.map((r) => BigInt(percentToBp(r.percent)))
    void executeSplit(rcpts, bps, parsedAmount)
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)', backgroundImage: 'var(--bg-gradient)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-3" style={{ background: 'rgba(13,27,47,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Logo mark */}
            <div className="flex size-8 items-center justify-center rounded-xl font-bold text-sm" style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
              AS
            </div>
            <div>
              <span className="display text-base font-bold" style={{ color: 'var(--ink)' }}>ArcSplit</span>
              <span className="hidden sm:inline text-xs ml-2" style={{ color: 'var(--subtle)' }}>USDC Payment Splitter</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NetworkBadge />
            <ConnectKitButton.Custom>
              {({ isConnected, show, address, ensName }) => (
                <button
                  onClick={show}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                  style={isConnected
                    ? { background: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--ink-2)' }
                    : { background: 'var(--accent)', color: '#0d1b2f' }
                  }
                >
                  {isConnected ? (ensName ?? (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connected')) : 'Connect Wallet'}
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Hero */}
        <div className="text-center py-2">
          <h1 className="display text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            Split USDC instantly
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Distribute USDC to multiple wallets in one atomic transaction on Arc Mainnet.
          </p>
        </div>

        {/* Network warning */}
        <NetworkWarning />

        {/* Split form */}
        <SplitForm
          amount={amount}
          setAmount={setAmount}
          recipients={recipients}
          recipientAmounts={recipientAmounts}
          addRecipient={addRecipient}
          removeRecipient={removeRecipient}
          updateRecipient={updateRecipient}
          validation={validation}
        />

        {/* Summary */}
        {parsedAmount > 0n && (
          <SplitSummary
            amount={amount}
            parsedAmount={parsedAmount}
            recipients={recipients}
            recipientAmounts={recipientAmounts}
          />
        )}

        {/* Actions */}
        <SplitActions
          isValid={validation.isValid}
          step={step}
          errorMessage={errorMessage}
          approveTxHash={approveTxHash}
          splitTxHash={splitTxHash}
          isApproveConfirming={isApproveConfirming}
          isApproveSuccess={isApproveSuccess}
          isSplitConfirming={isSplitConfirming}
          isSplitSuccess={isSplitSuccess}
          allowance={allowance}
          parsedAmount={parsedAmount}
          needsApproval={needsApproval}
          isContractDeployed={isContractDeployed}
          onApprove={handleApprove}
          onSplit={handleSplit}
          onReset={handleReset}
          usdcBalance={usdcBalance}
        />

        {/* History */}
        <SplitHistory
          records={records}
          loading={historyLoading}
          error={historyError}
          onRefresh={() => { void refreshHistory() }}
        />

        {/* Footer */}
        <footer className="text-center pb-6">
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            ArcSplit · Powered by{' '}
            <a href="https://arc.io" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: 'var(--accent)' }}>
              Arc
            </a>{' '}
            · USDC by{' '}
            <a href="https://circle.com" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: 'var(--accent)' }}>
              Circle
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
