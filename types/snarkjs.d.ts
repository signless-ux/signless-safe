declare module 'snarkjs' {
    export interface ILogger {
        log: (...msg: any[]) => void
        info: (...msg: any[]) => void
        warn: (...msg: any[]) => void
        error: (...msg: any[]) => void
        debug: (...msg: any[]) => void
    }

    export interface IPlonkProof {
        protocol: 'plonk'
        curve: string
        A: string
        B: string
        C: string
        Z: string
        T1: string
        T2: string
        T3: string
        eval_a: string
        eval_b: string
        eval_c: string
        eval_s1: string
        eval_s2: string
        eval_zw: string
        eval_r: string
        Wxi: string
        Wxiw: string
    }

    export interface IGroth16Proof {
        protocol: 'groth16'
        curve: string
        pi_a: any[]
        pi_b: any[][]
        pi_c: any[]
    }

    export interface IPlonkVerificationKey {
        protocol: 'plonk'
        curve: string
        nPublic: number
        power: number
        k1: string
        k2: string
        Qm: string
        Ql: string
        Qr: string
        Qo: string
        Qc: string
        S1: string
        S2: string
        S3: string
        X_2: string
        w: string
    }

    export interface IGroth16VerificationKey {
        protocol: 'groth16'
        curve: string
        nPublic: number
        vk_alpha_1: any
        vk_beta_2: any
        vk_gamma_2: any
        vk_delta_2: any
        vk_alphabeta_12: any
    }

    export interface IProofResult {
        proof: IPlonkProof | IGroth16Proof
        publicSignals: string[]
    }

    export interface IPlonk {
        setup: (
            r1csName: string,
            ptauName: string,
            zkeyName: string,
            logger?: ILogger
        ) => Promise<number | undefined>
        prove: (
            zkeyFileName: string,
            witnessFileName: string,
            logger?: ILogger
        ) => Promise<IProofResult>
        verify: (
            _vk_verifier: IPlonkVerificationKey,
            _publicSignals: string[],
            _proof: IPlonkProof,
            logger?: ILogger
        ) => Promise<void>
        exportSolidityCallData: (
            proof: IProofResult['proof'],
            publicSignals: IProofResult['publicSignals']
        ) => Promise<string>
    }
    export const plonk: IPlonk

    export interface IGroth16 {
        prove: (
            zkeyFileName: string,
            witnessFileName: string,
            logger?: ILogger
        ) => Promise<IProofResult>
        verify: (
            _vk_verifier: IGroth16VerificationKey,
            _publicSignals: string[],
            _proof: IGroth16Proof,
            logger?: ILogger
        ) => Promise<void>
        exportSolidityCallData: (
            proof: IProofResult['proof'],
            publicSignals: IProofResult['publicSignals']
        ) => Promise<string>
    }
    export const groth16: IGroth16

    export interface IZKey {
        exportVerificationKey: (
            zkeyName: string,
            logger?: ILogger
        ) => Promise<IPlonkVerificationKey | IGroth16VerificationKey>
        exportSolidityVerifier: (
            zKeyName: string,
            templates: { [provingScheme: string]: string },
            logger?: ILogger
        ) => Promise<string>
    }
    export const zKey: IZKey
}
