import type { Address } from "viem";
import { soneiumMinato } from "viem/chains";
import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "@wagmi/connectors";

// Wagmi configuration for Soneium Minato testnet
export const config = createConfig({
  chains: [soneiumMinato],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
    walletConnect({
      projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Get from https://cloud.walletconnect.com
      showQrModal: true,
    }),
  ],
  transports: {
    [soneiumMinato.id]: http(),
  },
});

// Account Abstraction configuration
export const AA_CONFIG = {
  // Soneium Minato RPC endpoint
  MINATO_RPC: "https://rpc.minato.soneium.org",

  // Bundler and Paymaster URLs
  // NOTE: These should be set up through the Soneium Portal
  // For development, you need to:
  // 1. Visit https://portal.soneium.org/
  // 2. Create a Paymaster
  // 3. Get your API keys
  // Replace these with your actual endpoints
  BUNDLER_URL: "YOUR_BUNDLER_URL",
  PAYMASTER_SERVICE_URL: "YOUR_PAYMASTER_URL",

  // Contract addresses on Soneium Minato
  COUNTER_CONTRACT_ADDRESS: "0x6bcf154A6B80fDE9bd1556d39C9bCbB19B539Bd8" as Address,
};
