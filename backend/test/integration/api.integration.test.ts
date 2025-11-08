/**
 * Integration tests for API endpoints
 *
 * These tests verify the complete E2E flow through the API:
 * 1. POST /api/user-operations/sponsor - Get Paymaster sponsorship
 * 2. Sign UserOperation (client-side simulation)
 * 3. POST /api/user-operations - Submit signed UserOperation
 * 4. GET /api/user-operations/:hash - Poll for receipt
 *
 * Usage:
 * - Run tests: npm run test:integration
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/index';
import { privateKeyToAccount } from 'viem/accounts';
import { http } from 'viem';
import { soneiumMinato } from 'viem/chains';
import { toStartaleSmartAccount } from '@startale-scs/aa-sdk';

// Test configuration
const TEST_PRIVATE_KEY =
  process.env.TEST_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = process.env.MINATO_RPC || 'https://rpc.minato.soneium.org/';
const CHAIN_ID = 1946; // Soneium Minato

describe.only('API Integration Tests', () => {
  beforeAll(() => {
    // Verify that required environment variables are set
    const requiredEnvVars = ['BUNDLER_URL', 'CHAIN_ID', 'PAYMASTER_ID'];
    const missing = requiredEnvVars.filter((v) => !process.env[v]);

    if (missing.length > 0) {
      throw new Error(
        `Integration tests require the following environment variables: ${missing.join(', ')}`
      );
    }
  });

  describe('E2E UserOperation flow via API', () => {
    it('E2E: Sponsor, sign, and submit UserOperation via API', async () => {
      // Create Smart Account and UserOperation
      const signer = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
      const smartAccount = await toStartaleSmartAccount({
        signer,
        chain: soneiumMinato,
        transport: http(RPC_URL),
        index: BigInt(999),
      });

      const { factory, factoryData } = await smartAccount.getFactoryArgs();
      const accountAddress = await smartAccount.getAddress();
      const nonce = await smartAccount.getNonce();
      console.log(`Account: ${accountAddress}, Nonce: 0x${nonce.toString(16)}`);

      // Generate callData (dummy self-call that does nothing)
      const callData = await smartAccount.encodeExecute({
        to: accountAddress,
        value: 0n,
        data: '0x',
      });
      const userOp = {
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
      const sponsorResponse = await request(app)
        .post('/api/user-operations/sponsor')
        .send({ userOp, chainId: CHAIN_ID });
      if (sponsorResponse.status !== 200) {
        console.log(
          'Step 2 failed with status:', sponsorResponse.status,
          '\nResponse body:', JSON.stringify(sponsorResponse.body, null, 2)
        );
      }
      expect(sponsorResponse.status).toBe(200);
      expect(sponsorResponse.body.success).toBe(true);
      expect(sponsorResponse.body.data.sponsoredUserOp).toBeDefined();

      const sponsoredUserOp = sponsorResponse.body.data.sponsoredUserOp;
      console.log(
        'Paymaster:', sponsoredUserOp.paymaster,
        '\nPaymaster Data:', sponsoredUserOp.paymasterData?.substring(0, 20)
      );
      expect(sponsoredUserOp.paymaster).toBeDefined();
      expect(sponsoredUserOp.paymasterData).toBeDefined();

      // Sign the sponsored UserOperation
      const signature = await smartAccount.signUserOperation(sponsoredUserOp);
      const signedUserOp = {
        ...sponsoredUserOp,
        signature,
      };
      console.log(`Signature: ${signature.substring(0, 20)}...`);
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^0x[a-fA-F0-9]+$/);

      // Submit the signed UserOperation
      const submitResponse = await request(app)
        .post('/api/user-operations')
        .send({ userOp: signedUserOp, chainId: CHAIN_ID });
      if (submitResponse.status !== 200) {
        console.log(
          'Step 4 failed with status:', submitResponse.status,
          '\nResponse body:', JSON.stringify(submitResponse.body, null, 2)
        );
      }
      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.success).toBe(true);
      expect(submitResponse.body.data.userOpHash).toBeDefined();

      const userOpHash = submitResponse.body.data.userOpHash;
      console.log(`UserOp Hash: ${userOpHash}`);
      expect(userOpHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Poll for UserOperation receipt
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 10;
      while (!receipt && attempts < maxAttempts) {
        if (attempts > 0) {
          console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        const statusResponse = await request(app)
          .get(`/api/user-operations/${userOpHash}`);
        if (statusResponse.status !== 200) {
          console.log(
            'Step 5 failed with status:', statusResponse.status,
            'Response body:', JSON.stringify(statusResponse.body, null, 2)
          );
        }
        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.success).toBe(true);

        if (statusResponse.body.data.status === 'confirmed') {
          receipt = statusResponse.body.data.receipt;
        }
        attempts++;
      }

      if (receipt) {
        console.log(
          'Transaction Hash:', receipt.transactionHash,
          '\nBlock Number:', receipt.blockNumber,
          '\nSuccess:', receipt.success,
          '\nActual Gas Used:', receipt.actualGasUsed,
        );
        expect(receipt.transactionHash).toBeDefined();
        expect(receipt.blockNumber).toBeDefined();
        expect(receipt.success).toBeDefined();
      } else {
        console.log('Receipt not available yet (may need more time to confirm)');
        throw new Error('UserOperation receipt not found after polling');
      }
    }, 60000); // 60 second timeout for the entire test
  });
});
