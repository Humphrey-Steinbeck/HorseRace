import { MetaMaskProvider } from "./hooks/metamask/useMetaMaskProvider";
import { MetaMaskEthersSignerProvider } from "./hooks/metamask/useMetaMaskEthersSigner";

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MetaMaskProvider>
      <MetaMaskEthersSignerProvider initialMockChains={{ 31337: "http://localhost:8545" }}>
        {children}
      </MetaMaskEthersSignerProvider>
    </MetaMaskProvider>
  );
};



// dev note 8

// dev note 20
