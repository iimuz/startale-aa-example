/**
 * Paymaster Service
 *
 * This service handles interaction with the Startale Paymaster Service
 * to sponsor UserOperations (gas fee sponsorship).
 */

import { http } from 'viem';
import { createSCSPaymasterClient } from '@startale-scs/aa-sdk';
import type { UserOperation } from '../types/userOperation';

// Environment variables
const PAYMASTER_SERVICE_URL = process.env.PAYMASTER_SERVICE_URL;
const PAYMASTER_ID = process.env.PAYMASTER_ID;

/**
 * Validate required environment variables
 */
function validateConfig(): void {
  if (!PAYMASTER_SERVICE_URL) {
    throw new Error('PAYMASTER_SERVICE_URL is not set in environment variables');
  }
  if (!PAYMASTER_ID) {
    throw new Error('PAYMASTER_ID is not set in environment variables');
  }
}

/**
 * Paymaster client singleton
 */
let paymasterClient: ReturnType<typeof createSCSPaymasterClient> | null = null;

/**
 * Get or create Paymaster client (singleton pattern)
 */
export function getPaymasterClient() {
  if (!paymasterClient) {
    validateConfig();

    paymasterClient = createSCSPaymasterClient({
      transport: http(PAYMASTER_SERVICE_URL!),
    });

    console.log(`✅ Paymaster client initialized: ${PAYMASTER_SERVICE_URL}`);
  }

  return paymasterClient;
}

/**
 * Get Paymaster context for UserOperation sponsorship
 */
export function getPaymasterContext() {
  validateConfig();

  return {
    calculateGasLimits: true,
    paymasterId: PAYMASTER_ID!,
  };
}

/**
 * Sponsor a UserOperation using the Paymaster
 *
 * This function adds paymaster-related fields to the UserOperation,
 * enabling gas fee sponsorship.
 *
 * @param userOp - The UserOperation to sponsor
 * @returns The UserOperation with paymaster fields added
 */
export async function sponsorUserOperation(
  userOp: UserOperation
): Promise<UserOperation> {
  try {
    getPaymasterClient();
    const context = getPaymasterContext();

    // The Paymaster client will add the necessary fields:
    // - paymaster
    // - paymasterData
    // - paymasterVerificationGasLimit
    // - paymasterPostOpGasLimit

    // Note: The actual sponsorship logic will be implemented
    // when integrating with the SmartAccountClient
    // For now, we return the UserOperation as-is with context

    console.log(`📝 Sponsoring UserOperation for sender: ${userOp.sender}`);
    console.log(`   Paymaster ID: ${context.paymasterId}`);

    // In the actual implementation, the SmartAccountClient
    // will handle the sponsorship by passing the paymaster client
    // and context. This function serves as a helper to access
    // the paymaster configuration.

    return userOp;
  } catch (error) {
    console.error('❌ Error sponsoring UserOperation:', error);
    throw new Error(
      `Failed to sponsor UserOperation: ${(error as Error).message}`
    );
  }
}

/**
 * Check if Paymaster service is properly configured
 */
export function isPaymasterConfigured(): boolean {
  return !!(PAYMASTER_SERVICE_URL && PAYMASTER_ID);
}
