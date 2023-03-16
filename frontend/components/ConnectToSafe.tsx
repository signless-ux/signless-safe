import React, { useCallback, useMemo, useState } from 'react'
import * as ethers from 'ethers'
import { Box, Button, Card, Grid, Typography, Link, TextField } from '@mui/material'
import type { Web3Wallet as Web3WalletType } from '@walletconnect/web3wallet/dist/types/client'
import { useContractRead, usePrepareContractWrite, useSigner } from 'wagmi'
import EthersAdapter from '@safe-global/safe-ethers-lib'
import Safe from '@safe-global/safe-core-sdk'
import config from '@/config'
import { useGlobalState } from '@/lib/useGlobalState'

const { isAddress, getAddress } = ethers.utils

export interface ConnectToSafeProps {
    web3wallet: Web3WalletType
}

export const ConnectToSafe: React.FC<ConnectToSafeProps> = (props) => {
    const { web3wallet } = props
    const [safeAddress, setSafeAddress] = useState<string>('')
    const { safe: connectedSafe, setSafe } = useGlobalState()

    const isSafeAddressValid = useMemo(() => {
        try {
            return isAddress(getAddress(safeAddress))
        } catch (err) {
            return false
        }
    }, [safeAddress])
    const {
        data: isModuleEnabled,
        refetch: refetchIsModuleEnabled,
        error: isModuleEnabledError,
    } = useContractRead({
        address: safeAddress as `0x${string}`,
        abi: [
            {
                type: 'function',
                name: 'isModuleEnabled',
                inputs: [
                    {
                        type: 'address',
                    },
                ],
                outputs: [
                    {
                        type: 'bool',
                    },
                ],
                stateMutability: 'view',
            },
        ],
        functionName: 'isModuleEnabled',
        args: [config.xdai.signlessModule as `0x${string}`],
        enabled: isSafeAddressValid,
    })

    const safeAddressValidationText = useMemo(() => {
        if (!isSafeAddressValid) {
            return 'Enter a valid Safe smart wallet address.'
        } else if (!isModuleEnabled) {
            return 'The Signless module is not yet enabled on this Safe.'
        } else {
            return undefined
        }
    }, [isSafeAddressValid, isModuleEnabled])

    const { data: signer } = useSigner()
    const ethAdapter = useMemo(
        () =>
            signer &&
            new EthersAdapter({
                ethers,
                signerOrProvider: signer,
            }),
        [signer]
    )
    const enableModule = useCallback(async () => {
        if (!ethAdapter || !isSafeAddressValid) {
            return
        }

        const safe = await Safe.create({
            ethAdapter,
            safeAddress,
            isL1SafeMasterCopy: false,
        })
        const enableModuleTx = await safe.createEnableModuleTx(config.xdai.signlessModule)
        const enableModuleTxHash = await safe.getTransactionHash(enableModuleTx)
        await safe.approveTransactionHash(enableModuleTxHash)
        await safe.executeTransaction(enableModuleTx)
        await refetchIsModuleEnabled()
    }, [ethAdapter, safeAddress, refetchIsModuleEnabled])

    const connect = useCallback(() => {
        setSafe(safeAddress)
    }, [setSafe, safeAddress])

    return (
        <Card variant="outlined">
            <Box px={4} py={2} maxWidth={640}>
                <Box pt={2}>
                    <Typography variant="h4" align="center">
                        Connect to Safe
                    </Typography>
                </Box>
                <Box pt={2}>
                    <Typography variant="body1">
                        You are connecting to a{' '}
                        <Link target="_blank" href="https://safe.global">
                            Safe
                        </Link>{' '}
                        with a Signless module enabled.
                    </Typography>
                </Box>
                <Box pt={2}>
                    <TextField
                        label="Safe Address"
                        fullWidth
                        value={safeAddress}
                        onChange={(event) => {
                            setSafeAddress(event.target.value)
                        }}
                        error={!isSafeAddressValid}
                        helperText={safeAddressValidationText}
                    />
                </Box>
                <Grid py={2} container alignItems="center" justifyContent="center">
                    {typeof isModuleEnabled !== 'undefined' && !isModuleEnabled && (
                        <Button
                            variant="contained"
                            onClick={enableModule}
                            disabled={!isSafeAddressValid}
                        >
                            Enable Signless Module
                        </Button>
                    )}
                    {(typeof isModuleEnabled === 'undefined' || isModuleEnabled) && (
                        <Button
                            variant="contained"
                            onClick={connect}
                            disabled={
                                connectedSafe?.toLowerCase() === safeAddress.toLowerCase() ||
                                !isSafeAddressValid
                            }
                        >
                            {connectedSafe === safeAddress ? 'Connected' : 'Connect'}
                        </Button>
                    )}
                </Grid>
            </Box>
        </Card>
    )
}
