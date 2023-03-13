import { ethers, network } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { SignlessSafeModule, SignlessSafeModule__factory } from '../typechain-types'
import { solidityKeccak256, _TypedDataEncoder } from 'ethers/lib/utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import EthersAdapter from '@safe-global/safe-ethers-lib'

describe('Signless', () => {
    let deployer: SignerWithAddress
    let signlessModule: SignlessSafeModule
    let ethersAdapter: EthersAdapter
    beforeEach(async () => {
        ;[deployer] = await ethers.getSigners()
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
                        name: 'owner',
                    },
                    {
                        type: 'uint256',
                        name: 'nonce',
                    },
                ],
            },
            {
                owner: delegate.address,
                nonce,
            }
        )
        await signlessModule
            .registerDelegateSigner(deployer.address, delegate.address, expiry, sig)
            .then((tx) => tx.wait(1))

        expect(
            await signlessModule.isDelegatedSigner(
                deployer.address,
                deployer.address,
                delegate.address
            )
        ).to.eq(true)

        // Expires after 1 hour
        await time.increaseTo(expiry)
        expect(
            await signlessModule.isDelegatedSigner(
                deployer.address,
                deployer.address,
                delegate.address
            )
        ).to.eq(false)
    })
})
