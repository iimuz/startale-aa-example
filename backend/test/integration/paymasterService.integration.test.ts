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

describe('PaymasterService Integration Tests', () => {
  beforeAll(() => {
    // Verify that required environment variables are set
    if (!isPaymasterConfigured()) {
      throw new Error(
        'Integration tests require PAYMASTER_SERVICE_URL and PAYMASTER_ID environment variables to be set'
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
      expect(context.paymasterId).toMatch(/^pm_/); // Paymaster IDs typically start with 'pm_'
    });
  });

  describe('UserOperation sponsorship', () => {
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

    it('should process UserOperation without errors', async () => {
      const result = await sponsorUserOperation(mockUserOp);

      expect(result).toBeDefined();
      expect(result.sender).toBe(mockUserOp.sender);
    });

    it('should maintain UserOperation structure', async () => {
      const result = await sponsorUserOperation(mockUserOp);

      // Verify all required fields are present
      expect(result.sender).toBeDefined();
      expect(result.nonce).toBeDefined();
      expect(result.callData).toBeDefined();
      expect(result.callGasLimit).toBeDefined();
      expect(result.verificationGasLimit).toBeDefined();
      expect(result.preVerificationGas).toBeDefined();
      expect(result.maxFeePerGas).toBeDefined();
      expect(result.maxPriorityFeePerGas).toBeDefined();
      expect(result.signature).toBeDefined();
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
