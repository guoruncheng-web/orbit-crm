import { describe, expect, it, vi } from "vitest";
import { ApiError, api, tokenStore } from "./api";

function respond(body: unknown, init: ResponseInit = {}) {
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("api", () => {
  it("sends the stored token as a bearer credential", async () => {
    const fetchMock = respond({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    tokenStore.write("a-token");

    await api("/customers");

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer a-token");
  });

  it("omits the header entirely when signed out", async () => {
    const fetchMock = respond({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await api("/demo/session", { method: "POST" });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("surfaces the API's own message so the UI can show it verbatim", async () => {
    vi.stubGlobal(
      "fetch",
      respond({ message: "Too many failed attempts. Try again in 60 seconds." }, { status: 401 }),
    );

    await expect(api("/auth/login", { method: "POST" })).rejects.toThrow(
      "Too many failed attempts. Try again in 60 seconds.",
    );
  });

  it("takes the first line of a validation error, which Nest returns as an array", async () => {
    vi.stubGlobal(
      "fetch",
      respond({ message: ["email must be an email", "name should not be empty"] }, { status: 400 }),
    );

    await expect(api("/customers", { method: "POST" })).rejects.toThrow("email must be an email");
  });

  it("still reports a status when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>gateway timeout</html>", { status: 504 })),
    );

    await expect(api("/customers")).rejects.toThrow("Request failed (504)");
  });

  it("carries the status code on the error so a 401 can be told from a 500", async () => {
    vi.stubGlobal("fetch", respond({ message: "Unauthorized" }, { status: 401 }));

    await expect(api("/customers")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
  });

  it("resolves without parsing a body on 204, which DELETE returns", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(api("/customers/abc", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("is an ApiError, so callers can narrow on it", async () => {
    vi.stubGlobal("fetch", respond({ message: "nope" }, { status: 403 }));

    await expect(api("/customers")).rejects.toBeInstanceOf(ApiError);
  });
});
