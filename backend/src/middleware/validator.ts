import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Zod schema for UserOperation validation
 * Based on ERC-4337 specification
 */
const userOperationSchema = z.object({
  sender: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid sender address'),
  nonce: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid nonce format'),
  callData: z.string().regex(/^0x[a-fA-F0-9]*$/, 'Invalid callData format'),
  callGasLimit: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid callGasLimit format'),
  verificationGasLimit: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid verificationGasLimit format'),
  preVerificationGas: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid preVerificationGas format'),
  maxFeePerGas: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid maxFeePerGas format'),
  maxPriorityFeePerGas: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid maxPriorityFeePerGas format'),
  signature: z.string().regex(/^0x[a-fA-F0-9]*$/, 'Invalid signature format'),
  factory: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid factory address').optional(),
  factoryData: z.string().regex(/^0x[a-fA-F0-9]*$/, 'Invalid factoryData format').optional(),
  paymaster: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid paymaster address').optional(),
  paymasterData: z.string().regex(/^0x[a-fA-F0-9]*$/, 'Invalid paymasterData format').optional(),
  paymasterVerificationGasLimit: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid paymasterVerificationGasLimit format').optional(),
  paymasterPostOpGasLimit: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid paymasterPostOpGasLimit format').optional(),
});

/**
 * Zod schema for UserOperation without signature (for sponsor request)
 */
const userOperationWithoutSignatureSchema = userOperationSchema.extend({
  signature: z.string().regex(/^0x[a-fA-F0-9]*$/, 'Invalid signature format').optional(),
});

/**
 * Zod schema for sponsor request body
 */
const sponsorRequestSchema = z.object({
  userOp: userOperationWithoutSignatureSchema,
  chainId: z.number().int().positive('Chain ID must be a positive integer'),
});

/**
 * Zod schema for UserOperation request body
 */
const userOperationRequestSchema = z.object({
  userOp: userOperationSchema,
  chainId: z.number().int().positive('Chain ID must be a positive integer'),
});

/**
 * Zod schema for userOpHash parameter
 */
const userOpHashParamSchema = z.object({
  hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid userOpHash format'),
});

/**
 * Middleware to validate sponsor request body
 */
export const validateSponsorRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const result = sponsorRequestSchema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((err: z.core.$ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SPONSOR_REQUEST',
          message: 'Invalid sponsor request',
          details: errors,
        },
      });
      return;
    }

    // Store validated data in request object
    req.body = result.data;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate UserOperation request body
 */
export const validateUserOperationRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const result = userOperationRequestSchema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((err: z.core.$ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid UserOperation request',
          details: errors,
        },
      });
      return;
    }

    // Store validated data in request object
    req.body = result.data;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate userOpHash parameter
 */
export const validateUserOpHash = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const result = userOpHashParamSchema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.issues.map((err: z.core.$ZodIssue) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_HASH',
          message: 'Invalid userOpHash parameter',
          details: errors,
        },
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
