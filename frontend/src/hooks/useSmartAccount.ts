/**
 * Hook for creating and managing Smart Account
 */

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { toStartaleSmartAccount } from '@startale-scs/aa-sdk';
import { soneiumMinato } from '../App';
import { http } from 'viem';
import type { StartaleSmartAccount } from '@startale-scs/aa-sdk';

const RPC_URL =
  import.meta.env.PUBLIC_RPC_URL || 'https://rpc.minato.soneium.org/';

export function useSmartAccount() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [smartAccount, setSmartAccount] = useState<StartaleSmartAccount | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function createSmartAccount() {
      if (!isConnected || !walletClient || !address) {
        setSmartAccount(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Create Smart Account using MetaMask as signer
        const account = await toStartaleSmartAccount({
          signer: walletClient,
          chain: soneiumMinato,
          transport: http(RPC_URL),
          index: BigInt(999),
        });

        setSmartAccount(account);
      } catch (err) {
        console.error('Failed to create Smart Account:', err);
        setError(err as Error);
        setSmartAccount(null);
      } finally {
        setIsLoading(false);
      }
    }

    createSmartAccount();
  }, [isConnected, walletClient, address]);

  return {
    smartAccount,
    isLoading,
    error,
    eoaAddress: address,
  };
}
