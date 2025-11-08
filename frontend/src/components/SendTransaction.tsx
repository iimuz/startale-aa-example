/**
 * Send Transaction component
 * Demonstrates E2E UserOperation flow
 */

import { useState, useEffect } from 'react';
import { useSmartAccount } from '../hooks/useSmartAccount';
import { useUserOperation } from '../hooks/useUserOperation';

export function SendTransaction() {
  const { smartAccount, isLoading: isAccountLoading, error: accountError, eoaAddress } = useSmartAccount();
  const { sendTransaction, isLoading, error, userOpHash, receipt, status } = useUserOperation(smartAccount);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);

  useEffect(() => {
    if (smartAccount) {
      smartAccount.getAddress().then(setSmartAccountAddress);
    } else {
      setSmartAccountAddress(null);
    }
  }, [smartAccount]);

  if (!eoaAddress) {
    return null;
  }

  if (isAccountLoading) {
    return (
      <div>
        <p>Creating Smart Account...</p>
      </div>
    );
  }

  if (accountError) {
    return (
      <div>
        <p style={{ color: 'red' }}>Error creating Smart Account: {accountError.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3>Smart Account</h3>
        <p>
          <strong>EOA Address:</strong> {eoaAddress}
        </p>
        {smartAccountAddress && (
          <p>
            <strong>Smart Account:</strong> {smartAccountAddress}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={sendTransaction}
          disabled={isLoading || !smartAccount}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: isLoading || !smartAccount ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? `${status}...` : 'Send Test Transaction'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '20px', color: 'red' }}>
          <h4>Error</h4>
          <p>{error.message}</p>
        </div>
      )}

      {status !== 'idle' && status !== 'error' && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Status: {status}</h4>
        </div>
      )}

      {userOpHash && (
        <div style={{ marginBottom: '20px' }}>
          <h4>UserOperation Hash</h4>
          <p style={{ wordBreak: 'break-all' }}>{userOpHash}</p>
        </div>
      )}

      {receipt && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Receipt</h4>
          <p>
            <strong>Transaction Hash:</strong> {receipt.transactionHash}
          </p>
          <p>
            <strong>Block Number:</strong> {receipt.blockNumber}
          </p>
          <p>
            <strong>Success:</strong> {receipt.success ? 'Yes' : 'No'}
          </p>
          <p>
            <strong>Actual Gas Used:</strong> {receipt.actualGasUsed}
          </p>
        </div>
      )}
    </div>
  );
}
