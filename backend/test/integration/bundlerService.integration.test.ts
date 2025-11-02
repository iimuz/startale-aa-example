/**
 * Integration tests for BundlerService
 *
 * These tests verify the actual interaction with the Bundler Service.
 * They require real environment variables to be set:
 * - BUNDLER_URL
 * - ENTRY_POINT_ADDRESS
 * - CHAIN_ID
 *
 * Features:
 * - JSON cache system for resuming from failed steps
 * - Complete E2E flow: sponsor → send to bundler → get receipt
 * - Cache file: .test-cache.json (auto-saved after each step)
 *
 * Usage:
 * - Run tests: npm run test:integration
 * - Clean cache and restart: rm test/integration/.test-cache.json
 */

import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import {
  getBundlerClient,
  sendUserOperation,
  getUserOperationReceipt,
  isBundlerConfigured,
} from '../../src/services/bundlerService';
import { sponsorUserOperation } from '../../src/services/paymasterService';
import type { UserOperation } from '../../src/types/userOperation';
import { createPublicClient, http, parseEther, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { toAccount } from 'viem/accounts';
import { soneiumMinato } from 'viem/chains';
import {
  toStartaleSmartAccount,
  getStartaleAccountAddress,
  getInitData,
  toInitData,
} from '@startale-scs/aa-sdk';
import fs from 'fs';
import path from 'path';

// Test configuration
const CACHE_FILE = path.join(__dirname, '.test-cache.json');
const TEST_PRIVATE_KEY =
  process.env.TEST_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = process.env.MINATO_RPC || 'https://rpc.minato.soneium.org/';

// ETH transfer test configuration
const TEST_SMART_ACCOUNT_PRIVATE_KEY = process.env.TEST_SMART_ACCOUNT_PRIVATE_KEY;
const TEST_RECIPIENT_ADDRESS = process.env.TEST_RECIPIENT_ADDRESS;
const TEST_TRANSFER_AMOUNT = process.env.TEST_TRANSFER_AMOUNT || '0.001'; // 0.001 ETH by default
const TEST_SMART_ACCOUNT_ADDRESS = process.env.TEST_SMART_ACCOUNT_ADDRESS;

describe('BundlerService Integration Tests', () => {
  beforeAll(() => {
    // Verify that required environment variables are set
    if (!isBundlerConfigured()) {
      throw new Error(
        'Integration tests require BUNDLER_URL, ENTRY_POINT_ADDRESS, and CHAIN_ID environment variables to be set'
      );
    }
  });

  describe('Bundler client creation', () => {
    it('should create bundler client successfully', () => {
      const client = getBundlerClient();
      expect(client).toBeDefined();
    });

    it('should return the same client instance on multiple calls', () => {
      const client1 = getBundlerClient();
      const client2 = getBundlerClient();
      expect(client1).toBe(client2);
    });
  });

  describe('Configuration check', () => {
    it('should confirm bundler is properly configured', () => {
      const isConfigured = isBundlerConfigured();
      expect(isConfigured).toBe(true);
    });
  });

  describe('E2E UserOperation flow with cache', () => {
    let cache: any = {};

    beforeAll(() => {
      // Load cache file if it exists
      if (fs.existsSync(CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        console.log('📦 Loaded cache from previous run');
        console.log(`   Cache file: ${CACHE_FILE}`);
      } else {
        console.log('🆕 Starting fresh (no cache found)');
      }
    });

    afterEach(() => {
      // Save cache after each step
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log('💾 Cache saved to:', CACHE_FILE);
    });

    it('E2E: Create, sponsor, and send UserOperation', async () => {
      // Skip if already completed
      if (cache.receipt) {
        console.log('⏭️  Test already completed');
        console.log(`   Transaction Hash: ${cache.receipt.transactionHash}`);
        console.log(`   Success: ${cache.receipt.success}`);
        expect(cache.receipt).toBeDefined();
        return;
      }

      console.log('🚀 Starting E2E UserOperation flow...');

      // ===== Step 1: Create and sponsor UserOperation =====
      console.log('\n📝 Step 1: Creating and sponsoring UserOperation...');

      // Create signer from test private key
      const signer = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);

      // Create SmartAccount using SDK
      const smartAccount = await toStartaleSmartAccount({
        signer,
        chain: soneiumMinato,
        transport: http(RPC_URL),
        index: BigInt(999),
      });

      // Get factory and factoryData for undeployed account
      const { factory, factoryData } = await smartAccount.getFactoryArgs();
      const accountAddress = await smartAccount.getAddress();
      const nonce = await smartAccount.getNonce(); // Get nonce ONCE

      console.log(`   Account: ${accountAddress}`);
      console.log(`   Nonce: 0x${nonce.toString(16)}`);

      // Generate callData (dummy self-call that does nothing)
      const callData = await smartAccount.encodeExecute({
        to: accountAddress,
        value: 0n,
        data: '0x',
      });

      // Build UserOperation
      const userOp = {
        sender: accountAddress,
        nonce: `0x${nonce.toString(16)}`,
        factory: factory!,
        factoryData: factoryData!,
        callData,
        callGasLimit: '0x50000', // 327,680
        verificationGasLimit: '0x100000', // 1,048,576
        preVerificationGas: '0x20000', // 131,072
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x3b9aca00',
        signature: '0x', // Placeholder
      };

      // Get Paymaster sponsorship (with signature: '0x')
      const sponsoredForSigning = await sponsorUserOperation(userOp, undefined, true);

      // Sign the UserOperation
      const signature = await smartAccount.signUserOperation(sponsoredForSigning);

      const sponsored: UserOperation = {
        ...sponsoredForSigning,
        signature,
      };

      console.log('✅ Step 1 completed:');
      console.log(`   Paymaster: ${sponsored.paymaster}`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      expect(sponsored.paymaster).toBeDefined();
      expect(sponsored.paymasterData).toBeDefined();
      expect(sponsored.signature).toBeDefined();

      // ===== Step 2: Send UserOperation to Bundler =====
      console.log('\n📤 Step 2: Sending UserOperation to Bundler...');

      const userOpHash = await sendUserOperation(sponsored);

      console.log('✅ Step 2 completed:');
      console.log(`   UserOp Hash: ${userOpHash}`);

      expect(userOpHash).toBeDefined();
      expect(typeof userOpHash).toBe('string');
      expect(userOpHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // ===== Step 3: Get UserOperation receipt =====
      console.log('\n⏳ Step 3: Waiting for UserOperation receipt...');

      // Poll for receipt
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (!receipt && attempts < maxAttempts) {
        if (attempts > 0) {
          console.log(`   Polling attempt ${attempts}/${maxAttempts}...`);
          await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
        }

        receipt = await getUserOperationReceipt(userOpHash);
        attempts++;
      }

      if (receipt) {
        console.log('✅ Step 3 completed:');
        console.log(`   Transaction Hash: ${receipt.transactionHash}`);
        console.log(`   Block Number: ${receipt.blockNumber}`);
        console.log(`   Success: ${receipt.success}`);
        console.log(`   Actual Gas Used: ${receipt.actualGasUsed}`);

        // Save to cache
        cache.receipt = receipt;

        expect(receipt.userOpHash).toBe(userOpHash);
        expect(receipt.transactionHash).toBeDefined();
        expect(receipt.blockNumber).toBeDefined();
        expect(receipt.success).toBeDefined();
      } else {
        console.log('⚠️  Receipt not available yet (may need more time to confirm)');
        throw new Error('UserOperation receipt not found after polling');
      }
    });

    it('E2E: Transfer ETH using smart account', async () => {
      // Verify required environment variables for this test
      if (!TEST_SMART_ACCOUNT_PRIVATE_KEY) {
        console.log('⏭️  Skipping ETH transfer test: TEST_SMART_ACCOUNT_PRIVATE_KEY not set');
        return;
      }
      if (!TEST_RECIPIENT_ADDRESS) {
        console.log('⏭️  Skipping ETH transfer test: TEST_RECIPIENT_ADDRESS not set');
        return;
      }

      console.log('🚀 Starting ETH Transfer E2E flow...');
      console.log(`   Transfer Amount: ${TEST_TRANSFER_AMOUNT} ETH`);
      console.log(`   Recipient: ${TEST_RECIPIENT_ADDRESS}`);

      // ===== Step 1: Create smart account and prepare ETH transfer =====
      console.log('\n📝 Step 1: Creating smart account and preparing ETH transfer...');

      // Create signer from private key
      const signer = privateKeyToAccount(TEST_SMART_ACCOUNT_PRIVATE_KEY as `0x${string}`);

      // Create SmartAccount using SDK
      const smartAccount = await toStartaleSmartAccount({
        signer,
        chain: soneiumMinato,
        transport: http(RPC_URL),
        // index: BigInt(999),
        accountAddress: TEST_SMART_ACCOUNT_ADDRESS,
      });

      // Get factory and factoryData for undeployed account
      const { factory, factoryData } = await smartAccount.getFactoryArgs();
      const accountAddress = await smartAccount.getAddress();
      const nonce = await smartAccount.getNonce();

      console.log(`   Account: ${accountAddress}`);
      console.log(`   Nonce: 0x${nonce.toString(16)}`);

      // Generate callData for ETH transfer
      const transferAmount = parseEther(TEST_TRANSFER_AMOUNT);
      const callData = await smartAccount.encodeExecute({
        to: TEST_RECIPIENT_ADDRESS as `0x${string}`,
        value: transferAmount,
        data: '0x',
      });

      console.log(`   Transferring ${TEST_TRANSFER_AMOUNT} ETH to ${TEST_RECIPIENT_ADDRESS}`);

      // Build UserOperation
      const userOp = {
        sender: accountAddress,
        nonce: `0x${nonce.toString(16)}`,
        factory: factory!,
        factoryData: factoryData!,
        callData,
        callGasLimit: '0x50000', // 327,680
        verificationGasLimit: '0x100000', // 1,048,576
        preVerificationGas: '0x20000', // 131,072
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x3b9aca00',
        signature: '0x', // Placeholder
      };

      // Get Paymaster sponsorship (with signature: '0x')
      const sponsoredForSigning = await sponsorUserOperation(userOp, undefined, true);

      // Sign the UserOperation
      const signature = await smartAccount.signUserOperation(sponsoredForSigning);

      const sponsored: UserOperation = {
        ...sponsoredForSigning,
        signature,
      };

      console.log('✅ Step 1 completed:');
      console.log(`   Paymaster: ${sponsored.paymaster}`);
      console.log(`   Signature: ${signature.substring(0, 20)}...`);

      expect(sponsored.paymaster).toBeDefined();
      expect(sponsored.paymasterData).toBeDefined();
      expect(sponsored.signature).toBeDefined();

      // ===== Step 2: Send UserOperation to Bundler =====
      console.log('\n📤 Step 2: Sending ETH transfer UserOperation to Bundler...');

      const userOpHash = await sendUserOperation(sponsored);

      console.log('✅ Step 2 completed:');
      console.log(`   UserOp Hash: ${userOpHash}`);

      expect(userOpHash).toBeDefined();
      expect(typeof userOpHash).toBe('string');
      expect(userOpHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // ===== Step 3: Get UserOperation receipt =====
      console.log('\n⏳ Step 3: Waiting for ETH transfer confirmation...');

      // Poll for receipt
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (!receipt && attempts < maxAttempts) {
        if (attempts > 0) {
          console.log(`   Polling attempt ${attempts}/${maxAttempts}...`);
          await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
        }

        receipt = await getUserOperationReceipt(userOpHash);
        attempts++;
      }

      if (receipt) {
        console.log('✅ Step 3 completed - ETH transfer successful:');
        console.log(`   Transaction Hash: ${receipt.transactionHash}`);
        console.log(`   Block Number: ${receipt.blockNumber}`);
        console.log(`   Success: ${receipt.success}`);
        console.log(`   Actual Gas Used: ${receipt.actualGasUsed}`);
        console.log(`   Amount Transferred: ${TEST_TRANSFER_AMOUNT} ETH`);

        expect(receipt.userOpHash).toBe(userOpHash);
        expect(receipt.transactionHash).toBeDefined();
        expect(receipt.blockNumber).toBeDefined();
        expect(receipt.success).toBe(true);
      } else {
        console.log('⚠️  Receipt not available yet (may need more time to confirm)');
        throw new Error('ETH transfer UserOperation receipt not found after polling');
      }
    });

  });

  describe('Smart Account Address Determination without Private Key', () => {
    it('should calculate smart account address using mock signer (no signing capability)', async () => {
      console.log('🔍 Test 2: Calculate address using mock signer with no signing capability');

      const index = BigInt(999);

      // Step 1: Create reference account with real private key
      console.log('\n📝 Step 1: Creating reference account with real private key...');
      const realSigner = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
      const eoaAddress = realSigner.address;
      console.log(`   EOA Address: ${eoaAddress}`);

      const referenceAccount = await toStartaleSmartAccount({
        signer: realSigner,
        chain: soneiumMinato,
        transport: http(RPC_URL),
        index,
      });

      const referenceAddress = await referenceAccount.getAddress();
      console.log(`   Reference Smart Account Address: ${referenceAddress}`);

      // Step 2: Create mock signer with only address (no signing capability)
      console.log('\n📝 Step 2: Creating mock signer with only EOA address (no private key)...');
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

      console.log(`   Mock Signer Address: ${mockSigner.address}`);

      // Step 3: Create smart account with mock signer
      console.log('\n📝 Step 3: Creating smart account with mock signer...');
      const mockAccount = await toStartaleSmartAccount({
        signer: mockSigner,
        chain: soneiumMinato,
        transport: http(RPC_URL),
        index,
      });

      // getAddress() should work without needing to sign anything
      const mockAddress = await mockAccount.getAddress();
      console.log(`   Smart Account Address (from mock): ${mockAddress}`);

      // Step 4: Verify addresses match
      console.log('\n✅ Step 4: Verifying addresses match...');
      expect(mockAddress).toBe(referenceAddress);
      console.log(`   ✓ Addresses match: ${mockAddress === referenceAddress}`);

      console.log('\n🎉 Conclusion:');
      console.log('   ✓ Smart account address can be calculated with mock signer!');
      console.log('   ✓ No signing capability needed for address calculation.');
      console.log('   ✓ Only the EOA address property is required.');
    });
  });
});
