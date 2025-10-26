import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./config";
import StartaleAccount from "./components/StartaleAccount";

const queryClient = new QueryClient();

function App() {
  return (
    <DynamicContextProvider
      settings={{
        // NOTE: Replace with your own Dynamic Labs environment ID
        // Get one at https://app.dynamic.xyz/
        environmentId: "YOUR_DYNAMIC_ENVIRONMENT_ID",
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <StartaleAccount />
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}

export default App;
