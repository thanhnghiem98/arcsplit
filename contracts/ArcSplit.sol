// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ArcSplit
/// @notice Splits a single USDC payment from the caller across multiple recipients in one atomic transaction.
/// @dev Uses basis points (10,000 = 100.00%) for allocation precision and sends funds directly from sender to recipients.
contract ArcSplit is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Reverts when no recipients are provided.
    error EmptyRecipients();

    /// @notice Reverts when recipients and basis-points arrays have different lengths.
    error ArrayLengthMismatch();

    /// @notice Reverts when the recipient count exceeds the maximum allowed.
    /// @param count The provided number of recipients.
    /// @param max The maximum allowed number of recipients.
    error TooManyRecipients(uint256 count, uint256 max);

    /// @notice Reverts when totalAmount is zero.
    error ZeroAmount();

    /// @notice Reverts when a recipient address is the zero address.
    /// @param index The index of the invalid recipient.
    error ZeroAddress(uint256 index);

    /// @notice Reverts when a recipient address appears more than once.
    /// @param recipient The duplicate recipient address.
    error DuplicateRecipient(address recipient);

    /// @notice Reverts when a basis-points value is zero.
    /// @param index The index of the invalid basis-points entry.
    error ZeroBasisPoints(uint256 index);

    /// @notice Reverts when total basis points do not sum to 10,000.
    /// @param sum The computed sum of basis points.
    error InvalidBasisPointsTotal(uint256 sum);

    /// @notice Emitted when a split operation completes.
    /// @param splitId The unique identifier of the split, derived from split counter, sender, and timestamp.
    /// @param sender The account initiating the split.
    /// @param totalAmount The total USDC amount split, in 6-decimal raw units.
    /// @param recipientCount The number of recipients paid in this split.
    event PaymentSplit(
        bytes32 indexed splitId,
        address indexed sender,
        uint256 totalAmount,
        uint256 recipientCount
    );

    /// @notice Emitted for each recipient paid during a split.
    /// @param splitId The unique identifier of the split.
    /// @param recipient The recipient that received payment.
    /// @param amount The USDC amount transferred to the recipient, in 6-decimal raw units.
    /// @param basisPoints The allocation basis points assigned to the recipient.
    event RecipientPaid(bytes32 indexed splitId, address indexed recipient, uint256 amount, uint256 basisPoints);

    /// @notice Address of the USDC token contract used for transfers.
    address public immutable USDC_ADDRESS;

    /// @notice Maximum number of recipients allowed in a single split.
    uint256 public constant MAX_RECIPIENTS = 50;

    /// @notice Total basis points representing 100.00%.
    uint256 public constant BASIS_POINTS = 10_000;

    /// @notice Total number of completed split operations.
    uint256 public splitCounter;

    /// @notice Initializes the splitter with a USDC token address.
    /// @dev Stores an immutable token address to allow deployment-time overrides (e.g., testnet USDC addresses).
    /// @param usdcAddress The USDC token contract address.
    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert ZeroAddress(0);
        USDC_ADDRESS = usdcAddress;
    }

    /// @notice Splits a USDC payment from caller to multiple recipients using basis-point allocations.
    /// @dev Uses a checks-effects-interactions flow: validates all inputs, increments state once, then performs token transfers.
    ///      Per-recipient amount is computed as (totalAmount * bps) / 10_000. Any integer-division dust is assigned to the
    ///      final recipient so the total transferred always equals totalAmount.
    ///
    ///      ATOMICITY DESIGN NOTE: This function is intentionally atomic — if any transfer fails the entire split reverts.
    ///      This guarantees that either all recipients are paid or none are. Callers must ensure every recipient address
    ///      is able to receive USDC (i.e., not USDC-blocklisted by Circle). If a recipient is blocklisted, the split
    ///      will revert and the caller must remove that address from the recipient list and retry.
    /// @param recipients Recipient addresses to receive USDC.
    /// @param basisPoints Allocation values in basis points for each recipient (e.g. 5000 = 50.00%).
    /// @param totalAmount Total USDC amount to split, in 6-decimal raw units.
    function splitPayment(
        address[] calldata recipients,
        uint256[] calldata basisPoints,
        uint256 totalAmount
    ) external nonReentrant {
        uint256 recipientCount = recipients.length;

        if (recipientCount == 0) revert EmptyRecipients();
        if (recipientCount != basisPoints.length) revert ArrayLengthMismatch();
        if (recipientCount > MAX_RECIPIENTS) revert TooManyRecipients(recipientCount, MAX_RECIPIENTS);
        if (totalAmount == 0) revert ZeroAmount();

        uint256 sumBasisPoints;

        for (uint256 i = 0; i < recipientCount; ++i) {
            address recipient = recipients[i];
            uint256 bps = basisPoints[i];

            if (recipient == address(0)) revert ZeroAddress(i);
            if (bps == 0) revert ZeroBasisPoints(i);

            for (uint256 j = 0; j < i; ++j) {
                if (recipient == recipients[j]) {
                    revert DuplicateRecipient(recipient);
                }
            }

            sumBasisPoints += bps;
        }

        if (sumBasisPoints != BASIS_POINTS) revert InvalidBasisPointsTotal(sumBasisPoints);

        uint256 splitIdCounter = ++splitCounter;
        bytes32 splitId = keccak256(abi.encodePacked(splitIdCounter, msg.sender, block.timestamp));

        IERC20 usdc = IERC20(USDC_ADDRESS);
        uint256 runningSum;

        for (uint256 i = 0; i < recipientCount; ++i) {
            uint256 amount;
            if (i == recipientCount - 1) {
                amount = totalAmount - runningSum;
            } else {
                amount = (totalAmount * basisPoints[i]) / BASIS_POINTS;
                runningSum += amount;
            }

            usdc.safeTransferFrom(msg.sender, recipients[i], amount);
            emit RecipientPaid(splitId, recipients[i], amount, basisPoints[i]);
        }

        emit PaymentSplit(splitId, msg.sender, totalAmount, recipientCount);
    }

    /// @notice Returns the configured USDC token address.
    /// @return The immutable USDC token address.
    function getUsdcAddress() external view returns (address) {
        return USDC_ADDRESS;
    }

    /// @notice Returns the total number of split operations executed.
    /// @return The current split counter.
    function getSplitCount() external view returns (uint256) {
        return splitCounter;
    }
}
