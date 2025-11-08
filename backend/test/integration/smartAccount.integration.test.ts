/**
 * Integration tests for Smart Account functionality
 *
 * These tests verify the Smart Account SDK integration and address calculation.
 * They require real environment variables to be set:
 * - RPC endpoint (MINATO_RPC)
 *
 * Features tested:
 * - Smart account address determination without private key
 * - Mock signer usage for address calculation
 */

import { describe, it, expect } from '@jest/globals';
import { privateKeyToAccount } from 'viem/accounts';
import { toAccount } from 'viem/accounts';
import { http } from 'viem';
import { soneiumMinato } from 'viem/chains';
import { toStartaleSmartAccount } from '@startale-scs/aa-sdk';

// Test configuration
const TEST_PRIVATE_KEY =
  process.env.TEST_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = process.env.MINATO_RPC || 'https://rpc.minato.soneium.org/';

describe('Smart Account Integration Tests', () => {
  describe('Smart Account Address Determination without Private Key', () => {
    it('should calculate smart account address using mock signer (no signing capability)', async () => {
      const index = BigInt(999);

      // Reference account with real signer
      const realSigner = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
      const eoaAddress = realSigner.address;
      const referenceAccount = await toStartaleSmartAccount({
        signer: realSigner,
        chain: soneiumMinato,
        transport: http(RPC_URL),
        index,
      });
      const referenceAddress = await referenceAccount.getAddress();

      // Mock signer that cannot sign anything
      const mockSigner = toAccount({
        address: eoaAddress,
        async signMessage() {
          throw new Error('Mock signer cannot sign messages - no private key!');
        },
        async signTypedData() {
          throw new Error('Mock signer cannot sign typed data - no private key!');
        },
        async signTransaction() {
          throw new Error('Mock signer cannot sign transactions - no private key!');
        },
      });
      const mockAccount = await toStartaleSmartAccount({
        signer: mockSigner,
        chain: soneiumMinato,
        transport: http(RPC_URL),
        index,
      });
      const mockAddress = await mockAccount.getAddress();
      console.log(
        'EOA Address:', eoaAddress,
        '\nReference Smart Account Address:', referenceAddress,
        '\nMock Signer Address:', mockSigner.address,
        '\nSmart Account Address (from mock):', mockAddress,
      );

      expect(mockAddress).toBe(referenceAddress);
    });
  });
});
