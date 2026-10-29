# ArcSplit — USDC Payment Splitter

Distribute USDC to multiple wallet addresses in a single atomic transaction on Arc Mainnet. If any transfer fails, the entire split reverts — no partial payments.

Built with [Arc Studio](https://studio.arc.io)

---

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Web3:** wagmi v2, viem v2, ConnectKit
- **Contracts:** Solidity 0.8.28, OpenZeppelin 5.6.1 (SafeERC20, ReentrancyGuard), Foundry
- **Chain:** Arc Mainnet (chainId 5042)
- **Token:** USDC (`0x3600000000000000000000000000000000000000`, 6 decimals)

## What It Does

1. Connect your EVM wallet (MetaMask or compatible).
2. Enter a total USDC amount and add recipient addresses with percentage allocations.
3. Approve the contract to spend your USDC (one-time per amount).
4. Execute the split — USDC is sent directly from your wallet to every recipient in one transaction.
5. View the distribution summary and transaction hash with a link to Arc Explorer.

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.x
- [Foundry](https://book.getfoundry.sh) (forge, cast, anvil)
- An EVM wallet (MetaMask) with Arc Mainnet added

### Install

```bash
bun install
```

### Environment Variables

Copy `env.example` to `.env` and fill in the values.

| Variable | Purpose |
|---|---|
| `VITE_ARCSPLIT_ADDRESS` | Deployed ArcSplit contract address on Arc Mainnet. Set after deploying. |
| `RPC_PROXY_BASE_URL` | RPC proxy base URL (optional outside Arc Studio). |
| `RPC_PROXY_TOKEN` | RPC proxy token (optional outside Arc Studio). |
| `RPC_PROXY_CHAINS` | Comma-separated proxy chain names (optional outside Arc Studio). |

### Run Locally

```bash
bun run dev
```

Opens at http://localhost:5173.

### Build

```bash
bunx vite build
```

## Smart Contract

Source: `contracts/ArcSplit.sol`

### Run Tests

```bash
bun run contracts:test
# or
forge test -vv
```

22 tests pass, covering happy paths, all revert cases, event emissions, reentrancy, and a fuzz test for total conservation.

### Deploy to Arc Mainnet

> Before deploying, read the mainnet risks disclaimer and ensure you have reviewed the contract independently.

1. Build the contract:
   ```bash
   forge build
   ```
2. Deploy using your own wallet with Foundry `forge create` (Mode 2 / self-deploy):
   ```bash
   forge create contracts/ArcSplit.sol:ArcSplit \
     --rpc-url https://rpc.mainnet.arc.io \
     --private-key $PRIVATE_KEY \
     --constructor-args 0x3600000000000000000000000000000000000000
   ```
3. Record the deployed address and set `VITE_ARCSPLIT_ADDRESS` in `.env`.
4. Restart the dev server.

### Contract: Key Details

| Property | Value |
|---|---|
| USDC address | `0x3600000000000000000000000000000000000000` |
| Max recipients | 50 |
| Allocation unit | Basis points (10,000 = 100.00%) |
| Custody | None — funds go directly sender → recipient |
| Upgradeability | None |
| Owner privileges | None |

## Deployment Record

| Network | Contract Address | Explorer |
|---|---|---|
| Arc Mainnet | PENDING | https://explorer.arc.io |

## Verifying Transactions on Arc Explorer

All `splitPayment` transactions emit:
- `PaymentSplit(splitId, sender, totalAmount, recipientCount)` — one per transaction
- `RecipientPaid(splitId, recipient, amount, basisPoints)` — one per recipient

Search for the transaction hash at [https://explorer.arc.io](https://explorer.arc.io) to verify.

## Arc Microgrants Submission Checklist

- [ ] Arc Studio project URL
- [ ] Public live application URL
- [ ] Verified Arc Mainnet contract address
- [ ] At least one real USDC distribution transaction hash
- [ ] Public GitHub repository URL
- [ ] Short project description (one paragraph)
- [ ] Walkthrough video (Arc Studio build, contract tests, live app, mainnet tx)
