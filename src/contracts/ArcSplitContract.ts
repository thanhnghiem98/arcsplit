/**
 * ArcSplit contract config — import ABI from compiled Foundry artifact.
 *
 * CONTRACT ADDRESS: To be filled after mainnet deployment.
 * Set VITE_ARCSPLIT_ADDRESS in .env with the deployed address.
 *
 * On Arc Mainnet (chainId 5042), USDC is at 0x3600000000000000000000000000000000000000.
 */

export const ARCSPLIT_ABI = [
  {
    type: 'constructor',
    inputs: [{ name: 'usdcAddress', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'BASIS_POINTS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_RECIPIENTS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'USDC_ADDRESS',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSplitCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUsdcAddress',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'splitCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'splitPayment',
    inputs: [
      { name: 'recipients', type: 'address[]', internalType: 'address[]' },
      { name: 'basisPoints', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'totalAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'PaymentSplit',
    inputs: [
      { name: 'splitId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'sender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'totalAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'recipientCount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RecipientPaid',
    inputs: [
      { name: 'splitId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'basisPoints', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ArrayLengthMismatch',
    inputs: [],
  },
  {
    type: 'error',
    name: 'DuplicateRecipient',
    inputs: [{ name: 'recipient', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'EmptyRecipients',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidBasisPointsTotal',
    inputs: [{ name: 'sum', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TooManyRecipients',
    inputs: [
      { name: 'count', type: 'uint256', internalType: 'uint256' },
      { name: 'max', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [{ name: 'index', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'error',
    name: 'ZeroAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroBasisPoints',
    inputs: [{ name: 'index', type: 'uint256', internalType: 'uint256' }],
  },
] as const

/**
 * ArcSplit contract address on Arc Mainnet.
 * Set VITE_ARCSPLIT_ADDRESS in your .env after deploying.
 * PLACEHOLDER — replace with real deployed address before use.
 */
export const ARCSPLIT_ADDRESS = (import.meta.env.VITE_ARCSPLIT_ADDRESS ?? '') as `0x${string}`

export const ARCSPLIT_CONTRACT = {
  address: ARCSPLIT_ADDRESS,
  abi: ARCSPLIT_ABI,
} as const
