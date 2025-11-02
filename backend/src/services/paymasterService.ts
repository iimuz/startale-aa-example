/**
 * Paymaster Service
 *
 * This service handles interaction with the Startale Paymaster Service
 * to sponsor UserOperations (gas fee sponsorship).
 */

import { http } from 'viem';
import { createSCSPaymasterClient, toSCSSponsoredPaymasterContext } from '@startale-scs/aa-sdk';
import type { UserOperation } from '../types/userOperation';

// Environment variables
const PAYMASTER_SERVICE_URL = process.env.PAYMASTER_SERVICE_URL;
const PAYMASTER_ID = process.env.PAYMASTER_ID;
const ENTRY_POINT_ADDRESS = process.env.ENTRY_POINT_ADDRESS;
const CHAIN_ID = process.env.CHAIN_ID;

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
  if (!ENTRY_POINT_ADDRESS) {
    throw new Error('ENTRY_POINT_ADDRESS is not set in environment variables');
  }
  if (!CHAIN_ID) {
    throw new Error('CHAIN_ID is not set in environment variables');
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
 *
 * @param calculateGasLimits - Whether to calculate gas limits (default: true)
 */
export function getPaymasterContext(calculateGasLimits: boolean = true) {
  validateConfig();

  return toSCSSponsoredPaymasterContext({
    paymasterId: PAYMASTER_ID!,
    calculateGasLimits,
  });
}

/**
 * Sponsor a UserOperation using the Paymaster
 *
 * This function adds paymaster-related fields to the UserOperation,
 * enabling gas fee sponsorship.
 *
 * @param userOp - The UserOperation to sponsor
 * @param chainId - The chain ID (optional, defaults to CHAIN_ID env var)
 * @param calculateGasLimits - Whether to calculate gas limits (default: true)
 * @returns The UserOperation with paymaster fields added
 */
export async function sponsorUserOperation(
  userOp: UserOperation,
  chainId?: number,
  calculateGasLimits: boolean = true
): Promise<UserOperation> {
  try {
    validateConfig();
    const client = getPaymasterClient();
    const context = getPaymasterContext(calculateGasLimits);

    // Parse CHAIN_ID as hex if it starts with 0x, otherwise as decimal
    const parsedChainId = CHAIN_ID!.startsWith('0x')
      ? parseInt(CHAIN_ID!, 16)
      : parseInt(CHAIN_ID!, 10);
    const effectiveChainId = chainId ?? parsedChainId;

    console.log(`📝 Sponsoring UserOperation for sender: ${userOp.sender}`);
    console.log(`   Chain ID: ${effectiveChainId}`);
    console.log(`   Paymaster ID: ${PAYMASTER_ID}`);

    // Call Paymaster API to get paymaster-related fields
    const paymasterData = await client.getPaymasterData({
      // UserOperation fields
      sender: userOp.sender,
      nonce: userOp.nonce,
      callData: userOp.callData,
      callGasLimit: userOp.callGasLimit,
      verificationGasLimit: userOp.verificationGasLimit,
      preVerificationGas: userOp.preVerificationGas,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
      ...(userOp.factory && { factory: userOp.factory }),
      ...(userOp.factoryData && { factoryData: userOp.factoryData }),

      // Required fields for Paymaster API
      chainId: effectiveChainId,
      entryPointAddress: ENTRY_POINT_ADDRESS! as `0x${string}`,

      // Paymaster context
      context,
    });

    console.log(`✅ Paymaster data retrieved successfully`);
    console.log(`   Paymaster address: ${paymasterData.paymaster}`);

    // Display estimated gas limits when calculateGasLimits is true
    if (calculateGasLimits) {
      console.log(`📊 Estimated Gas Limits:`);
      console.log(`   Call Gas Limit: ${paymasterData.callGasLimit || userOp.callGasLimit}`);
      console.log(`   Verification Gas Limit: ${paymasterData.verificationGasLimit || userOp.verificationGasLimit}`);
      console.log(`   Pre-verification Gas: ${paymasterData.preVerificationGas || userOp.preVerificationGas}`);
      if (paymasterData.paymasterVerificationGasLimit) {
        console.log(`   Paymaster Verification Gas Limit: ${paymasterData.paymasterVerificationGasLimit}`);
      }
      if (paymasterData.paymasterPostOpGasLimit) {
        console.log(`   Paymaster Post-Op Gas Limit: ${paymasterData.paymasterPostOpGasLimit}`);
      }

      // Calculate and display total estimated gas
      const totalGas =
        BigInt(paymasterData.callGasLimit || userOp.callGasLimit) +
        BigInt(paymasterData.verificationGasLimit || userOp.verificationGasLimit) +
        BigInt(paymasterData.preVerificationGas || userOp.preVerificationGas) +
        BigInt(paymasterData.paymasterVerificationGasLimit || 0) +
        BigInt(paymasterData.paymasterPostOpGasLimit || 0);

      console.log(`   Total Estimated Gas: ${totalGas}`);

      // Calculate and display estimated cost in ETH
      const maxFeePerGas = BigInt(userOp.maxFeePerGas);
      const estimatedCostWei = totalGas * maxFeePerGas;
      const estimatedCostEth = Number(estimatedCostWei) / 1e18;

      console.log(`   Max Fee Per Gas: ${maxFeePerGas} wei (${Number(maxFeePerGas) / 1e9} Gwei)`);
      console.log(`   Estimated Cost (at max fee): ${estimatedCostEth.toFixed(10)} ETH`);
    }

    // Merge paymaster fields into UserOperation
    // Note: User's signature remains valid (ERC-4337 parallel signing feature)
    const sponsoredUserOp: UserOperation = {
      ...userOp,
      // Update gas limits if Paymaster API calculated new values
      ...(paymasterData.callGasLimit && { callGasLimit: paymasterData.callGasLimit }),
      ...(paymasterData.verificationGasLimit && { verificationGasLimit: paymasterData.verificationGasLimit }),
      ...(paymasterData.preVerificationGas && { preVerificationGas: paymasterData.preVerificationGas }),
      // Add paymaster fields
      paymaster: paymasterData.paymaster,
      paymasterData: paymasterData.paymasterData,
      ...(paymasterData.paymasterVerificationGasLimit && {
        paymasterVerificationGasLimit: paymasterData.paymasterVerificationGasLimit.toString(),
      }),
      ...(paymasterData.paymasterPostOpGasLimit && {
        paymasterPostOpGasLimit: paymasterData.paymasterPostOpGasLimit.toString(),
      }),
    };

    return sponsoredUserOp;
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
  return !!(
    PAYMASTER_SERVICE_URL &&
    PAYMASTER_ID &&
    ENTRY_POINT_ADDRESS &&
    CHAIN_ID
  );
}
