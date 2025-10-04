import { ethers } from "ethers";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFhevm } from "../fhevm/useFhevm";
import { FhevmDecryptionSignature } from "../fhevm/FhevmDecryptionSignature";
import type { FhevmInstance } from "../fhevm/fhevmTypes";
import { GenericStringStorage } from "./useInMemoryStorage";
import { useMetaMaskEthersSigner } from "./metamask/useMetaMaskEthersSigner";
import { HorseRaceABI } from "../abi/HorseRaceABI";
import { HorseRaceAddresses } from "../abi/HorseRaceAddresses";

export type ClearValueType = { handle: string; clear: string | bigint | boolean };
type ContractInfo = { abi: typeof HorseRaceABI.abi; address?: `0x${string}`; chainId?: number; chainName?: string };
type RaceInfo = { raceId: number; status: number; statusLabel: string; horses: number; locked: boolean; totalPool: bigint; winnerHorseId: number | null; userBetHorseId: number | null; userBetAmountWei: bigint };

function getContractByChainId(chainId: number | undefined): ContractInfo {
  if (!chainId) { return { abi: HorseRaceABI.abi }; }
  const entry = HorseRaceAddresses[chainId.toString() as keyof typeof HorseRaceAddresses];
  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) { return { abi: HorseRaceABI.abi, chainId }; }
  return { address: entry?.address as `0x${string}` | undefined, chainId: entry?.chainId ?? chainId, chainName: entry?.chainName, abi: HorseRaceABI.abi };
}

export const useHorseRace = (parameters: { fhevmDecryptionSignatureStorage: GenericStringStorage }) => {
  const { fhevmDecryptionSignatureStorage } = parameters;
  const { provider, chainId, ethersSigner, ethersReadonlyProvider, sameChain, sameSigner, isConnected } = useMetaMaskEthersSigner();
  const { instance } = useFhevm({ provider, chainId, enabled: true, initialMockChains: { 31337: "http://localhost:8545" } });

  const [winsHandle, setWinsHandle] = useState<string | undefined>(undefined);
  const [clearWins, setClearWins] = useState<ClearValueType | undefined>(undefined);
  const clearWinsRef = useRef<ClearValueType>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const [races, setRaces] = useState<RaceInfo[] | undefined>(undefined);
  const [isLoadingRaces, setIsLoadingRaces] = useState<boolean>(false);

  const contractRef = useRef<ContractInfo | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isCallingRef = useRef<boolean>(isCalling);

  const isDecrypted = winsHandle && winsHandle === clearWins?.handle;

  const contract = useMemo(() => { const c = getContractByChainId(chainId); contractRef.current = c; if (!c.address) { setMessage(`HorseRace not deployed for chainId=${chainId}.`); } return c; }, [chainId]);
  const isDeployed = useMemo(() => { if (!contract) return undefined; return Boolean(contract.address) && contract.address !== ethers.ZeroAddress; }, [contract]);
  const canGetWins = useMemo(() => { return Boolean(contract.address) && Boolean(ethersReadonlyProvider) && !isRefreshing; }, [contract.address, ethersReadonlyProvider, isRefreshing]);

  const raceStatusLabel = (s: number) => (s === 0 ? "Pending" : s === 1 ? "Open" : s === 2 ? "Locked" : s === 3 ? "Finished" : String(s));

  const refreshRaces = useCallback(async () => {
    if (!contractRef.current || !contractRef.current.address || !ethersReadonlyProvider) { setRaces(undefined); return; }
    try {
      setIsLoadingRaces(true);
      const c = new ethers.Contract(contractRef.current.address, contractRef.current.abi, ethersReadonlyProvider);
      const nextId: bigint = await c.nextRaceId();
      const count = Number(nextId);
      if (Number.isNaN(count) || count <= 0) { setRaces([]); return; }
      const userAddress: `0x${string}` | undefined = ethersSigner ? (await ethersSigner.getAddress() as `0x${string}`) : undefined;
      const items = await Promise.all(Array.from({ length: count }, async (_, i) => {
        const r = await c.races(i);
        const statusNum = Number(r.status);
        const horsesNum = Number(r.horses);
        const totalPool: bigint = BigInt(r.totalPool);
        const winner = Number(r.winnerHorseId);
        const locked = statusNum !== 1; // only Open is operable
        let userBetHorseId: number | null = null;
        let userBetAmountWei: bigint = 0n;
        if (userAddress) {
          try {
            const b = await c.bets(i, userAddress);
            const amt = BigInt(b.amount ?? b[1]);
            if (amt > 0n) {
              userBetAmountWei = amt;
              userBetHorseId = Number(b.horseId ?? b[0]);
            }
          } catch {}
        }
        return { raceId: i, status: statusNum, statusLabel: raceStatusLabel(statusNum), horses: horsesNum, locked, totalPool, winnerHorseId: (statusNum === 3 ? winner : null), userBetHorseId, userBetAmountWei } as RaceInfo;
      }));
      setRaces(items);
    } catch (e) {
      setRaces(undefined);
    } finally {
      setIsLoadingRaces(false);
    }
  }, [ethersReadonlyProvider, ethersSigner]);

  const refreshWinsHandle = useCallback(() => {
    if (isRefreshingRef.current) return;
    if (!contractRef.current || !contractRef.current?.chainId || !contractRef.current?.address || !ethersReadonlyProvider) { setWinsHandle(undefined); return; }
    isRefreshingRef.current = true; setIsRefreshing(true);
    const thisChainId = contractRef.current.chainId; const thisAddress = contractRef.current.address;
    const c = new ethers.Contract(thisAddress, contractRef.current.abi, ethersReadonlyProvider);
    c.getMyWins().then((value: string) => { if (sameChain.current(thisChainId) && thisAddress === contractRef.current?.address) { setWinsHandle(value); } isRefreshingRef.current = false; setIsRefreshing(false); }).catch((e: any) => { setMessage("getMyWins() failed: " + e); isRefreshingRef.current = false; setIsRefreshing(false); });
  }, [ethersReadonlyProvider, sameChain]);
  useEffect(() => { refreshWinsHandle(); }, [refreshWinsHandle]);
  useEffect(() => { refreshRaces(); }, [refreshRaces]);

  const canDecrypt = useMemo(() => { return contract.address && instance && ethersSigner && !isRefreshing && !isDecrypting && winsHandle && winsHandle !== ethers.ZeroHash && winsHandle !== clearWins?.handle; }, [contract.address, instance, ethersSigner, isRefreshing, isDecrypting, winsHandle, clearWins]);

  const decryptWinsHandle = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!contract.address || !instance || !ethersSigner) return;
    if (winsHandle === clearWinsRef.current?.handle) return;
    if (!winsHandle) { setClearWins(undefined); clearWinsRef.current = undefined; return; }
    if (winsHandle === ethers.ZeroHash) { setClearWins({ handle: winsHandle, clear: BigInt(0) }); clearWinsRef.current = { handle: winsHandle, clear: BigInt(0) }; return; }
    const thisChainId = chainId; const thisAddress = contract.address; const thisHandle = winsHandle; const thisSigner = ethersSigner;
    isDecryptingRef.current = true; setIsDecrypting(true); setMessage("Start decrypt");
    const run = async () => {
      const isStale = () => thisAddress !== contractRef.current?.address || !sameChain.current(thisChainId) || !sameSigner.current(thisSigner);
      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(instance as FhevmInstance, [thisAddress as `0x${string}`], ethersSigner!, fhevmDecryptionSignatureStorage);
        if (!sig) { setMessage("Unable to build FHEVM decryption signature"); return; }
        if (isStale()) { setMessage("Ignore decryption"); return; }
        setMessage("Call FHEVM userDecrypt...");
        const res = await (instance as FhevmInstance).userDecrypt([{ handle: thisHandle as `0x${string}`, contractAddress: thisAddress }], sig.privateKey, sig.publicKey, sig.signature, sig.contractAddresses, sig.userAddress, sig.startTimestamp, sig.durationDays);
        setMessage("FHEVM userDecrypt completed!");
        if (isStale()) { setMessage("Ignore decryption"); return; }
        setClearWins({ handle: thisHandle, clear: res[thisHandle] }); clearWinsRef.current = { handle: thisHandle, clear: res[thisHandle] };
      } finally { isDecryptingRef.current = false; setIsDecrypting(false); }
    };
    run();
  }, [fhevmDecryptionSignatureStorage, ethersSigner, contract.address, instance, winsHandle, chainId, sameChain, sameSigner]);

  const canIncreaseWins = useMemo(() => { return contract.address && instance && ethersSigner && !isRefreshing && !isCalling; }, [contract.address, instance, ethersSigner, isRefreshing, isCalling]);
  const increaseWins = useCallback((delta: number) => {
    if (isRefreshingRef.current || isCallingRef.current) return;
    if (!contract.address || !instance || !ethersSigner || delta === 0) return;
    const thisChainId = chainId; const thisAddress = contract.address; const thisSigner = ethersSigner;
    const c = new ethers.Contract(thisAddress, contract.abi, thisSigner);
    const op = delta > 0 ? "increaseMyWins" : "decreaseMyWins"; const valueAbs = delta > 0 ? delta : -delta; const opMsg = `${op}(${valueAbs})`;
    isCallingRef.current = true; setIsCalling(true); setMessage(`Start ${opMsg}...`);
    const run = async () => {
      const isStale = () => thisAddress !== contractRef.current?.address || !sameChain.current(thisChainId) || !sameSigner.current(thisSigner);
      try {
        const input = (instance as FhevmInstance).createEncryptedInput(thisAddress, (thisSigner as any).address);
        await input.add32(valueAbs);
        const enc = await input.encrypt();
        if (isStale()) { setMessage(`Ignore ${opMsg}`); return; }
        setMessage(`Call ${opMsg}...`);
        const tx: ethers.TransactionResponse = await c[op](enc.handles[0], enc.inputProof);
        setMessage(`Wait for tx:${tx.hash}...`);
        const receipt = await tx.wait(); setMessage(`${opMsg} completed status=${receipt?.status}`);
        if (isStale()) { setMessage(`Ignore ${opMsg}`); return; }
        refreshWinsHandle();
      } catch { setMessage(`${opMsg} Failed!`); } finally { isCallingRef.current = false; setIsCalling(false); }
    };
    run();
  }, [ethersSigner, contract.address, contract.abi, instance, chainId, refreshWinsHandle, sameChain, sameSigner]);

  const canPlaceBet = useMemo(() => { return contract.address && ethersSigner && !isCalling; }, [contract.address, ethersSigner, isCalling]);
  const placeBet = useCallback(async (raceId: number, horseId: number, valueEth: string) => {
    if (!contract.address || !ethersSigner) return;
    const c = new ethers.Contract(contract.address, contract.abi, ethersSigner);
    const tx = await c.placeBet(raceId, horseId, { value: ethers.parseEther(valueEth) });
    await tx.wait(); refreshWinsHandle();
  }, [contract.address, contract.abi, ethersSigner, refreshWinsHandle]);

  const cancelBet = useCallback(async (raceId: number) => {
    if (!contract.address || !ethersSigner) return;
    const c = new ethers.Contract(contract.address, contract.abi, ethersSigner);
    const tx = await c.cancelBet(raceId); await tx.wait();
  }, [contract.address, contract.abi, ethersSigner]);

  const payout = useCallback(async (raceId: number) => {
    if (!contract.address || !ethersSigner) return;
    const c = new ethers.Contract(contract.address, contract.abi, ethersSigner);
    const tx = await c.payout(raceId); await tx.wait(); refreshWinsHandle();
  }, [contract.address, contract.abi, ethersSigner, refreshWinsHandle]);

  const adminCreateRace = useCallback(async (horses: number) => {
    if (!contract.address || !ethersSigner) return; const c = new ethers.Contract(contract.address, contract.abi, ethersSigner); const tx = await c.createRace(horses); await tx.wait(); }, [contract.address, contract.abi, ethersSigner]);
  const adminLockRace = useCallback(async (raceId: number) => { if (!contract.address || !ethersSigner) return; const c = new ethers.Contract(contract.address, contract.abi, ethersSigner); const tx = await c.lockRace(raceId); await tx.wait(); }, [contract.address, contract.abi, ethersSigner]);
  const adminFinishRace = useCallback(async (raceId: number, winnerHorseId: number) => { if (!contract.address || !ethersSigner) return; const c = new ethers.Contract(contract.address, contract.abi, ethersSigner); const tx = await c.finishRace(raceId, winnerHorseId); await tx.wait(); }, [contract.address, contract.abi, ethersSigner]);

  return { contractAddress: contract.address, isConnected, canGetWins, canDecrypt, canIncreaseWins, refreshWinsHandle, decryptWinsHandle, increaseWins, isDecrypting, isRefreshing, isCalling, isDecrypted, clear: clearWins?.clear, handle: winsHandle, message, canPlaceBet, placeBet, cancelBet, payout, adminCreateRace, adminLockRace, adminFinishRace, isDeployed, races, isLoadingRaces, refreshRaces } as const;
};


