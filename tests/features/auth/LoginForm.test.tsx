import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LoginForm } from "@/features/auth/LoginForm";

function makeFetch(
  impl: (url: string, init: RequestInit) => { status: number; body?: string },
): typeof fetch {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = typeof url === "string" ? url : url.toString();
    const result = impl(urlString, init ?? {});
    return new Response(result.body ?? "", { status: result.status });
  }) as unknown as typeof fetch;
}

describe("LoginForm", () => {
  it("requires both email and password", () => {
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} apiBaseUrl="http://api" />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("submits credentials and surfaces the token to the parent", async () => {
    const fetchImpl = makeFetch((url, init) => {
      expect(url).toBe("http://api/auth/login");
      expect(init.method).toBe("POST");
      expect(init.body).toBe(
        JSON.stringify({ email: "reader@example.com", password: "hunter2" }),
      );
      return {
        status: 200,
        body: JSON.stringify({
          access_token: "jwt-token",
          token_type: "bearer",
          expires_in: 3600,
        }),
      };
    });
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(
      <LoginForm
        onLogin={onLogin}
        apiBaseUrl="http://api"
        fetchImpl={fetchImpl}
      />,
    );

    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "reader@example.com" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "hunter2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("jwt-token"));
  });

  it("shows a friendly error on 401", async () => {
    const fetchImpl = makeFetch(() => ({ status: 401, body: "{}" }));
    const onLogin = vi.fn();
    render(
      <LoginForm
        onLogin={onLogin}
        apiBaseUrl="http://api"
        fetchImpl={fetchImpl}
      />,
    );
    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "reader@example.com" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("shows a friendly error on network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const onLogin = vi.fn();
    render(
      <LoginForm
        onLogin={onLogin}
        apiBaseUrl="http://api"
        fetchImpl={fetchImpl}
      />,
    );
    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "reader@example.com" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(
      await screen.findByText(/could not reach the server/i),
    ).toBeInTheDocument();
  });

  it("disables the submit button while in flight", async () => {
    let resolve!: (response: Response) => void;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((res) => {
          resolve = res;
        }),
    ) as unknown as typeof fetch;
    const onLogin = vi.fn();
    render(
      <LoginForm
        onLogin={onLogin}
        apiBaseUrl="http://api"
        fetchImpl={fetchImpl}
      />,
    );
    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "reader@example.com" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(
      await screen.findByRole("button", { name: /signing in/i }),
    ).toBeDisabled();
    resolve(new Response("{}"));
  });

  it("surfaces a configuration error when apiBaseUrl is empty", async () => {
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} apiBaseUrl="" />);
    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "a@b" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(
      await screen.findByText(/server url is not configured/i),
    ).toBeInTheDocument();
  });
});
