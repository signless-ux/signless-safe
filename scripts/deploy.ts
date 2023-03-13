import { ethers } from 'hardhat'
import { IGroth16Proof } from 'snarkjs'
import { parseEther, parseUnits } from 'ethers/lib/utils'

async function main() {
    const [deployer] = await ethers.getSigners()
    //
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
