import '@/styles/globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import NoSSR from 'react-no-ssr'
import type { AppProps } from 'next/app'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { gnosis } from 'wagmi/chains'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { publicProvider } from 'wagmi/providers/public'
import config from '@/config'

const { chains, provider } = configureChains(
    [gnosis],
    [
        jsonRpcProvider({
            rpc: (chain) => {
                if (chain.id !== gnosis.id) {
                    throw new Error(`Unsupported network: ${chain.id} (${chain.name})`)
                }
                return {
                    http: config.xdai.rpcUrl,
                }
            },
        }),
        publicProvider(),
    ]
)

const { connectors } = getDefaultWallets({
    appName: 'My RainbowKit App',
    chains,
})

const wagmiClient = createClient({
    autoConnect: true,
    connectors,
    provider,
})

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
})

export default function App({ Component, pageProps }: AppProps) {
    return (
        <NoSSR>
            <WagmiConfig client={wagmiClient}>
                <RainbowKitProvider chains={chains}>
                    <ThemeProvider theme={darkTheme}>
                        <CssBaseline />
                        <Component {...pageProps} />
                    </ThemeProvider>
                </RainbowKitProvider>
            </WagmiConfig>
        </NoSSR>
    )
}
