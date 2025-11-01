/**
 * UserOperation type definitions based on ERC-4337
 */

export interface UserOperation {
  sender: string;
  nonce: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  signature: string;
  factory?: string;
  factoryData?: string;
  paymaster?: string;
  paymasterData?: string;
  paymasterVerificationGasLimit?: string;
  paymasterPostOpGasLimit?: string;
}

export interface UserOperationRequest {
  userOp: UserOperation;
  chainId: number;
}

export interface UserOperationResponse {
  success: boolean;
  data?: {
    userOpHash: string;
    status: 'submitted' | 'pending' | 'confirmed' | 'failed';
    receipt?: any;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UserOperationReceipt {
  userOpHash: string;
  transactionHash: string;
  blockNumber: string;
  success: boolean;
  actualGasUsed: string;
  logs: any[];
}
