"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuthError, loginRequest } from "./login";

export interface LoginFormProps {
  apiBaseUrl: string;
  onLogin: (accessToken: string) => Promise<void> | void;
  /**
   * Test-only: when provided, the form uses this `fetch` instead of
   * `globalThis.fetch`. Production callers should leave it unset.
   *
   * @internal
   */
  fetchImpl?: typeof fetch;
}

export function LoginForm({ onLogin, apiBaseUrl, fetchImpl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!apiBaseUrl) {
      setError("Server URL is not configured. Set NEXT_PUBLIC_API_BASE_URL.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await loginRequest({
        baseUrl: apiBaseUrl,
        email: email.trim(),
        password,
        ...(fetchImpl ? { fetchImpl } : {}),
      });
      await onLogin(result.accessToken);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(
          err.status === 401
            ? "Invalid email or password."
            : err.status === 0
              ? "Could not reach the server. Check your connection."
              : "Something went wrong. Please try again.",
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      aria-label="Sign in"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access your library.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
