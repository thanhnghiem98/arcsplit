import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`

export function formatUSDC(raw: bigint | number | string, decimals = 6): string {
  const n = typeof raw === 'bigint' ? Number(raw) / 10 ** decimals : Number(raw)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function parseUSDC(value: string): bigint {
  if (!value || isNaN(Number(value))) return 0n
  const [int, frac = ''] = value.split('.')
  const padded = frac.slice(0, 6).padEnd(6, '0')
  return BigInt(int) * 1_000_000n + BigInt(padded)
}

export function bpToPercent(bp: number): string {
  return (bp / 100).toFixed(2)
}

export function percentToBp(pct: string): number {
  return Math.round(parseFloat(pct) * 100)
}

export function parseOnchainError(error: unknown): string {
  const message = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (message.includes('user rejected') || (error as { code?: number })?.code === 4001) {
    return 'Transaction cancelled.'
  }
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) {
    return 'Insufficient balance. Please add funds and try again.'
  }
  if (message.includes('allowance')) {
    return 'USDC allowance insufficient. Please approve first.'
  }
  if (message.includes('reverted')) {
    const match = message.match(/reason="([^"]+)"/)
    return match ? `Transaction failed: ${match[1]}` : 'Transaction reverted. Check your inputs and try again.'
  }
  if (message.includes('network') || message.includes('timeout')) {
    return 'Network error. Please check your connection and retry.'
  }
  return 'Something went wrong. Please try again.'
}
