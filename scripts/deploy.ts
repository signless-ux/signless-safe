import { ethers } from 'hardhat'
import { SignlessSafeModule__factory } from '../typechain-types'

async function main() {
    const [deployer] = await ethers.getSigners()
    const signlessSafeModule = await new SignlessSafeModule__factory(deployer).deploy()
    await signlessSafeModule.deployed()
    console.log(`Deployed SignlessSafeModule at: ${signlessSafeModule.address}`)
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
