import type { ethers } from "ethers";

export type EIP712Type = {
  domain: { name: string; version: string; chainId: number; verifyingContract: string };
  types: { UserDecryptRequestVerification: { name: string; type: string }[] };
  primaryType: string;
  message: Record<string, unknown>;
};

export type FhevmDecryptionSignatureType = {
  publicKey: string;
  privateKey: string;
  signature: string;
  startTimestamp: number;
  durationDays: number;
  contractAddresses: `0x${string}`[];
  userAddress: `0x${string}`;
  eip712: EIP712Type;
};

export type FhevmInitSDKOptions = { mock?: boolean };
export type FhevmLoadSDKType = () => Promise<void>;
export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;
export type FhevmWindowType = Window & { relayerSDK: any };

export type FhevmInstanceConfig = {
  network: string | ethers.Eip1193Provider;
  aclContractAddress: `0x${string}`;
  inputVerifierAddress: `0x${string}`;
  kmsVerifierAddress: `0x${string}`;
  publicKey: string;
  publicParams: string;
};

export type FhevmInstance = {
  createEncryptedInput: (address: `0x${string}`, userAddress?: `0x${string}`) => { add32: (v: number) => Promise<void>; sub32: (v: number) => Promise<void>; encrypt: () => Promise<{ handles: `0x${string}`[]; inputProof: `0x${string}` }> };
  generateKeypair: () => { publicKey: string; privateKey: string };
  createEIP712: (publicKey: string | `0x${string}`, contractAddresses: `0x${string}`[], startTimestamp: number, durationDays: number) => EIP712Type;
  userDecrypt: (entries: { handle: `0x${string}`; contractAddress: `0x${string}` }[], privateKey: string, publicKey: string, signature: string, contractAddresses: `0x${string}`[], userAddress: `0x${string}`, startTimestamp: number, durationDays: number) => Promise<Record<`0x${string}`, bigint>>;
  getPublicKey: () => string;
  getPublicParams: (bits: number) => string;
};


