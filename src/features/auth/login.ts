/**
 * Authentication helpers used by the HTTP-mode login surface.
 *
 * The token is short-lived JWT held in memory only — the user reload
 * logs them out by design (spec 023 §6 FR-21, FR-26, FR-7).
 */

import { HttpStorageError } from "@/storage/http-storage-adapter";

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
}

export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function loginRequest(options: {
  baseUrl: string;
  email: string;
  password: string;
  fetchImpl?: typeof fetch;
}): Promise<LoginResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let response: Response;
  try {
    response = await fetchImpl(
      `${options.baseUrl.replace(/\/+$/, "")}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: options.email,
          password: options.password,
        }),
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "network request failed";
    throw new AuthError(message, 0);
  }
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthError("invalid email or password", 401);
    }
    throw new AuthError(
      `login failed: ${response.status}`,
      response.status,
    );
  }
  let body: LoginResponse;
  try {
    body = JSON.parse(text) as LoginResponse;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "could not parse login response";
    throw new AuthError(message, response.status);
  }
  if (typeof body.access_token !== "string" || !body.access_token) {
    throw new AuthError("server returned an empty token", response.status);
  }
  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in,
  };
}

export function isHttpStorageError(
  err: unknown,
): err is HttpStorageError {
  return err instanceof HttpStorageError;
}
