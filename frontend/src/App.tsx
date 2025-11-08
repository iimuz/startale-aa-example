import './App.css';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { defineChain } from 'viem';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletConnect } from './components/WalletConnect';
import { SendTransaction } from './components/SendTransaction';

// Soneium Minato チェーン定義
export const soneiumMinato = defineChain({
  id: 1946,
  name: 'Soneium Minato Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.PUBLIC_RPC_URL || 'https://rpc.minato.soneium.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer-testnet.soneium.org',
    },
  },
  testnet: true,
});

// Wagmi Config
const config = createConfig({
  chains: [soneiumMinato],
  connectors: [injected()],
  transports: {
    [soneiumMinato.id]: http(),
  },
});

// React Query Client
const queryClient = new QueryClient();

const App = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="content">
          <h1>Startale AA Sample</h1>
          <p>Account Abstraction on Soneium Minato</p>

          <WalletConnect />
          <SendTransaction />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
