```diff
-NOT AUDITED NFA DYOR WAGMI 🫡🫡🫡
```

# ➰ signless

**_Make web3 feel like Web 2.0_**

## 1) What

Signless is a concept that allows dApp enjoyoooooors to sign-in _just once_ with their existing wallet. After signing in, transactions being made from the wallet do not require any additional signature prompts.

## How it works

A demonstration of Signless is implemented as a Gnosis Safe module in this repository. To enable Signless for a Safe:

1. First, the user must use the [Signless Safe](https://safe.signless.xyz) forked webapp. (GitHub: [gnosis-safe-web-core](https://github.com/kevincharm/gnosis-safe-web-core))
1. A user enables the Signless module for their Safe in the Settings/Signless tab.
1. The user then creates an ephemeral private key that lives in their browser's local storage.
1. This ephemeral key is registered as a delegate on the Signless module for this particular Safe.

After the above steps have been executed, the user will be able to browse Safe Apps without ever having to sign a transaction again (at least, until the ephemeral key expires). This is possible as the Signless Safe webapp intercepts any incoming transaction signing request, signs it with the stored ephemeral key, then submits it to the Gelato Relay network. Gas fees are paid using native tokens in the Safe.

## Deployed contracts

Ethereum Mainnet: [0xb9Cd1dd44799f508769040156962E01ADf97e330](https://etherscan.io/address/0xb9Cd1dd44799f508769040156962E01ADf97e330)

Gnosis Chain: [0xb9Cd1dd44799f508769040156962E01ADf97e330](https://gnosisscan.io/address/0xb9Cd1dd44799f508769040156962E01ADf97e330)

Base Goerli: [0xb9Cd1dd44799f508769040156962E01ADf97e330](https://goerli.basescan.org/address/0xb9Cd1dd44799f508769040156962E01ADf97e330)
