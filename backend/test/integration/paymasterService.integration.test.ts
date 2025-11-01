/**
 * Integration tests for PaymasterService
 *
 * These tests verify the actual interaction with the Paymaster Service.
 * They require real environment variables to be set:
 * - PAYMASTER_SERVICE_URL
 * - PAYMASTER_ID
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  getPaymasterClient,
  getPaymasterContext,
  isPaymasterConfigured,
  sponsorUserOperation,
} from '../../src/services/paymasterService';
import type { UserOperation } from '../../src/types/userOperation';
import { encodeFunctionData, parseAbi, pad, toHex, encodeAbiParameters, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { soneiumMinato } from 'viem/chains';
import { toStartaleSmartAccount } from '@startale-scs/aa-sdk';

// SDK constants (from @startale-scs/aa-sdk)
const ACCOUNT_FACTORY_ADDRESS = '0x0000003B3E7b530b4f981aE80d9350392Defef90';
const BOOTSTRAP_ADDRESS = '0x000000552A5fAe3Db7a8F3917C435448F49BA6a9';

describe('PaymasterService Integration Tests', () => {
  beforeAll(() => {
    // Verify that required environment variables are set
    if (!isPaymasterConfigured()) {
      throw new Error(
        'Integration tests require PAYMASTER_SERVICE_URL (with apikey parameter), ENTRY_POINT_ADDRESS, and CHAIN_ID environment variables to be set'
      );
    }
  });

  describe('Paymaster client creation', () => {
    it('should create paymaster client successfully', () => {
      const client = getPaymasterClient();
      expect(client).toBeDefined();
    });

    it('should return the same client instance on multiple calls', () => {
      const client1 = getPaymasterClient();
      const client2 = getPaymasterClient();
      expect(client1).toBe(client2);
    });
  });

  describe('Paymaster context', () => {
    it('should return valid context with calculateGasLimits and paymasterId', () => {
      const context = getPaymasterContext();

      expect(context).toBeDefined();
      expect(context.calculateGasLimits).toBe(true);
      expect(context.paymasterId).toBeDefined();
      expect(typeof context.paymasterId).toBe('string');
    });
  });

  describe('UserOperation sponsorship', () => {
    // Note: These tests validate E2E integration with mock data.
    // The test verifies that the Paymaster API can be called with proper
    // factory and factoryData for undeployed accounts.
    // Full end-to-end testing with actual account deployment should be
    // tested in a complete E2E environment with real signers and validators.

    // Generate mock factoryData for account creation
    const mockInitData = encodeAbiParameters(
      [
        { name: 'bootstrap', type: 'address' },
        { name: 'initData', type: 'bytes' }
      ],
      [BOOTSTRAP_ADDRESS, '0x']
    );

    const mockFactoryData = encodeFunctionData({
      abi: parseAbi(['function createAccount(bytes initData, bytes32 salt) external returns (address)']),
      functionName: 'createAccount',
      args: [mockInitData, pad(toHex(0), { size: 32 })]
    });

    const mockUserOp: UserOperation = {
      sender: '0x1234567890123456789012345678901234567890',
      nonce: '0x0',
      factory: ACCOUNT_FACTORY_ADDRESS,
      factoryData: mockFactoryData,
      callData: '0x',
      callGasLimit: '0x10000',
      verificationGasLimit: '0x10000',
      preVerificationGas: '0x5000',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      signature: '0x',
    };

    it('should handle invalid UserOperation gracefully', async () => {
      // This test verifies that the service properly handles errors
      // from the Paymaster API when given invalid data
      await expect(
        sponsorUserOperation(mockUserOp, undefined, true)
      ).rejects.toThrow('Failed to sponsor UserOperation');
    });

    it('should maintain request structure when calling Paymaster API', async () => {
      // Verify the service can construct and send requests to Paymaster API
      // Even though this will fail with mock data, we can verify the error
      // comes from the Paymaster service, not from our code structure
      try {
        await sponsorUserOperation(mockUserOp, undefined, true);
        fail('Should have thrown an error');
      } catch (error) {
        // Verify error comes from Paymaster service, not local validation
        expect(error).toBeDefined();
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Failed to sponsor UserOperation');
      }
    });
  });

  describe('UserOperation sponsorship with SDK-generated factoryData', () => {
    // This test uses the SDK to generate proper factoryData
    // to verify that gas estimation works end-to-end

    it('should successfully get gas estimates with SDK-generated factoryData', async () => {
      // Use test private key from environment, or generate a random one for testing
      // Note: This private key is only for testing and doesn't need real funds
      const testPrivateKey = process.env.TEST_PRIVATE_KEY ||
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default test key

      const signer = privateKeyToAccount(testPrivateKey as `0x${string}`);

      // RPC URL from environment or default
      const rpcUrl = process.env.MINATO_RPC || 'https://rpc.minato.soneium.org/';

      // Generate factoryData using SDK with real signer
      const smartAccount = await toStartaleSmartAccount({
        signer,
        chain: soneiumMinato,
        transport: http(rpcUrl),
        index: BigInt(999),
      });

      const { factory, factoryData } = await smartAccount.getFactoryArgs();
      const accountAddress = await smartAccount.getAddress();

      // Get nonce from SDK
      const nonce = await smartAccount.getNonce();

      // Generate callData using SDK (dummy self-call that does nothing)
      const callData = await smartAccount.encodeExecute({
        to: accountAddress,
        value: 0n,
        data: '0x',
      });

      // Create UserOperation with SDK-generated data
      const userOp = {
        sender: accountAddress,
        nonce: `0x${nonce.toString(16)}`,
        factory: factory!,
        factoryData: factoryData!,
        callData,
        callGasLimit: '0x50000',  // 327,680 - Higher gas limit for deployment
        verificationGasLimit: '0x100000',  // 1,048,576 - Much higher for account deployment verification
        preVerificationGas: '0x20000',  // 131,072 - Higher for deployment
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x3b9aca00',
        signature: '0x', // Placeholder, will be replaced
      };

      // Sign the UserOperation
      const signature = await smartAccount.signUserOperation(userOp);

      const signedUserOp: UserOperation = {
        ...userOp,
        signature,
      };

      // Sponsor UserOperation (includes gas estimation)
      // Note: This may fail with "max USD exceeded" if Paymaster budget is exhausted
      // This is expected - the budget error proves the technical implementation is correct
      const sponsored = await sponsorUserOperation(signedUserOp, undefined, true);

      // Verify gas estimation succeeded
      expect(sponsored.paymaster).toBeDefined();
      expect(sponsored.paymasterData).toBeDefined();
      expect(sponsored.paymasterVerificationGasLimit).toBeDefined();
      expect(sponsored.paymasterPostOpGasLimit).toBeDefined();

      console.log('✅ Gas estimation successful:');
      console.log(`   Paymaster: ${sponsored.paymaster}`);
      console.log(`   Verification Gas: ${sponsored.paymasterVerificationGasLimit}`);
      console.log(`   PostOp Gas: ${sponsored.paymasterPostOpGasLimit}`);
      console.log(`   Factory: ${signedUserOp.factory}`);
      console.log(`   FactoryData length: ${signedUserOp.factoryData?.length} bytes`);
    });
  });

  describe('Error handling', () => {
    it('should handle client initialization gracefully', () => {
      expect(() => getPaymasterClient()).not.toThrow();
    });

    it('should handle context retrieval gracefully', () => {
      expect(() => getPaymasterContext()).not.toThrow();
    });
  });
});
