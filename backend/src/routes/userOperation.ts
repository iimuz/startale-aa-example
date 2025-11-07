import { Router, Request, Response, NextFunction } from 'express';
import {
  validateUserOperationRequest,
  validateUserOpHash,
  validateSponsorRequest,
} from '../middleware/validator';
import { sponsorUserOperation } from '../services/paymasterService';
import { sendUserOperation, getUserOperationReceipt } from '../services/bundlerService';
import type {
  UserOperationRequest,
  UserOperationResponse,
} from '../types/userOperation';

const router = Router();

/**
 * POST /user-operations/sponsor
 * Get Paymaster sponsorship for a UserOperation
 */
router.post(
  '/user-operations/sponsor',
  validateSponsorRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userOp, chainId } = req.body as UserOperationRequest;
      console.log(`Received sponsor request. Sender: ${userOp.sender}, Chain ID: ${chainId}`);

      const sponsoredUserOp = await sponsorUserOperation(userOp, chainId);
      const response = {
        success: true,
        data: {
          sponsoredUserOp,
        },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting Paymaster sponsorship:', error);

      const err = error as Error & { statusCode?: number; code?: string };
      err.statusCode = 400;
      err.code = 'SPONSOR_FAILED';
      next(err);
    }
  }
);

/**
 * POST /user-operations
 * Submit a signed UserOperation (with Paymaster info) to the bundler
 */
router.post(
  '/user-operations',
  validateUserOperationRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userOp, chainId } = req.body as UserOperationRequest;
      console.log(`Sending UserOperation to Bundler. , Chain ID: ${chainId}, Sender: ${userOp.sender}, Nonce: ${userOp.nonce}, Call Data: ${userOp.callData.substring(0, 20)}...`);

      const userOpHash = await sendUserOperation(userOp);
      console.log(`UserOperation submitted successfully. UserOp Hash: ${userOpHash}`);

      const response: UserOperationResponse = {
        success: true,
        data: {
          userOpHash,
          status: 'submitted',
        },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error processing UserOperation:', error);

      const err = error as Error & { statusCode?: number; code?: string };
      err.statusCode = 400;
      err.code = 'USEROP_SUBMISSION_FAILED';
      next(err);
    }
  }
);

/**
 * GET /user-operations/:hash
 * Get the status and receipt of a UserOperation
 */
router.get(
  '/user-operations/:hash',
  validateUserOpHash,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hash } = req.params;
      console.log(`Checking UserOperation status for hash: ${hash}`);

      const receipt = await getUserOperationReceipt(hash);
      if (!receipt) {
        console.log(`Status: Pending (not yet included in a block)`);
        const response: UserOperationResponse = {
          success: true,
          data: {
            userOpHash: hash,
            status: 'pending',
          },
        };
        res.status(200).json(response);
        return;
      }
      const status = receipt.success ? 'confirmed' : 'failed';
      console.log(`UserOperation status retrieved. Status: ${status}, Transaction Hash: ${receipt.transactionHash}, Block Number: ${receipt.blockNumber}, Actual Gas Used: ${receipt.actualGasUsed}`);

      // UserOperation is confirmed
      const response: UserOperationResponse = {
        success: true,
        data: {
          userOpHash: hash,
          status: receipt.success ? 'confirmed' : 'failed',
          receipt: {
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            success: receipt.success,
            actualGasUsed: receipt.actualGasUsed,
            logs: receipt.logs,
          },
        },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting UserOperation status:', error);

      const err = error as Error & { statusCode?: number; code?: string };
      err.statusCode = 400;
      err.code = 'USEROP_STATUS_CHECK_FAILED';
      next(err);
    }
  }
);

export default router;
