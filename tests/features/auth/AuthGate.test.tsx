import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthGate } from "@/features/auth/AuthGate";
import { LoginForm } from "@/features/auth/LoginForm";

function makeFetch(
  body: object,
  status = 200,
): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe("AuthGate", () => {
  it("renders children immediately in local mode with the local marker", () => {
    render(
      <AuthGate mode="local" apiBaseUrl={null}>
        {(token) => <span data-testid="child">{token}</span>}
      </AuthGate>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("local");
  });

  it("shows a configuration error in HTTP mode without an api base url", () => {
    render(
      <AuthGate mode="http" apiBaseUrl={null}>
        {() => <span>should not see</span>}
      </AuthGate>,
    );
    expect(screen.getByText(/server not configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/should not see/)).not.toBeInTheDocument();
  });

  it("renders the login form in HTTP mode before authentication", () => {
    render(
      <AuthGate mode="http" apiBaseUrl="http://api">
        {() => <span>should not see</span>}
      </AuthGate>,
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByText(/should not see/)).not.toBeInTheDocument();
  });

  it("does not write the token to localStorage, sessionStorage, or cookies", () => {
    const { unmount } = render(
      <AuthGate mode="http" apiBaseUrl="http://api">
        {() => <span>inside</span>}
      </AuthGate>,
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    unmount();
  });

  it("hands the access token to the children render prop after login", async () => {
    const fetchImpl = makeFetch({
      access_token: "jwt-1",
      token_type: "bearer",
      expires_in: 60,
    });
    const onAfterLogin = vi.fn();
    render(
      <AuthGate
        mode="http"
        apiBaseUrl="http://api"
        fetchImpl={fetchImpl}
      >
        {(token) => {
          onAfterLogin(token);
          return <span data-testid="token">{token}</span>;
        }}
      </AuthGate>,
    );
    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "reader@example.com" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("jwt-1"),
    );
    expect(onAfterLogin).toHaveBeenCalledWith("jwt-1");
  });

  it("clears the in-memory token when the gate is unmounted (simulates reload)", async () => {
    const fetchImpl = makeFetch({
      access_token: "jwt-1",
      token_type: "bearer",
      expires_in: 60,
    });
    const { unmount } = render(
      <AuthGate mode="http" apiBaseUrl="http://api" fetchImpl={fetchImpl}>
        {(token) => <span data-testid="token">{token}</span>}
      </AuthGate>,
    );
    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "x@y" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("jwt-1"),
    );
    // Remounting the gate must not show the previous token.
    act(() => {
      unmount();
    });
    render(
      <AuthGate mode="http" apiBaseUrl="http://api" fetchImpl={fetchImpl}>
        {(token) => <span data-testid="token">{token}</span>}
      </AuthGate>,
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByTestId("token")).not.toBeInTheDocument();
  });

  it("returns to the login form when the children call onUnauthenticated", async () => {
    const fetchImpl = makeFetch({
      access_token: "jwt-1",
      token_type: "bearer",
      expires_in: 60,
    });
    render(
      <AuthGate
        mode="http"
        apiBaseUrl="http://api"
        fetchImpl={fetchImpl}
      >
        {(token, { onUnauthenticated }) => (
          <div>
            <span data-testid="token">{token ?? "logged-out"}</span>
            <button type="button" onClick={onUnauthenticated}>
              force logout
            </button>
          </div>
        )}
      </AuthGate>,
    );
    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "x@y" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByTestId("token")).toHaveTextContent("jwt-1"),
    );

    // Trigger the unauthenticated path.
    fireEvent.click(screen.getByRole("button", { name: /force logout/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("token")).not.toBeInTheDocument();
  });
});

describe("LoginForm tokens never persist", () => {
  it("does not write anything to localStorage or sessionStorage", async () => {
    const fetchImpl = makeFetch({
      access_token: "jwt-1",
      token_type: "bearer",
      expires_in: 60,
    });
    const onLogin = vi.fn();
    render(
      <LoginForm onLogin={onLogin} apiBaseUrl="http://api" fetchImpl={fetchImpl} />
    );
    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "a@b" },
    });
    fireEvent.input(screen.getByLabelText(/password/i), {
      target: { value: "pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("jwt-1"));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });
});
