import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./config";
import StartaleAccount from "./components/StartaleAccount";

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <StartaleAccount />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
