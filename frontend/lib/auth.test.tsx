import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

function Harness() {
  const { startDemo, signOut, status } = useAuth();
  return (
    <>
      <span data-testid="status">{status}</span>
      <button onClick={() => void startDemo()}>start demo</button>
      <button onClick={signOut}>sign out</button>
    </>
  );
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["customers"], [{ id: "customer-from-the-previous-workspace" }]);
  client.setQueryData(["dashboard"], { customers: 12 });

  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Harness />
      </AuthProvider>
    </QueryClientProvider>,
  );

  return client;
}

describe("AuthProvider workspace isolation", () => {
  it("forgets cached tenant data on sign-out", async () => {
    const client = mount();
    await screen.findByText("anonymous");

    await userEvent.click(screen.getByRole("button", { name: "sign out" }));

    expect(client.getQueryData(["customers"])).toBeUndefined();
    expect(client.getQueryData(["dashboard"])).toBeUndefined();
  });

  it("forgets cached tenant data before accepting a new demo session", async () => {
    const client = mount();
    await screen.findByText("anonymous");
    client.setQueryData(["customer", "old-customer"], { name: "Previous visitor" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          accessToken: "new-workspace-token",
          user: {
            id: "u2",
            name: "New visitor",
            email: "new@example.com",
            organizationId: "org-2",
            organizationName: "New workspace",
          },
        }),
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "start demo" }));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));

    expect(client.getQueryData(["customer", "old-customer"])).toBeUndefined();
    expect(client.getQueryData(["customers"])).toBeUndefined();
  });
});
