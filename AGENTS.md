# ArcSplit

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** — what Arc Studio remembers about building this app.

---

## What This App Does

ArcSplit is a USDC payment splitter on Arc Mainnet. A sender enters a total USDC amount and a list of recipient addresses with basis-point allocations (summing to 10,000 = 100%), then executes a single atomic on-chain transaction that distributes USDC directly from the sender to every recipient. If any transfer fails, the entire split reverts.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS (Arc Dark theme)
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28, OpenZeppelin 5.6.1, Foundry
- Chain: Arc Mainnet (chainId 5042) + Arc Testnet (5042002) in config
- Token: USDC (6 decimals ERC-20 view) at 0x3600000000000000000000000000000000000000 (same address on both Arc mainnet and testnet)

## Key Files

- `contracts/ArcSplit.sol` — production Solidity contract
- `contracts/test/ArcSplit.t.sol` — 22 Foundry unit tests (all pass)
- `src/contracts/ArcSplitContract.ts` — ABI + address config (reads from VITE_ARCSPLIT_ADDRESS)
- `src/hooks/useArcSplit.ts` — approve + splitPayment wagmi integration
- `src/hooks/useSplitForm.ts` — form state and validation (basis-point arithmetic)
- `src/hooks/useSplitHistory.ts` — on-chain event fetcher (PaymentSplit + RecipientPaid)
- `src/App.tsx` — main app shell

## Contract

### ArcSplit.sol

- `splitPayment(address[] recipients, uint256[] basisPoints, uint256 totalAmount)` — transfers USDC from sender to each recipient; reverts atomically on any failure
- USDC address: `0x3600000000000000000000000000000000000000`
- MAX_RECIPIENTS: 50
- BASIS_POINTS constant: 10,000

### Deployment

**STATUS: NOT YET DEPLOYED TO MAINNET.**

To deploy to Arc Mainnet:
1. Ensure the mainnet disclaimer has been acknowledged.
2. Run `forge build` to confirm a fresh artifact.
3. Deploy using Mode 2 (self-deploy) via `bun run deploy:self` with `--chain ARC` and constructor arg `0x3600000000000000000000000000000000000000`.
4. Record the deployed address in this file and set `VITE_ARCSPLIT_ADDRESS` in `.env`.
5. Restart the dev server so Vite picks up the new env var.

### Deployed Contract

| Network | Address | Explorer |
|---------|---------|----------|
| Arc Mainnet | PENDING — not yet deployed | https://explorer.arc.io |
| Arc Testnet | PENDING | https://explorer.testnet.arc.io |

## Security Review Summary

- Solidity rule corpus: no findings at max severity
- Functional review: one noted design tradeoff — atomic batch means a USDC-blocklisted recipient bricks the split; documented in contract NatSpec; accepted per spec requirement for atomicity
- Slither: one `naming-convention` informational (USDC_ADDRESS in UPPER_CASE — correct Solidity convention for immutables; not actionable)
- 22/22 unit tests pass including fuzz test for total conservation

## Microgrant Checklist

- [ ] Arc Studio project URL
- [ ] Public live application URL (deploy to Netlify/HF/Vercel)
- [ ] Verified Arc Mainnet contract address
- [ ] At least one real USDC distribution transaction hash
- [ ] Public GitHub repository
- [ ] Short project description
- [ ] Walkthrough video

## To Run

```bash
bun install
bun run dev
```

## To Test Contracts

```bash
bun run contracts:test
```
