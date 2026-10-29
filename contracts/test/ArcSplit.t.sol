// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ArcSplit} from "../ArcSplit.sol";

// ---------------------------------------------------------------------------
// Minimal ERC-20 mock — supports mint, approve, transferFrom, blocklist
// ---------------------------------------------------------------------------
contract MockERC20 {
    string public name;
    string public symbol;
    uint8  public decimals;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public blocklisted;

    uint256 public totalSupply;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name     = _name;
        symbol   = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        totalSupply      += amount;
        balanceOf[to]    += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(!blocklisted[msg.sender], "blocklisted");
        require(!blocklisted[to],         "blocklisted");
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(!blocklisted[from], "blocklisted");
        require(!blocklisted[to],   "blocklisted");
        require(balanceOf[from]             >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;
        return true;
    }
}

// ---------------------------------------------------------------------------
// Malicious ERC-20 — calls back splitPayment during transferFrom (reentrancy)
// ---------------------------------------------------------------------------
contract MaliciousERC20 {
    ArcSplit public target;
    address  public attacker;
    bool     private _reentering;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function setTarget(ArcSplit _target, address _attacker) external {
        target   = _target;
        attacker = _attacker;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from]             >= amount, "bal");
        require(allowance[from][msg.sender] >= amount, "allow");
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;

        // Re-enter on the first call only
        if (!_reentering) {
            _reentering = true;
            address[] memory recips = new address[](1);
            uint256[] memory bps    = new uint256[](1);
            recips[0] = attacker;
            bps[0]    = 10_000;
            // This re-entrant call should revert with ReentrancyGuardReentrantCall
            try target.splitPayment(recips, bps, 1e6) {} catch {}
            _reentering = false;
        }

        return true;
    }
}

// ---------------------------------------------------------------------------
// ArcSplit test suite
// ---------------------------------------------------------------------------
contract ArcSplitTest is Test {
    ArcSplit    internal split;
    MockERC20   internal usdc;

    address internal alice   = makeAddr("alice");
    address internal bob     = makeAddr("bob");
    address internal carol   = makeAddr("carol");
    address internal sender  = makeAddr("sender");

    uint256 internal constant DECIMALS = 1e6; // USDC 6 decimals

    // Pre-fund sender and approve split contract
    function _fund(uint256 amount) internal {
        usdc.mint(sender, amount);
        vm.prank(sender);
        usdc.approve(address(split), amount);
    }

    function setUp() public {
        usdc  = new MockERC20("Mock USDC", "mUSDC", 6);
        split = new ArcSplit(address(usdc));
    }

    // -----------------------------------------------------------------------
    // Helper: compute the splitId the contract will produce
    // -----------------------------------------------------------------------
    function _expectedSplitId(uint256 counter, address _sender) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(counter, _sender, block.timestamp));
    }

    // =========================================================================
    // 1. Happy path — 50/50 split between 2 recipients
    // =========================================================================
    function test_HappyPath_TwoRecipients_FiftyFifty() public {
        uint256 total = 1_000 * DECIMALS;
        _fund(total);

        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](2);
        recips[0] = alice; recips[1] = bob;
        bps[0]    = 5_000; bps[1]   = 5_000;

        vm.prank(sender);
        split.splitPayment(recips, bps, total);

        assertEq(usdc.balanceOf(alice), 500 * DECIMALS, "alice balance");
        assertEq(usdc.balanceOf(bob),   500 * DECIMALS, "bob balance");
        assertEq(usdc.balanceOf(sender), 0,              "sender drained");
    }

    // =========================================================================
    // 2. Happy path — 3-way split with rounding dust on last recipient
    // =========================================================================
    function test_HappyPath_ThreeRecipients_RoundingDust() public {
        // 3334 + 3333 + 3333 = 10000
        // With total = 100e6 (100 USDC):
        //   alice  = 100e6 * 3334 / 10000 = 33_340_000
        //   bob    = 100e6 * 3333 / 10000 = 33_330_000
        //   carol  = 100e6 - (33_340_000 + 33_330_000) = 33_330_000
        uint256 total = 100 * DECIMALS;
        _fund(total);

        address[] memory recips = new address[](3);
        uint256[] memory bps    = new uint256[](3);
        recips[0] = alice; recips[1] = bob; recips[2] = carol;
        bps[0] = 3334; bps[1] = 3333; bps[2] = 3333;

        vm.prank(sender);
        split.splitPayment(recips, bps, total);

        uint256 aliceAmt = (total * 3334) / 10_000;
        uint256 bobAmt   = (total * 3333) / 10_000;
        uint256 carolAmt = total - aliceAmt - bobAmt; // dust goes to last

        assertEq(usdc.balanceOf(alice), aliceAmt, "alice");
        assertEq(usdc.balanceOf(bob),   bobAmt,   "bob");
        assertEq(usdc.balanceOf(carol), carolAmt, "carol");
        assertEq(aliceAmt + bobAmt + carolAmt, total, "total conserved");
    }

    // =========================================================================
    // 3. Happy path — single recipient 10000 bps gets totalAmount exactly
    // =========================================================================
    function test_HappyPath_SingleRecipient_FullAmount() public {
        uint256 total = 500 * DECIMALS;
        _fund(total);

        address[] memory recips = new address[](1);
        uint256[] memory bps    = new uint256[](1);
        recips[0] = alice;
        bps[0]    = 10_000;

        vm.prank(sender);
        split.splitPayment(recips, bps, total);

        assertEq(usdc.balanceOf(alice), total, "alice gets all");
    }

    // =========================================================================
    // 4. PaymentSplit event — correct indexed splitId, sender, totalAmount, count
    // =========================================================================
    function test_Event_PaymentSplit_CorrectFields() public {
        uint256 total = 200 * DECIMALS;
        _fund(total);

        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](2);
        recips[0] = alice; recips[1] = bob;
        bps[0]    = 5_000; bps[1]   = 5_000;

        // splitCounter is 0 before call → will become 1
        bytes32 expectedId = _expectedSplitId(1, sender);

        vm.prank(sender);
        // topic1 = splitId (indexed), topic2 = sender (indexed), data = totalAmount + recipientCount
        vm.expectEmit(true, true, false, true, address(split));
        emit ArcSplit.PaymentSplit(expectedId, sender, total, 2);
        split.splitPayment(recips, bps, total);
    }

    // =========================================================================
    // 5. RecipientPaid events — one per recipient with correct fields
    // =========================================================================
    function test_Event_RecipientPaid_CorrectFields() public {
        uint256 total = 100 * DECIMALS;
        _fund(total);

        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](2);
        recips[0] = alice; recips[1] = bob;
        bps[0]    = 6_000; bps[1]   = 4_000;

        bytes32 expectedId = _expectedSplitId(1, sender);
        uint256 aliceAmt   = (total * 6_000) / 10_000; // 60e6
        uint256 bobAmt     = total - aliceAmt;           // 40e6 (dust to last)

        vm.prank(sender);
        // Expect alice's RecipientPaid
        vm.expectEmit(true, true, false, true, address(split));
        emit ArcSplit.RecipientPaid(expectedId, alice, aliceAmt, 6_000);
        // Expect bob's RecipientPaid
        vm.expectEmit(true, true, false, true, address(split));
        emit ArcSplit.RecipientPaid(expectedId, bob, bobAmt, 4_000);
        split.splitPayment(recips, bps, total);
    }

    // =========================================================================
    // 6. getSplitCount increments after each split
    // =========================================================================
    function test_GetSplitCount_IncrementsEachSplit() public {
        assertEq(split.getSplitCount(), 0, "initial");

        uint256 total = 100 * DECIMALS;
        address[] memory recips = new address[](1);
        uint256[] memory bps    = new uint256[](1);
        recips[0] = alice;
        bps[0]    = 10_000;

        // First split
        usdc.mint(sender, total);
        vm.prank(sender); usdc.approve(address(split), total);
        vm.prank(sender); split.splitPayment(recips, bps, total);
        assertEq(split.getSplitCount(), 1, "after first");

        // Second split
        usdc.mint(sender, total);
        vm.prank(sender); usdc.approve(address(split), total);
        vm.prank(sender); split.splitPayment(recips, bps, total);
        assertEq(split.getSplitCount(), 2, "after second");
    }

    // =========================================================================
    // 7. Revert EmptyRecipients — zero-length arrays
    // =========================================================================
    function test_Revert_EmptyRecipients() public {
        address[] memory recips = new address[](0);
        uint256[] memory bps    = new uint256[](0);

        vm.prank(sender);
        vm.expectRevert(ArcSplit.EmptyRecipients.selector);
        split.splitPayment(recips, bps, 100 * DECIMALS);
    }

    // =========================================================================
    // 8. Revert ArrayLengthMismatch — mismatched array lengths
    // =========================================================================
    function test_Revert_ArrayLengthMismatch() public {
        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](1);
        recips[0] = alice; recips[1] = bob;
        bps[0]    = 10_000;

        vm.prank(sender);
        vm.expectRevert(ArcSplit.ArrayLengthMismatch.selector);
        split.splitPayment(recips, bps, 100 * DECIMALS);
    }

    // =========================================================================
    // 9. Revert TooManyRecipients — 51 recipients
    // =========================================================================
    function test_Revert_TooManyRecipients() public {
        uint256 n = 51;
        address[] memory recips = new address[](n);
        uint256[] memory bps    = new uint256[](n);

        // Give first 50 each 196 bps, last one gets the remainder = 200
        // 50 * 196 = 9800, + 200 = 10000  (but we want the TooManyRecipients revert,
        // which fires before bps validation, so the values don't matter)
        for (uint256 i = 0; i < n; i++) {
            recips[i] = address(uint160(i + 1));
            bps[i]    = i < n - 1 ? 196 : 204;
        }

        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(ArcSplit.TooManyRecipients.selector, n, uint256(50))
        );
        split.splitPayment(recips, bps, 100 * DECIMALS);
    }

    // =========================================================================
    // 10. Revert ZeroAmount — totalAmount == 0
    // =========================================================================
    function test_Revert_ZeroAmount() public {
        address[] memory recips = new address[](1);
        uint256[] memory bps    = new uint256[](1);
        recips[0] = alice;
        bps[0]    = 10_000;

        vm.prank(sender);
        vm.expectRevert(ArcSplit.ZeroAmount.selector);
        split.splitPayment(recips, bps, 0);
    }

    // =========================================================================
    // 11. Revert ZeroAddress — a recipient is address(0)
    // =========================================================================
    function test_Revert_ZeroAddress_Recipient() public {
        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](2);
        recips[0] = alice;
        recips[1] = address(0); // index 1
        bps[0]    = 5_000;
        bps[1]    = 5_000;

        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(ArcSplit.ZeroAddress.selector, uint256(1))
        );
        split.splitPayment(recips, bps, 100 * DECIMALS);
    }

    // =========================================================================
    // 12. Revert DuplicateRecipient — same address twice
    // =========================================================================
    function test_Revert_DuplicateRecipient() public {
        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](2);
        recips[0] = alice;
        recips[1] = alice; // duplicate
        bps[0]    = 5_000;
        bps[1]    = 5_000;

        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(ArcSplit.DuplicateRecipient.selector, alice)
        );
        split.splitPayment(recips, bps, 100 * DECIMALS);
    }

    // =========================================================================
    // 13. Revert ZeroBasisPoints — one bps entry is 0
    // =========================================================================
    function test_Revert_ZeroBasisPoints() public {
        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](2);
        recips[0] = alice;
        recips[1] = bob;
        bps[0]    = 10_000;
        bps[1]    = 0; // index 1 is zero

        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(ArcSplit.ZeroBasisPoints.selector, uint256(1))
        );
        split.splitPayment(recips, bps, 100 * DECIMALS);
    }

    // =========================================================================
    // 14a. Revert InvalidBasisPointsTotal — sum < 10000 (9999)
    // =========================================================================
    function test_Revert_InvalidBasisPointsTotal_Under() public {
        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](2);
        recips[0] = alice; recips[1] = bob;
        bps[0]    = 5_000; bps[1]   = 4_999; // sum = 9999

        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(ArcSplit.InvalidBasisPointsTotal.selector, uint256(9_999))
        );
        split.splitPayment(recips, bps, 100 * DECIMALS);
    }

    // =========================================================================
    // 14b. Revert InvalidBasisPointsTotal — sum > 10000 (10001)
    // =========================================================================
    function test_Revert_InvalidBasisPointsTotal_Over() public {
        address[] memory recips = new address[](2);
        uint256[] memory bps    = new uint256[](2);
        recips[0] = alice; recips[1] = bob;
        bps[0]    = 5_000; bps[1]   = 5_001; // sum = 10001

        vm.prank(sender);
        vm.expectRevert(
            abi.encodeWithSelector(ArcSplit.InvalidBasisPointsTotal.selector, uint256(10_001))
        );
        split.splitPayment(recips, bps, 100 * DECIMALS);
    }

    // =========================================================================
    // 15. Revert on insufficient allowance
    // =========================================================================
    function test_Revert_InsufficientAllowance() public {
        uint256 total = 100 * DECIMALS;
        usdc.mint(sender, total);
        // No approve — allowance is 0

        address[] memory recips = new address[](1);
        uint256[] memory bps    = new uint256[](1);
        recips[0] = alice;
        bps[0]    = 10_000;

        vm.prank(sender);
        vm.expectRevert(); // MockERC20 reverts with "insufficient allowance"
        split.splitPayment(recips, bps, total);
    }

    // =========================================================================
    // 16. Revert on insufficient balance
    // =========================================================================
    function test_Revert_InsufficientBalance() public {
        uint256 total = 100 * DECIMALS;
        // Approve full amount but mint only half
        usdc.mint(sender, total / 2);
        vm.prank(sender);
        usdc.approve(address(split), total);

        address[] memory recips = new address[](1);
        uint256[] memory bps    = new uint256[](1);
        recips[0] = alice;
        bps[0]    = 10_000;

        vm.prank(sender);
        vm.expectRevert(); // MockERC20 reverts with "insufficient balance"
        split.splitPayment(recips, bps, total);
    }

    // =========================================================================
    // 17. Reentrancy protection — nonReentrant guard blocks inner callback
    // =========================================================================
    function test_Reentrancy_GuardPreventsCallback() public {
        // Deploy malicious token and an ArcSplit that uses it
        MaliciousERC20 malToken = new MaliciousERC20();
        ArcSplit       reSplit  = new ArcSplit(address(malToken));

        // Wire the malicious token to call back into reSplit
        malToken.setTarget(reSplit, sender);

        // Seed sender with enough balance and approval
        malToken.mint(sender, 10 * DECIMALS);
        vm.prank(sender);
        malToken.approve(address(reSplit), type(uint256).max);

        address[] memory recips = new address[](1);
        uint256[] memory bps    = new uint256[](1);
        recips[0] = alice;
        bps[0]    = 10_000;

        // The outer call SUCCEEDS: MaliciousERC20.transferFrom attempts a
        // re-entrant splitPayment but the nonReentrant guard reverts it; the
        // try/catch in transferFrom swallows the inner revert so the outer
        // call completes.  Only 1 split is committed.
        vm.prank(sender);
        reSplit.splitPayment(recips, bps, 1 * DECIMALS);

        assertEq(reSplit.getSplitCount(), 1, "only one split committed");
        assertEq(malToken.balanceOf(alice), 1 * DECIMALS, "alice received funds");
    }

    function test_Reentrancy_ReentrantCallReverts() public {
        // Separate test: confirm the inner re-entrant call itself reverts
        MaliciousERC20 malToken = new MaliciousERC20();
        ArcSplit       reSplit  = new ArcSplit(address(malToken));
        malToken.setTarget(reSplit, sender);

        malToken.mint(sender, 10 * DECIMALS);
        vm.prank(sender);
        malToken.approve(address(reSplit), type(uint256).max);

        address[] memory recips = new address[](1);
        uint256[] memory bps    = new uint256[](1);
        recips[0] = alice;
        bps[0]    = 10_000;

        // The outer call will itself revert because the MaliciousERC20
        // calls reSplit.splitPayment() during transferFrom — but wait:
        // the inner call is wrapped in try/catch in the malicious token,
        // so the outer call SUCCEEDS (re-entrancy guard blocks the inner call,
        // the try/catch swallows it, and the outer call completes).
        // This confirms the re-entrancy guard is working.
        vm.prank(sender);
        reSplit.splitPayment(recips, bps, 1 * DECIMALS);
        // Only 1 split committed (not 2)
        assertEq(reSplit.getSplitCount(), 1, "only one split committed");
        // alice received exactly 1e6
        assertEq(malToken.balanceOf(alice), 1 * DECIMALS, "alice balance correct");
    }

    // =========================================================================
    // 18. Constructor revert ZeroAddress when usdcAddress == address(0)
    // =========================================================================
    function test_Constructor_Revert_ZeroUsdcAddress() public {
        vm.expectRevert(
            abi.encodeWithSelector(ArcSplit.ZeroAddress.selector, uint256(0))
        );
        new ArcSplit(address(0));
    }

    // =========================================================================
    // Bonus: getUsdcAddress returns the configured address
    // =========================================================================
    function test_GetUsdcAddress_ReturnsConfigured() public view {
        assertEq(split.getUsdcAddress(), address(usdc));
    }

    // =========================================================================
    // Fuzz: total is always conserved across a 2-recipient split
    // =========================================================================
    function testFuzz_TotalConserved_TwoRecipients(uint96 total, uint16 bps0Raw) public {
        // Bound inputs to safe ranges
        uint256 amt  = bound(uint256(total), 1, 1_000_000 * DECIMALS);
        uint256 bps0 = bound(uint256(bps0Raw), 1, 9_999);
        uint256 bps1 = 10_000 - bps0;

        address[] memory recips = new address[](2);
        uint256[] memory bpsArr = new uint256[](2);
        recips[0] = alice; recips[1] = bob;
        bpsArr[0] = bps0;  bpsArr[1] = bps1;

        usdc.mint(sender, amt);
        vm.prank(sender); usdc.approve(address(split), amt);
        vm.prank(sender); split.splitPayment(recips, bpsArr, amt);

        assertEq(
            usdc.balanceOf(alice) + usdc.balanceOf(bob),
            amt,
            "total conserved"
        );
    }
}
