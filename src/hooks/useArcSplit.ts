import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { ARCSPLIT_ABI, ARCSPLIT_ADDRESS } from '@/contracts/ArcSplitContract'
import { USDC_ADDRESS, ARC_MAINNET_ID } from '@/config'
import { parseOnchainError } from '@/lib/utils'

export type SplitStep = 'idle' | 'approve' | 'approving' | 'approve_confirming' | 'split' | 'splitting' | 'split_confirming' | 'success' | 'error'

export function useArcSplit() {
  const { address, chainId } = useAccount()
  const [step, setStep] = useState<SplitStep>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>()
  const [splitTxHash, setSplitTxHash] = useState<`0x${string}` | undefined>()

  const { writeContract } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    chainId: ARC_MAINNET_ID,
  })

  const { isLoading: isSplitConfirming, isSuccess: isSplitSuccess } = useWaitForTransactionReceipt({
    hash: splitTxHash,
    chainId: ARC_MAINNET_ID,
  })

  // Read current USDC allowance for the ArcSplit contract
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', ARCSPLIT_ADDRESS],
    chainId: ARC_MAINNET_ID,
    query: { enabled: !!address && !!ARCSPLIT_ADDRESS },
  })

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    chainId: ARC_MAINNET_ID,
    query: { enabled: !!address },
  })

  const approve = useCallback(
    (totalAmount: bigint) => {
      if (!address || chainId !== ARC_MAINNET_ID) return
      setStep('approving')
      setErrorMessage(null)
      writeContract(
        {
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [ARCSPLIT_ADDRESS, totalAmount],
          chainId: ARC_MAINNET_ID,
        },
        {
          onSuccess: (hash) => {
            setApproveTxHash(hash)
            setStep('approve_confirming')
          },
          onError: (err) => {
            setErrorMessage(parseOnchainError(err))
            setStep('error')
          },
        },
      )
    },
    [address, chainId, writeContract],
  )

  const executeSplit = useCallback(
    (recipients: readonly `0x${string}`[], basisPoints: readonly bigint[], totalAmount: bigint) => {
      if (!address || chainId !== ARC_MAINNET_ID || !ARCSPLIT_ADDRESS) return
      setStep('splitting')
      setErrorMessage(null)
      writeContract(
        {
          address: ARCSPLIT_ADDRESS,
          abi: ARCSPLIT_ABI,
          functionName: 'splitPayment',
          args: [recipients, basisPoints, totalAmount],
          chainId: ARC_MAINNET_ID,
        },
        {
          onSuccess: (hash) => {
            setSplitTxHash(hash)
            setStep('split_confirming')
          },
          onError: (err) => {
            setErrorMessage(parseOnchainError(err))
            setStep('error')
          },
        },
      )
    },
    [address, chainId, writeContract],
  )

  const reset = useCallback(() => {
    setStep('idle')
    setErrorMessage(null)
    setApproveTxHash(undefined)
    setSplitTxHash(undefined)
  }, [])

  const needsApproval = (totalAmount: bigint): boolean => {
    if (!allowance) return true
    return (allowance) < totalAmount
  }

  return {
    step,
    setStep,
    errorMessage,
    approveTxHash,
    splitTxHash,
    isApproveConfirming,
    isApproveSuccess,
    isSplitConfirming,
    isSplitSuccess,
    allowance: allowance,
    usdcBalance: usdcBalance,
    approve,
    executeSplit,
    reset,
    needsApproval,
    refetchAllowance,
    isContractDeployed: !!ARCSPLIT_ADDRESS,
  }
}
