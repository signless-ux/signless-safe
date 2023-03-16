import Head from 'next/head'
import Typography from '@mui/material/Typography'
import { Box, Button, Grid } from '@mui/material'
import { useEffect, useState } from 'react'
import useWalletConnect from '@/lib/useWalletConnect'
import { ConnectToSafe } from '@/components/ConnectToSafe'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Home() {
    const web3wallet = useWalletConnect()

    return (
        <>
            <Head>
                <title>Signless</title>
                <meta name="description" content="Signless wallet, powered by Safe" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Grid container direction="column" alignItems="flex-end" width="100%">
                <Box px={2} py={2}>
                    <ConnectButton />
                </Box>
            </Grid>
            <Box px={4} py={4}>
                <Typography variant="h2" align="center">
                    Signless
                </Typography>
                <Grid container direction="column" alignItems="center" justifyContent="center">
                    {/* <Button variant="contained">Connect</Button> */}
                    {web3wallet && <ConnectToSafe web3wallet={web3wallet} />}
                </Grid>
            </Box>
        </>
    )
}
