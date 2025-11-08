/**
 * Hook for UserOperation E2E flow
 * Implements the same flow as backend/test/integration/api.integration.test.ts:
 * 1. Create UserOperation
 * 2. Get Paymaster sponsorship
 * 3. Sign UserOperation
 * 4. Submit to bundler
 * 5. Poll for receipt
 */

import { useState } from 'react';
import type { StartaleSmartAccount } from '@startale-scs/aa-sdk';
import {
  sponsorUserOperation,
  submitUserOperation,
  getUserOperationStatus,
} from '../services/api';
import type { UserOperation, UserOpReceipt } from '../types/userOperation';

const CHAIN_ID = 1946; // Soneium Minato
const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 3000;

interface UseUserOperationReturn {
  sendTransaction: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  userOpHash: string | null;
  receipt: UserOpReceipt | null;
  status: 'idle' | 'sponsoring' | 'signing' | 'submitting' | 'polling' | 'success' | 'error';
}

export function useUserOperation(
  smartAccount: StartaleSmartAccount | null
): UseUserOperationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userOpHash, setUserOpHash] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<UserOpReceipt | null>(null);
  const [status, setStatus] = useState<UseUserOperationReturn['status']>('idle');

  const sendTransaction = async () => {
    if (!smartAccount) {
      setError(new Error('Smart Account not initialized'));
      setStatus('error');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setUserOpHash(null);
      setReceipt(null);

      // Step 1: Create UserOperation
      const accountAddress = await smartAccount.getAddress();
      const nonce = await smartAccount.getNonce();
      const { factory, factoryData } = await smartAccount.getFactoryArgs();

      // Generate callData (dummy self-call that does nothing)
      const callData = await smartAccount.encodeExecute({
        to: accountAddress,
        value: 0n,
        data: '0x',
      });

      const userOp: Omit<UserOperation, 'signature'> = {
        sender: accountAddress,
        nonce: `0x${nonce.toString(16)}`,
        factory: factory!,
        factoryData: factoryData!,
        callData,
        callGasLimit: '0x50000',
        verificationGasLimit: '0x100000',
        preVerificationGas: '0x20000',
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x3b9aca00',
        signature: '0x', // Placeholder
      };

      console.log(`Account: ${accountAddress}, Nonce: 0x${nonce.toString(16)}`);

      // Step 2: Get Paymaster sponsorship
      setStatus('sponsoring');
      const sponsorResponse = await sponsorUserOperation({
        userOp,
        chainId: CHAIN_ID,
      });

      if (!sponsorResponse.success) {
        throw new Error('Failed to get Paymaster sponsorship');
      }

      const sponsoredUserOp = sponsorResponse.data.sponsoredUserOp;
      console.log(
        'Paymaster:',
        sponsoredUserOp.paymaster,
        '\nPaymaster Data:',
        sponsoredUserOp.paymasterData?.substring(0, 20)
      );

      // Step 3: Sign the sponsored UserOperation
      setStatus('signing');
      const signature = await smartAccount.signUserOperation(sponsoredUserOp);
      const signedUserOp: UserOperation = {
        ...sponsoredUserOp,
        signature,
      };

      console.log(`Signature: ${signature.substring(0, 20)}...`);

      // Step 4: Submit the signed UserOperation
      setStatus('submitting');
      const submitResponse = await submitUserOperation({
        userOp: signedUserOp,
        chainId: CHAIN_ID,
      });

      if (!submitResponse.success) {
        throw new Error('Failed to submit UserOperation');
      }

      const hash = submitResponse.data.userOpHash;
      setUserOpHash(hash);
      console.log(`UserOp Hash: ${hash}`);

      // Step 5: Poll for UserOperation receipt
      setStatus('polling');
      let finalReceipt: UserOpReceipt | null = null;
      let attempts = 0;

      while (!finalReceipt && attempts < MAX_POLL_ATTEMPTS) {
        if (attempts > 0) {
          console.log(`Polling attempt ${attempts}/${MAX_POLL_ATTEMPTS}...`);
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }

        const statusResponse = await getUserOperationStatus(hash);

        if (!statusResponse.success) {
          throw new Error('Failed to get UserOperation status');
        }

        if (statusResponse.data.status === 'confirmed') {
          finalReceipt = statusResponse.data.receipt!;
        }

        attempts++;
      }

      if (finalReceipt) {
        console.log(
          'Transaction Hash:',
          finalReceipt.transactionHash,
          '\nBlock Number:',
          finalReceipt.blockNumber,
          '\nSuccess:',
          finalReceipt.success,
          '\nActual Gas Used:',
          finalReceipt.actualGasUsed
        );
        setReceipt(finalReceipt);
        setStatus('success');
      } else {
        throw new Error('UserOperation receipt not found after polling');
      }
    } catch (err) {
      console.error('UserOperation flow failed:', err);
      setError(err as Error);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendTransaction,
    isLoading,
    error,
    userOpHash,
    receipt,
    status,
  };
}
