/**
 * Bundler Service
 *
 * This service handles interaction with the Bundler
 * to submit UserOperations and check their status.
 */

import { createPublicClient, http, type Address, type Hash } from 'viem';
import { ENTRY_POINT_ADDRESS } from '@startale-scs/aa-sdk';
import type { UserOperation, UserOperationReceipt } from '../types/userOperation';

const BUNDLER_URL = process.env.BUNDLER_URL;
const BUNDLER_API_KEY = process.env.BUNDLER_API_KEY;
const CHAIN_ID = process.env.CHAIN_ID;

/**
 * Validate required environment variables
 */
function validateConfig(): void {
  if (!BUNDLER_URL) {
    throw new Error('BUNDLER_URL is not set in environment variables');
  }
  if (!CHAIN_ID) {
    throw new Error('CHAIN_ID is not set in environment variables');
  }
}

/**
 * Bundler client singleton
 */
let bundlerClient: ReturnType<typeof createPublicClient> | null = null;

/**
 * Get or create Bundler client (singleton pattern)
 */
export function getBundlerClient() {
  if (!bundlerClient) {
    validateConfig();

    // Create transport with optional API key
    const transport = BUNDLER_API_KEY
      ? http(BUNDLER_URL!, {
        fetchOptions: {
          headers: {
            'x-api-key': BUNDLER_API_KEY,
          },
        },
      })
      : http(BUNDLER_URL!);
    bundlerClient = createPublicClient({
      transport,
    });
  }

  return bundlerClient;
}

/**
 * Send a UserOperation to the Bundler
 *
 * This function submits a UserOperation to the Bundler,
 * which will include it in a bundle and submit it on-chain.
 *
 * @param userOp - The UserOperation to send
 * @returns The UserOperation hash
 */
export async function sendUserOperation(userOp: UserOperation): Promise<string> {
  try {
    validateConfig();

    // Prepare UserOperation for Bundler
    // Convert all fields to hex string format
    const userOpForBundler = {
      sender: userOp.sender as Address,
      nonce: userOp.nonce,
      callData: userOp.callData,
      callGasLimit: userOp.callGasLimit,
      verificationGasLimit: userOp.verificationGasLimit,
      preVerificationGas: userOp.preVerificationGas,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
      signature: userOp.signature,
      ...(userOp.factory && { factory: userOp.factory as Address }),
      ...(userOp.factoryData && { factoryData: userOp.factoryData }),
      ...(userOp.paymaster && { paymaster: userOp.paymaster as Address }),
      ...(userOp.paymasterData && { paymasterData: userOp.paymasterData }),
      ...(userOp.paymasterVerificationGasLimit && {
        paymasterVerificationGasLimit: userOp.paymasterVerificationGasLimit,
      }),
      ...(userOp.paymasterPostOpGasLimit && {
        paymasterPostOpGasLimit: userOp.paymasterPostOpGasLimit,
      }),
    };
    const client = getBundlerClient();
    const userOpHash = await client.request({
      method: 'eth_sendUserOperation' as any,
      params: [userOpForBundler, ENTRY_POINT_ADDRESS! as Address],
    });

    return userOpHash as string;
  } catch (error) {
    console.error('Error sending UserOperation:', error);
    throw new Error(`Failed to send UserOperation: ${(error as Error).message}`);
  }
}

/**
 * Get the receipt of a UserOperation
 *
 * This function checks if a UserOperation has been included
 * in a block and returns its receipt.
 *
 * @param userOpHash - The UserOperation hash
 * @returns The UserOperation receipt, or null if not yet confirmed
 */
export async function getUserOperationReceipt(
  userOpHash: string
): Promise<UserOperationReceipt | null> {
  try {
    validateConfig();

    const client = getBundlerClient();
    const receipt = await client.request({
      method: 'eth_getUserOperationReceipt' as any,
      params: [userOpHash as Hash],
    });
    if (!receipt) {
      return null;
    }

    // Parse receipt from Bundler response
    const parsedReceipt: UserOperationReceipt = {
      userOpHash,
      transactionHash: (receipt as any).receipt.transactionHash,
      blockNumber: (receipt as any).receipt.blockNumber,
      success: (receipt as any).success,
      actualGasUsed: (receipt as any).actualGasUsed || '0x0',
      logs: (receipt as any).receipt.logs || [],
    };
    return parsedReceipt;
  } catch (error) {
    console.error('❌ Error getting UserOperation receipt:', error);
    throw new Error(
      `Failed to get UserOperation receipt: ${(error as Error).message}`
    );
  }
}

/**
 * Check if Bundler service is properly configured
 */
export function isBundlerConfigured(): boolean {
  return !!(BUNDLER_URL && CHAIN_ID);
}
