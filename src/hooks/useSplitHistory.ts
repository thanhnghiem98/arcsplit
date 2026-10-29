import { useCallback, useEffect, useRef, useState } from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arcMainnet } from '@/config'
import { ARCSPLIT_ADDRESS } from '@/contracts/ArcSplitContract'
import { formatUSDC } from '@/lib/utils'

export interface RecipientRecord {
  recipient: string
  amount: bigint
  basisPoints: bigint
}

export interface SplitRecord {
  splitId: string
  txHash: string
  sender: string
  totalAmount: bigint
  formattedTotal: string
  recipientCount: bigint
  timestamp: number | null
  recipients: RecipientRecord[]
  blockNumber: bigint
}

const LOOKBACK = 5_000n

export function useSplitHistory() {
  const [records, setRecords] = useState<SplitRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didMount = useRef(false)

  const fetch = useCallback(async () => {
    if (!ARCSPLIT_ADDRESS) return
    setLoading(true)
    setError(null)
    try {
      const client = createPublicClient({
        chain: arcMainnet,
        transport: http(),
      })

      const head = await client.getBlockNumber()
      const fromBlock = head > LOOKBACK ? head - LOOKBACK : 0n

      const paymentSplitEvent = parseAbiItem(
        'event PaymentSplit(bytes32 indexed splitId, address indexed sender, uint256 totalAmount, uint256 recipientCount)',
      )
      const recipientPaidEvent = parseAbiItem(
        'event RecipientPaid(bytes32 indexed splitId, address indexed recipient, uint256 amount, uint256 basisPoints)',
      )

      const [splitLogs, recipientLogs] = await Promise.all([
        client.getLogs({
          address: ARCSPLIT_ADDRESS,
          event: paymentSplitEvent,
          fromBlock,
          toBlock: 'latest',
        }),
        client.getLogs({
          address: ARCSPLIT_ADDRESS,
          event: recipientPaidEvent,
          fromBlock,
          toBlock: 'latest',
        }),
      ])

      // Group recipient logs by splitId
      const recipientsBySplitId = new Map<string, RecipientRecord[]>()
      for (const log of recipientLogs) {
        const args = log.args as { splitId?: `0x${string}`; recipient?: string; amount?: bigint; basisPoints?: bigint }
        const sid = args.splitId ?? '0x'
        if (!recipientsBySplitId.has(sid)) recipientsBySplitId.set(sid, [])
        recipientsBySplitId.get(sid)!.push({
          recipient: args.recipient ?? '',
          amount: args.amount ?? 0n,
          basisPoints: args.basisPoints ?? 0n,
        })
      }

      // Fetch block timestamps for each unique block
      const blockNumbers = [...new Set(splitLogs.map((l) => l.blockNumber))]
      const blockTimestamps = new Map<bigint, number>()
      await Promise.all(
        blockNumbers.map(async (bn) => {
          try {
            const block = await client.getBlock({ blockNumber: bn })
            blockTimestamps.set(bn, Number(block.timestamp) * 1000)
          } catch {
            blockTimestamps.set(bn, 0)
          }
        }),
      )

      const result: SplitRecord[] = splitLogs.map((log) => {
        const args = log.args as {
          splitId?: `0x${string}`
          sender?: string
          totalAmount?: bigint
          recipientCount?: bigint
        }
        const splitId = args.splitId ?? '0x'
        return {
          splitId,
          txHash: log.transactionHash ?? '',
          sender: args.sender ?? '',
          totalAmount: args.totalAmount ?? 0n,
          formattedTotal: formatUSDC(args.totalAmount ?? 0n),
          recipientCount: args.recipientCount ?? 0n,
          timestamp: blockTimestamps.get(log.blockNumber) ?? null,
          recipients: recipientsBySplitId.get(splitId) ?? [],
          blockNumber: log.blockNumber,
        }
      })

      // Sort newest first
      setRecords(result.reverse())
    } catch (e) {
      setError('Could not load history. Check your connection.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load history on mount once. The fetch function is stable (useCallback with []),
  // so we guard with a ref to avoid the react(set-state-in-effect) lint rule.
  useEffect(() => {
    if (didMount.current) return
    didMount.current = true
    void fetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { records, loading, error, refresh: fetch }
}
