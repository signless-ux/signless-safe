// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import {IGnosisSafe} from "./interfaces/IGnosisSafe.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {GelatoRelayContext} from "@gelatonetwork/relay-context/contracts/GelatoRelayContext.sol";

/// @title Signless Safe Module
/// @author kevincharm
/// @notice Delegated child-key registry module for Gnosis Safe
contract SignlessSafeModule is EIP712, GelatoRelayContext {
    struct DelegatedSigner {
        /// @notice The delegator i.e., the "owner"
        /// @dev 20B
        address delegatooor; // 20B
        /// @notice Timestamp of when this delegate is no longer valid
        /// @dev 12B
        uint96 expiry;
    }

    event DelegateRegistered(
        address indexed delegator,
        address delegatee,
        uint96 expiry
    );

    /// @notice EIP-712 typehash
    bytes32 public constant EIP712_CLAIM_PUB_KEY_TYPEHASH =
        keccak256("ClaimPubKey(address owner,uint256 nonce)");

    /// @notice EIP-712 typehash
    bytes32 public constant EIP712_EXEC_SAFE_TX_TYPEHASH =
        keccak256(
            "ExecSafeTx(address safe,address to,uint256 value,bytes32 dataHash,uint256 nonce)"
        );

    /// @notice Nonce per user, for EIP-712 messages
    mapping(address => uint256) private userNonces;

    /// @notice Delegate extended info
    ///     safe => delegate => info
    mapping(address => mapping(address => DelegatedSigner))
        private delegateSigners;

    constructor() EIP712("SignlessSafeModule", "1.0.0") {}

    /// @notice Get the current nonce for `user` (for EIP-712 messages)
    /// @param user User to get current nonce for
    /// @return nonce
    function getNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    /// @notice Get info about registered delegate
    /// @param safe Gnosis safe using this module
    /// @param delegatee Registered delegate to get info of
    function getDelegateInfo(
        address safe,
        address delegatee
    ) external view returns (DelegatedSigner memory) {
        return delegateSigners[safe][delegatee];
    }

    /// @notice Returns true if the `delegatee` pubkey is registered as a
    ///     delegated signer for `delegator`
    /// @param safe Gnosis safe using this module
    /// @param delegator The delegatooooooooor
    /// @param delegatee The (truncated) ECDSA public key that has been
    ///     registered as a delegate for `delegator`
    /// @return truth or dare
    function isDelegatedSigner(
        address safe,
        address delegator,
        address delegatee
    ) external view returns (bool) {
        DelegatedSigner memory delegateSigner = delegateSigners[safe][
            delegatee
        ];
        return
            delegateSigner.delegatooor == delegator &&
            block.timestamp < delegateSigner.expiry;
    }

    /// @notice Register a delegate public key of which the delegator has
    ///     control. An EIP-712 message must be signed by the delegator. (See
    ///     EIP712_CLAIM_PUB_KEY_TYPEHASH). Must be called by the Gnosis Safe.
    /// @param delegator The canonical "owner" that wishes to delegate to
    ///     `delegatee`
    /// @param delegatee Truncated ECDSA public key that the delegator wishes
    ///     to delegate to.
    /// @param expiry When the delegation becomes invalid, as UNIX timestamp
    /// @param signature ECDSA signature of EIP-712 message signed by
    ///     `delegatee`.
    function registerDelegateSigner(
        address delegator,
        address delegatee,
        uint96 expiry,
        bytes memory signature
    ) external {
        address safe = msg.sender;
        DelegatedSigner memory delegateSigner = delegateSigners[safe][
            delegatee
        ];
        require(
            delegateSigner.delegatooor == address(0) ||
                delegateSigner.delegatooor == delegator,
            "Key already registered to someone else"
        );

        uint256 nonce = userNonces[delegator]++;
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(EIP712_CLAIM_PUB_KEY_TYPEHASH, delegatee, nonce)
            )
        );
        require(
            ECDSA.recover(digest, signature) == delegator,
            "Invalid signature"
        );

        delegateSigners[safe][delegatee] = DelegatedSigner({
            delegatooor: delegator,
            expiry: expiry
        });

        emit DelegateRegistered(delegator, delegatee, expiry);
    }

    /// @notice Execute a transaction on the Gnosis Safe using this module
    /// @param delegate Delegate key that is signing the transaction
    /// @param safe The Gnosis Safe that this transaction is being executed
    ///     through
    /// @param to Tx target
    /// @param value Tx value
    /// @param data Tx calldata
    /// @param sig EIP-712 signature over `EIP712_EXEC_SAFE_TX_TYPEHASH`,
    ///     signed by `delegate`
    function exec(
        address delegate,
        address safe,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata sig
    ) public returns (bool) {
        uint256 nonce = userNonces[delegate]++;
        bytes32 digest = keccak256(
            abi.encode(safe, to, value, keccak256(data), nonce)
        );
        require(
            ECDSA.recover(digest, sig) == delegate,
            "Invalid signature for delegate"
        );

        return
            IGnosisSafe(safe).execTransactionFromModule(
                to,
                value,
                data,
                IGnosisSafe.Operation.Call
            );
    }

    /// @notice Invoke {exec}, via Gelato relay
    /// @notice maxFee Maximum fee payable to Gelato relayer
    function execViaRelay(
        uint256 maxFee,
        address delegate,
        address safe,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata sig
    ) external onlyGelatoRelay {
        // Pay Gelato relay fee to relayer, using ETH from the safe
        require(_getFeeToken() == address(0), "Only ETH payment supported");
        uint256 fee = _getFee();
        require(fee <= maxFee, "Too expensive");
        require(
            IGnosisSafe(safe).execTransactionFromModule(
                _getFeeCollector(),
                fee,
                bytes(""),
                IGnosisSafe.Operation.Call
            ),
            "Fee payment failed"
        );
        // Execute transaction
        require(
            exec(delegate, safe, to, value, data, sig),
            "Execution reverted"
        );
    }
}
