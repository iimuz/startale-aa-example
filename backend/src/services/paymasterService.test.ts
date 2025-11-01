/**
 * Unit tests for PaymasterService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { UserOperation } from '../types/userOperation';

// Mock the external dependencies before importing the service
jest.mock('viem', () => ({
  http: jest.fn((url: string) => ({ url })),
}));

jest.mock('@startale-scs/aa-sdk', () => ({
  createSCSPaymasterClient: jest.fn((config: any) => ({
    transport: config.transport,
    mocked: true,
    getPaymasterData: jest.fn(async () => ({
      paymaster: '0x1234567890123456789012345678901234567890',
      paymasterData: '0x',
      paymasterVerificationGasLimit: 100000n,
      paymasterPostOpGasLimit: 50000n,
    })),
  })),
  toSCSSponsoredPaymasterContext: jest.fn((config: any) => ({
    paymasterId: config.paymasterId,
    calculateGasLimits: config.calculateGasLimits,
  })),
}));

describe('PaymasterService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to ensure fresh imports
    jest.resetModules();
    // Create a clean copy of environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('isPaymasterConfigured', () => {
    it('should return true when all environment variables are set', async () => {
      process.env.PAYMASTER_SERVICE_URL = 'https://paymaster.example.com';
      process.env.PAYMASTER_ID = 'pm_test123';
      process.env.ENTRY_POINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
      process.env.CHAIN_ID = '11155111';

      const { isPaymasterConfigured } = await import('./paymasterService');
      expect(isPaymasterConfigured()).toBe(true);
    });

    it('should return false when PAYMASTER_SERVICE_URL is not set', async () => {
      delete process.env.PAYMASTER_SERVICE_URL;
      process.env.PAYMASTER_ID = 'pm_test123';

      const { isPaymasterConfigured } = await import('./paymasterService');
      expect(isPaymasterConfigured()).toBe(false);
    });

    it('should return false when PAYMASTER_ID is not set', async () => {
      process.env.PAYMASTER_SERVICE_URL = 'https://paymaster.example.com';
      delete process.env.PAYMASTER_ID;

      const { isPaymasterConfigured } = await import('./paymasterService');
      expect(isPaymasterConfigured()).toBe(false);
    });

    it('should return false when both environment variables are not set', async () => {
      delete process.env.PAYMASTER_SERVICE_URL;
      delete process.env.PAYMASTER_ID;

      const { isPaymasterConfigured } = await import('./paymasterService');
      expect(isPaymasterConfigured()).toBe(false);
    });
  });

  describe('getPaymasterClient', () => {
    it('should throw error when PAYMASTER_SERVICE_URL is not set', async () => {
      delete process.env.PAYMASTER_SERVICE_URL;
      process.env.PAYMASTER_ID = 'pm_test123';

      const { getPaymasterClient } = await import('./paymasterService');
      expect(() => getPaymasterClient()).toThrow(
        'PAYMASTER_SERVICE_URL is not set in environment variables'
      );
    });

    it('should throw error when PAYMASTER_ID is not set', async () => {
      process.env.PAYMASTER_SERVICE_URL = 'https://paymaster.example.com';
      delete process.env.PAYMASTER_ID;

      const { getPaymasterClient } = await import('./paymasterService');
      expect(() => getPaymasterClient()).toThrow(
        'PAYMASTER_ID is not set in environment variables'
      );
    });

    it('should create paymaster client when environment variables are set', async () => {
      process.env.PAYMASTER_SERVICE_URL = 'https://paymaster.example.com';
      process.env.PAYMASTER_ID = 'pm_test123';
      process.env.ENTRY_POINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
      process.env.CHAIN_ID = '11155111';

      const { getPaymasterClient } = await import('./paymasterService');
      const client = getPaymasterClient();

      expect(client).toBeDefined();
      expect(client).toHaveProperty('mocked', true);
    });

    it('should return the same instance on multiple calls (singleton)', async () => {
      process.env.PAYMASTER_SERVICE_URL = 'https://paymaster.example.com';
      process.env.PAYMASTER_ID = 'pm_test123';
      process.env.ENTRY_POINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
      process.env.CHAIN_ID = '11155111';

      const { getPaymasterClient } = await import('./paymasterService');
      const client1 = getPaymasterClient();
      const client2 = getPaymasterClient();

      expect(client1).toBe(client2);
    });
  });

  describe('getPaymasterContext', () => {
    it('should return correct context structure', async () => {
      process.env.PAYMASTER_SERVICE_URL = 'https://paymaster.example.com';
      process.env.PAYMASTER_ID = 'pm_test123';
      process.env.ENTRY_POINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
      process.env.CHAIN_ID = '11155111';

      const { getPaymasterContext } = await import('./paymasterService');
      const context = getPaymasterContext();

      expect(context).toEqual({
        calculateGasLimits: true,
        paymasterId: 'pm_test123',
      });
    });

    it('should throw error when environment variables are not set', async () => {
      delete process.env.PAYMASTER_SERVICE_URL;
      delete process.env.PAYMASTER_ID;

      const { getPaymasterContext } = await import('./paymasterService');
      expect(() => getPaymasterContext()).toThrow();
    });
  });

  describe('sponsorUserOperation', () => {
    const mockUserOp: UserOperation = {
      sender: '0x1234567890123456789012345678901234567890',
      nonce: '0x0',
      callData: '0x',
      callGasLimit: '0x10000',
      verificationGasLimit: '0x10000',
      preVerificationGas: '0x5000',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      signature: '0x',
    };

    it('should return UserOperation with paymaster fields added', async () => {
      process.env.PAYMASTER_SERVICE_URL = 'https://paymaster.example.com';
      process.env.PAYMASTER_ID = 'pm_test123';
      process.env.ENTRY_POINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
      process.env.CHAIN_ID = '11155111';

      const { sponsorUserOperation } = await import('./paymasterService');
      const result = await sponsorUserOperation(mockUserOp);

      expect(result).toEqual({
        ...mockUserOp,
        paymaster: '0x1234567890123456789012345678901234567890',
        paymasterData: '0x',
        paymasterVerificationGasLimit: '100000',
        paymasterPostOpGasLimit: '50000',
      });
    });

    it('should throw error when environment variables are not set', async () => {
      delete process.env.PAYMASTER_SERVICE_URL;
      delete process.env.PAYMASTER_ID;

      const { sponsorUserOperation } = await import('./paymasterService');

      await expect(sponsorUserOperation(mockUserOp)).rejects.toThrow(
        'Failed to sponsor UserOperation'
      );
    });
  });
});
