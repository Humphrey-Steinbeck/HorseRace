import { useEffect, useState, useCallback, useContext, createContext, ReactNode } from "react";

type Eip1193Provider = any;

type MetaMaskState = { provider: Eip1193Provider | undefined; chainId: number | undefined; accounts: string[] | undefined; isConnected: boolean; connect: () => void; error: Error | undefined; };

const MetaMaskContext = createContext<MetaMaskState | undefined>(undefined);

export function useMetaMaskProviderInternal(): MetaMaskState {
  const [provider, setProvider] = useState<Eip1193Provider | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [accounts, setAccounts] = useState<string[] | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const isConnected = Boolean(provider && accounts && accounts.length > 0);

  useEffect(() => { const w = window as any; const p = w?.ethereum as Eip1193Provider | undefined; setProvider(p); }, []);
  useEffect(() => {
    if (!provider) return;
    provider.request({ method: "eth_chainId" }).then((id: string) => setChainId(parseInt(id, 16))).catch((e: any) => setError(e));
    provider.request({ method: "eth_accounts" }).then((accs: string[]) => setAccounts(accs)).catch((e: any) => setError(e));
    const handleChainChanged = (id: string) => setChainId(parseInt(id, 16));
    const handleAccountsChanged = (accs: string[]) => setAccounts(accs);
    provider.on?.("chainChanged", handleChainChanged);
    provider.on?.("accountsChanged", handleAccountsChanged);
    return () => { provider.removeListener?.("chainChanged", handleChainChanged); provider.removeListener?.("accountsChanged", handleAccountsChanged); };
  }, [provider]);

  const connect = useCallback(() => { if (!provider) return; provider.request({ method: "eth_requestAccounts" }).then((accs: string[]) => setAccounts(accs)).catch((e: any) => setError(e)); }, [provider]);
  return { provider, chainId, accounts, isConnected, connect, error };
}

export const MetaMaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => { const value = useMetaMaskProviderInternal(); return <MetaMaskContext.Provider value={value}>{children}</MetaMaskContext.Provider>; };
export function useMetaMask() { const ctx = useContext(MetaMaskContext); if (!ctx) throw new Error("useMetaMask must be used within MetaMaskProvider"); return ctx; }


