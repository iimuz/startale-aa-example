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
 * Get Paymaster sponsorship for a UserOperation (before signing)
 */
router.post(
  '/user-operations/sponsor',
  validateSponsorRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userOp, chainId } = req.body as UserOperationRequest;

      console.log('\n📝 Received sponsor request');
      console.log(`   Sender: ${userOp.sender}`);
      console.log(`   Chain ID: ${chainId}`);

      // Get Paymaster sponsorship (add Paymaster fields)
      console.log('\n🔄 Getting Paymaster sponsorship...');
      const sponsoredUserOp = await sponsorUserOperation(userOp, chainId);

      // Return sponsored UserOperation (ready for signing)
      const response = {
        success: true,
        data: {
          sponsoredUserOp,
        },
      };

      console.log('\n✅ Paymaster sponsorship obtained');
      console.log(`   Paymaster: ${sponsoredUserOp.paymaster}`);
      console.log(`   Ready for signing\n`);

      res.status(200).json(response);
    } catch (error) {
      console.error('\n❌ Error getting Paymaster sponsorship:', error);

      // Create error object with statusCode for errorHandler
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

      console.log('\n📥 Received UserOperation submission request');
      console.log(`   Sender: ${userOp.sender}`);
      console.log(`   Chain ID: ${chainId}`);
      console.log(`   Has Paymaster: ${!!userOp.paymaster}`);

      // Send UserOperation to Bundler
      console.log('\n🔄 Sending UserOperation to Bundler...');
      const userOpHash = await sendUserOperation(userOp);

      // Return response
      const response: UserOperationResponse = {
        success: true,
        data: {
          userOpHash,
          status: 'submitted',
        },
      };

      console.log('\n✅ UserOperation submitted successfully');
      console.log(`   UserOp Hash: ${userOpHash}`);
      console.log(`   Status: submitted\n`);

      res.status(200).json(response);
    } catch (error) {
      console.error('\n❌ Error processing UserOperation:', error);

      // Create error object with statusCode for errorHandler
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

      console.log(`\n🔍 Checking UserOperation status for hash: ${hash}`);

      // Get UserOperation receipt from Bundler
      const receipt = await getUserOperationReceipt(hash);

      if (!receipt) {
        // UserOperation is still pending
        const response: UserOperationResponse = {
          success: true,
          data: {
            userOpHash: hash,
            status: 'pending',
          },
        };

        console.log(`   Status: pending (not yet included in a block)\n`);
        res.status(200).json(response);
        return;
      }

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

      console.log(`   Status: ${receipt.success ? 'confirmed' : 'failed'}`);
      console.log(`   Transaction Hash: ${receipt.transactionHash}`);
      console.log(`   Block Number: ${receipt.blockNumber}\n`);

      res.status(200).json(response);
    } catch (error) {
      console.error('\n❌ Error getting UserOperation status:', error);

      // Create error object with statusCode for errorHandler
      const err = error as Error & { statusCode?: number; code?: string };
      err.statusCode = 400;
      err.code = 'USEROP_STATUS_CHECK_FAILED';

      next(err);
    }
  }
);

export default router;
