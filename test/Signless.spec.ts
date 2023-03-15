import { ethers, network } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { SignlessSafeModule, SignlessSafeModule__factory } from '../typechain-types'
import { keccak256, parseEther, solidityKeccak256, _TypedDataEncoder } from 'ethers/lib/utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import EthersAdapter from '@safe-global/safe-ethers-lib'
import { SafeAccountConfig, SafeFactory } from '@safe-global/safe-core-sdk'

describe('Signless', () => {
    let deployer: SignerWithAddress
    let bob: SignerWithAddress
    let alice: SignerWithAddress
    let signlessModule: SignlessSafeModule
    let ethersAdapter: EthersAdapter
    beforeEach(async () => {
        ;[deployer, bob, alice] = await ethers.getSigners()
        signlessModule = await new SignlessSafeModule__factory(deployer).deploy()

        ethersAdapter = new EthersAdapter({
            ethers,
            signerOrProvider: deployer,
        })
    })

    it('create delegates (standalone)', async () => {
        // Clientside: create a private key that will be saved in the browser
        const delegate = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider)
        // Optional: client can save this as an encrypted JSON wallet
        // --> const encryptedDelegate = await delegate.encrypt('this-is-a-password')
        // `delegate.privateKey` should be saved to localStorage as the long-lived "session"
        // --> localStorage.setItem('encryptedDelegate', JSON.stringify(encryptedDelegate))

        const expiry = (await time.latest()) + 60 * 60 // 1h
        const nonce = await signlessModule.getNonce(deployer.address)
        const sig = await deployer._signTypedData(
            {
                name: 'SignlessSafeModule',
                version: '1.0.0',
                chainId: ethers.provider.network.chainId,
                verifyingContract: signlessModule.address,
            },
            {
                ClaimPubKey: [
                    {
                        type: 'address',
                        name: 'delegate',
                    },
                    {
                        type: 'uint256',
                        name: 'nonce',
                    },
                ],
            },
            {
                delegate: delegate.address,
                nonce,
            }
        )
        await signlessModule
            .registerDelegateSigner(delegate.address, expiry)
            .then((tx) => tx.wait(1))

        expect(await signlessModule.isValidDelegate(deployer.address, delegate.address)).to.eq(true)
    })

    it('e2e: attach module to gnosis safe and execute tx from delegate', async () => {
        // Setup safe & attach module
        const safeFactory = await SafeFactory.create({ ethAdapter: ethersAdapter })
        const safe = await safeFactory.deploySafe({
            safeAccountConfig: {
                owners: [deployer.address],
                threshold: 1,
            },
        })
        const enableModuleTx = await safe.createEnableModuleTx(signlessModule.address)
        const enableModuleTxHash = await safe.getTransactionHash(enableModuleTx)
        await safe.approveTransactionHash(enableModuleTxHash)
        await safe.executeTransaction(enableModuleTx)

        // Setup delegate
        const delegate = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider)
        const expiry = (await time.latest()) + 60 * 60 // 1h
        const _registerDelegateSignerTx =
            await signlessModule.populateTransaction.registerDelegateSigner(
                delegate.address,
                expiry
            )
        const registerDelegateSignerTx = await safe.createTransaction({
            safeTransactionData: {
                to: _registerDelegateSignerTx.to!,
                data: _registerDelegateSignerTx.data!,
                value: _registerDelegateSignerTx.value?.toString() || '0',
            },
        })
        const registerDelegateSignerTxHash = await safe.getTransactionHash(registerDelegateSignerTx)
        await safe.approveTransactionHash(registerDelegateSignerTxHash)
        await safe.executeTransaction(registerDelegateSignerTx)
        expect(await signlessModule.isValidDelegate(safe.getAddress(), delegate.address)).to.eq(
            true
        )

        // Fund safe
        await deployer.sendTransaction({
            to: safe.getAddress(),
            value: parseEther('10'),
        })

        // Execute simple tx
        const bobBalanceBefore = await ethers.provider.getBalance(bob.address)
        const nonce = await signlessModule.getNonce(delegate.address)
        const execTxSig = await delegate._signTypedData(
            {
                name: 'SignlessSafeModule',
                version: '1.0.0',
                chainId: ethers.provider.network.chainId,
                verifyingContract: signlessModule.address,
            },
            {
                ExecSafeTx: [
                    {
                        type: 'address',
                        name: 'safe',
                    },
                    {
                        type: 'address',
                        name: 'to',
                    },
                    {
                        type: 'uint256',
                        name: 'value',
                    },
                    {
                        type: 'bytes32',
                        name: 'dataHash',
                    },
                    {
                        type: 'uint256',
                        name: 'nonce',
                    },
                ],
            },
            {
                safe: safe.getAddress(),
                to: bob.address,
                value: parseEther('1.0'),
                dataHash: keccak256([]),
                nonce,
            }
        )
        await signlessModule
            .exec(
                delegate.address,
                safe.getAddress(),
                bob.address,
                parseEther('1.0'),
                [],
                execTxSig
            )
            .then((tx) => tx.wait(1))
        expect(await ethers.provider.getBalance(bob.address)).to.eq(
            bobBalanceBefore.add(parseEther('1.0'))
        )
    })

    it('e2e: reject when delegate key has expired', async () => {
        // Setup safe & attach module
        const safeFactory = await SafeFactory.create({ ethAdapter: ethersAdapter })
        const safe = await safeFactory.deploySafe({
            safeAccountConfig: {
                owners: [deployer.address],
                threshold: 1,
            },
        })
        const enableModuleTx = await safe.createEnableModuleTx(signlessModule.address)
        const enableModuleTxHash = await safe.getTransactionHash(enableModuleTx)
        await safe.approveTransactionHash(enableModuleTxHash)
        await safe.executeTransaction(enableModuleTx)

        // Setup delegate
        const delegate = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider)
        const expiry = (await time.latest()) + 60 * 60 // 1h
        const _registerDelegateSignerTx =
            await signlessModule.populateTransaction.registerDelegateSigner(
                delegate.address,
                expiry
            )
        const registerDelegateSignerTx = await safe.createTransaction({
            safeTransactionData: {
                to: _registerDelegateSignerTx.to!,
                data: _registerDelegateSignerTx.data!,
                value: _registerDelegateSignerTx.value?.toString() || '0',
            },
        })
        const registerDelegateSignerTxHash = await safe.getTransactionHash(registerDelegateSignerTx)
        await safe.approveTransactionHash(registerDelegateSignerTxHash)
        await safe.executeTransaction(registerDelegateSignerTx)
        expect(await signlessModule.isValidDelegate(safe.getAddress(), delegate.address)).to.eq(
            true
        )

        // Fund safe
        await deployer.sendTransaction({
            to: safe.getAddress(),
            value: parseEther('10'),
        })

        // Fast-forward time to force expiration of delegate key
        await time.increaseTo(expiry + 1)

        // Execute simple tx
        const nonce = await signlessModule.getNonce(delegate.address)
        const execTxSig = await delegate._signTypedData(
            {
                name: 'SignlessSafeModule',
                version: '1.0.0',
                chainId: ethers.provider.network.chainId,
                verifyingContract: signlessModule.address,
            },
            {
                ExecSafeTx: [
                    {
                        type: 'address',
                        name: 'safe',
                    },
                    {
                        type: 'address',
                        name: 'to',
                    },
                    {
                        type: 'uint256',
                        name: 'value',
                    },
                    {
                        type: 'bytes32',
                        name: 'dataHash',
                    },
                    {
                        type: 'uint256',
                        name: 'nonce',
                    },
                ],
            },
            {
                safe: safe.getAddress(),
                to: bob.address,
                value: parseEther('1.0'),
                dataHash: keccak256([]),
                nonce,
            }
        )
        await expect(
            signlessModule.exec(
                delegate.address,
                safe.getAddress(),
                bob.address,
                parseEther('1.0'),
                [],
                execTxSig
            )
        ).to.be.revertedWith('Delegate key expired')
    })
})
