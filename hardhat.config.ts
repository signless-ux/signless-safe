import * as dotenv from 'dotenv'

import { HardhatUserConfig, task } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-storage-layout'
import 'hardhat-contract-sizer'
import 'hardhat-storage-layout-changes'
import 'hardhat-abi-exporter'

dotenv.config()

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners()

    for (const account of accounts) {
        console.log(account.address)
    }
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.17',
        settings: {
            // viaIR: true,
            optimizer: {
                enabled: true,
                runs: 100,
                details: {
                    yul: false,
                },
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 1,
            forking: {
                enabled: true,
                url: process.env.MAINNET_URL as string,
                blockNumber: 16820255,
            },
            blockGasLimit: 155_000_000,
            accounts: {
                count: 10,
            },
        },
        mainnet: {
            url: process.env.MAINNET_URL as string,
            chainId: 1,
            accounts: [process.env.MAINNET_PK as string],
        },
        xdai: {
            url: process.env.XDAI_URL as string,
            chainId: 0x64,
            accounts: [process.env.MAINNET_PK as string],
        },
        scrollAlpha: {
            url: 'https://alpha-rpc.scroll.io/l2',
            chainId: 534353,
            accounts: [process.env.MAINNET_PK as string],
        },
        baseGoerli: {
            url: 'https://goerli.base.org',
            chainId: 84531,
            accounts: [process.env.MAINNET_PK as string],
        },
    },
    gasReporter: {
        enabled: true,
        currency: 'USD',
        gasPrice: 60,
    },
    etherscan: {
        apiKey: {
            mainnet: process.env.ETHERSCAN_API_KEY as string,
            polygonMumbai: process.env.POLYGONSCAN_API_KEY as string,
            polygon: process.env.POLYGONSCAN_API_KEY as string,
        },
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: false,
        strict: true,
    },
    paths: {
        storageLayouts: '.storage-layouts',
    },
    abiExporter: {
        path: './exported/abi',
        runOnCompile: true,
        clear: true,
        flat: true,
        only: ['RNGesus'],
        except: ['test/*'],
    },
}

export default config
