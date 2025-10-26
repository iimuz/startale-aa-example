import { useState, useEffect } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useWalletClient } from "wagmi";
import {
  toStartaleSmartAccount,
  createStartaleAccountClient,
} from "@startale-scs/aa-sdk";
import type { StartaleSmartAccount, StartaleAccountClient } from "@startale-scs/aa-sdk";
import { soneiumMinato } from "viem/chains";
import { encodeFunctionData, createPublicClient, http } from "viem";
import { AA_CONFIG } from "../config";

// Minimal Counter Contract ABI (increment function only)
const CounterABI = [
  {
    inputs: [],
    name: "increment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "number",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function StartaleAccount() {
  const { setShowAuthFlow, user, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { data: walletClient } = useWalletClient();

  const [smartAccount, setSmartAccount] = useState<StartaleSmartAccount | null>(null);
  const [accountClient, setAccountClient] = useState<StartaleAccountClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [counterValue, setCounterValue] = useState<string>("");

  // Initialize Smart Account when wallet is connected
  useEffect(() => {
    const initializeSmartAccount = async () => {
      if (!walletClient) {
        setSmartAccount(null);
        setAccountClient(null);
        return;
      }

      try {
        setIsLoading(true);
        setStatus("Creating Smart Account...");

        // Create Startale Smart Account
        const account = await toStartaleSmartAccount({
          client: walletClient,
          signer: walletClient.account,
        });

        setSmartAccount(account);
        setStatus(`Smart Account created: ${account.address}`);

        // Create Account Client for sending operations
        const client = createStartaleAccountClient({
          account,
          chain: soneiumMinato,
          bundlerUrl: AA_CONFIG.BUNDLER_URL,
          paymasterUrl: AA_CONFIG.PAYMASTER_SERVICE_URL,
        });

        setAccountClient(client);
        setStatus("Account Client ready!");
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize Smart Account:", error);
        setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        setIsLoading(false);
      }
    };

    initializeSmartAccount();
  }, [walletClient]);

  // Fetch current counter value
  const fetchCounterValue = async () => {
    try {
      const publicClient = createPublicClient({
        chain: soneiumMinato,
        transport: http(),
      });

      const value = await publicClient.readContract({
        address: AA_CONFIG.COUNTER_CONTRACT_ADDRESS,
        abi: CounterABI,
        functionName: "number",
      });

      setCounterValue(value.toString());
    } catch (error) {
      console.error("Failed to fetch counter value:", error);
    }
  };

  // Increment counter using Account Abstraction
  const handleIncrement = async () => {
    if (!accountClient) {
      setStatus("Account client not initialized");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("Preparing transaction...");

      // Encode the increment function call
      const data = encodeFunctionData({
        abi: CounterABI,
        functionName: "increment",
      });

      setStatus("Sending User Operation...");

      // Send User Operation (transaction via Account Abstraction)
      const hash = await accountClient.sendUserOperation({
        calls: [
          {
            to: AA_CONFIG.COUNTER_CONTRACT_ADDRESS,
            data,
            value: 0n,
          },
        ],
      });

      setStatus(`User Operation sent: ${hash}`);

      // Wait for the operation to be included in a block
      setStatus("Waiting for confirmation...");
      const receipt = await accountClient.waitForUserOperationReceipt({ hash });

      setStatus(`Transaction confirmed! Block: ${receipt.receipt.blockNumber}`);

      // Refresh counter value
      await fetchCounterValue();

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to increment counter:", error);
      setStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Startale Account Abstraction Sample</h1>
      <p className="subtitle">Minimal React example with Soneium Minato testnet</p>

      {/* Login Section */}
      <div className="card">
        <h2>1. Connect Wallet</h2>
        {isLoggedIn ? (
          <div>
            <p>✅ Connected: {user?.email || "User"}</p>
            {smartAccount && (
              <p className="address">Smart Account: {smartAccount.address}</p>
            )}
            <button onClick={handleLogOut} disabled={isLoading}>
              Logout
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAuthFlow(true)}>
            Connect Wallet
          </button>
        )}
      </div>

      {/* Counter Interaction Section */}
      {isLoggedIn && smartAccount && accountClient && (
        <div className="card">
          <h2>2. Interact with Counter Contract</h2>
          <p>Contract: {AA_CONFIG.COUNTER_CONTRACT_ADDRESS}</p>

          <div className="actions">
            <button onClick={fetchCounterValue} disabled={isLoading}>
              Get Counter Value
            </button>
            {counterValue && <p>Current value: {counterValue}</p>}
          </div>

          <div className="actions">
            <button
              onClick={handleIncrement}
              disabled={isLoading}
              className="primary"
            >
              {isLoading ? "Processing..." : "Increment Counter (AA)"}
            </button>
          </div>

          <p className="note">
            💡 This transaction uses Account Abstraction.
            Gas fees are paid by the Paymaster!
          </p>
        </div>
      )}

      {/* Status Section */}
      {status && (
        <div className="card status">
          <h3>Status</h3>
          <p>{status}</p>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="card info">
        <h3>⚠️ Setup Required</h3>
        <ol>
          <li>Get a Dynamic Labs environment ID at <a href="https://app.dynamic.xyz/" target="_blank" rel="noopener noreferrer">app.dynamic.xyz</a></li>
          <li>Set up Paymaster at <a href="https://portal.soneium.org/" target="_blank" rel="noopener noreferrer">portal.soneium.org</a></li>
          <li>Update <code>src/config.ts</code> with your credentials</li>
          <li>Update <code>src/App.tsx</code> with your Dynamic environment ID</li>
        </ol>
      </div>
    </div>
  );
}

export default StartaleAccount;
