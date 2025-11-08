/**
 * UserOperation type definitions
 * Matches the backend API types
 */

export interface UserOperation {
  sender: string;
  nonce: string;
  factory?: string;
  factoryData?: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymaster?: string;
  paymasterVerificationGasLimit?: string;
  paymasterPostOpGasLimit?: string;
  paymasterData?: string;
  signature: string;
}

export interface SponsorRequest {
  userOp: Omit<UserOperation, 'paymaster' | 'paymasterData' | 'paymasterVerificationGasLimit' | 'paymasterPostOpGasLimit'>;
  chainId: number;
}

export interface SponsorResponse {
  success: boolean;
  data: {
    sponsoredUserOp: UserOperation;
  };
}

export interface SubmitUserOpRequest {
  userOp: UserOperation;
  chainId: number;
}

export interface SubmitUserOpResponse {
  success: boolean;
  data: {
    userOpHash: string;
    status: 'submitted';
  };
}

export interface UserOpReceipt {
  transactionHash: string;
  blockNumber: string;
  success: boolean;
  actualGasUsed: string;
  logs?: unknown[];
}

export interface GetUserOpResponse {
  success: boolean;
  data: {
    userOpHash: string;
    status: 'pending' | 'confirmed' | 'failed';
    receipt?: UserOpReceipt;
  };
}
