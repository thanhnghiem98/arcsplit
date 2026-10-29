import { useState, useCallback, useMemo } from 'react'
import { isAddress } from 'viem'
import { parseUSDC, percentToBp } from '@/lib/utils'

export interface RecipientRow {
  id: string
  address: string
  percent: string
}

export interface SplitFormState {
  amount: string
  recipients: RecipientRow[]
}

export interface FormValidation {
  isValid: boolean
  amountError: string | null
  recipientErrors: Record<string, string>
  totalBpError: string | null
  totalBp: number
}

function makeRow(): RecipientRow {
  return { id: crypto.randomUUID(), address: '', percent: '' }
}

export function useSplitForm() {
  const [amount, setAmount] = useState('')
  const [recipients, setRecipients] = useState<RecipientRow[]>([makeRow(), makeRow()])

  const addRecipient = useCallback(() => {
    if (recipients.length >= 50) return
    setRecipients((r) => [...r, makeRow()])
  }, [recipients.length])

  const removeRecipient = useCallback((id: string) => {
    setRecipients((r) => r.filter((row) => row.id !== id))
  }, [])

  const updateRecipient = useCallback((id: string, field: 'address' | 'percent', value: string) => {
    setRecipients((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }, [])

  const validation = useMemo<FormValidation>(() => {
    const recipientErrors: Record<string, string> = {}
    let amountError: string | null = null
    let totalBpError: string | null = null

    // Amount validation
    const parsedAmount = parseUSDC(amount)
    if (!amount) {
      amountError = 'Enter a USDC amount.'
    } else if (parsedAmount === 0n) {
      amountError = 'Amount must be greater than 0.'
    }

    // Recipient validation
    const seenAddresses = new Set<string>()
    let totalBp = 0

    for (const row of recipients) {
      const addr = row.address.trim()
      const pct = row.percent.trim()

      if (!addr) {
        recipientErrors[row.id] = 'Enter an address.'
      } else if (!isAddress(addr)) {
        recipientErrors[row.id] = 'Invalid EVM address.'
      } else if (seenAddresses.has(addr.toLowerCase())) {
        recipientErrors[row.id] = 'Duplicate address.'
      } else {
        seenAddresses.add(addr.toLowerCase())
      }

      if (!pct) {
        if (!recipientErrors[row.id]) recipientErrors[row.id] = 'Enter a percentage.'
      } else {
        const bp = percentToBp(pct)
        if (isNaN(bp) || bp <= 0) {
          if (!recipientErrors[row.id]) recipientErrors[row.id] = 'Percentage must be > 0.'
        } else {
          totalBp += bp
          // Validate each recipient's computed payment > 0
          if (parsedAmount > 0n) {
            const recipientAmount = (parsedAmount * BigInt(bp)) / 10_000n
            if (recipientAmount === 0n) {
              if (!recipientErrors[row.id]) recipientErrors[row.id] = 'Amount too small for this allocation.'
            }
          }
        }
      }
    }

    if (totalBp !== 10_000 && recipients.some((r) => r.percent.trim() !== '')) {
      totalBpError = `Allocations must sum to 100.00% (currently ${(totalBp / 100).toFixed(2)}%).`
    }

    const isValid =
      !amountError &&
      Object.keys(recipientErrors).length === 0 &&
      !totalBpError &&
      recipients.length >= 1 &&
      totalBp === 10_000

    return { isValid, amountError, recipientErrors, totalBpError, totalBp }
  }, [amount, recipients])

  const parsedAmount = useMemo(() => parseUSDC(amount), [amount])

  const recipientAmounts = useMemo(() => {
    return recipients.map((row, idx) => {
      const bp = percentToBp(row.percent)
      if (!row.percent || isNaN(bp) || bp <= 0 || parsedAmount === 0n) return 0n
      if (idx === recipients.length - 1) {
        // rounding dust goes to last recipient — mirroring contract logic
        const otherSum = recipients.slice(0, -1).reduce((acc, r) => {
          const b = percentToBp(r.percent)
          if (isNaN(b) || b <= 0) return acc
          return acc + (parsedAmount * BigInt(b)) / 10_000n
        }, 0n)
        return parsedAmount - otherSum
      }
      return (parsedAmount * BigInt(bp)) / 10_000n
    })
  }, [recipients, parsedAmount])

  const reset = useCallback(() => {
    setAmount('')
    setRecipients([makeRow(), makeRow()])
  }, [])

  return {
    amount,
    setAmount,
    recipients,
    addRecipient,
    removeRecipient,
    updateRecipient,
    validation,
    parsedAmount,
    recipientAmounts,
    reset,
  }
}
