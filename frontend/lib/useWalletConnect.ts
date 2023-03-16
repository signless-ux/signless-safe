import { Core } from '@walletconnect/core'
import { Web3Wallet } from '@walletconnect/web3wallet'
import type { Web3Wallet as Web3WalletType } from '@walletconnect/web3wallet/dist/types/client'
import { useEffect, useState } from 'react'

const core = new Core({
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
})

async function initWalletConnect() {
    const web3wallet = await Web3Wallet.init({
        core,
        metadata: {
            name: 'Signless Wallet',
            description: 'TODO',
            url: 'https://signless.xyz',
            icons: [],
        },
    })
    return web3wallet
}

export default function useWalletConnect() {
    const [wc, setWc] = useState<Web3WalletType | undefined>()
    useEffect(() => {
        ;(async () => {
            const web3wallet = await initWalletConnect()
            setWc(web3wallet)
        })()
    }, [])

    return wc
}
