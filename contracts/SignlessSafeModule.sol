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
        /// @notice Timestamp of when this delegate is no longer valid
        /// @dev 12B
        uint96 expiry;
    }

    event DelegateRegistered(
        address indexed safe,
        address delegate,
        uint96 expiry
    );

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

    /// @notice Get expiry of registered delegate
    /// @param safe Gnosis Safe
    /// @param delegate Registered delegate to get info of
    function getDelegateExpiry(
        address safe,
        address delegate
    ) external view returns (uint256) {
        return delegateSigners[safe][delegate].expiry;
    }

    /// @notice Returns true if the `delegatee` pubkey is registered as a
    ///     delegated signer for `safe`
    /// @param safe The Gnosis Safe
    /// @param delegate The (truncated) ECDSA public key that has been
    ///     registered as a delegate for `safe`
    /// @return truth or dare
    function isValidDelegate(
        address safe,
        address delegate
    ) external view returns (bool) {
        DelegatedSigner memory delegateSigner = delegateSigners[safe][delegate];
        return block.timestamp < delegateSigner.expiry;
    }

    /// @notice Register a delegate public key of which the safe has
    ///     control. Must be called by the Gnosis Safe.
    /// @param delegate Truncated ECDSA public key that the delegator wishes
    ///     to delegate to.
    /// @param expiry When the delegation becomes invalid, as UNIX timestamp
    function registerDelegateSigner(address delegate, uint96 expiry) external {
        // NB: registered delegates are isolated to each safe
        address safe = msg.sender;
        delegateSigners[safe][delegate] = DelegatedSigner({expiry: expiry});

        emit DelegateRegistered(safe, delegate, expiry);
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
    ) public {
        // Check that the delegatooor for this delegate is an owner of the safe
        DelegatedSigner memory delegateSigner = delegateSigners[safe][delegate];
        require(
            block.timestamp < delegateSigner.expiry,
            "Delegate key expired"
        );

        uint256 nonce = userNonces[delegate]++;
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    EIP712_EXEC_SAFE_TX_TYPEHASH,
                    safe,
                    to,
                    value,
                    keccak256(data),
                    nonce
                )
            )
        );
        require(
            ECDSA.recover(digest, sig) == delegate,
            "Invalid signature for delegate"
        );

        require(
            IGnosisSafe(safe).execTransactionFromModule(
                to,
                value,
                data,
                IGnosisSafe.Operation.Call
            ),
            "Transaction reverted"
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
        uint256 fee = _getFee();
        require(fee <= maxFee, "Too expensive");
        require(
            _getFeeToken() == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE,
            "Only ETH payment supported"
        );
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
        exec(delegate, safe, to, value, data, sig);
    }
}
