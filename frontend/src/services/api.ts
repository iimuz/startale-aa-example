/**
 * API client for backend UserOperation endpoints
 */

import type {
  SponsorRequest,
  SponsorResponse,
  SubmitUserOpRequest,
  SubmitUserOpResponse,
  GetUserOpResponse,
} from '../types/userOperation';

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3001';

/**
 * POST /api/user-operations/sponsor
 * Get Paymaster sponsorship for a UserOperation
 */
export async function sponsorUserOperation(
  request: SponsorRequest
): Promise<SponsorResponse> {
  const response = await fetch(`${API_BASE_URL}/api/user-operations/sponsor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to sponsor UserOperation: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * POST /api/user-operations
 * Submit a signed UserOperation to the bundler
 */
export async function submitUserOperation(
  request: SubmitUserOpRequest
): Promise<SubmitUserOpResponse> {
  const response = await fetch(`${API_BASE_URL}/api/user-operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to submit UserOperation: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * GET /api/user-operations/:hash
 * Get the status and receipt of a UserOperation
 */
export async function getUserOperationStatus(
  userOpHash: string
): Promise<GetUserOpResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/user-operations/${userOpHash}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to get UserOperation status: ${response.statusText}`
    );
  }

  return response.json();
}
