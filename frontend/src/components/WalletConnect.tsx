/**
 * Wallet connection component
 * Handles MetaMask connection via wagmi
 */

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <p>
          <strong>Connected:</strong> {address.substring(0, 6)}...
          {address.substring(address.length - 4)}
        </p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <p>Connect your wallet to get started</p>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          style={{ marginRight: '10px' }}
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
