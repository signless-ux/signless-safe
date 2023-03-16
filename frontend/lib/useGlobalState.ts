import * as ethers from 'ethers'
import { useCallback, useState } from 'react'

export function useGlobalState() {
    const [safe, setSafe] = useState<string | undefined>()
    const checkedSetSafe = useCallback(
        (addr: string) => {
            try {
                setSafe(ethers.utils.getAddress(addr))
            } catch (err) {
                console.error(`Invalid safe address: ${addr}`)
            }
        },
        [setSafe]
    )

    return {
        safe,
        setSafe: checkedSetSafe,
    }
}
