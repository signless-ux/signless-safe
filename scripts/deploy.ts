import { ethers, run } from 'hardhat'
import { SignlessSafeModule__factory } from '../typechain-types'

async function main() {
    const [deployer] = await ethers.getSigners()
    const signlessSafeModule = await new SignlessSafeModule__factory(deployer).deploy()
    await signlessSafeModule.deployed()
    console.log(`Deployed SignlessSafeModule at: ${signlessSafeModule.address}`)

    await new Promise((resolve) => setTimeout(resolve, 60_000)) // wait 1 min for Gnosisscan to update
    await run('verify:verify', {
        address: signlessSafeModule.address,
        constructorArguments: [],
    })
    console.log('Verified on Gnosisscan.')
}

main()
    .then(() => {
        console.log('Done')
        process.exit(0)
    })
    .catch((err) => {
        console.error(err.stack)
        process.exit(1)
    })
