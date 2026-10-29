/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'
import { registerChain } from './tracing'

// Arc Mainnet (chainId 5042)
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' },
  },
})

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arcMainnet, arcTestnet, mainnet],
  connectors: [injected()],
  transports: {
    [arcMainnet.id]: http(),
    [arcTestnet.id]: http(),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})

export const ARC_MAINNET_ID = arcMainnet.id
export const ARC_TESTNET_ID = arcTestnet.id

/** USDC on Arc (mainnet + testnet share the same address 0x3600...) */
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const
